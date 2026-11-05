import * as React from 'react';
import { cx, useControllable } from './core';
import { Button } from './controls';

/**
 * ChartScope (#529): one record, many views. The charts, stats and tables inside one scope share a slice, a pointer, a
 * window, a selection and a palette, and the slice is said once in words. It's a context with one flush caption: the
 * record and its views stay on the ground, and nothing new is raised.
 *
 * This module holds no chart code, so ChartContainer and DataTable can both read the scope without importing each other.
 */

/** An entity's value: a series key ("checkout"), or a value of the scope's `by` key in a record ("EU"). */
export type ChartScopeValue = string | number;
/** A fixed stretch of x, both ends included: what a ChartBrush sets and a DateRangePicker gives. */
export interface ChartScopeWindow { start?: string | number | null; end?: string | number | null }
/** A categorical slot of the data palette (the same union as ChartSlot, kept here so this module stands alone). */
type Slot = `data-${1 | 2 | 3 | 4 | 5 | 6}` | 'data-other';
type Datum = Record<string, unknown>;

export interface ChartScopeProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> {
  /** The slice every view shows, in words, said once: "Last 30 days · EU". The scope appends what a selection filters to. */
  slice?: React.ReactNode;
  /**
   * The key that names an entity in a record ("service", "region"). A record carrying it can be selected from any chart,
   * and a selection recedes the records that miss in every chart and table that carries it. Series keys are entities
   * too: selecting "checkout" recedes the other lines in a chart whose series are services.
   */
  by?: string;
  /** What the entities are called, for the caption's count: "4 of 12 services". Default "items". */
  noun?: string;
  /** The selected entities, controlled: one value, several, or null for none. */
  selected?: ChartScopeValue | ChartScopeValue[] | null;
  defaultSelected?: ChartScopeValue | ChartScopeValue[] | null;
  /** When a chart's mark, Clear or Escape changes the selection: the values now selected (empty for none). */
  onSelectedChange?: (selected: ChartScopeValue[]) => void;
  /** The window every chart over time or numbers shows, controlled. One ChartBrush anywhere in the scope sets it. */
  window?: ChartScopeWindow | null;
  defaultWindow?: ChartScopeWindow | null;
  onWindowChange?: (window: ChartScopeWindow) => void;
  /**
   * One colour per entity across every chart in the scope. true (default): each series key takes the next slot the
   * first time any chart in the scope draws it, and holds it for the scope's life, so "EU" is data-2 in every card. An
   * array fixes the order (use it when charts mount out of order or render on the server); keys it doesn't name follow
   * it. false: each chart keeps its config order. A series' own `config.color` always wins.
   */
  palette?: boolean | string[];
  /** Render the slice caption at the top. Default true; place a ChartScopeCaption yourself instead with false. */
  caption?: boolean;
}

/** What a chart or a table may override about how it takes part in its scope. */
export interface ChartScopeView {
  /** Whether a record matches the selected values: true, false, or undefined when the selection says nothing about it. */
  match?: (d: Datum, selected: ChartScopeValue[]) => boolean | undefined;
  /** The entity a record stands for when chosen, instead of `d[by]`; null when it stands for none. */
  select?: (d: Datum) => ChartScopeValue | null | undefined;
}

type Pointer = { src: string; kind: string; x: unknown } | null;

interface ScopeContext {
  by?: string;
  selected: ChartScopeValue[];
  /** Choose one entity: it becomes the selection, or clears it when it's the only one selected. */
  toggle: (v: ChartScopeValue) => void;
  clear: () => void;
  has: (v: unknown) => boolean;
  window: ChartScopeWindow | null;
  setWindow: (w: ChartScopeWindow) => void;
  /** An entity's slot in the shared palette, or undefined when the scope doesn't own colour. */
  slot: (key: string) => Slot | undefined;
  /** Changes when the shared palette assigns a slot, for memo keys. */
  paletteKey: string;
  /** The shared pointer: one x, said by the chart under the pointer or keyboard. */
  pointer: { get: () => Pointer; set: (p: Pointer) => void; subscribe: (fn: () => void) => () => void };
  /** A view tells the scope which entities it draws and their names, for the caption's words. */
  register: (id: string, entries: Array<[string, string]>) => void;
  unregister: (id: string) => void;
  /** The selection in a sentence, for every view's summary: "Filtered to Checkout." or "". */
  sentence: string;
}

const Ctx = React.createContext<ScopeContext | null>(null);

const asList = (v: ChartScopeValue | ChartScopeValue[] | null | undefined): ChartScopeValue[] => (v == null ? [] : Array.isArray(v) ? v : [v]);
const join = (names: string[]) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] ?? '');

