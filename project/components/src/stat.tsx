import * as React from 'react';
import { cx, useDepth } from './core';
import { Badge } from './controls';
import { Arrive, Await, isPromise, readPromised, RevealGroup, useArrival, useHasWaited, useReportWaiting } from './suspense';

export interface StatChange {
  /** The change. By default a fraction (0.08 is up 8%); with `format`, in whatever units you format. */
  value: number;
  /** What it's compared with, in words: "last month". */
  vs?: string;
  /** The value it's compared with, shown and announced as "vs last month: 11,556". Formatted like the value. */
  previous?: number;
  /** Formats the size of the change, without its sign: the stat says "Up" or "Down" in words. Default: a percentage. */
  format?: (magnitude: number) => string;
}

export interface StatProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  /** What the number is: "Active users". It names the stat. */
  label: React.ReactNode;
  /**
   * The number. Undefined while your data loads, or a promise: until it lands the value is an imprint of a number's
   * width, with the label already in place. null: nothing to show (an em dash).
   */
  value: number | string | null | undefined | PromiseLike<number | string | null>;
  /** Formats a numeric value and `change.previous`. Default: Intl.NumberFormat. */
  format?: (value: number) => string;
  /** How it changed, and against what. */
  change?: StatChange;
  /**
   * Which direction is good. Without it the change is neutral, ink-muted text with an arrow, because up isn't always
   * good (an error rate). With it, the change is a Badge plate whose lamp is positive or critical.
   */
  good?: 'up' | 'down';
  /** A trend beside the value, usually a decorative Sparkline. */
  trend?: React.ReactNode;
  /** More context, in a caption under the change: "Signed in at least once in 28 days." */
  help?: React.ReactNode;
  /** 'hero' sets the value in text-display, for the one number a view leads with. Once per view. */
  size?: 'default' | 'hero';
  /** Announce a changed value politely: "Active users, 12,480, up 8% vs last month." */
  live?: boolean;
  locale?: string;
}

