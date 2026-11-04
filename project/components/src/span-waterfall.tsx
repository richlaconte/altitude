import * as React from 'react';
import { cx, Icons } from './core';

/* SpanWaterfall (#466): where one request spent its time. Each span is a bar placed at when it started and sized by how
   long it ran, on one clock that starts at 0 (the root's start), indented under the span that called it. A finished
   request's spans are the record, so the bars are flat ink on the ground (Charts rule 1), and they never lift (rule 4).
   Colour does one job (rule 5): focus, with the critical path in data-1 and every other span in data-context; a failed
   span keeps its colour and adds a hatch, a status icon and the word "Failed". The rows are a treegrid (APG), so the
   table view is the chart itself: name, start and duration are real columns. A row is a Table row: it lifts on hover
   and is tinted and raised one level when selected, while its bar only takes a 2px ink outline. A span's detail opens
   flush beneath its row (Elevation, Disclosure: a row can't lift into a card). */

export interface Span {
  id: string;
  /** The span that called it. Omit for the root. */
  parent?: string;
  name: string;
  /** Milliseconds from the request's start (the root's start is 0). */
  start: number;
  /** Milliseconds it ran. */
  duration: number;
  status?: 'ok' | 'failed';
}

export interface SpanWaterfallProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  spans: Span[];
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** Milliseconds → words. Default: "84 ms" under a second, "2.41 s" from a second up. */
  format?: (ms: number) => string;
  /** Your summary, written from the data. Default: a factual one ("14 spans over 2.41 s. Longest: …"), not a takeaway. */
  summary?: React.ReactNode;
  /** Highlight the critical path (focus), the spans the request waited on: true computes it (criticalPathOf), or pass its span ids. */
  criticalPath?: boolean | string[];
  /** A span's detail, opened flush beneath its row by Enter or its expand control. */
  renderDetail?: (span: Span) => React.ReactNode;
  /** Expanded callers, by id. Controlled with onExpandedChange; uncontrolled from defaultExpandedDepth. */
  expanded?: string[];
  onExpandedChange?: (ids: string[]) => void;
  /** Callers shallower than this start expanded. Default 2. */
  defaultExpandedDepth?: number;
  selected?: string | null;
  onSelectedChange?: (id: string) => void;
}

export const formatMs = (ms: number) => (Math.abs(ms) < 1000 ? `${new Intl.NumberFormat().format(Math.round(ms))} ms` : `${(ms / 1000).toFixed(2)} s`);

/**
 * The critical path: the spans the request waited on. From the root's end, walk back: the child that ends last before
 * that point is on the path (and the same is done inside it); then continue from that child's start (the definition
 * trace viewers such as Jaeger use).
 */
export function criticalPathOf(spans: Span[]): string[] {
  const kids = new Map<string, Span[]>();
  for (const s of spans) if (s.parent) kids.set(s.parent, [...(kids.get(s.parent) ?? []), s]);
  const end = (s: Span) => s.start + s.duration;
  const path: string[] = [];
  const walk = (s: Span, bound: number) => {
    path.push(s.id);
    let cursor = Math.min(end(s), bound);
    for (const c of (kids.get(s.id) ?? []).slice().sort((a, b) => end(b) - end(a))) {
      if (end(c) <= cursor + 0.001 && end(c) > s.start) { walk(c, cursor); cursor = Math.min(cursor, c.start); }
    }
  };
  const roots = spans.filter((s) => !s.parent || !spans.some((p) => p.id === s.parent)).sort((a, b) => end(b) - end(a));
  if (roots[0]) walk(roots[0], Infinity);
  return path;
}

/** Ticks at 1, 2 or 5 × 10ⁿ, about five across. */
function ticks(lo: number, hi: number) {
  const range = Math.max(1, hi - lo), raw = range / 5, p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) out.push(Math.round(t * 1000) / 1000);
  return out;
}

type Row = { span: Span; depth: number; kids: number; inside: number; skew: string };