/**
 * Wrap the charts, stats and tables that show one slice of one record. One pointer reads across them (every chart with
 * the same kind of x marks the same x; the readout opens only where the pointer is), one brush moves every chart over
 * time, a mark chosen in one chart recedes what misses in all of them at 35%, positions held, and one entity keeps one
 * colour in all of them. The slice is said once, as a flush caption, and each chart's summary says the selection too.
 */
export function ChartScope({ slice, by, noun = 'items', selected: selectedProp, defaultSelected = null, onSelectedChange, window: windowProp, defaultWindow = null,
  onWindowChange, palette = true, caption = true, className, children, ...rest }: ChartScopeProps) {
  const [selRaw, setSelRaw] = useControllable<ChartScopeValue | ChartScopeValue[] | null>(selectedProp, defaultSelected, onSelectedChange as ((v: ChartScopeValue | ChartScopeValue[] | null) => void) | undefined);
  const selected = asList(selRaw);
  const setSelected = React.useCallback((v: ChartScopeValue[]) => setSelRaw(v), [setSelRaw]);
  const [win, setWin] = useControllable<ChartScopeWindow | null>(windowProp, defaultWindow, onWindowChange as ((w: ChartScopeWindow | null) => void) | undefined);

  // The palette: slots are given during render, in the order charts draw their series, and never taken back, so a key
  // keeps its colour while series are hidden, filtered or remounted.
  const slots = React.useRef(new Map<string, Slot>());
  const fixed = Array.isArray(palette) ? palette : null;
  const fixedKey = fixed ? fixed.join('|') : '';
  if (fixed && slots.current.size === 0) fixed.forEach((k, i) => slots.current.set(k, i < 6 ? (`data-${i + 1}` as Slot) : 'data-other'));
  const [paletteGen, setPaletteGen] = React.useState(0);
  React.useEffect(() => { slots.current = new Map(); setPaletteGen((g) => g + 1); }, [fixedKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const slot = React.useCallback((key: string): Slot | undefined => {
    if (palette === false) return undefined;
    const m = slots.current;
    if (fixed && m.size === 0) fixed.forEach((k, i) => m.set(k, i < 6 ? (`data-${i + 1}` as Slot) : 'data-other'));
    let s = m.get(key);
    if (!s) { const n = m.size; s = n < 6 ? (`data-${n + 1}` as Slot) : 'data-other'; m.set(key, s); }
    return s;
  }, [palette === false, fixedKey, paletteGen]); // eslint-disable-line react-hooks/exhaustive-deps

  // The pointer lives outside React state, so a crosshair moving in one chart redraws only its siblings' rules.
  const pointer = React.useMemo(() => {
    let p: Pointer = null;
    const fns = new Set<() => void>();
    return {
      get: () => p,
      set: (next: Pointer) => {
        if (p === next || (p && next && p.src === next.src && p.kind === next.kind && String(p.x) === String(next.x))) return;
        p = next; fns.forEach((f) => f());
      },
      subscribe: (fn: () => void) => { fns.add(fn); return () => { fns.delete(fn); }; },
    };
  }, []);

  // The entities the views draw, and their names.
  const [names, setNames] = React.useState<Record<string, Array<[string, string]>>>({});
  const register = React.useCallback((id: string, entries: Array<[string, string]>) => setNames((n) => {
    const was = n[id];
    if (was && was.length === entries.length && was.every((e, i) => e[0] === entries[i][0] && e[1] === entries[i][1])) return n;
    return { ...n, [id]: entries };
  }), []);
  const unregister = React.useCallback((id: string) => setNames((n) => { if (!(id in n)) return n; const next = { ...n }; delete next[id]; return next; }), []);
  const nameOf = new Map<string, string>();
  for (const list of Object.values(names)) for (const [v, label] of list) if (!nameOf.has(v)) nameOf.set(v, label);
  const total = nameOf.size;
  const selNames = selected.map((v) => nameOf.get(String(v)) ?? String(v));
  const filterWords = !selected.length ? '' : selected.length <= 3 ? join(selNames) : `${selected.length} of ${Math.max(total, selected.length)} ${noun}`;
  const sentence = filterWords ? `Filtered to ${filterWords}.` : '';

  const selKey = selected.map(String).join('\u0000');
  const ctx = React.useMemo<ScopeContext>(() => ({
    by, selected,
    toggle: (v) => setSelected(selected.length === 1 && String(selected[0]) === String(v) ? [] : [v]),
    clear: () => setSelected([]),
    has: (v) => v != null && selected.some((s) => String(s) === String(v)),
    window: win ?? null,
    setWindow: (w) => setWin(w),
    slot, paletteKey: `${palette === false ? 'off' : fixedKey}#${paletteGen}`,
    pointer, register, unregister, sentence,
  }), [by, selKey, win, slot, paletteGen, fixedKey, palette === false, pointer, register, unregister, sentence, setSelected, setWin]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Ctx.Provider value={ctx}>
      <section className={cx('alt-chart-scope', className)} {...rest}>
        {caption && <ChartScopeCaption>{slice}</ChartScopeCaption>}
        {children}
      </section>
    </Ctx.Provider>
  );
}

/**
 * The scope's slice, in words, with what a selection filters to and a Clear: "Last 30 days · EU · Filtered to Checkout".
 * Flush on the ground, at caption weight. Rendered at the top of a ChartScope by default; pass `caption={false}` to
 * the scope and place this where the slice should be read (under a FilterBar, say). Its children replace the scope's
 * `slice`.
 */
export function ChartScopeCaption({ children, className, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) {
  const scope = React.useContext(Ctx);
  if (!scope) return null;
  const words = scope.sentence.replace(/\.$/, '');
  if (children == null && !words) return null;
  return (
    <div className={cx('alt-chart-scope-caption', className)} {...rest}>
      {/* Polite, and said once per change of slice or selection: the pointer never touches it. */}
      <p aria-live="polite" aria-atomic="true">
        {children}
        {children != null && words ? <span aria-hidden="true"> · </span> : null}
        {words && <span className="alt-chart-scope-filter">{words}</span>}
      </p>
      {words && <Button variant="ghost" size="sm" onClick={scope.clear}>Clear</Button>}
    </div>
  );
}

/* ───────────────────────── for views ───────────────────────── */

/** Internal, for ChartContainer and DataTable: the nearest scope, or null outside one or when the view opts out. */
export function useScope(optOut?: boolean): ScopeContext | null {
  const c = React.useContext(Ctx);
  return optOut ? null : c;
}

/** Internal: a record's standing under the scope's selection: 'match', 'miss', or undefined when it says nothing. */
export function scopeRelevance(scope: ScopeContext | null, view: ChartScopeView | undefined, d: Datum): 'match' | 'miss' | undefined {
  if (!scope || !scope.selected.length) return undefined;
  const own = view?.match?.(d, scope.selected);
  if (own !== undefined) return own ? 'match' : 'miss';
  const v = view?.select ? view.select(d) : scope.by ? d[scope.by] : undefined;
  if (v == null) return undefined;
  return scope.has(v) ? 'match' : 'miss';
}

/** Internal: whether records of this view carry an entity the scope can select. */
export function scopeCarries(scope: ScopeContext | null, view: ChartScopeView | undefined, rows: Datum[]): boolean {
  if (!scope) return false;
  if (view?.select || view?.match) return true;
  return !!scope.by && rows.some((d) => d[scope.by!] != null);
}

/** Internal: tell the scope which entities a view draws, with their names, for as long as it's mounted. */
export function useScopeNames(scope: ScopeContext | null, id: string, entries: Array<[string, string]>) {
  const key = entries.map((e) => e.join('\u0001')).join('\u0000');
  React.useEffect(() => { if (scope) scope.register(id, entries); }, [scope?.register, id, key]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => () => scope?.unregister(id), [scope?.unregister, id]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Internal: the shared pointer's x, for a sibling chart's crosshair. Re-renders only the caller when it moves. */
export function useScopePointer(scope: ScopeContext | null): Pointer {
  const noop = React.useCallback(() => () => {}, []);
  const none = React.useCallback(() => null, []);
  return React.useSyncExternalStore(scope ? scope.pointer.subscribe : noop, scope ? scope.pointer.get : none, none);
}

/**
 * Internal: the crosshair a sibling draws where the pointer is in another chart of the scope: the same 1px line-control
 * rule, no readout. `at` places an x value in plot px, or returns null when this chart has no such x.
 */
export function ChartScopeCrosshair({ scope, self, kind, at, length, horizontal }: { scope: ScopeContext; self: string; kind: string; at: (x: unknown) => number | null; length: number; horizontal: boolean }) {
  const p = useScopePointer(scope);
  if (!p || p.src === self || p.kind !== kind) return null;
  const v = at(p.x);
  if (v === null || !isFinite(v)) return null;
  const c = Math.round(v) + 0.5;
  return horizontal
    ? <line className="alt-chart-crosshair" data-scope="" x1={0} x2={length} y1={c} y2={c} />
    : <line className="alt-chart-crosshair" data-scope="" x1={c} x2={c} y1={0} y2={length} />;
}
