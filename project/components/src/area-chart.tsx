import * as React from 'react';
import { ChartMarker, ChartRelevance, ChartStatusClip, useChart, type ChartConfig, type ChartContextValue, type ChartDatum, type ChartInfo, type ChartStatus } from './chart';
import { linePath, windowed, type ChartWindow } from './line-chart';

export interface AreaChartProps {
  /** The records, in x order: one per time or value of x. */
  data: ChartDatum[] | null | undefined | PromiseLike<ChartDatum[] | null>;
  /** The key of each record's x: an ISO date, a timestamp or a number. */
  x: string;
  /**
   * Stack the series into bands that add up to the total, in config order from the bottom. 'expand' stacks them as
   * shares of 100%. Default: one area (or several overlapping, though a LineChart compares those better).
   */
  stack?: boolean | 'expand';
  /** 'linear' joins points with straight lines; 'monotone' curves through them without overshooting. Default 'linear'. */
  curve?: 'linear' | 'monotone';
  /** Formats values (the axis, the readout, the names and the summary) of series that have no format of their own. */
  y?: { format?: (value: number) => string };
  /** Name each band inside itself where it's tall and wide enough. Default: on when stacked. */
  labels?: boolean;
  /** The crosshair and readout. Default true. */
  tooltip?: boolean;
  /**
   * Which records aren't yet the record: 'partial' for a period still being counted, 'projected' for a forecast. From
   * the last settled point on, bands are hatched rather than filled and their top line is dashed.
   */
  status?: (d: ChartDatum) => ChartStatus | undefined;
  /** The rule where the record ends: its word (default "Today"), or false for none. */
  boundary?: string | false;
  /**
   * What the chart is about (#188): these series keep their colours and the rest are drawn in data-context, their
   * labels in ink-muted. The author's statement of importance, not a reader's filter (that's relevance).
   */
  focus?: string[];
  /**
   * Filter in place: which records match. The bands recede to 35% around its misses (each record owns its stretch of
   * x), keeping its place and colour; the frame says how many match. Nothing is removed.
   */
  relevance?: (d: ChartDatum) => 'match' | 'miss' | undefined;
  /** With relevance: fit the axis to the matches. Default false: the axis holds, so positions survive. */
  rescale?: boolean;
  /** The selected record's x value, for marks you can select. The others recede; the frame says "Filtered to …". */
  selected?: unknown;
  /** Makes marks selectable: called with the chosen record, or null when the selection clears (Escape, Clear, or choosing it again). */
  onSelect?: (d: ChartDatum | null) => void;
  /** Makes marks open a level down, inside a Drilldown: return the id of the current node's child this record opens. */
  drill?: (d: ChartDatum) => string | null | undefined;
  /** Show only the latest stretch of x, as LineChart's `window`: it glides one step in a `live` container. */
  window?: ChartWindow;
  /** Called with the new { start, end } when a ChartBrush moves the window. Without `window`, the brush keeps its own. */
  onWindowChange?: (window: { start: string | number; end: string | number }) => void;
  /** A ChartTooltip or ChartLegend. */
  children?: React.ReactNode;
  /** What the plot says when there's no data: an EmptyState at widget size. */
  empty?: import('./chart').ChartEmpty;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && isFinite(v);
const num = (v: unknown) => (isNum(v) ? v : 0);
const pct = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 0 });
const LABEL_FONT = '500 12.5px "Instrument Sans", ui-sans-serif, system-ui, sans-serif';
let ctx2d: CanvasRenderingContext2D | null | undefined;
const width = (s: string) => {
  if (ctx2d === undefined) ctx2d = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
  if (ctx2d) { ctx2d.font = LABEL_FONT; return ctx2d.measureText(s).width; }
  return s.length * 7.3;
};

/** Each series' lower and upper edge at each record: stacked from zero in config order, or each from zero alone. */
function bands(data: ChartDatum[], keys: string[], stack: AreaChartProps['stack']) {
  const out = new Map<string, Array<[number, number] | null>>(keys.map((k) => [k, []]));
  for (const d of data) {
    if (!stack) { for (const k of keys) out.get(k)!.push(isNum(d[k]) ? [0, d[k] as number] : null); continue; }
    // In a stack a missing value adds nothing: the bands above rest on the one below.
    const sum = stack === 'expand' ? keys.reduce((t, k) => t + Math.max(0, num(d[k])), 0) || 1 : 1;
    let at = 0;
    for (const k of keys) { const v = Math.max(0, num(d[k])) / sum; out.get(k)!.push([at, at + v]); at += v; }
  }
  return out;
}

