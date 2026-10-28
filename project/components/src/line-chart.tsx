import * as React from 'react';
import { ChartMarker, ChartStatusClip, toTime, useChart, type ChartConfig, type ChartDatum, type ChartInfo, type ChartStatus } from './chart';

export interface LineChartProps {
  /** The records, in x order: one per time or value of x. */
  data: ChartDatum[] | null | undefined | PromiseLike<ChartDatum[] | null>;
  /** The key of each record's x: an ISO date, a timestamp or a number. */
  x: string;
  /** 'linear' joins points with straight lines; 'monotone' curves through them without overshooting. Default 'linear'. */
  curve?: 'linear' | 'monotone';
  /** Formats values (the axis, the readout, the names and the summary) of series that have no format of their own. */
  y?: { format?: (value: number) => string };
  /** Name each line at its end. Default: on for up to four series, and always under forced colours and in print. */
  endLabels?: boolean;
  /** The crosshair and readout. Default true. */
  tooltip?: boolean;
  /**
   * Which records aren't yet the record: 'partial' for a period still being counted, 'projected' for a forecast. The
   * line is dashed from the last settled point on, its points hollow, and each says "So far" or "Projected".
   */
  status?: (d: ChartDatum) => ChartStatus | undefined;
  /** The rule where the record ends: its word (default "Today"), or false for none. */
  boundary?: string | false;
  /**
   * An uncertainty band around a series, from each record's `low` to its `high`: a flat, low-opacity fill of the
   * series colour, never error bars and never a gradient. `label` names it in the readout (default "Range").
   */
  band?: { low: string; high: string; series?: string; label?: string };
  /**
   * Show only the latest stretch of x: `{ minutes: 15 }` (or `hours`, `days`) of time, or the last `points` records.
   * In a `live` container, when the window moves on, x glides one step and the marks ride along with it.
   */
  window?: ChartWindow;
  /** A ChartTooltip, to change what the readout shows. */
  children?: React.ReactNode;
  /** What the plot says when there's no data: an EmptyState at widget size. */
  empty?: import('./chart').ChartEmpty;
}
export interface ChartWindow { minutes?: number; hours?: number; days?: number; points?: number; }

// Windowed copies are kept per input array, so the same data gives the same array and isn't mistaken for a change.
const windowCache = new WeakMap<ChartDatum[], Map<string, { rows: ChartDatum[]; domain?: [number, number] }>>();
/** The records inside a sliding window, and the x domain the window spans. */
export function windowed(data: ChartDatum[], x: string, w: ChartWindow | undefined): { rows: ChartDatum[]; domain?: [number, number] } {
  if (!w) return { rows: data };
  const id = `${x}:${w.minutes ?? ''}:${w.hours ?? ''}:${w.days ?? ''}:${w.points ?? ''}`;
  let m = windowCache.get(data);
  if (!m) windowCache.set(data, (m = new Map()));
  let out = m.get(id);
  if (!out) {
    const at = (d: ChartDatum) => (typeof d[x] === 'number' ? (d[x] as number) : toTime(d[x]));
    if (w.points) {
      const rows = data.slice(-w.points);
      const ts = rows.map(at).filter((t) => isFinite(t));
      out = { rows, domain: ts.length ? [Math.min(...ts), Math.max(...ts)] : undefined };
    } else {
      const span = ((w.minutes ?? 0) * 60 + (w.hours ?? 0) * 3600 + (w.days ?? 0) * 86400) * 1000;
      const ts = data.map(at).filter((t) => isFinite(t));
      const end = ts.length ? Math.max(...ts) : 0;
      out = { rows: span ? data.filter((d) => at(d) >= end - span) : data, domain: span && ts.length ? [end - span, end] : undefined };
    }
    m.set(id, out);
  }
  return out;
}

const END_FONT = '500 12.5px "Instrument Sans", ui-sans-serif, system-ui, sans-serif';
let ctx2d: CanvasRenderingContext2D | null | undefined;
const width = (s: string) => {
  if (ctx2d === undefined) ctx2d = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
  if (ctx2d) { ctx2d.font = END_FONT; return ctx2d.measureText(s).width; }
  return s.length * 7.3;
};
const isNum = (v: unknown): v is number => typeof v === 'number' && isFinite(v);

/**
 * A path through points, broken wherever a value is missing: a null is a gap (nothing was recorded), never bridged.
 * 'monotone' is a cubic through the points whose tangents never overshoot them (Fritsch–Carlson), so a curve never
 * invents a peak or a dip the data doesn't have.
 */
