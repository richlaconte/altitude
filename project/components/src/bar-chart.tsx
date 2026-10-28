import * as React from 'react';
import { useChart, type ChartConfig, type ChartDatum, type ChartInfo } from './chart';

export interface BarChartProps {
  /** The records: one per category. */
  data: ChartDatum[];
  /** The key of each record's category. */
  x: string;
  /** Order the categories by their total: 'desc' puts the largest first. Default: the data's order. */
  sort?: 'asc' | 'desc';
  /** Stack the series into one bar per category (parts of a total); 'expand' stacks them as shares of 100%. Default: side by side. */
  stack?: boolean | 'expand';
  /** 'horizontal' runs categories down the side, for long category names or many of them. Default 'vertical'. */
  layout?: 'vertical' | 'horizontal';
  /** Label values at their bars, selectively: the largest, or the last category. Never every bar. Default 'none'. */
  labels?: 'max' | 'last' | 'none';
  /** The crosshair and readout. Default true. */
  tooltip?: boolean;
  /** A ChartTooltip, to change what the readout shows. */
  children?: React.ReactNode;
}

const keysOf = (config: ChartConfig) => Object.keys(config);
const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : 0);
const total = (d: ChartDatum, keys: string[]) => keys.reduce((t, k) => t + Math.max(0, num(d[k])), 0);

// Sorted copies are kept per input array, so the same data gives the same array and isn't mistaken for a change.
const sortedCache = new WeakMap<ChartDatum[], Map<string, ChartDatum[]>>();
function sorted(data: ChartDatum[], keys: string[], dir: 'asc' | 'desc') {
  const key = dir + ':' + keys.join(',');
  let m = sortedCache.get(data);
  if (!m) sortedCache.set(data, (m = new Map()));
  let out = m.get(key);
  if (!out) {
    const sum = (d: ChartDatum) => keys.reduce((t, k) => t + num(d[k]), 0);
    out = [...data].sort((a, b) => (dir === 'desc' ? sum(b) - sum(a) : sum(a) - sum(b)));
    m.set(key, out);
  }
  return out;
}

const pct = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 0 });

/**
 * A rectangle from the ground side (g) to the data side (e) across [a, b], with its data end rounded by r and the
 * ground end square, so it stands on the ground line. Works for either direction and either sign.
 */
function barPath(horizontal: boolean, a: number, b: number, g: number, e: number, r: number) {
  const len = Math.abs(e - g);
  r = Math.max(0, Math.min(r, (b - a) / 2, len));
  const s = Math.sign(e - g) || 1;
  if (r === 0) return horizontal ? `M${g},${a}H${e}V${b}H${g}Z` : `M${a},${g}V${e}H${b}V${g}Z`;
  if (!horizontal) {
    // Vertical: x from a to b, y from g (ground side) to e (data side).
    return `M${a},${g}V${e - s * r}Q${a},${e} ${a + r},${e}H${b - r}Q${b},${e} ${b},${e - s * r}V${g}Z`;
  }
  return `M${g},${a}H${e - s * r}Q${e},${a} ${e},${a + r}V${b - r}Q${e},${b} ${e - s * r},${b}H${g}Z`;
}

/**
 * Amounts compared across categories, as lengths standing on the ground line. Bars are the record: flat fills in
 * their series' colours, square at the ground and rounded only at the data end, never shadowed or lifted. One
 * series, several side by side, or stacked into a total.
 */
