import * as React from 'react';
import { textWidth, useChart, type ChartConfig, type ChartContextValue, type ChartDatum, type ChartInfo, type ChartReadout, type LinearScale } from './chart';

/**
 * Histogram (#535): how a set of values is spread. Counts are lengths on the ground line, so it keeps every chart rule:
 * bins are flat bars touching on a continuous axis (no band gap), each named by its range in words ("180–200 ms: 42
 * requests (12%)"). `mode="dots"` draws the same distribution as a quantile dot plot, countable dots of 5% each;
 * `cumulative` reads it as the share at or below each value. A median or percentile is a 1px ink-muted line, named.
 */
export interface HistogramProps {
  /** The records, one per value. undefined or a promise while they load; null or [] when there are none. */
  data: ChartDatum[] | null | undefined | PromiseLike<ChartDatum[] | null>;
  /** The key of the value in each record, and its entry in the container's config (its label and format). */
  value: string;
  /**
   * How to bin: a count of bins, a bin `width`, or explicit edges. Default: Freedman–Diaconis, the width snapped to a
   * 1–2–5 number. Values past explicit edges fall in an open-ended bin said as "≥ 1 s" (or "< 0").
   */
  bins?: number | { width: number } | number[];
  /** 'bars' (default), or 'dots': a quantile dot plot of `dots` dots, each an equal share of the values. */
  mode?: 'bars' | 'dots';
  /** How many dots in a quantile dot plot. Default 20 (5% each). */
  dots?: number;
  /** Lines to read the spread against: the median, and percentiles (`[95]` draws p95). */
  show?: { median?: boolean; percentiles?: number[] };
  /** Read the spread as the running share at or below each bin's end: a step line, its axis 0–100%. */
  cumulative?: boolean;
  /** What a value is called, plural: "requests". Default "values". */
  noun?: string;
  /** The selected bin, by its start, and what to do when one is chosen (null clears). The bin carries its records. */
  selected?: number | null;
  onSelect?: (bin: HistogramBin | null) => void;
  empty?: import('./chart').ChartEmpty;
  tooltip?: boolean;
}

/** One bin: its range, how many values fall in it, their share, and the records themselves. */
export interface HistogramBin { start: number; end: number; open?: 'above' | 'below'; count: number; share: number; records: ChartDatum[] }

const num = (v: unknown): v is number => typeof v === 'number' && isFinite(v);
const clean = (v: number) => Number(v.toPrecision(12));
function nice(raw: number) {
  if (!(raw > 0)) return 1;
  const mag = 10 ** Math.floor(Math.log10(raw)), f = raw / mag;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag;
}
/** The p-quantile (0–1) of sorted values, by linear interpolation. */
function quantile(s: number[], p: number) {
  if (!s.length) return NaN;
  const i = (s.length - 1) * Math.min(1, Math.max(0, p)), lo = Math.floor(i), hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}

interface Model { sorted: number[]; bins: HistogramBin[]; rows: ChartDatum[]; n: number; dots: number; lo: number; hi: number }
const cache = new WeakMap<object, Map<string, Model>>();

/** The edges for the values: a count, a width, explicit edges, or Freedman–Diaconis snapped to 1–2–5. */
function edgesFor(s: number[], bins: HistogramProps['bins']): { edges: number[]; explicit: boolean } {
  const min = s[0], max = s[s.length - 1];
  if (Array.isArray(bins) && bins.length >= 2) return { edges: [...bins].sort((a, b) => a - b), explicit: true };
  let h: number;
  if (typeof bins === 'number' && bins > 0) h = nice((max - min) / bins);
  else if (bins && typeof bins === 'object' && !Array.isArray(bins) && bins.width > 0) h = bins.width;
  else {
    const iqr = quantile(s, 0.75) - quantile(s, 0.25);
    h = nice(iqr > 0 ? (2 * iqr) / Math.cbrt(s.length) : (max - min) / 10 || 1);
  }
  if (max === min) h = h || 1;
  let start = clean(Math.floor(min / h) * h);
  // Between 5 and 60 bins: coarser when there'd be too many, finer when too few (unless a width was given).
  const count = () => Math.max(1, Math.ceil(clean((max - start) / h)) + (clean((max - start) / h) % 1 === 0 ? 1 : 0));
  if (typeof bins !== 'object') {
    while (count() > 60) { h = nice(h * 1.5); start = clean(Math.floor(min / h) * h); }
    while (count() < 5 && max > min && typeof bins !== 'number') { const next = nice(h / 2.5); if (next >= h) break; h = next; start = clean(Math.floor(min / h) * h); }
  }
  const n = count();
  return { edges: Array.from({ length: n + 1 }, (_, i) => clean(start + i * h)), explicit: false };
}

