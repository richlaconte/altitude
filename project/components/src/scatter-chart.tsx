import * as React from 'react';
import { ChartMarker, ChartRelevance, textWidth, useChart, type ChartColumn, type ChartConfig, type ChartContextValue, type ChartDatum, type ChartEmpty, type ChartInfo, type ChartReadout, type ChartSlot } from './chart';

export interface ScatterChartProps {
  /** The records: one dot each. */
  data: ChartDatum[] | null | undefined | PromiseLike<ChartDatum[] | null>;
  /** The key of each record's first measure, along the bottom. Name and format it in the container's config. */
  x: string;
  /** The key of each record's second measure, up the side. Name and format it in the container's config. */
  y: string;
  /** The key that sorts records into groups, each a colour and a marker shape. At most three; more belong in small multiples. */
  group?: string;
  /** Each record's stable identity, a key or a function: dots glide to new places when it's given, and cross-fade otherwise. */
  id?: string | ((d: ChartDatum) => string);
  /** Each record's name, a key or a function, for the readout, its name on the keyboard path and the table. */
  name?: string | ((d: ChartDatum) => string);
  /** Labels a few dots on the plot (outliers): return the words, or null for none. */
  label?: (d: ChartDatum) => string | null | undefined;
  /** A least-squares trend line, 1px ink-muted, named "Trend" (or the words you pass). */
  trend?: boolean | string;
  /** The dots' size in px. Default 8, the least. */
  size?: number;
  /** The readout. Default true. */
  tooltip?: boolean;
  /** Filter in place: which records match. Misses recede to 35%, keeping their place and colour. */
  relevance?: (d: ChartDatum) => 'match' | 'miss' | undefined;
  /** With relevance: fit y to the matches. Default false: the axes hold. */
  rescale?: boolean;
  /** The selected record, or its id. The others recede; the frame says "Filtered to …". */
  selected?: ChartDatum | string | null;
  /** Makes dots selectable: called with the chosen record, or null when the selection clears. */
  onSelect?: (d: ChartDatum | null) => void;
  /** Makes dots open a level down, inside a Drilldown: return the id of the current node's child this record opens. */
  drill?: (d: ChartDatum) => string | null | undefined;
  /** What the plot says when there's no data. */
  empty?: ChartEmpty;
  /** A ChartTooltip or ChartLegend. */
  children?: React.ReactNode;
}

const num = (v: unknown): v is number => typeof v === 'number' && isFinite(v);
/** A marker's size for a dot at least `size` px across: a square and a triangle fill less of their box than a circle. */
const sized = (shape: string, size: number) => (shape === 'circle' ? size : Math.ceil(size / 0.9));
const GROUP = 'group:';
/** The colour slots groups take: the palette's first three, the slots validated for any two neighbours. */
const SLOTS: ChartSlot[] = ['data-1', 'data-2', 'data-3'];

/* ───────────────────────── the model ───────────────────────── */

interface Model {
  /** The records as the container gets them: each also carries its y under its group's series key. */
  rows: ChartDatum[];
  /** Each row's record as you gave it. */
  source: WeakMap<ChartDatum, ChartDatum>;
  index: WeakMap<ChartDatum, number>;
  groups: Array<{ key: string; label: string; color: ChartSlot }>;
  keyOf: (d: ChartDatum) => string;
}

const models = new WeakMap<ChartDatum[], Map<string, Model>>();
let warned = '';
function model(data: ChartDatum[], p: ScatterChartProps, config: ChartConfig): Model {
  const sig = `${p.x}|${p.y}|${p.group}`;
  let mm = models.get(data);
  if (!mm) models.set(data, (mm = new Map()));
  const hit = mm.get(sig);
  if (hit) return hit;
  const source = new WeakMap<ChartDatum, ChartDatum>(), index = new WeakMap<ChartDatum, number>();
  let groups: Model['groups'];
  let keyOf: (d: ChartDatum) => string;
  let rows: ChartDatum[];
  if (p.group) {
    const gk = p.group;
    const values = [...new Set(data.map((d) => String(d[gk])))];
    if (values.length > 3 && warned !== values.join('|')) {
      warned = values.join('|');
      console.warn(`ScatterChart: ${values.length} groups. Only three colours stay apart for colour-blind readers next to any other; show the rest as small multiples.`);
    }
    groups = values.map((v, i) => ({ key: GROUP + v, label: v, color: SLOTS[i] ?? 'data-other' }));
    keyOf = (d) => GROUP + String(d[gk]);
    rows = data.map((d) => ({ ...d, [keyOf(d)]: d[p.y] }));
  } else {
    groups = [{ key: p.y, label: config[p.y]?.label ?? p.y, color: 'data-1' }];
    keyOf = () => p.y;
    rows = data;
  }
  rows.forEach((r, i) => { source.set(r, data[i]); index.set(r, i); index.set(data[i], i); });
  const m: Model = { rows, source, index, groups, keyOf };
  mm.set(sig, m);
  return m;
}

