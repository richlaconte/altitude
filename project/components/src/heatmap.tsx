import * as React from 'react';
import { ChartRelevance, fit, textWidth, toTime, useChart, type ChartColumn, type ChartConfig, type ChartContextValue, type ChartDatum, type ChartEmpty, type ChartInfo, type ChartReadout } from './chart';

export interface HeatmapProps {
  /** The records: one per cell. Cells with no record, or a null value, are drawn as "No data". */
  data: ChartDatum[] | null | undefined | PromiseLike<ChartDatum[] | null>;
  /** 'grid' (default): x across, y down. 'calendar': a cell per day, a column per week, wrapping by week when it's narrow. */
  variant?: 'grid' | 'calendar';
  /** The grid's column key (hour, region). */
  x?: string;
  /** The grid's row key (weekday, service). */
  y?: string;
  /** The calendar's day key: an ISO date, a timestamp or a Date. */
  date?: string;
  /** The key of each cell's value. It must also be a key of the container's config, which names and formats it. */
  value: string;
  /**
   * Where each step starts, lowest first: `[0, 1, 4, 10]` gives "0", "1–3", "4–9" and "10+". Two to seven steps.
   * Default: five to seven even steps over the values, with zero a step of its own for counts.
   */
  bins?: number[];
  /** 'sequential' (default): how much, on the data-seq ramp. 'diverging': which side of `midpoint`, on the data-div ramp. */
  scale?: 'sequential' | 'diverging';
  /** The diverging scale's neutral value. Default 0. */
  midpoint?: number;
  /** Formats the grid's column values (14 → "14:00"). */
  xFormat?: (value: unknown) => string;
  /** Formats the grid's row values. */
  yFormat?: (value: unknown) => string;
  /** The calendar's first day of the week: 0 Sunday (default) or 1 Monday. */
  weekStart?: 0 | 1;
  /** The steps as swatches with their ranges in words, under the cells. Default true. */
  legend?: boolean;
  /** The readout. Default true. */
  tooltip?: boolean;
  /** Filter in place: which cells match. Misses recede to 35%, keeping their place and colour. */
  relevance?: (d: ChartDatum) => 'match' | 'miss' | undefined;
  /** The selected cell: its record, or its id ("14|Tue" for a grid's x and y, "2026-03-14" for a calendar's day). */
  selected?: ChartDatum | string | null;
  /** Makes cells selectable: called with the chosen record, or null when the selection clears. */
  onSelect?: (d: ChartDatum | null) => void;
  /** Makes cells open a level down, inside a Drilldown: return the id of the current node's child this cell opens. */
  drill?: (d: ChartDatum) => string | null | undefined;
  /** What the plot says when there's no data. */
  empty?: ChartEmpty;
  /** A ChartTooltip, to change what the readout shows. */
  children?: React.ReactNode;
}

const DAY = 864e5;
const GAP = 2, MIN = 10;
const num = (v: unknown): v is number => typeof v === 'number' && isFinite(v);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

/* ───────────────────────── steps ───────────────────────── */

interface Bins {
  /** Where each step starts. */
  edges: number[];
  /** Each step's range in words: "0", "1–3", "10+". */
  labels: string[];
  /** Each step's fill token. */
  colors: string[];
  /** Each step's pattern under forced colours and print: 0 none, 1 sparse dots, 2 dense dots, 3 hatching, 4 crosshatch. */
  density: number[];
  /** For a diverging scale, each step's side of the midpoint: -1, 0 or 1. */
  side: number[];
  of: (v: number) => number;
}

/** A 1–2–5 step: at least span ÷ count, or (near) the closest to it. */
function niceStep(span: number, count: number, near = false) {
  const raw = span / Math.max(1, count) || 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const f = raw / mag;
  if (near) return [1, 2, 5, 10].reduce((a, b) => (Math.abs(Math.log(b / f)) < Math.abs(Math.log(a / f)) ? b : a)) * mag;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag;
}

/** A range in words, its unit said once: "1–3", "−0.5 to +0.5 pts". */
function rangeWords(fmt: (v: number) => string, a: number, b: number) {
  const A = fmt(a), B = fmt(b);
  let k = 0;
  while (k < Math.min(A.length, B.length) && A[A.length - 1 - k] === B[B.length - 1 - k] && !/\d/.test(A[A.length - 1 - k])) k++;
  // A dash between signed numbers reads as a minus: say "to".
  return `${A.slice(0, A.length - k)}${/^[-+−]/.test(A) || /^[-+−]/.test(B) ? ' to ' : '–'}${B}`;
}
const clean = (x: number) => Number(x.toPrecision(12));

