import * as React from 'react';
import { Icons } from './core';
import { textWidth, useChart, type BandScale, type ChartConfig, type ChartContextValue, type ChartDatum, type ChartInfo, type ChartReadout } from './chart';

/**
 * Funnel (#536): how many reached each step of a process, and where they left. Steps run down the page in data order,
 * each a flat bar from one left edge, so adjacent counts compare as aligned lengths; the drop-off between two steps is
 * a number, said in a plate in the gutter between them ("−38% · 742 left"). Never a tapering shape: that encodes counts
 * as area, which rule 1 rules out for the same reason as pies.
 */
export interface FunnelProps {
  /** The steps, in the process's order: one record per step. */
  data: ChartDatum[] | null | undefined | PromiseLike<ChartDatum[] | null>;
  /** The key of each step's name. */
  step: string;
  /** The key of each step's count, and its entry in the container's config. */
  value: string;
  /** What the drop-off plate says: 'share' of the step before (default, "−38%"), 'count' ("742 left") or 'both'. */
  dropoff?: 'share' | 'count' | 'both';
  /** A drop the author calls bad: its plate wears critical, with the icon and the words "Steep drop". */
  bad?: (step: FunnelStep) => boolean;
  /** The same steps in an earlier period, matched by step name: a 2px ink tick at each earlier count. */
  compare?: { data: ChartDatum[]; label: string };
  /** Filter in place: steps that don't apply recede to 35%. */
  relevance?: (d: ChartDatum) => 'match' | 'miss' | undefined;
  /** Steps you can select: the selected step's name, and what to do when one is chosen (null clears). */
  selected?: string | null;
  onSelect?: (d: ChartDatum | null) => void;
  empty?: import('./chart').ChartEmpty;
  tooltip?: boolean;
}

/** A step with what it lost: its share of the first step, and its drop from the step before. */
export interface FunnelStep { name: string; count: number; share: number; drop: number | null; left: number | null; record: ChartDatum }

const num = (v: unknown): v is number => typeof v === 'number' && isFinite(v);
const pct = (v: number) => `${Math.round(v * 100)}%`;
const PLATE_H = 20;

/** Each step with its share of the first and its drop from the one before, in the data's order. */
function stepsOf(rows: ChartDatum[], p: FunnelProps): FunnelStep[] {
  const first = rows.find((d) => num(d[p.value]))?.[p.value] as number | undefined;
  let prev: number | null = null;
  return rows.map((d) => {
    const c = num(d[p.value]) ? (d[p.value] as number) : 0;
    const out: FunnelStep = { name: String(d[p.step]), count: c, share: first ? c / first : 0, drop: prev ? (prev - c) / prev : null, left: prev !== null ? prev - c : null, record: d };
    prev = c;
    return out;
  });
}
function formats(p: FunnelProps, config: ChartConfig) {
  const nf = new Intl.NumberFormat();
  return { f: config[p.value]?.format ?? ((v: number) => nf.format(v)), label: config[p.value]?.label ?? p.value };
}
/** The drop-off plate's words: "−38% · 742 left", or "more than the step before" when a step grew. */
function dropWords(s: FunnelStep, p: FunnelProps, f: (v: number) => string) {
  if (s.drop === null || s.left === null) return '';
  if (s.left < 0) return `+${f(-s.left)} more than the step before`;
  const share = `−${pct(s.drop)}`, count = `${f(s.left)} left`;
  return p.dropoff === 'count' ? count : p.dropoff === 'both' ? `${share} · ${count}` : share;
}
const earlier = (p: FunnelProps, name: string) => {
  const d = p.compare?.data.find((r) => String(r[p.step]) === name);
  return d && num(d[p.value]) ? (d[p.value] as number) : null;
};

