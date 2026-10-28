import * as React from 'react';
import { cx, useIsoLayoutEffect } from './core';

/* ───────────────────────── config ───────────────────────── */

/** A categorical slot of the data palette. */
export type ChartSlot = `data-${1 | 2 | 3 | 4 | 5 | 6}` | 'data-other';

export interface ChartSeriesConfig {
  /** The series' name, in the legend, the readout, the summary and the table. */
  label: string;
  /** Formats a value of this series: ticks, readouts, the summary. Default: Intl.NumberFormat. */
  format?: (value: number) => string;
  /** The series' colour slot. Default: its place in the config (the first is data-1); a seventh and later are data-other. */
  color?: ChartSlot;
}
/** Each data key a chart draws, mapped to its label, format and colour slot. The order is the colour order, fixed for the chart's life. */
export type ChartConfig = Record<string, ChartSeriesConfig>;
export type ChartDatum = Record<string, unknown>;

export interface ChartSeries {
  key: string;
  label: string;
  slot: ChartSlot;
  /** `var(--data-n)`: use it as a fill or stroke. The figure also sets `--color-<key>` to it. */
  color: string;
  format: (value: number) => string;
}

/* ───────────────────────── scales ───────────────────────── */

export interface LinearScale { (value: number): number; kind: 'linear'; domain: [number, number]; range: [number, number]; ticks: number[]; }
export interface TimeScale { (value: string | number): number; kind: 'time'; domain: [number, number]; range: [number, number]; ticks: number[]; }
export interface BandScale { (value: string): number; kind: 'band'; domain: string[]; range: [number, number]; ticks: string[]; bandwidth: number; step: number; }
export type ChartXScale = LinearScale | TimeScale | BandScale;

const clean = (x: number) => Number(x.toPrecision(12));

/** A 1–2–5 step that gives about `count` intervals across [min, max]. */
function niceStep(min: number, max: number, count: number) {
  const raw = (max - min) / Math.max(1, count) || 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const f = raw / mag;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag;
}

function linearScale(domain: [number, number], range: [number, number], count: number, nice: boolean): LinearScale {
  let [d0, d1] = domain;
  if (d0 === d1) { d0 -= 1; d1 += 1; }
  const step = niceStep(d0, d1, count);
  if (nice) { d0 = clean(Math.floor(d0 / step) * step); d1 = clean(Math.ceil(d1 / step) * step); }
  const ticks: number[] = [];
  for (let t = Math.ceil(d0 / step) * step; t <= d1 + step * 1e-9; t += step) ticks.push(clean(t));
  const [r0, r1] = range;
  const s = ((v: number) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0)) as LinearScale;
  return Object.assign(s, { kind: 'linear' as const, domain: [d0, d1] as [number, number], range, ticks });
}

/** ISO 'YYYY-MM-DD' (or a full ISO timestamp), read as UTC, or epoch milliseconds. */
export function toTime(v: unknown): number {
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  const s = String(v);
  return Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T00:00:00Z' : s);
}

const DAY = 864e5;
type Interval = { months?: number; days?: number };
const INTERVALS: Interval[] = [{ days: 1 }, { days: 2 }, { days: 7 }, { days: 14 }, { months: 1 }, { months: 3 }, { months: 6 }, { months: 12 }, { months: 24 }, { months: 60 }, { months: 120 }];

function timeTicks(d0: number, d1: number, max: number): { ticks: number[]; interval: Interval } {
  for (const iv of INTERVALS) {
    const ticks: number[] = [];
    if (iv.days) {
      const step = iv.days * DAY;
      for (let t = Math.ceil(d0 / DAY) * DAY; t <= d1; t += step) ticks.push(t);
    } else {
      const m = iv.months!;
      const a = new Date(d0);
      let y = a.getUTCFullYear(), mo = a.getUTCMonth();
      if (Date.UTC(y, mo, 1) < d0) mo += 1;
      mo = Math.ceil(mo / m) * m;
      for (let t = Date.UTC(y, mo, 1); t <= d1; mo += m, t = Date.UTC(y, mo, 1)) ticks.push(t);
    }
    if (ticks.length <= max) return { ticks, interval: iv };
  }
  return { ticks: [d0, d1], interval: { months: 120 } };
}

