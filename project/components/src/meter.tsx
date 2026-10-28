import * as React from 'react';
import { cx } from './core';
import { Badge } from './controls';
import type { ChartSlot } from './chart';
import { Arrive, Await, useArrival, useHasWaited, useReportWaiting } from './suspense';

export interface MeterSegment {
  key: string;
  label: string;
  value: number;
  /** The segment's colour slot. Default: its place in the list (data-1, data-2, …; a seventh and later are data-other). */
  color?: ChartSlot;
}

export interface MeterProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** What's being measured: "Storage". It names the meter. */
  label: React.ReactNode;
  /** The reading. Undefined while your data loads: until it lands the track is an imprint. Ignored when `segments` is set (their sum is the reading). */
  value?: number;
  /** Default 0. */
  min?: number;
  /** Default 100. A reading above it is over the limit. */
  max?: number;
  /** From here the reading is near its limit: the fill turns caution and the meter says "Near limit". */
  high?: number;
  /** From here the reading is critical: the fill turns critical and the meter says "Over limit". Default: anything above `max`. */
  critical?: number;
  /** Parts of the whole (storage by type): flat data-* fills parted by 2px, with a legend of their values. */
  segments?: MeterSegment[];
  /** Formats readings: "62 GB". Default: Intl.NumberFormat. */
  format?: (value: number) => string;
  /** The words for each state. Default "Near limit" and "Over limit". */
  states?: { high?: string; critical?: string };
  /** Hide the "62 GB of 100 GB" text beside the label (it's still announced). */
  hideValue?: boolean;
  locale?: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Where a reading sits in a known range: storage of a quota, seats of a plan, CPU. A reading is the record, so the
 * meter lies on the ground: a flush track with the reading drawn as flat ink across it (unlike Progress, whose fill
 * rises out of a trench because a task under way is live). Thresholds are 1px notches at the track's rim; past them
 * the fill turns caution or critical and the state is said in words, with a lamp that relights when it changes.
 * Segments show parts of a whole, the honest replacement for a donut.
 */
export function Meter(props: MeterProps) {
  const missing = props.value === undefined && !props.segments;
  useReportWaiting(missing);
  const arrival = useArrival(missing);
  if (!useHasWaited(missing)) return <MeterFace {...props} />;
  return (
    <MeterFace {...props} track={(t) => (
      <Await shape="block" imprint={<div className="alt-skeleton alt-meter-imprint" />}><Arrive when={arrival}>{t}</Arrive></Await>
    )} />
  );
}

function MeterFace({ label, value, min = 0, max = 100, high, critical, segments, format, states, hideValue, locale, className, track, ...rest }: MeterProps & { track?: (t: React.ReactNode) => React.ReactNode }) {
  const id = React.useId();
  const nf = React.useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const fmt = format ?? ((n: number) => nf.format(n));
  const span = max - min || 1;
  const segs = segments?.map((s, i) => ({ ...s, slot: s.color ?? ((i < 6 ? `data-${i + 1}` : 'data-other') as ChartSlot) }));
  const reading = segs ? segs.reduce((t, s) => t + Math.max(0, s.value), 0) + min : value;
  const has = typeof reading === 'number' && isFinite(reading);
  const v = has ? reading! : min;
  const crit = critical ?? max;
  const state: 'normal' | 'high' | 'critical' = !has ? 'normal' : (critical !== undefined ? v >= crit : v > max) ? 'critical' : high !== undefined && v >= high ? 'high' : 'normal';
  const word = state === 'critical' ? states?.critical ?? 'Over limit' : state === 'high' ? states?.high ?? 'Near limit' : '';
  const of = has ? `${fmt(v)} of ${fmt(max)}` : '';
  const parts = segs ? segs.map((s) => `${s.label} ${fmt(s.value)}`).join(', ') : '';
  const valueText = has ? [of, word && word.toLowerCase(), parts].filter(Boolean).join(', ') : undefined;
  const pct = (x: number) => `${(clamp(x, min, max) - min) / span * 100}%`;

  const marks = [high, critical].filter((t): t is number => typeof t === 'number' && t > min && t < max);
  const fills = segs
    ? (() => {
      let at = min;
      return segs.filter((s) => s.value > 0).map((s) => {
        const from = at; at += s.value;
        return <span key={s.key} className="alt-meter-fill" data-slot={s.slot} style={{ left: pct(from), width: `calc(${pct(at)} - ${pct(from)})`, background: `var(--${s.slot})` }} />;
      });
    })()
    : has ? <span className="alt-meter-fill" style={{ left: 0, width: pct(v) }} /> : null;

  const bar = (
    <div className="alt-meter-track" data-state={state} data-segmented={segs ? '' : undefined}>
      {fills}
      {marks.map((t) => <span key={t} className="alt-meter-notch" style={{ left: pct(t) }} />)}
    </div>
  );

  return (
    <div className={cx('alt-meter', className)} role="meter" aria-labelledby={`${id}-l`}
      aria-valuemin={min} aria-valuemax={max} aria-valuenow={has ? clamp(v, min, max) : undefined} aria-valuetext={valueText}
      aria-busy={!has || undefined} data-state={state} {...rest}>
      <div className="alt-meter-head">
        <span id={`${id}-l`} className="alt-meter-label">{label}</span>
        {has && !hideValue && <span className="alt-meter-value" aria-hidden="true">{of}</span>}
        {word && <Badge tone={state === 'critical' ? 'critical' : 'caution'} className="alt-meter-state" aria-hidden="true">{word}</Badge>}
      </div>
      {track ? track(bar) : bar}
      {segs && (
        <ul className="alt-meter-legend" aria-hidden="true">
          {segs.map((s) => (
            <li key={s.key} className="alt-legend-key">
              <svg className="alt-legend-mark" width="10" height="10"><rect width="10" height="10" rx="2" fill={`var(--${s.slot})`} /></svg>
              <span>{s.label}</span><span className="alt-meter-legend-value">{fmt(s.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
