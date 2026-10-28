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
  data: ChartDatum[];
  xKey: string;
  config: ChartConfig;
  series: ChartSeries[];
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

/**
 * The frame every chart shares: a figure that sizes the plot, turns data into positions, draws the axes, the
 * gridlines and the ground line, gives each series its label, format and colour slot, and names and summarises the
 * chart. It's the record drawn as a shape, so all of it lies flush on whatever it sits on: no level, no shadow.
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

  const series: ChartSeries[] = React.useMemo(() => {
    const keys = Object.keys(config);
    return keys.map((key, i) => {
      const c = config[key];
      const slot = c.color ?? (i < 6 ? (`data-${i + 1}` as ChartSlot) : 'data-other');
      const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
      return { key, label: c.label, slot, color: `var(--${slot})`, format: c.format ?? ((v: number) => nf.format(v)) };
    });
  }, [config, locale]);

  const sample = data.find((d) => d[xKey] != null)?.[xKey];
  const kind = xScaleProp ?? info.xScale ?? (isTimeLike(sample) ? 'time' : typeof sample === 'number' ? 'linear' : 'band');

  // y: every series' values, with zero when asked.
  let lo = Infinity, hi = -Infinity;
  if (info.yExtent) [lo, hi] = info.yExtent;
  else for (const d of data) for (const s of series) { const v = d[s.key]; if (typeof v === 'number' && isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
  if (!isFinite(lo)) { lo = 0; hi = 1; }
  if (zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }

  const fmtY = yFormat ?? series[0]?.format ?? ((v: number) => new Intl.NumberFormat(locale).format(v));
  const W = size?.w ?? 0, H = size?.h ?? 0;
  const top = 8, bottom = axes ? 26 : 1;
  const yCount = Math.max(3, Math.min(6, Math.round((H - top - bottom) / 56)));
  const y0 = linearScale(yDomain ?? [lo, hi], [H - bottom, top], yCount, !yDomain);
  const left = axes ? Math.ceil(Math.max(...y0.ticks.map((t) => textWidth(fmtY(t))), 0)) + 10 : 0;
  const right = kind === 'band' || !axes ? 2 : 18;
  const pw = Math.max(0, W - left - right), ph = Math.max(0, H - top - bottom);
  const y = linearScale(yDomain ?? [lo, hi], [ph, 0], yCount, !yDomain);

  let x: ChartXScale;
  let interval: Interval = {};
  if (kind === 'time') {
    const ts = data.map((d) => toTime(d[xKey])).filter((t) => isFinite(t));
    const t = timeScale([Math.min(...ts), Math.max(...ts)], [0, pw], Math.max(2, Math.floor(pw / 56)));
    x = t.scale; interval = t.interval;
  } else if (kind === 'linear') {
    const vs = data.map((d) => Number(d[xKey])).filter((v) => isFinite(v));
    x = linearScale([Math.min(...vs), Math.max(...vs)], [0, pw], Math.max(2, Math.floor(pw / 56)), false);
  } else {
    x = bandScale([...new Set(data.map((d) => String(d[xKey])))], [0, pw], bandPadding);
  }

  const fmtX = React.useMemo(() => {
    if (xFormat) return xFormat;
    if (kind === 'time') {
      const opts: Intl.DateTimeFormatOptions = interval.months && interval.months >= 12 ? { year: 'numeric' }
        : interval.months ? { month: 'short', year: '2-digit' } : { month: 'short', day: 'numeric' };
      const df = new Intl.DateTimeFormat(locale, { ...opts, timeZone: 'UTC' });
      return (v: unknown) => df.format(new Date(toTime(v)));
    }
    if (kind === 'linear') { const nf = new Intl.NumberFormat(locale); return (v: unknown) => nf.format(Number(v)); }
    return (v: unknown) => String(v);
  }, [xFormat, kind, interval.months, locale]);
  const fullDate = React.useMemo(() => new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }), [locale]);
  const formatX = kind === 'time' && !xFormat ? (v: unknown) => fullDate.format(new Date(toTime(v))) : fmtX;

  const xOf = (d: ChartDatum) => (x.kind === 'band' ? x(String(d[xKey])) + x.bandwidth / 2 : (x as LinearScale | TimeScale)(d[xKey] as number));
  const ground = y.domain[0] <= 0 && y.domain[1] >= 0 ? y(0) : ph;
  const format = (key: string, v: number) => (series.find((s) => s.key === key)?.format ?? fmtY)(v);

  const ctx: ChartContextValue = { width: pw, height: ph, x, y, xOf, ground, data, xKey, config, series, format, formatX };

  // Band ticks thin out when their labels would touch.
  let xTicks: Array<{ at: number; label: string }> = [];
  if (axes && pw > 0) {
    if (x.kind === 'band') {
      const labels = x.domain.map((d) => fmtX(d));
      const widest = Math.max(...labels.map(textWidth), 1);
      const every = Math.max(1, Math.ceil((widest + 12) / x.step));
      xTicks = x.domain.map((d, i) => ({ at: x(d) + (x as BandScale).bandwidth / 2, label: labels[i] })).filter((_, i) => i % every === 0);
    } else {
      xTicks = (x.ticks as number[]).map((t) => ({ at: (x as LinearScale)(t), label: fmtX(t) }));
    }
  }

  const generated = describe(info.kind ?? 'Chart', series, data, xKey, formatX, kind);
  const titleId = title ? `${id}-t` : undefined, descId = description ? `${id}-d` : undefined, sumId = `${id}-s`;
  const labelledBy = (rest['aria-labelledby'] as string | undefined) ?? titleId;
  const vars: Record<string, string> = {};
  for (const s of series) vars[`--color-${cssKey(s.key)}`] = s.color;
  if (aspect == null && height == null) aspect = 2;

  const svgKids = kids.filter((k) => typeof k.type === 'string' || !(k.type as ChartChild).chartHtml);
  const htmlKids = kids.filter((k) => typeof k.type !== 'string' && (k.type as ChartChild).chartHtml);

  return (
    <ChartContext.Provider value={ctx}>
      <figure className={cx('alt-chart', className)} style={{ ...vars, ...style }} aria-labelledby={labelledBy}
        aria-describedby={[descId, sumId].filter(Boolean).join(' ')} {...rest}>
        {(title || description) && (
          <div className="alt-chart-head">
            {title && <div id={titleId} className="alt-chart-title">{title}</div>}
            {description && <p id={descId} className="alt-chart-desc">{description}</p>}
          </div>
        )}
        <div ref={plotRef} className="alt-chart-plot" role="group" aria-roledescription="chart" aria-labelledby={labelledBy} aria-describedby={sumId}
          style={height != null ? { height } : { aspectRatio: String(aspect) }}>
          {W > 0 && (
            <svg className="alt-chart-svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
              <g transform={`translate(${left},${top})`}>
                <g className="alt-chart-grid">
                  {y.ticks.map((t) => <line key={t} x1={0} x2={pw} y1={Math.round(y(t)) + 0.5} y2={Math.round(y(t)) + 0.5} />)}
                </g>
                <g className="alt-chart-marks">{svgKids}</g>
                <line className="alt-chart-ground" x1={0} x2={pw} y1={Math.round(ground) + 0.5} y2={Math.round(ground) + 0.5} />
                {axes && (
                  <>
                    <g className="alt-chart-axis" data-axis="y">
                      {y.ticks.map((t) => <text key={t} x={-10} y={y(t)} dy="0.32em" textAnchor="end">{fmtY(t)}</text>)}
                    </g>
                    <g className="alt-chart-axis" data-axis="x">
                      {xTicks.map((t, i) => (
                        <text key={i} x={t.at} y={ph + 18} textAnchor={x.kind === 'band' ? 'middle' : i === 0 && t.at < 24 ? 'start' : 'middle'}>{t.label}</text>
                      ))}
                    </g>
                  </>
                )}
              </g>
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