function makeBins(values: number[], given: number[] | undefined, diverging: boolean, mid: number, fmt: (v: number) => string): Bins {
  const lo = values.length ? Math.min(...values) : 0, hi = values.length ? Math.max(...values) : 1;
  const ints = values.every((v) => Number.isInteger(v));
  let edges: number[];
  if (given?.length) edges = [...given].sort((a, b) => a - b).slice(0, 7);
  else if (diverging) {
    // Seven steps around the midpoint, on round numbers: the middle one holds values within a step of it, and the
    // outermost begin three steps out, so the furthest values land in them.
    const h = niceStep(Math.max(Math.abs(lo - mid), Math.abs(hi - mid)) || 1, 3.5, true);
    edges = [-Infinity, -3, -2, -1, 1, 2, 3].map((k) => (k === -Infinity ? k : clean(mid + k * h)));
  } else if (ints && lo >= 0) {
    // Counts: zero is a step of its own when there are zeros, then even steps.
    const step = Math.max(1, niceStep(hi, 5));
    edges = values.includes(0) ? [0, 1] : [0];
    for (let t = step; t <= hi && edges.length < 7; t += step) if (t > edges[edges.length - 1]) edges.push(t);
  } else {
    const step = niceStep(hi - lo, 5);
    edges = [];
    for (let t = Math.floor(lo / step) * step; t < hi && edges.length < 7; t += step) edges.push(clean(t));
    if (!edges.length) edges = [lo];
  }
  const n = edges.length;
  const intEdges = ints && edges.every((e, i) => i === 0 && !isFinite(e) ? true : Number.isInteger(e));
  const below = values.some((v) => v < edges[0]);
  const labels = edges.map((a, i) => {
    const b = edges[i + 1];
    if (b === undefined) { const A = fmt(a); return /\d$/.test(A) ? `${A}+` : `≥ ${A}`; }
    if (i === 0 && (below || !isFinite(a))) return intEdges ? `≤ ${fmt(b - 1)}` : `< ${fmt(b)}`;
    if (intEdges) return b - 1 === a ? fmt(a) : rangeWords(fmt, a, b - 1);
    return rangeWords(fmt, a, b);
  });
  let colors: string[], density: number[], side: number[];
  if (diverging) {
    // The step holding the midpoint is neutral; the rest count outward from it, three to a side.
    const midStep = edges.findIndex((e, i) => e < mid && (edges[i + 1] === undefined || edges[i + 1] > mid));
    const at = midStep >= 0 ? midStep : edges.findIndex((e) => e >= mid) - 0.5;
    side = edges.map((_, i) => (i === at ? 0 : i < at ? -1 : 1));
    const k = edges.map((_, i) => Math.min(3, Math.ceil(Math.abs(i - at))));
    colors = k.map((d, i) => (d === 0 ? 'var(--data-div-mid)' : `var(--data-div-${side[i] < 0 ? 'neg' : 'pos'}-${d})`));
    density = k.map((d) => [0, 1, 3, 4][d]);
  } else {
    side = edges.map(() => 0);
    const step = (i: number) => (n === 1 ? 4 : Math.round(1 + (i * 6) / (n - 1)));
    colors = edges.map((_, i) => `var(--data-seq-${step(i)})`);
    density = edges.map((_, i) => (n === 1 ? 2 : Math.round((i * 4) / (n - 1))));
  }
  const of = (v: number) => { let i = 0; while (i + 1 < n && v >= edges[i + 1]) i++; return i; };
  return { edges, labels, colors, density, side, of };
}

/* ───────────────────────── the model: cells, independent of size ───────────────────────── */

interface Model {
  calendar: boolean;
  rows: ChartDatum[];
  /** Each record's logical column and row: a calendar's week and weekday, a grid's x and y. */
  pos: Array<{ c: number; r: number }>;
  at: Map<string, number>;
  cols: number;
  nrows: number;
  colNames: string[];
  rowNames: string[];
  /** Calendar: each record's day, as UTC midnight. */
  days: number[];
  values: Array<number | null>;
  bins: Bins;
  fmt: (v: number) => string;
  label: string;
  diverging: boolean;
  mid: number;
  /** Calendar: the first day of the week. */
  ws: number;
}