function model(raw: ChartDatum[], p: HistogramProps): Model {
  const key = `${p.value}|${JSON.stringify(p.bins ?? null)}|${p.mode ?? 'bars'}|${p.dots ?? 20}`;
  let m = cache.get(raw);
  if (!m) cache.set(raw, (m = new Map()));
  const hit = m.get(key);
  if (hit) return hit;
  const recs = raw.filter((d) => num(d[p.value]));
  const sorted = recs.map((d) => d[p.value] as number).sort((a, b) => a - b);
  const n = sorted.length, dots = Math.max(1, Math.floor(p.dots ?? 20));
  if (!n) { const out = { sorted, bins: [], rows: [], n, dots, lo: 0, hi: 1 }; m.set(key, out); return out; }
  const { edges, explicit } = edgesFor(sorted, p.bins);
  const bins: HistogramBin[] = [];
  if (explicit && sorted[0] < edges[0]) bins.push({ start: sorted[0], end: edges[0], open: 'below', count: 0, share: 0, records: [] });
  for (let i = 0; i < edges.length - 1; i++) bins.push({ start: edges[i], end: edges[i + 1], count: 0, share: 0, records: [] });
  if (explicit && sorted[n - 1] > edges[edges.length - 1]) bins.push({ start: edges[edges.length - 1], end: sorted[n - 1], open: 'above', count: 0, share: 0, records: [] });
  const binOf = (v: number) => {
    // Each bin holds [start, end); the last closed bin holds its end too, and the open ones everything past.
    for (let i = 0; i < bins.length; i++) {
      const b = bins[i], last = i === bins.length - 1 || bins[i + 1].open === 'above';
      if (b.open === 'below' ? v < b.end : b.open === 'above' ? v >= b.start : v >= b.start && (v < b.end || (last && v <= b.end))) return i;
    }
    return v < bins[0].start ? 0 : bins.length - 1;
  };
  for (const d of recs) { const b = bins[binOf(d[p.value] as number)]; b.count++; b.records.push(d); }
  for (const b of bins) b.share = b.count / n;
  // Quantile dots: dot i stands for the (i + ½)/dots quantile, and lies in that value's bin.
  const dotCount = bins.map(() => 0);
  for (let i = 0; i < dots; i++) dotCount[binOf(quantile(sorted, (i + 0.5) / dots))]++;
  let cum = 0;
  const rows = bins.map((b, i) => {
    cum += b.count;
    return { __lo: b.start, __hi: b.end, __mid: (b.start + b.end) / 2, __open: b.open ?? null, __count: b.count, __share: b.share, __dots: dotCount[i], __cum: cum / n, __bin: b };
  });
  const out = { sorted, bins, rows, n, dots, lo: bins[0].start, hi: bins[bins.length - 1].end };
  m.set(key, out);
  return out;
}

/** The value's own format and label, from the container's config. */
function formats(p: HistogramProps, config: ChartConfig) {
  const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
  const f = config[p.value]?.format ?? ((v: number) => nf.format(v));
  return { f, label: config[p.value]?.label ?? p.value, noun: p.noun ?? 'values' };
}
const pct = (v: number) => `${(v * 100 >= 10 || v === 0 ? Math.round(v * 100) : Math.round(v * 1000) / 10)}%`;
/** A bin's range in words, the unit said once: "180–200 ms", "≥ 1 s", "< 0 ms". */
function rangeWords(f: (v: number) => string, d: ChartDatum) {
  const lo = d.__lo as number, hi = d.__hi as number;
  if (d.__open === 'above') return `≥ ${f(lo)}`;
  if (d.__open === 'below') return `< ${f(hi)}`;
  const a = f(lo), b = f(hi);
  const unit = b.match(/[^\d.,\s−-][^\d]*$/)?.[0];
  return `${unit && a.endsWith(unit) ? a.slice(0, -unit.length).trimEnd() : a}–${b}`;
}
const seriesKey = (p: HistogramProps) => (p.cumulative ? '__cum' : p.mode === 'dots' ? '__dots' : '__count');

