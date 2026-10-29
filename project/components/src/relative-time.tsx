import * as React from 'react';
import { cx, useDepth } from './core';
import { Tooltip } from './overlays';

/* ───────────────────────── RelativeTime ───────────────────────── */

// One timer for every RelativeTime on the page. It runs only while the page is visible and something is subscribed,
// and catches up at once when the page comes back.
const subscribers = new Set<() => void>();
let timer: number | undefined;
const TICK = 15_000;
const tickAll = () => subscribers.forEach((f) => f());
const onVisibility = () => { syncTimer(); if (document.visibilityState === 'visible') tickAll(); };
function syncTimer() {
  const run = subscribers.size > 0 && document.visibilityState === 'visible';
  if (run && timer === undefined) timer = window.setInterval(tickAll, TICK);
  if (!run && timer !== undefined) { window.clearInterval(timer); timer = undefined; }
}
function useNow() {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const f = () => setNow(Date.now());
    if (!subscribers.size) document.addEventListener('visibilitychange', onVisibility);
    subscribers.add(f); syncTimer();
    return () => { subscribers.delete(f); syncTimer(); if (!subscribers.size) document.removeEventListener('visibilitychange', onVisibility); };
  }, []);
  return now;
}

/** An ISO 8601 duration (P7D, PT12H, P2W) or milliseconds, in milliseconds. */
function durationMs(d: string | number) {
  if (typeof d === 'number') return d;
  const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(d);
  if (!m) return 7 * 86_400_000;
  const [, w, day, h, min, s] = m.map((v) => Number(v ?? 0));
  return (((w * 7 + day) * 24 + h) * 60 + min) * 60_000 + s * 1000;
}

const STEPS: [Intl.RelativeTimeFormatUnit, number, number][] = [
  // unit, its length in seconds, and the largest count shown before moving up a unit
  ['second', 1, 45], ['minute', 60, 45], ['hour', 3600, 22], ['day', 86_400, 26], ['month', 2_629_800, 11], ['year', 31_557_600, Infinity],
];

export interface RelativeTimeOptions {
  /** 'relative' (default) always says "3 minutes ago"; 'auto' is relative within `threshold`, then a date ("Mar 4"). */
  format?: 'relative' | 'auto';
  /** For format="auto": how far from now stays relative. An ISO 8601 duration ("P7D", "PT12H") or milliseconds. Default "P7D". */
  threshold?: string | number;
  /** 'past' never says "in 2 minutes" (a clock running ahead shows "now"); 'future' never says "ago". Default 'auto'. */
  tense?: 'auto' | 'past' | 'future';
  /** Default: the browser's. */
  locale?: string;
}
/** A moment as words relative to `now`, the way RelativeTime shows it: "3 minutes ago", "yesterday", "in 2 hours", "Mar 4". */
export function formatRelativeTime(date: Date | string | number, now: number = Date.now(), { format = 'relative', threshold = 'P7D', tense = 'auto', locale }: RelativeTimeOptions = {}) {
  const t = new Date(date).getTime();
  if (!isFinite(t)) return '';
  let diff = (t - now) / 1000;
  if (tense === 'past') diff = Math.min(diff, 0);
  if (tense === 'future') diff = Math.max(diff, 0);
  if (format === 'auto' && Math.abs(diff) * 1000 > durationMs(threshold)) {
    const sameYear = new Date(t).getFullYear() === new Date(now).getFullYear();
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' }).format(t);
  }
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, size, max] of STEPS) {
    const n = Math.round(diff / size);
    if (Math.abs(n) < max) return rtf.format(unit === 'second' ? 0 : n, unit);
  }
  return '';
}

export interface RelativeTimeProps extends RelativeTimeOptions, Omit<React.TimeHTMLAttributes<HTMLElement>, 'children' | 'dateTime'> {
  /** The moment. When it changes (the record was edited again) it settles with the afterglow; time passing doesn't. */
  date: Date | string | number;
  /** Show the exact date, time and zone in a Tooltip on hover and focus (the element becomes focusable). Default true. */
  tooltip?: boolean;
}
/** A moment as "3 minutes ago" in a <time>, refreshed on one shared timer, with its exact time on hand. Ticking isn't a change. */
export function RelativeTime({ date, format, threshold, tense, locale, tooltip = true, className, title, style, ...rest }: RelativeTimeProps) {
  const now = useNow();
  const t = new Date(date).getTime();
  const text = formatRelativeTime(t, now, { format, threshold, tense, locale });
  const exact = isFinite(t) ? new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'long' }).format(t) : '';
  // The afterglow is for the moment changing, not for the words ticking forward.
  const [moved, setMoved] = React.useState(0);
  const first = React.useRef(t);
  React.useEffect(() => { if (t !== first.current) { first.current = t; setMoved((n) => n + 1); } }, [t]);
  const { style: depthStyle, ...depth } = useDepth({ settle: moved || undefined });
  const el = (
    <time dateTime={isFinite(t) ? new Date(t).toISOString() : undefined} className={cx('alt-reltime', className)}
      title={tooltip ? title : title ?? exact} tabIndex={tooltip ? 0 : undefined} suppressHydrationWarning
      {...depth} {...rest} style={{ ...depthStyle, ...style }}>{text}</time>
  );
  return tooltip && exact ? <Tooltip content={exact}>{el}</Tooltip> : el;
}