export function SpanWaterfall({ spans, format = formatMs, summary, criticalPath, renderDetail, expanded: expandedProp, onExpandedChange,
  defaultExpandedDepth = 2, selected: selectedProp, onSelectedChange, className, ...rest }: SpanWaterfallProps) {
  const auto = React.useId().replace(/:/g, '');
  const byId = React.useMemo(() => new Map(spans.map((s) => [s.id, s])), [spans]);
  const children = React.useMemo(() => {
    const m = new Map<string | undefined, Span[]>();
    for (const s of spans) { const p = s.parent && byId.has(s.parent) ? s.parent : undefined; m.set(p, [...(m.get(p) ?? []), s]); }
    m.forEach((list) => list.sort((a, b) => a.start - b.start));
    return m;
  }, [spans, byId]);
  const depthOf = React.useCallback((s: Span) => { let d = 0, p = s.parent ? byId.get(s.parent) : undefined; while (p) { d++; p = p.parent ? byId.get(p.parent) : undefined; } return d; }, [byId]);
  const [ownExpanded, setOwnExpanded] = React.useState<string[]>(() => spans.filter((s) => depthOf(s) < defaultExpandedDepth).map((s) => s.id));
  const expanded = new Set(expandedProp ?? ownExpanded);
  const setExpanded = (ids: string[]) => { if (!expandedProp) setOwnExpanded(ids); onExpandedChange?.(ids); };
  const [ownSelected, setOwnSelected] = React.useState<string | null>(null);
  const selected = selectedProp !== undefined ? selectedProp : ownSelected;
  const select = (id: string) => { if (selectedProp === undefined) setOwnSelected(id); onSelectedChange?.(id); };
  const [details, setDetails] = React.useState<Set<string>>(new Set());
  const [focus, setFocus] = React.useState<string | null>(null);
  const box = React.useRef<HTMLDivElement>(null);

  const count = (id: string): number => (children.get(id) ?? []).reduce((n, c) => n + 1 + count(c.id), 0);
  const rows: Row[] = [];
  const walk = (list: Span[], depth: number) => {
    for (const s of list) {
      const p = s.parent ? byId.get(s.parent) : undefined;
      const before = p ? p.start - s.start : 0, after = p ? s.start + s.duration - (p.start + p.duration) : 0;
      const skew = before > 0.5 ? `started ${format(before)} before its caller` : after > 0.5 ? `ran ${format(after)} after its caller ended` : '';
      const kids = (children.get(s.id) ?? []).length;
      rows.push({ span: s, depth, kids, inside: count(s.id), skew });
      if (kids && expanded.has(s.id)) walk(children.get(s.id)!, depth + 1);
    }
  };
  walk(children.get(undefined) ?? [], 0);

  const lo = Math.min(0, ...spans.map((s) => s.start));
  const hi = Math.max(1, ...spans.map((s) => s.start + s.duration));
  const pos = (ms: number) => `${((ms - lo) / (hi - lo)) * 100}%`;
  const marks = ticks(lo, hi);
  const path = new Set(criticalPath === true ? criticalPathOf(spans) : Array.isArray(criticalPath) ? criticalPath : []);
  const focusOn = !!criticalPath && path.size > 0;
  const failed = spans.filter((s) => s.status === 'failed');
  const total = hi - lo;
  const longest = spans.filter((s) => s.parent).sort((a, b) => b.duration - a.duration)[0] ?? spans[0];
  const written = summary ?? (spans.length ? `${spans.length} ${spans.length === 1 ? 'span' : 'spans'} over ${format(total)}.${longest ? ` Longest: ${longest.name}, ${format(longest.duration)} (${Math.round((longest.duration / Math.max(1, total)) * 100)}%).` : ''}${failed.length ? ` ${failed.length} failed.` : ''}${focusOn ? ` Highlighted: the critical path, ${path.size} spans.` : ''}` : 'No spans.');

  const ids = rows.map((r) => r.span.id);
  const stop = focus && ids.includes(focus) ? focus : selected && ids.includes(selected) ? selected : ids[0];
  const rowEl = (id: string) => box.current?.querySelector<HTMLElement>(`[data-span="${CSS.escape(id)}"]`) ?? null;
  // Focus at once when the row is there; a row just revealed by expanding gets it after the render.
  const go = (id?: string) => { if (!id) return; setFocus(id); const el = rowEl(id); if (el) el.focus(); else requestAnimationFrame(() => rowEl(id)?.focus()); };
  const toggleDetail = (id: string) => setDetails((d) => { const n = new Set(d); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const onKey = (e: React.KeyboardEvent, r: Row) => {
    const i = ids.indexOf(r.span.id), id = r.span.id;
    if (e.key === 'ArrowDown') { e.preventDefault(); go(ids[i + 1]); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); go(ids[i - 1]); }
    else if (e.key === 'Home') { e.preventDefault(); go(ids[0]); }
    else if (e.key === 'End') { e.preventDefault(); go(ids[ids.length - 1]); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); if (r.kids && !expanded.has(id)) setExpanded([...expanded, id]); else if (r.kids) go(children.get(id)![0].id); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); if (r.kids && expanded.has(id)) setExpanded([...expanded].filter((x) => x !== id)); else if (r.span.parent && byId.has(r.span.parent)) go(r.span.parent); }
    else if (e.key === 'Enter') { e.preventDefault(); if (renderDetail) toggleDetail(id); else select(id); }
    else if (e.key === ' ') { e.preventDefault(); select(id); }
  };

  const describe = (r: Row) => [
    `started at ${format(r.span.start)}`, `took ${format(r.span.duration)}`,
    r.span.status === 'failed' ? 'failed' : '', focusOn && path.has(r.span.id) ? 'on the critical path' : '', r.skew,
    r.kids && !expanded.has(r.span.id) ? `${r.inside} ${r.inside === 1 ? 'span' : 'spans'} inside` : '',
  ].filter(Boolean).join(', ');

  return (
    <div className={cx('alt-spans', className)} data-focus={focusOn ? '' : undefined} {...rest}>
      <p id={`${auto}-sum`} className="alt-spans-summary">{written}</p>
      <div ref={box} role="treegrid" aria-label={rest['aria-label']} aria-labelledby={rest['aria-labelledby']} aria-describedby={`${auto}-sum`}
        aria-colcount={4} className="alt-spans-grid">
        <div role="row" className="alt-spans-head">
          <span role="columnheader" className="alt-spans-c-name">Span</span>
          <span role="columnheader" className="alt-spans-c-num">Start</span>
          <span role="columnheader" className="alt-spans-c-num">Duration</span>
          <span role="columnheader" className="alt-spans-c-bar">
            <span className="alt-sr">Timeline</span>
            <span className="alt-spans-axis" aria-hidden="true">
              {marks.map((t) => <span key={t} className="alt-spans-tick" style={{ left: pos(t) }}>{format(t)}</span>)}
            </span>
          </span>
        </div>
        {rows.map((r, i) => {
          const s = r.span, on = path.has(s.id), open = details.has(s.id);
          const left = pos(s.start), width = `max(2px, ${(s.duration / (hi - lo)) * 100}%)`;
          return (
            <React.Fragment key={s.id}>
              <div role="row" data-span={s.id} aria-level={r.depth + 1} aria-expanded={r.kids ? expanded.has(s.id) : renderDetail ? open : undefined}
                aria-selected={selected === s.id} data-selected={selected === s.id ? '' : undefined} data-failed={s.status === 'failed' ? '' : undefined}
                data-path={focusOn ? (on ? 'on' : 'off') : undefined} tabIndex={s.id === stop ? 0 : -1} className="alt-spans-row"
                aria-describedby={`${auto}-d-${i}`}
                style={{ '--alt-span-depth': Math.min(r.depth, 4) } as React.CSSProperties}
                onFocus={() => setFocus(s.id)} onKeyDown={(e) => onKey(e, r)} onClick={() => select(s.id)}>
                <span role="gridcell" className="alt-spans-c-name">
                  {r.kids ? <button type="button" tabIndex={-1} className="alt-spans-toggle" aria-label={`${expanded.has(s.id) ? 'Collapse' : 'Expand'} ${s.name}`}
                    onClick={(e) => { e.stopPropagation(); setExpanded(expanded.has(s.id) ? [...expanded].filter((x) => x !== s.id) : [...expanded, s.id]); }}>
                    <Icons.ChevronDown size={14} aria-hidden="true" /></button> : <span className="alt-spans-toggle-gap" aria-hidden="true" />}
                  <span className="alt-spans-name">{s.name}</span>
                  {s.status === 'failed' && <span className="alt-spans-word">Failed</span>}
                  {r.depth > 4 && <span className="alt-spans-sub">level {r.depth + 1}</span>}
                  {r.skew && <span className="alt-spans-sub">{r.skew}</span>}
                  {r.kids > 0 && !expanded.has(s.id) && <span className="alt-spans-sub">{r.inside} {r.inside === 1 ? 'span' : 'spans'} inside</span>}
                  <span id={`${auto}-d-${i}`} className="alt-sr">{describe(r)}</span>
                </span>
                <span role="gridcell" className="alt-spans-c-num">{format(s.start)}</span>
                <span role="gridcell" className="alt-spans-c-num">{format(s.duration)}</span>
                <span role="gridcell" className="alt-spans-c-bar" aria-hidden="true">
                  <span className="alt-spans-track" />
                  <span className="alt-spans-bar" style={{ left, width }} />
                  {s.status === 'failed' && <span className="alt-spans-fail" style={{ left: `calc(${left} + ${width} + 4px)` }}><Icons.AlertCircle size={13} /></span>}
                </span>
              </div>
              {open && renderDetail && (
                <div role="row" className="alt-spans-detail" aria-level={r.depth + 2}>
                  <div role="gridcell" aria-colspan={4} aria-label={`Detail of ${s.name}`}>{renderDetail(s)}</div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