const pick = (by: string | ((d: ChartDatum) => string) | undefined, d: ChartDatum) => (by === undefined ? undefined : typeof by === 'function' ? by(d) : d[by] == null ? undefined : String(d[by]));

function formats(p: ScatterChartProps, config: ChartConfig) {
  const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
  const fx = config[p.x]?.format ?? ((v: number) => nf.format(v));
  const fy = config[p.y]?.format ?? ((v: number) => nf.format(v));
  return { fx, fy, lx: config[p.x]?.label ?? p.x, ly: config[p.y]?.label ?? p.y };
}

/** Least squares over the dots: the line's slope and intercept, and Pearson's r. */
function fitLine(pts: Array<[number, number]>) {
  const n = pts.length;
  if (n < 3) return null;
  let sx = 0, sy = 0;
  for (const [a, b] of pts) { sx += a; sy += b; }
  const mx = sx / n, my = sy / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (const [a, b] of pts) { sxx += (a - mx) ** 2; syy += (b - my) ** 2; sxy += (a - mx) * (b - my); }
  if (!sxx || !syy) return null;
  const slope = sxy / sxx;
  return { slope, at: (v: number) => my + slope * (v - mx), r: sxy / Math.sqrt(sxx * syy) };
}

/* ───────────────────────── geometry, from the context ───────────────────────── */

/** Each shown dot: its index in ctx.data, its place in px, and its series. Hidden groups are left out. */
function dots(ctx: ChartContextValue, p: ScatterChartProps) {
  const shown = new Set(ctx.series.map((s) => s.key));
  const out: Array<{ i: number; px: number; py: number; key: string }> = [];
  ctx.data.forEach((d, i) => {
    const key = ctx.series.find((s) => num(d[s.key]))?.key;
    if (!key || !shown.has(key) || !num(d[p.x])) return;
    out.push({ i, px: ctx.xOf(d), py: ctx.y(d[key] as number), key });
  });
  return out;
}

/* ───────────────────────── the chart ───────────────────────── */

/**
 * Two measures per record, to see how they relate: payload against latency per endpoint, spend against usage per
 * customer. Dots are the record, so they lie on the plot: at least 8px, a data-* fill and a marker shape per group, a
 * 2px ring of the plot's own colour so overlapping dots stay apart. Never raised, never shaded. A few can be labelled
 * in ink with a 1px leader, and a least-squares trend drawn as a 1px ink-muted line.
 */
