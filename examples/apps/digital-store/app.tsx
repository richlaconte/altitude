// Example: Lanternyard, a digital asset store (#629, foundation #636). One connected store whose pages share stable
// products, versions, accounts and records, on a simulated service whose failures can be reproduced on demand.
//   Task: find an asset or a download, and see exactly what you'd get: its versions, licenses and what was tested.
//   Lead: the catalog; on a product, its facts. Primary action: none yet (acquiring is #634's slice), so no page
//   claims one. Next: the product's page, then (in later slices) checkout, the library and an install or download.
// Frames follow the task: browse for the catalog and products, the editor frame for a submission, list-and-detail
// triage for moderation and support, and the report frame for statements. There's no dashboard.
//
// Boundaries this foundation sets for every later slice:
//   - The server authorizes every protected read (store.ts). The app's route guard only decides what to render.
//   - Protected answers are keyed by the account and dropped when it changes (client.tsx), so another person's library
//     or orders can't be shown from a cache. Only public catalog reads keep a stale answer through a failed refresh.
//   - Who's signed in, the server's clock, failure modes and Reset live in the fixtures drawer, outside main. The app
//     learns about them only as a real app would: from the service's answers and the auth channel. No product module
//     imports the drawer's controls or reads the service's mode (build/checks/example-digital-store.mjs checks this).
import * as React from 'react';
import { Badge } from 'altitude-design';
import { ROLE_WORD, SessionProvider, service, store, useRoute, useSession } from './client';
import { canOpen, CATALOG, href } from './routes.ts';
import type { Route, RouteName } from './routes.ts';
import { Library, OrderPage, Orders } from './account';
import { Catalog, ProductPage } from './browse';
import { Creator, lastPeriod, Moderation, StatementPage, SubmissionPage, SupportLookup, SupportOrder } from './work';
import { Denied, Failed, Loading, NotFound } from './states';

export { service, store };

interface NavItem { label: string; to: string; section: RouteName[] }

function navFor(role: string, now: number): NavItem[] {
  const items: NavItem[] = [{ label: 'Catalog', to: href(CATALOG), section: ['catalog', 'product'] }];
  if (role === 'buyer') items.push({ label: 'Library', to: href({ name: 'library' }), section: ['library'] }, { label: 'Orders', to: href({ name: 'orders' }), section: ['orders', 'order'] });
  if (role === 'creator') items.push({ label: 'Listings', to: href({ name: 'creator' }), section: ['creator', 'submission'] }, { label: 'Statements', to: href({ name: 'statement', period: lastPeriod(now) }), section: ['statement'] });
  if (role === 'moderator') items.push({ label: 'Moderation', to: href({ name: 'moderation' }), section: ['moderation', 'moderation-item'] });
  if (role === 'support') items.push({ label: 'Find an order', to: href({ name: 'support' }), section: ['support', 'support-order'] });
  return items;
}

function Header({ route }: { route: Route }) {
  const session = useSession();
  return (
    <header className="ds-header">
      <a className="ds-skip" href="#main" onClick={(e) => { e.preventDefault(); focusMain(); }}>Skip to content</a>
      <a className="ds-brand" href={href(CATALOG)}>Lanternyard</a>
      <nav aria-label="Store" className="ds-nav">
        <ul>
          {navFor(session.role, session.now).map((n) => <li key={n.label}><a href={n.to} aria-current={n.section.includes(route.name) ? 'page' : undefined}>{n.label}</a></li>)}
        </ul>
      </nav>
      <p className="ds-account" aria-live="polite">
        {session.status === 'checking' ? 'Checking your account…'
          : session.principal ? <>{session.principal.name} <Badge variant="outline">{ROLE_WORD[session.role]}</Badge></>
            : session.status === 'ready' ? 'Browsing as a guest' : 'Account unknown'}
      </p>
    </header>
  );
}

function focusMain() {
  const main = document.getElementById('main');
  const h1 = main?.querySelector<HTMLElement>('h1');
  if (h1) { h1.tabIndex = -1; h1.focus(); return; }
  if (main) { main.tabIndex = -1; main.focus(); }
}

function Page({ route }: { route: Route }) {
  const session = useSession();
  if (!canOpen(route, session.role)) {
    // Until the server says who this is, a protected page shows neither its records nor a refusal.
    if (session.status === 'checking') return <main className="ds-page" id="main"><Loading noun="your account" /></main>;
    if (session.status === 'error') return <main className="ds-page" id="main"><Failed noun="your account" error={session.error} retry={session.recheck} /></main>;
    return <Denied />;
  }
  switch (route.name) {
    case 'catalog': return <Catalog route={route} />;
    case 'product': return <ProductPage route={route} />;
    case 'library': return <Library />;
    case 'orders': return <Orders />;
    case 'order': return <OrderPage id={route.id} />;
    case 'creator': return <Creator />;
    case 'submission': return <SubmissionPage id={route.id} />;
    case 'statement': return <StatementPage period={route.period} />;
    case 'moderation': return <Moderation />;
    case 'moderation-item': return <Moderation id={route.id} />;
    case 'support': return <SupportLookup />;
    case 'support-order': return <SupportOrder id={route.id} />;
    case 'not-found': return <NotFound />;
  }
}

function Shell() {
  const route = useRoute();
  const first = React.useRef(true);
  // A new address takes focus to the new page's heading, as a page load would put it at the top. A page still loading
  // has no heading yet, so this waits for it (unless the person has moved into the page meanwhile), then falls back to main.
  React.useEffect(() => {
    if (first.current) { first.current = false; return; }
    let done = false;
    const finish = (focus: () => void) => { if (done) return; done = true; observer.disconnect(); clearTimeout(timer); focus(); };
    const moved = () => { const a = document.activeElement; return !!a && a.tagName !== 'H1' && a.id !== 'main' && !!a.closest('#main'); };
    const tryHeading = () => { if (moved()) finish(() => undefined); else if (document.querySelector('#main h1')) finish(focusMain); };
    const observer = new MutationObserver(tryHeading);
    observer.observe(document.querySelector('.ds')!, { subtree: true, childList: true });
    const timer = setTimeout(() => finish(() => { if (!moved()) focusMain(); }), 5000);
    tryHeading();
    return () => { done = true; observer.disconnect(); clearTimeout(timer); };
  }, [route]);
  return (
    <div className="ds">
      <Header route={route} />
      <Page route={route} />
    </div>
  );
}

export function App() {
  return <SessionProvider><Shell /></SessionProvider>;
}
