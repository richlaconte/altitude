// The simulated service every example app talks to (#400). A plain module, not network interception: the app calls
// `request(op, input)` and gets a promise back, after a latency, shaped by the mode chosen in the fixtures drawer.
// Generalised from the Actions in place Files example's createFilesService (project/ActionsInPlace.md).
//
// It simulates a server so the app's states can be reached on demand. It proves nothing about real persistence,
// permissions or concurrency: a timer standing in for a server is not a server.
//
// No imports and only erasable TypeScript, so Node runs it directly for the unit check (build/checks/example-service.mjs).

/** What the next requests do. Chosen in the fixtures drawer. */
export type DemoMode = 'success' | 'slow' | 'fail' | 'lost-response' | 'conflict' | 'offline' | 'rate-limited';

export const DEMO_MODES: { value: DemoMode; label: string; description: string }[] = [
  { value: 'success', label: 'Succeed', description: 'Requests succeed after a short, realistic delay.' },
  { value: 'slow', label: 'Slow', description: 'Requests succeed, but take a few seconds.' },
  { value: 'fail', label: 'Fail', description: 'Requests fail and nothing is saved.' },
  { value: 'lost-response', label: 'Lose the response', description: 'Changes are saved, then the response is lost: the app has to find out what happened.' },
  { value: 'conflict', label: 'Conflict', description: 'Changes are rejected because someone else changed the same thing.' },
  { value: 'offline', label: 'Offline', description: 'Requests fail at once with no connection.' },
  { value: 'rate-limited', label: 'Rate limited', description: 'Requests are refused for a while.' },
];

export type DemoErrorKind = 'failed' | 'offline' | 'conflict' | 'rate-limited' | 'lost-response' | 'invalid' | 'not-found';

/** Why a request was rejected. `committed` says whether the change was saved anyway (only for lost-response). */
export class DemoError extends Error {
  kind: DemoErrorKind;
  committed: boolean;
  /** For conflict: the server's current version, from the handler's `current`. */
  current?: unknown;
  /** For rate-limited: milliseconds until requests are accepted again. */
  retryAfter?: number;
  /** For invalid: which input field, when the handler names one. */
  field?: string;
  constructor(kind: DemoErrorKind, message: string, extra: { committed?: boolean; current?: unknown; retryAfter?: number; field?: string } = {}) {
    super(message);
    this.name = 'DemoError';
    this.kind = kind;
    this.committed = extra.committed ?? false;
    this.current = extra.current;
    this.retryAfter = extra.retryAfter;
    this.field = extra.field;
  }
}

/** Whether a request failed for this reason. */
export const isDemoError = (e: unknown, kind: DemoErrorKind): e is DemoError => e instanceof DemoError && e.kind === kind;

/** Throw from a handler to reject a request the way a server would (a duplicate, a missing record). */
export const reject = (kind: 'invalid' | 'not-found' | 'conflict', message: string, extra?: { field?: string; current?: unknown }): never => {
  throw new DemoError(kind, message, extra);
};

/** A read returns a result and leaves the store alone. */
export interface ReadHandler<S> { read: (state: S, input: any) => unknown }
/** A write returns the new store and a result. `current` is what a conflict hands back. */
export interface WriteHandler<S> { write: (state: S, input: any) => { state: S; result?: unknown }; current?: (state: S, input: any) => unknown }
export type Handler<S> = ReadHandler<S> | WriteHandler<S>;

export interface DemoClock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface DemoStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }

export interface DemoServiceOptions<S> {
  /** Names the app in the request log and prefixes its storage key. */
  name: string;
  /** Fresh data. Reset calls it again. Keep it deterministic. */
  seed: () => S;
  handlers: Record<string, Handler<S>>;
  /** Keep a copy of the store in localStorage, so a reload keeps what you did. Default false. */
  persist?: boolean;
  /** Milliseconds. Default base 300, jitter 150. Jitter is seeded, so runs repeat. */
  latency?: { base?: number; jitter?: number };
  /** Inject a clock to drive time by hand (the unit check does). Default: the real one. */
  clock?: DemoClock;
  /** Default: window.localStorage when persist is on and it's available. */
  storage?: DemoStorage | null;
}

export type DemoLogStatus = 'pending' | 'ok' | 'rejected' | 'lost' | 'aborted' | 'external';

export interface DemoLogEntry {
  id: number;
  op: string;
  input: unknown;
  mode: DemoMode;
  status: DemoLogStatus;
  /** What happened, in words, for the request log. */
  outcome: string;
  startedAt: number;
  settledAt?: number;
}