export function Funnel(props: FunnelProps) {
  const ctx = useChart();
  const { data, x, y, ground, encode, alpha, width, config } = ctx;
  if (x.kind !== 'band' || !data.length) return null;
  const p = props;
  const bx = x as BandScale;
  const e = encode(p.value);
  const { f } = formats(p, config);
  const steps = stepsOf(data, p);
  // The room chartInfo kept right of the plot for the counts.
  const room = Math.ceil(Math.max(0, ...steps.map((s) => textWidth(`${f(s.count)} · ${pct(s.share)}`)))) + 12;
  return (
    <g className="alt-funnel">
      {steps.map((s, i) => {
        const top = bx(s.name), h = bx.bandwidth, end = y(s.count);
        const was = earlier(p, s.name);
        const label = `${f(s.count)} · ${pct(s.share)}`;
        const fits = end + 8 + textWidth(label) <= width + room;
        return (
          <g key={s.name} opacity={alpha(s.record, p.value)}>
            <rect className="alt-funnel-bar" x={ground} y={top} width={Math.max(0, end - ground)} height={h} fill={e.fill} stroke={e.edge} />
            {was !== null && <line className="alt-funnel-was" x1={Math.round(y(was)) + 0.5} x2={Math.round(y(was)) + 0.5} y1={top - 2} y2={top + h + 2} />}
            <text className="alt-funnel-count" x={fits ? end + 8 : end - 8} y={top + h / 2} dy="0.32em" textAnchor={fits ? 'start' : 'end'} data-inside={fits ? undefined : ''}>{label}</text>
            {i > 0 && <Plate s={s} p={p} f={f} x={ground} y={top - (bx.step - h) / 2} />}
          </g>
        );
      })}
    </g>
  );
}

/** The drop-off, in the gutter above a step: a flush plate with the down-right arrow, or critical with the icon and words. */
function Plate({ s, p, f, x, y }: { s: FunnelStep; p: FunnelProps; f: (v: number) => string; x: number; y: number }) {
  const bad = !!p.bad?.(s) && (s.left ?? 0) > 0;
  const words = `${bad ? 'Steep drop · ' : ''}${dropWords(s, p, f)}`;
  if (!words) return null;
  const w = textWidth(words) + 30;
  return (
    <g className="alt-funnel-drop" data-bad={bad ? '' : undefined} transform={`translate(${x + 4},${y - PLATE_H / 2})`} aria-hidden="true">
      <rect width={w} height={PLATE_H} rx={4} />
      {bad ? <Icons.AlertTriangle size={13} x={7} y={3.5} className="alt-funnel-icon" />
        : (s.left ?? 0) >= 0 ? <path className="alt-funnel-icon" d="M8 6.5l7 7M15 8.5v5h-5" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          : <path className="alt-funnel-icon" d="M8 13.5l7-7M10 6.5h5v5" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />}
      <text x={24} y={PLATE_H / 2} dy="0.32em">{words}</text>
    </g>
  );
}

/** "Activated: 1,204 people, 61% of Visited. Down 38% from Signed up, 742 left." */
Funnel.chartName = (props: Record<string, unknown>, ctx: ChartContextValue, d: ChartDatum): string => {
  const p = props as unknown as FunnelProps;
  const { f, label } = formats(p, ctx.config);
  const steps = stepsOf(ctx.data, p);
  const i = steps.findIndex((s) => s.record === d || s.name === String(d[p.step]));
  const s = steps[i];
  if (!s) return '';
  let out = `${s.name}: ${f(s.count)} ${label.toLowerCase()}, ${pct(s.share)} of ${steps[0].name}.`;
  if (i > 0 && s.left !== null) out += s.left < 0 ? ` ${f(-s.left)} more than ${steps[i - 1].name}.` : ` Down ${pct(s.drop ?? 0)} from ${steps[i - 1].name}, ${f(s.left)} left.`;
  if (p.bad?.(s) && (s.left ?? 0) > 0) out += ' Steep drop.';
  const was = earlier(p, s.name);
  if (was !== null && p.compare) out += ` ${p.compare.label}: ${f(was)}${was ? `, ${s.count >= was ? 'up' : 'down'} ${pct(Math.abs(s.count - was) / was)}` : ''}.`;
  return out;
};
Funnel.chartReadout = (props: Record<string, unknown>, ctx: ChartContextValue, d: ChartDatum): ChartReadout => {
  const p = props as unknown as FunnelProps;
  const { f, label } = formats(p, ctx.config);
  const steps = stepsOf(ctx.data, p);
  const i = steps.findIndex((s) => s.name === String(d[p.step]));
  const s = steps[i];
  const color = ctx.encode(p.value).stroke;
  const items: ChartReadout['items'] = [{ key: 'c', label, value: s?.count ?? 0, text: s ? `${f(s.count)} (${pct(s.share)})` : '—', color }];
  if (s && i > 0 && s.left !== null) items.push({ key: 'd', label: `From ${steps[i - 1].name}`, value: s.left, text: s.left < 0 ? `+${f(-s.left)}` : `−${pct(s.drop ?? 0)} · ${f(s.left)} left`, color });
  const was = s ? earlier(p, s.name) : null;
  if (was !== null && p.compare && s) items.push({ key: 'w', label: p.compare.label, value: was, text: `${f(was)}${was ? ` (${s.count >= was ? '+' : '−'}${pct(Math.abs(s.count - was) / was)})` : ''}`, color });
  return { label: s?.name ?? '', items, indicator: 'dot' };
};
/** ↑/↓ (and ←/→) move between steps; Home and End to the first and last. */
Funnel.chartMove = (_props: Record<string, unknown>, ctx: ChartContextValue, index: number, e: React.KeyboardEvent): number | null => {
  const n = ctx.data.length;
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') return Math.min(n - 1, index + 1);
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') return Math.max(0, index - 1);
  if (e.key === 'Home') return 0;
  if (e.key === 'End') return n - 1;
  return null;
};

