import * as React from 'react';
import { BRANCHES, CURRENT, MONTHS, Metric, SERIES } from './data';
import { axisFormatter, compact, full, niceTicks, pct } from './format';

/** Width of an element, kept in sync with layout. */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = React.useRef<T>(null);
  const [w, setW] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(el);
    setW(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/* ------------------------------------------------------------------ Sparkline */

export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const h = 36;
  const pad = 5;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const x = (i: number) => pad + (i / (values.length - 1)) * (w - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / (max - min || 1)) * (h - pad * 2);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const last = values.length - 1;
  return (
    <div ref={ref} className="spark" role="img" aria-label={label}>
      {w > 0 && (
        <svg width={w} height={h} aria-hidden="true">
          <path d={d} className="spark-line" />
          <circle cx={x(last)} cy={y(values[last])} r={4} className="mark-dot" />
        </svg>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Trend chart */

interface TrendProps {
  values: number[]; // 24 months
  metricLabel: string;
  showClosure: boolean;
}

const CLOSURE = [3, 4]; // Feb, Mar 2026 within CURRENT

export function TrendChart({ values, metricLabel, showClosure }: TrendProps) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = React.useState<number | null>(null);
  const cur = values.slice(12);
  const prior = values.slice(0, 12);

  const H = 280;
  const m = { top: 24, right: 56, bottom: 30, left: 48 };
  const iw = Math.max(0, w - m.left - m.right);
  const ih = H - m.top - m.bottom;
  const ticks = niceTicks(Math.max(...values) * 1.04, 4);
  const top = ticks[ticks.length - 1];
  const fmtAxis = axisFormatter(top);
  const step = iw / 11;
  const x = (i: number) => m.left + i * step;
  const y = (v: number) => m.top + ih - (v / top) * ih;
  const path = (vs: number[]) => vs.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const area = `${path(cur)}L${x(11)},${y(0)}L${x(0)},${y(0)}Z`;

  const pick = (clientX: number, rect: DOMRect) => {
    const i = Math.round((clientX - rect.left - m.left) / step);
    return Math.max(0, Math.min(11, i));
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') setHover((h) => (h === null ? 0 : Math.min(11, h + 1)));
    else if (e.key === 'ArrowLeft') setHover((h) => (h === null ? 11 : Math.max(0, h - 1)));
    else if (e.key === 'Escape') setHover(null);
    else return;
    e.preventDefault();
  };

  const last = 11;
  const tipLeft = hover !== null ? x(hover) : 0;
  const tipFlip = hover !== null && tipLeft > w - 200;

  return (
    <div ref={ref} className="trend">
      {w > 0 && (
        <>
          <svg
            width={w}
            height={H}
            role="img"
            tabIndex={0}
            aria-label={`${metricLabel} by month, ${CURRENT[0].long} to ${CURRENT[11].long}, compared with the same months a year earlier. Use the arrow keys to read each month.`}
            onPointerMove={(e) => setHover(pick(e.clientX, e.currentTarget.getBoundingClientRect()))}
            onPointerLeave={() => setHover(null)}
            onKeyDown={onKey}
            onBlur={() => setHover(null)}
          >
            {showClosure && (
              <g>
                <rect
                  x={x(CLOSURE[0]) - step / 2}
                  y={m.top}
                  width={step * CLOSURE.length}
                  height={ih}
                  className="band"
                />
                <text x={x(CLOSURE[0]) - step / 2 + 6} y={m.top + 14} className="band-label">
                  Eastfield closed
                </text>
              </g>
            )}
            {ticks.map((t) => (
              <g key={t}>
                <line x1={m.left} x2={m.left + iw} y1={y(t)} y2={y(t)} className={t === 0 ? 'axis' : 'grid'} />
                <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tick">
                  {fmtAxis(t)}
                </text>
              </g>
            ))}
            {CURRENT.map((mo, i) => (
              <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="tick">
                {mo.short}
                {mo.month === 0 ? ` ’${String(mo.year).slice(2)}` : ''}
              </text>
            ))}
            <path d={area} className="area" />
            <path d={path(prior)} className="line line-prior" />
            <path d={path(cur)} className="line line-current" />
            {hover === null && (
              <>
                <circle cx={x(last)} cy={y(cur[last])} r={4} className="mark-dot" />
                <text x={x(last) + 10} y={y(cur[last])} dy="0.32em" className="end-label">
                  {compact(cur[last])}
                </text>
              </>
            )}
            {hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={m.top} y2={m.top + ih} className="crosshair" />
                <circle cx={x(hover)} cy={y(prior[hover])} r={4} className="mark-dot prior" />
                <circle cx={x(hover)} cy={y(cur[hover])} r={4} className="mark-dot" />
              </g>
            )}
          </svg>
          {hover !== null && (
            <div
              className="chart-tip"
              style={{
                left: tipFlip ? undefined : tipLeft + 14,
                right: tipFlip ? w - tipLeft + 14 : undefined,
                top: m.top,
              }}
              aria-live="polite"
            >
              <div className="tip-title">{CURRENT[hover].long}</div>
              <div className="tip-row">
                <span className="key key-current" aria-hidden="true" />
                <span>Last 12 months</span>
                <b>{full(cur[hover])}</b>
              </div>
              <div className="tip-row">
                <span className="key key-prior" aria-hidden="true" />
                <span>{MONTHS[hover].long}</span>
                <b>{full(prior[hover])}</b>
              </div>
              <div className="tip-foot">
                <Delta value={cur[hover] / prior[hover] - 1} /> year on year
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Delta */

export function Delta({ value, digits = 1 }: { value: number; digits?: number }) {
  const flat = Math.abs(value) < 0.0005;
  const dir = flat ? 'flat' : value > 0 ? 'up' : 'down';
  return (
    <span className={`delta delta-${dir}`}>
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        {dir === 'up' && <path d="M5 1.5 9 7.5H1z" />}
        {dir === 'down' && <path d="M5 8.5 1 2.5h8z" />}
        {dir === 'flat' && <rect x="1" y="4" width="8" height="2" rx="1" />}
      </svg>
      <span className="sr-only">{dir === 'up' ? 'Up' : dir === 'down' ? 'Down' : 'No change'} </span>
      {pct(value, digits)}
    </span>
  );
}

/* ------------------------------------------------------------------ Branch bars */

export interface BranchRow {
  id: string;
  name: string;
  current: number;
  change: number;
}

export function BranchBars({
  rows,
  selected,
  onSelect,
  metricNoun,
}: {
  rows: BranchRow[];
  selected: string;
  onSelect: (id: string) => void;
  metricNoun: string;
}) {
  const max = Math.max(...rows.map((r) => r.current));
  return (
    <ol className="bars" aria-label={`Branches ranked by ${metricNoun}, last 12 months`}>
      {rows.map((r) => {
        const muted = selected !== 'all' && selected !== r.id;
        const isSel = selected === r.id;
        return (
          <li key={r.id}>
            <button
              type="button"
              className="bar-row"
              data-muted={muted || undefined}
              aria-pressed={isSel}
              onClick={() => onSelect(isSel ? 'all' : r.id)}
              title={isSel ? 'Show all branches' : `Show ${r.name} only`}
            >
              <span className="bar-name">{r.name}</span>
              <span className="bar-value">{compact(r.current)}</span>
              <span className="bar-delta">
                <Delta value={r.change} />
              </span>
              <span className="bar-track" aria-hidden="true">
                <span className="bar-fill" style={{ width: `${(r.current / max) * 100}%` }} />
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ Change heatmap */

// Diverging bins: change vs the same month a year earlier.
export const BINS = [
  { max: -0.2, cls: 'd-3', label: 'Below −20%' },
  { max: -0.08, cls: 'd-2', label: '−20% to −8%' },
  { max: -0.02, cls: 'd-1', label: '−8% to −2%' },
  { max: 0.02, cls: 'd0', label: '±2%' },
  { max: 0.08, cls: 'u-1', label: '+2% to +8%' },
  { max: 0.2, cls: 'u-2', label: '+8% to +20%' },
  { max: Infinity, cls: 'u-3', label: 'Above +20%' },
];
const binOf = (v: number) => BINS.find((b) => v < b.max)!;

export function changeGrid(metric: Metric) {
  return BRANCHES.map((b) => {
    const s = SERIES[b.id][metric];
    return { branch: b, changes: CURRENT.map((_, i) => s[i + 12] / s[i] - 1), values: s };
  });
}

export function ChangeHeatmap({ metric, metricLabel }: { metric: Metric; metricLabel: string }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = React.useState<{ r: number; c: number } | null>(null);
  const grid = changeGrid(metric);
  const labelW = w < 520 ? 92 : 124;
  const cellH = 30;
  const gap = 2;
  const headH = 22;
  const cw = Math.max(0, (w - labelW) / 12);
  const H = headH + grid.length * cellH;

  const h = hover ? grid[hover.r] : null;
  return (
    <div ref={ref} className="heat">
      {w > 0 && (
        <>
          <svg width={w} height={H} role="img" aria-label={`Change in ${metricLabel.toLowerCase()} against the same month a year earlier, by branch and month. The table view lists every value.`}>
            {CURRENT.map((mo, c) => (
              <text key={c} x={labelW + c * cw + cw / 2} y={14} textAnchor="middle" className="tick">
                {cw < 34 ? mo.short.slice(0, 1) : mo.short}
              </text>
            ))}
            {grid.map((row, r) => (
              <g key={row.branch.id} transform={`translate(0 ${headH + r * cellH})`}>
                <text x={0} y={(cellH - gap) / 2} dy="0.32em" className="row-label">
                  {row.branch.name}
                </text>
                {row.changes.map((v, c) => (
                  <rect
                    key={c}
                    x={labelW + c * cw + gap / 2}
                    y={0}
                    width={Math.max(0, cw - gap)}
                    height={cellH - gap}
                    rx={4}
                    className={`cell ${binOf(v).cls}`}
                    data-active={hover?.r === r && hover?.c === c ? '' : undefined}
                    onPointerEnter={() => setHover({ r, c })}
                    onPointerLeave={() => setHover(null)}
                  />
                ))}
              </g>
            ))}
          </svg>
          {hover && h && (
            <div
              className="chart-tip"
              style={{
                top: headH + (hover.r + 1) * cellH + 4,
                left: Math.min(labelW + hover.c * cw, w - 210),
              }}
            >
              <div className="tip-title">
                {h.branch.name} · {CURRENT[hover.c].long}
              </div>
              <div className="tip-row">
                <span>{metricLabel}</span>
                <b>{full(h.values[hover.c + 12])}</b>
              </div>
              <div className="tip-row">
                <span>{MONTHS[hover.c].long}</span>
                <b>{full(h.values[hover.c])}</b>
              </div>
              <div className="tip-foot">
                <Delta value={h.changes[hover.c]} /> year on year
              </div>
            </div>
          )}
        </>
      )}
      <ul className="heat-legend" aria-label="Colour key">
        {BINS.map((b) => (
          <li key={b.cls}>
            <span className={`swatch ${b.cls}`} aria-hidden="true" />
            {b.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