const filled = new WeakMap<ChartDatum[], Map<string, ChartDatum[]>>();
/** Every cell of the grid or every day of the calendar, in order, with a null value where no record is: the same array for the same input. */
function fill(data: ChartDatum[], p: HeatmapProps): ChartDatum[] {
  const sig = `${p.variant}|${p.x}|${p.y}|${p.date}|${p.value}`;
  let m = filled.get(data);
  if (!m) filled.set(data, (m = new Map()));
  let out = m.get(sig);
  if (out) return out;
  if (p.variant === 'calendar') {
    const key = p.date ?? 'date';
    const byDay = new Map<number, ChartDatum>();
    for (const d of data) { const t = toTime(d[key]); if (isFinite(t)) byDay.set(Math.floor(t / DAY) * DAY, d); }
    const ts = [...byDay.keys()];
    out = [];
    if (ts.length) for (let t = Math.min(...ts), end = Math.max(...ts); t <= end; t += DAY) out.push(byDay.get(t) ?? { [key]: iso(t), [p.value]: null });
  } else {
    const xk = p.x ?? 'x', yk = p.y ?? 'y';
    const xs = [...new Set(data.map((d) => String(d[xk])))], ys = [...new Set(data.map((d) => String(d[yk])))];
    const raw = new Map<string, unknown>(), cell = new Map<string, ChartDatum>();
    for (const d of data) { const k = `${d[xk]}|${d[yk]}`; cell.set(k, d); raw.set(String(d[xk]), d[xk]); raw.set('y:' + String(d[yk]), d[yk]); }
    out = [];
    for (const yv of ys) for (const xv of xs) out.push(cell.get(`${xv}|${yv}`) ?? { [xk]: raw.get(xv), [yk]: raw.get('y:' + yv), [p.value]: null });
  }
  m.set(sig, out);
  return out;
}

const weekdayShort = new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' });
const weekdayLong = new Intl.DateTimeFormat(undefined, { weekday: 'long', timeZone: 'UTC' });
const fullDate = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
const monthShort = new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' });

const models = new WeakMap<ChartDatum, Map<string, Model>>();
function model(rows: ChartDatum[], p: HeatmapProps, config: ChartConfig): Model {
  const sig = `${p.variant}|${p.x}|${p.y}|${p.date}|${p.value}|${p.bins?.join(',')}|${p.scale}|${p.midpoint}|${p.weekStart}|${rows.length}|${config[p.value]?.label}`;
  const first = rows[0];
  const cached = first ? models.get(first)?.get(sig) : undefined;
  if (cached && cached.rows[cached.rows.length - 1] === rows[rows.length - 1]) return cached;
  const calendar = p.variant === 'calendar';
  const c = config[p.value];
  const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
  const fmt = c?.format ?? ((v: number) => nf.format(v));
  const values = rows.map((d) => (num(d[p.value]) ? (d[p.value] as number) : null));
  const diverging = p.scale === 'diverging', mid = p.midpoint ?? 0;
  const bins = makeBins(values.filter(num), p.bins, diverging, mid, fmt);
  const pos: Model['pos'] = [], at = new Map<string, number>(), days: number[] = [];
  let colNames: string[], rowNames: string[], cols: number, nrows: number;
  if (calendar) {
    const key = p.date ?? 'date', ws = p.weekStart ?? 0;
    const t0 = rows.length ? Math.floor(toTime(rows[0][key]) / DAY) * DAY : 0;
    const off = (new Date(t0).getUTCDay() - ws + 7) % 7;
    rows.forEach((d, i) => {
      const t = Math.floor(toTime(d[key]) / DAY) * DAY, di = Math.round((t - t0) / DAY);
      const r = (new Date(t).getUTCDay() - ws + 7) % 7, col = Math.floor((di + off) / 7);
      days.push(t); pos.push({ c: col, r }); at.set(`${col},${r}`, i);
    });
    cols = pos.length ? pos[pos.length - 1].c + 1 : 0; nrows = 7;
    // 2023-01-01 was a Sunday: the weekday names in the reader's language, from the week's first day.
    rowNames = Array.from({ length: 7 }, (_, r) => weekdayShort.format(new Date(Date.UTC(2023, 0, 1 + ((r + ws) % 7)))));
    colNames = [];
  } else {
    const xk = p.x ?? 'x', yk = p.y ?? 'y';
    const xs: unknown[] = [], ys: unknown[] = [], xi = new Map<string, number>(), yi = new Map<string, number>();
    for (const d of rows) {
      if (!xi.has(String(d[xk]))) { xi.set(String(d[xk]), xs.length); xs.push(d[xk]); }
      if (!yi.has(String(d[yk]))) { yi.set(String(d[yk]), ys.length); ys.push(d[yk]); }
    }
    rows.forEach((d, i) => { const col = xi.get(String(d[xk]))!, r = yi.get(String(d[yk]))!; pos.push({ c: col, r }); at.set(`${col},${r}`, i); });
    cols = xs.length; nrows = ys.length;
    colNames = xs.map((v) => (p.xFormat ? p.xFormat(v) : String(v)));
    rowNames = ys.map((v) => (p.yFormat ? p.yFormat(v) : String(v)));
  }
  const m: Model = { calendar, rows, pos, at, cols, nrows, colNames, rowNames, days, values, bins, fmt, label: c?.label ?? p.value, diverging, mid, ws: p.weekStart ?? 0 };
  if (first) { let mm = models.get(first); if (!mm) models.set(first, (mm = new Map())); mm.set(sig, m); }
  return m;
}