/**
 * A total over time and what it's made of. Bands are the record: flat data-* fills stacked on the ground line in config
 * order (the order never changes, so a band never jumps), each parted from the one above by a 2px line in the plot's
 * own colour, with a 2px top line on the topmost. A single area is a flat data-1 fill at reduced opacity under a 2px
 * line. No gradient fill: the only face gradient in Altitude is the sheen, and it means "press it".
 */
export function AreaChart({ stack = false, curve = 'linear', labels }: AreaChartProps) {
  const { data, series, xOf, y, alpha, encode, strokeWidth, emphasis, active, patterns, directLabels, width: W, height: H, statusRanges, hasRelevance, relevanceRegions } = useChart();
  const clip = React.useId().replace(/[^\w-]/g, '');
  const split = statusRanges.pending.length > 0;
  const keys = series.map((s) => s.key);
  const edges = bands(data, keys, stack);
  const single = !stack;
  const named = labels ?? (!!stack || directLabels);
  const fills: React.ReactNode[] = [];
  const tops: React.ReactNode[] = [];
  const texts: React.ReactNode[] = [];
  series.forEach((s, si) => {
    const e = encode(s.key);
    const a = alpha(null, s.key) * (emphasis && emphasis !== s.key ? 0.3 : 1);
    const ed = edges.get(s.key)!;
    // An area is drawn run by run: a null in a single area is a gap, as in a line.
    const runs: number[][] = [];
    let run: number[] = [];
    ed.forEach((p, i) => { if (p) run.push(i); else if (run.length) { runs.push(run); run = []; } });
    if (run.length) runs.push(run);
    const upper = ed.map((p, i) => (p ? ([xOf(data[i]), y(p[1])] as [number, number]) : null));
    const d = runs.map((r) => {
      const up = linePath(r.map((i) => upper[i]!), curve);
      const down = linePath(r.slice().reverse().map((i) => [xOf(data[i]), y(ed[i]![0])] as [number, number]), curve);
      return up + 'L' + down.slice(1) + 'Z';
    }).join('');
    fills.push(
      <path key={s.key} className="alt-area-fill" data-series={s.key} d={d} fill={e.fill}
        fillOpacity={single && !patterns ? 0.28 : undefined} opacity={a < 1 ? a : undefined} clipPath={split ? `url(#${clip}-r)` : undefined} />,
    );
    // Not yet the record: the same band hatched on the plot's own colour, with no solid fill.
    if (split) fills.push(<path key={s.key + '-pending'} className="alt-area-fill" data-series={s.key} data-pending="" d={d} fill={e.pending} fillOpacity={e.pendingOpacity < 1 ? e.pendingOpacity : undefined} opacity={a < 1 ? a : undefined} clipPath={`url(#${clip}-p)`} />);
    // The top edge: a 2px line in the series colour on a single area or the topmost band; between bands, a 2px line in
    // the plot's own colour, so the parts read as parts without a shadow.
    const top = si === series.length - 1 || single;
    const edge = (pending: boolean) => (
      <path key={s.key + (pending ? '-top-pending' : '-top')} className={top ? 'alt-area-line' : 'alt-area-sep'} data-series={s.key} data-pending={pending ? '' : undefined} d={linePath(upper, curve)} fill="none"
        stroke={top ? e.stroke : undefined} strokeWidth={top ? strokeWidth : undefined} strokeDasharray={top ? (pending ? e.pendingDash : e.dash) : undefined} strokeLinejoin="round" strokeLinecap={pending ? 'butt' : 'round'}
        opacity={a < 1 ? a : undefined} clipPath={split ? `url(#${clip}-${pending ? 'p' : 'r'})` : undefined} />
    );
    tops.push(edge(false));
    if (split) tops.push(edge(true));
    // A label inside the band, at its thickest point, where the band is tall and wide enough to hold it.
    if (named && !single && data.length > 1) {
      let best = -1, thick = 0;
      ed.forEach((p, i) => { if (!p) return; const t = y(p[0]) - y(p[1]); if (t > thick) { thick = t; best = i; } });
      const w = width(s.label);
      if (best >= 0 && thick >= 20) {
        const cx = Math.max(w / 2 + 6, Math.min(W - w / 2 - 6, xOf(data[best])));
        const p = ed[best]!;
        texts.push(<text key={s.key + '-label'} className="alt-area-label" data-context={encode(s.key).context ? '' : undefined} x={cx} y={(y(p[0]) + y(p[1])) / 2} dy="0.32em" textAnchor="middle" opacity={a < 1 ? a : undefined}>{s.label}</text>);
      }
    }
  });
  // The record under the readout: each band's top edge there, ringed in the plot's own colour.
  const hovered = active ? series.map((s) => {
    const i = data.indexOf(active);
    const p = i >= 0 ? edges.get(s.key)![i] : null;
    if (!p || (!stack && !isNum(active[s.key]))) return null;
    const e = encode(s.key);
    return <ChartMarker key={s.key + '-active'} className="alt-line-active" shape={patterns ? e.marker : 'circle'} x={xOf(active)} y={y(p[1])} size={8} color={e.stroke}
      opacity={emphasis && emphasis !== s.key ? 0.3 : undefined} />;
  }) : null;
  return (
    <g className="alt-area" data-stack={stack ? String(stack) : undefined}>
      {split && <defs><ChartStatusClip id={`${clip}-r`} ranges={statusRanges.record} height={H} /><ChartStatusClip id={`${clip}-p`} ranges={statusRanges.pending} height={H} /></defs>}
      {hasRelevance && <defs>{relevanceRegions.map((r, i) => <ChartStatusClip key={r.key} id={`${clip}-rel-${i}`} ranges={[[r.x0, r.x1]]} height={H} />)}</defs>}
      {/* Filtered in place: the bands once per record's stretch of x, each clipped to it and receding when it misses. */}
      {hasRelevance && relevanceRegions.length
        ? relevanceRegions.map((r, i) => <ChartRelevance key={r.key} miss={r.miss} clipPath={`url(#${clip}-rel-${i})`}>{fills}{tops}</ChartRelevance>)
        : <>{fills}{tops}</>}
      {texts}{hovered}
    </g>
  );
}