export interface DemoSnapshot<S> {
  state: S;
  mode: DemoMode;
  /** True when the mode applies to the next request only, then returns to `success`. */
  once: boolean;
  log: DemoLogEntry[];
  /** Counts external changes, so an app can refetch when it moves. */
  externalRevision: number;
  /** Counts resets, so an app can start over when it moves. */
  resetRevision: number;
}

export interface RequestOptions { signal?: AbortSignal }

export interface DemoService<S> {
  readonly name: string;
  request<T = unknown>(op: string, input?: unknown, options?: RequestOptions): Promise<T>;
  setMode(mode: DemoMode, options?: { once?: boolean }): void;
  /** Change the store as if another person or process did, and log it. */
  external(label: string, change: (state: S) => S): void;
  /** Fresh seed, empty log, mode back to success, storage cleared. */
  reset(): void;
  getSnapshot(): DemoSnapshot<S>;
  subscribe(listener: () => void): () => void;
}

const LOG_LIMIT = 50;
const SLOW = 6;               // slow multiplies the latency
const LOST_AFTER = 1100;      // lost-response: saved at the normal latency, the failure arrives this much later
const RATE_LIMIT = 30_000;    // rate-limited: retry after

const realClock: DemoClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

// mulberry32: small, seeded, good enough for jitter.
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const abortError = () => {
  const e = new Error('The request was cancelled.');
  e.name = 'AbortError';
  return e;
};