function timeScale(domain: [number, number], range: [number, number], max: number) {
  const [d0, d1] = domain[0] === domain[1] ? [domain[0] - DAY, domain[1] + DAY] : domain;
  const { ticks, interval } = timeTicks(d0, d1, max);
  const [r0, r1] = range;
  const s = ((v: string | number) => r0 + ((toTime(v) - d0) / (d1 - d0)) * (r1 - r0)) as TimeScale;
  return { scale: Object.assign(s, { kind: 'time' as const, domain: [d0, d1] as [number, number], range, ticks }), interval };
}

function bandScale(domain: string[], range: [number, number], padding: number): BandScale {
  const [r0, r1] = range;
  const n = Math.max(1, domain.length);
  // Outer padding is half the inner gap, so the bars sit as far from the plot's edges as from each other.
  const step = (r1 - r0) / n;
  const bandwidth = step * (1 - padding);
  const index = new Map(domain.map((d, i) => [d, i]));
  const s = ((v: string) => r0 + step * padding / 2 + step * (index.get(String(v)) ?? 0)) as BandScale;
  return Object.assign(s, { kind: 'band' as const, domain, range, ticks: domain, bandwidth, step });
}

/* ───────────────────────── text ───────────────────────── */

const TICK_FONT = '500 12.5px "Instrument Sans", ui-sans-serif, system-ui, sans-serif';
let measurer: CanvasRenderingContext2D | null | undefined;
/** The width of a tick label: measured where there's a canvas, estimated otherwise (tabular figures are about 0.58em). */
function textWidth(s: string) {
  if (measurer === undefined) measurer = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
  if (measurer) { measurer.font = TICK_FONT; return measurer.measureText(s).width; }
  return s.length * 7.3;
}

/* ───────────────────────── context ───────────────────────── */

export interface ChartContextValue {
  /** The plot's size in px, inside the axes. Marks draw from (0, 0) at its top left. */
  width: number;
  height: number;
  x: ChartXScale;
  y: LinearScale;
  /** Where a datum sits on x: a band's centre, or its time or value. */
  xOf: (d: ChartDatum) => number;
  /** The y of the ground line: y(0) when zero is in the domain, otherwise the plot's foot. */
  ground: number;
  /** The records as they're shown right now: while the data changes, values glide and leaving records linger. */
  data: ChartDatum[];
  xKey: string;
  config: ChartConfig;
  series: ChartSeries[];
  /**
   * How present a mark is, 0–1, while records or series enter and leave: multiply it into the mark's opacity. Pass
   * the record, the series key, or both.
   */
  alpha: (d?: ChartDatum | null, seriesKey?: string) => number;
  /** Formats a value of a series (by its key), or an x value. */
  format: (key: string, value: number) => string;
  formatX: (value: unknown) => string;
}

const ChartContext = React.createContext<ChartContextValue | null>(null);

/** The scales, plot size and config of the nearest ChartContainer, for drawing your own marks. */
export function useChart(): ChartContextValue {
  const c = React.useContext(ChartContext);
  if (!c) throw new Error('useChart must be used inside a ChartContainer.');
  return c;
}

/**
 * What a chart type tells its container, as a static `chartInfo` on the component: its name for the summary, how to
 * place x, whether zero must be on y, and the y extent if it isn't the plain min and max of the series (a stack).
 */
export interface ChartInfo { kind?: string; xScale?: 'band' | 'time' | 'linear'; zero?: boolean; yExtent?: [number, number]; }
type ChartChild = { chartInfo?: (props: Record<string, unknown>, config: ChartConfig) => ChartInfo; chartHtml?: boolean };

/* ───────────────────────── frames and motion ───────────────────────── */

