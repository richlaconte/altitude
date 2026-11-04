import * as React from 'react';
import {DailyUsage, fmtDay, fmtDayLong, fmtGb} from './data';

const HEIGHT = 260;
const M = {top: 16, right: 72, bottom: 28, left: 52};
const Y_MIN = 360;
const Y_MAX = 420;
const Y_TICKS = [360, 380, 400, 420];

function useWidth<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [width, setWidth] = React.useState(640);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(320, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export function StorageChart({data}: {data: DailyUsage[]}) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = React.useState<number | null>(null);

  const innerW = width - M.left - M.right;
  const innerH = HEIGHT - M.top - M.bottom;
  const x = (i: number) => M.left + (i / (data.length - 1)) * innerW;
  const y = (gb: number) => M.top + (1 - (gb - Y_MIN) / (Y_MAX - Y_MIN)) * innerH;

  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.usedGb).toFixed(1)}`).join('');
  const xTicks = [0, 7, 14, 21, 28].filter(i => i < data.length);
  const last = data.length - 1;

  const indexFromPointer = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const t = (e.clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(last, Math.round(t * last)));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const cur = active ?? last;
    let next: number | null = null;
    if (e.key === 'ArrowLeft') next = Math.max(0, cur - 1);
    if (e.key === 'ArrowRight') next = Math.min(last, cur + 1);
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = last;
    if (e.key === 'Escape') { setActive(null); return; }
    if (next !== null) { e.preventDefault(); setActive(next); }
  };

  const a = active !== null ? data[active] : null;
  const prev = active !== null && active > 0 ? data[active - 1] : null;
  const delta = a && prev ? a.usedGb - prev.usedGb : null;
  const tipLeft = active !== null ? x(active) : 0;
  const flip = active !== null && tipLeft > width - 200;

  return (
    <div ref={wrapRef} className="chart">
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        tabIndex={0}
        aria-label={`Storage used each day in October, rising from ${fmtGb(data[0].usedGb)} to ${fmtGb(data[last].usedGb)}. Use the arrow keys to read each day.`}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
      >
        {/* grid + y axis */}
        {Y_TICKS.map(t => (
          <g key={t}>
            <line className="chart-grid" x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
            <text className="chart-axis" x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end">{t} GB</text>
          </g>
        ))}
        {/* x axis */}
        {xTicks.map(i => (
          <text key={i} className="chart-axis" x={x(i)} y={HEIGHT - 8} textAnchor="middle">{fmtDay(data[i].date)}</text>
        ))}

        <path className="chart-line" d={path} />

        {/* direct labels: start and end only */}
        <circle className="chart-dot" cx={x(0)} cy={y(data[0].usedGb)} r={4} />
        <circle className="chart-dot" cx={x(last)} cy={y(data[last].usedGb)} r={4} />
        <text className="chart-label" x={x(last) + 10} y={y(data[last].usedGb)} dy="0.32em">{fmtGb(data[last].usedGb)}</text>

        {active !== null && (
          <g pointerEvents="none">
            <line className="chart-crosshair" x1={x(active)} x2={x(active)} y1={M.top} y2={M.top + innerH} />
            <circle className="chart-dot chart-dot-active" cx={x(active)} cy={y(data[active].usedGb)} r={5} />
          </g>
        )}

        {/* hit area larger than the line */}
        <rect
          x={M.left - 8}
          y={M.top}
          width={innerW + 16}
          height={innerH}
          fill="transparent"
          onPointerMove={e => setActive(indexFromPointer(e))}
          onPointerDown={e => setActive(indexFromPointer(e))}
          onPointerLeave={() => setActive(null)}
        />
      </svg>

      {a && (
        <div
          className="chart-tip"
          role="status"
          style={{
            left: flip ? undefined : tipLeft + 12,
            right: flip ? width - tipLeft + 12 : undefined,
            top: M.top,
          }}
        >
          <div className="chart-tip-date">{fmtDayLong(a.date)}</div>
          <div className="chart-tip-value">{fmtGb(a.usedGb)}</div>
          {delta !== null && (
            <div className="chart-tip-delta">
              {delta >= 0 ? '+' : '−'}{Math.abs(delta).toFixed(1)} GB from previous day
            </div>
          )}
          {a.note && <div className="chart-tip-note">{a.note}</div>}
        </div>
      )}
    </div>
  );
}
