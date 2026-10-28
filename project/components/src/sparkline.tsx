import * as React from 'react';
import { cx, useIsoLayoutEffect } from './core';
import { toTime, type ChartDatum } from './chart';
import { linePath } from './line-chart';
import { Arrive, Await, isPromise, readPromised, useArrival, useHasWaited, useReportWaiting } from './suspense';

type SparkData = Array<number | null> | ChartDatum[];

export interface SparklineProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /**
   * The values, oldest first: numbers (a null is a gap), or records with `y` naming the value. Undefined while your
   * data loads, or a promise: until it lands the sparkline is an imprint one line high and its own width.
   */
  data: SparkData | null | undefined | PromiseLike<SparkData | null>;
  /** The key of each record's value, when `data` holds records. */
  y?: string;
  /** The key of each record's date, so the label can say "over 30 days" rather than "over 30 values". */
  x?: string;
  /** A line (default), or bars standing on zero for counts. */
  kind?: 'line' | 'bar';
  /**
   * The colour. 'neutral' (default) is ink-muted: context for the number beside it. 'data' is data-1, when the
   * sparkline is the series itself. A status hue only when the series means good or bad, and the text beside it says so.
   */
  tone?: 'neutral' | 'data' | 'positive' | 'caution' | 'critical';
  /** A normal range, drawn as a flat band behind the line. The label says how many values fall outside it. */
  band?: [number, number];
  /** The width: a number of px or any CSS length. Default 5em. Its height is the line height of the text around it. */
  width?: number | string;
  /** Formats values in the generated label. Default: compact ("1.2K"). */
  format?: (value: number) => string;
  /** Replaces the generated label ("Up 12% over 30 days, from 1.2K to 1.4K."). */
  summary?: string;
  /** The text beside it already says what it shows: hide it from assistive technology. */
  decorative?: boolean;
  locale?: string;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && isFinite(v);
const DAY = 864e5;

function valuesOf(data: SparkData, y?: string): Array<number | null> {
  return data.map((d) => {
    const v = d !== null && typeof d === 'object' ? (y ? (d as ChartDatum)[y] : undefined) : d;
    return isNum(v) ? v : null;
  });
}

/** "Up 12% over 30 days, from 1.2K to 1.4K." Direction in words, the first and last values, and the band if any. */
export function describeTrend(vals: Array<number | null>, opts: { format: (v: number) => string; span?: string; band?: [number, number] }) {
  const nums = vals.filter(isNum);
  if (!nums.length) return 'No data.';
  const { format, band } = opts;
  const span = opts.span ?? `${vals.length} ${vals.length === 1 ? 'value' : 'values'}`;
  const a = nums[0], b = nums[nums.length - 1];
  const rel = a !== 0 ? (b - a) / Math.abs(a) : b - a;
  let out: string;
  if (nums.length === 1) out = `One value, ${format(a)}.`;
  else if (Math.abs(rel) < 0.02) out = `Flat over ${span}, at ${format(b)}.`;
  else {
    const pct = a !== 0 ? `${Math.round(Math.abs(rel) * 100)}% ` : '';
    out = `${rel > 0 ? 'Up' : 'Down'} ${pct}over ${span}, from ${format(a)} to ${format(b)}.`;
  }
  if (nums.length > 2) out += ` Low ${format(Math.min(...nums))}, high ${format(Math.max(...nums))}.`;
  if (band) {
    const outside = nums.filter((v) => v < band[0] || v > band[1]).length;
    out += outside ? ` ${outside} of ${nums.length} outside the normal range.` : ' All within the normal range.';
  }
  return out;
}

/**
 * A word-sized trend: rising, falling, spiky or flat at a glance, beside the number that gives the detail. It's the
 * record in the row it sits in, so it lies flush on the ground like everything a chart draws: a 1.5px stroke (or flat
 * bars), no axes, no gridlines, no readout, no fill under the line. Its height is the line height of the text beside
 * it. The last point wears a 4px marker. Colour is context (ink-muted) unless you say it's the series or a status.
 */
export function Sparkline({ data, ...props }: SparklineProps) {
  const missing = data === undefined;
  useReportWaiting(missing || isPromise(data));
  const arrival = useArrival(missing);
  if (!useHasWaited(missing || isPromise(data))) return <SparkFace {...props} data={data as SparkData | null} />;
  const w = props.width ?? '5em';
  return (
    <Await inline shape="block"
      imprint={<span className="alt-skeleton alt-sparkline-imprint" style={{ width: w }} />}>
      <Arrive when={arrival}><SparkLanded {...props} data={data} /></Arrive>
    </Await>
  );
}
function SparkLanded({ data, ...props }: SparklineProps) {
  return <SparkFace {...props} data={isPromise(data) ? readPromised(data as PromiseLike<SparkData | null>) : (data as SparkData | null)} />;
}