type Row = { key: string; d: ChartDatum };
/** One state of the plot, independent of its size in px: what the motion engine interpolates between. */
interface Frame {
  kind: 'band' | 'time' | 'linear';
  rows: Row[];
  series: ChartSeries[];
  y: [number, number];
  ticks: Array<{ v: number; a: number }>;
  /** Each band's start and width, as fractions of the plot's width. */
  band: Map<string, [number, number]> | null;
  rowAlpha: Map<string, number>;
  seriesAlpha: Map<string, number>;
  /** The y axis's width in px. */
  left: number;
}
type Layer = { frame: Frame; opacity: number };
/** Where a change is: the axis rescaling, the marks gliding to their values, or a cross-fade. */
export type ChartStage = 'rescale' | 'values' | 'fade';

const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const b = (s: number, a: number, c: number) => 3 * a * s * (1 - s) ** 2 + 3 * c * s * s * (1 - s) + s ** 3;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let lo = 0, hi = 1, s = t;
    for (let i = 0; i < 24; i++) { const x = b(s, x1, x2); if (Math.abs(x - t) < 1e-5) break; if (x < t) lo = s; else hi = s; s = (lo + hi) / 2; }
    return b(s, y1, y2);
  };
};
/** ease-glide: size and position changes that stay at one level. */
const glide = bezier(0.65, 0, 0.35, 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/**
 * A frame between two others. p1 is the rescale's progress: the y domain and the axis. p2 is the values' progress:
 * the marks, the bands carried to their new places, records and series entering (fading in) and leaving (fading out
 * at 70% of the entry's time). Marks keep their values while the axis rescales, so they move only with the scale.
 */
function mix(from: Frame, to: Frame, p1: number, p2: number): Frame {
  const e1 = glide(p1), e2 = glide(p2), out = glide(clamp01(p2 / 0.7));
  const shared = (v: number, list: Frame['ticks']) => list.some((u) => Math.abs(u.v - v) < 1e-9);
  const ticks = p1 >= 1 ? to.ticks : [
    ...from.ticks.filter((t) => !shared(t.v, to.ticks)).map((t) => ({ v: t.v, a: t.a * (1 - e1) })),
    ...to.ticks.map((t) => ({ v: t.v, a: shared(t.v, from.ticks) ? 1 : t.a * e1 })),
  ];
  const fromRows = new Map(from.rows.map((r) => [r.key, r]));
  const toKeys = new Set(to.rows.map((r) => r.key));
  const keys = [...new Set([...to.series, ...from.series].map((s) => s.key))];
  const rows: Row[] = [];
  const rowAlpha = new Map<string, number>();
  for (const r of to.rows) {
    const f = fromRows.get(r.key);
    if (!f) { rows.push(r); rowAlpha.set(r.key, e2); continue; }
    const d: ChartDatum = { ...r.d };
    for (const k of keys) { const a = f.d[k], b = r.d[k]; if (typeof a === 'number' && typeof b === 'number') d[k] = lerp(a, b, e2); }
    rows.push({ key: r.key, d });
    rowAlpha.set(r.key, lerp(from.rowAlpha.get(r.key) ?? 1, 1, e2));
  }
  for (const f of from.rows) {
    if (toKeys.has(f.key)) continue;
    const a = (from.rowAlpha.get(f.key) ?? 1) * (1 - out);
    if (a > 0.001) { rows.push(f); rowAlpha.set(f.key, a); }
  }
  const toSeries = new Set(to.series.map((s) => s.key));
  const series = [...to.series, ...from.series.filter((s) => !toSeries.has(s.key))];
  const seriesAlpha = new Map<string, number>();
  for (const s of to.series) seriesAlpha.set(s.key, lerp(from.seriesAlpha.get(s.key) ?? 0, 1, e2));
  for (const s of from.series) if (!toSeries.has(s.key)) seriesAlpha.set(s.key, (from.seriesAlpha.get(s.key) ?? 1) * (1 - out));
  let band: Frame['band'] = null;
  if (to.band) {
    band = new Map();
    for (const [k, [s, w]] of to.band) { const f = from.band?.get(k); band.set(k, f ? [lerp(f[0], s, e2), lerp(f[1], w, e2)] : [s, w]); }
    if (from.band) for (const [k, v] of from.band) if (!band.has(k)) band.set(k, v);
  }
  return {
    kind: to.kind, rows, series, ticks, band, rowAlpha, seriesAlpha,
    y: [lerp(from.y[0], to.y[0], e1), lerp(from.y[1], to.y[1], e1)],
    left: lerp(from.left, to.left, e1),
  };
}

type Motion = { from: Frame | null; to: Frame; start: number; mode: 'glide' | 'fade'; d1: number; d2: number };

/**
 * The one transition engine every chart moves by (Motion.md, "Charts"). A change of data glides at one level on
 * ease-glide, staged: if y's domain changes, the axis rescales first (dur-travel-2) and then the marks glide to their
 * new values (dur-travel-3); the two never happen at once. Bands are carried to their new places. Records and series
 * entering and leaving cross-fade. The whole plot cross-fades instead (dur-travel-1) on first render, when x's values
 * change under a line, past 500 marks, and under reduced motion. A new change mid-way starts from where the marks are.
 * Resizing never animates.
 */
function useChartMotion(target: Frame, changeKey: unknown, plotRef: React.RefObject<HTMLElement | null>) {
  const [, setTick] = React.useState(0);
  const motion = React.useRef<Motion | null>(null);
  const settled = React.useRef<Frame | null>(null);
  const lastKey = React.useRef<unknown>(undefined);
  const raf = React.useRef(0);

  const at = (t: number): { layers: Layer[]; stage?: ChartStage; done: boolean } => {
    const m = motion.current;
    if (!m) return { layers: [{ frame: settled.current ?? target, opacity: 1 }], done: true };
    const el = t - m.start;
    if (m.mode === 'fade') {
      const p = clamp01(el / m.d2), e = glide(p);
      return { layers: m.from ? [{ frame: m.from, opacity: 1 - e }, { frame: m.to, opacity: e }] : [{ frame: m.to, opacity: e }], stage: 'fade', done: p >= 1 };
    }
    const p1 = m.d1 ? clamp01(el / m.d1) : 1, p2 = clamp01((el - m.d1) / m.d2);
    return { layers: [{ frame: mix(m.from!, m.to, p1, p2), opacity: 1 }], stage: p1 < 1 ? 'rescale' : 'values', done: p2 >= 1 };
  };

  useIsoLayoutEffect(() => {
    const first = lastKey.current === undefined;
    if (!first && lastKey.current === changeKey) {
      // The same data at a new size: follow it without motion.
      if (motion.current) motion.current.to = target; else settled.current = target;
      return;
    }
    lastKey.current = changeKey;
    const cs = plotRef.current ? getComputedStyle(plotRef.current) : null;
    const ms = (name: string, fallback: number) => { const v = parseFloat(cs?.getPropertyValue(name) ?? ''); return isFinite(v) ? v : fallback; };
    const reduced = cs ? parseFloat(cs.getPropertyValue('--alt-travel')) === 0 : false;
    const now = performance.now();
    if (first) motion.current = { from: null, to: target, start: now, mode: 'fade', d1: 0, d2: ms('--dur-travel-1', 140) };
    else {
      const current = at(now).layers;
      const from = current[current.length - 1].frame;
      const sameX = from.kind === target.kind && (target.kind === 'band'
        || (from.rows.length === target.rows.length && from.rows.every((r, i) => r.key === target.rows[i].key)));
      const many = target.rows.length * target.series.length > 500;
      if (reduced || many || !sameX) motion.current = { from, to: target, start: now, mode: 'fade', d1: 0, d2: ms('--dur-travel-1', 140) };
      else {
        const rescale = Math.abs(from.y[0] - target.y[0]) > 1e-9 || Math.abs(from.y[1] - target.y[1]) > 1e-9;
        motion.current = { from, to: target, start: now, mode: 'glide', d1: rescale ? ms('--dur-travel-2', 180) : 0, d2: ms('--dur-travel-3', 220) };
      }
    }
    setTick((n) => n + 1);
    cancelAnimationFrame(raf.current);
    const step = () => {
      if (at(performance.now()).done) { settled.current = motion.current!.to; motion.current = null; }
      else raf.current = requestAnimationFrame(step);
      setTick((n) => n + 1);
    };
    raf.current = requestAnimationFrame(step);
  });
  React.useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return at(performance.now());
}

/* ───────────────────────── container ───────────────────────── */

export interface ChartContainerProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  config: ChartConfig;
  /** The records. Optional when the chart inside takes `data` itself. */
  data?: ChartDatum[];
  /** The key of x in each record. Optional when the chart inside takes `x`. */
  x?: string;
  /** How x is placed. Default: time for ISO dates, epoch numbers or Dates; linear for other numbers; band otherwise. */
  xScale?: 'band' | 'time' | 'linear';
  /** Width ÷ height of the plot. Default 2, unless `height` is set. */
  aspect?: number;
  /** The plot's height in px, instead of an aspect ratio. */
  height?: number;
  /** A visible name, inside the figure. Leave it out when a CardTitle names the chart, and pass `aria-labelledby`. */
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** What the chart shows, in a sentence or two: "Revenue rose 18% while costs held flat." Shown under the plot. Without it a summary is generated for screen readers. */
  summary?: React.ReactNode;
  /** Force zero onto y. Default true: bars always stand on the ground line, and lines read best against it too. */
  zero?: boolean;
  /** A fixed y domain, instead of the series' extent made nice. */
  yDomain?: [number, number];
  /** Formats y ticks. Default: the first series' format. */
  yFormat?: (value: number) => string;
  /** Formats x ticks and x values. Default: by the scale (dates in the reader's locale, numbers as numbers). */
  xFormat?: (value: unknown) => string;
  /** The gap between bands, as a fraction of a band's step. Default 0.2. */
  bandPadding?: number;
  /** Turns the axes off, for a chart that labels its marks directly. Gridlines and the ground line stay. */
  axes?: boolean;
  /** The locale for numbers and dates. Default: the reader's. */
  locale?: string;
}