export function linePath(points: Array<[number, number] | null>, curve: 'linear' | 'monotone' = 'linear') {
  const runs: Array<Array<[number, number]>> = [];
  let run: Array<[number, number]> = [];
  for (const p of points) { if (p) run.push(p); else if (run.length) { runs.push(run); run = []; } }
  if (run.length) runs.push(run);
  return runs.map((r) => {
    if (r.length === 1) return `M${r[0][0]},${r[0][1]}h0`;
    if (curve === 'linear' || r.length === 2) return 'M' + r.map((p) => `${p[0]},${p[1]}`).join('L');
    const n = r.length;
    const h = r.slice(1).map((p, i) => p[0] - r[i][0]);
    const s = r.slice(1).map((p, i) => (h[i] ? (p[1] - r[i][1]) / h[i] : 0));
    const m = new Array<number>(n);
    for (let i = 1; i < n - 1; i++) {
      if (s[i - 1] * s[i] <= 0) { m[i] = 0; continue; }
      const p = (s[i - 1] * h[i] + s[i] * h[i - 1]) / (h[i - 1] + h[i]);
      m[i] = (Math.sign(s[i - 1]) + Math.sign(s[i])) * Math.min(Math.abs(s[i - 1]), Math.abs(s[i]), 0.5 * Math.abs(p));
    }
    m[0] = (3 * s[0] - m[1]) / 2;
    m[n - 1] = (3 * s[n - 2] - m[n - 2]) / 2;
    // Endpoint tangents must keep the sign of their segment, or the curve overshoots at the ends.
    if (Math.sign(m[0]) !== Math.sign(s[0])) m[0] = 0;
    if (Math.sign(m[n - 1]) !== Math.sign(s[n - 2])) m[n - 1] = 0;
    let d = `M${r[0][0]},${r[0][1]}`;
    for (let i = 0; i < n - 1; i++) {
      const dx = h[i] / 3;
      d += `C${r[i][0] + dx},${r[i][1] + m[i] * dx} ${r[i + 1][0] - dx},${r[i + 1][1] - m[i + 1] * dx} ${r[i + 1][0]},${r[i + 1][1]}`;
    }
    return d;
  }).join('');
}

/**
 * Change over time for one to four series. Lines are the record: 2px strokes in their series' colours, round joins,
 * no fill, no glow. A missing value breaks the line. The last point carries a marker and each line is named at its
 * end, so the legend is the lines themselves.
 */