export function ScatterChart(props: ScatterChartProps) {
  const ctx = useChart();
  const { data, encode, alpha, active, relevance, hasRelevance, width, height, y, xOf } = ctx;
  const p = props;
  const size = Math.max(8, p.size ?? 8);
  const all = dots(ctx, p);
  const e0 = encode(ctx.series[0]?.key ?? '');
  const forced = e0.stroke === 'CanvasText', more = !forced && e0.edge === 'var(--ink)';
  // The ring that keeps overlapping dots apart: the plot's own colour, or 1px ink under contrast="more".
  const ring = forced ? { stroke: 'Canvas', strokeWidth: 4 } : more ? { stroke: 'var(--ink)', strokeWidth: 2 } : { stroke: 'var(--alt-chart-bg)', strokeWidth: 4 };
  const drawn = all.map(({ i, px, py, key }) => {
    const d = data[i], e = encode(key);
    const a = alpha(d, key);
    const dot = <ChartMarker key={i} className="alt-scatter-dot" data-series={key} shape={e.marker} x={px} y={py} size={sized(e.marker, size)} color={e.stroke} {...ring} paintOrder="stroke" opacity={a < 1 ? a : undefined} />;
    return hasRelevance ? <ChartRelevance key={i} miss={relevance(d) === 'miss'}>{dot}</ChartRelevance> : dot;
  });
  // The dot under the readout, drawn again on top so an overlapped dot can be seen whole.
  const at = active ? all.find((q) => data[q.i] === active) : undefined;
  const top = at ? <ChartMarker className="alt-scatter-active" shape={encode(at.key).marker} x={at.px} y={at.py} size={sized(encode(at.key).marker, size) + 2} color={encode(at.key).stroke} {...ring} paintOrder="stroke" /> : null;

  // The trend: least squares over the shown dots, across their x extent, named near its right end.
  let trend: React.ReactNode = null, trendWord: React.ReactNode = null;
  // Words already on the plot, as boxes, so labels are placed clear of them; and the dots, with their rings, which no
  // word may cover.
  const placed: Array<[number, number, number, number]> = [];
  const half = size / 2 + 3;
  const dotBoxes = all.map((q): [number, number, number, number] => [q.px - half, q.py - half, half * 2, half * 2]);
  if (p.trend && all.length > 2) {
    const fit = fitLine(all.map((q) => [data[q.i][p.x] as number, data[q.i][ctx.series.find((s) => s.key === q.key)!.key] as number]));
    if (fit) {
      const xs = all.map((q) => data[q.i][p.x] as number);
      const x0 = Math.min(...xs), x1 = Math.max(...xs);
      const P = (v: number): [number, number] => [xOf({ [p.x]: v }), y(fit.at(v))];
      const [a, b] = [P(x0), P(x1)];
      const word = typeof p.trend === 'string' ? p.trend : 'Trend';
      trend = <g className="alt-scatter-trend"><line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} /></g>;
      // Named beside the line, never over a dot: above or below its right end, then stepping back along it, then its
      // left end. Each try sits clear of the line over the word's own span, so a steep line doesn't cross it either.
      const w = textWidth(word), h = 14;
      const lineY = (px: number) => a[1] + ((b[1] - a[1]) * (px - a[0])) / ((b[0] - a[0]) || 1);
      const tries: Array<[number, 'start' | 'end']> = [1, 0.9, 0.8, 0.7, 0.6, 0.5].map((t) => [a[0] + (b[0] - a[0]) * t, 'end'] as [number, 'end']);
      tries.push([a[0], 'start']);
      const spot = (at: number, anchor: 'start' | 'end', above: boolean) => {
        const tx = anchor === 'end' ? Math.min(at, width - 2) : Math.max(at, 2), x0 = anchor === 'end' ? tx - w : tx;
        const l0 = lineY(x0), l1 = lineY(x0 + w);
        const ty = above ? Math.min(l0, l1) - 8 : Math.max(l0, l1) + 8 + 11;
        return { tx, ty, anchor, box: [x0, ty - 11, w, h] as [number, number, number, number] };
      };
      const fits = (box: [number, number, number, number]) => box[0] >= 0 && box[0] + box[2] <= width + 8 && box[1] >= -6 && box[1] + box[3] <= height + 6
        && dotBoxes.every(([x1, y1, w1, h1]) => box[0] > x1 + w1 || box[0] + box[2] < x1 || box[1] > y1 + h1 || box[1] + box[3] < y1);
      const chosen = tries.flatMap(([at, anchor]) => [spot(at, anchor, true), spot(at, anchor, false)]).find((c) => fits(c.box)) ?? spot(b[0], 'end', true);
      placed.push(chosen.box);
      trendWord = <g className="alt-scatter-trend"><text x={chosen.tx} y={chosen.ty} textAnchor={chosen.anchor}>{word}</text></g>;
    }
  }

  // Labelled dots: ink text on a halo, with a 1px leader, at the first corner that clears the others and the plot's edges.
  const labels = p.label ? all.flatMap(({ i, px, py }) => {
    const text = p.label!(sourceOf(props, ctx, data[i]));
    if (!text) return [];
    const w = textWidth(text), h = 14, r = size / 2 + 2;
    // Above right, above left, beside, then below: the first that clears the plot's edges, the words placed so far and
    // the dots.
    const spots: Array<[number, number, 'start' | 'end']> = [[px + 10, py - 10, 'start'], [px - 10, py - 10, 'end'], [px + r + 6, py + 4, 'start'], [px - r - 6, py + 4, 'end'], [px + 10, py + 22, 'start'], [px - 10, py + 22, 'end']];
    const boxOf = ([tx, ty, anchor]: [number, number, 'start' | 'end']): [number, number, number, number] => [anchor === 'start' ? tx : tx - w, ty - 11, w, h];
    const clear = (box: [number, number, number, number]) => box[0] >= 0 && box[0] + w <= width + 8 && box[1] >= -6 && box[1] + h <= height + 6
      && placed.every(([x1, y1, w1, h1]) => box[0] > x1 + w1 + 2 || box[0] + w < x1 - 2 || box[1] > y1 + h1 || box[1] + h < y1);
    const bare = (box: [number, number, number, number]) => dotBoxes.every(([x1, y1, w1, h1]) => box[0] > x1 + w1 || box[0] + w < x1 || box[1] > y1 + h1 || box[1] + h < y1);
    // Clear of the dots too; in a cloud too dense for that, the first spot that clears the words.
    const found = spots.find((sp) => clear(boxOf(sp)) && bare(boxOf(sp))) ?? spots.find((sp) => clear(boxOf(sp)));
    if (found) {
      const [tx, ty, anchor] = found, box = boxOf(found);
      placed.push(box);
      // The leader runs from the dot's edge to the word's near end.
      const ex = anchor === 'start' ? tx - 2 : tx + 2, ey = ty - 4, len = Math.hypot(ex - px, ey - py) || 1;
      return [(
        <g key={i} className="alt-scatter-label">
          {len > r + 3 && <line x1={px + ((ex - px) / len) * r} y1={py + ((ey - py) / len) * r} x2={ex} y2={ey} />}
          <text x={tx} y={ty} textAnchor={anchor}>{text}</text>
        </g>
      )];
    }
    return [];
  }) : [];

  // Both axes are measures, so each is named: y at the top of its axis, x at the end of its own.
  const f = formats(p, ctx.config);
  return (
    <g className="alt-scatter">
      {trend}
      {drawn}
      {top}
      {trendWord}
      {labels}
      <g className="alt-scatter-axis-name" aria-hidden="true">
        <text x={0} y={-12}>{f.ly}</text>
        <text x={width} y={height + 38} textAnchor="end">{f.lx}</text>
      </g>
    </g>
  );
}

