import * as React from 'react';
import { MONTHS, PERIOD_LABEL, PRIOR_LABEL, change, fmt, fmtCompact, type Series } from './data';
import { Change } from './Change';

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = React.useRef<T>(null);
  const [w, setW] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= raw)!;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.999; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

const H = 280;
const M = { top: 16, right: 92, bottom: 30, left: 52 };

export function TrendChart({ series, noun }: { series: Series; noun: string }) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = React.useState<number | null>(null);

  const w = Math.max(width, 320);
  const iw = w - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const ticks = niceTicks(Math.max(...series.current, ...series.prior));
  const yMax = ticks[ticks.length - 1];
  const x = (i: number) => M.left + (iw * i) / 11;
  const y = (v: number) => M.top + ih - (ih * v) / yMax;
  const path = (vs: number[]) => vs.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');

  // End-of-line direct labels, nudged apart if they would collide.
  let yc = y(series.current[11]);
  let yp = y(series.prior[11]);
  if (Math.abs(yc - yp) < 16) {
    const mid = (yc + yp) / 2;
    const up = yc <= yp ? -1 : 1;
    yc = mid + up * 8;
    yp = mid - up * 8;
  }

  const everyOther = iw < 520;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    setHover(Math.max(0, Math.min(11, Math.round((px / r.width) * 11))));
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') setHover((h) => (h === null ? 0 : Math.min(11, h + 1)));
    else if (e.key === 'ArrowLeft') setHover((h) => (h === null ? 11 : Math.max(0, h - 1)));
    else if (e.key === 'Escape') setHover(null);
    else return;
    e.preventDefault();
  };

  const tipLeft = hover === null ? 0 : x(hover);
  const tipFlip = hover !== null && tipLeft > w - 230;

  return (
    <div className="trend">
      <div className="legend" aria-hidden="true">
        <span className="legend-item">
          <svg width="20" height="8"><line x1="1" x2="19" y1="4" y2="4" className="line-current" /></svg>
          {PERIOD_LABEL}
        </span>
        <span className="legend-item">
          <svg width="20" height="8"><line x1="1" x2="19" y1="4" y2="4" className="line-prior" /></svg>
          {PRIOR_LABEL}
        </span>
      </div>
      <div className="chart-wrap" ref={wrapRef}>
        {width > 0 && (
          <svg
            width={w}
            height={H}
            role="img"
            tabIndex={0}
            aria-label={`Monthly ${noun}, ${PERIOD_LABEL} compared with ${PRIOR_LABEL}. Use left and right arrow keys to read each month.`}
            onKeyDown={onKey}
            onBlur={() => setHover(null)}
            className="chart-svg"
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={M.left + iw} y1={y(t)} y2={y(t)} className={t === 0 ? 'axis-base' : 'gridline'} />
                <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tick">
                  {fmtCompact(t)}
                </text>
              </g>
            ))}
            {MONTHS.map((m, i) =>
              everyOther && i % 2 === 1 ? null : (
                <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="tick">
                  {m.short}
                  {m.month === 0 ? ` '${String(m.year).slice(2)}` : ''}
                </text>
              ),
            )}

            <path d={path(series.prior)} className="line-prior" fill="none" />
            <path d={path(series.current)} className="line-current" fill="none" />

            <text x={x(11) + 10} y={yc} dy="0.32em" className="direct-label">
              This year
            </text>
            <text x={x(11) + 10} y={yp} dy="0.32em" className="direct-label muted">
              Last year
            </text>

            {hover !== null && (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + ih} className="crosshair" />
                <circle cx={x(hover)} cy={y(series.prior[hover])} r={4.5} className="dot-prior" />
                <circle cx={x(hover)} cy={y(series.current[hover])} r={5} className="dot-current" />
              </g>
            )}
            <rect
              x={M.left - 12}
              y={M.top}
              width={iw + 24}
              height={ih}
              fill="transparent"
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
        )}
        {hover !== null && (
          <div
            className="tooltip"
            role="status"
            style={{
              left: tipFlip ? undefined : tipLeft + 14,
              right: tipFlip ? w - tipLeft + 14 : undefined,
              top: M.top,
            }}
          >
            <div className="tooltip-title">{MONTHS[hover].long}</div>
            <div className="tooltip-row">
              <svg width="14" height="8"><line x1="1" x2="13" y1="4" y2="4" className="line-current" /></svg>
              <span>This year</span>
              <strong>{fmt(series.current[hover])}</strong>
            </div>
            <div className="tooltip-row">
              <svg width="14" height="8"><line x1="1" x2="13" y1="4" y2="4" className="line-prior" /></svg>
              <span>Same month last year</span>
              <strong>{fmt(series.prior[hover])}</strong>
            </div>
            <div className="tooltip-foot">
              <Change value={change(series.current[hover], series.prior[hover])} /> year on year
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
