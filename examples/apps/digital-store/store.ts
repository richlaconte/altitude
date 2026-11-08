// The digital store's simulated server (#636), on the shared service (#400). Store-specific policy lives here, not in
// the shared module.
//
// Every protected read checks the principal itself: the shared endSession() only refuses writes, and a server that
// answered protected reads to anyone would make the app's own guards decorative. Asking for someone else's order
// answers "not found", so ids can't be probed; asking for a page your role can't see answers "unauthorized".
//
// The session is server state. The fixtures drawer changes it through switchPrincipal(), which stands in for signing in
// as someone else in another tab, and announces it on `auth`, as a BroadcastChannel would. The app listens to that
// channel and to the service's answers; it never reads the drawer.
import { createDemoService, reject } from '../shared/service.ts';
import type { DemoClock, DemoStorage } from '../shared/service.ts';
import type { CompatibilityEvidence, License, Order, Principal, Product, Publisher, Role, SessionView, StoreState, Submission, Version } from './model.ts';
import { seed } from './seed.ts';

export const DAY = 86_400_000;

// ---- What the server answers ------------------------------------------------------------------------------------
export interface ProductSummary {
  id: string; title: string; summary: string; kind: Product['kind']; category: Product['category']; tags: string[];
  publisher: string; latest: string; fromPrice: number | null; thumbnail: Product['media'][number];
}
export interface ProductDetail {
  product: Product; publisher: Publisher; versions: Version[]; licenses: License[]; evidence: CompatibilityEvidence[];
  dependencies: { productId: string; title: string; range: string }[];
}
export interface LibraryEntry { grantId: string; orderId: string; productId: string; title: string; kind: Product['kind']; license: string; grantedAt: number; status: Product['status'] }
export interface OrderView extends Order { lineDetails: { title: string; semver: string; license: string; termsVersion: number; amount: number }[]; buyer?: { name: string; email: string } }
export interface SubmissionView extends Submission { productTitle: string; publisher: string; currentVersion: string }
export interface StatementLine { orderId: string; placedAt: number; title: string; license: string; gross: number }
export interface Statement { period: string; label: string; publisher: string; lines: StatementLine[]; gross: number; fee: number; net: number; currency: 'USD' }

/** The store's fee on each sale, as a fraction of the price. */
export const STORE_FEE = 0.12;
const PERIOD = /^(\d{4})-(0[1-9]|1[0-2])$/;
export const periodLabel = (period: string) => {
  const [, y, m] = PERIOD.exec(period)!;
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(+y, +m - 1, 1));
};

// ---- Policy -----------------------------------------------------------------------------------------------------
const principalOf = (s: StoreState): Principal | null => s.principals.find((p) => p.id === s.session.principalId) ?? null;
export const roleOf = (p: Principal | null): Role => p?.role ?? 'guest';

/** The principal, if their role may make this read; otherwise the read is refused as a server would. */
const allow = (s: StoreState, roles: Role[]): Principal => {
  const p = principalOf(s);
  if (!p) return reject('unauthorized', 'Sign in to see this page.');
  if (!roles.includes(p.role)) return reject('unauthorized', 'Your account doesn’t have access to this page.');
  return p;
};

const productOf = (s: StoreState, id: string) => s.products.find((p) => p.id === id);
const publisherOf = (s: StoreState, id: string) => s.publishers.find((p) => p.id === id)!;
const versionOf = (s: StoreState, id: string) => s.versions.find((v) => v.id === id)!;
const licenseOf = (s: StoreState, id: string) => s.licenses.find((l) => l.id === id)!;

const summary = (s: StoreState, p: Product): ProductSummary => {
  const prices = p.licenseIds.map((id) => licenseOf(s, id).prices?.USD ?? 0);
  return {
    id: p.id, title: p.title, summary: p.summary, kind: p.kind, category: p.category, tags: p.tags,
    publisher: publisherOf(s, p.publisherId).name, latest: versionOf(s, p.latestVersionId).semver,
    fromPrice: Math.min(...prices) || null, thumbnail: p.media[0],
  };
};

const orderView = (s: StoreState, o: Order, withBuyer = false): OrderView => {
  const buyer = s.principals.find((p) => p.id === o.principalId)!;
  return {
    ...o,
    lineDetails: o.lines.map((l) => ({ title: productOf(s, l.productId)!.title, semver: versionOf(s, l.versionId).semver, license: licenseOf(s, l.licenseId).name, termsVersion: licenseOf(s, l.licenseId).termsVersion, amount: l.amount })),
    ...(withBuyer ? { buyer: { name: buyer.name, email: buyer.email } } : {}),
  };
};

const submissionView = (s: StoreState, x: Submission): SubmissionView => {
  const p = productOf(s, x.productId)!;
  return { ...x, productTitle: p.title, publisher: publisherOf(s, x.publisherId).name, currentVersion: versionOf(s, p.latestVersionId).semver };
};

const semverDesc = (a: Version, b: Version) => b.releasedAt - a.releasedAt;