function sourceOf(props: Record<string, unknown> | ScatterChartProps, ctx: ChartContextValue, d: ChartDatum) {
  const m = model(rawRows(props as ScatterChartProps, ctx), props as ScatterChartProps, ctx.config);
  return m.source.get(d) ?? d;
}
/** The data as given, for the model's cache: the container's records are the model's rows. */
function rawRows(p: ScatterChartProps, ctx: ChartContextValue) {
  return Array.isArray(p.data) ? p.data : ctx.data;
}

/** A record's name: `name`, then its outlier label, then "Point 3". */
function nameOf(p: ScatterChartProps, m: Model, d: ChartDatum) {
  const src = m.source.get(d) ?? d;
  return pick(p.name, src) ?? p.label?.(src) ?? `Point ${(m.index.get(d) ?? 0) + 1}`;
}
const groupOf = (p: ScatterChartProps, d: ChartDatum) => (p.group ? String(d[p.group]) : undefined);

/** Where a record's dot is, for the keyboard's focus ring, the readout and an afterglow. */
ScatterChart.chartPoint = (props: Record<string, unknown>, ctx: ChartContextValue, d: ChartDatum): [number, number] => {
  const p = props as unknown as ScatterChartProps;
  const key = ctx.series.find((s) => num(d[s.key]))?.key;
  return [ctx.xOf(d), key ? ctx.y(d[key] as number) : ctx.ground];
};
/** A ring 4px outside the dot, for the hover outline and an afterglow. */
ScatterChart.chartMark = (props: Record<string, unknown>, ctx: ChartContextValue, d: ChartDatum): string | null => {
  const [x, y] = ScatterChart.chartPoint(props, ctx, d);
  const r = Math.max(8, (props as unknown as ScatterChartProps).size ?? 8) / 2 + 4;
  return `M${x - r},${y}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`;
};
/** The nearest dot to the pointer, within 48px: the Voronoi cell it's in, so a dense cloud is still easy to read. */
ScatterChart.chartNearest = (props: Record<string, unknown>, ctx: ChartContextValue, px: number, py: number): number | null => {
  let best: number | null = null, bd = 48;
  for (const q of dots(ctx, props as unknown as ScatterChartProps)) { const dd = Math.hypot(q.px - px, q.py - py); if (dd < bd) { bd = dd; best = q.i; } }
  return best;
};
/**
 * ← and → step through the dots in x order; ↑ and ↓ go to the nearest dot above or below; Home and End to the first
 * and last along x; Page Up and Page Down a tenth of the way. Hidden groups are skipped.
 */