export function Histogram(props: HistogramProps) {
  const ctx = useChart();
  const { data, x, y, ground, encode, alpha, width, height, config } = ctx;
  if (x.kind !== 'linear' || !data.length) return null;
  const p = props;
  const sx = x as LinearScale;
  const key = seriesKey(p);
  const e = encode(key);
  const raw = Array.isArray(p.data) ? p.data : [];
  const m = model(raw, p);
  const { f } = formats(p, config);
  const at = (v: number) => Math.max(0, Math.min(width, sx(v)));

  let marks: React.ReactNode;
  if (p.cumulative) {
    // The running share as a step line: flat across each bin, rising at its end.
    let d = `M${at(data[0].__lo as number)},${y(0)}`, prev = 0;
    for (const r of data) { d += `L${at(r.__hi as number)},${y(prev)}L${at(r.__hi as number)},${y(r.__cum as number)}`; prev = r.__cum as number; }
    marks = <path className="alt-hist-cum" d={d} fill="none" stroke={e.stroke} strokeWidth={ctx.strokeWidth} strokeLinejoin="miter" />;
  } else if (p.mode === 'dots') {
    // Quantile dots: stacked in their bin's column, as large as the column and one count of the axis allow.
    marks = data.map((r) => {
      const a = at(r.__lo as number), b = at(r.__hi as number), unit = Math.abs(y(0) - y(1));
      const rad = Math.max(2, Math.min(b - a, unit) / 2 - 1);
      return (
        <g key={String(r.__lo)} opacity={alpha(r, key)}>
          {Array.from({ length: r.__dots as number }, (_, k) => (
            <circle key={k} className="alt-hist-dot" cx={(a + b) / 2} cy={y(k + 0.5)} r={rad} fill={e.fill} />
          ))}
        </g>
      );
    });
  } else {
    // Bars touching on a continuous axis, each a flat fill from the ground line to its count.
    marks = data.map((r) => {
      const a = at(r.__lo as number), b = at(r.__hi as number), top = y(r.__count as number);
      return <rect key={String(r.__lo)} className="alt-hist-bar" x={a} width={Math.max(0, b - a)} y={Math.min(top, ground)} height={Math.abs(ground - top)}
        fill={e.fill} stroke={e.edge} opacity={alpha(r, key)} />;
    });
  }

  // The median and percentiles: 1px ink-muted lines, named above the plot; a label that would meet another drops a row.
  const lines = markLines(p, m).map((l) => ({ ...l, x: at(l.v), w: textWidth(`${l.name} ${f(l.v)}`) + 8 }));
  const rows: Array<Array<[number, number]>> = [];
  const placed = lines.map((l) => {
    const cx = Math.min(Math.max(l.x, l.w / 2), width - l.w / 2);
    let row = 0;
    while ((rows[row] ?? []).some(([a, b]) => cx - l.w / 2 < b && cx + l.w / 2 > a)) row++;
    (rows[row] ??= []).push([cx - l.w / 2, cx + l.w / 2]);
    return { ...l, cx, row };
  });
  return (
    <g className="alt-hist">
      {marks}
      {placed.map((l) => (
        <g key={l.name} className="alt-hist-line">
          <line x1={Math.round(l.x) + 0.5} x2={Math.round(l.x) + 0.5} y1={-4 - l.row * 16} y2={height} />
          <text x={l.cx} y={-8 - l.row * 16} textAnchor="middle">{l.name} {f(l.v)}</text>
        </g>
      ))}
    </g>
  );
}

/** The lines asked for: the median and each percentile, at their values. */
function markLines(p: HistogramProps, m: Model) {
  if (!m.n) return [];
  const out: Array<{ name: string; v: number }> = [];
  if (p.show?.median) out.push({ name: 'Median', v: quantile(m.sorted, 0.5) });
  for (const q of p.show?.percentiles ?? []) out.push({ name: `p${q}`, v: quantile(m.sorted, q / 100) });
  return out;
}

/** "180–200 ms: 42 requests (12%)." */
Histogram.chartName = (props: Record<string, unknown>, ctx: ChartContextValue, d: ChartDatum): string => {
  const p = props as unknown as HistogramProps;
  const { f, noun } = formats(p, ctx.config);
  const m = model(Array.isArray(p.data) ? p.data : [], p);
  const r = rangeWords(f, d);
  if (p.cumulative) return `Up to ${f(d.__hi as number)}: ${pct(d.__cum as number)} of ${noun}.`;
  if (p.mode === 'dots') return `${r}: ${d.__dots} of ${m.dots} dots, ${pct((d.__dots as number) / m.dots)}.`;
  return `${r}: ${d.__count} ${d.__count === 1 ? noun.replace(/s$/, '') : noun} (${pct(d.__share as number)}).`;
};
Histogram.chartReadout = (props: Record<string, unknown>, ctx: ChartContextValue, d: ChartDatum): ChartReadout => {
  const p = props as unknown as HistogramProps;
  const { f, noun } = formats(p, ctx.config);
  const m = model(Array.isArray(p.data) ? p.data : [], p);
  const color = ctx.encode(seriesKey(p)).stroke;
  const cap = noun.charAt(0).toUpperCase() + noun.slice(1);
  const items: ChartReadout['items'] = p.cumulative
    ? [{ key: 'c', label: 'At or below', value: d.__cum as number, text: pct(d.__cum as number), color }]
    : p.mode === 'dots'
      ? [{ key: 'c', label: 'Dots', value: d.__dots as number, text: `${d.__dots} of ${m.dots} (${pct((d.__dots as number) / m.dots)})`, color }]
      : [{ key: 'c', label: cap, value: d.__count as number, text: `${d.__count} (${pct(d.__share as number)})`, color }];
  return { label: p.cumulative ? `Up to ${f(d.__hi as number)}` : rangeWords(f, d), items, indicator: 'dot' };
};
/** The keyboard's ring sits on the bar's top, the column's top dot, or the step's corner. */
Histogram.chartPoint = (props: Record<string, unknown>, ctx: ChartContextValue, d: ChartDatum): [number, number] => {
  const p = props as unknown as HistogramProps;
  const sx = ctx.x as LinearScale;
  if (p.cumulative) return [sx(d.__hi as number), ctx.y(d.__cum as number)];
  if (p.mode === 'dots') return [sx(d.__mid as number), ctx.y(Math.max(0.5, (d.__dots as number) - 0.5))];
  return [sx(d.__mid as number), ctx.y(d.__count as number)];
};

