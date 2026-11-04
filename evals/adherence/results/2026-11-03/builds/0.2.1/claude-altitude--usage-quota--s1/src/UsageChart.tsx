import * as React from 'react';
import type {DayUsage} from './data';

const fmtDay = new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric'});
const fmtWeekday = new Intl.DateTimeFormat('en-US', {weekday: 'short', month: 'short', day: 'numeric'});
export const gb = (v: number) => `${v.toFixed(1)} GB`;
export const signedGb = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v).toFixed(1)} GB`;

const H = 240; // plot height
const M = {top: 16, right: 72, bottom: 32, left: 52};
const Y_MIN = 370;
const Y_MAX = 415;
const Y_TICKS = [370, 380, 390, 400, 410];
const X_TICKS = [0, 7, 14, 21, 28]; // Oct 1, 8, 15, 22, 29

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = React.useRef<T>(null);
  const [w, setW] = React.useState(640);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(320, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export function UsageChart({days, summary}: {days: DayUsage[]; summary: string}) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = React.useState<number | null>(null);

  const plotW = width - M.left - M.right;
  const x = (i: number) => M.left + (i / (days.length - 1)) * plotW;
  const y = (v: number) => M.top + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * H;
  const path = days.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.gb).toFixed(1)}`).join('');
  const last = days.length - 1;

  const indexAt = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left - M.left;
    return Math.min(last, Math.max(0, Math.round((px / plotW) * last)));
  };

  const onKey = (e: React.KeyboardEvent) => {
    const cur = active ?? last;
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = Math.min(last, cur + 1);
    else if (e.key === 'ArrowLeft') next = Math.max(0, cur - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    else if (e.key === 'Escape') return setActive(null);
    if (next !== null) {
      e.preventDefault();
      setActive(next);
    }
  };

  const a = active !== null ? days[active] : null;
  const tipLeft = active !== null ? x(active) : 0;
  const tipFlip = active !== null && tipLeft > width - 200;

  return (
    <div className="chart" ref={wrapRef}>
      <svg
        width={width}
        height={H + M.top + M.bottom}
        role="img"
        aria-label={summary}
        tabIndex={0}
        onKeyDown={onKey}
        onFocus={() => active === null && setActive(last)}
        onBlur={() => setActive(null)}
        onPointerMove={(e) => setActive(indexAt(e.clientX, e.currentTarget.getBoundingClientRect()))}
        onPointerLeave={() => setActive(null)}
      >
        {Y_TICKS.map((t) => (
          <g key={t}>
            <line className="chart-grid" x1={M.left} x2={M.left + plotW} y1={y(t)} y2={y(t)} />
            <text className="chart-tick" x={M.left - 10} y={y(t)} dy="0.32em" textAnchor="end">
              {t} GB
            </text>
          </g>
        ))}
        {X_TICKS.map((i) => (
          <text key={i} className="chart-tick" x={x(i)} y={M.top + H + 22} textAnchor="middle">
            {fmtDay.format(days[i].date)}
          </text>
        ))}

        {active !== null && <line className="chart-crosshair" x1={x(active)} x2={x(active)} y1={M.top} y2={M.top + H} />}

        <path className="chart-line" d={path} />

        {/* Direct labels: first and last day only. */}
        <circle className="chart-dot" cx={x(0)} cy={y(days[0].gb)} r={4} />
        <text className="chart-label" x={x(0) + 8} y={y(days[0].gb) + 18}>
          {gb(days[0].gb)}
        </text>
        <circle className="chart-dot" cx={x(last)} cy={y(days[last].gb)} r={4} />
        <text className="chart-label chart-label-strong" x={x(last) + 10} y={y(days[last].gb)} dy="0.32em">
          {gb(days[last].gb)}
        </text>

        {active !== null && <circle className="chart-dot" cx={x(active)} cy={y(days[active].gb)} r={5} />}
      </svg>

      {a && (
        <div
          className="chart-tip"
          aria-hidden="true"
          style={{left: tipLeft, top: M.top, transform: tipFlip ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)'}}
        >
          <div className="chart-tip-date">{fmtWeekday.format(a.date)}</div>
          <div className="chart-tip-row">
            <span className="chart-tip-key" />
            <strong>{gb(a.gb)}</strong>
            <span className="chart-tip-muted">used</span>
          </div>
          {a.change !== null && <div className="chart-tip-muted">{signedGb(a.change)} vs. previous day</div>}
        </div>
      )}
      <div className="sr-only" aria-live="polite">
        {a ? `${fmtWeekday.format(a.date)}: ${gb(a.gb)} used` : ''}
      </div>
    </div>
  );
}