ScatterChart.chartMove = (props: Record<string, unknown>, ctx: ChartContextValue, i: number, e: React.KeyboardEvent): number | null => {
  const all = dots(ctx, props as unknown as ScatterChartProps);
  if (!all.length) return null;
  const order = [...all].sort((a, b) => a.px - b.px || b.py - a.py);
  const k = Math.max(0, order.findIndex((q) => q.i === i));
  const here = order[k];
  const page = Math.max(1, Math.round(order.length / 10));
  switch (e.key) {
    case 'ArrowRight': return order[Math.min(order.length - 1, k + 1)].i;
    case 'ArrowLeft': return order[Math.max(0, k - 1)].i;
    case 'Home': return order[0].i;
    case 'End': return order[order.length - 1].i;
    case 'PageDown': return order[Math.min(order.length - 1, k + page)].i;
    case 'PageUp': return order[Math.max(0, k - page)].i;
    case 'ArrowUp': case 'ArrowDown': {
      const up = e.key === 'ArrowUp';
      let best = here, bd = Infinity;
      for (const q of all) {
        if (up ? q.py >= here.py : q.py <= here.py) continue;
        const dd = Math.hypot(q.px - here.px, q.py - here.py);
        if (dd < bd) { bd = dd; best = q; }
      }
      return best.i;
    }
  }
  return null;
};
/** "Checkout API, Payments. Payload 410 KB, p95 220 ms." */
ScatterChart.chartName = (props: Record<string, unknown>, ctx: ChartContextValue, d: ChartDatum): string => {
  const p = props as unknown as ScatterChartProps;
  const m = model(rawRows(p, ctx), p, ctx.config), f = formats(p, ctx.config);
  const g = groupOf(p, d);
  return `${nameOf(p, m, d)}${g ? `, ${g}` : ''}. ${f.lx} ${num(d[p.x]) ? f.fx(d[p.x] as number) : 'no data'}, ${f.ly} ${num(d[p.y]) ? f.fy(d[p.y] as number) : 'no data'}.`;
};
/** The readout: the record's name, then both measures (and its group), keyed by its group's colour. */
ScatterChart.chartReadout = (props: Record<string, unknown>, ctx: ChartContextValue, d: ChartDatum): ChartReadout => {
  const p = props as unknown as ScatterChartProps;
  const m = model(rawRows(p, ctx), p, ctx.config), f = formats(p, ctx.config);
  const key = ctx.series.find((s) => num(d[s.key]))?.key ?? p.y;
  const color = ctx.encode(key).stroke;
  const items: ChartReadout['items'] = [
    { key: 'x', label: f.lx, value: Number(d[p.x]), text: num(d[p.x]) ? f.fx(d[p.x] as number) : '—', color },
    { key: 'y', label: f.ly, value: Number(d[p.y]), text: num(d[p.y]) ? f.fy(d[p.y] as number) : '—', color },
  ];
  const g = groupOf(p, d);
  if (g && p.group) items.push({ key: 'g', label: p.group.charAt(0).toUpperCase() + p.group.slice(1), value: 0, text: g, color });
  return { label: nameOf(p, m, d), items, indicator: 'dot' };
};

/** A nice x domain over the values, so the axis starts and ends on a tick. */
function niceDomain(vs: number[]): [number, number] | undefined {
  if (!vs.length) return undefined;
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if (lo === hi) { lo -= 1; hi += 1; }
  const raw = (hi - lo) / 5, mag = 10 ** Math.floor(Math.log10(raw)), f = raw / mag;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag;
  return [Number((Math.floor(lo / step) * step).toPrecision(12)), Number((Math.ceil(hi / step) * step).toPrecision(12))];
}

