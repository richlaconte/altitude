import * as React from 'react';
import { cssMs, cx, Icons, riseDelay, useDepth, useIsoLayoutEffect, usePresence } from './core';
import { Button, Switch, Tabs, TabsContent, TabsList, TabsTrigger } from './controls';
import { useDrilldown } from './nav';
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

/**
 * Data that isn't yet the record (#67): `partial` is a period still being counted (this month so far), `projected` a
 * value that hasn't happened (a forecast). Both are drawn hatched or dashed, never raised, and say so in words.
 */
export type ChartStatus = 'partial' | 'projected';
/** The words each status says, in point names, the readout and the table. */
export const CHART_STATUS_WORDS: Record<ChartStatus, string> = { partial: 'So far', projected: 'Projected' };

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
type Interval = { months?: number; days?: number; hours?: number; minutes?: number };
const HOUR = 36e5;
const INTERVALS: Interval[] = [{ minutes: 1 }, { minutes: 2 }, { minutes: 5 }, { minutes: 10 }, { minutes: 15 }, { minutes: 30 }, { hours: 1 }, { hours: 3 }, { hours: 6 }, { hours: 12 }, { days: 1 }, { days: 2 }, { days: 7 }, { days: 14 }, { months: 1 }, { months: 3 }, { months: 6 }, { months: 12 }, { months: 24 }, { months: 60 }, { months: 120 }];

