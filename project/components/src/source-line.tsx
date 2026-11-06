import * as React from 'react';
import { cx, Icons, useDepth } from './core';
import { Link } from './link';
import { RelativeTime, useNow } from './relative-time';

/**
 * Where a chart's or a stat's data came from, when it was read and how much of it there is (#533). A settled chart
 * otherwise says nothing about its provenance; in an agent-built app it's often drawn from a query the reader never
 * saw, and this line is the only account of it (Sultanum, Bromley & Correll, Data Guards, 2024).
 */
export interface DataSource {
  /** Where the data lives, or the query that made it: "Billing database". A string, or your own Link. */
  name?: React.ReactNode;
  /** Makes a string `name` a Link to where the data lives. */
  href?: string;
  /** When the data was read. Said relative ("Updated 2 minutes ago", the exact time on hover and focus) and kept true as time passes. */
  asOf?: Date | string | number;
  /** How many records are behind it: "1,954 records". */
  count?: number;
  /** What a record is called, plural: "orders". Default "records". */
  noun?: string;
  /** After how many milliseconds since `asOf` the data is stale. Past it the line leads with a caution icon and "Stale". */
  staleAfter?: number;
}

/** The source in a sentence, for a figure's summary and description: absolute time, since a sentence doesn't tick. */
export function sourceSentence(s: DataSource | undefined, locale?: string, now = Date.now()): string {
  if (!s) return '';
  const name = typeof s.name === 'string' || typeof s.name === 'number' ? String(s.name) : '';
  const parts = [name ? `Source: ${name}` : '', countWords(s, locale)];
  const t = s.asOf !== undefined ? new Date(s.asOf).getTime() : NaN;
  if (isFinite(t)) parts.push(`as of ${new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(t)}`);
  const words = parts.filter(Boolean).join(', ');
  if (!words) return '';
  const stale = isStale(s, now);
  return `${stale ? 'Stale. ' : ''}${words.charAt(0).toUpperCase()}${words.slice(1)}.`;
}
function countWords(s: DataSource, locale?: string) {
  if (s.count === undefined || !isFinite(s.count)) return '';
  const plural = s.noun ?? 'records';
  const noun = s.count === 1 ? plural.replace(/ies$/, 'y').replace(/s$/, '') : plural;
  return `${new Intl.NumberFormat(locale).format(s.count)} ${noun}`;
}
function isStale(s: DataSource, now: number) {
  if (s.staleAfter === undefined || s.asOf === undefined) return false;
  const t = new Date(s.asOf).getTime();
  return isFinite(t) && now - t > s.staleAfter;
}

/**
 * The source line: one flush caption-weight line in ink-muted under what it describes. "Source: Billing database ·
 * 1,954 records · Updated 2 minutes ago". Past `staleAfter` it leads with a caution icon and the word "Stale"; the
 * data it describes doesn't change, because the record is still the record, only old. Becoming stale takes the
 * afterglow once and is said politely once.
 */
export function SourceLine({ source, locale, lead, className, glow }: { source: DataSource; locale?: string; lead?: React.ReactNode; className?: string; glow?: number }) {
  const now = useNow();
  const stale = isStale(source, now);
  // The afterglow and the announcement are for becoming stale, not for being stale on arrival.
  const [turned, setTurned] = React.useState(0);
  const [said, setSaid] = React.useState('');
  const was = React.useRef(stale);
  React.useEffect(() => {
    if (stale && !was.current) { setTurned((n) => n + 1); setSaid(`Stale: ${sourceSentence({ ...source, staleAfter: undefined }, locale).replace(/\.$/, '')}.`); }
    if (!stale) setSaid('');
    was.current = stale;
  }, [stale]); // eslint-disable-line react-hooks/exhaustive-deps
  const { style, ...depth } = useDepth({ settle: (turned + (glow ?? 0)) || undefined });
  const name = source.name === undefined || source.name === null || source.name === '' ? null
    : source.href && (typeof source.name === 'string' || typeof source.name === 'number') ? <Link href={source.href}>{source.name}</Link> : source.name;
  const t = source.asOf !== undefined ? new Date(source.asOf).getTime() : NaN;
  const bits: React.ReactNode[] = [];
  if (name) bits.push(<span key="n">Source: {name}</span>);
  const count = countWords(source, locale);
  if (count) bits.push(<span key="c">{count}</span>);
  if (isFinite(t)) bits.push(<span key="t">{bits.length || stale ? 'updated' : 'Updated'} <RelativeTime date={t} locale={locale} tense="past" /></span>);
  if (!bits.length && !lead) return null;
  const items = [...(stale ? [<span key="s" className="alt-source-stale"><Icons.AlertTriangle size={13} aria-hidden="true" />Stale</span>] : []), ...bits];
  return (
    <p className={cx('alt-source', className)} data-stale={stale ? '' : undefined} {...depth} style={style}>
      {lead}
      {items.map((b, i) => <React.Fragment key={i}>{i > 0 && <span className="alt-source-sep" aria-hidden="true"> · </span>}{b}</React.Fragment>)}
      <span className="alt-sr" aria-live="polite">{said}</span>
    </p>
  );
}
