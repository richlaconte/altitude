import * as React from 'react';
import { cx, riseDelay, useIsoLayoutEffect } from './core';

/* ───────────────────────── Loading: imprints that come with the component ─────────────────────────
 *
 * Pass what you have. A component whose content is `undefined` (your data hasn't arrived: `user?.name` while a query
 * loads) or a promise holds its own Suspense boundary, and its fallback is its own imprint: the same size and shape as
 * what is coming, pressed into the page, because it is drawn from the same props and tokens. `null` means there is
 * nothing, and renders as empty. Optional parts of a card (its description, its body text) wait only while the card's
 * required parts do, so a field that is simply missing never leaves an imprint behind. Containers (Card, CardContent)
 * also catch anything of yours that suspends inside them. When the content lands it rises out of its imprint, within
 * the attention budget. A component that has never waited renders exactly as before: no boundary, no extra element.
 */

/** A value, or a promise of one. A component that takes one shows its own imprint until it lands. */
export type Promised<T> = T | PromiseLike<T>;

/** Hints for a component's imprint, or `false` to let it suspend to your own boundary instead. */
export type SkeletonOption = boolean | { lines?: number; width?: number | string };

export const isPromise = (v: unknown): v is PromiseLike<unknown> =>
  !!v && (typeof v === 'object' || typeof v === 'function') && typeof (v as { then?: unknown }).then === 'function';

/** Content that may still be on its way: `undefined` while your data loads, or a promise. `null` means there is nothing. */
export type Pending<T> = T | PromiseLike<T> | undefined;

/** Children that hold a promise, at the top level or one level down (`Welcome back, {name}`). */
export const hasPromise = (children: unknown) => (Array.isArray(children) ? children.some(isPromise) : isPromise(children));

type Settled = { s: 'pending' | 'done' | 'error'; v?: unknown; e?: unknown };
const settled = new WeakMap<object, Settled>();
const reactUse = (React as unknown as { use?: <T>(p: PromiseLike<T>) => T }).use;

/**
 * Reads a promised value, suspending until it lands. React 19's `use()` when it's there; on React 18, the same contract
 * by hand (the promise is thrown to the nearest Suspense boundary and its result remembered).
 */
export function readPromised<T>(v: Promised<T>): T {
  if (!isPromise(v)) return v;
  if (reactUse) return reactUse(v);
  let r = settled.get(v);
  if (!r) {
    const rec: Settled = { s: 'pending' };
    settled.set(v, rec);
    v.then((x) => { rec.s = 'done'; rec.v = x; }, (e) => { rec.s = 'error'; rec.e = e; });
    r = rec;
  }
  if (r.s === 'done') return r.v as T;
  if (r.s === 'error') throw r.e;
  throw v;
}

/** Reads promised children, at the top level or one level down. */
export function readChildren(children: unknown): React.ReactNode {
  return (Array.isArray(children) ? children.map((c) => readPromised(c)) : readPromised(children)) as React.ReactNode;
}

/* ── Arrival: undefined means "not here yet" ── */

/**
 * Turns "not here yet" into a suspension: while `waiting`, returns a promise that resolves once it stops, for the
 * component's inner part to read (see Arrive), so its own boundary shows the imprint. Call it in the outer part, which
 * stays mounted and re-renders when your data arrives.
 */
export function useArrival(waiting: boolean): PromiseLike<void> | null {
  const d = React.useRef<{ p: Promise<void>; done: () => void } | null>(null);
  if (waiting && !d.current) {
    let done!: () => void;
    d.current = { p: new Promise<void>((r) => { done = r; }), done };
  }
  const cur = d.current;
  useIsoLayoutEffect(() => {
    if (!waiting && cur) { cur.done(); if (d.current === cur) d.current = null; }
  });
  return waiting && cur ? cur.p : null;
}
/** Suspends while `when` is pending; renders its children once it isn't. */
export function Arrive({ when, children }: { when: PromiseLike<void> | null; children?: React.ReactNode }) {
  if (when) readPromised(when);
  return <>{children}</>;
}
/** True from the first render that waited onwards, so the boundary stays mounted and the content can rise out of it. */
export function useHasWaited(waiting: boolean) {
  const r = React.useRef(false);
  if (waiting) r.current = true;
  return r.current;
}