/** A cell's place in words: "Tuesday, Mar 14, 2026" or "Tue, 14:00" (its row, then its column). */
function placeName(m: Model, i: number, long: boolean) {
  if (m.calendar) return `${(long ? weekdayLong : weekdayShort).format(new Date(m.days[i]))}, ${fullDate.format(new Date(m.days[i]))}`;
  return `${m.rowNames[m.pos[i].r]}, ${m.colNames[m.pos[i].c]}`;
}
/** A value in words, with its step: "312 requests, step 5 of 7", "−4%, below 0, step 2 of 7", "no data". */
function valueWords(m: Model, i: number) {
  const v = m.values[i];
  if (v === null) return 'no data';
  const b = m.bins.of(v), side = m.diverging ? (v > m.mid ? `above ${m.fmt(m.mid)}, ` : v < m.mid ? `below ${m.fmt(m.mid)}, ` : `at ${m.fmt(m.mid)}, `) : '';
  return `${m.fmt(v)} ${m.label.toLowerCase()}, ${side}step ${b + 1} of ${m.bins.edges.length}`;
}

/* ───────────────────────── placement: cells in px ───────────────────────── */

/** The weekdays a calendar names down its side: Monday, Wednesday and Friday. */
const MARKED = [1, 3, 5];
const MONTH = 18, COLS = 22, BAND_GAP = 12, CAL_MAX = 22, GRID_MAX = 34, KEY = 12;
interface Placed {
  boxes: Array<[number, number, number, number]>;
  /** Calendar: weeks per band and each band's height (month row included). */
  perBand: number; bandH: number; cw: number; ch: number;
  colLabels: Array<{ x: number; y: number; text: string; anchor: 'start' | 'middle' }>;
  rowLabels: Array<{ y: number; text: string }>;
  legend: Array<{ x: number; y: number; text: string; color: string | null; density: number }>;
  height: number;
}

function legendItems(m: Model, legend: boolean) {
  if (!legend) return [];
  const items = m.bins.labels.map((text, i) => ({ text, color: m.bins.colors[i] as string | null, density: m.bins.density[i] }));
  if (m.values.some((v) => v === null)) items.push({ text: 'No data', color: null, density: 0 });
  return items;
}
/** The legend's swatches laid out from (0, top), wrapping inside the plot's width; and its height. */
function layLegend(m: Model, legend: boolean, top: number, pw: number) {
  const out: Placed['legend'] = [];
  let x = 0, y = top;
  for (const it of legendItems(m, legend)) {
    const w = KEY + 6 + textWidth(it.text);
    if (x > 0 && x + w > pw) { x = 0; y += 20; }
    out.push({ ...it, x, y });
    x += w + 16;
  }
  return { items: out, height: out.length ? y - top + 20 : 0 };
}