export function BarChart({ stack = false, labels = 'none' }: BarChartProps) {
  const { data, series, x, y, ground, horizontal, alpha, encode, gap, xKey, format } = useChart();
  if (x.kind !== 'band') return null;
  const keys = series.map((s) => s.key);
  const expand = stack === 'expand';
  // Data-end radius: radius-xs, but never more than a third of a thin bar.
  const R = 4;
  const marks: React.ReactNode[] = [];
  const ends: Array<{ cat: string; value: number; label: string; at: number; across: number }> = [];

  for (const d of data) {
    const cat = String(d[xKey]);
    const a0 = x(cat), bw = x.bandwidth;
    const rowA = alpha(d);
    if (stack) {
      const sum = expand ? total(d, keys) || 1 : 1;
      let up = 0, down = 0, firstUp = true, firstDown = true;
      const visible = series.filter((s) => num(d[s.key]) !== 0);
      const lastUp = [...visible].reverse().find((s) => num(d[s.key]) > 0)?.key;
      const lastDown = [...visible].reverse().find((s) => num(d[s.key]) < 0)?.key;
      for (const s of series) {
        const v = num(d[s.key]) / sum;
        if (!v) continue;
        const base = v > 0 ? up : down;
        const top = base + v;
        const first = v > 0 ? firstUp : firstDown;
        // Segments after the first start one gap further from the ground, so the parts read as parts.
        const dir = Math.sign(y(top) - y(base)) || 1;
        const g = y(base) + (first ? 0 : dir * gap);
        const e = y(top);
        if (Math.abs(e - g) < 0.5) { if (v > 0) up = top; else down = top; continue; }
        const enc = encode(s.key);
        const outer = v > 0 ? s.key === lastUp : s.key === lastDown;
        marks.push(<path key={cat + s.key} d={barPath(horizontal, a0, a0 + bw, g, e, outer ? R : 0)} fill={enc.fill} stroke={enc.edge} strokeWidth={enc.edge ? 1 : undefined}
          opacity={rowA * alpha(null, s.key)} data-series={s.key} data-category={cat} />);
        if (v > 0) { up = top; firstUp = false; } else { down = top; firstDown = false; }
      }
      ends.push({ cat, value: expand ? total(d, keys) : keys.reduce((t, k) => t + num(d[k]), 0), label: '', at: y(expand ? up : Math.max(up, 0)), across: a0 + bw / 2 });
    } else {
      const n = series.length;
      const w = Math.max(1, (bw - gap * (n - 1)) / n);
      series.forEach((s, i) => {
        const v = num(d[s.key]);
        const a = a0 + i * (w + gap);
        const enc = encode(s.key);
        if (v !== 0) {
          marks.push(<path key={cat + s.key} d={barPath(horizontal, a, a + w, ground, y(v), R)} fill={enc.fill} stroke={enc.edge} strokeWidth={enc.edge ? 1 : undefined}
            opacity={rowA * alpha(null, s.key)} data-series={s.key} data-category={cat} />);
        }
        ends.push({ cat, value: v, label: format(s.key, v), at: y(v), across: a + w / 2 });
      });
    }
  }

  // Selective value labels: the largest, or the last category's. Text is ink, never a series colour.
  let picked: typeof ends = [];
  if (labels === 'max' && ends.length) {
    const max = Math.max(...ends.map((e) => e.value));
    picked = [ends.find((e) => e.value === max)!];
  } else if (labels === 'last' && ends.length) {
    const lastCat = ends[ends.length - 1].cat;
    picked = ends.filter((e) => e.cat === lastCat);
  }
  const fmtTotal = (v: number) => format(keys[0], v);
  const texts = picked.map((e, i) => {
    const label = stack ? fmtTotal(e.value) : e.label;
    const neg = e.value < 0;
    return horizontal
      ? <text key={i} className="alt-bar-label" x={e.at + (neg ? -6 : 6)} y={e.across} dy="0.32em" textAnchor={neg ? 'end' : 'start'}>{label}</text>
      : <text key={i} className="alt-bar-label" x={e.across} y={e.at + (neg ? 14 : -6)} textAnchor="middle">{label}</text>;
  });
  return <g className="alt-bar">{marks}{texts}</g>;
}

BarChart.chartInfo = (props: Record<string, unknown>, config: ChartConfig): ChartInfo => {
  const p = props as unknown as BarChartProps;
  const keys = keysOf(config);
  const data = p.sort && p.data ? sorted(p.data, keys, p.sort) : p.data;
  let yExtent: [number, number] | undefined;
  if (p.stack === 'expand') yExtent = [0, 1];
  else if (p.stack && data) {
    let lo = 0, hi = 0;
    for (const d of data) {
      let up = 0, down = 0;
      for (const k of keys) { const v = num(d[k]); if (v > 0) up += v; else down += v; }
      hi = Math.max(hi, up); lo = Math.min(lo, down);
    }
    yExtent = [lo, hi];
  }
  return {
    kind: p.stack === 'expand' ? 'Stacked bar chart of shares' : p.stack ? 'Stacked bar chart' : 'Bar chart',
    xScale: 'band', zero: true, swatch: 'rect', layout: p.layout ?? 'vertical', data, yExtent,
    yFormat: p.stack === 'expand' ? (v: number) => pct.format(v) : undefined,
  };
};