const isTimeLike = (v: unknown) => v instanceof Date || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) || (typeof v === 'number' && v > 3e11);
const cssKey = (k: string) => k.replace(/[^\w-]/g, '-');
const TOP = 8;

/**
 * The frame every chart shares: a figure that sizes the plot, turns data into positions, draws the axes, the
 * gridlines and the ground line, gives each series its label, format and colour slot, and names and summarises the
 * chart. It's the record drawn as a shape, so all of it lies flush on whatever it sits on: no level, no shadow. When
 * the data changes, its marks move by the shared transition engine (useChartMotion).
 */
export function ChartContainer({ config, data: dataProp, x: xProp, xScale: xScaleProp, aspect, height, title, description, summary,
  zero: zeroProp, yDomain, yFormat, xFormat, bandPadding = 0.2, axes = true, locale, className, style, children, ...rest }: ChartContainerProps) {
  const id = React.useId();
  const plotRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState<{ w: number; h: number } | null>(null);
  useIsoLayoutEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const measure = () => setSize((s) => (s && s.w === el.clientWidth && s.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight }));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A chart inside may carry the data, x and how it places them.
  const kids = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<Record<string, unknown>>[];
  const chartChild = kids.find((k) => typeof k.type !== 'string' && (k.type as ChartChild).chartInfo);
  const childProps = chartChild?.props ?? {};
  const info: ChartInfo = chartChild ? (chartChild.type as ChartChild).chartInfo!(childProps, config) : {};
  const data = (dataProp ?? (childProps.data as ChartDatum[] | undefined) ?? []) as ChartDatum[];
  const xKey = xProp ?? (childProps.x as string | undefined) ?? '';
  const zero = zeroProp ?? info.zero ?? true;

  const configKey = Object.entries(config).map(([k, c]) => `${k}:${c.label}:${c.color ?? ''}`).join('|');
  const series: ChartSeries[] = React.useMemo(() => {
    const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
    return Object.keys(config).map((key, i) => {
      const c = config[key];
      const slot = c.color ?? (i < 6 ? (`data-${i + 1}` as ChartSlot) : 'data-other');
      return { key, label: c.label, slot, color: `var(--${slot})`, format: c.format ?? ((v: number) => nf.format(v)) };
    });
  }, [configKey, locale]); // eslint-disable-line react-hooks/exhaustive-deps

  const sample = data.find((d) => d[xKey] != null)?.[xKey];
  const kind = xScaleProp ?? info.xScale ?? (isTimeLike(sample) ? 'time' : typeof sample === 'number' ? 'linear' : 'band');
  const fmtY = yFormat ?? series[0]?.format ?? ((v: number) => new Intl.NumberFormat(locale).format(v));
  const W = size?.w ?? 0, H = size?.h ?? 0;
  const bottom = axes ? 26 : 1;
  const right = kind === 'band' || !axes ? 2 : 18;

  // The target frame: where the plot is going, independent of its width.
  let lo = Infinity, hi = -Infinity;
  if (info.yExtent) [lo, hi] = info.yExtent;
  else for (const d of data) for (const s of series) { const v = d[s.key]; if (typeof v === 'number' && isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
  if (!isFinite(lo)) { lo = 0; hi = 1; }
  if (zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
  const yCount = Math.max(3, Math.min(6, Math.round((H - TOP - bottom) / 56)));
  const ny = linearScale(yDomain ?? [lo, hi], [1, 0], yCount, !yDomain);
  const rowKey = (d: ChartDatum) => String(kind === 'time' ? toTime(d[xKey]) : d[xKey]);
  const cats = kind === 'band' ? [...new Set(data.map((d) => String(d[xKey])))] : [];
  const unit = kind === 'band' ? bandScale(cats, [0, 1], bandPadding) : null;
  const target: Frame = {
    kind, series,
    rows: data.map((d) => ({ key: rowKey(d), d })),
    y: ny.domain,
    ticks: ny.ticks.map((v) => ({ v, a: 1 })),
    band: unit ? new Map(cats.map((c) => [c, [unit(c), unit.bandwidth]])) : null,
    rowAlpha: new Map(), seriesAlpha: new Map(series.map((s) => [s.key, 1])),
    left: axes ? Math.ceil(Math.max(...ny.ticks.map((t) => textWidth(fmtY(t))), 0)) + 10 : 0,
  };
  const changeKey = React.useMemo(() => ({}), [data, configKey, xKey, kind, zero, yDomain?.[0], yDomain?.[1], info.yExtent?.[0], info.yExtent?.[1], bandPadding]); // eslint-disable-line react-hooks/exhaustive-deps
  const { layers, stage } = useChartMotion(target, changeKey, plotRef);

  const nfX = React.useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const fullDate = React.useMemo(() => new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }), [locale]);
  const formatX = xFormat ?? (kind === 'time' ? (v: unknown) => fullDate.format(new Date(toTime(v))) : kind === 'linear' ? (v: unknown) => nfX.format(Number(v)) : (v: unknown) => String(v));

  /** A layer's scales, ticks and context, at the plot's size now. */
  const draw = (frame: Frame) => {
    const left = Math.round(frame.left);
    const pw = Math.max(0, W - left - right), ph = Math.max(0, H - TOP - bottom);
    const [d0, d1] = frame.y;
    const y = Object.assign((v: number) => ph - ((v - d0) / (d1 - d0 || 1)) * ph, { kind: 'linear' as const, domain: frame.y, range: [ph, 0] as [number, number], ticks: frame.ticks.map((t) => t.v) }) as LinearScale;
    let x: ChartXScale;
    let xTicks: Array<{ at: number; label: string; a: number }> = [];
    if (frame.kind === 'band') {
      const band = frame.band!;
      const domain = frame.rows.map((r) => String(r.d[xKey]));
      const bw = (band.get(domain[0])?.[1] ?? 0) * pw;
      x = Object.assign((v: string) => (band.get(String(v))?.[0] ?? 0) * pw, { kind: 'band' as const, domain, range: [0, pw] as [number, number], ticks: domain, bandwidth: bw, step: bw / (1 - bandPadding) }) as BandScale;
      if (axes) {
        const widest = Math.max(...domain.map((d) => textWidth(String(xFormat ? xFormat(d) : d))), 1);
        const every = Math.max(1, Math.ceil((widest + 12) / Math.max(1, (x as BandScale).step)));
        xTicks = domain.map((d, i) => ({ at: (x as BandScale)(d) + bw / 2, label: xFormat ? xFormat(d) : d, a: frame.rowAlpha.get(frame.rows[i].key) ?? 1 })).filter((_, i) => i % every === 0);
      }
    } else if (frame.kind === 'time') {
      const ts = frame.rows.map((r) => toTime(r.d[xKey])).filter((t) => isFinite(t));
      const t = timeScale([Math.min(...ts), Math.max(...ts)], [0, pw], Math.max(2, Math.floor(pw / 56)));
      x = t.scale;
      const opts: Intl.DateTimeFormatOptions = t.interval.months && t.interval.months >= 12 ? { year: 'numeric' }
        : t.interval.months ? { month: 'short', year: '2-digit' } : { month: 'short', day: 'numeric' };
      const df = new Intl.DateTimeFormat(locale, { ...opts, timeZone: 'UTC' });
      if (axes) xTicks = t.scale.ticks.map((v) => ({ at: t.scale(v), label: xFormat ? xFormat(v) : df.format(new Date(v)), a: 1 }));
    } else {
      const vs = frame.rows.map((r) => Number(r.d[xKey])).filter((v) => isFinite(v));
      x = linearScale([Math.min(...vs), Math.max(...vs)], [0, pw], Math.max(2, Math.floor(pw / 56)), false);
      if (axes) xTicks = (x as LinearScale).ticks.map((v) => ({ at: (x as LinearScale)(v), label: formatX(v), a: 1 }));
    }
    const xOf = (d: ChartDatum) => (x.kind === 'band' ? x(String(d[xKey])) + x.bandwidth / 2 : (x as LinearScale | TimeScale)(d[xKey] as number));
    const ground = d0 <= 0 && d1 >= 0 ? y(0) : ph;
    const rowAlpha = (d: ChartDatum) => frame.rowAlpha.get(rowKey(d)) ?? 1;
    const ctx: ChartContextValue = {
      width: pw, height: ph, x, y, xOf, ground, data: frame.rows.map((r) => r.d), xKey, config, series: frame.series,
      alpha: (d, key) => (d ? rowAlpha(d) : 1) * (key ? frame.seriesAlpha.get(key) ?? 1 : 1),
      format: (key, v) => (frame.series.find((s) => s.key === key)?.format ?? fmtY)(v),
      formatX,
    };
    return { ctx, left, pw, ph, xTicks };
  };

  const generated = describe(info.kind ?? 'Chart', series, data, xKey, formatX, kind);
  const titleId = title ? `${id}-t` : undefined, descId = description ? `${id}-d` : undefined, sumId = `${id}-s`;
  const labelledBy = (rest['aria-labelledby'] as string | undefined) ?? titleId;
  const vars: Record<string, string> = {};
  for (const s of series) vars[`--color-${cssKey(s.key)}`] = s.color;
  if (aspect == null && height == null) aspect = 2;

  const svgKids = kids.filter((k) => typeof k.type === 'string' || !(k.type as ChartChild).chartHtml);
  const htmlKids = kids.filter((k) => typeof k.type !== 'string' && (k.type as ChartChild).chartHtml);
  const top = draw(layers[layers.length - 1].frame);

  return (
    <ChartContext.Provider value={top.ctx}>
      <figure className={cx('alt-chart', className)} style={{ ...vars, ...style }} aria-labelledby={labelledBy}
        aria-describedby={[descId, sumId].filter(Boolean).join(' ')} {...rest}>
        {(title || description) && (
          <div className="alt-chart-head">
            {title && <div id={titleId} className="alt-chart-title">{title}</div>}
            {description && <p id={descId} className="alt-chart-desc">{description}</p>}
          </div>
        )}
        <div ref={plotRef} className="alt-chart-plot" role="group" aria-roledescription="chart" aria-labelledby={labelledBy} aria-describedby={sumId}
          data-stage={stage} style={height != null ? { height } : { aspectRatio: String(aspect) }}>
          {W > 0 && (
            <svg className="alt-chart-svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
              {layers.map(({ frame, opacity }, i) => {
                const { ctx, left, pw, ph, xTicks } = i === layers.length - 1 ? top : draw(frame);
                return (
                  <g key={i} transform={`translate(${left},${TOP})`} opacity={opacity < 1 ? opacity : undefined}>
                    <g className="alt-chart-grid">
                      {frame.ticks.map((t) => {
                        const at = Math.round(ctx.y(t.v)) + 0.5;
                        return at >= 0 && at <= ph + 1 ? <line key={t.v} x1={0} x2={pw} y1={at} y2={at} opacity={t.a < 1 ? t.a : undefined} /> : null;
                      })}
                    </g>
                    <g className="alt-chart-marks"><ChartContext.Provider value={ctx}>{svgKids}</ChartContext.Provider></g>
                    <line className="alt-chart-ground" x1={0} x2={pw} y1={Math.round(ctx.ground) + 0.5} y2={Math.round(ctx.ground) + 0.5} />
                    {axes && (
                      <>
                        <g className="alt-chart-axis" data-axis="y">
                          {frame.ticks.map((t) => {
                            const at = ctx.y(t.v);
                            return at >= -1 && at <= ph + 1 ? <text key={t.v} x={-10} y={at} dy="0.32em" textAnchor="end" opacity={t.a < 1 ? t.a : undefined}>{fmtY(t.v)}</text> : null;
                          })}
                        </g>
                        <g className="alt-chart-axis" data-axis="x">
                          {xTicks.map((t, j) => (
                            <text key={j} x={t.at} y={ph + 18} opacity={t.a < 1 ? t.a : undefined}
                              textAnchor={frame.kind === 'band' ? 'middle' : j === 0 && t.at < 24 ? 'start' : 'middle'}>{t.label}</text>
                          ))}
                        </g>
                      </>
                    )}
                  </g>
                );
              })}
            </svg>
          )}
        </div>
        {htmlKids}
        <figcaption id={sumId} className={summary ? 'alt-chart-summary' : 'alt-sr'}>{summary ?? generated}</figcaption>
      </figure>
    </ChartContext.Provider>
  );
}