Histogram.chartInfo = (props: Record<string, unknown>, config: ChartConfig): ChartInfo => {
  const p = props as unknown as HistogramProps;
  const raw = Array.isArray(p.data) ? p.data : undefined;
  const m = raw ? model(raw, p) : undefined;
  const { f, label, noun } = formats(p, config);
  const key = seriesKey(p);
  const cap = noun.charAt(0).toUpperCase() + noun.slice(1);
  const countF = (v: number) => new Intl.NumberFormat().format(v);
  let summary: string | undefined;
  if (m && m.n) {
    const s = m.sorted, med = quantile(s, 0.5), p10 = quantile(s, 0.1), p90 = quantile(s, 0.9), max = s[s.length - 1];
    // Half the values: the narrowest run of bins holding at least 50%.
    let best: [number, number] | null = null;
    for (let i = 0; i < m.bins.length; i++) {
      let c = 0;
      for (let j = i; j < m.bins.length; j++) { c += m.bins[j].count; if (c / m.n >= 0.5) { if (!best || j - i < best[1] - best[0]) best = [i, j]; break; } }
    }
    const half = best ? ` Half of the ${noun} fall between ${f(m.bins[best[0]].start)} and ${f(m.bins[best[1]].end)}` : '';
    const tail = max - p90 > 2 * Math.max(p90 - med, 1e-9) ? `, with a long tail to ${f(max)}` : '';
    const how = p.cumulative ? ', as the share at or below each value' : p.mode === 'dots' ? `, as ${m.dots} dots of ${pct(1 / m.dots)} each` : '';
    summary = `Histogram of ${label}, ${countF(m.n)} ${noun}${how}. Median ${f(med)}; 10th to 90th percentile ${f(p10)} to ${f(p90)}.${half}${tail}${half ? '.' : ''}`;
  }
  const rangeOf = (d: ChartDatum) => rangeWords(f, d);
  return {
    kind: 'Histogram', xScale: 'linear', zero: true, flat: true, swatch: p.cumulative ? 'line' : 'rect', imprint: p.mode === 'dots' ? 'dots' : 'bars',
    data: m?.rows, x: '__mid', id: (d) => String(d.__lo), label: rangeOf,
    series: [{ key, label: p.cumulative ? `${cap} at or below` : p.mode === 'dots' ? 'Dots' : cap, format: p.cumulative ? pct : countF }],
    yFormat: p.cumulative ? pct : p.mode === 'dots' && m ? (v: number) => pct(v / m.dots) : countF,
    yExtent: p.cumulative ? [0, 1] : undefined,
    xFormat: (v) => f(Number(v)), xDomain: m && m.n ? [m.lo, m.hi] : undefined,
    top: Math.max(0, ...(() => {
      // Room above the plot for the lines' names, a row each when they'd meet.
      const n = (p.show?.median ? 1 : 0) + (p.show?.percentiles?.length ?? 0);
      return [n ? 18 + (n > 1 ? 16 : 0) : 0];
    })()),
    summary,
    columns: [
      { key: '__range', header: label, cell: rangeOf, sortValue: (d: ChartDatum) => d.__lo as number },
      { key: '__count', header: cap, align: 'end' as const, cell: (d: ChartDatum) => countF(d.__count as number), sortValue: (d: ChartDatum) => d.__count as number },
      { key: '__share', header: 'Share', align: 'end' as const, cell: (d: ChartDatum) => pct(d.__share as number), sortValue: (d: ChartDatum) => d.__share as number },
      { key: '__cum', header: 'At or below', align: 'end' as const, cell: (d: ChartDatum) => pct(d.__cum as number), sortValue: (d: ChartDatum) => d.__cum as number },
    ],
    selected: p.selected, onSelect: p.onSelect ? (d) => p.onSelect!(d ? (d.__bin as HistogramBin) : null) : undefined,
  };
};