export function createDemoService<S>(options: DemoServiceOptions<S>): DemoService<S> {
  const { name, seed, handlers } = options;
  const clock = options.clock ?? realClock;
  const base = options.latency?.base ?? 300;
  const jitter = options.latency?.jitter ?? 150;
  const key = `altitude-example:${name}`;
  const storage: DemoStorage | null = options.persist
    ? options.storage !== undefined ? options.storage : (() => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } })()
    : null;

  const load = (): S => {
    if (storage) {
      try { const raw = storage.getItem(key); if (raw) return JSON.parse(raw) as S; } catch { /* a blocked or corrupt store starts fresh */ }
    }
    return seed();
  };
  const save = (state: S) => { if (storage) try { storage.setItem(key, JSON.stringify(state)); } catch { /* storage full or blocked: keep going in memory */ } };

  let random = rng(1);
  let nextId = 1;
  let snapshot: DemoSnapshot<S> = { state: load(), mode: 'success', once: false, log: [], externalRevision: 0, resetRevision: 0 };
  const listeners = new Set<() => void>();
  const emit = (patch: Partial<DemoSnapshot<S>>) => {
    snapshot = { ...snapshot, ...patch };
    for (const l of [...listeners]) l();
  };
  const log = (entry: DemoLogEntry) => emit({ log: [entry, ...snapshot.log].slice(0, LOG_LIMIT) });
  const settle = (id: number, status: DemoLogStatus, outcome: string) =>
    emit({ log: snapshot.log.map((e) => (e.id === id ? { ...e, status, outcome, settledAt: clock.now() } : e)) });
  const commit = (state: S) => { save(state); emit({ state }); };
  const delay = () => Math.round(base + random() * jitter);

  const request = <T,>(op: string, input?: unknown, { signal }: RequestOptions = {}): Promise<T> => {
    const handler = handlers[op];
    const mode = snapshot.mode;
    if (snapshot.once) emit({ mode: 'success', once: false });
    const id = nextId++;
    const resetAt = snapshot.resetRevision;
    log({ id, op, input, mode, status: 'pending', outcome: 'Waiting for the server', startedAt: clock.now() });

    return new Promise<T>((resolve, rejectPromise) => {
      if (!handler) {
        settle(id, 'rejected', `No handler for ${op}`);
        rejectPromise(new DemoError('not-found', `The simulated service has no "${op}".`));
        return;
      }
      const isWrite = 'write' in handler;
      const timers: unknown[] = [];
      let done = false;
      const finish = (status: DemoLogStatus, outcome: string, settleIt: () => void) => {
        if (done) return;
        done = true;
        signal?.removeEventListener('abort', onAbort);
        for (const t of timers) clock.clearTimeout(t);
        if (snapshot.resetRevision === resetAt) settle(id, status, outcome);
        settleIt();
      };
      const fail = (error: DemoError, status: DemoLogStatus = 'rejected') => finish(status, error.message, () => rejectPromise(error));
      const onAbort = () => finish('aborted', 'Cancelled by the app', () => rejectPromise(abortError()));
      if (signal?.aborted) { onAbort(); return; }
      signal?.addEventListener('abort', onAbort);
      const at = (ms: number, fn: () => void) => { timers.push(clock.setTimeout(fn, ms)); };

      // Runs the handler against the current store. A handler's own rejection (invalid, not-found) comes back as a DemoError.
      // A request from before a reset belongs to the old data: it's turned away rather than written into the new seed.
      const run = (): { ok: true; result: unknown; state?: S } | { ok: false; error: DemoError } => {
        if (snapshot.resetRevision !== resetAt) return { ok: false, error: new DemoError('failed', 'The example was reset before the server answered. Nothing was changed.') };
        try {
          if (isWrite) {
            const out = (handler as WriteHandler<S>).write(snapshot.state, input);
            return { ok: true, result: out.result, state: out.state };
          }
          return { ok: true, result: (handler as ReadHandler<S>).read(snapshot.state, input) };
        } catch (e) {
          return { ok: false, error: e instanceof DemoError ? e : new DemoError('failed', e instanceof Error ? e.message : String(e)) };
        }
      };
      const succeed = () => {
        const out = run();
        if (!out.ok) { fail(out.error); return; }
        if (out.state !== undefined) commit(out.state);
        finish('ok', isWrite ? 'Saved' : 'Answered', () => resolve(out.result as T));
      };

      switch (mode) {
        case 'offline':
          at(0, () => fail(new DemoError('offline', "We can't reach the server. Check your connection and try again.")));
          break;
        case 'fail':
          at(delay(), () => fail(new DemoError('failed', isWrite ? "We couldn't save that. Nothing was changed." : "We couldn't load that.")));
          break;
        case 'rate-limited':
          at(delay(), () => fail(new DemoError('rate-limited', 'Too many requests. Try again in 30 seconds.', { retryAfter: RATE_LIMIT })));
          break;
        case 'conflict':
          if (!isWrite) { at(delay(), succeed); break; }
          at(delay(), () => fail(new DemoError('conflict', 'Someone else changed this first.', { current: (handler as WriteHandler<S>).current?.(snapshot.state, input) })));
          break;
        case 'lost-response':
          // Only writes lose their response; reads answer, so the app can find out what happened.
          if (!isWrite) { at(delay(), succeed); break; }
          // Saved at the normal latency; the app only hears a failure later, and must reconcile before retrying.
          at(delay(), () => {
            const out = run();
            if (!out.ok) { fail(out.error); return; }
            if (out.state !== undefined) commit(out.state);
            at(LOST_AFTER, () => fail(new DemoError('lost-response', 'The connection dropped before the server answered. The change may have been saved.', { committed: true }), 'lost'));
          });
          break;
        case 'slow':
          at(delay() * SLOW, succeed);
          break;
        default:
          at(delay(), succeed);
      }
    });
  };

  return {
    name,
    request,
    setMode(mode, { once = false } = {}) { emit({ mode, once: once && mode !== 'success' }); },
    external(label, change) {
      const state = change(snapshot.state);
      commit(state);
      const id = nextId++;
      log({ id, op: label, input: undefined, mode: snapshot.mode, status: 'external', outcome: 'Changed outside the app', startedAt: clock.now(), settledAt: clock.now() });
      emit({ externalRevision: snapshot.externalRevision + 1 });
    },
    reset() {
      if (storage) try { storage.removeItem(key); } catch { /* blocked: nothing to clear */ }
      random = rng(1);
      emit({ state: seed(), mode: 'success', once: false, log: [], resetRevision: snapshot.resetRevision + 1 });
    },
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}

/** A clock you move by hand, for checks: nothing happens until `advance`. */
export function createManualClock(start = 0): DemoClock & { advance(ms: number): void } {
  let now = start;
  let seq = 0;
  const timers = new Map<number, { at: number; fn: () => void; seq: number }>();
  return {
    now: () => now,
    setTimeout(fn, ms) { const id = ++seq; timers.set(id, { at: now + ms, fn, seq: id }); return id; },
    clearTimeout(h) { timers.delete(h as number); },
    advance(ms) {
      const until = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at || a[1].seq - b[1].seq)[0];
        if (!due) break;
        timers.delete(due[0]);
        now = due[1].at;
        due[1].fn();
      }
      now = until;
    },
  };
}
