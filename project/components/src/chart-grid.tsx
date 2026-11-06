import * as React from 'react';
import { cx, useIsoLayoutEffect } from './core';
import { ChartContainer, ChartPanelContext, toTime, type ChartConfig, type ChartContainerProps, type ChartDatum, type ChartPanel } from './chart';
import { ChartScope, useScope } from './chart-scope';

/**
 * ChartGrid (#530): small multiples. One series per panel when there are too many to overlay or their scales differ,
 * and the answer Charts rule 6 names for two measures of different scale. One figure on the ground: the panels share a
 * y scale by default so lengths compare across them (and say so when they don't), one y axis is read in the first
 * column and one x axis in the last row, one pointer reads across every panel, and the panels make one Tab stop.
 */
export interface ChartGridProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title' | 'children'> {
  /** The series each panel draws, as on ChartContainer. Every panel draws the same series over its own records. */
  config: ChartConfig;
  /** Every record, each carrying the `by` key that says which panel it belongs to. */
  data: ChartDatum[];
  /** The key of x in each record. */
  x?: string;
  /** The key whose values become panels: "service", "region". */
  by: string;
  /** A panel's name from its value. Default the value as written. */
  panelLabel?: (value: string) => string;
  /** At most this many columns. At 640px and below it's 2, at 480px and below 1. Default 4. */
  columns?: number;
  /**
   * 'shared' (default): one y and one x across the panels, so lengths compare. 'free-y': each panel has its own y,
   * said in its caption ("own scale") and read inline in each panel. 'free': each panel has its own y and x.
   */
  scales?: 'shared' | 'free-y' | 'free';
  /** The panels' order: 'data' (default) as the records first name them, or by each panel's last value. */
  sort?: 'data' | 'desc' | 'asc';
  /** The panels this grid is about: they keep their colours and the rest take data-context, said in words. */
  focus?: string[];
  /** Each panel's plot height in px. Default 120. */
  height?: number;
  title?: React.ReactNode;
  /** The one thing the grid says, as its heading (Charts rule 9). */
  takeaway?: React.ReactNode;
  description?: React.ReactNode;
  /** Your own summary, instead of the generated one. */
  summary?: React.ReactNode;
  /** As on ChartContainer, for every panel. */
  xScale?: ChartContainerProps['xScale'];
  yFormat?: ChartContainerProps['yFormat'];
  xFormat?: ChartContainerProps['xFormat'];
  locale?: string;
  tooltip?: boolean;
  /** The chart type every panel draws: `<LineChart />`, `<BarChart />`, `<AreaChart />`. */
  children: React.ReactElement;
}

type Extent = [number, number];
const isTimeLike = (v: unknown) => v instanceof Date || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v));