/** A card's loading scope: required parts say whether they're still waiting; optional parts wait only while the card does. */
type Scope = { report: (id: object, waiting: boolean) => void; waiting: boolean };
const ScopeContext = React.createContext<Scope | null>(null);
export function LoadingScope({ children }: { children?: React.ReactNode }) {
  const [members] = React.useState(() => new Set<object>());
  const [waiting, setWaiting] = React.useState(false);
  const report = React.useCallback((id: object, w: boolean) => {
    if (w) members.add(id); else members.delete(id);
    setWaiting(members.size > 0);
  }, [members]);
  const value = React.useMemo(() => ({ report, waiting }), [report, waiting]);
  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
}
/** For required content (an avatar's name, a title, a badge's label, a table's rows): says whether it's still on its way. */
export function useReportWaiting(waiting: boolean) {
  const scope = React.useContext(ScopeContext);
  const [id] = React.useState(() => ({}));
  const report = scope?.report;
  useIsoLayoutEffect(() => { report?.(id, waiting); }, [report, waiting]);
  useIsoLayoutEffect(() => () => report?.(id, false), [report]);
}
/** For optional content: is the card it's in still waiting for its required parts? */
export const useScopeWaiting = () => !!React.useContext(ScopeContext)?.waiting;

/* ── RevealGroup: imprints that land together ── */

class Group {
  waiting = new Set<object>();
  held = new Map<object, () => void>();
  wait(id: object) { this.waiting.add(id); }
  /** Returns true when this was the last one: everything held is released together. */
  land(id: object, release: () => void) {
    this.waiting.delete(id);
    this.held.set(id, release);
    if (this.waiting.size) return false;
    this.flush();
    return true;
  }
  leave(id: object) {
    this.waiting.delete(id);
    this.held.delete(id);
    if (!this.waiting.size && this.held.size) this.flush();
  }
  private flush() {
    const all = Array.from(this.held.values());
    this.held.clear();
    all.forEach((f) => f());
  }
}
const GroupContext = React.createContext<Group | null>(null);

/**
 * Imprints inside a RevealGroup land together: each one that finishes waits, still an imprint, until the slowest has
 * landed, then they all rise at once (four at a time, as always). Group things that load from the same place.
 */
export function RevealGroup({ children }: { children?: React.ReactNode }) {
  const group = React.useMemo(() => new Group(), []);
  return <GroupContext.Provider value={group}>{children}</GroupContext.Provider>;
}

/* ── Await: the boundary every Suspense-native component holds ── */

/** How long an imprint waits before it shows (`dur-grace`): loads quicker than this show nothing and land without rising. */
const GRACE = 300;
type Box = { id: object; since: number | null };