/** Where a record's band ends for one series, for the keyboard's focus ring: the band's top edge at that x. */
AreaChart.chartPoint = (props: Record<string, unknown>, ctx: ChartContextValue, d: ChartDatum, key: string): [number, number] => {
  const p = props as unknown as AreaChartProps;
  const keys = ctx.series.map((s) => s.key);
  const e = bands([d], keys, p.stack).get(key)?.[0];
  return [ctx.xOf(d), e ? ctx.y(e[1]) : ctx.ground];
};

AreaChart.chartInfo = (props: Record<string, unknown>, config: ChartConfig): ChartInfo => {
  const p = props as unknown as AreaChartProps;
  const keys = Object.keys(config);
  const win = Array.isArray(p.data) && p.window ? windowed(p.data, p.x, p.window) : undefined;
  const rows = win ? win.rows : Array.isArray(p.data) ? p.data : undefined;
  let yExtent: [number, number] | undefined;
  const fit = rows && p.rescale && p.relevance && rows.some((d) => p.relevance!(d) === 'match') ? rows.filter((d) => p.relevance!(d) !== 'miss') : rows;
  if (p.stack === 'expand') yExtent = [0, 1];
  else if (p.stack && fit) yExtent = [0, Math.max(0, ...fit.map((d) => keys.reduce((t, k) => t + Math.max(0, num(d[k])), 0)))];
  return {
    kind: p.stack === 'expand' ? 'Stacked area chart of shares' : p.stack ? 'Stacked area chart' : 'Area chart',
    zero: true, swatch: 'rect', imprint: 'area', yExtent, format: p.y?.format, seriesUp: !!p.stack, share: !!p.stack, status: p.status, boundary: p.boundary,
    data: win?.rows, xDomain: win?.domain, focus: p.focus, relevance: p.relevance, rescale: p.rescale, selected: p.selected, onSelect: p.onSelect, drill: p.drill,
    yFormat: p.stack === 'expand' ? (v: number) => pct.format(v) : undefined,
  };
};
