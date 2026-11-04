import * as React from 'react';
import { MonthRow, int, money, moneyCompact, signed } from './data';

/* ---------- shared helpers ---------- */

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = React.useRef<T | null>(null);
  const [w, setW] = React.useState(640);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function niceStep(range: number, count: number) {
  const raw = range / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}

function niceDomain(min: number, max: number, count = 4): { lo: number; hi: number; ticks: number[] } {
  const step = niceStep(max - min || 1, count);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);
  return { lo, hi, ticks };
}

/** Column path: 4px rounded data-end, square at the baseline. */
function columnPath(x: number, y: number, w: number, h: number, r = 4) {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

function useKeyboardIndex(n: number, setActive: React.Dispatch<React.SetStateAction<number | null>>) {
  return (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const d = e.key === 'ArrowRight' ? 1 : -1;
      setActive((i) => (i == null ? (d > 0 ? 0 : n - 1) : Math.min(n - 1, Math.max(0, i + d))));
    } else if (e.key === 'Escape') setActive(null);
  };
}

function ChartTooltip({ x, width, children }: { x: number; width: number; children: React.ReactNode }) {
  const flip = x > width - 200;
  return (
    <div className="viz-tooltip" style={{ left: x, transform: `translateX(${flip ? 'calc(-100% - 12px)' : '12px'})` }} role="status">
      {children}
    </div>
  );
}

const M = { top: 16, right: 64, bottom: 28, left: 56 };

/* ---------- MRR line ---------- */

export function MrrChart({ rows }: { rows: MonthRow[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = React.useState<number | null>(null);
  const height = 260;
  const iw = width - M.left - M.right;
  const ih = height - M.top - M.bottom;
  const vals = rows.map((r) => r.endMrr);
  const { lo, hi, ticks } = niceDomain(Math.min(...vals), Math.max(...vals));
  const x = (i: number) => M.left + (rows.length === 1 ? iw / 2 : (i / (rows.length - 1)) * iw);
  const y = (v: number) => M.top + ih - ((v - lo) / (hi - lo)) * ih;
  const d = rows.map((r, i) => `${i ? 'L' : 'M'}${x(i)},${y(r.endMrr)}`).join('');
  const last = rows.length - 1;
  const onKey = useKeyboardIndex(rows.length, setActive);

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    setActive(Math.round(rel * (rows.length - 1)));
  };

  const a = active != null ? rows[active] : null;

  return (
    <div ref={ref} className="viz-frame">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`Monthly recurring revenue, ${rows[0].longLabel} to ${rows[last].longLabel}: from ${money(rows[0].endMrr)} to ${money(rows[last].endMrr)}. Use left and right arrow keys to read each month.`}
        tabIndex={0}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="viz-grid" x1={M.left} x2={M.left + iw} y1={y(t)} y2={y(t)} />
            <text className="viz-tick" x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end">{moneyCompact(t)}</text>
          </g>
        ))}
        {rows.map((r, i) => (
          <text key={r.key} className="viz-tick" x={x(i)} y={height - 8} textAnchor="middle">{r.label}</text>
        ))}
        {a && <line className="viz-crosshair" x1={x(active!)} x2={x(active!)} y1={M.top} y2={M.top + ih} />}
        <path d={d} fill="none" style={{ stroke: 'var(--series-1)' }} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(last)} cy={y(rows[last].endMrr)} r={5} className="viz-dot" style={{ fill: 'var(--series-1)' }} />
        <text className="viz-endlabel" x={x(last) + 10} y={y(rows[last].endMrr)} dy="0.32em">{moneyCompact(rows[last].endMrr)}</text>
        {a && <circle cx={x(active!)} cy={y(a.endMrr)} r={5} className="viz-dot" style={{ fill: 'var(--series-1)' }} />}
        <rect
          x={M.left - 12}
          y={M.top}
          width={iw + 24}
          height={ih}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setActive(null)}
        />
      </svg>
      {a && (
        <ChartTooltip x={x(active!)} width={width}>
          <div className="viz-tooltip-title">{a.longLabel}</div>
          <div className="viz-tooltip-row"><span className="viz-key viz-key-line" style={{ background: 'var(--series-1)' }} />MRR<b>{money(a.endMrr)}</b></div>
          <div className="viz-tooltip-row viz-sub">Net new<b>{signed(a.netNewMrr, money)}</b></div>
        </ChartTooltip>
      )}
    </div>
  );
}

