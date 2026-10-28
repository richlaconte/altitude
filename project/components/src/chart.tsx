import * as React from 'react';
import { cx, useIsoLayoutEffect, usePresence } from './core';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './controls';
import { DataTable } from './collections';
import { EmptyState } from './empty';
import { Arrive, Await, isPromise, readPromised, useArrival, useHasWaited, useReportWaiting } from './suspense';
import { markTipClosed, tipIsWarm } from './overlays';

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
type Interval = { months?: number; days?: number; hours?: number };
const HOUR = 36e5;
const INTERVALS: Interval[] = [{ hours: 1 }, { hours: 3 }, { hours: 6 }, { hours: 12 }, { days: 1 }, { days: 2 }, { days: 7 }, { days: 14 }, { months: 1 }, { months: 3 }, { months: 6 }, { months: 12 }, { months: 24 }, { months: 60 }, { months: 120 }];

function timeTicks(d0: number, d1: number, max: number): { ticks: number[]; interval: Interval } {
  for (const iv of INTERVALS) {
    const ticks: number[] = [];
    if (iv.hours) {
      const step = iv.hours * HOUR;
      for (let t = Math.ceil(d0 / step) * step; t <= d1; t += step) ticks.push(t);
    } else if (iv.days) {
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

/** A label cut with an ellipsis to fit max px. The full text stays in the summary, the readout and the table. */
function fit(s: string, max: number) {
  if (textWidth(s) <= max) return s;
  let lo = 0, hi = s.length;
  while (lo < hi) { const m = Math.ceil((lo + hi) / 2); if (textWidth(s.slice(0, m).trimEnd() + '…') <= max) lo = m; else hi = m - 1; }
  return s.slice(0, lo).trimEnd() + '…';
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
  /**
   * Categories run down the side and values along the bottom. `x` still places categories and `y` values; only their
   * directions change: x(cat) is a distance from the top, y(v) from the left, and `ground` is y(0) across.
   */
  horizontal: boolean;
  /** The series the keyboard is on, or null: chart types draw the others receded. */
  emphasis: string | null;
  /** The record the readout is on (pointed at, touched, or focused from the keyboard), or null. */
  active: ChartDatum | null;
  /** Put the readout on a record by its index in `data`, or take it away with null: for keyboard paths. */
  setActive: (index: number | null) => void;
  /**
   * How to draw a series so it's told apart without colour: its fill (a hatch when patterns are on), stroke, dash and
   * marker, fixed by its slot like its colour. Use these instead of `series.color` and every mode is handled.
   */
  encode: (seriesKey: string) => ChartEncoding;
  /** Patterns are on: the `patterns` prop, forced colours or print. */
  patterns: boolean;
  /** Label series directly at their marks, not only in a legend: on under forced colours and in print. */
  directLabels: boolean;
  /** Line width (2, or 3 under contrast="more"), and the gap between adjacent marks (2, or 3). */
  strokeWidth: number;
  gap: number;
}

export type ChartMarkerShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'ring' | 'cross';
export interface ChartEncoding {
  slot: ChartSlot;
  /** For bars and areas: the series colour, a hatch of it, or CanvasText under forced colours. */
  fill: string;
  /** For lines and outlines. */
  stroke: string;
  /** For a line: undefined is solid. Set only while patterns are on, except slot 1, which is always solid. */
  dash?: string;
  marker: ChartMarkerShape;
  /** A 1px edge for a filled mark: ink under contrast="more", CanvasText under forced colours, otherwise none. */
  edge?: string;
}

/** Each slot's redundant encoding, fixed like its colour (#72). */
const ENCODINGS: Record<ChartSlot, { dash?: string; marker: ChartMarkerShape; hatch?: 'rise' | 'fall' | 'dots' | 'rows' | 'cross' }> = {
  'data-1': { marker: 'circle' },
  'data-2': { dash: '6 3', marker: 'square', hatch: 'rise' },
  'data-3': { dash: '2 2', marker: 'triangle', hatch: 'fall' },
  'data-4': { dash: '8 3 2 3', marker: 'diamond', hatch: 'dots' },
  'data-5': { dash: '12 4', marker: 'ring', hatch: 'rows' },
  'data-6': { dash: '4 2 1 2', marker: 'cross', hatch: 'cross' },
  'data-other': { dash: '1 3', marker: 'circle', hatch: 'dots' },
};

/** A series' marker, centred on (x, y): the shape its slot gives it, so points are told apart without colour. */
export function ChartMarker({ shape, x, y, size = 8, color, ...rest }: { shape: ChartMarkerShape; x: number; y: number; size?: number; color: string } & React.SVGProps<SVGElement>) {
  const r = size / 2;
  const p = rest as React.SVGProps<SVGPathElement>;
  switch (shape) {
    case 'square': return <rect x={x - r * 0.9} y={y - r * 0.9} width={r * 1.8} height={r * 1.8} fill={color} {...(rest as React.SVGProps<SVGRectElement>)} />;
    case 'triangle': return <path d={`M${x},${y - r * 1.1}L${x + r * 1.05},${y + r * 0.75}L${x - r * 1.05},${y + r * 0.75}Z`} fill={color} {...p} />;
    case 'diamond': return <path d={`M${x},${y - r * 1.2}L${x + r * 1.2},${y}L${x},${y + r * 1.2}L${x - r * 1.2},${y}Z`} fill={color} {...p} />;
    case 'ring': return <circle cx={x} cy={y} r={r * 0.8} fill="none" stroke={color} strokeWidth={r * 0.45} {...(rest as React.SVGProps<SVGCircleElement>)} />;
    case 'cross': return <path d={`M${x - r},${y - r}L${x + r},${y + r}M${x + r},${y - r}L${x - r},${y + r}`} fill="none" stroke={color} strokeWidth={r * 0.5} strokeLinecap="round" {...p} />;
    default: return <circle cx={x} cy={y} r={r} fill={color} {...(rest as React.SVGProps<SVGCircleElement>)} />;
  }
}

/** One hatch tile, in the pattern's own colour: lines or dots over the series colour (or over Canvas, forced). */
function Hatch({ id, kind, bg, fg }: { id: string; kind: NonNullable<(typeof ENCODINGS)[ChartSlot]['hatch']>; bg: string; fg: string }) {
  const rot = kind === 'rise' || kind === 'cross' ? 45 : kind === 'fall' ? -45 : 0;
  return (
    <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform={rot ? `rotate(${rot})` : undefined}>
      <rect width="6" height="6" fill={bg} />
      {kind === 'dots' ? <circle cx="3" cy="3" r="1.3" fill={fg} />
        : kind === 'rows' ? <line x1="0" y1="3" x2="6" y2="3" stroke={fg} strokeWidth="1.6" />
        : <line x1="3" y1="0" x2="3" y2="6" stroke={fg} strokeWidth="1.6" />}
      {kind === 'cross' && <line x1="0" y1="3" x2="6" y2="3" stroke={fg} strokeWidth="1.6" />}
    </pattern>
  );
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
export interface ChartInfo {
  kind?: string; xScale?: 'band' | 'time' | 'linear'; zero?: boolean; yExtent?: [number, number];
  /** Categories down the side and values along the bottom (band x only). */
  layout?: 'vertical' | 'horizontal';
  /** The records as the chart wants them placed (sorted, say). Return the same array for the same input, or every render is a change. */
  data?: ChartDatum[];
  /** Formats the value axis only, when the axis isn't in the series' units (shares of a stack). */
  yFormat?: (value: number) => string;
  /** Formats every value (axis, readout, names, summary) of a series that has no format of its own. */
  format?: (value: number) => string;
  /** Extra room at the plot's right edge, in px: for labels a chart sets beside its marks (a line's end label). */
  right?: number;
  /** How the legend draws this chart's series: a block (bars, areas) or a short line (lines). */
  swatch?: 'rect' | 'line';
  /** The imprint's shape while data loads. Default: a line for line swatches, bars otherwise. */
  imprint?: 'bars' | 'line' | 'area';
  /** Series are drawn bottom to top (a stack of areas): ↑ moves to the series above, ↓ to the one below. */
  seriesUp?: boolean;
  /** A stacked point names its share of the total ("31% of 3.9K") rather than only the total. */
  share?: boolean;
}
type ChartChild = {
  chartInfo?: (props: Record<string, unknown>, config: ChartConfig) => ChartInfo; chartHtml?: boolean; chartTooltip?: boolean; chartLegend?: boolean;
  /** Where the mark for one record and series sits, in plot coordinates, for the keyboard's focus ring. Default: (xOf, y(value)). */
  chartPoint?: (props: Record<string, unknown>, ctx: ChartContextValue, d: ChartDatum, key: string) => [number, number];
};

/* ───────────────────────── readout ───────────────────────── */

export interface ChartTooltipItem {
  key: string;
  label: string;
  value: number;
  /** The value as its series formats it. */
  text: string;
  color: string;
  dash?: string;
}
export interface ChartTooltipContentProps {
  /** How each row is keyed: a short stroke of the series colour (default), a dot, or a dashed stroke. */
  indicator?: 'line' | 'dot' | 'dashed';
  /** Formats the readout's heading, the x value. Default: the container's. */
  labelFormat?: (x: unknown) => React.ReactNode;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  /** Filled in by the container: the x being read, and one item per shown series with a value there. */
  label?: unknown;
  payload?: ChartTooltipItem[];
  /** Filled in by the container: formats x. */
  formatX?: (x: unknown) => string;
}
/**
 * The readout's rows: value first (ink, tabular), series name second (ink-muted), keyed by a short stroke of the
 * series colour, which takes the series' dash when patterns are on. Labels are text, never HTML.
 */
export function ChartTooltipContent({ indicator = 'line', labelFormat, hideLabel, hideIndicator, label, payload = [], formatX }: ChartTooltipContentProps) {
  return (
    <>
      {!hideLabel && <div className="alt-chart-readout-label">{labelFormat ? labelFormat(label) : formatX ? formatX(label) : String(label)}</div>}
      {payload.map((p) => (
        <div key={p.key} className="alt-chart-readout-row">
          {!hideIndicator && (
            <svg className="alt-chart-readout-key" width="14" height="10" aria-hidden="true">
              {indicator === 'dot' ? <circle cx="7" cy="5" r="4" fill={p.color} />
                : <line x1="1" y1="5" x2="13" y2="5" stroke={p.color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={indicator === 'dashed' ? '3 2' : p.dash} />}
            </svg>
          )}
          <span className="alt-chart-readout-value">{p.text}</span>
          <span className="alt-chart-readout-name">{p.label}</span>
        </div>
      ))}
    </>
  );
}
/**
 * Puts your own content in a chart's readout. The readout is on for every chart by default; this only changes what it
 * shows. Place it inside the chart type or the container: `<ChartTooltip content={<ChartTooltipContent indicator="dot" />} />`.
 */
export function ChartTooltip(_: { content?: React.ReactElement<ChartTooltipContentProps> }) { return null; }
ChartTooltip.chartHtml = true;
ChartTooltip.chartTooltip = true;

/* ───────────────────────── legend ───────────────────────── */

export interface ChartLegendItem { key: string; label: string; fill: string; stroke: string; dash?: string; hidden: boolean; }
export interface ChartLegendContentProps {
  /** Let people hide and show series. Each key becomes a switch-like button in a toolbar. Default false: keys only name. */
  toggle?: boolean;
  /** The hidden series' keys, controlled. */
  hidden?: string[];
  /** The hidden series' keys to start with, uncontrolled. */
  defaultHidden?: string[];
  onHiddenChange?: (hidden: string[]) => void;
  /** The toolbar's name. Default "Series". */
  label?: string;
  /** Filled in by the container. */
  items?: ChartLegendItem[];
  swatch?: 'rect' | 'line';
  onToggle?: (key: string) => void;
}

function Swatch({ item, swatch }: { item: ChartLegendItem; swatch: 'rect' | 'line' }) {
  return (
    <svg className="alt-legend-mark" width="14" height="10" aria-hidden="true">
      {swatch === 'line'
        ? <line x1="1" y1="5" x2="13" y2="5" stroke={item.stroke} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={item.dash} />
        : <rect width="100%" height="100%" rx="2" fill={item.fill} />}
    </svg>
  );
}

/**
 * The legend's keys. Without `toggle` they're labels, flush on the ground: a swatch in the series colour and its name
 * in ink. With `toggle` each key is a choice, so it's built like a Checkbox: a trench the series colour pours into
 * while the series is shown, inside a ghost button that lifts when pointed at. The keys form one toolbar (one Tab
 * stop; ←/→ between keys), each an aria-pressed button; the last shown series can't be hidden.
 */
export function ChartLegendContent({ toggle = false, label = 'Series', items = [], swatch = 'rect', onToggle }: ChartLegendContentProps) {
  const id = React.useId();
  const [focus, setFocus] = React.useState(0);
  const [said, setSaid] = React.useState('');
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const shown = items.filter((i) => !i.hidden).length;
  if (!toggle) {
    return (
      <div className="alt-chart-legend" role="list" aria-label={label}>
        {items.map((i) => <span key={i.key} role="listitem" className="alt-legend-key"><Swatch item={i} swatch={swatch} /><span>{i.label}</span></span>)}
      </div>
    );
  }
  const move = (to: number) => { const n = (to + items.length) % items.length; setFocus(n); refs.current[n]?.focus(); };
  return (
    <div className="alt-chart-legend" role="toolbar" aria-label={label} data-toggle=""
      onKeyDown={(e) => {
        const map: Record<string, number> = { ArrowRight: focus + 1, ArrowDown: focus + 1, ArrowLeft: focus - 1, ArrowUp: focus - 1, Home: 0, End: items.length - 1 };
        if (e.key in map) { e.preventDefault(); move(map[e.key]); }
      }}>
      {items.map((i, n) => {
        const last = !i.hidden && shown === 1;
        return (
          <button key={i.key} ref={(el) => { refs.current[n] = el; }} type="button" className="alt-legend-key" tabIndex={n === focus ? 0 : -1}
            aria-pressed={!i.hidden} aria-disabled={last || undefined} aria-describedby={last ? `${id}-last` : undefined}
            onFocus={() => setFocus(n)}
            onClick={() => {
              if (last) return;
              onToggle?.(i.key);
              const nowShown = i.hidden ? shown + 1 : shown - 1;
              setSaid(`${i.label} ${i.hidden ? 'shown' : 'hidden'}. ${nowShown} of ${items.length} series shown.`);
            }}>
            {/* A switch's swatch is always a block: the series fill pours into the whole trench, as a Checkbox's accent does. */}
            <span className="alt-legend-swatch" data-shown={i.hidden ? undefined : ''}><Swatch item={i} swatch="rect" /></span>
            <span>{i.label}</span>
          </button>
        );
      })}
      <span id={`${id}-last`} hidden>At least one series stays shown.</span>
      <span className="alt-sr" aria-live="polite">{said}</span>
    </div>
  );
}
/** A legend for the chart: place it inside the chart type or the container, with its content. */
export function ChartLegend(_: { content?: React.ReactElement<ChartLegendContentProps> }) { return null; }
ChartLegend.chartHtml = true;
ChartLegend.chartLegend = true;

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
  /**
   * The records. Optional when the chart inside takes `data` itself. `undefined` or a promise: the chart's imprint
   * until they land. `null` or `[]`: an EmptyState. A rejected promise goes to your error boundary.
   */
  data?: ChartDatum[] | null | PromiseLike<ChartDatum[] | null>;
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
  /** The crosshair and readout. Default true; a chart type's `tooltip={false}` turns it off too. */
  tooltip?: boolean;
  /**
   * Adds a Chart | Table control: the same data as a sortable table, in the chart's own box. true starts on the chart,
   * 'table' on the table.
   */
  views?: boolean | 'chart' | 'table';
  /** The view shown, controlled. */
  view?: 'chart' | 'table';
  onViewChange?: (view: 'chart' | 'table') => void;
  /** The table's first column header. Default: the x key, capitalised. */
  xLabel?: string;
  /**
   * Tell series apart by pattern as well as colour: a hatch per slot on fills, a dash on lines, a marker on points.
   * Always on under forced colours and in print; turn it on anywhere else for readers who want it.
   */
  patterns?: boolean;
  /**
   * Fresh data is on its way while this data stays shown: after dur-grace the marks drop to half strength and the
   * plot says "Updating". A new promise passed while data shows does the same by itself.
   */
  refreshing?: boolean;
  /** What the plot says when the data is null or empty: an EmptyState at widget size. Default title "No data to show". */
  empty?: ChartEmpty;
}
export interface ChartEmpty { title?: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; }

/** True between beforeprint and afterprint, for browsers whose print media query lags the dialog. */
let printing = false;

const isTimeLike = (v: unknown) => v instanceof Date || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) || (typeof v === 'number' && v > 3e11);
const cssKey = (k: string) => k.replace(/[^\w-]/g, '-');
const TOP = 8;

/**
 * The frame every chart shares: a figure that sizes the plot, turns data into positions, draws the axes, the
 * gridlines and the ground line, gives each series its label, format and colour slot, and names and summarises the
 * chart. It's the record drawn as a shape, so all of it lies flush on whatever it sits on: no level, no shadow. When
 * the data changes, its marks move by the shared transition engine (useChartMotion).
 */
function ChartFrame({ config, data: dataProp, x: xProp, xScale: xScaleProp, aspect, height, title, description, summary,
  zero: zeroProp, yDomain, yFormat, xFormat, bandPadding = 0.2, axes = true, locale, patterns: patternsProp = false, tooltip: tooltipProp = true, views, view: viewProp, onViewChange, xLabel, refreshing, empty, className, style, children, ...rest }: ChartContainerProps) {
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

  // The legend, and which series it has hidden. Hidden series keep their slots; the chart is drawn without them.
  const findPart = <P,>(flag: 'chartTooltip' | 'chartLegend', list: React.ReactNode) =>
    (React.Children.toArray(list).filter(React.isValidElement) as React.ReactElement<Record<string, unknown>>[])
      .find((k) => typeof k.type !== 'string' && (k.type as ChartChild)[flag]) as React.ReactElement<P> | undefined;
  const legendEl = findPart<{ content?: React.ReactElement<ChartLegendContentProps> }>('chartLegend', children) ?? findPart('chartLegend', childProps.children as React.ReactNode);
  const legendOpts = legendEl?.props.content?.props ?? {};
  const [hiddenOwn, setHiddenOwn] = React.useState<string[]>(legendOpts.defaultHidden ?? []);
  const hidden = legendOpts.hidden ?? hiddenOwn;
  const setHidden = (next: string[]) => { legendOpts.onHiddenChange?.(next); if (legendOpts.hidden === undefined) setHiddenOwn(next); };
  const shownConfig = hidden.length ? Object.fromEntries(Object.entries(config).filter(([k]) => !hidden.includes(k))) : config;
  const info: ChartInfo = chartChild ? (chartChild.type as ChartChild).chartInfo!(childProps, shownConfig) : {};
  const data = (info.data ?? dataProp ?? (childProps.data as ChartDatum[] | undefined) ?? []) as ChartDatum[];
  const xKey = xProp ?? (childProps.x as string | undefined) ?? '';
  // A chart type that needs zero (bars) gets it whatever the prop says: a bar that starts above zero misstates its length.
  const zero = info.zero === true ? true : zeroProp ?? info.zero ?? true;

  const configKey = Object.entries(config).map(([k, c]) => `${k}:${c.label}:${c.color ?? ''}`).join('|');
  const allSeries: ChartSeries[] = React.useMemo(() => {
    const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
    return Object.keys(config).map((key, i) => {
      const c = config[key];
      const slot = c.color ?? (i < 6 ? (`data-${i + 1}` as ChartSlot) : 'data-other');
      return { key, label: c.label, slot, color: `var(--${slot})`, format: c.format ?? info.format ?? ((v: number) => nf.format(v)) };
    });
  }, [configKey, locale, info.format]); // eslint-disable-line react-hooks/exhaustive-deps
  const hiddenKey = hidden.join('|');
  const series = React.useMemo(() => allSeries.filter((s) => !hidden.includes(s.key)), [allSeries, hiddenKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const sample = data.find((d) => d[xKey] != null)?.[xKey];
  const kind = xScaleProp ?? info.xScale ?? (isTimeLike(sample) ? 'time' : typeof sample === 'number' ? 'linear' : 'band');
  const fmtY = yFormat ?? info.yFormat ?? series[0]?.format ?? ((v: number) => new Intl.NumberFormat(locale).format(v));
  const W = size?.w ?? 0, H = size?.h ?? 0;
  const horizontal = info.layout === 'horizontal' && kind === 'band';
  const bottom = axes ? 26 : 1;
  const right = (info.right ?? 0) + (horizontal ? (axes ? 20 : 2) : kind === 'band' || !axes ? 2 : 18);

  // The target frame: where the plot is going, independent of its width.
  let lo = Infinity, hi = -Infinity;
  if (info.yExtent) [lo, hi] = info.yExtent;
  else for (const d of data) for (const s of series) { const v = d[s.key]; if (typeof v === 'number' && isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
  if (!isFinite(lo)) { lo = 0; hi = 1; }
  if (zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
  // All zero is real data: give it 0–1, so the ground line is the floor, not the middle of an invented range.
  if (lo === 0 && hi === 0) hi = 1;
  // Horizontal: categories take at most 40% of the width (longer names are cut with an ellipsis), values the rest.
  const catWidth = horizontal && axes ? Math.min(Math.ceil(Math.max(0, ...[...new Set(data.map((d) => String(d[xKey])))].map((c) => textWidth(xFormat ? xFormat(c) : c)))) + 12, Math.round(W * 0.4)) : 0;
  const yCount = horizontal ? Math.max(2, Math.min(6, Math.round((W - catWidth - right) / 90))) : Math.max(3, Math.min(6, Math.round((H - TOP - bottom) / 56)));
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
    left: !axes ? 0 : horizontal ? catWidth
      : Math.ceil(Math.max(...ny.ticks.map((t) => textWidth(fmtY(t))), 0)) + 10,
  };
  const changeKey = React.useMemo(() => ({}), [data, configKey, xKey, kind, zero, yDomain?.[0], yDomain?.[1], info.yExtent?.[0], info.yExtent?.[1], bandPadding, horizontal, hiddenKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const { layers, stage } = useChartMotion(target, changeKey, plotRef);

  // The readout: on by default, off when the container or the chart type says tooltip={false}.
  type TipProps = { content?: React.ReactElement<ChartTooltipContentProps> };
  const tipEl = findPart<TipProps>('chartTooltip', children) ?? findPart<TipProps>('chartTooltip', childProps.children as React.ReactNode);
  const tooltipOn = tooltipProp && childProps.tooltip !== false;
  const [activeIdx, setActiveIdx] = React.useState<number | null>(null);
  const sticky = React.useRef(false);
  const [warmTip, setWarmTip] = React.useState(false);
  const show = (i: number | null) => setActiveIdx((prev) => {
    if (prev === null && i !== null) setWarmTip(tipIsWarm());
    if (prev !== null && i === null) markTipClosed();
    return i;
  });

  // Forced colours, print and contrast="more" change how marks are drawn, not just their colours.
  const [env, setEnv] = React.useState({ forced: false, print: false, more: false });
  const readEnv = React.useRef(() => {});
  readEnv.current = () => {
    const mq = (q: string) => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches;
    const next = { forced: mq('(forced-colors: active)'), print: mq('print') || printing, more: mq('(prefers-contrast: more)') || !!plotRef.current?.closest('[data-contrast="more"]') };
    setEnv((e) => (e.forced === next.forced && e.print === next.print && e.more === next.more ? e : next));
  };
  useIsoLayoutEffect(() => readEnv.current());
  React.useEffect(() => {
    const on = () => readEnv.current();
    const lists = ['(forced-colors: active)', 'print', '(prefers-contrast: more)'].map((q) => window.matchMedia?.(q)).filter(Boolean) as MediaQueryList[];
    lists.forEach((l) => l.addEventListener?.('change', on));
    const before = () => { printing = true; on(); }, after = () => { printing = false; on(); };
    window.addEventListener('beforeprint', before); window.addEventListener('afterprint', after);
    return () => { lists.forEach((l) => l.removeEventListener?.('change', on)); window.removeEventListener('beforeprint', before); window.removeEventListener('afterprint', after); };
  }, []);
  const patterns = patternsProp || env.forced || env.print;
  const pid = id.replace(/[^\w-]/g, '');
  const encode = (key: string): ChartEncoding => {
    const s = allSeries.find((x) => x.key === key);
    const slot = s?.slot ?? 'data-other';
    const e = ENCODINGS[slot];
    const color = env.forced ? 'CanvasText' : s?.color ?? 'var(--data-other)';
    return {
      slot, stroke: color, marker: e.marker,
      fill: patterns && e.hatch ? `url(#${pid}-${slot})` : color,
      dash: patterns ? e.dash : undefined,
      edge: env.forced ? 'CanvasText' : env.more ? 'var(--ink)' : undefined,
    };
  };

  const nfX = React.useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const fullDate = React.useMemo(() => new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }), [locale]);
  const dateTime = React.useMemo(() => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }), [locale]);
  // Within a few days, a time's x is read to the minute; otherwise to the day.
  const ts = kind === 'time' ? data.map((d) => toTime(d[xKey])).filter((t) => isFinite(t)) : [];
  const intraday = ts.length > 1 && Math.max(...ts) - Math.min(...ts) < 3 * DAY;
  // Categories that are dates (a bar per week) read as dates, not as ISO strings.
  const datedBands = kind === 'band' && isTimeLike(sample);
  const shortDate = React.useMemo(() => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }), [locale]);
  const bandLabel = (v: unknown) => (xFormat ? xFormat(v) : datedBands ? shortDate.format(new Date(toTime(v))) : String(v));
  const formatX = xFormat ?? (datedBands ? (v: unknown) => fullDate.format(new Date(toTime(v))) : kind === 'time' ? (v: unknown) => (intraday ? dateTime : fullDate).format(new Date(toTime(v))) : kind === 'linear' ? (v: unknown) => nfX.format(Number(v)) : (v: unknown) => String(v));

  // The keyboard path (#63): the plot is one Tab stop holding three levels, summary → series → points. Enter goes
  // deeper and Escape comes back, as in Tree and Drilldown; a roving tabindex keeps one node in the tab order.
  type Nav = { level: 'summary' | 'series' | 'points'; s: number; p: number };
  const [nav, setNav] = React.useState<Nav>({ level: 'summary', s: 0, p: 0 });
  const [navFocused, setNavFocused] = React.useState(false);
  const navRefs = React.useRef(new Map<string, HTMLElement>());
  const wantFocus = React.useRef<string | null>(null);
  const navS = Math.min(nav.s, Math.max(0, series.length - 1)), navP = Math.min(nav.p, Math.max(0, data.length - 1));
  const emphasis = navFocused && nav.level !== 'summary' && series.length > 1 ? series[navS]?.key ?? null : null;

  /** A layer's scales, ticks and context, at the plot's size now. */
  const draw = (frame: Frame) => {
    const left = Math.round(frame.left);
    const pw = Math.max(0, W - left - right), ph = Math.max(0, H - TOP - bottom);
    const [d0, d1] = frame.y;
    // Along the value axis: up the plot, or across it when horizontal.
    const span = horizontal ? pw : ph;
    const y = Object.assign((v: number) => (horizontal ? 0 : ph) + (horizontal ? 1 : -1) * ((v - d0) / (d1 - d0 || 1)) * span,
      { kind: 'linear' as const, domain: frame.y, range: (horizontal ? [0, pw] : [ph, 0]) as [number, number], ticks: frame.ticks.map((t) => t.v) }) as LinearScale;
    let x: ChartXScale;
    let xTicks: Array<{ at: number; label: string; a: number }> = [];
    if (frame.kind === 'band') {
      const band = frame.band!;
      const domain = frame.rows.map((r) => String(r.d[xKey]));
      const along = horizontal ? ph : pw;
      const bw = (band.get(domain[0])?.[1] ?? 0) * along;
      x = Object.assign((v: string) => (band.get(String(v))?.[0] ?? 0) * along, { kind: 'band' as const, domain, range: [0, along] as [number, number], ticks: domain, bandwidth: bw, step: bw / (1 - bandPadding) }) as BandScale;
      if (axes && horizontal) {
        xTicks = domain.map((d, i) => ({ at: (x as BandScale)(d) + bw / 2, label: fit(bandLabel(d), left - 12), a: frame.rowAlpha.get(frame.rows[i].key) ?? 1 }));
      } else if (axes) {
        // Show every k-th label, k as small as lets each shown label clear its shown neighbours by 4px.
        const ws = domain.map((d) => textWidth(bandLabel(d)));
        const step = Math.max(1, (x as BandScale).step);
        let every = 1;
        while (every < domain.length && ws.some((w, i) => i % every === 0 && i + every < ws.length && (w + ws[i + every]) / 2 + 4 > every * step)) every++;
        xTicks = domain.map((d, i) => ({ at: (x as BandScale)(d) + bw / 2, label: bandLabel(d), a: frame.rowAlpha.get(frame.rows[i].key) ?? 1 })).filter((_, i) => i % every === 0);
      }
    } else if (frame.kind === 'time') {
      const ts = frame.rows.map((r) => toTime(r.d[xKey])).filter((t) => isFinite(t));
      // The finest interval whose labels clear each other by 8px at this width.
      const label = (iv: Interval) => {
        const opts: Intl.DateTimeFormatOptions = iv.months && iv.months >= 12 ? { year: 'numeric' }
          : iv.months ? { month: 'short', year: '2-digit' } : iv.hours ? { hour: 'numeric' } : { month: 'short', day: 'numeric' };
        const df = new Intl.DateTimeFormat(locale, { ...opts, timeZone: 'UTC' });
        return (v: number) => (xFormat ? xFormat(v) : df.format(new Date(v)));
      };
      let t = timeScale([Math.min(...ts), Math.max(...ts)], [0, pw], Math.max(2, Math.floor(pw / 40)));
      for (let max = Math.max(2, Math.floor(pw / 40)); max >= 2; max--) {
        t = timeScale([Math.min(...ts), Math.max(...ts)], [0, pw], max);
        const f = label(t.interval);
        const at = t.scale.ticks.map((v) => t.scale(v)), ws = t.scale.ticks.map((v) => textWidth(f(v)));
        // The first label is set from its start when it sits at the edge, so it only needs to clear the next one.
        const fits = at.every((p, i) => i === 0 || p - at[i - 1] >= (i === 1 && at[0] < 24 ? ws[0] : ws[i - 1] / 2) + ws[i] / 2 + 8);
        if (fits) break;
      }
      x = t.scale;
      const f = label(t.interval);
      if (axes) xTicks = t.scale.ticks.map((v) => ({ at: t.scale(v), label: f(v), a: 1 }));
    } else {
      const vs = frame.rows.map((r) => Number(r.d[xKey])).filter((v) => isFinite(v));
      x = linearScale([Math.min(...vs), Math.max(...vs)], [0, pw], Math.max(2, Math.floor(pw / 56)), false);
      if (axes) xTicks = (x as LinearScale).ticks.map((v) => ({ at: (x as LinearScale)(v), label: formatX(v), a: 1 }));
    }
    const xOf = (d: ChartDatum) => (x.kind === 'band' ? x(String(d[xKey])) + x.bandwidth / 2 : (x as LinearScale | TimeScale)(d[xKey] as number));
    const ground = d0 <= 0 && d1 >= 0 ? y(0) : horizontal ? 0 : ph;
    const rowAlpha = (d: ChartDatum) => frame.rowAlpha.get(rowKey(d)) ?? 1;
    const ctx: ChartContextValue = {
      width: pw, height: ph, x, y, xOf, ground, data: frame.rows.map((r) => r.d), xKey, config, series: frame.series,
      alpha: (d, key) => (d ? rowAlpha(d) : 1) * (key ? frame.seriesAlpha.get(key) ?? 1 : 1),
      format: (key, v) => (frame.series.find((s) => s.key === key)?.format ?? fmtY)(v),
      formatX, horizontal, encode, patterns, directLabels: env.forced || env.print,
      emphasis,
      active: activeIdx !== null ? frame.rows[activeIdx]?.d ?? null : null,
      setActive: (i) => show(i),
      strokeWidth: env.more ? 3 : 2, gap: env.more ? 3 : 2,
    };
    return { ctx, left, pw, ph, xTicks };
  };

  const generated = describe(info.kind ?? 'Chart', series, data, xKey, formatX, kind);
  const titleId = title ? `${id}-t` : undefined, descId = description ? `${id}-d` : undefined, sumId = `${id}-s`;
  const labelledBy = (rest['aria-labelledby'] as string | undefined) ?? titleId;
  const vars: Record<string, string> = {};
  for (const s of series) vars[`--color-${cssKey(s.key)}`] = s.color;
  if (aspect == null && height == null) aspect = 2;

  // The table view (#64): the same records as a DataTable, x first, a column per series, a Total for stacks.
  const viewsOn = views !== undefined && views !== false;
  const [viewOwn, setViewOwn] = React.useState<'chart' | 'table'>(views === 'table' ? 'table' : 'chart');
  const view = viewProp ?? viewOwn;
  const setView = (v: string) => { const next = v === 'table' ? 'table' : 'chart'; onViewChange?.(next); if (viewProp === undefined) setViewOwn(next); };
  const table = viewsOn ? (() => {
    const total = /stacked/i.test(info.kind ?? '');
    const isNum = (v: unknown): v is number => typeof v === 'number' && isFinite(v);
    const sum = (d: ChartDatum) => allSeries.reduce((t, s) => t + (isNum(d[s.key]) ? (d[s.key] as number) : 0), 0);
    const columns = [
      { key: '__x', header: xLabel ?? (xKey.charAt(0).toUpperCase() + xKey.slice(1)), cell: (d: ChartDatum) => formatX(d[xKey]),
        sortValue: (d: ChartDatum) => (kind === 'band' ? (datedBands ? toTime(d[xKey]) : String(d[xKey])) : kind === 'time' ? toTime(d[xKey]) : Number(d[xKey])) },
      ...allSeries.map((s) => ({ key: s.key, header: s.label, align: 'end' as const,
        cell: (d: ChartDatum) => (isNum(d[s.key]) ? s.format(d[s.key] as number) : '—'), sortValue: (d: ChartDatum) => (isNum(d[s.key]) ? (d[s.key] as number) : -Infinity) })),
      ...(total ? [{ key: '__total', header: 'Total', align: 'end' as const, cell: (d: ChartDatum) => allSeries[0].format(sum(d)), sortValue: sum }] : []),
    ];
    return <DataTable columns={columns} rows={data} getRowId={rowKey} aria-label={typeof title === 'string' ? `${title}, data` : 'Chart data'} />;
  })() : null;

  const svgKids = kids.filter((k) => typeof k.type === 'string' || !(k.type as ChartChild).chartHtml);
  const htmlKids = kids.filter((k) => typeof k.type !== 'string' && (k.type as ChartChild).chartHtml);
  const top = draw(layers[layers.length - 1].frame);

  /** With views on: the head beside a Chart | Table control, and the two views stacked in one box, cross-fading. */
  const wrapViews = (plot: React.ReactElement) => !viewsOn ? plot : (
    <Tabs variant="segmented" value={view} onValueChange={setView} className="alt-chart-tabs">
      <div className="alt-chart-bar">
        <div className="alt-chart-head">
          {title && <div id={titleId} className="alt-chart-title">{title}</div>}
          {description && <p id={descId} className="alt-chart-desc">{description}</p>}
        </div>
        <TabsList aria-label="View">
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>
      </div>
      <div className="alt-chart-views">
        <TabsContent value="chart" forceMount tabIndex={-1} className="alt-chart-view">{plot}</TabsContent>
        <TabsContent value="table" forceMount tabIndex={-1} className="alt-chart-view" data-view="table"><div className="alt-chart-tablebox">{table}</div></TabsContent>
      </div>
    </Tabs>
  );

  // Which record a point on the plot is nearest along x (down the side, when horizontal).
  const nearest = (clientX: number, clientY: number) => {
    const r = plotRef.current?.getBoundingClientRect();
    if (!r || !top.ctx.data.length) return null;
    const along = horizontal ? clientY - r.top - TOP : clientX - r.left - top.left;
    let best = -1, bd = Infinity;
    top.ctx.data.forEach((d, i) => { const dd = Math.abs(top.ctx.xOf(d) - along); if (dd < bd) { bd = dd; best = i; } });
    return best < 0 ? null : best;
  };
  const hold = React.useRef<{ timer: number; x: number; y: number; id: number } | null>(null);
  const onPointerMove = (e: React.PointerEvent) => {
    if (!tooltipOn) return;
    if (e.pointerType !== 'touch') { show(nearest(e.clientX, e.clientY)); return; }
    const h = hold.current;
    if (h && !sticky.current && Math.hypot(e.clientX - h.x, e.clientY - h.y) > 8) { window.clearTimeout(h.timer); hold.current = null; }
    if (sticky.current && h) show(nearest(e.clientX, e.clientY));
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (!tooltipOn || e.pointerType !== 'touch') return;
    const el = e.currentTarget as HTMLElement, id = e.pointerId, x = e.clientX, y = e.clientY;
    hold.current = { x, y, id, timer: window.setTimeout(() => {
      // Press and hold shows the readout; dragging then scrubs along x; lifting leaves it until a tap elsewhere.
      sticky.current = true;
      try { el.setPointerCapture(id); } catch { /* the pointer may be gone */ }
      show(nearest(x, y));
    }, 250) };
  };
  const onPointerUp = () => { if (hold.current) { window.clearTimeout(hold.current.timer); if (!sticky.current) hold.current = null; } };
  const onPointerLeave = (e: React.PointerEvent) => { if (e.pointerType !== 'touch' && !sticky.current) show(null); };
  React.useEffect(() => {
    if (activeIdx === null || !sticky.current) return;
    const away = (e: PointerEvent) => { if (!plotRef.current?.contains(e.target as Node)) { sticky.current = false; hold.current = null; show(null); } };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [activeIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // The readout keeps its last record while it leaves, so its exit shows what it said.
  const lastActive = React.useRef<ChartDatum | null>(null);
  if (top.ctx.active) lastActive.current = top.ctx.active;
  const { mounted: tipMounted, state: tipState } = usePresence(tooltipOn && activeIdx !== null && !!top.ctx.active, 160);
  const single = series.length <= 1;
  const navKey = (n: Nav) => (n.level === 'summary' ? 'sum' : n.level === 'series' ? `s${n.s}` : `p${n.s}-${n.p}`);
  useIsoLayoutEffect(() => { if (wantFocus.current) { navRefs.current.get(wantFocus.current)?.focus(); wantFocus.current = null; } });
  const go = (n: Nav) => { setNav(n); wantFocus.current = navKey(n); show(n.level === 'points' ? n.p : null); };
  const num = (v: unknown): v is number => typeof v === 'number' && isFinite(v);
  const stacked = /stacked/i.test(info.kind ?? '');
  const summaryText = typeof summary === 'string' ? summary : generated;
  const seriesName = (si: number) => {
    const s = series[si];
    const vals = data.filter((d) => num(d[s.key]));
    if (!vals.length) return `${s.label}, no values.`;
    const vs = vals.map((d) => d[s.key] as number);
    const lo = Math.min(...vs), hi = Math.max(...vs);
    let tail = '';
    if (kind !== 'band') {
      const rel = vs[0] !== 0 ? (vs[vs.length - 1] - vs[0]) / Math.abs(vs[0]) : vs[vs.length - 1] - vs[0];
      tail = Math.abs(rel) < 0.02 ? ', flat' : rel > 0 ? ', rising' : ', falling';
    } else tail = `, highest at ${formatX(vals[vs.indexOf(hi)][xKey])}`;
    return `${s.label}, ${vals.length} ${vals.length === 1 ? 'point' : 'points'}, ${s.format(lo)} to ${s.format(hi)}${tail}.`;
  };
  const pointName = (si: number, pi: number) => {
    const s = series[si], d = data[pi];
    if (!s || !d) return '';
    const v = d[s.key];
    let out = `${formatX(d[xKey])}, ${s.label}, ${num(v) ? s.format(v) : 'no data'}.`;
    if (num(v) && kind !== 'band' && pi > 0) {
      const prev = data[pi - 1], pv = prev[s.key];
      if (num(pv)) {
        const diff = v - pv;
        out += diff === 0 ? ` Same as ${formatX(prev[xKey])}.` : pv !== 0
          ? ` ${diff > 0 ? 'Up' : 'Down'} ${Math.round(Math.abs(diff / pv) * 100)}% from ${formatX(prev[xKey])}.`
          : ` ${diff > 0 ? 'Up' : 'Down'} ${s.format(Math.abs(diff))} from ${formatX(prev[xKey])}.`;
      }
    }
    if (stacked) {
      const sum = series.reduce((t, x) => t + (num(d[x.key]) ? (d[x.key] as number) : 0), 0);
      out += info.share && num(v) && sum > 0 ? ` ${Math.round((v / sum) * 100)}% of ${s.format(sum)}.` : ` Total ${s.format(sum)}.`;
    }
    return `${out} ${pi + 1} of ${data.length}.`;
  };
  const onNavKey = (e: React.KeyboardEvent) => {
    const n = series.length, m = data.length, page = Math.max(1, Math.round(m * 0.1));
    const at: Nav = { level: nav.level, s: navS, p: navP };
    let next: Nav | null = null;
    if (at.level === 'summary') {
      if (e.key === 'Enter' || e.key === ' ') next = single ? { level: 'points', s: 0, p: 0 } : { level: 'series', s: 0, p: 0 };
    } else if (at.level === 'series') {
      const step: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (e.key in step) next = { ...at, s: (at.s + step[e.key] + n) % n };
      else if (e.key === 'Home') next = { ...at, s: 0 };
      else if (e.key === 'End') next = { ...at, s: n - 1 };
      else if (e.key === 'Enter' || e.key === ' ') next = { level: 'points', s: at.s, p: 0 };
      else if (e.key === 'Escape') next = { ...at, level: 'summary' };
    } else {
      const moveP: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, PageDown: page, PageUp: -page };
      if (e.key in moveP) next = { ...at, p: Math.max(0, Math.min(m - 1, at.p + moveP[e.key])) };
      else if (e.key === 'Home') next = { ...at, p: 0 };
      else if (e.key === 'End') next = { ...at, p: m - 1 };
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') next = { ...at, s: (at.s + ((e.key === 'ArrowDown') !== !!info.seriesUp ? 1 : -1) + n) % n };
      else if (e.key === 'Escape') next = single ? { ...at, level: 'summary' } : { ...at, level: 'series' };
    }
    if (next) { e.preventDefault(); e.stopPropagation(); go(next); }
  };
  const ChartPointFn = (chartChild?.type as ChartChild | undefined)?.chartPoint;
  const nodes = (() => {
    if (!W || !data.length || !series.length) return null;
    const pw = top.pw, ph = top.ph;
    const plotBox: React.CSSProperties = { left: top.left, top: TOP, width: pw, height: ph };
    const common = (key: string, current: boolean) => ({
      key, tabIndex: current ? 0 : -1, ref: (el: HTMLElement | null) => { if (el) navRefs.current.set(key, el); else navRefs.current.delete(key); },
      onKeyDown: onNavKey, role: 'button' as const,
    });
    if (nav.level === 'summary') {
      return <div {...common('sum', true)} className="alt-chart-node" data-level="summary" aria-roledescription="chart" style={plotBox}
        aria-label={`${summaryText} Press Enter to explore ${single ? 'the data' : 'the series'}.`} />;
    }
    if (nav.level === 'series') {
      return series.map((s, i) => <div {...common(`s${i}`, i === navS)} className="alt-chart-node" data-level="series" aria-roledescription="series" style={plotBox}
        aria-label={`${seriesName(i)} ${i + 1} of ${series.length}.`} />);
    }
    const s = series[navS];
    return data.map((d, i) => {
      const shown = top.ctx.data[i] ?? d;
      const v = shown[s.key];
      const [px, py] = ChartPointFn ? ChartPointFn(childProps, top.ctx, shown, s.key) : [top.ctx.xOf(shown), num(v) ? top.ctx.y(v) : top.ctx.ground];
      const at = horizontal && !ChartPointFn ? [num(v) ? top.ctx.y(v) : top.ctx.ground, top.ctx.xOf(shown)] : [px, py];
      return <div {...common(`p${navS}-${i}`, i === navP)} className="alt-chart-node" data-level="point" aria-roledescription="data point"
        style={{ left: top.left + at[0] - 7, top: TOP + at[1] - 7, width: 14, height: 14 }} aria-label={pointName(navS, i)} />;
    });
  })();

  const readout = (() => {
    const d = top.ctx.active ?? lastActive.current;
    if (!tipMounted || !d) return null;
    const payload: ChartTooltipItem[] = top.ctx.series
      .filter((s) => typeof d[s.key] === 'number' && isFinite(d[s.key] as number) && top.ctx.alpha(null, s.key) > 0.5)
      .map((s) => { const e = encode(s.key); return { key: s.key, label: s.label, value: d[s.key] as number, text: top.ctx.format(s.key, d[s.key] as number), color: e.stroke, dash: e.dash }; });
    const at = top.ctx.xOf(d);
    const style: React.CSSProperties = {};
    let side: string;
    if (horizontal) { side = at > (H - TOP - bottom) / 2 ? 'above' : 'below'; style.right = 4; style.top = TOP + at; }
    else { side = top.left + at > W / 2 ? 'left' : 'right'; style.left = top.left + at; style.top = TOP; }
    const content = tipEl?.props.content ?? <ChartTooltipContent />;
    return (
      <div className="alt-chart-readout" aria-hidden="true" data-state={tipState} data-side={side} data-warm={warmTip ? '' : undefined} style={style}>
        {React.cloneElement(content, { label: d[xKey], payload, formatX })}
      </div>
    );
  })();

  return (
    <ChartContext.Provider value={top.ctx}>
      <figure className={cx('alt-chart', className)} style={{ ...vars, ...style }} aria-labelledby={labelledBy}
        aria-describedby={[descId, sumId].filter(Boolean).join(' ')} {...rest}>
        {!viewsOn && (title || description) && (
          <div className="alt-chart-head">
            {title && <div id={titleId} className="alt-chart-title">{title}</div>}
            {description && <p id={descId} className="alt-chart-desc">{description}</p>}
          </div>
        )}
        {wrapViews(<div ref={plotRef} className="alt-chart-plot" role="group" aria-roledescription="chart" aria-labelledby={labelledBy} aria-describedby={sumId}
          data-stage={stage} data-patterns={patterns ? '' : undefined} data-refreshing={refreshing ? '' : undefined} aria-busy={refreshing || undefined} style={height != null ? { height } : { aspectRatio: String(aspect) }}
          onPointerMove={onPointerMove} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onPointerLeave={onPointerLeave}>
          {refreshing && <span className="alt-sr">Updating</span>}
          {/* Nothing to show is an opening, not an empty plot: an EmptyState in the plot's own box, with no axes. */}
          {!data.length && (
            <div className="alt-chart-empty">
              {(() => {
                const e = empty ?? (childProps.empty as ChartEmpty | undefined);
                return <EmptyState size="sm" title={e?.title ?? 'No data to show'} description={e?.description} action={e?.action} />;
              })()}
            </div>
          )}
          {W > 0 && data.length > 0 && (
            <svg className="alt-chart-svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
              {patterns && (
                <defs>
                  {[...new Set(allSeries.map((s) => s.slot))].map((slot) => {
                    const hatch = ENCODINGS[slot].hatch;
                    return hatch ? <Hatch key={slot} id={`${pid}-${slot}`} kind={hatch} bg={env.forced ? 'Canvas' : `var(--${slot})`} fg={env.forced ? 'CanvasText' : 'var(--surface-raised)'} /> : null;
                  })}
                </defs>
              )}
              {layers.map(({ frame, opacity }, i) => {
                const { ctx, left, pw, ph, xTicks } = i === layers.length - 1 ? top : draw(frame);
                return (
                  <g key={i} transform={`translate(${left},${TOP})`} opacity={opacity < 1 ? opacity : undefined}>
                    <g className="alt-chart-grid">
                      {frame.ticks.map((t) => {
                        const at = Math.round(ctx.y(t.v)) + 0.5, end = horizontal ? pw : ph;
                        if (at < 0 || at > end + 1) return null;
                        return horizontal ? <line key={t.v} x1={at} x2={at} y1={0} y2={ph} opacity={t.a < 1 ? t.a : undefined} />
                          : <line key={t.v} x1={0} x2={pw} y1={at} y2={at} opacity={t.a < 1 ? t.a : undefined} />;
                      })}
                    </g>
                    {i === layers.length - 1 && tooltipOn && ctx.active && (() => {
                      const at = Math.round(ctx.xOf(ctx.active)) + 0.5;
                      return horizontal ? <line className="alt-chart-crosshair" x1={0} x2={pw} y1={at} y2={at} /> : <line className="alt-chart-crosshair" x1={at} x2={at} y1={0} y2={ph} />;
                    })()}
                    <g className="alt-chart-marks"><ChartContext.Provider value={ctx}>{svgKids}</ChartContext.Provider></g>
                    {/* The ground line is zero. When zero isn't on the axis, the plot's foot is an ordinary gridline, not ground. */}
                    {horizontal
                      ? <line className={frame.y[0] <= 0 && frame.y[1] >= 0 ? 'alt-chart-ground' : 'alt-chart-floor'} x1={Math.round(ctx.ground) + 0.5} x2={Math.round(ctx.ground) + 0.5} y1={0} y2={ph} />
                      : <line className={frame.y[0] <= 0 && frame.y[1] >= 0 ? 'alt-chart-ground' : 'alt-chart-floor'} x1={0} x2={pw} y1={Math.round(ctx.ground) + 0.5} y2={Math.round(ctx.ground) + 0.5} />}
                    {axes && horizontal && (
                      <>
                        <g className="alt-chart-axis" data-axis="y">
                          {frame.ticks.map((t) => {
                            const at = ctx.y(t.v);
                            return at >= -1 && at <= pw + 1 ? <text key={t.v} x={at} y={ph + 18} textAnchor="middle" opacity={t.a < 1 ? t.a : undefined}>{fmtY(t.v)}</text> : null;
                          })}
                        </g>
                        <g className="alt-chart-axis" data-axis="x">
                          {xTicks.map((t, j) => <text key={j} x={-12} y={t.at} dy="0.32em" textAnchor="end" opacity={t.a < 1 ? t.a : undefined}>{t.label}</text>)}
                        </g>
                      </>
                    )}
                    {axes && !horizontal && (
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
          <div className="alt-chart-nav" onFocus={() => setNavFocused(true)}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { setNavFocused(false); if (nav.level === 'points') show(null); } }}>
            {nodes}
          </div>
          {readout}
        </div>)}
        {legendEl && React.cloneElement(legendEl.props.content ?? <ChartLegendContent />, {
          items: allSeries.map((s) => { const e = encode(s.key); return { key: s.key, label: s.label, fill: e.fill, stroke: e.stroke, dash: e.dash, hidden: hidden.includes(s.key) }; }),
          swatch: info.swatch ?? 'rect',
          onToggle: (key: string) => setHidden(hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key]),
        })}
        {htmlKids.filter((k) => !(k.type as ChartChild).chartLegend)}
        <figcaption id={sumId} className={summary ? 'alt-chart-summary' : 'alt-sr'}>{summary ?? generated}</figcaption>
      </figure>
    </ChartContext.Provider>
  );
}

/* ───────────────────────── loading ───────────────────────── */

const settledValues = new WeakMap<object, { v?: unknown; e?: unknown; failed?: boolean }>();
/** A promise's value once it has landed, remembered so a refetch can be read without suspending. */
function settledValue(p: PromiseLike<unknown>) { return settledValues.get(p as object); }

/**
 * The frame every chart shares (see ChartFrame), and what it shows while its data is on its way. `undefined` or a
 * pending promise: an imprint in the chart's shape, pressed into the page, with the title, description and legend
 * already in place. It lands by fading in place: a chart's marks never rise out of their imprint, because rising
 * would lift bars off the ground line and misstate every value. `null` or `[]`: an EmptyState in the plot. A new
 * promise (or `refreshing`) while data shows: the old chart stays, at half strength after dur-grace. A rejected
 * promise goes to your error boundary.
 */
export function ChartContainer(props: ChartContainerProps) {
  const kids = React.Children.toArray(props.children).filter(React.isValidElement) as React.ReactElement<Record<string, unknown>>[];
  const chartChild = kids.find((k) => typeof k.type !== 'string' && (k.type as ChartChild).chartInfo);
  const fromChild = !('data' in props) && !!chartChild && 'data' in chartChild.props;
  const raw = (fromChild ? chartChild!.props.data : props.data) as ChartDatum[] | null | undefined | PromiseLike<ChartDatum[] | null>;
  const hasData = 'data' in props || fromChild;
  const [, bump] = React.useState(0);
  const last = React.useRef<ChartDatum[] | null>(null);
  const pending = isPromise(raw) && !settledValue(raw);
  React.useEffect(() => {
    if (!isPromise(raw) || settledValue(raw)) return;
    let live = true;
    raw.then((v) => { settledValues.set(raw as object, { v }); if (live) bump((n) => n + 1); },
      (e) => { settledValues.set(raw as object, { e, failed: true }); if (live) bump((n) => n + 1); });
    return () => { live = false; };
  }, [raw]);
  // A rejected promise goes to your error boundary, as Await's does, even while older data is shown.
  const outcome = isPromise(raw) ? settledValue(raw) : undefined;
  if (outcome?.failed) throw outcome.e;
  const now = isPromise(raw) ? (outcome?.v as ChartDatum[] | null | undefined) : raw;
  const missing = hasData && raw === undefined;
  // A new promise while data shows is a refetch: keep the old chart rather than imprinting over it.
  const refetch = pending && last.current !== null;
  const waiting = missing || (pending && !refetch);
  if (!waiting && !pending && now !== undefined) last.current = now ?? [];
  useReportWaiting(waiting);
  const arrival = useArrival(waiting);
  const isLegend = (k: React.ReactNode) => React.isValidElement(k) && typeof k.type !== 'string' && !!(k.type as ChartChild).chartLegend;
  const hasLegend = React.Children.toArray(props.children).some(isLegend) || (!!chartChild && React.Children.toArray(chartChild.props.children as React.ReactNode).some(isLegend));
  const withData = (d: ChartDatum[] | null | undefined) => {
    const rows = d ?? [];
    // The chart type is the first child carrying chartInfo; it gets the landed rows (toArray re-keys, so match by type).
    let replaced = false;
    const children = fromChild
      ? React.Children.map(props.children, (k) => {
        if (replaced || !React.isValidElement(k) || typeof k.type === 'string' || !(k.type as ChartChild).chartInfo) return k;
        replaced = true;
        return React.cloneElement(k as React.ReactElement<Record<string, unknown>>, { data: rows });
      })
      : props.children;
    return <ChartFrame {...props} {...(fromChild ? {} : { data: rows })} refreshing={props.refreshing || refetch}>{children}</ChartFrame>;
  };
  if (!useHasWaited(waiting)) return withData(refetch ? last.current : now);
  return (
    <Await shape="none" className="alt-chart-await" imprint={(() => {
      const ci = chartChild ? (chartChild.type as ChartChild).chartInfo!({ ...chartChild.props, data: [] }, props.config) : undefined;
      return <ChartImprint {...props} legend={hasLegend} swatch={ci?.swatch} shape={ci?.imprint ?? (ci?.swatch === 'line' ? 'line' : 'bars')} />;
    })()}>
      <Arrive when={arrival}><ChartLanded raw={raw} render={withData} refetch={refetch} last={last.current} /></Arrive>
    </Await>
  );
}
function ChartLanded({ raw, render, refetch, last }: { raw: unknown; render: (d: ChartDatum[] | null | undefined) => React.ReactElement; refetch: boolean; last: ChartDatum[] | null }) {
  if (refetch) return render(last);
  if (isPromise(raw)) {
    const v = readPromised(raw as PromiseLike<ChartDatum[] | null>);
    settledValues.set(raw as object, { v });
    return render(v);
  }
  return render(raw as ChartDatum[] | null | undefined);
}

const IMPRINT_BARS = [0.55, 0.8, 0.62, 0.9, 0.7, 0.48, 0.75];
/**
 * The chart's imprint: the frame (title, description, legend keys from config) with the plot pressed into the page in
 * the chart's shape, `surface-well` with no labels, so it can't be taken for data.
 */
function ChartImprint({ config, title, description, aspect, height, shape = 'bars', legend }: ChartContainerProps & { swatch?: 'rect' | 'line'; shape?: 'bars' | 'line' | 'area'; legend?: boolean }) {
  if (aspect == null && height == null) aspect = 2;
  return (
    <figure className="alt-chart" aria-label={typeof title === 'string' ? title : undefined}>
      {(title || description) && (
        <div className="alt-chart-head">
          {title && <div className="alt-chart-title">{title}</div>}
          {description && <p className="alt-chart-desc">{description}</p>}
        </div>
      )}
      <div className="alt-chart-plot alt-chart-imprint" data-shape={shape} aria-hidden="true" style={height != null ? { height } : { aspectRatio: String(aspect) }}>
        {shape === 'line'
          ? <svg className="alt-chart-svg" viewBox="0 0 100 50" preserveAspectRatio="none"><path className="alt-chart-imprint-line" d="M2,38 C18,30 26,34 38,26 S58,18 70,22 S88,10 98,12" /></svg>
          : shape === 'area'
            ? <svg className="alt-chart-svg" viewBox="0 0 100 50" preserveAspectRatio="none"><path className="alt-chart-imprint-area" d="M0,36 C16,30 26,33 38,24 S58,17 70,20 S88,9 100,11 V50 H0 Z" /></svg>
            : IMPRINT_BARS.map((h, i) => <span key={i} className="alt-skeleton" style={{ height: `${h * 100}%` }} />)}
      </div>
      {legend && (
        <div className="alt-chart-legend" aria-hidden="true">
          {Object.entries(config).map(([k, c], i) => (
            <span key={k} className="alt-legend-key"><svg className="alt-legend-mark" width="14" height="10"><rect width="14" height="10" rx="2" fill={`var(--${c.color ?? (i < 6 ? `data-${i + 1}` : 'data-other')})`} /></svg><span>{c.label}</span></span>
          ))}
        </div>
      )}
    </figure>
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
    if (scale !== 'band') {
      // Along time or a measure, say which way it went between its first and last values.
      const vals = data.filter((d) => typeof d[s.key] === 'number' && isFinite(d[s.key] as number));
      const a = vals[0], b = vals[vals.length - 1];
      const v0 = a[s.key] as number, v1 = b[s.key] as number;
      const rel = v0 !== 0 ? (v1 - v0) / Math.abs(v0) : v1 - v0;
      const trend = Math.abs(rel) < 0.02 ? 'holds flat' : rel > 0 ? 'rises' : 'falls';
      return `${s.label} ${trend} from ${s.format(v0)} at ${formatX(a[xKey])} to ${s.format(v1)} at ${formatX(b[xKey])}; lowest ${s.format(lo[s.key] as number)} at ${formatX(lo[xKey])}, highest ${s.format(hi[s.key] as number)} at ${formatX(hi[xKey])}.`;
    }
    return `${s.label} is lowest at ${formatX(lo[xKey])} (${s.format(lo[s.key] as number)}) and highest at ${formatX(hi[xKey])} (${s.format(hi[s.key] as number)}).`;
  });
  return `${kind} of ${list}, ${span}. ${parts.join(' ')}`;
}