export const handlers = {
  // Public: anyone, signed in or not.
  'session.get': { read: (s: StoreState): SessionView => ({ principal: principalOf(s), now: s.now }) },
  'catalog.list': { read: (s: StoreState): ProductSummary[] => s.products.filter((p) => p.status === 'listed').map((p) => summary(s, p)) },
  'product.get': {
    // Withdrawn products still answer, so a bookmark or a library link explains what happened instead of vanishing.
    read: (s: StoreState, input: { id: string }): ProductDetail => {
      const product = productOf(s, input.id) ?? reject('not-found', 'There’s no product with that address.');
      return {
        product,
        publisher: publisherOf(s, product.publisherId),
        versions: s.versions.filter((v) => v.productId === product.id).sort(semverDesc),
        licenses: product.licenseIds.map((id) => licenseOf(s, id)),
        evidence: s.evidence.filter((e) => s.versions.some((v) => v.id === e.versionId && v.productId === product.id)),
        dependencies: product.dependencies.map((d) => ({ ...d, title: productOf(s, d.productId)?.title ?? d.productId })),
      };
    },
  },

  // A buyer's own records.
  'library.list': {
    read: (s: StoreState): LibraryEntry[] => {
      const me = allow(s, ['buyer']);
      return s.grants.filter((g) => g.principalId === me.id).map((g) => {
        const p = productOf(s, g.productId)!;
        return { grantId: g.id, orderId: g.orderId, productId: p.id, title: p.title, kind: p.kind, license: licenseOf(s, g.licenseId).name, grantedAt: g.grantedAt, status: p.status };
      }).sort((a, b) => b.grantedAt - a.grantedAt);
    },
  },
  'orders.list': {
    read: (s: StoreState): OrderView[] => {
      const me = allow(s, ['buyer']);
      return s.orders.filter((o) => o.principalId === me.id).sort((a, b) => b.placedAt - a.placedAt).map((o) => orderView(s, o));
    },
  },
  'order.get': {
    read: (s: StoreState, input: { id: string }): OrderView => {
      const me = allow(s, ['buyer']);
      const o = s.orders.find((x) => x.id === input.id && x.principalId === me.id);
      return orderView(s, o ?? reject('not-found', 'There’s no order with that number in your account.'));
    },
  },

  // A creator's own listings, submissions and statements.
  'creator.listings': {
    read: (s: StoreState): { publisher: Publisher; products: ProductSummary[]; submissions: SubmissionView[] } => {
      const me = allow(s, ['creator']);
      const publisher = publisherOf(s, me.publisherId!);
      return {
        publisher,
        products: s.products.filter((p) => p.publisherId === publisher.id).map((p) => summary(s, p)),
        submissions: s.submissions.filter((x) => x.publisherId === publisher.id).map((x) => submissionView(s, x)),
      };
    },
  },
  'submission.get': {
    // The creator who owns it, or a moderator.
    read: (s: StoreState, input: { id: string }): SubmissionView => {
      const me = allow(s, ['creator', 'moderator']);
      const x = s.submissions.find((y) => y.id === input.id && (me.role === 'moderator' || y.publisherId === me.publisherId));
      return submissionView(s, x ?? reject('not-found', 'There’s no submission with that number you can see.'));
    },
  },
  'statement.get': {
    read: (s: StoreState, input: { period: string }): Statement => {
      const me = allow(s, ['creator']);
      if (!PERIOD.test(input.period)) reject('not-found', 'There’s no statement for that period.');
      const [, y, m] = PERIOD.exec(input.period)!;
      const from = Date.UTC(+y, +m - 1, 1), to = Date.UTC(+y, +m, 1);
      if (from > s.now) reject('not-found', 'That period hasn’t started yet.');
      const publisher = publisherOf(s, me.publisherId!);
      const lines: StatementLine[] = s.orders.filter((o) => o.placedAt >= from && o.placedAt < to).flatMap((o) => o.lines
        .filter((l) => productOf(s, l.productId)!.publisherId === publisher.id && l.amount > 0)
        .map((l) => ({ orderId: o.id, placedAt: o.placedAt, title: productOf(s, l.productId)!.title, license: licenseOf(s, l.licenseId).name, gross: l.amount })))
        .sort((a, b) => a.placedAt - b.placedAt);
      const gross = lines.reduce((n, l) => n + l.gross, 0);
      const fee = Math.round(gross * STORE_FEE);
      return { period: input.period, label: periodLabel(input.period), publisher: publisher.name, lines, gross, fee, net: gross - fee, currency: 'USD' };
    },
  },

  // Moderation and support.
  'moderation.queue': {
    read: (s: StoreState): SubmissionView[] => {
      allow(s, ['moderator']);
      return s.submissions.filter((x) => x.state === 'in-review').sort((a, b) => a.submittedAt - b.submittedAt).map((x) => submissionView(s, x));
    },
  },
  'support.order': {
    read: (s: StoreState, input: { id: string }): OrderView => {
      allow(s, ['support']);
      const o = s.orders.find((x) => x.id === input.id.trim());
      return orderView(s, o ?? reject('not-found', `There’s no order ${input.id.trim()}.`), true);
    },
  },
};

export type StoreOp = keyof typeof handlers;

// ---- The store, with its outside-world controls -------------------------------------------------------------------
export interface StoreOptions { clock?: DemoClock; persist?: boolean; storage?: DemoStorage | null }

export function createStore(options: StoreOptions = {}) {
  const service = createDemoService<StoreState>({
    name: 'digital-store', seed, handlers, persist: options.persist ?? false, clock: options.clock, storage: options.storage,
    latency: { base: 300, jitter: 150 },
  });

  // Stands in for a BroadcastChannel that says the signed-in account changed elsewhere.
  const listeners = new Set<() => void>();
  const auth = {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
  const announce = () => { for (const l of [...listeners]) l(); };

  return {
    service,
    auth,
    /** Signs in as someone else (null: signs out), as another tab would, and says so on `auth`. */
    switchPrincipal(principalId: string | null) {
      const who = principalId ? seed().principals.find((p) => p.id === principalId)?.name ?? principalId : 'a guest';
      service.external(`Signed in as ${who}`, (s) => ({ ...s, session: { principalId } }));
      announce();
    },
    /** Moves the server's clock, as time passing would. */
    advanceClock(ms: number) {
      service.external(`${Math.round(ms / DAY)} day${ms === DAY ? '' : 's'} pass`, (s) => ({ ...s, now: s.now + ms }));
    },
  };
}

export type Store = ReturnType<typeof createStore>;
