import * as React from 'react';
import type { DayUsage } from './data';

const fmtDay = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const fmtWeekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const gb = (v: number) => `${v.toFixed(1)} GB`;

const HEIGHT = 260;
const M = { top: 16, right: 64, bottom: 28, left: 52 };

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = React.useRef<T>(null);
  const [w, setW] = React.useState(640);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export function UsageChart({ days, trend }: { days: DayUsage[]; trend: { slope: number; intercept: number } }) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = React.useState<number | null>(null);

  const values = days.map((d) => d.gb);
  const yMin = Math.floor((Math.min(...values) - 4) / 10) * 10;
  const yMax = Math.ceil((Math.max(...values) + 4) / 10) * 10;
  const ticks: number[] = [];
  for (let t = yMin; t <= yMax; t += 10) ticks.push(t);

  const iw = width - M.left - M.right;
  const ih = HEIGHT - M.top - M.bottom;
  const x = (i: number) => M.left + (i / (days.length - 1)) * iw;
  const y = (v: number) => M.top + (1 - (v - yMin) / (yMax - yMin)) * ih;

  const path = days.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.gb).toFixed(1)}`).join('');
  const last = days.length - 1;
  const trendStart = trend.intercept;
  const trendEnd = trend.intercept + trend.slope * last;

  // Weekly x ticks: 1, 8, 15, 22, 29 Oct
  const xTicks = days.map((_, i) => i).filter((i) => i % 7 === 0);

  const pick = (clientX: number, target: SVGSVGElement) => {
    const r = target.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * width;
    const i = Math.round(((px - M.left) / iw) * last);
    setActive(Math.min(last, Math.max(0, i)));
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const step = e.key === 'ArrowRight' ? 1 : -1;
      setActive((a) => Math.min(last, Math.max(0, (a ?? (step > 0 ? -1 : last + 1)) + step)));
    } else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(last);
    else if (e.key === 'Escape') setActive(null);
  };

  const a = active !== null ? days[active] : null;
  const prev = active !== null && active > 0 ? days[active - 1] : null;
  const change = a && prev ? a.gb - prev.gb : null;
  const tipLeft = active !== null ? x(active) : 0;
  const tipFlip = tipLeft > width - 180;

  return (
    <div className="chart" ref={wrapRef}>
      <svg
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="img"
        aria-label={`Line chart of storage used each day in October 2026, rising from ${gb(days[0].gb)} on 1 Oct to ${gb(days[last].gb)} on 31 Oct. Use left and right arrow keys to read each day.`}
        tabIndex={0}
        onPointerMove={(e) => pick(e.clientX, e.currentTarget)}
        onPointerDown={(e) => pick(e.clientX, e.currentTarget)}
        onPointerLeave={() => setActive(null)}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        {/* grid + y axis */}
        {ticks.map((t) => (
          <g key={t}>
            <line className="chart-grid" x1={M.left} x2={M.left + iw} y1={y(t)} y2={y(t)} />
            <text className="chart-tick" x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        <text className="chart-tick" x={M.left - 8} y={M.top - 6} textAnchor="end">GB</text>

        {/* x axis */}
        {xTicks.map((i) => (
          <text key={i} className="chart-tick" x={x(i)} y={HEIGHT - 8} textAnchor="middle">
            {fmtDay.format(days[i].date)}
          </text>
        ))}

        {/* trend */}
        <line className="chart-trend" x1={x(0)} x2={x(last)} y1={y(trendStart)} y2={y(trendEnd)} />

        {/* series */}
        <path className="chart-line" d={path} />

        {/* end marker + direct label */}
        <circle className="chart-dot" cx={x(last)} cy={y(days[last].gb)} r={4} />
        <text className="chart-endlabel" x={x(last) + 10} y={y(days[last].gb)} dy="0.32em">
          {gb(days[last].gb)}
        </text>
        <text className="chart-trendlabel" x={x(last) + 10} y={y(trendEnd) + 16} dy="0.32em">
          trend
        </text>

        {/* hover */}
        {a && active !== null && (
          <g pointerEvents="none">
            <line className="chart-crosshair" x1={x(active)} x2={x(active)} y1={M.top} y2={M.top + ih} />
            <circle className="chart-dot" cx={x(active)} cy={y(a.gb)} r={5} />
          </g>
        )}
      </svg>

      {a && (
        <div
          className="chart-tip"
          role="status"
          style={{
            left: tipLeft,
            top: M.top,
            transform: tipFlip ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
          }}
        >
          <div className="chart-tip-date">{fmtWeekday.format(a.date)}</div>
          <div className="chart-tip-value">
            <span className="chart-key" aria-hidden /> {gb(a.gb)} used
          </div>
          {change !== null && (
            <div className="chart-tip-change">
              {change >= 0 ? '+' : '−'}
              {Math.abs(change).toFixed(1)} GB vs previous day
            </div>
          )}
        </div>
      )}
    </div>
  );
}