function SparkFace({ data, y: yKey, x: xKey, kind = 'line', tone = 'neutral', band, width = '5em', format, summary, decorative, locale, className, style, ...rest }: Omit<SparklineProps, 'data'> & { data: SparkData | null }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [size, setSize] = React.useState<{ w: number; h: number } | null>(null);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize((s) => (s && s.w === el.clientWidth && s.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight }));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rows = data ?? [];
  const vals = valuesOf(rows, yKey);
  const nums = vals.filter(isNum);
  const fmt = React.useMemo(() => format ?? ((v: number) => new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(v)), [format, locale]);

  // "over 30 days" when the records carry daily dates; otherwise "over 30 values".
  let span: string | undefined;
  if (xKey && rows.length > 1 && typeof rows[0] === 'object') {
    const ts = (rows as ChartDatum[]).map((d) => toTime(d[xKey])).filter((t) => isFinite(t));
    if (ts.length > 1) {
      const days = Math.round((Math.max(...ts) - Math.min(...ts)) / DAY) + 1;
      if (days === rows.length) span = `${days} days`;
    }
  }
  const label = summary ?? describeTrend(vals, { format: fmt, span, band });
  const named = rest['aria-label'] ? `${rest['aria-label']}. ${label}` : label;

  let marks: React.ReactNode = null;
  if (size && size.w > 0 && size.h > 0 && nums.length) {
    const W = size.w, H = size.h;
    let lo = Math.min(...nums), hi = Math.max(...nums);
    if (band) { lo = Math.min(lo, band[0]); hi = Math.max(hi, band[1]); }
    // Bars stand on zero, as every bar does; a line needn't include it.
    if (kind === 'bar') { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
    if (lo === hi) { lo -= 1; hi += 1; }
    // Room for the stroke and the end marker at the top and bottom.
    const pad = kind === 'line' ? 2.5 : 0;
    const yOf = (v: number) => H - pad - ((v - lo) / (hi - lo)) * (H - pad * 2);
    const bandRect = band ? <rect className="alt-sparkline-band" x={0} width={W} y={yOf(band[1])} height={Math.max(1, yOf(band[0]) - yOf(band[1]))} /> : null;
    if (kind === 'bar') {
      const n = vals.length, gap = n > 1 ? 1 : 0;
      const bw = Math.max(1, (W - gap * (n - 1)) / n);
      const zero = yOf(0);
      marks = (
        <>
          {bandRect}
          {vals.map((v, i) => (isNum(v) && v !== 0
            ? <rect key={i} className="alt-sparkline-bar" x={i * (bw + gap)} width={bw} y={Math.min(zero, yOf(v))} height={Math.max(0.5, Math.abs(yOf(v) - zero))} />
            : null))}
        </>
      );
    } else {
      // The x of each value: by its date when records carry one, otherwise evenly spaced. 2.5px in from each end so the marker fits.
      const n = vals.length;
      const ts = xKey && typeof rows[0] === 'object' ? (rows as ChartDatum[]).map((d) => toTime(d[xKey])) : null;
      const t0 = ts ? Math.min(...ts.filter((t) => isFinite(t))) : 0, t1 = ts ? Math.max(...ts.filter((t) => isFinite(t))) : 0;
      const xOf = (i: number) => 2.5 + (ts && t1 > t0 && isFinite(ts[i]) ? (ts[i] - t0) / (t1 - t0) : n > 1 ? i / (n - 1) : 0.5) * (W - 5);
      const pts = vals.map((v, i) => (isNum(v) ? ([xOf(i), yOf(v)] as [number, number]) : null));
      let last = pts.length - 1;
      while (last >= 0 && !pts[last]) last--;
      marks = (
        <>
          {bandRect}
          <path className="alt-sparkline-line" d={linePath(pts.map((p) => (p ? [+p[0].toFixed(2), +p[1].toFixed(2)] : null)))} />
          {last >= 0 && <circle className="alt-sparkline-end" cx={pts[last]![0]} cy={pts[last]![1]} r={2} />}
        </>
      );
    }
  }

  return (
    <span ref={ref} className={cx('alt-sparkline', className)} data-kind={kind} data-tone={tone}
      role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} {...rest} aria-label={decorative ? undefined : named}
      style={{ width: typeof width === 'number' ? `${width}px` : width, ...style }}>
      {size && <svg width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true" focusable="false">{marks}</svg>}
    </span>
  );
}