export interface AwaitProps {
  /** The imprint: the fallback while the children suspend. */
  imprint: React.ReactNode;
  /** The shape left behind as content rises out of it. `none` for containers: their content just rises. */
  shape?: 'circle' | 'text' | 'block' | 'none';
  /** Sits in a line of text or a row of controls (an avatar, a badge) rather than as a block. */
  inline?: boolean;
  /** `false`: no boundary; the children suspend to yours. */
  enabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * A Suspense boundary whose fallback is an imprint, and whose content rises out of it. Every Suspense-native Altitude
 * component holds one; use it in your own components to give them the same behaviour.
 */
export function Await({ imprint, shape = 'block', inline, enabled = true, className, children }: AwaitProps) {
  const group = React.useContext(GroupContext);
  const box = React.useRef<Box>({ id: {}, since: null });
  React.useEffect(() => () => group?.leave(box.current.id), [group]);
  if (!enabled) return <>{children}</>;
  return (
    <React.Suspense fallback={<Imprint box={box} group={group} inline={inline}>{imprint}</Imprint>}>
      <Landed box={box} group={group} shape={shape} inline={inline} className={className} imprint={imprint}>{children}</Landed>
    </React.Suspense>
  );
}

function Imprint({ box, group, inline, children }: { box: React.MutableRefObject<Box>; group: Group | null; inline?: boolean; children: React.ReactNode }) {
  useIsoLayoutEffect(() => {
    if (box.current.since === null) box.current.since = performance.now();
    group?.wait(box.current.id);
  }, []);
  return (
    <span className="alt-await-wait" data-inline={inline ? '' : undefined} aria-busy="true">
      {children}
      <span className="alt-sr">Loading</span>
    </span>
  );
}

type Phase = 'held' | 'reveal' | null;
function Landed({ box, group, shape, inline, className, imprint, children }: {
  box: React.MutableRefObject<Box>; group: Group | null; shape: AwaitProps['shape']; inline?: boolean; className?: string;
  imprint: React.ReactNode; children: React.ReactNode;
}) {
  const [phase, setPhase] = React.useState<Phase>(null);
  const [delay, setDelay] = React.useState(0);
  const [graceLeft, setGraceLeft] = React.useState(0);
  const done = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Runs when the content first commits, and again each time it's shown after suspending anew (React re-runs layout
  // effects of content it hid behind a fallback).
  useIsoLayoutEffect(() => {
    const since = box.current.since;
    box.current.since = null;
    if (since === null) return;
    const release = () => {
      clearTimeout(done.current);
      // The imprint never showed: the content simply appears, as if it had been there all along.
      if (performance.now() - since < GRACE) { setPhase(null); return; }
      const d = riseDelay();
      setDelay(d);
      setPhase('reveal');
      done.current = setTimeout(() => setPhase(null), d + 320);
    };
    if (group && !group.land(box.current.id, release)) {
      setGraceLeft(Math.max(0, GRACE - (performance.now() - since)));
      setPhase('held');
    } else if (!group) release();
  }, []);
  React.useEffect(() => () => clearTimeout(done.current), []);
  return (
    <span className={cx('alt-await', className)} data-phase={phase ?? undefined} data-inline={inline ? '' : undefined} data-shape={shape}
      aria-busy={phase === 'held' || undefined}
      style={phase ? { ['--alt-rise-delay' as string]: delay + 'ms', ['--alt-grace-left' as string]: graceLeft + 'ms' } : undefined}>
      {/* Held: the same imprint as before stays in place (the content is laid out, hidden, behind it, so it can be measured). */}
      {phase === 'held' && <span className="alt-await-held" data-early={graceLeft > 0 ? '' : undefined} aria-hidden="true">{imprint}</span>}
      {phase === 'reveal' && shape !== 'none' && (
        <span className="alt-skeleton alt-await-imprint" data-shape={shape} aria-hidden="true" />
      )}
      <span className="alt-await-face">{children}</span>
    </span>
  );
}

/* ── Imprints the components share ── */

const LINE_WIDTHS = ['100%', '94%', '82%', '97%', '64%'];

/** Lines of text, as tall as the text they stand for (each line is one line-height of the surrounding type). */
export function TextImprint({ lines = 1, width, className }: { lines?: number; width?: number | string; className?: string }) {
  return (
    <span className={cx('alt-await-lines', className)} style={{ ['--lines' as string]: lines, width }}>
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className="alt-skeleton" data-shape="text"
          style={{ width: lines === 1 ? '100%' : i === lines - 1 ? '60%' : LINE_WIDTHS[i % LINE_WIDTHS.length], ['--i' as string]: i }} />
      ))}
    </span>
  );
}

export const hint = (s: SkeletonOption | undefined) => (typeof s === 'object' ? s : {});
