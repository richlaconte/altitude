import * as React from 'react';
import { ChartMarker, ChartRelevance, useChart, type ChartConfig, type ChartDatum, type ChartInfo } from './chart';

export interface DotPlotProps {
  /** The records: one per category. undefined or a promise while they load; null or [] when there are none. */
  data: ChartDatum[] | null | undefined | PromiseLike<ChartDatum[] | null>;
  /** What the plot says when there's no data. */
  empty?: import('./chart').ChartEmpty;
  /** The key of each record's category, down the side. */
  x: string;
  /** Order the categories by value ('desc': the largest first): the first series', or `to`'s. Default: the data's order. */
  sort?: 'asc' | 'desc';
  /**
   * A spread around each value, as the keys of its low and high ("p10", "p90"): a flat band of the series colour at 16%
   * behind the dot. It joins the axis, the readout, each point's name and the table. Never error bars.
   */
  range?: [string, string];
  /** What the spread is, in words. Default "Range". */
  rangeLabel?: string;
  /** The series the spread belongs to. Default the first. */
  rangeSeries?: string;
  /**
   * Before and after per category (a dumbbell): the keys of the earlier and later values. The earlier dot is hollow, the
   * later filled, joined by a 2px ink-muted link, and the change is said in words ("Up 14% from Q2").
   */
  from?: string;
  to?: string;
  /** Force zero onto the axis. Default false: a dot plot is for values where zero isn't part of the story. */
  zero?: boolean;
  /** Filter in place: which records match. Misses recede to 35%, keeping their place and colour. */
  relevance?: (d: ChartDatum) => 'match' | 'miss' | undefined;
  /** Fit the axis to the matches rather than holding it. */
  rescale?: boolean;
  /** Marks you can select: the selected record's category, and what to do when one is chosen (null clears). */
  selected?: unknown;
  onSelect?: (d: ChartDatum | null) => void;
  /** Marks you drill into: the id of the current Drilldown node's child that a record opens. */
  drill?: (d: ChartDatum) => string | null | undefined;
  /** The crosshair and readout. Default true. */
  tooltip?: boolean;
  /** Series keys that keep their colours while the rest take data-context (#188). */
  focus?: string[];
  children?: React.ReactNode;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && isFinite(v);
// Sorted copies are kept per input array, so the same data gives the same array and isn't mistaken for a change.
const sortedCache = new WeakMap<ChartDatum[], Map<string, ChartDatum[]>>();
function sorted(data: ChartDatum[], key: string, dir: 'asc' | 'desc') {
  let m = sortedCache.get(data);
  if (!m) sortedCache.set(data, (m = new Map()));
  let out = m.get(dir + key);
  if (!out) {
    const v = (d: ChartDatum) => (isNum(d[key]) ? d[key] as number : -Infinity);
    out = [...data].sort((a, b) => (dir === 'desc' ? v(b) - v(a) : v(a) - v(b)));
    m.set(dir + key, out);
  }
  return out;
}

/**
 * Values compared across categories where zero isn't part of the story (ten services' p95, all between 180 and 240ms),
 * or averages with their spread, or before and after per category. The values are the record, so the dots lie flat on
 * the ground, as a ScatterChart's do: at least 8px, a marker shape per series, ringed 2px in the plot's colour. With no
 * zero there's no ground line. A spread is a flat band behind its dot, never error bars; a dumbbell joins a hollow
 * "from" dot to a filled "to" dot with a 2px ink-muted link.
 */
export function DotPlot(props: DotPlotProps) {
  const { data, series, x, y, xKey, encode, alpha, relevance, hasRelevance, active, width, horizontal, emphasis } = useChart();
  if (x.kind !== 'band' || !horizontal) return null;
  const { range, from, to } = props;
  const rangeKey = range ? props.rangeSeries ?? series[0]?.key : undefined;
  const acts = !!(props.onSelect || props.drill);
  const size = 9;
  const ring = { stroke: 'var(--alt-chart-bg)', strokeWidth: 4, paintOrder: 'stroke' as const };
  const rows: React.ReactNode[] = [];
  for (const d of data) {
    const cat = String(d[xKey]);
    const cy = x(cat) + x.bandwidth / 2;
    const rowA = alpha(d);
    const miss = relevance(d) === 'miss';
    const parts: React.ReactNode[] = [];
    // The row guide: a 1px line across the plot, so the eye runs from the label to its dots.
    parts.push(<line key="guide" className="alt-dot-guide" x1={0} x2={width} y1={Math.round(cy) + 0.5} y2={Math.round(cy) + 0.5} />);
    // The spread: a flat band of the series colour at 16%, behind the dot, as LineChart's uncertainty band.
    if (range && rangeKey && isNum(d[range[0]]) && isNum(d[range[1]]) && series.some((s) => s.key === rangeKey)) {
      const a = y(Math.min(d[range[0]] as number, d[range[1]] as number)), b = y(Math.max(d[range[0]] as number, d[range[1]] as number));
      const e = encode(rangeKey, d);
      parts.push(<rect key="range" className="alt-dot-range" data-series={rangeKey} x={a} y={cy - 5} width={Math.max(0, b - a)} height={10} rx={5} fill={e.stroke} />);
    }
    if (from && to) {
      // A dumbbell: the link, then the hollow "from" dot, then the filled "to" dot over it.
      const f = d[from], t = d[to];
      if (isNum(f) && isNum(t)) parts.push(<line key="link" className="alt-dot-link" x1={y(f)} x2={y(t)} y1={cy} y2={cy} />);
      const e = encode(to, d);
      if (isNum(f)) parts.push(<circle key="from" className="alt-dot-mark" data-series={from} data-from="" cx={y(f)} cy={cy} r={size / 2 - 1} fill="var(--alt-chart-bg)" stroke={e.stroke} strokeWidth={2} />);
      if (isNum(t)) parts.push(<ChartMarker key="to" className="alt-dot-mark" data-series={to} shape="circle" x={y(t)} y={cy} size={size} color={e.stroke} {...ring} />);
    } else {
      for (const s of series) {
        const v = d[s.key];
        if (!isNum(v)) continue;
        const e = encode(s.key, d);
        const a = alpha(null, s.key) * (emphasis && emphasis !== s.key ? 0.3 : 1);
        parts.push(<ChartMarker key={s.key} className="alt-dot-mark" data-series={s.key} shape={series.length > 1 ? e.marker : 'circle'} x={y(v)} y={cy} size={size} color={e.stroke} {...ring} opacity={a < 1 ? a : undefined} />);
      }
    }
    // A mark that acts, under the pointer or the keyboard: a 2px ink outline round its dots, never a lift.
    if (acts && active === d) {
      const vs = (from && to ? [d[from], d[to]] : series.map((s) => d[s.key])).filter(isNum).map((v) => y(v));
      if (vs.length) parts.push(<rect key="hover" className="alt-dot-hover" x={Math.min(...vs) - size / 2 - 3} y={cy - size / 2 - 3} width={Math.max(...vs) - Math.min(...vs) + size + 6} height={size + 6} rx={(size + 6) / 2} />);
    }
    const g = <g key={cat} className="alt-dot-row" data-category={cat} opacity={rowA < 1 ? rowA : undefined}>{parts}</g>;
    rows.push(hasRelevance ? <ChartRelevance key={cat} miss={miss}>{g}</ChartRelevance> : g);
  }
  return <g className="alt-dot">{rows}</g>;
}

DotPlot.chartInfo = (props: Record<string, unknown>, config: ChartConfig): ChartInfo => {
  const p = props as unknown as DotPlotProps;
  const keys = Object.keys(config);
  const dumbbell = !!(p.from && p.to);
  const sortKey = dumbbell ? p.to! : keys[0];
  const data = Array.isArray(p.data) && p.sort && sortKey ? sorted(p.data, sortKey, p.sort) : Array.isArray(p.data) ? p.data : undefined;
  const fmt = (k: string) => config[k]?.format ?? ((v: number) => new Intl.NumberFormat().format(v));
  const label = (k: string) => config[k]?.label ?? k;
  // The summary names the range, the highest and lowest, and the widest spread.
  let summary: string | undefined;
  if (data && data.length && sortKey) {
    const vals = data.filter((d) => isNum(d[sortKey]));
    if (vals.length) {
      const hi = vals.reduce((a, b) => ((b[sortKey] as number) > (a[sortKey] as number) ? b : a)), lo = vals.reduce((a, b) => ((b[sortKey] as number) < (a[sortKey] as number) ? b : a));
      const f = fmt(sortKey);
      summary = `${dumbbell ? 'Dumbbell plot' : 'Dot plot'} of ${label(sortKey)} for ${data.length} ${data.length === 1 ? 'category' : 'categories'}, from ${f(lo[sortKey] as number)} (${lo[p.x]}) to ${f(hi[sortKey] as number)} (${hi[p.x]}).`;
      if (p.range) {
        const withRange = data.filter((d) => isNum(d[p.range![0]]) && isNum(d[p.range![1]]));
        if (withRange.length) {
          const w = (d: ChartDatum) => Math.abs((d[p.range![1]] as number) - (d[p.range![0]] as number));
          const wide = withRange.reduce((a, b) => (w(b) > w(a) ? b : a)), rk = p.rangeSeries ?? keys[0];
          summary += ` The widest ${(p.rangeLabel ?? 'range').toLowerCase()} is ${wide[p.x]}'s, ${fmt(rk)(Math.min(wide[p.range[0]] as number, wide[p.range[1]] as number))} to ${fmt(rk)(Math.max(wide[p.range[0]] as number, wide[p.range[1]] as number))}.`;
        }
      }
    }
  }
  return {
    kind: dumbbell ? 'Dumbbell plot' : 'Dot plot', xScale: 'band', layout: 'horizontal', zero: p.zero ?? false, swatch: 'marker', imprint: 'dots', data,
    // A dumbbell's two dots are one entity at two times, so they share the later one's colour.
    series: dumbbell ? [{ key: p.from!, label: label(p.from!), color: 'data-1', format: fmt(p.from!) }, { key: p.to!, label: label(p.to!), color: 'data-1', format: fmt(p.to!) }] : undefined,
    band: p.range ? { series: p.rangeSeries ?? keys[0], low: p.range[0], high: p.range[1], label: p.rangeLabel ?? 'Range' } : undefined,
    compare: dumbbell ? { key: p.from!, series: p.to!, label: label(p.from!) } : undefined,
    summary, relevance: p.relevance, rescale: p.rescale, selected: p.selected, onSelect: p.onSelect, drill: p.drill, focus: p.focus,
  };
};
