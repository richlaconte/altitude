// The app's side of the store (#636): who's signed in, protected and public reads, the current route, and formatting.
//
// Protected reads are keyed by the principal and by a session epoch that moves whenever the account changes (an
// auth event or a reset). A read's answer is shown only to the owner it was fetched for, so a library fetched for one
// buyer can never be shown to the next: on a change the old answer is dropped at once, its request is aborted, and the
// page shows the imprint until the new owner's answer arrives. A failed or refused protected read keeps nothing.
// Only public catalog reads keep their last answer through a failed refresh (the shared useDemoQuery).
import * as React from 'react';
import { isDemoError, useDemoQuery, useDemoService } from '../shared/react';
import type { DemoQuery } from '../shared/react';
import type { Principal, Role, SessionView } from './model.ts';
import { createStore, roleOf } from './store.ts';
import type { StoreOp } from './store.ts';
import { parseHash } from './routes.ts';
import type { Route } from './routes.ts';

export const store = createStore({ persist: true });
export const { service } = store;

// ---- Session ----------------------------------------------------------------------------------------------------
export interface Session {
  status: 'checking' | 'ready' | 'error';
  principal: Principal | null;
  role: Role;
  /** The server's clock, as of the last answer. */
  now: number;
  /** Moves whenever the signed-in account may have changed. */
  epoch: number;
  error?: Error;
  recheck: () => void;
}

const SessionContext = React.createContext<Session | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { externalRevision, resetRevision } = useDemoService(service);
  const [state, setState] = React.useState<Omit<Session, 'role' | 'recheck'>>({ status: 'checking', principal: null, now: 0, epoch: 0 });
  const [nonce, setNonce] = React.useState(0);
  // The account changed elsewhere, or the example was reset: forget who we were before asking who we are.
  const forget = React.useCallback(() => setState((s) => ({ status: 'checking', principal: null, now: s.now, epoch: s.epoch + 1 })), []);
  React.useEffect(() => store.auth.subscribe(forget), [forget]);
  React.useEffect(() => { if (resetRevision) forget(); }, [resetRevision, forget]);
  React.useEffect(() => {
    const ctrl = new AbortController();
    service.request<SessionView>('session.get', undefined, { signal: ctrl.signal }).then(
      (v) => setState((s) => ({ status: 'ready', principal: v.principal, now: v.now, epoch: s.epoch })),
      (e: Error) => { if (e.name !== 'AbortError') setState((s) => ({ ...s, status: 'error', principal: null, error: e })); },
    );
    return () => ctrl.abort();
  }, [state.epoch, externalRevision, nonce]);
  const recheck = React.useCallback(() => setNonce((n) => n + 1), []);
  const value = React.useMemo<Session>(() => ({ ...state, role: roleOf(state.principal), recheck }), [state, recheck]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const s = React.useContext(SessionContext);
  if (!s) throw new Error('useSession needs SessionProvider.');
  return s;
}

// ---- Reads ------------------------------------------------------------------------------------------------------
export type ProtectedStatus = 'loading' | 'ready' | 'denied' | 'missing' | 'error';
export interface ProtectedQuery<T> { status: ProtectedStatus; data?: T; error?: Error; reload: () => void }

interface Held<T> { owner: string; key: string; status: ProtectedStatus; data?: T; error?: Error }

/** A read that only its owner may see. */
export function useProtected<T>(op: StoreOp, input?: unknown): ProtectedQuery<T> {
  const session = useSession();
  const { externalRevision } = useDemoService(service);
  const owner = session.status === 'ready' ? `${session.principal?.id ?? 'guest'}#${session.epoch}` : null;
  const key = `${op}:${JSON.stringify(input ?? null)}`;
  const [held, setHeld] = React.useState<Held<T> | null>(null);
  const [nonce, setNonce] = React.useState(0);
  const { recheck } = session;
  React.useEffect(() => {
    if (!owner) return;
    const ctrl = new AbortController();
    service.request<T>(op, input, { signal: ctrl.signal }).then(
      (data) => setHeld({ owner, key, status: 'ready', data }),
      (e: Error) => {
        if (e.name === 'AbortError') return;
        if (isDemoError(e, 'unauthorized')) { setHeld({ owner, key, status: 'denied', error: e }); recheck(); return; }
        setHeld({ owner, key, status: isDemoError(e, 'not-found') ? 'missing' : 'error', error: e });
      },
    );
    return () => ctrl.abort();
  }, [owner, key, externalRevision, nonce]); // eslint-disable-line react-hooks/exhaustive-deps
  const reload = React.useCallback(() => setNonce((n) => n + 1), []);
  const mine = held && held.owner === owner && held.key === key ? held : null;
  return { status: mine?.status ?? 'loading', data: mine?.data, error: mine?.error, reload };
}

/** A public read: anyone may see it, and its last answer is kept through a failed refresh. */
export const usePublic = <T,>(op: StoreOp, input?: unknown): DemoQuery<T> => useDemoQuery<unknown, T>(service, op, input);

// ---- Route ------------------------------------------------------------------------------------------------------
export function useRoute(): Route {
  const [hash, setHash] = React.useState(() => location.hash);
  React.useEffect(() => {
    const on = () => setHash(location.hash);
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return React.useMemo(() => parseHash(hash), [hash]);
}

/** Navigate as a link would: a new history entry. */
export const go = (to: string) => { location.hash = to.replace(/^#/, ''); };

// ---- Words ------------------------------------------------------------------------------------------------------
export const money = (minor: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minor / 100);
export const date = (ms: number) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(ms);
export const bytes = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
export const KIND_WORD = { 'engine-asset': 'Imports into Injin', download: 'Download' } as const;
export const ROLE_WORD: Record<Role, string> = { guest: 'Guest', buyer: 'Buyer', creator: 'Creator', moderator: 'Moderator', support: 'Support' };