Funnel.chartInfo = (props: Record<string, unknown>, config: ChartConfig): ChartInfo => {
  const p = props as unknown as FunnelProps;
  const raw = Array.isArray(p.data) ? p.data : undefined;
  const { f, label } = formats(p, config);
  let summary: string | undefined;
  let right = 0;
  if (raw && raw.length) {
    const steps = stepsOf(raw, p);
    const a = steps[0], z = steps[steps.length - 1];
    const drops = steps.filter((s) => s.drop !== null && (s.left ?? 0) > 0);
    const worst = drops.length ? drops.reduce((m, s) => ((s.drop ?? 0) > (m.drop ?? 0) ? s : m)) : null;
    const wi = worst ? steps.indexOf(worst) : -1;
    const grew = steps.filter((s) => (s.left ?? 0) < 0).map((s) => s.name);
    summary = `Funnel of ${label.toLowerCase()} through ${steps.length} steps. Of ${f(a.count)} at ${a.name}, ${f(z.count)} reached ${z.name} (${pct(z.share)}).`
      + (worst ? ` The largest drop is between ${steps[wi - 1].name} and ${worst.name}: ${pct(worst.drop ?? 0)}.` : '')
      + (grew.length ? ` ${grew.join(' and ')} ${grew.length > 1 ? 'have' : 'has'} more than the step before.` : '');
    right = Math.ceil(Math.max(...steps.map((s) => textWidth(`${f(s.count)} · ${pct(s.share)}`)))) + 12;
  }
  const yMax = raw ? Math.max(0, ...raw.map((d) => (num(d[p.value]) ? (d[p.value] as number) : 0)), ...(p.compare?.data ?? []).map((d) => (num(d[p.value]) ? (d[p.value] as number) : 0))) : undefined;
  return {
    kind: 'Funnel', xScale: 'band', layout: 'horizontal', zero: true, flat: true, swatch: 'rect', imprint: 'bars', bandPadding: 0.5,
    data: raw, x: p.step, id: (d) => String(d[p.step]), label: (d) => String(d[p.step]),
    yExtent: yMax !== undefined ? [0, yMax] : undefined, right,
    summary, relevance: p.relevance, selected: p.selected, onSelect: p.onSelect,
    columns: raw ? [
      { key: '__step', header: 'Step', cell: (d: ChartDatum) => String(d[p.step]) },
      { key: p.value, header: label, align: 'end' as const, cell: (d: ChartDatum) => (num(d[p.value]) ? f(d[p.value] as number) : '—'), sortValue: (d: ChartDatum) => (num(d[p.value]) ? (d[p.value] as number) : -Infinity) },
      { key: '__share', header: `Share of ${String(raw[0][p.step])}`, align: 'end' as const, cell: (d: ChartDatum) => { const s = stepsOf(raw, p).find((q) => q.record === d); return s ? pct(s.share) : '—'; } },
      { key: '__drop', header: 'From the step before', align: 'end' as const, cell: (d: ChartDatum) => { const s = stepsOf(raw, p).find((q) => q.record === d); return s && s.left !== null ? (s.left < 0 ? `+${f(-s.left)}` : `−${pct(s.drop ?? 0)} · ${f(s.left)} left`) : '—'; } },
      ...(p.compare ? [{ key: '__was', header: p.compare.label, align: 'end' as const, cell: (d: ChartDatum) => { const w = earlier(p, String(d[p.step])); return w === null ? '—' : f(w); } }] : []),
    ] : undefined,
  };
};