/** The generated summary: what kind of chart, which series, the x range, and each series' lowest and highest values. */
function describe(kind: string, series: ChartSeries[], data: ChartDatum[], xKey: string, formatX: (v: unknown) => string, scale: string) {
  if (!data.length || !series.length) return `${kind} with no data.`;
  const names = series.map((s) => s.label);
  const list = names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0];
  const first = formatX(data[0][xKey]), last = formatX(data[data.length - 1][xKey]);
  const span = scale === 'band' ? `${data.length} ${data.length === 1 ? 'category' : 'categories'}, ${first} to ${last}` : `${first} to ${last}`;
  const parts = series.map((s) => {
    let lo: ChartDatum | null = null, hi: ChartDatum | null = null;
    for (const d of data) {
      const v = d[s.key];
      if (typeof v !== 'number' || !isFinite(v)) continue;
      if (!lo || v < (lo[s.key] as number)) lo = d;
      if (!hi || v > (hi[s.key] as number)) hi = d;
    }
    if (!lo || !hi) return `${s.label} has no values.`;
    return `${s.label} is lowest at ${formatX(lo[xKey])} (${s.format(lo[s.key] as number)}) and highest at ${formatX(hi[xKey])} (${s.format(hi[s.key] as number)}).`;
  });
  return `${kind} of ${list}, ${span}. ${parts.join(' ')}`;
}