/* ---------- New vs cancelled columns ---------- */

export function SubscriptionsChart({ rows }: { rows: MonthRow[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = React.useState<number | null>(null);
  const height = 260;
  const m = { ...M, right: 16, left: 44 };
  const iw = width - m.left - m.right;
  const ih = height - m.top - m.bottom;
  const max = Math.max(...rows.map((r) => Math.max(r.newSubs, r.cancelledSubs)));
  const { hi, ticks } = niceDomain(0, max);
  const band = iw / rows.length;
  const barW = Math.min(24, Math.max(4, (band - 2) * 0.32));
  const gap = 2;
  const y = (v: number) => m.top + ih - (v / hi) * ih;
  const cx = (i: number) => m.left + band * i + band / 2;
  const onKey = useKeyboardIndex(rows.length, setActive);
  const a = active != null ? rows[active] : null;
  const last = rows.length - 1;

  return (
    <div ref={ref} className="viz-frame">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`New and cancelled subscriptions per month, ${rows[0].longLabel} to ${rows[last].longLabel}. Use left and right arrow keys to read each month.`}
        tabIndex={0}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className={t === 0 ? 'viz-baseline' : 'viz-grid'} x1={m.left} x2={m.left + iw} y1={y(t)} y2={y(t)} />
            <text className="viz-tick" x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end">{int(t)}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const xNew = cx(i) - gap / 2 - barW;
          const xCan = cx(i) + gap / 2;
          const dim = active != null && active !== i;
          return (
            <g key={r.key} opacity={dim ? 0.45 : 1}>
              <path d={columnPath(xNew, y(r.newSubs), barW, y(0) - y(r.newSubs))} style={{ fill: 'var(--series-1)' }} />
              <path d={columnPath(xCan, y(r.cancelledSubs), barW, y(0) - y(r.cancelledSubs))} style={{ fill: 'var(--series-2)' }} />
              <text className="viz-tick" x={cx(i)} y={height - 8} textAnchor="middle">{r.label}</text>
              {i === last && (
                <>
                  <text className="viz-caplabel" x={xNew + barW / 2} y={y(r.newSubs) - 6} textAnchor="middle">{int(r.newSubs)}</text>
                  <text className="viz-caplabel" x={xCan + barW / 2} y={y(r.cancelledSubs) - 6} textAnchor="middle">{int(r.cancelledSubs)}</text>
                </>
              )}
              <rect
                x={m.left + band * i}
                y={m.top}
                width={band}
                height={ih}
                fill="transparent"
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
              />
            </g>
          );
        })}
      </svg>
      {a && (
        <ChartTooltip x={cx(active!)} width={width}>
          <div className="viz-tooltip-title">{a.longLabel}</div>
          <div className="viz-tooltip-row"><span className="viz-key" style={{ background: 'var(--series-1)' }} />New<b>{int(a.newSubs)}</b></div>
          <div className="viz-tooltip-row"><span className="viz-key" style={{ background: 'var(--series-2)' }} />Cancelled<b>{int(a.cancelledSubs)}</b></div>
          <div className="viz-tooltip-row viz-sub">Net change<b>{signed(a.newSubs - a.cancelledSubs, int)}</b></div>
        </ChartTooltip>
      )}
    </div>
  );
}

export function Legend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <ul className="viz-legend" aria-label="Legend">
      {items.map((it) => (
        <li key={it.label}><span className="viz-key" style={{ background: it.color }} />{it.label}</li>
      ))}
    </ul>
  );
}

/* ---------- Sparkline for stat tiles ---------- */

export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const w = 120;
  const h = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = (i: number) => 4 + (i / (values.length - 1)) * (w - 8);
  const y = (v: number) => 4 + (h - 8) - ((v - min) / (max - min || 1)) * (h - 8);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('');
  const l = values.length - 1;
  return (
    <svg width={w} height={h} className="viz-spark" role="img" aria-label={label}>
      <path d={d} fill="none" style={{ stroke: 'var(--ink-faint)' }} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(l)} cy={y(values[l])} r={4} className="viz-dot" style={{ fill: 'var(--accent)' }} />
    </svg>
  );
}