const placedCache = new WeakMap<Model, Map<string, Placed>>();
function place(m: Model, pw: number, ph: number | null, legend: boolean): Placed {
  const sig = `${Math.round(pw)}|${ph === null ? '' : Math.round(ph)}|${legend}`;
  let pc = placedCache.get(m);
  if (!pc) placedCache.set(m, (pc = new Map()));
  const hit = pc.get(sig);
  if (hit) return hit;
  const boxes: Placed['boxes'] = [], colLabels: Placed['colLabels'] = [], rowLabels: Placed['rowLabels'] = [];
  let out: Placed;
  if (m.calendar) {
    // A cell per day, a column per week. Narrower than 10px a cell, the weeks wrap into bands, each with its months.
    const across = (n: number) => Math.floor((pw + GAP) / Math.max(1, n) - GAP);
    let bands = 1;
    while (bands < m.cols && across(Math.ceil(m.cols / bands)) < MIN) bands++;
    const perBand = Math.max(1, Math.ceil(m.cols / bands));
    const cell = Math.max(MIN, Math.min(CAL_MAX, across(perBand)));
    const bandH = MONTH + 7 * (cell + GAP) - GAP;
    m.pos.forEach(({ c, r }) => {
      const b = Math.floor(c / perBand);
      boxes.push([(c % perBand) * (cell + GAP), b * (bandH + BAND_GAP) + MONTH + r * (cell + GAP), cell, cell]);
    });
    // Each band names its months over the week each begins in (and its own first month, unless a 1st is close
    // behind), and its rows Mon, Wed and Fri, as a wall calendar would.
    for (let b = 0; b < bands; b++) {
      const top = b * (bandH + BAND_GAP), xOf = (i: number) => (m.pos[i].c % perBand) * (cell + GAP);
      const inBand = m.days.map((_, i) => i).filter((i) => Math.floor(m.pos[i].c / perBand) === b);
      if (!inBand.length) continue;
      const firsts = inBand.filter((i) => new Date(m.days[i]).getUTCDate() === 1);
      const marks = firsts.some((i) => xOf(i) < 3 * (cell + GAP)) ? firsts : [inBand[0], ...firsts];
      let lastEnd = -Infinity;
      for (const i of marks) {
        const x = xOf(i), text = monthShort.format(new Date(m.days[i])), w = textWidth(text);
        if (x < lastEnd + 8 || x + w > pw + 2) continue;
        colLabels.push({ x, y: top + 12, text, anchor: 'start' });
        lastEnd = x + w;
      }
      for (let r = 0; r < 7; r++) if (MARKED.includes((r + m.ws) % 7)) rowLabels.push({ y: top + MONTH + r * (cell + GAP) + cell / 2, text: m.rowNames[r] });
    }
    const gridH = bands * (bandH + BAND_GAP) - BAND_GAP;
    const leg = layLegend(m, legend, gridH + 14, pw);
    out = { boxes, perBand, bandH, cw: cell, ch: cell, colLabels, rowLabels, legend: leg.items, height: gridH + (leg.height ? 14 + leg.height : 0) };
  } else {
    // Columns fill the width; rows are as tall as a column is wide, up to 34px, and fit a given height. Narrower than
    // 10px a column, the columns wrap into bands (00–11 above 12–23), each naming its rows and columns.
    const across = (n: number) => Math.floor((pw + GAP) / Math.max(1, n) - GAP);
    let bands = 1;
    while (bands < m.cols && across(Math.ceil(m.cols / bands)) < MIN) bands++;
    const perBand = Math.max(1, Math.ceil(m.cols / bands));
    const cw = Math.max(MIN, across(perBand));
    const legH = layLegend(m, legend, 0, pw).height;
    let ch = Math.max(MIN, Math.min(GRID_MAX, cw));
    if (ph !== null) {
      const room = ph - bands * COLS - (bands - 1) * BAND_GAP - (legH ? 10 + legH : 0);
      ch = Math.max(MIN, Math.min(ch, Math.floor((room + bands * GAP) / Math.max(1, bands * m.nrows) - GAP)));
    }
    const gridH = m.nrows * (ch + GAP) - GAP, bandH = gridH + COLS;
    m.pos.forEach(({ c, r }) => boxes.push([(c % perBand) * (cw + GAP), Math.floor(c / perBand) * (bandH + BAND_GAP) + r * (ch + GAP), cw, ch]));
    // Every k-th column named, k as small as lets each name clear its neighbours by 6px.
    const ws = m.colNames.map(textWidth);
    let every = 1;
    while (every < perBand && ws.some((w, i) => i % every === 0 && i + every < ws.length && (w + ws[i + every]) / 2 + 6 > every * (cw + GAP))) every++;
    m.colNames.forEach((text, c) => {
      if ((c % perBand) % every === 0) colLabels.push({ x: (c % perBand) * (cw + GAP) + cw / 2, y: Math.floor(c / perBand) * (bandH + BAND_GAP) + gridH + 16, text, anchor: 'middle' });
    });
    for (let b = 0; b < bands; b++) m.rowNames.forEach((text, r) => rowLabels.push({ y: b * (bandH + BAND_GAP) + r * (ch + GAP) + ch / 2, text }));
    const allH = bands * (bandH + BAND_GAP) - BAND_GAP;
    const leg = layLegend(m, legend, allH + 10, pw);
    out = { boxes, perBand, bandH, cw, ch, colLabels, rowLabels, legend: leg.items, height: allH + (leg.height ? 10 + leg.height : 0) };
  }
  pc.set(sig, out);
  return out;
}

function rowLabelWidth(m: Model) {
  const names = m.calendar ? m.rowNames.filter((_, r) => MARKED.includes((r + m.ws) % 7)) : m.rowNames;
  return Math.min(160, Math.ceil(Math.max(0, ...names.map(textWidth)))) + 10;
}

/** The model and placement for the chart as drawn now. */
function geo(props: Record<string, unknown>, ctx: ChartContextValue) {
  const p = props as unknown as HeatmapProps;
  const m = model(ctx.data, p, ctx.config);
  return { p, m, g: place(m, ctx.width, ctx.height, p.legend !== false) };
}

/* ───────────────────────── the chart ───────────────────────── */

/** One pattern tile per density: sparse dots, dense dots, hatching (either way), crosshatch. */
function Density({ id, level, fg, fall }: { id: string; level: number; fg: string; fall?: boolean }) {
  if (level === 1) return <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1" fill={fg} /></pattern>;
  if (level === 2) return <pattern id={id} width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill={fg} /></pattern>;
  return (
    <pattern id={id} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform={`rotate(${fall ? -45 : 45})`}>
      <line x1="2.5" y1="0" x2="2.5" y2="5" stroke={fg} strokeWidth="1.3" />
      {level === 4 && <line x1="0" y1="2.5" x2="5" y2="2.5" stroke={fg} strokeWidth="1.3" />}
    </pattern>
  );
}

