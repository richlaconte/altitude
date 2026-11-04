import * as React from 'react';
import {ANNOTATIONS, type DayUsage} from './data';

const HEIGHT = 280;
const M = {top: 16, right: 16, bottom: 32, left: 52};

export const fmtDay = (iso: string, opts: Intl.DateTimeFormatOptions = {month: 'short', day: 'numeric'}) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', opts);

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = React.useRef<T>(null);
  const [w, setW] = React.useState(720);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(320, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/**
 * Storage used at the end of each day, as a line against the plan quota.
 * The y-axis starts at 350 GB, not zero, so day-to-day growth is visible; the quota line keeps headroom in view.
 */
export function UsageChart({data, quotaGb}: {data: DayUsage[]; quotaGb: number}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = React.useState<number | null>(null);

  const yMin = 350;
  const yMax = quotaGb + 10;
  const iw = width - M.left - M.right;
  const ih = HEIGHT - M.top - M.bottom;
  const x = (i: number) => M.left + (i / (data.length - 1)) * iw;
  const y = (v: number) => M.top + (1 - (v - yMin) / (yMax - yMin)) * ih;

  const yTicks = [350, 375, 400, 425, 450, 475, 500];
  const xTicks = data.map((_, i) => i).filter((i) => i % 7 === 0 || i === data.length - 1);
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.usedGb).toFixed(1)}`).join('');
  const area = `${path}L${x(data.length - 1)},${y(yMin)}L${x(0)},${y(yMin)}Z`;

  const last = data.length - 1;
  const pick = (clientX: number, rect: DOMRect) => {
    const px = ((clientX - rect.left) / rect.width) * width;
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

  const a = active == null ? null : data[active];
  const prev = active ? data[active - 1] : null;
  const delta = a && prev ? a.usedGb - prev.usedGb : null;
  const tipLeft = active == null ? 0 : x(active);
  const tipFlip = tipLeft > width - 180;

  return (
    <div className="chart" ref={ref}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`Line chart of storage used each day in October, from ${data[0].usedGb} GB to ${data[last].usedGb} GB, against a ${quotaGb} GB quota. Use arrow keys to read each day.`}
        tabIndex={0}
        onKeyDown={onKey}
        onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
      >
        {/* grid + y axis */}
        {yTicks.map((t) => (
          <g key={t}>
            <line className="chart-grid" x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
            <text className="chart-tick" x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
              {t} GB
            </text>
          </g>
        ))}

        {/* quota reference */}
        <line className="chart-quota" x1={M.left} x2={width - M.right} y1={y(quotaGb)} y2={y(quotaGb)} />
        <text className="chart-quota-label" x={width - M.right} y={y(quotaGb) - 6} textAnchor="end">
          Plan quota · {quotaGb} GB
        </text>

        {/* x axis */}
        {xTicks.map((i) => (
          <text key={i} className="chart-tick" x={x(i)} y={HEIGHT - 10} textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'}>
            {fmtDay(data[i].date)}
          </text>
        ))}

        <path className="chart-area" d={area} />
        <path className="chart-line" d={path} />

        {/* selective annotations */}
        {data.map((d, i) =>
          ANNOTATIONS[d.date] ? (
            <g key={d.date} className="chart-note">
              <line x1={x(i)} x2={x(i)} y1={y(d.usedGb) + 6} y2={y(d.usedGb) + 30} />
              <text x={x(i)} y={y(d.usedGb) + 44} textAnchor="middle">
                {ANNOTATIONS[d.date]}
              </text>
            </g>
          ) : null,
        )}

        {/* end-point direct label */}
        <circle className="chart-dot" cx={x(last)} cy={y(data[last].usedGb)} r={4} />
        <text className="chart-end-label" x={x(last) - 8} y={y(data[last].usedGb) - 10} textAnchor="end">
          {data[last].usedGb} GB
        </text>

        {/* hover layer */}
        {a && active != null && (
          <g pointerEvents="none">
            <line className="chart-crosshair" x1={x(active)} x2={x(active)} y1={M.top} y2={M.top + ih} />
            <circle className="chart-dot chart-dot-active" cx={x(active)} cy={y(a.usedGb)} r={5} />
          </g>
        )}
      </svg>

      {a && active != null && (
        <div
          className="chart-tooltip"
          role="status"
          style={{left: tipLeft, top: M.top, transform: tipFlip ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)'}}
        >
          <div className="chart-tooltip-date">{fmtDay(a.date, {weekday: 'short', month: 'short', day: 'numeric'})}</div>
          <div className="chart-tooltip-value">{a.usedGb.toFixed(1)} GB used</div>
          {delta != null && (
            <div className="chart-tooltip-sub">
              {delta >= 0 ? '+' : '−'}
              {Math.abs(delta).toFixed(1)} GB vs. previous day
            </div>
          )}
          <div className="chart-tooltip-sub">{(quotaGb - a.usedGb).toFixed(1)} GB below quota</div>
        </div>
      )}
    </div>
  );
}
