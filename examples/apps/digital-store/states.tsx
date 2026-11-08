// The states every page shares (#636): loading, a failed read, not found and no access. Each keeps the store's frame
// and links back, and none of them renders a record: a refused or missing read shows only words.
import * as React from 'react';
import { Alert, Button, EmptyState, PageHeader, PageHeaderDescription, PageHeaderTitle, Skeleton } from 'altitude-design';
import { errorMessage } from '../shared/react';
import { useSession } from './client';
import type { ProtectedQuery } from './client';
import { CATALOG, href } from './routes.ts';

/** The page's title in the tab, so history entries and the tab say where you are. */
export function useTitle(title: string) {
  React.useEffect(() => { document.title = `${title} · Lanternyard`; }, [title]);
}

export function Loading({ noun }: { noun: string }) {
  return <div className="ds-loading" role="status" aria-label={`Loading ${noun}`}><Skeleton shape="text" lines={5} /></div>;
}

export function Failed({ noun, error, retry }: { noun: string; error?: Error; retry: () => void }) {
  return <Alert tone="critical" title={`We couldn’t load ${noun}`} action={<Button size="sm" onClick={retry}>Try again</Button>}>{errorMessage(error)}</Alert>;
}

export function NotFound({ title = 'We can’t find that page', detail, back = { label: 'Go to the catalog', to: href(CATALOG) } }: { title?: string; detail?: React.ReactNode; back?: { label: string; to: string } }) {
  useTitle(title);
  return (
    <main className="ds-page ds-narrow" id="main">
      <PageHeader><PageHeaderTitle tabIndex={-1}>{title}</PageHeaderTitle>
        <PageHeaderDescription>{detail ?? 'The address may be mistyped, or what it pointed to has moved.'}</PageHeaderDescription>
      </PageHeader>
      <p><a className="ds-link" href={back.to}>{back.label}</a></p>
    </main>
  );
}

/** No access. It names what would help (signing in, or another account) and never shows what was asked for. */
export function Denied() {
  const { role } = useSession();
  const title = 'You don’t have access to this page';
  useTitle(title);
  return (
    <main className="ds-page ds-narrow" id="main">
      <PageHeader><PageHeaderTitle tabIndex={-1}>{title}</PageHeaderTitle>
        <PageHeaderDescription>{role === 'guest' ? 'Sign in with an account that can see it.' : 'Your account can’t open it. If you think it should, ask the store’s support team.'}</PageHeaderDescription>
      </PageHeader>
      <p><a className="ds-link" href={href(CATALOG)}>Go to the catalog</a></p>
    </main>
  );
}

/** A protected read's states around what it renders. */
export function Protected<T>({ query, noun, missing, children }: { query: ProtectedQuery<T>; noun: string; missing?: React.ReactNode; children: (data: T) => React.ReactNode }) {
  switch (query.status) {
    case 'loading': return <main className="ds-page" id="main"><Loading noun={noun} /></main>;
    case 'denied': return <Denied />;
    case 'missing': return <>{missing ?? <NotFound detail={errorMessage(query.error)} />}</>;
    case 'error': return <main className="ds-page" id="main"><Failed noun={noun} error={query.error} retry={query.reload} /></main>;
    default: return <>{children(query.data as T)}</>;
  }
}

export function Empty({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <EmptyState size="sm" headingLevel={2} title={title} description={description} action={action} />;
}
