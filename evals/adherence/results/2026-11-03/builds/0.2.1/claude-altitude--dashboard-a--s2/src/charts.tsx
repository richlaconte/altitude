import * as React from 'react';
import { Month, fmtCompactUsd, fmtInt, fmtSigned, fmtSignedUsd, fmtUsd } from './data';

// ---- helpers ----------------------------------------------------------------

export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = React.useRef<T>(null);
  const [width, setWidth] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

/** Top-rounded (up) or bottom-rounded (down) column: 4px data-end, square at the baseline. */
function columnPath(x: number, w: number, base: number, end: number) {
  const h = Math.abs(end - base);
  if (h < 0.5) return '';
  const r = Math.min(4, h, w / 2);
  if (end < base) {
    return `M${x},${base}V${end + r}Q${x},${end} ${x + r},${end}H${x + w - r}Q${x + w},${end} ${x + w},${end + r}V${base}Z`;
  }
  return `M${x},${base}V${end - r}Q${x},${end} ${x + r},${end}H${x + w - r}Q${x + w},${end} ${x + w},${end - r}V${base}Z`;
}

/** Shared keyboard model for the charts: the chart itself is the focus stop, arrows move between months. */
function useMonthCursor(n: number) {
  const [idx, setIdx] = React.useState<number | null>(null);
  const onKeyDown = (e: React.KeyboardEvent) => {
    const cur = idx ?? n - 1;
    let next: number | null = null;
    if (e.key === 'ArrowLeft') next = Math.max(0, cur - 1);
    else if (e.key === 'ArrowRight') next = Math.min(n - 1, cur + 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else if (e.key === 'Escape') { setIdx(null); return; }
    if (next !== null) { e.preventDefault(); setIdx(next); }
  };
  return {
    idx,
    setIdx,
    focusProps: {
      tabIndex: 0,
      onKeyDown,
      onFocus: () => setIdx((i) => i ?? n - 1),
      onBlur: () => setIdx(null),
    },
  };
}

function ChartTooltip({ x, flip, top, children }: { x: number; flip: boolean; top: number; children: React.ReactNode }) {
  return (
    <div
      className="viz-tip"
      role="status"
      style={{ left: x, top, transform: flip ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)' }}
    >
      {children}
    </div>
  );
}

function TipRow({ swatch, value, label }: { swatch?: string; value: React.ReactNode; label: React.ReactNode }) {
  return (
    <div className="viz-tip-row">
      {swatch ? <span className="viz-key-line" style={{ background: swatch }} /> : <span className="viz-key-gap" />}
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function xLabelStep(n: number, slot: number) {
  return slot >= 44 ? 1 : slot >= 24 ? 2 : 3;
}

// ---- MRR: single-series line with a 10% wash --------------------------------

export function MrrChart({ months }: { months: Month[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const n = months.length;
  const { idx, setIdx, focusProps } = useMonthCursor(n);
  const H = 260;
  const M = { t: 16, r: 60, b: 30, l: 52 };
  const iw = Math.max(0, width - M.l - M.r);
  const ih = H - M.t - M.b;

  const max = Math.max(...months.map((m) => m.mrr));
  const step = niceStep(max / 4);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);

  const x = (i: number) => M.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
  const y = (v: number) => M.t + ih - (v / top) * ih;
  const line = months.map((m, i) => `${i ? 'L' : 'M'}${x(i)},${y(m.mrr)}`).join('');
  const area = `${line}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const labelEvery = xLabelStep(n, n > 1 ? iw / (n - 1) : iw);
  const last = months[n - 1];

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = n === 1 ? 0 : Math.round(((px - M.l) / iw) * (n - 1));
    setIdx(Math.max(0, Math.min(n - 1, i)));
  };

  const hovered = idx !== null ? months[idx] : null;

  return (
    <div ref={ref} className="viz-frame" style={{ height: H }}>
      {width > 0 && (
        <svg
          width={width}
          height={H}
          role="img"
          aria-label={`Monthly recurring revenue, ${months[0].label} to ${last.label}: from ${fmtUsd(months[0].mrr)} to ${fmtUsd(last.mrr)}. Use the arrow keys to read each month.`}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setIdx(null)}
          {...focusProps}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line className={t === 0 ? 'viz-baseline' : 'viz-grid'} x1={M.l} x2={M.l + iw} y1={y(t)} y2={y(t)} />
              <text className="viz-axis" x={M.l - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {t === 0 ? '$0' : fmtCompactUsd(t)}
              </text>
            </g>
          ))}
          {months.map((m, i) =>
            (n - 1 - i) % labelEvery === 0 ? (
              <text key={m.key} className="viz-axis" x={x(i)} y={H - 8} textAnchor="middle">
                {m.short}
              </text>
            ) : null,
          )}
          <path d={area} className="viz-area" />
          <path d={line} className="viz-line" />
          {hovered && idx !== null && (
            <line className="viz-crosshair" x1={x(idx)} x2={x(idx)} y1={M.t} y2={M.t + ih} />
          )}
          <circle className="viz-dot" cx={x(n - 1)} cy={y(last.mrr)} r={4.5} />
          {hovered && idx !== null && idx !== n - 1 && (
            <circle className="viz-dot" cx={x(idx)} cy={y(hovered.mrr)} r={4.5} />
          )}
          <text className="viz-end-label" x={x(n - 1) + 10} y={y(last.mrr)} dy="0.32em">
            {fmtCompactUsd(last.mrr)}
          </text>
        </svg>
      )}
      {hovered && idx !== null && (
        <ChartTooltip x={x(idx)} flip={x(idx) > width / 2} top={M.t}>
          <div className="viz-tip-title">{hovered.long}</div>
          <TipRow swatch="var(--series-1)" value={fmtUsd(hovered.mrr)} label="MRR" />
          <TipRow value={fmtSignedUsd(hovered.mrrChange)} label="vs previous month" />
        </ChartTooltip>
      )}
    </div>
  );
}

// ---- New vs cancelled: diverging columns around one zero baseline -----------

export function SubscriptionFlowChart({ months }: { months: Month[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const n = months.length;
  const { idx, setIdx, focusProps } = useMonthCursor(n);
  const H = 260;
  const M = { t: 22, r: 12, b: 30, l: 44 };
  const iw = Math.max(0, width - M.l - M.r);
  const ih = H - M.t - M.b;

  const maxUp = Math.max(...months.map((m) => m.newSubs));
  const maxDown = Math.max(...months.map((m) => m.cancelled));
  const step = niceStep((maxUp + maxDown) / 5);
  const top = Math.ceil(maxUp / step) * step;
  const bottom = -Math.ceil(maxDown / step) * step;
  const ticks: number[] = [];
  for (let t = bottom; t <= top + 1e-9; t += step) ticks.push(t);

  const band = iw / n;
  const bw = Math.min(24, Math.max(6, band * 0.42));
  const cx = (i: number) => M.l + band * i + band / 2;
  const y = (v: number) => M.t + ((top - v) / (top - bottom)) * ih;
  const y0 = y(0);
  const labelEvery = xLabelStep(n, band);
  const last = months[n - 1];
  const hovered = idx !== null ? months[idx] : null;

  return (
    <div ref={ref} className="viz-frame" style={{ height: H }}>
      {width > 0 && (
        <svg
          width={width}
          height={H}
          role="img"
          aria-label={`New and cancelled subscriptions per month, ${months[0].label} to ${last.label}. Latest month: ${fmtInt(last.newSubs)} new, ${fmtInt(last.cancelled)} cancelled. Use the arrow keys to read each month.`}
          onPointerLeave={() => setIdx(null)}
          {...focusProps}
        >
          {ticks.map((t) => (
            <g key={t}>
              {t !== 0 && <line className="viz-grid" x1={M.l} x2={M.l + iw} y1={y(t)} y2={y(t)} />}
              <text className="viz-axis" x={M.l - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {fmtInt(Math.abs(t))}
              </text>
            </g>
          ))}
          {months.map((m, i) => (
            <g key={m.key}>
              {idx === i && (
                <rect className="viz-band-hover" x={cx(i) - band / 2 + 1} y={M.t} width={band - 2} height={ih} rx={4} />
              )}
              {/* 1px either side of the baseline gives the 2px surface gap between the paired columns */}
              <path className="viz-col viz-col-1" d={columnPath(cx(i) - bw / 2, bw, y0 - 1, Math.min(y0 - 1, y(m.newSubs)))} />
              <path className="viz-col viz-col-2" d={columnPath(cx(i) - bw / 2, bw, y0 + 1, Math.max(y0 + 1, y(-m.cancelled)))} />
              {(n - 1 - i) % labelEvery === 0 && (
                <text className="viz-axis" x={cx(i)} y={H - 8} textAnchor="middle">
                  {m.short}
                </text>
              )}
              <rect
                className="viz-hit"
                x={cx(i) - band / 2}
                y={M.t}
                width={band}
                height={ih}
                onPointerEnter={() => setIdx(i)}
              />
            </g>
          ))}
          <line className="viz-baseline" x1={M.l} x2={M.l + iw} y1={y0} y2={y0} />
          {/* Direct labels on the latest month only */}
          <text className="viz-cap-label" x={cx(n - 1)} y={y(last.newSubs) - 6} textAnchor="middle">
            {fmtInt(last.newSubs)}
          </text>
          <text className="viz-cap-label" x={cx(n - 1)} y={y(-last.cancelled) + 14} textAnchor="middle">
            {fmtInt(last.cancelled)}
          </text>
        </svg>
      )}
      {hovered && idx !== null && (
        <ChartTooltip x={cx(idx) + (cx(idx) > width / 2 ? -bw / 2 : bw / 2)} flip={cx(idx) > width / 2} top={M.t}>
          <div className="viz-tip-title">{hovered.long}</div>
          <TipRow swatch="var(--series-1)" value={fmtInt(hovered.newSubs)} label="new" />
          <TipRow swatch="var(--series-2)" value={fmtInt(hovered.cancelled)} label="cancelled" />
          <TipRow value={fmtSigned(hovered.net)} label="net change" />
        </ChartTooltip>
      )}
    </div>
  );
}

// ---- Sparkline for stat tiles -------------------------------------------------

export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const H = 32;
  const pad = 5;
  const n = values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => pad + (n === 1 ? 0 : (i * (width - pad * 2)) / (n - 1));
  const y = (v: number) => pad + (1 - (v - min) / span) * (H - pad * 2);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('');
  return (
    <div ref={ref} className="viz-spark" aria-hidden="true">
      {width > 0 && (
        <svg width={width} height={H} aria-label={label}>
          <path d={d} className="viz-spark-line" />
          <circle cx={x(n - 1)} cy={y(values[n - 1])} r={4} className="viz-spark-dot" />
        </svg>
      )}
    </div>
  );
}