/**
 * A value per cell across two dimensions: load by hour and weekday, activity by day over a year. The cells are the
 * record, so they lie flat on the plot: a data-seq step (or data-div around a midpoint), parted by 2px of the plot's
 * own colour, never raised, never shaded. Each step also has a pattern density for forced colours and print, and its
 * range in words in the legend, the cell's name and the table.
 */
export function Heatmap(props: HeatmapProps) {
  const ctx = useChart();
  const { data, active, relevance, hasRelevance, patterns, encode, series } = ctx;
  const pid = React.useId().replace(/[^\w-]/g, '');
  if (!data.length || !series.length) return null;
  const { p, m, g } = geo(props as unknown as Record<string, unknown>, ctx);
  const e = encode(p.value);
  const forced = e.stroke === 'CanvasText';
  const fg = forced ? 'CanvasText' : 'var(--alt-chart-bg)';
  const levels = [...new Set(m.bins.density.map((d, i) => (d ? `${d}${m.bins.side[i] < 0 ? 'f' : ''}` : '')).filter(Boolean))];
  const patternOf = (b: number) => (patterns && m.bins.density[b] ? `url(#${pid}-d${m.bins.density[b]}${m.bins.side[b] < 0 ? 'f' : ''})` : null);
  const rx = (w: number, h: number) => Math.min(4, Math.min(w, h) * 0.2);
  // Interactive cells get the container's hover outline; a static grid outlines the cell under the readout itself.
  const acts = !!(p.onSelect || p.drill);
  const activeAt = active ? data.indexOf(active) : -1;
  const cells = data.map((d, i) => {
    const [x, y, w, h] = g.boxes[i];
    const v = m.values[i];
    const b = v === null ? -1 : m.bins.of(v);
    const pat = b >= 0 ? patternOf(b) : null;
    const id = `${d[p.x ?? ''] ?? ''}|${d[p.y ?? ''] ?? ''}|${d[p.date ?? ''] ?? ''}`;
    const cell = (
      <g key={id} className="alt-heat-cell" data-bin={b >= 0 ? b : undefined} data-empty={b < 0 ? '' : undefined}>
        {b < 0
          ? <rect x={x + 0.5} y={y + 0.5} width={w - 1} height={h - 1} rx={rx(w, h)} className="alt-heat-none" />
          : <rect x={x} y={y} width={w} height={h} rx={rx(w, h)} className="alt-heat-fill" fill={forced ? 'Canvas' : m.bins.colors[b]} stroke={e.edge} strokeWidth={e.edge ? 1 : undefined} />}
        {pat && <rect x={x} y={y} width={w} height={h} rx={rx(w, h)} fill={pat} className="alt-heat-pattern" />}
      </g>
    );
    return hasRelevance ? <ChartRelevance key={id} miss={relevance(d) === 'miss'}>{cell}</ChartRelevance> : cell;
  });
  const left = -8;
  return (
    <g className="alt-heat" data-variant={m.calendar ? 'calendar' : 'grid'}>
      {patterns && <defs>{levels.map((l) => <Density key={l} id={`${pid}-d${l}`} level={+l[0]} fall={l.endsWith('f')} fg={fg} />)}</defs>}
      <g className="alt-heat-labels">
        {g.rowLabels.map((r, i) => <text key={'r' + i} x={left} y={r.y} dy="0.32em" textAnchor="end">{fit(r.text, rowLabelWidth(m) - 10)}</text>)}
        {g.colLabels.map((c, i) => <text key={'c' + i} x={c.x} y={c.y} textAnchor={c.anchor}>{c.text}</text>)}
      </g>
      <g className="alt-heat-cells">{cells}</g>
      {!acts && activeAt >= 0 && (() => {
        const [x, y, w, h] = g.boxes[activeAt];
        return <rect className="alt-heat-active" x={x - 1} y={y - 1} width={w + 2} height={h + 2} rx={rx(w, h) + 1} />;
      })()}
      {g.legend.length > 0 && (
        <g className="alt-heat-legend">
          {g.legend.map((it, i) => (
            <g key={i}>
              {it.color === null
                ? <rect x={it.x + 0.5} y={it.y + 0.5} width={KEY - 1} height={KEY - 1} rx={2} className="alt-heat-none" />
                : <rect x={it.x} y={it.y} width={KEY} height={KEY} rx={2} className="alt-heat-fill" fill={forced ? 'Canvas' : it.color} stroke={e.edge} strokeWidth={e.edge ? 1 : undefined} />}
              {patterns && it.density > 0 && <rect x={it.x} y={it.y} width={KEY} height={KEY} rx={2} className="alt-heat-pattern" fill={`url(#${pid}-d${it.density}${m.bins.side[i] < 0 ? 'f' : ''})`} />}
              <text x={it.x + KEY + 6} y={it.y + KEY / 2} dy="0.32em">{it.text}</text>
            </g>
          ))}
        </g>
      )}
    </g>
  );
}