ScatterChart.chartInfo = (props: Record<string, unknown>, config: ChartConfig): ChartInfo => {
  const p = props as unknown as ScatterChartProps;
  const raw = Array.isArray(p.data) ? p.data : undefined;
  const m = raw ? model(raw, p, config) : undefined;
  const f = formats(p, config);
  const src = (d: ChartDatum) => m?.source.get(d) ?? d;
  // Without a stable id, a record is its place in the array, and every change cross-fades rather than gliding by it.
  const idOf = (d: ChartDatum) => pick(p.id, src(d)) ?? `#${m?.index.get(d) ?? -1}`;
  let summary: string | undefined, columns: ChartColumn[] | undefined;
  if (m && raw && raw.length) {
    const pts = raw.filter((d) => num(d[p.x]) && num(d[p.y])).map((d) => [d[p.x] as number, d[p.y] as number] as [number, number]);
    const fit = fitLine(pts);
    const groupWords = p.group ? ` in ${m.groups.length} groups: ${m.groups.length > 1 ? `${m.groups.slice(0, -1).map((g) => g.label).join(', ')} and ${m.groups[m.groups.length - 1].label}` : m.groups[0].label}` : '';
    let rel = '';
    if (fit) {
      const a = Math.abs(fit.r), rw = fit.r.toFixed(2).replace('-', '−');
      rel = a < 0.1 ? ` ${f.ly} doesn't move with ${f.lx} (r = ${rw}).` : ` ${f.ly} ${fit.r > 0 ? 'rises' : 'falls'} ${a < 0.3 ? 'weakly' : a < 0.6 ? 'moderately' : 'strongly'} with ${f.lx} (r = ${rw}).`;
    }
    const range = pts.length ? ` ${f.lx} ${f.fx(Math.min(...pts.map((q) => q[0])))} to ${f.fx(Math.max(...pts.map((q) => q[0])))}; ${f.ly} ${f.fy(Math.min(...pts.map((q) => q[1])))} to ${f.fy(Math.max(...pts.map((q) => q[1])))}.` : '';
    const named = p.label ? raw.map((d) => [p.label!(d), d] as const).filter((q): q is readonly [string, ChartDatum] => !!q[0]) : [];
    const labelWords = named.length ? ` Labelled: ${named.map(([t, d]) => `${t} (${f.fx(d[p.x] as number)}, ${f.fy(d[p.y] as number)})`).join('; ')}.` : '';
    summary = `Scatter chart of ${f.ly} against ${f.lx}, ${raw.length} ${raw.length === 1 ? 'point' : 'points'}${groupWords}.${rel}${range}${labelWords}`;
    const hasNames = p.name !== undefined || p.label !== undefined || p.id !== undefined;
    columns = [
      ...(hasNames ? [{ key: '__name', header: 'Name', cell: (d: ChartDatum) => nameOf(p, m, d), sortValue: (d: ChartDatum) => nameOf(p, m, d) }] : []),
      ...(p.group ? [{ key: '__group', header: p.group.charAt(0).toUpperCase() + p.group.slice(1), cell: (d: ChartDatum) => String(d[p.group!]), sortValue: (d: ChartDatum) => String(d[p.group!]) }] : []),
      { key: p.x, header: f.lx, align: 'end' as const, cell: (d: ChartDatum) => (num(d[p.x]) ? f.fx(d[p.x] as number) : '—'), sortValue: (d: ChartDatum) => (num(d[p.x]) ? (d[p.x] as number) : -Infinity) },
      { key: p.y, header: f.ly, align: 'end' as const, cell: (d: ChartDatum) => (num(d[p.y]) ? f.fy(d[p.y] as number) : '—'), sortValue: (d: ChartDatum) => (num(d[p.y]) ? (d[p.y] as number) : -Infinity) },
    ];
  }
  return {
    kind: 'Scatter chart', xScale: 'linear', zero: false, plot: 'xy', flat: true, top: 20, bottom: 18, swatch: 'marker', imprint: 'dots',
    data: m?.rows, id: idOf, label: (d) => (m ? nameOf(p, m, d) : idOf(d)), glide: [p.x], motion: p.id === undefined ? 'fade' : undefined,
    series: m?.groups ?? (p.group ? [] : [{ key: p.y, label: f.ly }]),
    format: config[p.y]?.format ?? f.fy, xFormat: (v) => f.fx(Number(v)),
    xDomain: raw ? niceDomain(raw.map((d) => d[p.x]).filter(num)) : undefined,
    summary, columns, rescale: p.rescale,
    relevance: p.relevance ? (d) => p.relevance!(src(d)) : undefined,
    selected: p.selected ?? undefined,
    onSelect: p.onSelect ? (d) => p.onSelect!(d ? src(d) : null) : undefined,
    drill: p.drill ? (d) => p.drill!(src(d)) : undefined,
  };
};
