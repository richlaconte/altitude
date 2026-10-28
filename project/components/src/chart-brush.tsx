import * as React from 'react';
import { cx, useIsoLayoutEffect } from './core';
import { useRange } from './controls';
import { toTime, type ChartDatum } from './chart';

export interface ChartBrushProps {
  /** The series the overview draws. Default: the chart's first shown series. */
  series?: string;
  /** The overview's name. Default "Overview, <its whole range>". */
  'aria-label'?: string;
  className?: string;
}

/** What the frame hands the brush: every record, where the window is in them, and how to say an x. */
interface BrushWiring {
  full: ChartDatum[];
  xKey: string;
  seriesKey: string;
  color: string;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  dated: boolean;
  formatX: (v: unknown) => string;
  locale?: string;
}

const HEIGHT = 40;

/**
 * Pick a time window on an overview (#74): put it inside a LineChart, AreaChart or BarChart over time. The overview is an
 * opening, the whole series drawn as a flat line in a trench, because it's a track you slide along; the window is a raised lens
 * over it (level 1, accent rim, clear face) whose two grips are a range Slider's thumbs. Outside the window the overview
 * recedes. Drag the lens to pan, a grip to resize, or press outside it to centre the window there.
 */
export function ChartBrush({ __brush, ...props }: ChartBrushProps & { __brush?: BrushWiring }) {
  return __brush ? <Brush {...props} {...__brush} /> : null;
}
ChartBrush.chartHtml = true;
ChartBrush.chartBrush = true;

function Brush({ full, xKey, seriesKey, color, value, onChange, dated, formatX, locale, className, 'aria-label': label }: ChartBrushProps & BrushWiring) {
  const n = full.length;
  const r = useRange({ value, onValueChange: onChange, min: 0, max: n - 1, step: 1, minStepsBetween: 1, outside: 'centre' });
  const [lo, hi] = r.value;
  const grips = React.useRef<(HTMLDivElement | null)[]>([]);
  const lens = React.useRef<HTMLDivElement>(null);
  const [w, setW] = React.useState(0);
  useIsoLayoutEffect(() => {
    const el = r.track.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Dates are said whole and in UTC, as the chart's axis places them: "1 Mar – 30 Apr 2026".
  const df = React.useMemo(() => new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }), [locale]);
  const say = (i: number) => (dated ? df.format(new Date(toTime(full[i][xKey]))) : formatX(full[i][xKey]));
  const span = (a: number, b: number) => {
    if (!dated) return `${say(a)} – ${say(b)}`;
    const fr = (df as Intl.DateTimeFormat & { formatRange?: (a: Date, b: Date) => string }).formatRange;
    return fr ? fr.call(df, new Date(toTime(full[a][xKey])), new Date(toTime(full[b][xKey]))) : `${say(a)} – ${say(b)}`;
  };
  const shown = span(lo, hi);

  // The overview: the series as a flat line in the trench, every record evenly spaced, as the grips step through them.
  // Like a Sparkline's line it spans its own low to high: it's there for the shape, and an area that doesn't stand on
  // zero would misstate every value.
  const vals = full.map((d) => (typeof d[seriesKey] === 'number' && isFinite(d[seriesKey] as number) ? (d[seriesKey] as number) : null));
  const nums = vals.filter((v): v is number => v !== null);
  const v0 = Math.min(...nums), v1 = Math.max(...nums);
  const px = (i: number) => (n > 1 ? (i / (n - 1)) * w : 0);
  const py = (v: number) => HEIGHT - 7 - ((v - v0) / (v1 - v0 || 1)) * (HEIGHT - 14);
  let line = '', pen = false;
  vals.forEach((v, i) => { if (v === null) { pen = false; return; } line += `${pen ? 'L' : 'M'}${px(i).toFixed(1)},${py(v).toFixed(1)}`; pen = true; });
  const clip = React.useId().replace(/[^\w-]/g, '');
  const overview = <path className="alt-brush-line" d={line} fill="none" stroke={color} />;

  // The lens pans by keyboard as the grips step: arrows by a record, Page Up/Down by a tenth, Home/End to the ends.
  const panKeys = (e: React.KeyboardEvent) => {
    const big = Math.max(1, Math.round((n - 1) / 10));
    const d: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: big, PageDown: -big, Home: -lo, End: n - 1 - hi };
    if (e.key in d) { e.preventDefault(); r.shift(d[e.key]); }
  };
  const isHeld = (i: 0 | 1) => r.held === i || r.held === 'both' || r.held === 'tie';
  const range = label ?? `Overview, ${span(0, n - 1)}`;
  return (
    <div className={cx('alt-brush', className)} role="group" aria-label={range} data-dragging={r.held !== null ? '' : undefined}>
      <div className="alt-brush-slide" onPointerDown={(e) => {
        const t = (e.target as HTMLElement).closest('.alt-brush-grip') as HTMLElement | null;
        const i = r.press(e, t ? (Number(t.dataset.thumb) as 0 | 1) : undefined);
        if (i === 0 || i === 1) grips.current[i]?.focus(); else lens.current?.focus();
      }}
      onPointerMove={r.drag} onPointerUp={r.release} onPointerCancel={r.release}>
      <div className="alt-brush-track" ref={r.track} style={{ height: HEIGHT }}>
        {w > 0 && (
          <svg className="alt-brush-svg" width={w} height={HEIGHT} aria-hidden="true" focusable="false">
            <defs><clipPath id={clip}><rect x={px(lo)} y={0} width={Math.max(0, px(hi) - px(lo))} height={HEIGHT} /></clipPath></defs>
            {/* Outside the window the overview recedes; inside it, it's at full strength. */}
            <g className="alt-brush-outside" opacity={0.35}>{overview}</g>
            <g className="alt-brush-inside" clipPath={`url(#${clip})`}>{overview}</g>
          </svg>
        )}
      </div>
      <div ref={lens} className="alt-brush-lens" role="group" tabIndex={0} aria-label={`Window, ${shown}`} onKeyDown={panKeys}
        data-grabbed={r.held === 'both' ? '' : undefined} style={{ left: r.pct(lo) + '%', width: r.pct(hi) - r.pct(lo) + '%' }} />
      {([0, 1] as const).map((i) => {
        const [a, b] = r.bounds(i), x = r.value[i];
        return (
          <div key={i} ref={(el) => { grips.current[i] = el; }} className="alt-brush-grip" role="slider" data-thumb={i} tabIndex={0}
            aria-label={i === 0 ? 'Window start' : 'Window end'} aria-valuemin={a} aria-valuemax={b} aria-valuenow={x} aria-valuetext={say(x)}
            data-grabbed={r.held !== null && isHeld(i) ? '' : undefined} style={{ left: r.pct(x) + '%' }} onKeyDown={r.keys(i)}
            // Near an end, the bubble aligns to that end so it never leaves the frame.
            data-edge={r.pct(x) < 12 ? 'start' : r.pct(x) > 88 ? 'end' : undefined}>
            <span className="alt-brush-bubble" aria-hidden="true">{say(x)}</span>
          </div>
        );
      })}
      </div>
      <p className="alt-brush-range" aria-hidden="true">{shown}</p>
    </div>
  );
}