/** A cell's middle, for the keyboard's focus ring, the readout and an afterglow's value. */
Heatmap.chartPoint = (props: Record<string, unknown>, ctx: ChartContextValue, d: ChartDatum): [number, number] => {
  const { g } = geo(props, ctx);
  const i = ctx.data.indexOf(d);
  if (i < 0) return [0, 0];
  const [x, y, w, h] = g.boxes[i];
  return [x + w / 2, y + h / 2];
};
/** A cell's box, so the keyboard's focus ring is the cell's own shape. */
Heatmap.chartBox = (props: Record<string, unknown>, ctx: ChartContextValue, d: ChartDatum): [number, number, number, number] | null => {
  const { g } = geo(props, ctx);
  const i = ctx.data.indexOf(d);
  return i < 0 ? null : g.boxes[i];
};
/** A cell's outline, 2px outside it, for the hover outline and a live afterglow. */
Heatmap.chartMark = (props: Record<string, unknown>, ctx: ChartContextValue, d: ChartDatum): string | null => {
  const { g } = geo(props, ctx);
  const i = ctx.data.indexOf(d);
  if (i < 0) return null;
  const [x, y, w, h] = g.boxes[i];
  return `M${x - 1},${y - 1}h${w + 2}v${h + 2}h${-(w + 2)}Z`;
};
/** The cell under the pointer: the gaps belong to the cell before them, so the readout never flickers off between cells. */
Heatmap.chartNearest = (props: Record<string, unknown>, ctx: ChartContextValue, px: number, py: number): number | null => {
  const { g } = geo(props, ctx);
  let best: number | null = null;
  g.boxes.forEach(([x, y, w, h], i) => { if (px >= x - GAP / 2 && px < x + w + GAP / 2 && py >= y - GAP / 2 && py < y + h + GAP / 2) best = i; });
  return best;
};
/**
 * The grid's keys: arrows move cell to cell and stop at the edges; Home and End go to the row's first and last cell,
 * and with Ctrl (or Cmd) the grid's; Page Up and Page Down move a month in the calendar.
 */
Heatmap.chartMove = (props: Record<string, unknown>, ctx: ChartContextValue, i: number, e: React.KeyboardEvent): number | null => {
  const { m } = geo(props, ctx);
  const here = m.pos[i];
  if (!here) return null;
  const find = (c: number, r: number) => m.at.get(`${c},${r}`);
  const inRow = [...m.at.entries()].filter(([k]) => k.endsWith(`,${here.r}`)).map(([, j]) => j).sort((a, b) => m.pos[a].c - m.pos[b].c);
  switch (e.key) {
    case 'ArrowRight': return find(here.c + 1, here.r) ?? i;
    case 'ArrowLeft': return find(here.c - 1, here.r) ?? i;
    case 'ArrowDown': return find(here.c, here.r + 1) ?? i;
    case 'ArrowUp': return find(here.c, here.r - 1) ?? i;
    case 'Home': return e.ctrlKey || e.metaKey ? 0 : inRow[0] ?? i;
    case 'End': return e.ctrlKey || e.metaKey ? m.rows.length - 1 : inRow[inRow.length - 1] ?? i;
    case 'PageUp': case 'PageDown': {
      if (!m.calendar) return i;
      const d = new Date(m.days[i]), step = e.key === 'PageDown' ? 1 : -1;
      const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + step, Math.min(d.getUTCDate(), new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + step + 1, 0)).getUTCDate()));
      const j = Math.round((t - m.days[0]) / DAY);
      return Math.max(0, Math.min(m.rows.length - 1, j));
    }
  }
  return null;
};
/** "Tuesday, 14:00, 312 requests, step 5 of 7." */
Heatmap.chartName = (props: Record<string, unknown>, ctx: ChartContextValue, d: ChartDatum): string => {
  const { m } = geo(props, ctx);
  const i = ctx.data.indexOf(d);
  return i < 0 ? '' : `${placeName(m, i, true)}, ${valueWords(m, i)}.`;
};
/** The readout: the cell's place, then its value keyed by its step's colour. */
Heatmap.chartReadout = (props: Record<string, unknown>, ctx: ChartContextValue, d: ChartDatum): ChartReadout => {
  const { p, m } = geo(props, ctx);
  const i = ctx.data.indexOf(d), v = m.values[i];
  const forced = ctx.encode(p.value).stroke === 'CanvasText';
  return {
    label: placeName(m, i, false), indicator: 'dot',
    items: [{ key: p.value, label: m.label, value: v ?? 0, text: v === null ? 'No data' : m.fmt(v), color: v === null || forced ? 'var(--line-control)' : m.bins.colors[m.bins.of(v)] }],
  };
};