export function LineChart({ curve = 'linear', endLabels, band }: LineChartProps) {
  const { data, series, config, xOf, y, alpha, encode, strokeWidth, patterns, directLabels, height, active, emphasis, status, statusRanges } = useChart();
  const labelled = endLabels ?? (series.length <= 4 || directLabels);
  const lines: React.ReactNode[] = [];
  const clip = React.useId().replace(/[^\w-]/g, '');
  const split = statusRanges.pending.length > 0;
  // The uncertainty band: drawn first, under every line, as one flat fill per run of records that have both edges.
  const bandSeries = band ? series.find((s) => s.key === (band.series ?? Object.keys(config)[0])) : undefined;
  if (band && bandSeries) {
    const e = encode(bandSeries.key);
    const runs: number[][] = [];
    let run: number[] = [];
    data.forEach((d, i) => { if (isNum(d[band.low]) && isNum(d[band.high])) run.push(i); else if (run.length) { runs.push(run); run = []; } });
    if (run.length) runs.push(run);
    const d = runs.filter((r) => r.length > 1).map((r) => {
      const up = linePath(r.map((i) => [xOf(data[i]), y(data[i][band.high] as number)] as [number, number]), curve);
      const down = linePath(r.slice().reverse().map((i) => [xOf(data[i]), y(data[i][band.low] as number)] as [number, number]), curve);
      return up + 'L' + down.slice(1) + 'Z';
    }).join('');
    const a = alpha(null, bandSeries.key) * (emphasis && emphasis !== bandSeries.key ? 0.3 : 1);
    if (d) lines.push(<path key="band" className="alt-line-band" data-series={bandSeries.key} d={d} fill={patterns ? e.pending : e.stroke} fillOpacity={patterns ? undefined : 0.16} opacity={a < 1 ? a : undefined} />);
  }
  const ends: Array<{ key: string; label: string; x: number; y: number; a: number }> = [];
  for (const s of series) {
    const e = encode(s.key);
    // While the keyboard is on one series, the others recede.
    const a = alpha(null, s.key) * (emphasis && emphasis !== s.key ? 0.3 : 1);
    const pts = data.map((d) => (isNum(d[s.key]) ? ([xOf(d), y(d[s.key] as number)] as [number, number]) : null));
    const path = linePath(pts, curve);
    // A point that isn't yet the record is hollow: ringed in its colour on the plot's own, not filled.
    const hollow = (i: number) => !!status(data[i]);
    lines.push(
      <g key={s.key} className="alt-line" data-series={s.key} opacity={a < 1 ? a : undefined}>
        {split ? (
          // The record solid, and the rest dashed: one path, clipped two ways, so a curve never kinks at the boundary.
          <>
            <path className="alt-line-stroke" d={path} fill="none" stroke={e.stroke} strokeWidth={strokeWidth} strokeDasharray={e.dash} strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#${clip}-r)`} />
            <path className="alt-line-stroke" data-pending="" d={path} fill="none" stroke={e.stroke} strokeWidth={strokeWidth} strokeDasharray={e.pendingDash} strokeLinejoin="round" strokeLinecap="butt" clipPath={`url(#${clip}-p)`} />
          </>
        ) : <path className="alt-line-stroke" d={path} fill="none" stroke={e.stroke} strokeWidth={strokeWidth} strokeDasharray={e.dash} strokeLinejoin="round" strokeLinecap="round" />}
        {patterns && pts.map((p, i) => (p ? <ChartMarker key={i} className={hollow(i) ? 'alt-line-hollow' : undefined} stroke={hollow(i) ? e.stroke : undefined} shape={e.marker} x={p[0]} y={p[1]} size={7} color={e.stroke} /> : null))}
      </g>,
    );
    let last = pts.length - 1;
    while (last >= 0 && !pts[last]) last--;
    if (last >= 0) {
      const [lx, ly] = pts[last]!;
      if (!patterns) lines.push(<ChartMarker key={s.key + '-end'} className={hollow(last) ? 'alt-line-hollow' : undefined} stroke={hollow(last) ? e.stroke : undefined} shape="circle" x={lx} y={ly} size={8} color={e.stroke} opacity={a < 1 ? a : undefined} />);
      ends.push({ key: s.key, label: s.label, x: lx, y: ly, a });
    }
  }
  // End labels never overlap: nudged apart to 16px, kept inside the plot, in ink (text never wears a series colour).
  if (labelled) {
    const sorted = [...ends].sort((p, q) => p.y - q.y);
    for (let i = 1; i < sorted.length; i++) sorted[i].y = Math.max(sorted[i].y, sorted[i - 1].y + 16);
    const over = sorted.length ? sorted[sorted.length - 1].y - (height - 6) : 0;
    if (over > 0) for (const p of sorted) p.y -= over;
    for (let i = sorted.length - 2; i >= 0; i--) sorted[i].y = Math.min(sorted[i].y, sorted[i + 1].y - 16);
  }
  // The record under the readout: each line's point there, ringed in the plot's own colour (an outline, not height).
  const hovered = active ? series.filter((s) => isNum(active[s.key])).map((s) => {
    const e = encode(s.key);
    return <ChartMarker key={s.key + '-active'} className="alt-line-active" shape={patterns ? e.marker : 'circle'} x={xOf(active)} y={y(active[s.key] as number)} size={8} color={e.stroke}
      opacity={emphasis && emphasis !== s.key ? 0.3 : undefined} />;
  }) : null;
  return (
    <g className="alt-lines">
      {split && <defs><ChartStatusClip id={`${clip}-r`} ranges={statusRanges.record} height={height} /><ChartStatusClip id={`${clip}-p`} ranges={statusRanges.pending} height={height} /></defs>}
      {lines}
      {hovered}
      {labelled && ends.map((p) => <text key={p.key} className="alt-line-label" x={p.x + 10} y={p.y} dy="0.32em" opacity={p.a < 1 ? p.a : undefined}>{p.label}</text>)}
    </g>
  );
}

LineChart.chartInfo = (props: Record<string, unknown>, config: ChartConfig): ChartInfo => {
  const p = props as unknown as LineChartProps;
  const labels = Object.values(config).map((c) => c.label);
  const labelled = p.endLabels ?? labels.length <= 4;
  const win = Array.isArray(p.data) && p.window ? windowed(p.data, p.x, p.window) : undefined;
  return {
    kind: 'Line chart', zero: false, swatch: 'line', format: p.y?.format, status: p.status, boundary: p.boundary, data: win?.rows, xDomain: win?.domain,
    band: p.band ? { series: p.band.series, low: p.band.low, high: p.band.high, label: p.band.label ?? 'Range' } : undefined,
    right: labelled ? Math.ceil(Math.max(0, ...labels.map(width))) + 12 : 0,
  };
};