const ARROWS = { up: 'M4 12 12 4M6 4h6v6', down: 'M4 4l8 8M12 6v6H6', flat: 'M3 8h10M9 4l4 4-4 4' };
function Arrow({ dir }: { dir: 'up' | 'down' | 'flat' }) {
  return (
    <svg className="alt-stat-arrow" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d={ARROWS[dir]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * A headline number with how it changed and against what. A number is the record, so a stat lies flush on whatever
 * it sits on (a Card, or the page): no level of its own. A changed value cross-fades and the stat gets the afterglow,
 * within the attention budget; it never counts up. The change says its direction in words and with an arrow, and only
 * takes a status colour when you say which direction is good.
 */
export function Stat({ value, ...props }: StatProps) {
  const missing = value === undefined;
  useReportWaiting(missing || isPromise(value));
  const arrival = useArrival(missing);
  if (!useHasWaited(missing || isPromise(value))) return <StatFace {...props} value={value as number | string | null} />;
  return <StatFace {...props} value={value as number | string | null} waiting arrival={arrival} />;
}

function PromisedText({ p }: { p: PromiseLike<unknown> }) {
  return <span className="alt-stat-text">{readPromised(p) as React.ReactNode}</span>;
}

function StatFace({ label, value, format, change, good, trend, help, size = 'default', live, locale, className, waiting, arrival, ...rest }: Omit<StatProps, 'value'> & { value: unknown; waiting?: boolean; arrival?: PromiseLike<void> | null }) {
  const id = React.useId();
  const nf = React.useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const pf = React.useMemo(() => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }), [locale]);
  const fmt = format ?? ((n: number) => nf.format(n));
  const resolved = isPromise(value) ? undefined : value;
  const text = typeof resolved === 'number' ? fmt(resolved) : resolved === null ? '—' : (resolved as string | undefined);

  // The value cross-fades: the old text stays a moment on top, fading out, while the new one fades in under it.
  const [prev, setPrev] = React.useState<{ text: string; key: number } | null>(null);
  const shown = React.useRef(text);
  React.useEffect(() => {
    if (shown.current !== undefined && text !== undefined && shown.current !== text) setPrev((p) => ({ text: shown.current!, key: (p?.key ?? 0) + 1 }));
    shown.current = text;
  }, [text]);
  React.useEffect(() => {
    if (!prev) return;
    const t = setTimeout(() => setPrev(null), 400);
    return () => clearTimeout(t);
  }, [prev]);
  // The afterglow: only when a value that was there changes, not when it first lands.
  const [glowKey, setGlowKey] = React.useState(0);
  const depth = useDepth({ settle: glowKey || undefined });
  React.useEffect(() => { if (prev) setGlowKey((k) => k + 1); }, [prev?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const dir = !change ? null : change.value > 0 ? 'up' : change.value < 0 ? 'down' : 'flat';
  const magnitude = change ? (change.format ?? ((m: number) => pf.format(m)))(Math.abs(change.value)) : '';
  const words = dir === 'up' ? `Up ${magnitude}` : dir === 'down' ? `Down ${magnitude}` : dir === 'flat' ? 'No change' : '';
  const tone = !good || !dir || dir === 'flat' ? null : dir === good ? 'positive' : 'critical';
  const vs = change?.vs ? `vs ${change.vs}${change.previous !== undefined ? `: ${fmt(change.previous)}` : ''}` : change?.previous !== undefined ? `Previously ${fmt(change.previous)}` : null;

  const labelText = typeof label === 'string' ? label : '';
  const said = live && text !== undefined ? [labelText, text, words && `${words.toLowerCase()}${change?.vs ? ` vs ${change.vs}` : ''}`].filter(Boolean).join(', ') + '.' : '';

  const face = <>
    <span key={text} className="alt-stat-text" data-in={prev ? '' : undefined}>{text}</span>
    {prev && <span key={'p' + prev.key} className="alt-stat-text" data-out="" aria-hidden="true">{prev.text}</span>}
  </>;
  const valueNode = !waiting ? face : (
    <Await inline shape="text" imprint={<span className="alt-skeleton alt-stat-imprint" />}>
      <Arrive when={arrival ?? null}>{isPromise(value) ? <PromisedText p={formatWhenLanded(value as PromiseLike<unknown>, fmt)} /> : face}</Arrive>
    </Await>
  );

  return (
    <section className={cx('alt-stat', className)} data-size={size} aria-labelledby={`${id}-l`} {...depth} {...rest}
      style={{ ...depth.style, ...rest.style }}>
      <div id={`${id}-l`} className="alt-stat-label">{label}</div>
      <div className="alt-stat-main">
        <span className="alt-stat-value">{valueNode}</span>
        {trend && <span className="alt-stat-trend">{trend}</span>}
      </div>
      {(change || help) && (
        <div className="alt-stat-foot">
          {change && (tone
            ? <Badge tone={tone} className="alt-stat-change"><Arrow dir={dir!} />{words}</Badge>
            : <span className="alt-stat-change" data-neutral=""><Arrow dir={dir!} />{words}</span>)}
          {vs && <span className="alt-stat-vs">{vs}</span>}
          {help && <span className="alt-stat-help">{help}</span>}
        </div>
      )}
      {live && <span className="alt-sr" aria-live="polite">{said}</span>}
    </section>
  );
}

// A promised value is formatted when it lands; the formatted promise is kept per input, so every render reads the same one.
const formatted = new WeakMap<object, PromiseLike<unknown>>();
function formatWhenLanded(p: PromiseLike<unknown>, fmt: (n: number) => string) {
  let f = formatted.get(p as object);
  if (!f) formatted.set(p as object, (f = p.then((v) => (typeof v === 'number' ? fmt(v) : v === null ? '—' : v))));
  return f;
}

export interface StatGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Names the row of stats for assistive technology: "This month". */
  'aria-label'?: string;
}
/**
 * A row of stats that land together: their values stay imprints until the slowest arrives, then rise at once
 * (RevealGroup). They wrap to fit, each at least 180px wide.
 */
export function StatGroup({ className, children, ...rest }: StatGroupProps) {
  return (
    <RevealGroup>
      <div role="group" className={cx('alt-stat-group', className)} {...rest}>{children}</div>
    </RevealGroup>
  );
}