/** The y extent of one panel's records: each value, or each record's total for a stack. */
function extentOf(rows: ChartDatum[], keys: string[], stack: unknown): Extent | null {
  if (stack === 'expand') return [0, 1];
  let lo = Infinity, hi = -Infinity;
  for (const d of rows) {
    if (stack) {
      let pos = 0, neg = 0;
      for (const k of keys) { const v = d[k]; if (typeof v === 'number' && isFinite(v)) { if (v >= 0) pos += v; else neg += v; } }
      lo = Math.min(lo, neg); hi = Math.max(hi, pos);
    } else for (const k of keys) { const v = d[k]; if (typeof v === 'number' && isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
  }
  return isFinite(lo) ? [lo, hi] : null;
}

/** The grid's column count at a width: `columns` at most, 2 at 640px and below, 1 at 480px and below. */
function colsAt(w: number, columns: number, n: number) {
  const c = w > 0 && w <= 480 ? 1 : w > 0 && w <= 640 ? Math.min(2, columns) : columns;
  return Math.max(1, Math.min(c, n));
}

export function ChartGrid({ config, data, x, by, panelLabel, columns = 4, scales = 'shared', sort = 'data', focus, height = 120, title, takeaway, description, summary,
  xScale, yFormat, xFormat, locale, tooltip, className, children, ...rest }: ChartGridProps) {
  const id = React.useId();
  const outer = useScope();
  const box = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);
  useIsoLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rows = Array.isArray(data) ? data : [];
  const keys = Object.keys(config);
  const first = keys[0];
  const stack = (children.props as { stack?: unknown }).stack;
  const nameOf = (v: string) => (panelLabel ? panelLabel(v) : v);
  const fmt = config[first]?.format ?? yFormat ?? ((v: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(v));

  // The panels, each with its records, in the order asked for.
  const panels = React.useMemo(() => {
    const groups = new Map<string, ChartDatum[]>();
    for (const d of rows) { const v = d[by]; if (v == null) continue; const k = String(v); let g = groups.get(k); if (!g) groups.set(k, (g = [])); g.push(d); }
    const list = [...groups].map(([value, rs]) => {
      const lastRow = [...rs].reverse().find((d) => typeof d[first] === 'number');
      return { value, rows: rs, last: lastRow ? (lastRow[first] as number) : null, extent: extentOf(rs, keys, stack) };
    });
    if (sort !== 'data') list.sort((a, b) => ((b.last ?? -Infinity) - (a.last ?? -Infinity)) * (sort === 'desc' ? 1 : -1));
    return list;
  }, [rows, by, first, keys.join('|'), String(stack), sort]); // eslint-disable-line react-hooks/exhaustive-deps

  // Shared scales: every panel draws over the whole grid's y, and its x unless the scales are free.
  const yAll = React.useMemo<Extent | undefined>(() => {
    if (scales !== 'shared') return undefined;
    const es = panels.map((p) => p.extent).filter((e): e is Extent => !!e);
    return es.length ? [Math.min(...es.map((e) => e[0])), Math.max(...es.map((e) => e[1]))] : undefined;
  }, [panels, scales]);
  const xAll = React.useMemo<Extent | undefined>(() => {
    if (scales === 'free' || !x) return undefined;
    const sample = rows.find((d) => d[x] != null)?.[x];
    const time = xScale === 'time' || (xScale == null && isTimeLike(sample));
    if (!time && !(xScale === 'linear' || (xScale == null && typeof sample === 'number'))) return undefined;
    const vs = rows.map((d) => (time ? toTime(d[x]) : Number(d[x]))).filter((v) => isFinite(v));
    return vs.length ? [Math.min(...vs), Math.max(...vs)] : undefined;
  }, [rows, x, xScale, scales]);

  const cols = colsAt(width, Math.max(1, Math.floor(columns)), panels.length);
  const lastRowStart = panels.length - (panels.length % cols || cols);

  // One Tab stop: the current panel holds it, and ←/→ (↑/↓ by a row, Home/End) move it.
  const [current, setCurrent] = React.useState(0);
  const cur = Math.min(current, Math.max(0, panels.length - 1));
  const focusPanel = (j: number) => {
    setCurrent(j);
    requestAnimationFrame(() => box.current?.querySelector<HTMLElement>(`[data-panel="${j}"] .alt-chart-node[data-current]`)?.focus());
  };
  const moveFrom = (i: number) => (key: string): boolean => {
    const n = panels.length;
    const to = key === 'ArrowRight' ? i + 1 : key === 'ArrowLeft' ? i - 1 : key === 'ArrowDown' ? i + cols : key === 'ArrowUp' ? i - cols
      : key === 'Home' ? 0 : key === 'End' ? n - 1 : null;
    if (to === null) return false;
    if (to >= 0 && to < n && to !== i) focusPanel(to);
    return true;
  };

  // A shared scale over panels an order of magnitude apart flattens the small ones: say so, so it's chosen knowingly.
  const peaks = panels.map((p) => ({ p, m: p.extent ? Math.max(Math.abs(p.extent[0]), Math.abs(p.extent[1])) : 0 })).filter((q) => q.m > 0);
  const big = peaks.length > 1 ? peaks.reduce((a, b) => (b.m > a.m ? b : a)) : null;
  const small = peaks.length > 1 ? peaks.reduce((a, b) => (b.m < a.m ? b : a)) : null;
  const ratio = big && small ? big.m / small.m : 1;
  const note = scales === 'shared' && ratio > 10 ? `${nameOf(big!.p.value)}'s scale is ${Math.round(ratio)}× ${nameOf(small!.p.value)}'s.` : '';

  // The grid in words: its kind, its panels and its scale, then which panel ends highest and lowest.
  const type = children.type as { chartInfo?: (p: Record<string, unknown>, c: ChartConfig) => { kind?: string } };
  const kind = type.chartInfo?.(children.props as Record<string, unknown>, config)?.kind ?? 'Chart';
  const ended = panels.filter((p) => p.last !== null);
  const hiP = ended.length ? ended.reduce((a, b) => (b.last! > a.last! ? b : a)) : null;
  const loP = ended.length > 1 ? ended.reduce((a, b) => (b.last! < a.last! ? b : a)) : null;
  const focusNames = focus?.length ? panels.filter((p) => focus.includes(p.value)).map((p) => nameOf(p.value)) : [];
  const generated = [
    focusNames.length ? `Highlighted: ${focusNames.join(', ')}.` : '',
    `Small multiples: a ${kind.toLowerCase()} of ${config[first]?.label ?? first} for each ${by}, ${panels.length} ${panels.length === 1 ? 'panel' : 'panels'}, ${scales === 'shared' ? 'on one scale' : scales === 'free-y' ? 'each on its own y scale' : 'each on its own scales'}.`,
    hiP && loP && hiP !== loP ? `At the end, ${nameOf(hiP.value)} is highest at ${fmt(hiP.last!)} and ${nameOf(loP.value)} lowest at ${fmt(loP.last!)}.` : '',
    note,
  ].filter(Boolean).join(' ');

  const titleId = title ? `${id}-t` : undefined, takeId = takeaway ? `${id}-k` : undefined, descId = description ? `${id}-d` : undefined, sumId = `${id}-s`;
  const chartFocus = (children.props as { focus?: unknown }).focus;

  const grid = (
    <div ref={box} className="alt-chart-multiples-panels" style={{ '--alt-grid-cols': cols } as React.CSSProperties}>
      {panels.map((p, i) => {
        const panel: ChartPanel = {
          name: nameOf(p.value), index: i, count: panels.length,
          yText: scales !== 'shared' || i % cols === 0, xText: scales === 'free' || i >= lastRowStart,
          yExtent: yAll, xExtent: xAll,
          current: i === cur, move: moveFrom(i), enter: () => setCurrent(i),
        };
        const inFocus = !focus?.length || focus.includes(p.value);
        // One series per panel is named by the panel's caption, so a line's end label would only repeat it.
        const own = children.props as { endLabels?: boolean };
        const chart = React.cloneElement(children, { focus: inFocus ? chartFocus : [], ...(own.endLabels === undefined && keys.length === 1 ? { endLabels: false } : {}) } as Record<string, unknown>);
        return (
          <div key={p.value} data-panel={i} className="alt-chart-multiples-panel">
            <ChartPanelContext.Provider value={panel}>
              <ChartContainer config={config} data={p.rows} x={x} xScale={xScale} height={height} role="group"
                title={scales === 'shared' ? panel.name : <>{panel.name}<span className="alt-chart-multiples-own"> · own scale</span></>}
                yLabels={scales === 'shared' ? 'gutter' : 'inline'} yFormat={yFormat} xFormat={xFormat} locale={locale} tooltip={tooltip}>
                {chart}
              </ChartContainer>
            </ChartPanelContext.Provider>
          </div>
        );
      })}
    </div>
  );

  return (
    <figure className={cx('alt-chart-multiples', className)} aria-labelledby={takeId ?? titleId} aria-describedby={[takeId && titleId, descId, sumId].filter(Boolean).join(' ') || undefined} {...rest}>
      {(title || takeaway || description) && (
        <div className="alt-chart-head" data-takeaway={takeaway ? '' : undefined}>
          {title && <div id={titleId} className="alt-chart-title">{title}</div>}
          {takeaway && <div id={takeId} className="alt-chart-takeaway" role="heading" aria-level={3}>{takeaway}</div>}
          {description && <p id={descId} className="alt-chart-desc">{description}</p>}
        </div>
      )}
      {note && <p className="alt-chart-multiples-note" aria-hidden="true">{note}</p>}
      {/* One pointer across the panels: inside a page's ChartScope the grid is one more view of it; alone, its own. */}
      {outer ? grid : <ChartScope caption={false} palette={false}>{grid}</ChartScope>}
      <figcaption id={sumId} className={summary ? 'alt-chart-summary' : 'alt-sr'}>{summary ?? generated}</figcaption>
    </figure>
  );
}