Heatmap.chartInfo = (props: Record<string, unknown>, config: ChartConfig): ChartInfo => {
  const p = props as unknown as HeatmapProps;
  const calendar = p.variant === 'calendar';
  const rows = Array.isArray(p.data) ? fill(p.data, p) : undefined;
  const m = rows ? model(rows, p, config) : undefined;
  const xk = p.x ?? 'x', yk = p.y ?? 'y', dk = p.date ?? 'date';
  const idOf = (d: ChartDatum) => (calendar ? iso(Math.floor(toTime(d[dk]) / DAY) * DAY) : `${d[xk]}|${d[yk]}`);
  const index = m ? new Map(m.rows.map((d, i) => [d, i])) : new Map<ChartDatum, number>();
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  let summary: string | undefined, columns: ChartColumn[] | undefined;
  if (m && m.rows.length) {
    const vals = m.values.map((v, i) => [v, i] as const).filter((x): x is readonly [number, number] => x[0] !== null);
    const nulls = m.values.length - vals.length;
    const what = calendar ? `Calendar heatmap of ${m.label}, ${fullDate.format(new Date(m.days[0]))} to ${fullDate.format(new Date(m.days[m.days.length - 1]))}, ${m.rows.length} days.`
      : `Heatmap of ${m.label} by ${yk} and ${xk}, ${m.nrows} ${m.nrows === 1 ? 'row' : 'rows'} by ${m.cols} ${m.cols === 1 ? 'column' : 'columns'}.`;
    let range = '';
    if (vals.length) {
      const hi = vals.reduce((a, b) => (b[0] > a[0] ? b : a)), lo = vals.reduce((a, b) => (b[0] < a[0] ? b : a));
      range = ` Highest ${m.fmt(hi[0])} ${calendar ? 'on' : 'at'} ${placeName(m, hi[1], false)}; lowest ${m.fmt(lo[0])} ${calendar ? 'on' : 'at'} ${placeName(m, lo[1], false)}.`;
    }
    const list = m.bins.labels.length > 1 ? `${m.bins.labels.slice(0, -1).join(', ')} and ${m.bins.labels[m.bins.labels.length - 1]}` : m.bins.labels[0];
    summary = `${what}${range}${nulls ? ` ${nulls} ${nulls === 1 ? (calendar ? 'day has' : 'cell has') : calendar ? 'days have' : 'cells have'} no data.` : ''} Steps: ${list}${m.diverging ? `, around ${m.fmt(m.mid)}` : ''}.`;
    const at = (d: ChartDatum) => index.get(d) ?? -1;
    const step = (d: ChartDatum) => { const v = m.values[at(d)]; return v === null || v === undefined ? '—' : m.bins.labels[m.bins.of(v)]; };
    const value: ChartColumn = { key: p.value, header: m.label, align: 'end', cell: (d) => { const v = m.values[at(d)]; return v === null || v === undefined ? 'No data' : m.fmt(v); }, sortValue: (d) => m.values[at(d)] ?? -Infinity };
    const stepCol: ChartColumn = { key: '__step', header: 'Step', cell: step, sortValue: (d) => { const v = m.values[at(d)]; return v === null || v === undefined ? -1 : m.bins.of(v); } };
    columns = calendar
      ? [{ key: '__date', header: cap(dk), cell: (d) => placeName(m, at(d), false), sortValue: (d) => m.days[at(d)] }, value, stepCol]
      : [{ key: '__y', header: cap(yk), cell: (d) => m.rowNames[m.pos[at(d)].r], sortValue: (d) => m.pos[at(d)].r },
        { key: '__x', header: cap(xk), cell: (d) => m.colNames[m.pos[at(d)].c], sortValue: (d) => m.pos[at(d)].c }, value, stepCol];
  }
  return {
    kind: calendar ? 'Calendar heatmap' : 'Heatmap', xScale: 'band', x: calendar ? dk : xk, plot: 'grid', flat: true, motion: 'none', imprint: 'grid', swatch: 'rect',
    data: rows, id: idOf, label: (d) => { const i = index.get(d); return m && i !== undefined ? placeName(m, i, false) : idOf(d); },
    left: m ? rowLabelWidth(m) : 40, fitHeight: m ? (pw) => place(m, pw, null, p.legend !== false).height : undefined,
    summary, columns, relevance: p.relevance, selected: p.selected ?? undefined, onSelect: p.onSelect, drill: p.drill,
  };
};