function timeTicks(d0: number, d1: number, max: number): { ticks: number[]; interval: Interval } {
  for (const iv of INTERVALS) {
    // Skip an interval that would give far too many ticks before building them: a minute step over months is millions.
    const approx = iv.minutes ? iv.minutes * 6e4 : iv.hours ? iv.hours * HOUR : iv.days ? iv.days * DAY : iv.months! * 30.44 * DAY;
    if ((d1 - d0) / approx > max + 1) continue;
    const ticks: number[] = [];
    if (iv.hours || iv.minutes) {
      const step = iv.hours ? iv.hours * HOUR : iv.minutes! * 6e4;
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
/** Axis text is a caption in weight 400 (#193): lighter than a label on a control, so it doesn't compete with the marks. */
const AXIS_FONT = '400 13px "Instrument Sans", ui-sans-serif, system-ui, sans-serif';
let measurer: CanvasRenderingContext2D | null | undefined;
/** The width of a tick label: measured where there's a canvas, estimated otherwise (tabular figures are about 0.58em). */
const measureIn = (font: string, s: string) => {
  if (measurer === undefined) measurer = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
  if (measurer) { measurer.font = font; return measurer.measureText(s).width; }
  return s.length * 7.3;
};
export function textWidth(s: string) { return measureIn(TICK_FONT, s); }
/** The width of axis text, in its own font. */
const axisWidth = (s: string) => measureIn(AXIS_FONT, s);

/** A label cut with an ellipsis to fit max px. The full text stays in the summary, the readout and the table. */
export function fit(s: string, max: number, measure: (s: string) => number = textWidth) {
  if (measure(s) <= max) return s;
  let lo = 0, hi = s.length;
  while (lo < hi) { const m = Math.ceil((lo + hi) / 2); if (measure(s.slice(0, m).trimEnd() + '…') <= max) lo = m; else hi = m - 1; }
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
   * marker, fixed by its slot like its colour. Use these instead of `series.color` and every mode is handled. Pass the
   * record for a mark that stands for one (a bar, a dot), so a record focus can set it in data-context.
   */
  encode: (seriesKey: string, d?: ChartDatum) => ChartEncoding;
  /** Patterns are on: the `patterns` prop, forced colours or print. */
  patterns: boolean;
  /** Label series directly at their marks, not only in a legend: on under forced colours and in print. */
  directLabels: boolean;
  /** Line width (2, or 3 under contrast="more"), and the gap between adjacent marks (2, or 3). */
  strokeWidth: number;
  gap: number;
  /** Whether a record is the record yet: undefined for settled data, or 'partial' / 'projected' (#67). */
  status: (d: ChartDatum) => ChartStatus | undefined;
  /** Some record has a status: chart types draw the not-yet-record parts with `encode(key).pending`. */
  hasStatus: boolean;
  /**
   * The stretches of x that aren't yet the record, and those that are, in plot px, for clipping a line or an area: a
   * segment is pending when either of its ends is. Empty `pending` when every record is settled.
   */
  statusRanges: { record: Array<[number, number]>; pending: Array<[number, number]> };
  /** Filtered in place (#70): 'match', 'miss' or undefined (no filter). Misses recede; nothing is removed. */
  relevance: (d: ChartDatum) => 'match' | 'miss' | undefined;
  /** The chart was given a relevance: chart types wrap marks in a receding group (ChartRelevance) so changes cross-fade. */
  hasRelevance: boolean;
  /** For lines and areas: the stretch of x each record owns (to the midpoints with its neighbours), and whether it's a miss. */
  relevanceRegions: Array<{ key: string; x0: number; x1: number; miss: boolean }>;
  /** Changed since a snapshot (#191): a mark's old value where it changed (null if it didn't, or is new), or null without `since`. */
  sinceOld: ((d: ChartDatum, seriesKey: string) => number | null) | null;
}

export type ChartMarkerShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'ring' | 'cross';
export interface ChartEncoding {
  slot: ChartSlot;
  /** Outside the chart's focus (#188): drawn in data-context (GrayText under forced colours), its label in ink-muted. */
  context: boolean;
  /** For bars and areas: the series colour, a hatch of it, or CanvasText under forced colours. */
  fill: string;
  /** For lines and outlines. */
  stroke: string;
  /** For a line: undefined is solid. Set only while patterns are on, except slot 1, which is always solid. */
  dash?: string;
  marker: ChartMarkerShape;
  /** A 1px edge for a filled mark: ink under contrast="more", CanvasText under forced colours, otherwise none. */
  edge?: string;
  /**
   * For a mark that isn't yet the record: a 45° hatch of the series colour on the plot's own colour, no solid fill.
   * While patterns are on, a slot that already has a hatch keeps it, faded to `pendingOpacity`, so it stays told apart.
   */
  pending: string;
  /** The fill-opacity to draw `pending` at: 1, or less for a slot's own hatch while patterns are on. */
  pendingOpacity: number;
  /** The dash a not-yet-record line takes: the slot's own dash while patterns are on, otherwise 5 4. */
  pendingDash: string;
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

/** A clip to stretches of x (from `statusRanges`), for drawing a line or an area's record and not-yet-record parts apart. */
export function ChartStatusClip({ id, ranges, height }: { id: string; ranges: Array<[number, number]>; height: number }) {
  return <clipPath id={id}>{ranges.map(([a, b], i) => <rect key={i} x={a} y={-40} width={Math.max(0, b - a)} height={Math.ceil(height) + 80} shapeRendering="crispEdges" />)}</clipPath>;
}

/**
 * A group that recedes when what it draws doesn't match the filter (#70): 35% opacity, cross-faded over dur-travel-1,
 * never moved or recoloured. Wrap each mark (or each record's clipped stretch of a line) in one.
 */
export function ChartRelevance({ miss, children, ...rest }: { miss: boolean; children?: React.ReactNode } & React.SVGProps<SVGGElement>) {
  return <g className="alt-chart-rel" data-miss={miss ? '' : undefined} style={{ opacity: miss ? 0.35 : 1 }} {...rest}>{children}</g>;
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
  /**
   * What the chart is about (#188): series keys that keep their colours while the rest take data-context, or a test
   * for the records that keep theirs (bars, dots).
   */
  focus?: string[] | ((d: ChartDatum) => boolean);
  /**
   * Read against the record before (#189): the key holding each record's previous value, the series it's compared with
   * (null: the stack's total), and the earlier period's name. Previous values join y and glide with the data.
   */
  compare?: { key: string; series: string | null; label: string };
  /** Readings can be pinned to the plot (#190): true for two, or how many. */
  pinnable?: boolean | number;
  /** The pinned readings' x values, controlled; and when they change. */
  pins?: Array<string | number>;
  onPinsChange?: (pins: Array<string | number>) => void;
  /** Bank the plot's proportions to the data (#194): the chart type asked for aspect="banked". */
  aspect?: 'banked';
  /** Extra room at the plot's right edge, in px: for labels a chart sets beside its marks (a line's end label). */
  right?: number;
  /** How the legend draws this chart's series: a block (bars, areas) or a short line (lines). */
  swatch?: 'rect' | 'line' | 'marker';
  /** The imprint's shape while data loads. Default: a line for line swatches, bars otherwise. */
  imprint?: 'bars' | 'line' | 'area' | 'grid' | 'dots';
  /** Series are drawn bottom to top (a stack of areas): ↑ moves to the series above, ↓ to the one below. */
  seriesUp?: boolean;
  /** A stacked point names its share of the total ("31% of 3.9K") rather than only the total. */
  share?: boolean;
  /** Marks you can select (#69): the selected record's x, and what to do when a record is chosen (null clears). */
  selected?: unknown;
  onSelect?: (d: ChartDatum | null) => void;
  /** Marks you drill into (#69): the id of the current Drilldown node's child that a record opens. */
  drill?: (d: ChartDatum) => string | null | undefined;
  /** Filter in place (#70): which records match. Misses recede to 35%, keeping their place and colour. */
  relevance?: (d: ChartDatum) => 'match' | 'miss' | undefined;
  /** Fit y to the matches rather than holding the axis. The rescale is staged as any is. */
  rescale?: boolean;
  /** Which records aren't yet the record (#67). */
  status?: (d: ChartDatum) => ChartStatus | undefined;
  /** The rule where the record ends and the rest begins: its word (default "Today"), or false for none. */
  boundary?: string | false;
  /** The x domain to show (a sliding window's span), instead of the records' extent. Time and linear x only. */
  xDomain?: [number, number];
  /** An uncertainty band around one series: its low and high keys, which also count toward y's extent. */
  band?: { series?: string; low: string; high: string; label: string };
  /** A record's identity, when x alone doesn't name it (a cell, a dot): keys motion, the table, selection and live changes. */
  id?: (d: ChartDatum) => string;
  /** A record's short name, for the readout's heading, the table and "Filtered to …". Default: its x, formatted. */
  label?: (d: ChartDatum) => string;
  /** The key the chart places along x, when it isn't an `x` prop (a calendar's date). */
  x?: string;
  /**
   * The chart draws its own plot: 'grid' is cells over two categories, labelled by the chart, with no value axis,
   * gridlines, ground line or crosshair; 'xy' is dots over two measures, found in two dimensions, with no crosshair.
   * Either way the readout sits beside the mark.
   */
  plot?: 'grid' | 'xy';
  /** Room above the plot for labels the chart sets itself (a measure's name over its axis), in px. */
  top?: number;
  /** Room below the axis for labels the chart sets itself (a measure's name under its axis), in px. */
  bottom?: number;
  /** Room at the plot's left for labels the chart sets itself (a grid's row names), in px. */
  left?: number;
  /** The plot's height for its width, when the content sets it (a calendar's weeks): replaces the aspect ratio. */
  fitHeight?: (plotWidth: number) => number;
  /** The keyboard goes from the summary straight to the records, without a series level (groups, or one value). */
  flat?: boolean;
  /**
   * 'none': values change in place, and the chart type cross-fades its own marks (a heatmap's cells). 'fade': every
   * change cross-fades, for records with no stable identity to glide by.
   */
  motion?: 'none' | 'fade';
  /** Extra keys that glide with the values (a dot's x). */
  glide?: string[];
  /** The series, when they aren't the config's keys (a scatter's groups). The config then names the measures. */
  series?: Array<{ key: string; label: string; color?: ChartSlot }>;
  /** Formats x values (ticks, the readout), when the chart knows x's format (a measure in the config). */
  xFormat?: (value: unknown) => string;
  /** The table view's columns, when a column per series isn't the shape of the data. */
  columns?: ChartColumn[];
  /** The generated summary, when the chart type can say it better than a trend per series. */
  summary?: string;
}
/** A column of the table view. */
export interface ChartColumn { key: string; header: string; cell: (d: ChartDatum) => React.ReactNode; sortValue?: (d: ChartDatum) => string | number; align?: 'start' | 'end'; }
/** What a chart type puts in the readout instead of a row per series. */
export interface ChartReadout { label: string; items: ChartTooltipItem[]; indicator?: 'line' | 'dot'; }
type ChartChild = {
  chartInfo?: (props: Record<string, unknown>, config: ChartConfig) => ChartInfo; chartHtml?: boolean; chartTooltip?: boolean; chartLegend?: boolean;
  chartReference?: boolean; chartAnnotation?: boolean; chartBrush?: boolean;
  /** Where the mark for one record and series sits, in plot coordinates, for the keyboard's focus ring. Default: (xOf, y(value)). */
  chartPoint?: (props: Record<string, unknown>, ctx: ChartContextValue, d: ChartDatum, key: string) => [number, number];
  /** The outline of the mark for one record and series, as an SVG path, for a live chart's afterglow. Default: a ring at its point. */
  chartMark?: (props: Record<string, unknown>, ctx: ChartContextValue, d: ChartDatum, key: string) => string | null;
  /** The record under (px, py) in plot coordinates, by its index in ctx.data, for a chart read in two dimensions. Default: nearest along x. */
  chartNearest?: (props: Record<string, unknown>, ctx: ChartContextValue, px: number, py: number) => number | null;
  /** Where a key moves the keyboard from the record at `index` (a grid by row and column): an index, or null to leave it to the container. */
  chartMove?: (props: Record<string, unknown>, ctx: ChartContextValue, index: number, e: React.KeyboardEvent) => number | null;
  /** The box a record's mark fills, in plot coordinates (a cell), so the keyboard's focus ring takes its shape. */
  chartBox?: (props: Record<string, unknown>, ctx: ChartContextValue, d: ChartDatum) => [number, number, number, number] | null;
  /** A record's whole name for screen readers, instead of "x, series, value". */
  chartName?: (props: Record<string, unknown>, ctx: ChartContextValue, d: ChartDatum) => string;
  /** The readout for a record, instead of a row per series. */
  chartReadout?: (props: Record<string, unknown>, ctx: ChartContextValue, d: ChartDatum) => ChartReadout;
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
  /** An uncertainty band's row ("80K–95K, Range"), keyed by a block of its fill rather than a stroke. */
  range?: boolean;
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
  /** Filled in by the container: "So far" or "Projected" when the record under the readout isn't yet the record. */
  note?: string;
  /** Filled in by the container: what a click does here ("Select to filter"), when marks act. Hover is a promise. */
  action?: string;
}
/**
 * The readout's rows: value first (ink, tabular), series name second (ink-muted), keyed by a short stroke of the
 * series colour, which takes the series' dash when patterns are on. Labels are text, never HTML.
 */
export function ChartTooltipContent({ indicator = 'line', labelFormat, hideLabel, hideIndicator, label, payload = [], formatX, note, action }: ChartTooltipContentProps) {
  return (
    <>
      {!hideLabel && (
        <div className="alt-chart-readout-label">
          {labelFormat ? labelFormat(label) : formatX ? formatX(label) : String(label)}
          {note && <span className="alt-chart-readout-note">{note}</span>}
        </div>
      )}
      {payload.map((p) => (
        <div key={p.key} className="alt-chart-readout-row">
          {!hideIndicator && (
            <svg className="alt-chart-readout-key" width="14" height="10" aria-hidden="true">
              {p.range ? <rect x="1" y="1" width="12" height="8" rx="2" fill={p.color} fillOpacity="0.32" />
                : indicator === 'dot' ? <circle cx="7" cy="5" r="4" fill={p.color} />
                : <line x1="1" y1="5" x2="13" y2="5" stroke={p.color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={indicator === 'dashed' ? '3 2' : p.dash} />}
            </svg>
          )}
          <span className="alt-chart-readout-value">{p.text}</span>
          <span className="alt-chart-readout-name">{p.label}</span>
        </div>
      ))}
      {action && <div className="alt-chart-readout-action">{action}</div>}
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

export interface ChartLegendItem {
  key: string; label: string; fill: string; stroke: string; dash?: string; hidden: boolean; marker?: ChartMarkerShape;
  /** Outside the chart's focus (#188): its label recedes to ink-muted. */
  context?: boolean;
  /** In the chart's focus: said as "highlighted". */
  highlighted?: boolean;
}
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
  swatch?: 'rect' | 'line' | 'marker';
  onToggle?: (key: string) => void;
}

function Swatch({ item, swatch }: { item: ChartLegendItem; swatch: 'rect' | 'line' | 'marker' }) {
  return (
    <svg className="alt-legend-mark" width="14" height="10" aria-hidden="true">
      {swatch === 'marker' ? <ChartMarker shape={item.marker ?? 'circle'} x={7} y={5} size={8} color={item.stroke} />
        : swatch === 'line'
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
        {items.map((i) => <span key={i.key} role="listitem" className="alt-legend-key" data-context={i.context ? '' : undefined}><Swatch item={i} swatch={swatch} /><span>{i.label}</span>{i.highlighted && <span className="alt-sr">, highlighted</span>}</span>)}
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
          <button key={i.key} ref={(el) => { refs.current[n] = el; }} type="button" className="alt-legend-key" data-context={i.context ? "" : undefined} tabIndex={n === focus ? 0 : -1}
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
            <span>{i.label}</span>{i.highlighted && <span className="alt-sr">, highlighted</span>}
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

/* ───────────────────────── read against the record before ───────────────────────── */

/**
 * The record before, to read each value against (#189): a field on the same record (`key`), or records matched by x
 * position (`data`, for a shifted period on a time axis), named by `label` ("August", "Last week"). `series` is the
 * one compared, by default the first; a stack is compared by its total.
 */
export interface ChartCompare { key?: string; data?: ChartDatum[]; label: string; series?: string }
/** Where a matched earlier period's value is kept on each record. */
export const COMPARE_KEY = '__compare';
const compareCache = new WeakMap<ChartDatum[], WeakMap<ChartDatum[], Map<string, ChartDatum[]>>>();
/**
 * Each record with its earlier value under COMPARE_KEY: the sum of `keys` on the record at the same position in
 * `before`. The same arrays give the same result, so it isn't mistaken for a change.
 */
export function withCompare(rows: ChartDatum[], before: ChartDatum[], keys: string[]): ChartDatum[] {
  let a = compareCache.get(rows);
  if (!a) compareCache.set(rows, (a = new WeakMap()));
  let b = a.get(before);
  if (!b) a.set(before, (b = new Map()));
  const id = keys.join('|');
  let out = b.get(id);
  if (!out) {
    out = rows.map((d, i) => {
      const e = before[i], vs = e ? keys.map((k) => e[k]).filter((v): v is number => typeof v === 'number' && isFinite(v)) : [];
      return { ...d, [COMPARE_KEY]: vs.length ? vs.reduce((t, v) => t + v, 0) : null };
    });
    b.set(id, out);
  }
  return out;
}
/** A change in words: "+10.6%", or the difference itself when the earlier value is zero. */
export function changeWords(now: number, before: number, format: (v: number) => string) {
  const diff = now - before;
  if (before === 0) return diff === 0 ? 'no change' : `${diff > 0 ? '+' : '−'}${format(Math.abs(diff))}`;
  const pct = (diff / Math.abs(before)) * 100;
  return `${pct > 0 ? '+' : pct < 0 ? '−' : '±'}${Math.abs(pct).toFixed(Math.abs(pct) < 10 ? 1 : 0)}%`;
}

/* ───────────────────────── references and annotations ───────────────────────── */

export interface ChartReferenceProps {
  /** Where on the value axis: a value (a line), a range [low, high] (a band), or the 'mean' or 'median' of a series. */
  y: number | [number, number] | 'mean' | 'median';
  /** What it is, in words: "Target 99.9%", "Normal range", "Average". A mean or median adds its value. */
  label: string;
  /** A threshold that means good or bad: the line wears caution or critical, and its label the status icon. */
  tone?: 'caution' | 'critical';
  /** The series a mean or median is read from. Default: the first shown. */
  series?: string;
}
/**
 * Something to read the chart against: a target, a limit, a normal range, the average. A line is 1px ink-muted and
 * solid (dashes mean "projected"), labelled at its right end; a band is a flat line-coloured fill, labelled inside.
 * Place it inside the chart type or the container. The container draws it, so labels stay clear of each other and of
 * the marks.
 */
export function ChartReference(_: ChartReferenceProps) { return null; }
ChartReference.chartHtml = true;
ChartReference.chartReference = true;

export interface ChartAnnotationProps {
  /** Where on x: a date, a number or a category, as the data's x values are written. */
  x: string | number;
  /** The event, in a few words: "v2 launch". */
  label: string;
  /** Makes the plate a button, which lifts one level when pointed at. */
  onSelect?: () => void;
}
/**
 * An event on x ("the day we shipped v2"): a Badge plate flush at the top of the plot with a 1px line-control leader
 * down to its x. Plates that would overlap stack into rows, above the data. Listed after the summary for screen readers.
 */
export function ChartAnnotation(_: ChartAnnotationProps) { return null; }
ChartAnnotation.chartHtml = true;
ChartAnnotation.chartAnnotation = true;

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
  /** Keys that glide with the series' values but aren't series: an uncertainty band's low and high. */
  extra: string[];
  /** The x extent shown, for time and linear x: it glides when a live window slides. */
  xDomain: [number, number] | null;
}
type Layer = { frame: Frame; opacity: number };
/** A reference laid out in a frame: its span on the value axis (from = to for a line) and where its label sits. */
type RefGeo = { i: number; band: boolean; from: number; to: number; text: string; tone?: 'caution' | 'critical'; lx: number; ly: number; anchor: 'start' | 'end' };
/** An annotation laid out in a frame: its x, its plate's left edge and width, and the row it stacks into. */
type NoteGeo = { i: number; at: number; left: number; w: number; row: number; pin?: number };
/**
 * Cleveland's banking to 45° (#194): the width ÷ height at which a line's segments average 45° of absolute orientation,
 * found by bisection (orientation falls as the ratio grows), then held between 1 and 4 so a card is never a sliver or
 * a tower. Steep segments bank wide and gentle ones tall. Each series is read in x order over the y domain; gaps break
 * segments; flat data takes the tallest ratio, 1.
 */
function bankTo45(xs: number[], ys: Array<Array<number | null>>, yDomain: [number, number]): number {
  const order = xs.map((x, i) => i).filter((i) => isFinite(xs[i])).sort((a, b) => xs[a] - xs[b]);
  const xr = (xs[order[order.length - 1]] - xs[order[0]]) || 1, yr = (yDomain[1] - yDomain[0]) || 1;
  const segs: Array<[number, number]> = [];
  for (const s of ys) {
    for (let k = 1; k < order.length; k++) {
      const a = s[order[k - 1]], b = s[order[k]], dx = (xs[order[k]] - xs[order[k - 1]]) / xr;
      if (a == null || b == null || !(dx > 0)) continue;
      segs.push([dx, Math.abs(b - a) / yr]);
    }
  }
  if (!segs.length || segs.every(([, dy]) => dy === 0)) return 1;
  const mean = (r: number) => segs.reduce((t, [dx, dy]) => t + Math.atan(dy / (dx * r)), 0) / segs.length;
  let lo = Math.log(1 / 256), hi = Math.log(256);
  for (let n = 0; n < 50; n++) { const m = (lo + hi) / 2; if (mean(Math.exp(m)) > Math.PI / 4) lo = m; else hi = m; }
  return Math.min(4, Math.max(1, Math.exp((lo + hi) / 2)));
}
/**
 * The unit every axis label shares, as a prefix and a suffix ("$", " ms", "%"), so it can be said once. Only symbols
 * and spaced words count: a compact "K" or "M" is part of the number, not a unit.
 */
function unitOf(words: string[]): [string, string] {
  if (words.length < 2) return ['', ''];
  const pre = /^[^\p{L}\d+\-−.,\s]*/u.exec(words[0])![0], suf = /(\s\D*|%)$/.exec(words[0])?.[0] ?? '';
  const all = (f: (w: string) => boolean) => words.every(f);
  return [pre && all((w) => w.startsWith(pre)) ? pre : '', suf && all((w) => w.endsWith(suf) && w.length > suf.length) ? suf : ''];
}
/** How a chart type's marks lie on the plot, for keeping words off them: lines, filled areas, or bars. */
type MarkShape = { kind: 'line' | 'area' | 'bars'; stacked: boolean; shares: boolean };
type PlotBox = { x0: number; x1: number; y0: number; y1: number };
/**
 * How much of the marks a box on the plot covers (#184), 0 for none: the line segments it crosses, the area of bar it
 * overlaps (from the ground to the value, or to the stack's total), or 1 when it lies on an area's fill. A stack of shares
 * fills the plot, so any box over it covers.
 */
function markCover(frame: Frame, shape: MarkShape | null, xKey: string, xOf: (d: ChartDatum) => number, y: LinearScale, x: ChartXScale, ground: number): (b: PlotBox) => number {
  if (!shape) return () => 0;
  const rows = frame.rows.map((r) => r.d), keys = frame.series.filter((q) => (frame.seriesAlpha.get(q.key) ?? 1) > 0).map((q) => q.key);
  const val = (d: ChartDatum, k: string) => { const v = d[k]; return typeof v === 'number' && isFinite(v) ? v : null; };
  // Each record's top and foot on the value axis: the stack's totals, or the highest and lowest series.
  const span = (d: ChartDatum): [number, number] | null => {
    const vs = keys.map((k) => val(d, k)).filter((v): v is number => v !== null);
    if (!vs.length) return null;
    if (shape.shares) return [0, 1];
    if (shape.stacked) return [vs.reduce((t, v) => t + Math.min(0, v), 0), vs.reduce((t, v) => t + Math.max(0, v), 0)];
    return [Math.min(0, ...vs), Math.max(0, ...vs)];
  };
  // A segment crosses a box: an end inside it, or the segment cutting one of its edges (Liang–Barsky).
  const cuts = ([ax, ay]: [number, number], [bx, by]: [number, number], b: PlotBox) => {
    let t0 = 0, t1 = 1;
    const dx = bx - ax, dy = by - ay;
    for (const [p, q] of [[-dx, ax - b.x0], [dx, b.x1 - ax], [-dy, ay - b.y0], [dy, b.y1 - ay]] as Array<[number, number]>) {
      if (p === 0) { if (q < 0) return false; continue; }
      const t = q / p;
      if (p < 0) { if (t > t1) return false; t0 = Math.max(t0, t); } else { if (t < t0) return false; t1 = Math.min(t1, t); }
    }
    return true;
  };
  if (shape.kind === 'bars') {
    if (x.kind !== 'band') return () => 0;
    const rects = rows.flatMap((d) => { const s = span(d); if (!s) return []; const x0 = x(String(d[xKey])); const [a, c] = [y(s[0]), y(s[1])]; return [{ x0, x1: x0 + x.bandwidth, y0: Math.min(a, c), y1: Math.max(a, c) }]; });
    // By the area covered, so grazing a bar's top edge counts for less than lying across it.
    return (b) => rects.reduce((t, r) => t + Math.max(0, Math.min(b.x1, r.x1) - Math.max(b.x0, r.x0)) * Math.max(0, Math.min(b.y1, r.y1) - Math.max(b.y0, r.y0)), 0) / 50;
  }
  if (shape.kind === 'line' && !shape.stacked) {
    const lines = keys.map((k) => rows.flatMap((d) => { const v = val(d, k); return v === null ? [] : [[xOf(d), y(v)] as [number, number]]; }));
    return (b) => lines.reduce((t, pts) => t + (pts.length === 1 ? +cuts(pts[0], pts[0], b) : pts.filter((pt, i) => i > 0 && cuts(pts[i - 1], pt, b)).length), 0);
  }
  // An area (or a stack of lines): its top edge, and the fill from there down to the ground.
  const top = rows.flatMap((d) => { const s = span(d); return s ? [[xOf(d), y(s[1])] as [number, number]] : []; });
  const topAt = (px: number) => {
    for (let i = 1; i < top.length; i++) {
      const [ax, ay] = top[i - 1], [bx, by] = top[i];
      if (px >= Math.min(ax, bx) && px <= Math.max(ax, bx)) return ax === bx ? Math.min(ay, by) : ay + ((by - ay) * (px - ax)) / (bx - ax);
    }
    return null;
  };
  return (b) => {
    if (b.y0 >= ground) return 0;
    const n = top.filter((pt, i) => i > 0 && cuts(top[i - 1], pt, b)).length;
    if (n) return n;
    const t = topAt((b.x0 + b.x1) / 2);
    return t !== null && b.y1 > t ? 1 : 0;
  };
}
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
  const keys = [...new Set([...to.series.map((s) => s.key), ...from.series.map((s) => s.key), ...to.extra])];
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
    kind: to.kind, rows, series, ticks, band, rowAlpha, seriesAlpha, extra: to.extra,
    xDomain: to.xDomain && from.xDomain ? [lerp(from.xDomain[0], to.xDomain[0], e2), lerp(from.xDomain[1], to.xDomain[1], e2)] : to.xDomain,
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
function useChartMotion(target: Frame, changeKey: unknown, plotRef: React.RefObject<HTMLElement | null>, live = false, mode?: 'none' | 'fade') {
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
    const ms = (name: string, fallback: number) => cssMs(cs, name, fallback);
    const reduced = cs ? parseFloat(cs.getPropertyValue('--alt-travel')) === 0 : false;
    const now = performance.now();
    if (first) motion.current = { from: null, to: target, start: now, mode: 'fade', d1: 0, d2: ms('--dur-travel-1', 140) };
    // A chart that cross-fades its own marks: the frame takes the new values at once.
    else if (mode === 'none') { motion.current = null; settled.current = target; }
    else {
      const current = at(now).layers;
      const from = current[current.length - 1].frame;
      const sameX = from.kind === target.kind && (target.kind === 'band'
        || (from.rows.length === target.rows.length && from.rows.every((r, i) => r.key === target.rows[i].key)));
      // A live window that moves on: the records overlap, so x itself glides one step and the marks ride along with it.
      const toKeys = new Set(target.rows.map((r) => r.key));
      const slide = !sameX && live && from.kind === target.kind && target.kind !== 'band' && !!from.xDomain && !!target.xDomain && from.rows.some((r) => toKeys.has(r.key));
      const many = target.rows.length * target.series.length > 500;
      if (reduced || many || mode === 'fade' || !(sameX || slide)) motion.current = { from, to: target, start: now, mode: 'fade', d1: 0, d2: ms('--dur-travel-1', 140) };
      else {
        const rescale = Math.abs(from.y[0] - target.y[0]) > 1e-9 || Math.abs(from.y[1] - target.y[1]) > 1e-9;
        motion.current = { from, to: target, start: now, mode: 'glide', d1: rescale ? ms('--dur-travel-2', 180) : 0, d2: slide ? ms('--dur-travel-2', 180) : ms('--dur-travel-3', 220) };
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
  /**
   * Width ÷ height of the plot. Default 2, unless `height` is set. 'banked' (#194): the line chart's segments set it,
   * banked to an average of 45° so slopes read accurately, between 1 and 4 for the data area; the width is the card's.
   */
  aspect?: number | 'banked';
  /** The plot's height in px, instead of an aspect ratio. */
  height?: number;
  /** A visible name, inside the figure. Leave it out when a CardTitle names the chart, and pass `aria-labelledby`. */
  title?: React.ReactNode;
  /**
   * The one thing the chart says, as its heading: "Cedar shipped twice as often as Delta in March" (#187). The title
   * then sits above it as a small label, so the chart is still named; screen readers hear the title, then this, then
   * the summary. Write it from the data shown, a trend or a comparison rather than the encoding. It's never generated.
   */
  takeaway?: React.ReactNode;
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
  /**
   * Where the value axis's labels go (#193). 'gutter' (default): a column at the plot's left. 'inline': each label sits
   * just above its gridline at the plot's left, on a halo, so the plot runs the full width; the top label carries the
   * unit, a label that would cover a mark is left out, and the ground line goes unlabelled (it is zero). Vertical
   * cartesian charts only.
   */
  yLabels?: 'gutter' | 'inline';
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
  /**
   * The data updates on its own (#66). New or changed marks get an afterglow (more than four at once, and the
   * "Updated 12:04" caption gets it instead); a window that moves on glides one step; and while the pointer or focus is
   * in the plot, updates wait until you leave, so nothing changes under what you're reading.
   */
  live?: boolean;
  /** With `live`: a "Pause updates" switch in the frame, for WCAG 2.2.2 (Pause, Stop, Hide). */
  pausable?: boolean;
  /**
   * What changed since a snapshot (#191): the records as they were (`data`, matched by x or the chart's id) and when,
   * in words (`label`: "since Tuesday 09:00"). A changed bar carries a tick at its old value, a changed line point a
   * hollow ring; the frame says "3 changed since Tuesday 09:00" in a switch that filters to them; up to four changed
   * marks get the afterglow on arrival. Storing what a person last saw is the application's.
   */
  since?: { data: ChartDatum[]; label: string };
  /** Updates are paused, controlled. Uncontrolled with `pausable`. */
  paused?: boolean;
  onPausedChange?: (paused: boolean) => void;
  /**
   * With `live`: what to say when new data lands, or nothing. Nothing is announced per tick by default; return a
   * sentence only for what matters ("Error rate crossed 2%"). It's said politely.
   */
  announce?: (data: ChartDatum[], previous: ChartDatum[] | null) => string | null | undefined;
  /** While a chart type's `relevance` filters, how the frame says how many match. Default "4 of 12 match". */
  countLabel?: (matches: number, total: number) => string;
}
/** Internal: how the loading wrapper tells the frame about held updates. */
interface ChartFrameLive { queued?: boolean; onHold?: (held: boolean) => void; pausedNow?: boolean; setPaused?: (paused: boolean) => void; }
export interface ChartEmpty { title?: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; }

/** True between beforeprint and afterprint, for browsers whose print media query lags the dialog. */
let printing = false;

const isTimeLike = (v: unknown) => v instanceof Date || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) || (typeof v === 'number' && v > 3e11);
const cssKey = (k: string) => k.replace(/[^\w-]/g, '-');
/** The room above the plot, for marks and labels that reach past its top. */
const TOP_GAP = 8;

/**
 * The frame every chart shares: a figure that sizes the plot, turns data into positions, draws the axes, the
 * gridlines and the ground line, gives each series its label, format and colour slot, and names and summarises the
 * chart. It's the record drawn as a shape, so all of it lies flush on whatever it sits on: no level, no shadow. When
 * the data changes, its marks move by the shared transition engine (useChartMotion).
 */
function ChartFrame({ config, data: dataProp, x: xProp, xScale: xScaleProp, aspect, height, title, takeaway, description, summary,
  zero: zeroProp, yDomain, yFormat, xFormat, bandPadding = 0.2, axes = true, yLabels = 'gutter', locale, patterns: patternsProp = false, tooltip: tooltipProp = true, views, view: viewProp, onViewChange, xLabel, refreshing, empty,
  live = false, pausable = false, since, paused: _paused, onPausedChange: _onPausedChange, announce, countLabel, queued = false, onHold, pausedNow = false, setPaused, className, style, children, ...rest }: ChartContainerProps & ChartFrameLive) {
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
  const findPart = <P,>(flag: 'chartTooltip' | 'chartLegend' | 'chartBrush', list: React.ReactNode) =>
    (React.Children.toArray(list).filter(React.isValidElement) as React.ReactElement<Record<string, unknown>>[])
      .find((k) => typeof k.type !== 'string' && (k.type as ChartChild)[flag]) as React.ReactElement<P> | undefined;
  // An overview brush (#74): the chart type windows the whole series to the brush's { start, end }, its own `window`
  // when controlled; the brush is drawn from every record, so it gets them before the window.
  const ownProps = chartChild?.props ?? {};
  const brushEl = findPart<Record<string, unknown>>('chartBrush', children) ?? findPart<Record<string, unknown>>('chartBrush', ownProps.children as React.ReactNode);
  const [brushWindow, setBrushWindow] = React.useState<{ start: string | number; end: string | number } | undefined>(undefined);
  const fullData = (brushEl ? (Array.isArray(ownProps.data) ? ownProps.data : Array.isArray(dataProp) ? dataProp : []) : []) as ChartDatum[];
  const childProps = brushEl && chartChild ? { ...ownProps, data: fullData, x: ownProps.x ?? xProp, window: ownProps.window ?? brushWindow } : ownProps;

  // The legend, and which series it has hidden. Hidden series keep their slots; the chart is drawn without them.
  const legendEl = findPart<{ content?: React.ReactElement<ChartLegendContentProps> }>('chartLegend', children) ?? findPart('chartLegend', childProps.children as React.ReactNode);
  const legendOpts = legendEl?.props.content?.props ?? {};
  // References and annotations, inside the container or the chart type: drawn by the frame, so their labels are laid out together.
  const overlayKids = [...kids, ...(React.Children.toArray(childProps.children as React.ReactNode).filter(React.isValidElement) as React.ReactElement<Record<string, unknown>>[])]
    .filter((k) => typeof k.type !== 'string');
  const [hiddenOwn, setHiddenOwn] = React.useState<string[]>(legendOpts.defaultHidden ?? []);
  const hidden = legendOpts.hidden ?? hiddenOwn;
  const setHidden = (next: string[]) => { legendOpts.onHiddenChange?.(next); if (legendOpts.hidden === undefined) setHiddenOwn(next); };
  const shownConfig = hidden.length ? Object.fromEntries(Object.entries(config).filter(([k]) => !hidden.includes(k))) : config;
  const info: ChartInfo = chartChild ? (chartChild.type as ChartChild).chartInfo!(childProps, shownConfig) : {};
  // Inline y labels (#193) sit above their gridlines, so the top one needs room above the plot.
  const inlineY = yLabels === 'inline' && axes && !info.plot && info.layout !== 'horizontal';
  const TOP = TOP_GAP + (info.top ?? 0) + (inlineY ? 14 : 0);
  const data = (info.data ?? dataProp ?? (childProps.data as ChartDatum[] | undefined) ?? []) as ChartDatum[];
  // A chart that draws its own plot: a grid of cells has no value axis to read a reference or an event against.
  const grid = info.plot === 'grid', xy = info.plot === 'xy';
  // Focus (#188): the series or records the chart is about keep their colours; the rest are context.
  const focusKeys = Array.isArray(info.focus) ? info.focus.map(String) : null;
  const focusRec = typeof info.focus === 'function' ? info.focus : null;
  const inContext = (key: string, d?: ChartDatum) => (focusKeys ? !focusKeys.includes(key) : focusRec && d ? !focusRec(d) : false);
  // How the marks lie, so reference labels keep off them (#184).
  const markKind = grid || xy ? null : info.imprint === 'area' ? 'area' : info.swatch === 'line' ? 'line' : info.swatch === 'rect' ? 'bars' : null;
  const marks: MarkShape | null = markKind && { kind: markKind, stacked: /stacked/i.test(info.kind ?? ''), shares: /shares/i.test(info.kind ?? '') };
  const childType = chartChild?.type as ChartChild | undefined;
  const refs = grid ? [] : overlayKids.filter((k) => (k.type as ChartChild).chartReference).map((k) => k.props as unknown as ChartReferenceProps);
  const notes = grid ? [] : overlayKids.filter((k) => (k.type as ChartChild).chartAnnotation).map((k) => k.props as unknown as ChartAnnotationProps);
  // The band's series, by default the config's first: hiding it hides the band rather than moving it to another series.
  const bandInfo = info.band ? { ...info.band, series: info.band.series ?? Object.keys(config)[0] } : undefined;
  const statusOf = (d: ChartDatum): ChartStatus | undefined => {
    const v = info.status?.(d);
    return v === 'partial' || v === 'projected' ? v : undefined;
  };
  const xKey = xProp ?? info.x ?? (childProps.x as string | undefined) ?? '';
  // Selection (#69): the chosen record keeps its colour and the rest recede, in the same language as a filter.
  const drillCtx = useDrilldown();
  const interactive = !!(info.onSelect || info.drill);
  const sameX = (a: unknown, b: unknown) => String(a) === String(b) || (isTimeLike(a) && isTimeLike(b) && toTime(a) === toTime(b));
  // Pinned readings (#190): a reading set down on the plot as a plate, at most pinMax, oldest first.
  const pinMax = !grid && !xy && info.pinnable ? (info.pinnable === true ? 2 : Math.max(1, Math.floor(info.pinnable))) : 0;
  const [pinsOwn, setPinsOwn] = React.useState<Array<string | number>>([]);
  const pins = pinMax ? (info.pins ?? pinsOwn).filter((x) => data.some((d) => sameX(d[xKey], x))).slice(-pinMax) : [];
  const setPins = (next: Array<string | number>) => { info.onPinsChange?.(next); if (info.pins === undefined) setPinsOwn(next); };
  const [pinSaid, setPinSaid] = React.useState('');
  const hasSelection = !!info.onSelect && info.selected !== undefined && info.selected !== null;
  // Changed since a snapshot (#191): records matched by the chart's id or by x; a new record counts as changed.
  const sinceKey = (d: ChartDatum) => (info.id ? info.id(d) : isTimeLike(d[xKey]) ? String(toTime(d[xKey])) : String(d[xKey]));
  const sinceMap = React.useMemo(() => (since ? new Map(since.data.map((d) => [sinceKey(d), d])) : null), [since?.data, xKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const sinceSeries = (info.series ?? Object.keys(shownConfig).map((key) => ({ key }))).map((q) => q.key);
  const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && isFinite(v);
  const sinceNew = (d: ChartDatum) => !!sinceMap && !sinceMap.has(sinceKey(d));
  const sinceWas = (d: ChartDatum, k: string) => { const o = sinceMap?.get(sinceKey(d))?.[k]; return isFiniteNum(o) ? o : null; };
  const changedAt = (d: ChartDatum, k: string) => !!sinceMap && isFiniteNum(d[k]) && (sinceNew(d) || (sinceWas(d, k) !== null && sinceWas(d, k) !== d[k]));
  const changedRec = (d: ChartDatum) => sinceSeries.some((k) => changedAt(d, k));
  const changedCount = sinceMap ? data.filter(changedRec).length : 0;
  const [onlyChanged, setOnlyChanged] = React.useState(false);
  const showOnlyChanged = onlyChanged && !!sinceMap && changedCount > 0;
  const userRelevance = (d: ChartDatum): 'match' | 'miss' | undefined => {
    // "Only what changed" recedes the rest where they stand, in the language of a filter.
    if (showOnlyChanged) return changedRec(d) ? 'match' : 'miss';
    const v = info.relevance?.(d); return v === 'match' || v === 'miss' ? v : undefined;
  };
  const filtered = (!!info.relevance || showOnlyChanged) && data.some((d) => userRelevance(d) !== undefined);
  const matchCount = filtered ? data.filter((d) => userRelevance(d) !== 'miss').length : 0;
  // A chart whose records have their own identity selects by it: the selected record, or its id.
  const selectedId = hasSelection && info.id ? (typeof info.selected === 'object' ? info.id(info.selected as ChartDatum) : String(info.selected)) : null;
  const isSelected = (d: ChartDatum) => hasSelection && (info.id ? info.id(d) === selectedId : sameX(d[xKey], info.selected));
  const selecting = hasSelection && data.some(isSelected);
  const relevanceOf = (d: ChartDatum): 'match' | 'miss' | undefined => (selecting ? (isSelected(d) && userRelevance(d) !== 'miss' ? 'match' : 'miss') : userRelevance(d));
  /** A record chosen by click, tap, Enter or Space: drill into it, or select it (choosing the selected one clears). */
  const activate = (d: ChartDatum) => {
    if (info.drill) { const id = info.drill(d); if (id !== null && id !== undefined) drillCtx?.open(String(id)); return; }
    info.onSelect?.(isSelected(d) ? null : d);
  };
  const actionWord = (d: ChartDatum) => (info.drill ? 'Select to open' : isSelected(d) ? 'Select to clear' : 'Select to filter');
  // A chart type that needs zero (bars) gets it whatever the prop says: a bar that starts above zero misstates its length.
  const zero = info.zero === true ? true : zeroProp ?? info.zero ?? true;

  const defs: Array<{ key: string; label: string; color?: ChartSlot; format?: (v: number) => string }> = info.series ?? Object.keys(config).map((key) => ({ key, ...config[key] }));
  const configKey = defs.map((c) => `${c.key}:${c.label}:${c.color ?? ''}`).join('|') + '/' + Object.entries(config).map(([k, c]) => `${k}:${c.label}`).join('|');
  const allSeries: ChartSeries[] = React.useMemo(() => {
    const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
    return defs.map(({ key }, i) => {
      const c = defs[i];
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
  // Two pins say their difference in a strip under the x axis.
  const bottom = (axes && !grid ? 26 : 1) + (info.bottom ?? 0) + (pins.length === 2 ? 24 : 0);
  const right = (info.right ?? 0) + (horizontal ? (axes ? 20 : 2) : kind === 'band' || !axes || grid ? 2 : 18);

  // The target frame: where the plot is going, independent of its width.
  let lo = Infinity, hi = -Infinity;
  if (info.yExtent) [lo, hi] = info.yExtent;
  else {
    // An uncertainty band counts toward the extent, so its edges are never cut off.
    const bandOn = bandInfo && series.some((s) => s.key === bandInfo!.series);
    const extentKeys = [...series.map((s) => s.key), ...(bandOn ? [bandInfo!.low, bandInfo!.high] : []), ...(info.compare ? [info.compare.key] : [])];
    // With rescale, y fits the matches; otherwise the axis holds, so every position survives the filter.
    const fit = info.rescale && filtered && matchCount ? data.filter((d) => relevanceOf(d) !== 'miss') : data;
    for (const d of fit) for (const k of extentKeys) { const v = d[k]; if (typeof v === 'number' && isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
    // A changed mark's old value joins y too, so its tick or ring is on the plot.
    if (sinceMap) for (const d of data) for (const k of sinceSeries) { const v = changedAt(d, k) ? sinceWas(d, k) : null; if (v !== null) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
  }
  // A reference's own values count too, so a target above every value is still on the plot.
  for (const r of refs) for (const v of Array.isArray(r.y) ? r.y : [r.y]) if (typeof v === 'number' && isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  if (!isFinite(lo)) { lo = 0; hi = 1; }
  if (zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
  // All zero is real data: give it 0–1, so the ground line is the floor, not the middle of an invented range.
  if (lo === 0 && hi === 0) hi = 1;
  // Horizontal: categories take at most 40% of the width (longer names are cut with an ellipsis), values the rest.
  const catWidth = horizontal && axes ? Math.min(Math.ceil(Math.max(0, ...[...new Set(data.map((d) => String(d[xKey])))].map((c) => axisWidth(xFormat ? xFormat(c) : c)))) + 12, Math.round(W * 0.4)) : 0;
  const yCount = horizontal ? Math.max(2, Math.min(6, Math.round((W - catWidth - right) / 90))) : Math.max(3, Math.min(6, Math.round((H - TOP - bottom) / 56)));
  const ny = linearScale(yDomain ?? [lo, hi], [1, 0], yCount, !yDomain);
  const rowKey = (d: ChartDatum) => (info.id ? info.id(d) : String(kind === 'time' ? toTime(d[xKey]) : d[xKey]));
  const cats = kind === 'band' ? [...new Set(data.map((d) => String(d[xKey])))] : [];
  const unit = kind === 'band' ? bandScale(cats, [0, 1], bandPadding) : null;
  const target: Frame = {
    kind, series,
    rows: data.map((d) => ({ key: rowKey(d), d })),
    y: ny.domain,
    ticks: ny.ticks.map((v) => ({ v, a: 1 })),
    band: unit ? new Map(cats.map((c) => [c, [unit(c), unit.bandwidth]])) : null,
    rowAlpha: new Map(), seriesAlpha: new Map(series.map((s) => [s.key, 1])),
    left: grid ? info.left ?? 0 : !axes || inlineY ? 0 : horizontal ? catWidth
      : Math.ceil(Math.max(...ny.ticks.map((t) => axisWidth(fmtY(t))), 0)) + 10,
    extra: [...(bandInfo ? [bandInfo.low, bandInfo.high] : []), ...(info.compare ? [info.compare.key] : []), ...(info.glide ?? [])],
    xDomain: kind === 'band' ? null : info.xDomain ?? (() => {
      const vs = data.map((d) => (kind === 'time' ? toTime(d[xKey]) : Number(d[xKey]))).filter((v) => isFinite(v));
      return vs.length ? [Math.min(...vs), Math.max(...vs)] as [number, number] : null;
    })(),
  };
  // Banking (#194): the data area's width ÷ height that sets the segments at 45° on average. Read from the shown series
  // over the y axis's domain, and kept while values glide: only new x values, which cross-fade as a new chart, change it.
  const banked = (aspect === 'banked' || (aspect == null && info.aspect === 'banked')) && height == null;
  const xSig = banked ? data.map((d) => String(d[xKey])).join('|') + '/' + series.map((s) => s.key).join('|') : '';
  const bankRatio = React.useMemo(() => {
    if (!banked) return null;
    const xs = data.map((d, i) => (kind === 'time' ? toTime(d[xKey]) : kind === 'linear' ? Number(d[xKey]) : i));
    return bankTo45(xs, series.map((s) => data.map((d) => (typeof d[s.key] === 'number' ? d[s.key] as number : null))), ny.domain);
  }, [xSig]); // eslint-disable-line react-hooks/exhaustive-deps
  const changeKey = React.useMemo(() => ({}), [data, configKey, xKey, kind, zero, yDomain?.[0], yDomain?.[1], info.yExtent?.[0], info.yExtent?.[1], bandPadding, horizontal, hiddenKey, info.rescale ? `${lo}:${hi}` : '']); // eslint-disable-line react-hooks/exhaustive-deps
  const { layers, stage } = useChartMotion(target, changeKey, plotRef, live, info.motion);

  // Live (#66): which marks are new or changed since the data last landed. Four or fewer each get an afterglow; more is
  // a whole refresh, one change, so the "Updated" caption glows instead and no mark does.
  type Glow = { key: string; series: string; gen: number; at: number; delay: number };
  const [glows, setGlows] = React.useState<Glow[]>([]);
  const [captionGlow, setCaptionGlow] = React.useState(0);
  const [updatedAt, setUpdatedAt] = React.useState<number | null>(null);
  const [said, setSaid] = React.useState('');
  const prevRows = React.useRef<{ map: Map<string, ChartDatum>; rows: ChartDatum[] } | null>(null);
  const glowGen = React.useRef(0);
  const settleMs = () => cssMs(plotRef.current ? getComputedStyle(plotRef.current) : null, '--dur-settle', 8000);
  React.useEffect(() => {
    if (!live) return;
    const now = Date.now();
    const prev = prevRows.current;
    const map = new Map(data.map((d) => [rowKey(d), d]));
    prevRows.current = { map, rows: data };
    setUpdatedAt(now);
    if (!prev) return;
    const words = announce?.(data, prev.rows);
    if (words) setSaid(words);
    const changed: Array<{ key: string; series: string }> = [];
    for (const [key, d] of map) {
      const p = prev.map.get(key);
      for (const s of series) { const v = d[s.key]; if (typeof v === 'number' && isFinite(v) && (!p || p[s.key] !== v)) changed.push({ key, series: s.key }); }
    }
    if (!changed.length) return;
    if (changed.length > 4) { setCaptionGlow((g) => g + 1); return; }
    const gen = ++glowGen.current, settle = settleMs();
    setGlows((g) => [...g.filter((x) => now - x.at < settle), ...changed.map((c) => ({ ...c, gen, at: now, delay: riseDelay() }))]);
  }, [data, live]); // eslint-disable-line react-hooks/exhaustive-deps
  // A glow that has faded is dropped, so the point's name stops saying "changed".
  React.useEffect(() => {
    if (!glows.length) return;
    const settle = settleMs(), next = Math.min(...glows.map((g) => g.at + g.delay + settle)) - Date.now();
    const t = window.setTimeout(() => setGlows((g) => g.filter((x) => Date.now() - x.at - x.delay < settle)), Math.max(0, next) + 20);
    return () => window.clearTimeout(t);
  }, [glows]); // eslint-disable-line react-hooks/exhaustive-deps
  const captionDepth = useDepth({ settle: captionGlow || undefined });
  // Changed since a snapshot (#191), on arrival: up to four changed marks take live's afterglow; more, and the
  // "changed since" caption takes it instead. After that only the marks and the words remain.
  const [sinceGlow, setSinceGlow] = React.useState(0);
  React.useEffect(() => {
    if (!sinceMap) return;
    const changed = data.flatMap((d) => sinceSeries.filter((k) => changedAt(d, k)).map((k) => ({ key: rowKey(d), series: k })));
    if (!changed.length) return;
    if (changed.length > 4) { setSinceGlow((g) => g + 1); return; }
    const now = Date.now(), gen = ++glowGen.current;
    setGlows((g) => [...g, ...changed.map((c) => ({ ...c, gen, at: now, delay: riseDelay() }))]);
  }, [sinceMap]); // eslint-disable-line react-hooks/exhaustive-deps
  const sinceDepth = useDepth({ settle: sinceGlow || undefined });
  const glowing = (key: string, series: string) => glows.some((g) => g.key === key && g.series === series);
  // Holding still: while the pointer or focus is in the plot, updates wait (the loading wrapper keeps the shown data).
  const holdPointer = React.useRef(false), holdFocus = React.useRef(false);
  const hold = (by: 'pointer' | 'focus', on: boolean) => {
    if (!live) return;
    if (by === 'pointer') holdPointer.current = on; else holdFocus.current = on;
    onHold?.(holdPointer.current || holdFocus.current);
  };

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
  const encode = (key: string, d?: ChartDatum): ChartEncoding => {
    const s = allSeries.find((x) => x.key === key);
    const slot = s?.slot ?? 'data-other';
    const e = ENCODINGS[slot];
    // Context (#188) is one shared neutral, flat: it isn't told apart, so it takes no hatch.
    const context = inContext(key, d);
    const color = context ? (env.forced ? 'GrayText' : 'var(--data-context)') : env.forced ? 'CanvasText' : s?.color ?? 'var(--data-other)';
    return {
      slot, context, stroke: color, marker: e.marker,
      fill: patterns && e.hatch && !context ? `url(#${pid}-${slot})` : color,
      dash: patterns ? e.dash : undefined,
      edge: env.forced ? 'CanvasText' : env.more ? 'var(--ink)' : undefined,
      pending: patterns && e.hatch ? `url(#${pid}-${slot})` : `url(#${pid}-${slot}-pending)`,
      pendingOpacity: patterns && e.hatch ? 0.45 : 1,
      pendingDash: patterns && e.dash ? e.dash : '5 4',
    };
  };

  const nfX = React.useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const clock = React.useMemo(() => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }), [locale]);
  const fullDate = React.useMemo(() => new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }), [locale]);
  const dateTime = React.useMemo(() => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }), [locale]);
  // Within a few days, a time's x is read to the minute; otherwise to the day.
  const ts = kind === 'time' ? data.map((d) => toTime(d[xKey])).filter((t) => isFinite(t)) : [];
  const intraday = ts.length > 1 && Math.max(...ts) - Math.min(...ts) < 3 * DAY;
  // Categories that are dates (a bar per week) read as dates, not as ISO strings.
  const datedBands = kind === 'band' && isTimeLike(sample);
  const shortDate = React.useMemo(() => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }), [locale]);
  const bandLabel = (v: unknown) => (xFormat ? xFormat(v) : datedBands ? shortDate.format(new Date(toTime(v))) : String(v));
  const formatX = xFormat ?? info.xFormat ?? (datedBands ? (v: unknown) => fullDate.format(new Date(toTime(v))) : kind === 'time' ? (v: unknown) => (intraday ? dateTime : fullDate).format(new Date(toTime(v))) : kind === 'linear' ? (v: unknown) => nfX.format(Number(v)) : (v: unknown) => String(v));
  // Pinned readings (#190), in words: the plate's short label, what's read aloud, and two pins' difference.
  const pinRecord = (x: unknown) => data.find((d) => sameX(d[xKey], x));
  const pinX = (x: unknown) => (kind === 'band' ? bandLabel(x) : kind === 'time' ? (intraday ? dateTime : shortDate).format(new Date(toTime(x))) : formatX(x));
  const pinValues = (d: ChartDatum | undefined, spoken = false) => {
    const shown = series.filter((q) => d && typeof d[q.key] === 'number' && isFinite(d[q.key] as number));
    if (shown.length === 1) return spoken ? `${shown[0].format(d![shown[0].key] as number)} ${shown[0].label}` : shown[0].format(d![shown[0].key] as number);
    return shown.map((q) => `${q.label} ${q.format(d![q.key] as number)}`).join(', ');
  };
  const pinLabel = (x: unknown) => `${pinX(x)} · ${pinValues(pinRecord(x))}`;
  const pinDiff = (spoken: boolean, list = pins) => {
    if (list.length !== 2) return '';
    const [a, b] = [...list].sort((p, q) => data.findIndex((d) => sameX(d[xKey], p)) - data.findIndex((d) => sameX(d[xKey], q))).map(pinRecord);
    if (!a || !b) return '';
    const both = series.filter((q) => typeof a[q.key] === 'number' && typeof b[q.key] === 'number');
    if (!both.length) return '';
    const span = kind === 'time' ? (() => { const ms = toTime(b[xKey]) - toTime(a[xKey]), days = Math.round(ms / DAY); return days >= 1 ? `${days} ${days === 1 ? 'day' : 'days'}` : `${Math.round(ms / 36e5)} hours`; })() : '';
    if (both.length === 1) {
      const q = both[0], va = a[q.key] as number, vb = b[q.key] as number, w = changeWords(vb, va, q.format);
      if (spoken) return va === vb ? `${formatX(b[xKey])} is the same as ${formatX(a[xKey])}.` : `${formatX(b[xKey])} is ${w.slice(1)} ${vb > va ? 'higher' : 'lower'} than ${formatX(a[xKey])}.`;
      return span ? `${w} over ${span}` : `${w} from ${pinX(a[xKey])} to ${pinX(b[xKey])}`;
    }
    const parts = both.map((q) => `${q.label} ${changeWords(b[q.key] as number, a[q.key] as number, q.format)}`);
    return spoken ? `From ${formatX(a[xKey])} to ${formatX(b[xKey])}: ${parts.join(', ')}.` : parts.join(' · ');
  };
  const pinAt = (d: ChartDatum) => {
    if (!pinMax) return;
    const x = d[xKey] as string | number;
    if (pins.some((p) => sameX(p, x))) return;
    const next = [...pins, x].slice(-pinMax);
    setPins(next);
    setPinSaid(`Pinned ${formatX(x)}: ${pinValues(d, true)}.${next.length === 2 ? ' ' + pinDiff(true, next) : ''}`);
  };
  const unpin = (x: unknown) => { const next = pins.filter((p) => !sameX(p, x)); setPins(next); setPinSaid(`Pin removed, ${formatX(x)}.`); };

  // The keyboard path (#63): the plot is one Tab stop holding three levels, summary → series → points. Enter goes
  // deeper and Escape comes back, as in Tree and Drilldown; a roving tabindex keeps one node in the tab order.
  type Nav = { level: 'summary' | 'series' | 'points'; s: number; p: number };
  const [nav, setNav] = React.useState<Nav>({ level: 'summary', s: 0, p: 0 });
  const [navFocused, setNavFocused] = React.useState(false);
  const navRefs = React.useRef(new Map<string, HTMLElement>());
  const wantFocus = React.useRef<string | null>(null);
  const navS = Math.min(nav.s, Math.max(0, series.length - 1)), navP = Math.min(nav.p, Math.max(0, data.length - 1));
  // Focused series come first on the keyboard path (#188), as in the readout.
  const navOrder = series.map((_, i) => i).sort((a, b) => +inContext(series[a].key) - +inContext(series[b].key) || a - b);
  const emphasis = navFocused && nav.level !== 'summary' && series.length > 1 && !info.flat ? series[navOrder[navS]]?.key ?? null : null;

  /** A layer's scales, ticks and context, at the plot's size now. */
  const draw = (frame: Frame) => {
    const left = Math.round(frame.left);
    const pw = Math.max(0, W - left - right), ph = Math.max(0, H - TOP - bottom);
    const [d0, d1] = frame.y;
    // Headroom (#184): the top of the plot that holds annotation plates (or, across a horizontal chart, reference
    // labels) and no data, so they never cover a mark. Set below, once they're laid out; nothing reads y before.
    let headY = 0, headX = 0;
    // Along the value axis: up the plot, below the headroom, or across it when horizontal.
    const y = Object.assign((v: number) => (horizontal ? ((v - d0) / (d1 - d0 || 1)) * pw : ph - ((v - d0) / (d1 - d0 || 1)) * (ph - headY)),
      { kind: 'linear' as const, domain: frame.y, range: (horizontal ? [0, pw] : [ph, 0]) as [number, number], ticks: frame.ticks.map((t) => t.v) }) as LinearScale;
    // A reference's value in this frame, and its words: a mean or median is computed from the record.
    const refAt = (r: ChartReferenceProps): { v: number | [number, number]; text: string } | null => {
      let v: number | [number, number] | null = null;
      const key = r.series ?? frame.series[0]?.key;
      const vals = frame.rows.map((q) => q.d).filter((d) => !statusOf(d));
      if (typeof r.y === 'string') {
        const vs = vals.map((d) => d[key ?? '']).filter((n): n is number => typeof n === 'number' && isFinite(n)).sort((a, b) => a - b);
        if (vs.length) v = r.y === 'mean' ? vs.reduce((t, n) => t + n, 0) / vs.length : vs.length % 2 ? vs[(vs.length - 1) / 2] : (vs[vs.length / 2 - 1] + vs[vs.length / 2]) / 2;
      } else v = r.y;
      if (v === null) return null;
      const fmt = (n: number) => (frame.series.find((q) => q.key === key)?.format ?? fmtY)(n);
      // A mean or median is said at the data's own precision, so a format that doesn't round still reads cleanly.
      const places = Math.min(4, Math.max(0, ...frame.rows.map((q) => { const n = q.d[key ?? '']; return typeof n === 'number' && isFinite(n) ? (String(n).split('.')[1] ?? '').length : 0; })));
      return { v, text: typeof r.y === 'string' && typeof v === 'number' ? `${r.label} ${fmt(Number(v.toFixed(places + 1)))}` : r.label };
    };
    // Across a horizontal chart, reference labels sit above the bars beside their line, stacked into rows.
    const across = new Map<number, { lx: number; ly: number }>();
    if (horizontal && refs.length) {
      const ends: number[] = [];
      refs.map((r, i) => ({ i, r, at: refAt(r) })).filter((q) => q.at).map(({ i, r, at }) => ({ i, r, text: at!.text, to: Array.isArray(at!.v) ? y(Math.max(...at!.v)) : y(at!.v) }))
        .sort((p, q) => p.to - q.to).forEach(({ i, r, text, to }) => {
          const w = textWidth(text) + (r.tone ? 18 : 0);
          const x0 = Math.min(to + 4, pw - w);
          let row = ends.findIndex((e) => e + 6 <= x0);
          if (row < 0) { row = ends.length; ends.push(0); }
          ends[row] = x0 + w;
          across.set(i, { lx: x0 + (r.tone ? 18 : 0), ly: 12 + row * 16 });
        });
      headX = ends.length * 16 + 4;
    }
    let x: ChartXScale;
    let xTicks: Array<{ at: number; label: string; a: number }> = [];
    if (frame.kind === 'band') {
      const band = frame.band!;
      const domain = frame.rows.map((r) => String(r.d[xKey]));
      const along = horizontal ? ph - headX : pw, from = horizontal ? headX : 0;
      const bw = (band.get(domain[0])?.[1] ?? 0) * along;
      x = Object.assign((v: string) => from + (band.get(String(v))?.[0] ?? 0) * along, { kind: 'band' as const, domain, range: [from, from + along] as [number, number], ticks: domain, bandwidth: bw, step: bw / (1 - bandPadding) }) as BandScale;
      if (axes && horizontal) {
        xTicks = domain.map((d, i) => ({ at: (x as BandScale)(d) + bw / 2, label: fit(bandLabel(d), left - 12, axisWidth), a: frame.rowAlpha.get(frame.rows[i].key) ?? 1 }));
      } else if (axes) {
        // Show every k-th label, k as small as lets each shown label clear its shown neighbours by 4px.
        const ws = domain.map((d) => axisWidth(bandLabel(d)));
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
          : iv.months ? { month: 'short', year: '2-digit' } : iv.minutes ? { hour: 'numeric', minute: '2-digit' } : iv.hours ? { hour: 'numeric' } : { month: 'short', day: 'numeric' };
        const df = new Intl.DateTimeFormat(locale, { ...opts, timeZone: 'UTC' });
        return (v: number) => (xFormat ? xFormat(v) : df.format(new Date(v)));
      };
      const dom: [number, number] = frame.xDomain ?? [Math.min(...ts), Math.max(...ts)];
      let t = timeScale(dom, [0, pw], Math.max(2, Math.floor(pw / 40)));
      for (let max = Math.max(2, Math.floor(pw / 40)); max >= 2; max--) {
        t = timeScale(dom, [0, pw], max);
        const f = label(t.interval);
        const at = t.scale.ticks.map((v) => t.scale(v)), ws = t.scale.ticks.map((v) => axisWidth(f(v)));
        // The first label is set from its start when it sits at the edge, so it only needs to clear the next one.
        const fits = at.every((p, i) => i === 0 || p - at[i - 1] >= (i === 1 && at[0] < 24 ? ws[0] : ws[i - 1] / 2) + ws[i] / 2 + 8);
        if (fits) break;
      }
      x = t.scale;
      const f = label(t.interval);
      if (axes) xTicks = t.scale.ticks.map((v) => ({ at: t.scale(v), label: f(v), a: 1 }));
    } else {
      const vs = frame.rows.map((r) => Number(r.d[xKey])).filter((v) => isFinite(v));
      x = linearScale(frame.xDomain ?? [Math.min(...vs), Math.max(...vs)], [0, pw], Math.max(2, Math.floor(pw / 56)), false);
      if (axes) xTicks = (x as LinearScale).ticks.map((v) => ({ at: (x as LinearScale)(v), label: formatX(v), a: 1 }));
    }
    const xOf = (d: ChartDatum) => (x.kind === 'band' ? x(String(d[xKey])) + x.bandwidth / 2 : (x as LinearScale | TimeScale)(d[xKey] as number));
    // Annotations (#68): a plate per event at the top of the plot, centred on its x, stacked into rows where they'd
    // overlap. The rows are the plot's headroom: the data starts below them, so a plate never covers a mark.
    const noteGeo: NoteGeo[] = [];
    if (!horizontal) {
      const rowsEnd: number[] = [];
      // Pinned readings (#190) are plates too, laid out with the annotations: a pin icon and a remove button beside the words.
      const plates = [...notes.map((n, i) => ({ i, x: n.x as unknown, label: n.label, pin: undefined as number | undefined })),
        ...pins.map((x, j) => ({ i: -1 - j, x: x as unknown, label: pinLabel(x), pin: j }))];
      plates.map((n) => ({ n, at: xOf({ [xKey]: n.x }) })).filter((g) => isFinite(g.at)).sort((p, q) => p.at - q.at).forEach(({ n, at }) => {
        const w = Math.ceil(textWidth(n.label) * 0.96) + 18 + (n.pin !== undefined ? 40 : 0);
        const left = Math.max(0, Math.min(pw - w, at - w / 2));
        let row = rowsEnd.findIndex((e) => e + 6 <= left);
        if (row < 0) { row = rowsEnd.length; rowsEnd.push(0); }
        rowsEnd[row] = left + w;
        noteGeo.push({ i: n.i, at, left, w, row, pin: n.pin });
      });
      headY = Math.min(rowsEnd.length * 26, ph / 2);
      y.range = [ph, headY];
    }
    const ground = d0 <= 0 && d1 >= 0 ? y(0) : horizontal ? 0 : ph;
    const rowAlpha = (d: ChartDatum) => frame.rowAlpha.get(rowKey(d)) ?? 1;
    // Not yet the record (#67): which stretches of x are pending, and where the record ends.
    const rows = frame.rows.map((r) => r.d);
    const pend = rows.map((d) => !!statusOf(d));
    const pending: Array<[number, number]> = [];
    if (pend.some(Boolean) && frame.kind !== 'band') {
      // A segment is pending when either end is, so a pending run reaches back to the record point before it.
      for (let i = 0; i < rows.length; i++) {
        if (!pend[i]) continue;
        let j = i;
        while (j + 1 < rows.length && pend[j + 1]) j++;
        pending.push([xOf(rows[Math.max(0, i - 1)]), xOf(rows[Math.min(rows.length - 1, j + 1)])]);
        i = j;
      }
    }
    const record: Array<[number, number]> = [];
    let from = -40;
    for (const [a, b] of pending) { if (a > from) record.push([from, a]); from = b; }
    record.push([from, pw + 40]);
    let boundaryAt: number | null = null;
    const turn = pend.findIndex((p, i) => p && i > 0 && !pend[i - 1]);
    if (turn > 0) {
      if (x.kind === 'band') boundaryAt = x(String(rows[turn][xKey])) - (x.step - x.bandwidth) / 2;
      else boundaryAt = xOf(rows[turn - 1]);
    }
    // Filter in place (#70): for lines and areas, the stretch of x each record owns, to the midpoints with its neighbours.
    const relevanceRegions: ChartContextValue['relevanceRegions'] = [];
    if ((info.relevance || info.onSelect || sinceMap) && frame.kind !== 'band') {
      const xs = rows.map((d) => xOf(d));
      rows.forEach((d, i) => {
        // Edges on whole pixels, so neighbouring stretches meet without an anti-aliased seam.
        const r = { key: rowKey(d), miss: relevanceOf(d) === 'miss', x0: i ? Math.round((xs[i - 1] + xs[i]) / 2) : -40, x1: i < rows.length - 1 ? Math.round((xs[i] + xs[i + 1]) / 2) : pw + 40 + right };
        // Past 120 records, neighbours in the same state share one stretch: each stretch redraws the line, so this caps the cost.
        const last = relevanceRegions[relevanceRegions.length - 1];
        if (rows.length > 120 && last && last.miss === r.miss) last.x1 = r.x1; else relevanceRegions.push(r);
      });
    }
    // References (#68): each one's place on the value axis in this frame, so they glide with a rescale.
    const refGeo: RefGeo[] = [];
    refs.forEach((r, i) => {
      const at = refAt(r);
      if (!at) return;
      const { v, text } = at;
      if (Array.isArray(v)) {
        const [p, q] = [y(Math.min(v[0], v[1])), y(Math.max(v[0], v[1]))];
        refGeo.push({ i, band: true, from: Math.min(p, q), to: Math.max(p, q), text, tone: r.tone, lx: 0, ly: 0, anchor: 'start' });
      } else refGeo.push({ i, band: false, from: y(v), to: y(v), text, tone: r.tone, lx: 0, ly: 0, anchor: 'end' });
    });
    // Inline y labels (#193): each just above its gridline at the plot's left. One that would cover a mark is left out
    // (its gridline stays), and the unit is said once, on the highest label shown. The ground line is zero, unlabelled.
    const yInline: Array<{ v: number; at: number; a: number; text: string; box: PlotBox }> = [];
    if (inlineY) {
      const coverY = markCover(frame, marks, xKey, xOf, y, x, ground);
      const ticks = frame.ticks.map((t) => ({ ...t, at: y(t.v) })).filter((t) => t.at >= -1 && t.at <= ph + 1 && !(Math.abs(t.at - ground) < 1 && d0 <= 0 && d1 >= 0)).sort((p, q) => p.at - q.at);
      const words = ticks.map((t) => fmtY(t.v));
      const [pre, suf] = unitOf(words);
      ticks.forEach((t, i) => {
        const box = { x0: 0, x1: axisWidth(words[i]), y0: t.at - 16, y1: t.at - 1 };
        if (!coverY({ x0: box.x0, x1: box.x1 + 2, y0: box.y0, y1: box.y1 })) yInline.push({ v: t.v, at: t.at, a: t.a, text: words[i], box });
      });
      yInline.forEach((l, i) => { if (i > 0 && (pre || suf)) l.text = l.text.slice(pre.length, l.text.length - suf.length); });
    }
    // Labels: a line's (and a thin band's) at an end of it, above or below; a tall band's inside it. Each takes the first
    // spot that covers no mark, no plate and no label already placed (#184); failing that, the first spot, stepped
    // down below whatever it would cover. Across a horizontal chart, labels sit in the headroom beside their line.
    if (horizontal) {
      for (const g of refGeo) { const a = across.get(g.i); if (a) { g.lx = a.lx; g.ly = a.ly; g.anchor = 'start'; } }
    } else {
      const taken = [...noteGeo.map((n) => ({ x0: n.left - 4, x1: n.left + n.w + 4, y0: n.row * 26, y1: n.row * 26 + 22 })), ...yInline.map((l) => ({ ...l.box, x1: l.box.x1 + 4 }))];
      type Box = { x0: number; x1: number; y0: number; y1: number };
      const hits = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
      const covers = markCover(frame, marks, xKey, xOf, y, x, ground);
      // Its right end first, above then below; then its left end; then stepping along the line from the right.
      const spots = (g: RefGeo): Array<[number, number, 'start' | 'end']> => {
        const w = textWidth(g.text) + (g.tone ? 18 : 0), l = 4 + (g.tone ? 18 : 0), r = pw - 4;
        const out: Array<[number, number, 'start' | 'end']> = [[r, g.from - 5, 'end'], [r, g.to + 15, 'end'], [l, g.from - 5, 'start'], [l, g.to + 15, 'start']];
        for (let k = 1; k < 6; k++) { const at = r - ((pw - 8 - w) * k) / 6; if (at - w > l) out.push([at, g.from - 5, 'end'], [at, g.to + 15, 'end']); }
        return g.band && g.to - g.from >= 20 ? [[l + 4, g.from + 14, 'start'], [r - 4, g.from + 14, 'end'], [l + 4, g.to - 5, 'start'], [r - 4, g.to - 5, 'end'], ...out] : out;
      };
      const boxOf = (g: RefGeo, [lx, ly, anchor]: [number, number, 'start' | 'end']): Box => {
        const w = textWidth(g.text) + (g.tone ? 18 : 0), x0 = anchor === 'end' ? lx - w : lx - (g.tone ? 18 : 0);
        return { x0, x1: x0 + w, y0: ly - 13, y1: ly + 4 };
      };
      for (const g of refGeo) [g.lx, g.ly, g.anchor] = spots(g)[0];
      for (const g of [...refGeo].sort((p, q) => p.ly - q.ly)) {
        // Of the spots inside the plot and clear of other words, the one that covers least: none, where there's room.
        let best: [number, number, 'start' | 'end'] | null = null, least = Infinity;
        for (const sp of spots(g)) {
          const b = boxOf(g, sp);
          if (b.y0 < 0 || b.y1 > ph || b.x0 < 0 || b.x1 > pw || taken.some((t) => hits(b, t))) continue;
          const n = covers({ x0: b.x0 - 2, x1: b.x1 + 2, y0: b.y0 - 1, y1: b.y1 + 1 });
          if (n < least) { best = sp; least = n; }
          if (!n) break;
        }
        if (best) { [g.lx, g.ly, g.anchor] = best; const b = boxOf(g, best); taken.push({ x0: b.x0 - 4, x1: b.x1 + 4, y0: b.y0, y1: b.y1 }); continue; }
        const w = textWidth(g.text) + (g.tone ? 18 : 0), x0 = g.anchor === 'end' ? g.lx - w : g.lx - (g.tone ? 18 : 0);
        g.ly = Math.max(g.ly, 12);
        for (let moved = true, n = 0; moved && n < 20; n++) {
          moved = false;
          for (const t of taken) {
            if (x0 < t.x1 && x0 + w > t.x0 && g.ly - 13 < t.y1 && g.ly + 4 > t.y0) { g.ly = t.y1 + 15; moved = true; }
          }
        }
        taken.push({ x0: x0 - 4, x1: x0 + w + 4, y0: g.ly - 13, y1: g.ly + 4 });
      }
    }
    const ctx: ChartContextValue = {
      width: pw, height: ph, x, y, xOf, ground, data: frame.rows.map((r) => r.d), xKey, config, series: frame.series,
      alpha: (d, key) => (d ? rowAlpha(d) : 1) * (key ? frame.seriesAlpha.get(key) ?? 1 : 1),
      format: (key, v) => (frame.series.find((s) => s.key === key)?.format ?? fmtY)(v),
      formatX, horizontal, encode, patterns, directLabels: env.forced || env.print,
      emphasis,
      active: activeIdx !== null ? frame.rows[activeIdx]?.d ?? null : null,
      setActive: (i) => show(i),
      strokeWidth: env.more ? 3 : 2, gap: env.more ? 3 : 2,
      status: statusOf, hasStatus: !!info.status, statusRanges: { record, pending },
      relevance: relevanceOf, hasRelevance: !!info.relevance || !!info.onSelect || !!sinceMap, relevanceRegions,
      sinceOld: sinceMap ? (d, k) => (changedAt(d, k) ? sinceWas(d, k) : null) : null,
    };
    return { ctx, left, pw, ph, xTicks, boundaryAt, refGeo, noteGeo, yInline };
  };

  // Focus in words (#188): the generated summary starts with what's highlighted; a written one is followed by it.
  const focusNames = focusKeys ? series.filter((q) => focusKeys.includes(q.key)).map((q) => q.label)
    : focusRec ? data.filter((d) => focusRec(d)).map((d) => (info.label ? info.label(d) : formatX(d[xKey]))) : [];
  const focusWords = focusNames.length ? `Highlighted: ${focusNames.length > 1 ? focusNames.slice(0, -1).join(', ') + ' and ' + focusNames[focusNames.length - 1] : focusNames[0]}.` : '';
  // Read against the record before (#189): each record's value now and then, the change in words, and a count.
  const cmp = info.compare;
  const isVal = (v: unknown): v is number => typeof v === 'number' && isFinite(v);
  const cmpNow = (d: ChartDatum): number | null => !cmp ? null : cmp.series === null
    ? series.reduce((t, q) => t + (isVal(d[q.key]) ? (d[q.key] as number) : 0), 0) : isVal(d[cmp.series]) ? (d[cmp.series] as number) : null;
  const cmpBefore = (d: ChartDatum): number | null => (cmp && isVal(d[cmp.key]) ? (d[cmp.key] as number) : null);
  const cmpFmt = (cmp?.series ? allSeries.find((q) => q.key === cmp.series)?.format : series[0]?.format) ?? fmtY;
  const cmpSentence = (d: ChartDatum) => {
    const now = cmpNow(d), was = cmpBefore(d);
    if (!cmp || now === null || was === null) return '';
    return now === was ? `Same as ${cmp.label}.` : `${now > was ? 'Up' : 'Down'} ${changeWords(now, was, cmpFmt).slice(1)} from ${cmp.label}.`;
  };
  const cmpWords = (() => {
    if (!cmp) return '';
    const pairs = data.map((d) => [cmpNow(d), cmpBefore(d)]).filter(([a, b]) => a !== null && b !== null) as Array<[number, number]>;
    if (!pairs.length) return '';
    const up = pairs.filter(([a, b]) => a > b).length, down = pairs.filter(([a, b]) => a < b).length, same = pairs.length - up - down;
    return ` Against ${cmp.label}: ${up} rose, ${down} fell${same ? `, ${same} held` : ''}.`;
  })();
  // Changed since a snapshot (#191), in words.
  const sinceCap = since ? since.label.charAt(0).toUpperCase() + since.label.slice(1) : '';
  const sinceSentence = (d: ChartDatum, k: string, fmt: (v: number) => string) => {
    if (!since || !changedAt(d, k)) return '';
    if (sinceNew(d)) return `New ${since.label}.`;
    const was = sinceWas(d, k)!, now = d[k] as number;
    return `${now > was ? 'Up' : 'Down'} ${changeWords(now, was, fmt).slice(1)} ${since.label}.`;
  };
  const sinceWords = (() => {
    if (!since || !sinceMap) return '';
    if (!changedCount) return ` Nothing changed ${since.label}.`;
    // The largest relative change, to name first.
    let top: { d: ChartDatum; k: string; r: number } | null = null;
    for (const d of data) for (const k of sinceSeries) {
      const was = changedAt(d, k) ? sinceWas(d, k) : null;
      if (was === null || was === 0) continue;
      const r = Math.abs(((d[k] as number) - was) / was);
      if (!top || r > top.r) top = { d, k, r };
    }
    const fmt = (k: string) => allSeries.find((q) => q.key === k)?.format ?? fmtY;
    const most = top ? `, most of all ${info.label ? info.label(top.d) : formatX(top.d[xKey])}${sinceSeries.length > 1 ? ` (${allSeries.find((q) => q.key === top!.k)?.label})` : ''}, ${sinceSentence(top.d, top.k, fmt(top.k)).replace(` ${since.label}.`, '').toLowerCase()}` : '';
    return ` ${changedCount} of ${data.length} changed ${since.label}${most}.`;
  })();
  const generated = (focusWords ? focusWords + ' ' : '') + (info.summary ?? describe(info.kind ?? 'Chart', series, data, xKey, formatX, kind, statusOf)) + cmpWords + sinceWords;
  /** A record's short name: the chart type's, or its x. */
  const labelOf = (d: ChartDatum) => (info.label ? info.label(d) : formatX(d[xKey]));
  const selectedRecord = selecting ? data.find(isSelected) : undefined;
  const selectedWords = selectedRecord ? labelOf(selectedRecord) : hasSelection ? formatX(info.selected) : '';
  const titleId = title ? `${id}-t` : undefined, takeId = takeaway ? `${id}-k` : undefined, descId = description ? `${id}-d` : undefined, sumId = `${id}-s`;
  // The head: a title, or with a takeaway, the title as a label over the takeaway as the heading; then the description.
  const head = (title || takeaway || description) ? (
    <div className="alt-chart-head" data-takeaway={takeaway ? '' : undefined}>
      {title && <div id={titleId} className="alt-chart-title">{title}</div>}
      {takeaway && <ChartTakeaway id={takeId!}>{takeaway}</ChartTakeaway>}
      {description && <p id={descId} className="alt-chart-desc">{description}</p>}
    </div>
  ) : null;
  const labelledBy = (rest['aria-labelledby'] as string | undefined) ?? titleId;
  const vars: Record<string, string> = {};
  for (const s of series) vars[`--color-${cssKey(s.key)}`] = s.color;
  if ((aspect == null || aspect === 'banked') && height == null) aspect = 2;
  // A chart whose content sets its height (a calendar's weeks) gets that height for the width it has; so does a banked
  // one, its data area at the banked ratio.
  const fitHeight = info.fitHeight && W && data.length ? Math.ceil(info.fitHeight(Math.max(0, W - (grid ? info.left ?? 0 : 0) - right))) + TOP + bottom
    : bankRatio && W ? Math.round(Math.max(0, W - Math.round(target.left) - right) / bankRatio) + TOP + bottom : null;

  // The table view (#64): the same records as a DataTable, x first, a column per series, a Total for stacks.
  const viewsOn = views !== undefined && views !== false;
  const [viewOwn, setViewOwn] = React.useState<'chart' | 'table'>(views === 'table' ? 'table' : 'chart');
  const view = viewProp ?? viewOwn;
  const setView = (v: string) => { const next = v === 'table' ? 'table' : 'chart'; onViewChange?.(next); if (viewProp === undefined) setViewOwn(next); };
  const table = viewsOn ? (() => {
    const total = /stacked/i.test(info.kind ?? '');
    const isNum = (v: unknown): v is number => typeof v === 'number' && isFinite(v);
    const sum = (d: ChartDatum) => allSeries.reduce((t, s) => t + (isNum(d[s.key]) ? (d[s.key] as number) : 0), 0);
    const columns = info.columns ?? [
      { key: '__x', header: xLabel ?? (xKey.charAt(0).toUpperCase() + xKey.slice(1)), cell: (d: ChartDatum) => formatX(d[xKey]),
        sortValue: (d: ChartDatum) => (kind === 'band' ? (datedBands ? toTime(d[xKey]) : String(d[xKey])) : kind === 'time' ? toTime(d[xKey]) : Number(d[xKey])) },
      ...allSeries.map((s) => ({ key: s.key, header: s.label, align: 'end' as const,
        cell: (d: ChartDatum) => (isNum(d[s.key]) ? s.format(d[s.key] as number) : '—'), sortValue: (d: ChartDatum) => (isNum(d[s.key]) ? (d[s.key] as number) : -Infinity) })),
      ...(total ? [{ key: '__total', header: 'Total', align: 'end' as const, cell: (d: ChartDatum) => allSeries[0].format(sum(d)), sortValue: sum }] : []),
      ...(bandInfo ? [{ key: '__band', header: bandInfo.label, align: 'end' as const,
        cell: (d: ChartDatum) => { const b = bandInfo!, f = allSeries.find((s) => s.key === b.series)?.format ?? fmtY; return isNum(d[b.low]) && isNum(d[b.high]) ? `${f(d[b.low] as number)}–${f(d[b.high] as number)}` : '—'; } }] : []),
      // Changed since a snapshot (#191): a column of changes per series.
      ...(sinceMap && since ? allSeries.map((q) => ({ key: `__since:${q.key}`, header: allSeries.length > 1 ? `${q.label}, ${since.label}` : sinceCap, align: 'end' as const,
        cell: (d: ChartDatum) => (!isFiniteNum(d[q.key]) ? '—' : sinceNew(d) ? 'New' : !changedAt(d, q.key) ? 'No change' : changeWords(d[q.key] as number, sinceWas(d, q.key)!, q.format)) })) : []),
      // The record before (#189): its value, and the change against it.
      ...(cmp ? [
        { key: '__cmp', header: cmp.label, align: 'end' as const, cell: (d: ChartDatum) => { const w = cmpBefore(d); return w === null ? '—' : cmpFmt(w); }, sortValue: (d: ChartDatum) => cmpBefore(d) ?? -Infinity },
        { key: '__cmpd', header: `vs ${cmp.label}`, align: 'end' as const, cell: (d: ChartDatum) => { const n = cmpNow(d), w = cmpBefore(d); return n === null || w === null ? '—' : changeWords(n, w, cmpFmt); },
          sortValue: (d: ChartDatum) => { const n = cmpNow(d), w = cmpBefore(d); return n === null || w === null || w === 0 ? -Infinity : (n - w) / Math.abs(w); } },
      ] : []),
      // Data that isn't yet the record says so in its own column, so the table never passes it off as settled.
      ...(info.status && data.some((d) => statusOf(d)) ? [{ key: '__status', header: 'Status', cell: (d: ChartDatum) => { const st = statusOf(d); return st ? CHART_STATUS_WORDS[st] : 'Actual'; } }] : []),
    ];
    return <DataTable columns={columns} rows={data} getRowId={rowKey} aria-label={typeof title === 'string' ? `${title}, data` : 'Chart data'} />;
  })() : null;

  // The brush gets every record, where the window is in them, and how to say a date; it sets the window by its ends' x.
  const brushWiring = brushEl && fullData.length > 1 ? (() => {
    const index = new Map(fullData.map((d, i) => [d, i]));
    const at = childProps.window ? data.map((d) => index.get(d)).filter((i): i is number => i !== undefined) : [];
    const key = (brushEl.props.series as string | undefined) ?? series[0]?.key ?? allSeries[0]?.key;
    const s = allSeries.find((c) => c.key === key);
    return {
      full: fullData, xKey, seriesKey: key, color: s?.color ?? 'var(--data-1)', locale,
      value: (at.length ? [Math.min(...at), Math.max(...at)] : [0, fullData.length - 1]) as [number, number],
      dated: kind === 'time' || datedBands, formatX,
      onChange: ([i, j]: [number, number]) => {
        const w = { start: fullData[i][xKey] as string | number, end: fullData[j][xKey] as string | number };
        (ownProps.onWindowChange as ((w: { start: string | number; end: string | number }) => void) | undefined)?.(w);
        if (ownProps.window === undefined) setBrushWindow(w);
      },
    };
  })() : undefined;

  const svgKids = kids.filter((k) => typeof k.type === 'string' || !(k.type as ChartChild).chartHtml);
  const htmlKids = kids.filter((k) => typeof k.type !== 'string' && (k.type as ChartChild).chartHtml);
  const top = draw(layers[layers.length - 1].frame);
  const countText = filtered ? (countLabel ?? ((m: number, n: number) => `${m} of ${n} match`))(matchCount, data.length) : '';
  // References and annotations are read after the summary, written or generated: "1 annotation: v2 launch, Mar 4, 2026."
  const overlayWords = (() => {
    if (!data.length) return '';
    let out = summary && focusWords ? ` ${focusWords}` : '';
    const shown = top.refGeo;
    if (shown.length) {
      const items = shown.map((g) => {
        const r = refs[g.i], fmt = (n: number) => (allSeries.find((q) => q.key === (r.series ?? series[0]?.key))?.format ?? fmtY)(n);
        return Array.isArray(r.y) ? `${g.text}, ${fmt(Math.min(...r.y))} to ${fmt(Math.max(...r.y))}` : typeof r.y === 'number' ? `${g.text} at ${fmt(r.y)}` : g.text;
      });
      out += ` ${items.length === 1 ? 'Reference' : 'References'}: ${items.join('; ')}.`;
    }
    if (notes.length) out += ` ${notes.length} ${notes.length === 1 ? 'annotation' : 'annotations'}: ${notes.map((n) => `${n.label}, ${formatX(n.x)}`).join('; ')}.`;
    if (selecting) out += ` Filtered to ${selectedWords}.`;
    else if (filtered) out += ` ${countText}.`;
    if (pins.length) out += ` Pinned: ${pins.map((x) => `${formatX(x)}, ${pinValues(pinRecord(x), true)}`).join('; ')}.`;
    return out;
  })();

  /** With views on: the head beside a Chart | Table control, and the two views stacked in one box, cross-fading. */
  const wrapViews = (plot: React.ReactElement) => !viewsOn ? plot : (
    <Tabs variant="segmented" value={view} onValueChange={setView} className="alt-chart-tabs">
      <div className="alt-chart-bar">
        {head ?? <div className="alt-chart-head" />}
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
    if (childType?.chartNearest) return childType.chartNearest(childProps, top.ctx, clientX - r.left - top.left, clientY - r.top - TOP);
    const along = horizontal ? clientY - r.top - TOP : clientX - r.left - top.left;
    let best = -1, bd = Infinity;
    top.ctx.data.forEach((d, i) => { const dd = Math.abs(top.ctx.xOf(d) - along); if (dd < bd) { bd = dd; best = i; } });
    return best < 0 ? null : best;
  };
  const holdTouch = React.useRef<{ timer: number; x: number; y: number; id: number; open?: boolean; t?: number } | null>(null);
  const onPointerMove = (e: React.PointerEvent) => {
    if (!tooltipOn) return;
    if (e.pointerType !== 'touch') { show(nearest(e.clientX, e.clientY)); return; }
    const h = holdTouch.current;
    if (h && !sticky.current && Math.hypot(e.clientX - h.x, e.clientY - h.y) > 8) { window.clearTimeout(h.timer); holdTouch.current = null; }
    if (sticky.current && h) show(nearest(e.clientX, e.clientY));
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (!tooltipOn || e.pointerType !== 'touch') return;
    const el = e.currentTarget as HTMLElement, id = e.pointerId, x = e.clientX, y = e.clientY;
    const open = sticky.current, t = Date.now();
    holdTouch.current = { x, y, id, open, t, timer: window.setTimeout(() => {
      // Press and hold shows the readout; dragging then scrubs along x; lifting leaves it until a tap elsewhere.
      sticky.current = true;
      hold('pointer', true);
      try { el.setPointerCapture(id); } catch { /* the pointer may be gone */ }
      show(nearest(x, y));
    }, 250) };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const h = holdTouch.current;
    if (h) { window.clearTimeout(h.timer); if (!sticky.current) holdTouch.current = null; }
    // A tap (released before the hold that shows the readout) selects or drills, where marks act.
    if (interactive && e.pointerType === 'touch' && h && !sticky.current) { const i = nearest(e.clientX, e.clientY); const d = i === null ? null : recordAt(i); if (d) activate(d); }
    // With the touch readout open, a quick tap on the plot pins the reading (#190).
    else if (!interactive && pinMax && e.pointerType === 'touch' && h?.open && Date.now() - (h.t ?? 0) < 250 && Math.hypot(e.clientX - h.x, e.clientY - h.y) < 8) { const i = nearest(e.clientX, e.clientY); const d = i === null ? null : recordAt(i); if (d) pinAt(d); }
  };
  /** The record a shown mark stands for, by its key: the shown rows glide, but what's chosen is the record itself. */
  const recordAt = (i: number) => { const shown = top.ctx.data[i]; if (!shown) return null; const k = rowKey(shown); return data.find((d) => rowKey(d) === k) ?? null; };
  const onClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a, .alt-chart-note')) return;
    if ((e.nativeEvent as PointerEvent).pointerType === 'touch') return;
    // Where a click doesn't select or drill, it pins the reading under the pointer (#190).
    if (!interactive) { if (pinMax && tooltipOn) { const i = nearest(e.clientX, e.clientY); const d = i === null ? null : recordAt(i); if (d) pinAt(d); } return; }
    const i = nearest(e.clientX, e.clientY);
    const d = i === null ? null : recordAt(i);
    if (d) activate(d);
  };
  const onPointerLeave = (e: React.PointerEvent) => { if (e.pointerType !== 'touch' && !sticky.current) { show(null); hold('pointer', false); } };
  const onPointerEnter = (e: React.PointerEvent) => { if (e.pointerType !== 'touch') hold('pointer', true); };
  React.useEffect(() => {
    if (activeIdx === null || !sticky.current) return;
    const away = (e: PointerEvent) => { if (!plotRef.current?.contains(e.target as Node)) { sticky.current = false; holdTouch.current = null; show(null); hold('pointer', false); } };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [activeIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // The readout keeps its last record while it leaves, so its exit shows what it said.
  const lastActive = React.useRef<ChartDatum | null>(null);
  if (top.ctx.active) lastActive.current = top.ctx.active;
  const { mounted: tipMounted, state: tipState } = usePresence(tooltipOn && activeIdx !== null && !!top.ctx.active, 160);
  const single = series.length <= 1 || !!info.flat;
  const navKey = (n: Nav) => (n.level === 'summary' ? 'sum' : n.level === 'series' ? `s${n.s}` : `p${n.s}-${n.p}`);
  useIsoLayoutEffect(() => { if (wantFocus.current) { navRefs.current.get(wantFocus.current)?.focus(); wantFocus.current = null; } });
  const go = (n: Nav) => { setNav(n); wantFocus.current = navKey(n); show(n.level === 'points' ? n.p : null); };
  const num = (v: unknown): v is number => typeof v === 'number' && isFinite(v);
  const stacked = /stacked/i.test(info.kind ?? '');
  const summaryText = (typeof summary === 'string' ? summary : generated) + overlayWords;
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
    if (childType?.chartName) {
      let named = childType.chartName(childProps, top.ctx, d);
      if (series.some((x) => glowing(rowKey(d), x.key))) named += ' Changed.';
      if (relevanceOf(d) === 'miss' && !selecting) named += ' Not matching.';
      return named;
    }
    const v = d[s.key];
    const st = statusOf(d);
    let out = `${formatX(d[xKey])}, ${s.label}, ${num(v) ? s.format(v) : 'no data'}${st ? `, ${CHART_STATUS_WORDS[st].toLowerCase()}` : ''}.`;
    // A mark that glows because it changed since a snapshot says how, below, rather than just "Changed."
    if (glowing(rowKey(d), s.key) && !sinceSentence(d, s.key, s.format)) out += ' Changed.';
    if (relevanceOf(d) === 'miss' && !selecting) out += ' Not matching.';
    if (bandInfo && bandInfo.series === s.key && num(d[bandInfo.low]) && num(d[bandInfo.high])) {
      out += ` ${bandInfo.label} ${s.format(d[bandInfo.low] as number)} to ${s.format(d[bandInfo.high] as number)}.`;
    }
    if (cmp && cmp.series === s.key && cmpSentence(d)) out += ` ${cmpSentence(d)}`;
    if (sinceSentence(d, s.key, s.format)) out += ` ${sinceSentence(d, s.key, s.format)}`;
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
      if (cmp && cmp.series === null && cmpSentence(d)) out += ` Total ${cmpSentence(d).charAt(0).toLowerCase()}${cmpSentence(d).slice(1)}`;
    }
    return `${out} ${pi + 1} of ${data.length}.`;
  };
  const onNavKey = (e: React.KeyboardEvent) => {
    const n = series.length, m = data.length, page = Math.max(1, Math.round(m * 0.1));
    const at: Nav = { level: nav.level, s: navS, p: navP };
    let next: Nav | null = null;
    // The chart type may move the keyboard itself: a grid by row and column.
    const moved = at.level === 'points' && childType?.chartMove && /^(Arrow|Home$|End$|Page)/.test(e.key) ? childType.chartMove(childProps, top.ctx, at.p, e) : null;
    // Escape clears the last pin, then a selection, then goes back up a level. P pins the reading at the point (#190).
    if (e.key === 'Escape' && pins.length) { e.preventDefault(); e.stopPropagation(); unpin(pins[pins.length - 1]); return; }
    if (e.key === 'Escape' && selecting) { e.preventDefault(); e.stopPropagation(); info.onSelect?.(null); return; }
    if ((e.key === 'p' || e.key === 'P') && pinMax && at.level === 'points' && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); const d = recordAt(at.p); if (d) pinAt(d); return; }
    if (at.level === 'summary') {
      // Into the records at the chart type's first (Ctrl+Home): the leftmost dot, the grid's first cell.
      const first = single && childType?.chartMove ? childType.chartMove(childProps, top.ctx, 0, { key: 'Home', ctrlKey: true, metaKey: false } as React.KeyboardEvent) ?? 0 : 0;
      if (e.key === 'Enter' || e.key === ' ') next = single ? { level: 'points', s: 0, p: first } : { level: 'series', s: 0, p: 0 };
    } else if (at.level === 'series') {
      const step: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (e.key in step) next = { ...at, s: (at.s + step[e.key] + n) % n };
      else if (e.key === 'Home') next = { ...at, s: 0 };
      else if (e.key === 'End') next = { ...at, s: n - 1 };
      else if (e.key === 'Enter' || e.key === ' ') next = { level: 'points', s: at.s, p: 0 };
      else if (e.key === 'Escape') next = { ...at, level: 'summary' };
    } else if (interactive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault(); e.stopPropagation();
      const d = data[at.p];
      if (d) activate(d);
      return;
    } else if (moved !== null) {
      next = { ...at, p: moved };
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
      return <div {...common('sum', true)} className="alt-chart-node" data-level="summary" aria-roledescription="chart" style={plotBox} data-drill-focus=""
        aria-label={`${summaryText} Press Enter to explore ${single ? 'the data' : 'the series'}.`} />;
    }
    if (nav.level === 'series') {
      return navOrder.map((si, i) => <div {...common(`s${i}`, i === navS)} className="alt-chart-node" data-level="series" aria-roledescription="series" style={plotBox}
        aria-label={`${seriesName(si)} ${i + 1} of ${series.length}.`} />);
    }
    const s = series[navOrder[navS]];
    return data.map((d, i) => {
      const shown = top.ctx.data[i] ?? d;
      const v = shown[s.key];
      const [px, py] = ChartPointFn ? ChartPointFn(childProps, top.ctx, shown, s.key) : [top.ctx.xOf(shown), num(v) ? top.ctx.y(v) : top.ctx.ground];
      const at = horizontal && !ChartPointFn ? [num(v) ? top.ctx.y(v) : top.ctx.ground, top.ctx.xOf(shown)] : [px, py];
      const box = childType?.chartBox?.(childProps, top.ctx, shown);
      return <div {...common(`p${navS}-${i}`, i === navP)} className="alt-chart-node" data-level="point" data-shape={box ? 'cell' : undefined} aria-roledescription={grid ? 'cell' : 'data point'}
        aria-pressed={info.onSelect && !info.drill ? isSelected(d) : undefined} aria-haspopup={info.drill ? 'true' : undefined}
        style={box ? { left: top.left + box[0], top: TOP + box[1], width: box[2], height: box[3] } : { left: top.left + at[0] - 7, top: TOP + at[1] - 7, width: 14, height: 14 }} aria-label={pointName(navOrder[navS], i) + (interactive ? ` Press Enter to ${info.drill ? 'open it' : isSelected(d) ? 'clear the filter' : 'filter to it'}.` : '')} />;
    });
  })();

  const readout = (() => {
    const d = top.ctx.active ?? lastActive.current;
    if (!tipMounted || !d) return null;
    const own = childType?.chartReadout?.(childProps, top.ctx, d);
    const payload: ChartTooltipItem[] = own ? own.items : top.ctx.series
      .filter((s) => typeof d[s.key] === 'number' && isFinite(d[s.key] as number) && top.ctx.alpha(null, s.key) > 0.5)
      .flatMap((s) => {
        const e = encode(s.key);
        const item: ChartTooltipItem = { key: s.key, label: s.label, value: d[s.key] as number, text: top.ctx.format(s.key, d[s.key] as number), color: e.stroke, dash: e.dash };
        const b = bandInfo;
        if (!b || b.series !== s.key || !num(d[b.low]) || !num(d[b.high])) return [item];
        // The uncertainty band's row: its low and high, named by what the band is ("Range 10th–90th percentile").
        return [item, { key: `${s.key}-range`, label: b.label, value: d[b.high] as number, text: `${top.ctx.format(s.key, d[b.low] as number)}–${top.ctx.format(s.key, d[b.high] as number)}`, color: e.stroke, range: true }];
      })
      // Focused series first (#188).
      .sort((a, b) => +inContext(a.key.replace(/-range$/, '')) - +inContext(b.key.replace(/-range$/, '')));
    // Changed since a snapshot (#191): each changed series' old value and the change.
    if (!own && sinceMap) for (const q of top.ctx.series) {
      if (!changedAt(d, q.key)) continue;
      const was = sinceWas(d, q.key);
      payload.push({ key: `__since:${q.key}`, label: top.ctx.series.length > 1 ? `${q.label}, ${since!.label}` : sinceCap, value: was ?? 0,
        text: sinceNew(d) || was === null ? 'New' : `${q.format(was)} · ${changeWords(d[q.key] as number, was, q.format)}`, color: 'var(--ink-muted)' });
    }
    // The record before (#189): its value and the change, after the series.
    const cmpNowV = cmpNow(d), cmpWas = cmpBefore(d);
    if (!own && cmp && cmpNowV !== null && cmpWas !== null) {
      payload.push({ key: COMPARE_KEY, label: cmp.label, value: cmpWas, text: `${cmpFmt(cmpWas)} · ${changeWords(cmpNowV, cmpWas, cmpFmt)}`, color: 'var(--ink-muted)' });
    }
    const at = top.ctx.xOf(d);
    const style: React.CSSProperties = {};
    let side: string;
    if (grid || xy) {
      // A cell or a dot is read where it is: the readout beside it, on the side with more room, never over it.
      const [px, py] = childType?.chartPoint ? childType.chartPoint(childProps, top.ctx, d, series[0]?.key ?? '') : [at, 0];
      side = top.left + px > W / 2 ? 'left' : 'right';
      style.left = top.left + px + (side === 'left' ? -6 : 6); style.top = TOP + Math.max(0, py - 16);
    } else if (horizontal) { side = at > (H - TOP - bottom) / 2 ? 'above' : 'below'; style.right = 4; style.top = TOP + at; }
    else { side = top.left + at > W / 2 ? 'left' : 'right'; style.left = top.left + at; style.top = TOP; }
    const content = tipEl?.props.content ?? <ChartTooltipContent indicator={own?.indicator} />;
    return (
      <div className="alt-chart-readout" aria-hidden="true" data-state={tipState} data-side={side} data-warm={warmTip ? '' : undefined} style={style}>
        {React.cloneElement(content, { label: own ? own.label : d[xKey], payload, formatX: own ? String : formatX, note: (() => { const st = statusOf(d); const words = [st ? CHART_STATUS_WORDS[st] : '', relevanceOf(d) === 'miss' && !selecting ? 'Not matching' : ''].filter(Boolean); return words.length ? words.join(', ') : undefined; })(),
          action: [interactive ? actionWord(d) : '', !pinMax ? '' : pins.some((p) => sameX(p, d[xKey])) ? 'Pinned' : navFocused ? 'P to pin' : interactive ? '' : sticky.current ? 'Tap to pin' : 'Click to pin'].filter(Boolean).join(' · ') || undefined })}
      </div>
    );
  })();

  return (
    <ChartContext.Provider value={top.ctx}>
      <figure className={cx('alt-chart', className)} style={{ ...vars, ...style }} aria-labelledby={labelledBy}
        aria-describedby={[takeId, descId, sumId].filter(Boolean).join(' ')} {...rest}>
        {!viewsOn && head}
        {wrapViews(<div ref={plotRef} className="alt-chart-plot" role="group" aria-roledescription="chart" aria-labelledby={labelledBy} aria-describedby={sumId}
          data-stage={stage} data-patterns={patterns ? '' : undefined} data-refreshing={refreshing ? '' : undefined} aria-busy={refreshing || undefined} style={height != null ? { height } : fitHeight != null ? { height: fitHeight } : { aspectRatio: String(aspect) }}
          onPointerMove={onPointerMove} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { if (holdTouch.current) { window.clearTimeout(holdTouch.current.timer); holdTouch.current = null; } }} onClick={onClick} onPointerLeave={onPointerLeave} onPointerEnter={onPointerEnter}
          data-live={live ? '' : undefined} data-interactive={interactive ? '' : undefined}>
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
              {(patterns || info.status || (env.forced && refs.some((r) => Array.isArray(r.y)))) && (
                <defs>
                  {env.forced && refs.some((r) => Array.isArray(r.y)) && <Hatch id={`${pid}-ref`} kind="fall" bg="Canvas" fg="GrayText" />}
                  {patterns && [...new Set(allSeries.map((s) => s.slot))].map((slot) => {
                    const hatch = ENCODINGS[slot].hatch;
                    return hatch ? <Hatch key={slot} id={`${pid}-${slot}`} kind={hatch} bg={env.forced ? 'Canvas' : `var(--${slot})`} fg={env.forced ? 'CanvasText' : 'var(--surface-raised)'} /> : null;
                  })}
                  {/* Not yet the record: the series colour hatched at 45° on the plot's own colour, with no solid fill. */}
                  {info.status && [...new Set(allSeries.map((s) => s.slot))].map((slot) => (
                    <Hatch key={slot + '-pending'} id={`${pid}-${slot}-pending`} kind="rise" bg={env.forced ? 'Canvas' : 'var(--alt-chart-bg)'} fg={env.forced ? 'CanvasText' : `var(--${slot})`} />
                  ))}
                </defs>
              )}
              {layers.map(({ frame, opacity }, i) => {
                const { ctx, left, pw, ph, xTicks, boundaryAt, refGeo, noteGeo, yInline } = i === layers.length - 1 ? top : draw(frame);
                return (
                  <g key={i} transform={`translate(${left},${TOP})`} opacity={opacity < 1 ? opacity : undefined}>
                    <g className="alt-chart-grid">
                      {!grid && frame.ticks.map((t) => {
                        const at = Math.round(ctx.y(t.v)) + 0.5, end = horizontal ? pw : ph;
                        if (at < 0 || at > end + 1) return null;
                        return horizontal ? <line key={t.v} x1={at} x2={at} y1={0} y2={ph} opacity={t.a < 1 ? t.a : undefined} />
                          : <line key={t.v} x1={0} x2={pw} y1={at} y2={at} opacity={t.a < 1 ? t.a : undefined} />;
                      })}
                    </g>
                    {i === layers.length - 1 && tooltipOn && ctx.active && !grid && !xy && (() => {
                      const at = Math.round(ctx.xOf(ctx.active)) + 0.5;
                      return horizontal ? <line className="alt-chart-crosshair" x1={0} x2={pw} y1={at} y2={at} /> : <line className="alt-chart-crosshair" x1={at} x2={at} y1={0} y2={ph} />;
                    })()}
                    {/* Reference bands and annotation leaders lie under the marks: a flat line-coloured fill, a 1px line-control rule. */}
                    {(refGeo.some((g) => g.band) || noteGeo.length > 0) && (
                      <g className="alt-chart-refs-under">
                        {refGeo.filter((g) => g.band).map((g) => horizontal
                          ? <rect key={g.i} className="alt-chart-ref-band" x={g.from} y={0} width={g.to - g.from} height={ph} fill={env.forced ? `url(#${pid}-ref)` : 'var(--line)'} />
                          : <rect key={g.i} className="alt-chart-ref-band" x={0} y={g.from} width={pw} height={g.to - g.from} fill={env.forced ? `url(#${pid}-ref)` : 'var(--line)'} />)}
                        {noteGeo.map((n) => <line key={n.i} className="alt-chart-note-leader" x1={Math.round(n.at) + 0.5} x2={Math.round(n.at) + 0.5} y1={n.row * 26 + 22} y2={ph} />)}
                      </g>
                    )}
                    {/* Where the record ends: a 1px line-control rule on the ground under the marks, named in words ("Today") over them. */}
                    {boundaryAt !== null && info.boundary !== false && (() => {
                      const at = Math.round(boundaryAt) + 0.5;
                      return <g className="alt-chart-boundary">{horizontal ? <line x1={0} x2={pw} y1={at} y2={at} /> : <line x1={at} x2={at} y1={0} y2={ph} />}</g>;
                    })()}
                    {/* Two pins (#190): their difference under the x axis, between them, on a 1px line-control bracket. */}
                    {i === layers.length - 1 && pins.length === 2 && !horizontal && (() => {
                      const xs = pins.map((p) => { const d = pinRecord(p); return d ? ctx.xOf(d) : NaN; }).filter(isFinite).sort((p, q) => p - q);
                      if (xs.length !== 2) return null;
                      const [a, b] = xs.map((v) => Math.round(v) + 0.5), yb = ph + 30, words = pinDiff(false), w = textWidth(words);
                      const cx = Math.max(w / 2, Math.min(pw - w / 2, (a + b) / 2));
                      return (
                        <g className="alt-chart-pins-strip" aria-hidden="true">
                          <path d={`M${a},${yb - 4}V${yb}H${b}V${yb - 4}`} fill="none" />
                          <text x={cx} y={yb + 15} textAnchor="middle">{words}</text>
                        </g>
                      );
                    })()}
                    {live && <defs><clipPath id={`${pid}-plot-${i}`}><rect x={-3} y={-TOP} width={pw + 9 + right} height={ph + TOP + 6} /></clipPath></defs>}
                    <g className="alt-chart-marks" clipPath={live ? `url(#${pid}-plot-${i})` : undefined}><ChartContext.Provider value={ctx}>{svgKids}</ChartContext.Provider></g>
                    {boundaryAt !== null && info.boundary !== false && (() => {
                      const at = Math.round(boundaryAt) + 0.5, word = info.boundary ?? 'Today';
                      if (horizontal) return <text className="alt-chart-boundary-label" x={pw} y={at - 5} textAnchor="end">{word}</text>;
                      const flip = at + 8 + textWidth(word) > pw;
                      return <text className="alt-chart-boundary-label" x={flip ? at - 5 : at + 5} y={12} textAnchor={flip ? 'end' : 'start'}>{word}</text>;
                    })()}
                    {/* Live: an afterglow on each new or changed mark, a 2px ink outline decaying over dur-settle, with its value for the first second. */}
                    {i === layers.length - 1 && glows.length > 0 && (
                      <g className="alt-chart-glows" aria-hidden="true">
                        {glows.map((g) => {
                          const d = ctx.data.find((r) => rowKey(r) === g.key), v = d?.[g.series];
                          if (!d || typeof v !== 'number' || !isFinite(v)) return null;
                          const MarkFn = (chartChild?.type as ChartChild | undefined)?.chartMark, PointFn = (chartChild?.type as ChartChild | undefined)?.chartPoint;
                          const [px, py] = PointFn ? PointFn(childProps, ctx, d, g.series) : horizontal ? [ctx.y(v), ctx.xOf(d)] : [ctx.xOf(d), ctx.y(v)];
                          const path = MarkFn?.(childProps, ctx, d, g.series);
                          const style = { '--alt-rise-delay': `${g.delay}ms` } as React.CSSProperties;
                          return (
                            <g key={`${g.key}|${g.series}|${g.gen}`} className="alt-chart-glow" data-series={g.series} style={style}>
                              {path ? <path d={path} /> : <circle cx={px} cy={py} r={7} />}
                              <text x={horizontal ? px + 8 : px} y={horizontal ? py : py - 12} dy={horizontal ? '0.32em' : undefined} textAnchor={horizontal ? 'start' : 'middle'}>{ctx.format(g.series, v)}</text>
                            </g>
                          );
                        })}
                      </g>
                    )}
                    {/* Hover is a promise: only where a click selects or drills, the record under the pointer is outlined in 2px ink. */}
                    {i === layers.length - 1 && interactive && ctx.active && (
                      <g className="alt-chart-hover" aria-hidden="true" key={rowKey(ctx.active)}>
                        {ctx.series.filter((s2) => typeof ctx.active![s2.key] === 'number').map((s2) => {
                          const MarkFn = (chartChild?.type as ChartChild | undefined)?.chartMark, PointFn = (chartChild?.type as ChartChild | undefined)?.chartPoint;
                          const path = MarkFn?.(childProps, ctx, ctx.active!, s2.key);
                          const v = ctx.active![s2.key] as number;
                          const [px, py] = PointFn ? PointFn(childProps, ctx, ctx.active!, s2.key) : horizontal ? [ctx.y(v), ctx.xOf(ctx.active!)] : [ctx.xOf(ctx.active!), ctx.y(v)];
                          return path ? <path key={s2.key} d={path} /> : <circle key={s2.key} cx={px} cy={py} r={7} />;
                        })}
                      </g>
                    )}
                    {/* Reference lines over the marks, solid (dashes mean projected), each labelled in caption text. */}
                    {refGeo.length > 0 && (
                      <g className="alt-chart-refs">
                        {refGeo.filter((g) => !g.band).map((g) => {
                          const at = Math.round(g.from) + 0.5;
                          return horizontal ? <line key={g.i} className="alt-chart-ref" data-tone={g.tone} x1={at} x2={at} y1={0} y2={ph} />
                            : <line key={g.i} className="alt-chart-ref" data-tone={g.tone} x1={0} x2={pw} y1={at} y2={at} />;
                        })}
                        {refGeo.map((g) => {
                          const Icon = g.tone === 'critical' ? Icons.AlertCircle : Icons.AlertTriangle;
                          const ix = g.anchor === 'end' ? g.lx - textWidth(g.text) - 18 : g.lx - 18;
                          return (
                            <g key={g.i} className="alt-chart-ref-label" data-tone={g.tone}>
                              {g.tone && <Icon size={14} x={ix} y={g.ly - 11} className="alt-chart-ref-icon" />}
                              <text x={g.lx} y={g.ly} textAnchor={g.anchor}>{g.text}</text>
                            </g>
                          );
                        })}
                      </g>
                    )}
                    {/* The ground line is zero. When zero isn't on the axis, the plot's foot is an ordinary gridline, not ground. */}
                    {grid ? null : horizontal
                      ? <line className={frame.y[0] <= 0 && frame.y[1] >= 0 ? 'alt-chart-ground' : 'alt-chart-floor'} x1={Math.round(ctx.ground) + 0.5} x2={Math.round(ctx.ground) + 0.5} y1={0} y2={ph} />
                      : <line className={frame.y[0] <= 0 && frame.y[1] >= 0 ? 'alt-chart-ground' : 'alt-chart-floor'} x1={0} x2={pw} y1={Math.round(ctx.ground) + 0.5} y2={Math.round(ctx.ground) + 0.5} />}
                    {axes && horizontal && !grid && (
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
                    {axes && !horizontal && !grid && (
                      <>
                        {inlineY
                          ? <g className="alt-chart-axis" data-axis="y" data-inline="">
                            {yInline.map((t) => <text key={t.v} x={0} y={t.at - 4} opacity={t.a < 1 ? t.a : undefined}>{t.text}</text>)}
                          </g>
                          : <g className="alt-chart-axis" data-axis="y">
                            {frame.ticks.map((t) => {
                              const at = ctx.y(t.v);
                              return at >= -1 && at <= ph + 1 ? <text key={t.v} x={-10} y={at} dy="0.32em" textAnchor="end" opacity={t.a < 1 ? t.a : undefined}>{fmtY(t.v)}</text> : null;
                            })}
                          </g>}
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
          {W > 0 && data.length > 0 && top.noteGeo.map((g) => {
            const style: React.CSSProperties = { left: top.left + g.left, top: TOP + g.row * 26, minWidth: g.w };
            // A reading set down (#190): a plate on the ground with a pin, its words, and a ghost button that removes it.
            if (g.pin !== undefined) {
              const x = pins[g.pin], d = pinRecord(x);
              return (
                <span key={`pin-${String(x)}`} className="alt-badge alt-chart-note" data-variant="plate" data-pin="" style={style} role="group" aria-label={`Pinned ${formatX(x)}: ${pinValues(d, true)}`}>
                  <Icons.Pin size={13} className="alt-chart-pin-icon" />
                  <span aria-hidden="true">{pinLabel(x)}</span>
                  <button type="button" className="alt-chart-pin-remove" aria-label={`Remove pin, ${formatX(x)}`} onClick={() => unpin(x)}><Icons.X size={12} /></button>
                </span>
              );
            }
            const n = notes[g.i];
            return n.onSelect
              ? <button key={g.i} type="button" className="alt-badge alt-chart-note" data-variant="plate" style={style} onClick={n.onSelect} aria-label={`${n.label}, ${formatX(n.x)}`}>{n.label}</button>
              : <span key={g.i} className="alt-badge alt-chart-note" data-variant="plate" style={style} aria-hidden="true">{n.label}</span>;
          })}
          <div className="alt-chart-nav" onFocus={() => { setNavFocused(true); hold('focus', true); }}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { setNavFocused(false); hold('focus', false); if (nav.level === 'points') show(null); } }}>
            {nodes}
          </div>
          {readout}
        </div>)}
        {brushWiring && React.cloneElement(brushEl!, { __brush: brushWiring })}
        {/* Filtered in place: the frame says how many match, in words, so the count never depends on seeing the fade. */}
        {filtered && !selecting && !(showOnlyChanged && !info.relevance) && <p className="alt-chart-count" aria-live="polite">{countText}</p>}
        {/* Changed since a snapshot (#191): the count in words, a switch that shows only what changed. */}
        {sinceMap && since && (
          <div className="alt-chart-since" {...sinceDepth}>
            {changedCount ? <Switch label={`${changedCount} changed ${since.label}`} checked={showOnlyChanged} onCheckedChange={setOnlyChanged} /> : <span>Nothing changed {since.label}</span>}
          </div>
        )}
        {/* Selected: the frame says what the chart (and whatever it filters) is narrowed to, with a way back. */}
        {info.onSelect && (
          <div className="alt-chart-selection" aria-live="polite">
            {selecting && <><span>Filtered to {selectedWords}</span><Button variant="ghost" size="sm" onClick={() => info.onSelect?.(null)}>Clear</Button></>}
          </div>
        )}
        {live && (
          <div className="alt-chart-live">
            <span className="alt-chart-updated" {...captionDepth}>
              {pausedNow ? 'Paused. ' : ''}{updatedAt !== null ? `Updated ${clock.format(new Date(updatedAt))}` : 'Live'}{queued && !pausedNow ? ' · new data when you move away' : queued ? ' · new data waiting' : ''}
            </span>
            {pausable && <Switch label="Pause updates" checked={pausedNow} onCheckedChange={(v) => setPaused?.(v)} />}
            <span className="alt-sr" aria-live="polite">{said}</span>
          </div>
        )}
        {legendEl && React.cloneElement(legendEl.props.content ?? <ChartLegendContent />, {
          items: allSeries.map((s) => { const e = encode(s.key); return { key: s.key, label: s.label, fill: e.fill, stroke: e.stroke, dash: e.dash, marker: e.marker, hidden: hidden.includes(s.key), context: e.context, highlighted: !!focusKeys && !e.context }; }),
          swatch: info.swatch ?? 'rect',
          onToggle: (key: string) => setHidden(hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key]),
        })}
        {htmlKids.filter((k) => !(k.type as ChartChild).chartLegend && !(k.type as ChartChild).chartBrush)}
        {pinMax > 0 && <span className="alt-sr" aria-live="polite">{pinSaid}</span>}
        <figcaption id={sumId} className={summary ? 'alt-chart-summary' : 'alt-sr'}>
          {summary ?? generated}
          {summary && overlayWords ? <span className="alt-sr">{overlayWords}</span> : !summary && overlayWords}
        </figcaption>
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
  // Live (#66): while someone reads the plot, or while paused, keep showing what was there; apply what came when they leave.
  const [held, setHeld] = React.useState(false);
  const [pausedOwn, setPausedOwn] = React.useState(false);
  const paused = props.paused ?? pausedOwn;
  const setPaused = (v: boolean) => { props.onPausedChange?.(v); if (props.paused === undefined) setPausedOwn(v); };
  const frozen = React.useRef<ChartDatum[] | null | undefined>(undefined);
  const latest = refetch ? last.current : now;
  const holding = !!props.live && (held || paused) && frozen.current !== undefined;
  const shownNow = holding ? frozen.current : latest;
  if (!holding) frozen.current = latest;
  const liveProps: ChartFrameLive = props.live ? { queued: holding && shownNow !== latest, onHold: setHeld, pausedNow: paused, setPaused } : {};
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
    return <ChartFrame {...props} {...liveProps} {...(fromChild ? {} : { data: rows })} refreshing={props.refreshing || refetch}>{children}</ChartFrame>;
  };
  if (!useHasWaited(waiting)) return withData(shownNow);
  return (
    <Await shape="none" className="alt-chart-await" imprint={(() => {
      const ci = chartChild ? (chartChild.type as ChartChild).chartInfo!({ ...chartChild.props, data: [] }, props.config) : undefined;
      return <ChartImprint {...props} legend={hasLegend} swatch={ci?.swatch} shape={ci?.imprint ?? (ci?.swatch === 'line' ? 'line' : 'bars')} keys={ci?.series} />;
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
const IMPRINT_DOTS = [[8, 74], [15, 62], [21, 78], [28, 55], [35, 66], [42, 48], [49, 60], [56, 40], [62, 52], [69, 34], [76, 45], [83, 26], [26, 36], [71, 70], [90, 18]];
/**
 * A takeaway, as the chart's heading. When its words change with the data it cross-fades (dur-travel-2), as a Stat's
 * value does, without the afterglow: the marks' changes already spend the attention.
 */
function ChartTakeaway({ id, children }: { id: string; children: React.ReactNode }) {
  const text = typeof children === 'string' ? children : null;
  const [prev, setPrev] = React.useState<{ text: string; key: number } | null>(null);
  const shown = React.useRef(text);
  React.useEffect(() => {
    if (shown.current !== null && text !== null && shown.current !== text) setPrev((p) => ({ text: shown.current!, key: (p?.key ?? 0) + 1 }));
    shown.current = text;
  }, [text]);
  React.useEffect(() => {
    if (!prev) return;
    const t = setTimeout(() => setPrev(null), 400);
    return () => clearTimeout(t);
  }, [prev]);
  return (
    <p id={id} className="alt-chart-takeaway">
      <span className="alt-chart-takeaway-text" key={prev?.key ?? 0} data-in={prev ? '' : undefined}>{children}</span>
      {prev && <span className="alt-chart-takeaway-text" key={`out${prev.key}`} data-out="" aria-hidden="true">{prev.text}</span>}
    </p>
  );
}

/**
 * The chart's imprint: the frame (title, description, legend keys from config) with the plot pressed into the page in
 * the chart's shape, `surface-well` with no labels, so it can't be taken for data.
 */
function ChartImprint({ config, title, description, aspect, height, shape = 'bars', legend, keys }: ChartContainerProps & { swatch?: 'rect' | 'line' | 'marker'; shape?: 'bars' | 'line' | 'area' | 'grid' | 'dots'; legend?: boolean; keys?: ChartInfo['series'] }) {
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
            : shape === 'grid'
              ? Array.from({ length: 7 * 12 }, (_, i) => <span key={i} className="alt-skeleton" />)
              : shape === 'dots'
                ? IMPRINT_DOTS.map(([x, y], i) => <span key={i} className="alt-skeleton alt-chart-imprint-dot" style={{ left: `${x}%`, top: `${y}%` }} />)
                : IMPRINT_BARS.map((h, i) => <span key={i} className="alt-skeleton" style={{ height: `${h * 100}%` }} />)}
      </div>
      {legend && (
        <div className="alt-chart-legend" aria-hidden="true">
          {(keys ? keys.map((k) => [k.key, k] as const) : Object.entries(config)).map(([k, c], i) => (
            <span key={k} className="alt-legend-key"><svg className="alt-legend-mark" width="14" height="10"><rect width="14" height="10" rx="2" fill={`var(--${c.color ?? (i < 6 ? `data-${i + 1}` : 'data-other')})`} /></svg><span>{c.label}</span></span>
          ))}
        </div>
      )}
    </figure>
  );
}

/** The generated summary: what kind of chart, which series, the x range, and each series' lowest and highest values. */
function describe(kind: string, series: ChartSeries[], data: ChartDatum[], xKey: string, formatX: (v: unknown) => string, scale: string, status: (d: ChartDatum) => ChartStatus | undefined) {
  if (!data.length || !series.length) return `${kind} with no data.`;
  // Trends are read from the record; what isn't yet the record is said after them.
  const all = data;
  const settled = data.filter((d) => !status(d));
  if (settled.length && settled.length < data.length) data = settled;
  const names = series.map((s) => s.label);
  const list = names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0];
  const first = formatX(all[0][xKey]), last = formatX(all[all.length - 1][xKey]);
  const span = scale === 'band' ? `${all.length} ${all.length === 1 ? 'category' : 'categories'}, ${first} to ${last}` : `${first} to ${last}`;
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
  const notes = (['partial', 'projected'] as ChartStatus[]).map((st) => {
    const rows = all.filter((d) => status(d) === st);
    if (!rows.length) return '';
    const at = rows.length === 1 ? formatX(rows[0][xKey]) : `${formatX(rows[0][xKey])} to ${formatX(rows[rows.length - 1][xKey])}`;
    return st === 'partial' ? ` ${at} ${rows.length === 1 ? 'is' : 'are'} so far, not complete.` : ` ${at} ${rows.length === 1 ? 'is' : 'are'} projected.`;
  }).join('');
  return `${kind} of ${list}, ${span}. ${parts.join(' ')}${notes}`;
}
