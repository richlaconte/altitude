// The store's addresses (#636): hash routes, so the page works from static hosting, with real history entries (links
// set location.hash), so reload, Back and Forward are the browser's own. Later slices add their routes here (compare,
// cart, checkout, installs, agent, credentials); an address nobody handles yet is "not found", never a blank page.
//
// No imports and only erasable TypeScript, so Node runs it for the unit check.
export type Route =
  | { name: 'catalog'; q: string; kind: 'all' | 'engine-asset' | 'download' }
  | { name: 'product'; id: string; version?: string }
  | { name: 'library' }
  | { name: 'orders' }
  | { name: 'order'; id: string }
  | { name: 'creator' }
  | { name: 'submission'; id: string }
  | { name: 'statement'; period: string }
  | { name: 'moderation' }
  | { name: 'moderation-item'; id: string }
  | { name: 'support' }
  | { name: 'support-order'; id: string }
  | { name: 'not-found'; path: string };

export type RouteName = Route['name'];
type RoleName = 'guest' | 'buyer' | 'creator' | 'moderator' | 'support';

/** Who may open each page. Null: anyone. The server checks again on every read; this only decides what to render. */
export const ROUTE_ROLES: Record<RouteName, RoleName[] | null> = {
  catalog: null, product: null, 'not-found': null,
  library: ['buyer'], orders: ['buyer'], order: ['buyer'],
  creator: ['creator'], submission: ['creator', 'moderator'], statement: ['creator'],
  moderation: ['moderator'], 'moderation-item': ['moderator'],
  support: ['support'], 'support-order': ['support'],
};

export const canOpen = (route: Route, role: RoleName) => { const r = ROUTE_ROLES[route.name]; return !r || r.includes(role); };

const ID = /^[a-z0-9][a-z0-9.-]{0,63}$/i;
const seg = (s: string) => { try { return decodeURIComponent(s); } catch { return null; } };

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [pathPart, query = ''] = raw.split('?');
  const path = pathPart.replace(/\/+$/, '') || '/';
  const parts = path.split('/').slice(1).map(seg);
  const notFound: Route = { name: 'not-found', path };
  if (parts.some((p) => p === null)) return notFound;
  const [a, b, c, d] = parts as string[];
  const id = (x: string | undefined) => (x && ID.test(x) ? x : null);
  if (path === '/') {
    const params = new URLSearchParams(query);
    const kind = params.get('kind');
    return { name: 'catalog', q: params.get('q') ?? '', kind: kind === 'engine-asset' || kind === 'download' ? kind : 'all' };
  }
  switch (a) {
    case 'product':
      if (id(b) && parts.length === 2) return { name: 'product', id: b };
      if (id(b) && c === 'v' && id(d) && parts.length === 4) return { name: 'product', id: b, version: d };
      return notFound;
    case 'library': return parts.length === 1 ? { name: 'library' } : notFound;
    case 'orders':
      if (parts.length === 1) return { name: 'orders' };
      return id(b) && parts.length === 2 ? { name: 'order', id: b } : notFound;
    case 'creator':
      if (parts.length === 1) return { name: 'creator' };
      return b === 'submissions' && id(c) && parts.length === 3 ? { name: 'submission', id: c } : notFound;
    case 'statements': return id(b) && parts.length === 2 ? { name: 'statement', period: b } : notFound;
    case 'moderation':
      if (parts.length === 1) return { name: 'moderation' };
      return id(b) && parts.length === 2 ? { name: 'moderation-item', id: b } : notFound;
    case 'support':
      if (parts.length === 1) return { name: 'support' };
      return b === 'orders' && id(c) && parts.length === 3 ? { name: 'support-order', id: c } : notFound;
    default: return notFound;
  }
}

export function href(route: Route): string {
  const e = encodeURIComponent;
  switch (route.name) {
    case 'catalog': {
      const params = new URLSearchParams();
      if (route.q) params.set('q', route.q);
      if (route.kind !== 'all') params.set('kind', route.kind);
      const qs = params.toString();
      return `#/${qs ? `?${qs}` : ''}`;
    }
    case 'product': return `#/product/${e(route.id)}${route.version ? `/v/${e(route.version)}` : ''}`;
    case 'library': return '#/library';
    case 'orders': return '#/orders';
    case 'order': return `#/orders/${e(route.id)}`;
    case 'creator': return '#/creator';
    case 'submission': return `#/creator/submissions/${e(route.id)}`;
    case 'statement': return `#/statements/${e(route.period)}`;
    case 'moderation': return '#/moderation';
    case 'moderation-item': return `#/moderation/${e(route.id)}`;
    case 'support': return '#/support';
    case 'support-order': return `#/support/orders/${e(route.id)}`;
    case 'not-found': return `#${route.path}`;
  }
}

export const CATALOG: Route = { name: 'catalog', q: '', kind: 'all' };
