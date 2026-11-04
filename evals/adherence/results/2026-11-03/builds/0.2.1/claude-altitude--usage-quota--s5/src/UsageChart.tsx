import * as React from 'react';
import type { DayUsage } from './data';

const HEIGHT = 280; // includes the x-axis band
const M = { top: 16, right: 64, bottom: 32, left: 52 };

const fmtDay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const fmtLong = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const fmtGb = (n: number) => `${n.toFixed(1)} GB`;

function useWidth<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [w, setW] = React.useState(720);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function UsageChart({ data, quotaGb }: { data: DayUsage[]; quotaGb: number }) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = React.useState<number | null>(null);

  const yMin = 350;
  const yMax = quotaGb;
  const ticks = [];
  for (let v = yMin; v <= yMax; v += 50) ticks.push(v);

  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = HEIGHT - M.top - M.bottom;
  const x = (i: number) => M.left + (data.length === 1 ? 0 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => M.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.gb).toFixed(1)}`).join('');
  const first = data[0];
  const last = data[data.length - 1];
  const xTickIdx = data.map((_, i) => i).filter((i) => i % 7 === 0 || i === data.length - 1);

  const indexFromClientX = (clientX: number, el: Element) => {
    const rect = el.getBoundingClientRect();
    const px = clientX - rect.left;
    const i = Math.round(((px - M.left) / innerW) * (data.length - 1));
    return Math.min(data.length - 1, Math.max(0, i));
  };

  const onKey = (e: React.KeyboardEvent) => {
    const cur = active ?? data.length - 1;
    let next = cur;
    if (e.key === 'ArrowLeft') next = Math.max(0, cur - 1);
    else if (e.key === 'ArrowRight') next = Math.min(data.length - 1, cur + 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = data.length - 1;
    else if (e.key === 'Escape') return setActive(null);
    else return;
    e.preventDefault();
    setActive(next);
  };

  const a = active != null ? data[active] : null;
  const prev = active != null && active > 0 ? data[active - 1] : null;
  const tipLeft = active != null ? x(active) : 0;
  const tipFlip = tipLeft > width - 180;

  return (
    <div ref={wrapRef} className="chart">
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`Storage used per day in October, rising from ${fmtGb(first.gb)} on ${fmtDay(first.date)} to ${fmtGb(last.gb)} on ${fmtDay(last.date)}. Use arrow keys to read each day.`}
        tabIndex={0}
        onKeyDown={onKey}
        onFocus={() => setActive((v) => v ?? data.length - 1)}
        onBlur={() => setActive(null)}
        onPointerMove={(e) => setActive(indexFromClientX(e.clientX, e.currentTarget))}
        onPointerLeave={() => setActive(null)}
      >
        {/* grid + y axis */}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={M.left} x2={M.left + innerW} y1={y(v)} y2={y(v)} className={v === quotaGb ? 'quota-line' : 'grid'} />
            <text x={M.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className="tick">
              {v}
            </text>
          </g>
        ))}
        <text x={M.left + innerW + 8} y={y(quotaGb)} dy="0.32em" className="quota-label">
          Quota
        </text>
        <text x={M.left - 8} y={M.top - 6} textAnchor="end" className="tick unit" dy="-0.2em">
          GB
        </text>

        {/* x axis */}
        {xTickIdx.map((i) => (
          <text key={i} x={x(i)} y={HEIGHT - 10} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} className="tick">
            {fmtDay(data[i].date)}
          </text>
        ))}

        {/* series */}
        <path d={path} className="series-line" />

        {/* start + end markers with direct labels */}
        <circle cx={x(0)} cy={y(first.gb)} r={4} className="series-dot" />
        <circle cx={x(data.length - 1)} cy={y(last.gb)} r={5} className="series-dot" />
        <text x={x(0) + 8} y={y(first.gb) + 18} className="direct-label">
          {fmtGb(first.gb)}
        </text>
        <text x={x(data.length - 1) + 10} y={y(last.gb)} dy="0.32em" className="direct-label strong">
          {Math.round(last.gb)} GB
        </text>

        {/* crosshair */}
        {active != null && (
          <g pointerEvents="none">
            <line x1={x(active)} x2={x(active)} y1={M.top} y2={M.top + innerH} className="crosshair" />
            <circle cx={x(active)} cy={y(data[active].gb)} r={5} className="series-dot" />
          </g>
        )}
      </svg>

      {a && (
        <div
          className="chart-tip"
          role="status"
          style={{ left: tipLeft, top: y(a.gb), transform: `translate(${tipFlip ? 'calc(-100% - 12px)' : '12px'}, -50%)` }}
        >
          <div className="chart-tip-value">
            <span className="line-key" aria-hidden />
            {fmtGb(a.gb)}
          </div>
          <div className="chart-tip-label">{fmtLong(a.date)}</div>
          {prev && (
            <div className="chart-tip-label">
              {a.gb - prev.gb >= 0 ? '+' : '−'}
              {Math.abs(a.gb - prev.gb).toFixed(1)} GB vs. previous day
            </div>
          )}
        </div>
      )}
    </div>
  );
}
