import * as React from 'react';
import { cx, useIsoLayoutEffect } from './core';
import { Button } from './controls';
import { Arrive, Await, useArrival, useHasWaited, useReportWaiting } from './suspense';

export interface BarListItem {
  /** The row's label: a page, a referrer, a customer. Also its key unless `key` is given. */
  name: string;
  value: number;
  key?: string;
  /** Makes the row a link. */
  href?: string;
}

export interface BarListProps extends Omit<React.HTMLAttributes<HTMLOListElement>, 'onSelect'> {
  /** The rows. Undefined while your data loads: until they land the list is imprinted rows. */
  data: BarListItem[] | null | undefined;
  /** Formats values. Default: Intl.NumberFormat. */
  format?: (value: number) => string;
  /** Show at most this many rows; the rest fold into one "Other" row, with a "Show all" button. */
  limit?: number;
  /** After each value, show its share of the total ("22%"). */
  share?: boolean;
  /** Rank by value, largest first (default), or keep the data's order. */
  sort?: 'desc' | false;
  /** What the rows are, in the plural, for "Other (14 pages)" and "Show all 52 pages". */
  noun?: string;
  /** Makes each row a button (rows with `href` are links). */
  onSelect?: (item: BarListItem) => void;
  /** Filter in place: matches rise one level, misses sink into a well and say "Not matching". Nothing is removed. */
  relevance?: (item: BarListItem) => 'match' | 'miss' | undefined;
  locale?: string;
}

const keyOf = (d: BarListItem) => d.key ?? d.name;

/**
 * A ranked list whose rows are their own bars. Rows are the record, flush on the ground with line dividers, like a
 * table's; each carries a flat data-1 bar behind its label, its length the row's value against the largest, faint
 * enough that ink holds 4.5:1 over it. A row that does something (a link, a button) lifts one level when pointed at,
 * as Table's rows do; its bar stays flat on it. When values change, rows are carried to their new ranks all at once.
 */
export function BarList(props: BarListProps) {
  const missing = props.data === undefined;
  useReportWaiting(missing);
  const arrival = useArrival(missing);
  if (!useHasWaited(missing)) return <BarListFace {...props} />;
  const n = Math.min(props.limit ?? 5, 8);
  return (
    <Await shape="none" imprint={
      <ol className="alt-barlist" aria-hidden="true">
        {Array.from({ length: n }, (_, i) => (
          <li key={i} className="alt-barlist-row"><span className="alt-skeleton alt-barlist-imprint" style={{ width: `${92 - i * (60 / n)}%`, ['--i' as string]: i }} /></li>
        ))}
      </ol>
    }>
      <Arrive when={arrival}><BarListFace {...props} /></Arrive>
    </Await>
  );
}

function BarListFace({ data, format, limit, share, sort = 'desc', noun, onSelect, relevance, locale, className, ...rest }: BarListProps) {
  const nf = React.useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const pf = React.useMemo(() => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }), [locale]);
  const fmt = format ?? ((n: number) => nf.format(n));
  const [all, setAll] = React.useState(false);
  const rows = React.useMemo(() => {
    const list = (data ?? []).filter((d) => typeof d.value === 'number' && isFinite(d.value));
    return sort === 'desc' ? [...list].sort((a, b) => b.value - a.value) : list;
  }, [data, sort]);
  const total = rows.reduce((t, d) => t + Math.max(0, d.value), 0);
  const folded = limit !== undefined && rows.length > limit + 1 && !all;
  const shown = folded ? rows.slice(0, limit) : rows;
  const rest_ = folded ? rows.slice(limit) : [];
  const other = rest_.length ? { name: `Other (${rest_.length}${noun ? ` ${noun}` : ''})`, value: rest_.reduce((t, d) => t + d.value, 0), key: '\u0000other' } : null;
  const max = Math.max(0, ...shown.map((d) => d.value), other?.value ?? 0) || 1;

  // Re-ranked rows are carried to their new places (FLIP), all at once: a re-rank is one change.
  const refs = React.useRef(new Map<string, HTMLLIElement>());
  const tops = React.useRef(new Map<string, number>());
  useIsoLayoutEffect(() => {
    const next = new Map<string, number>();
    refs.current.forEach((el, k) => next.set(k, el.offsetTop));
    const cs = refs.current.size ? getComputedStyle([...refs.current.values()][0]) : null;
    const travel = cs ? parseFloat(cs.getPropertyValue('--alt-travel')) : 1;
    if (cs && travel !== 0 && tops.current.size) {
      const dur = parseFloat(cs.getPropertyValue('--dur-travel-3')) || 220;
      const ease = cs.getPropertyValue('--ease-glide').trim() || 'ease';
      next.forEach((top, k) => {
        const was = tops.current.get(k);
        const el = refs.current.get(k);
        if (was === undefined || was === top || !el?.animate) return;
        el.animate([{ transform: `translateY(${was - top}px)` }, { transform: 'none' }], { duration: dur, easing: ease });
      });
    }
    tops.current = next;
  });

  const row = (d: BarListItem, rank: number, isOther = false) => {
    const k = isOther ? '\u0000other' : keyOf(d);
    const rel = !isOther ? relevance?.(d) : undefined;
    const pct = share && total > 0 ? pf.format(Math.max(0, d.value) / total) : null;
    // The bar runs under the label and the value only; a share sits outside it, so the longest bar ends at the value.
    const body = (
      <>
        <span className="alt-barlist-zone">
          <span className="alt-barlist-bar" aria-hidden="true" style={{ width: `${(Math.max(0, d.value) / max) * 100}%` }} />
          {!isOther && <span className="alt-sr">{rank}. </span>}
          <span className="alt-barlist-name">{d.name}{rel === 'miss' && <span className="alt-sr">, not matching</span>}</span>
          <span className="alt-sr">, </span>
          <span className="alt-barlist-value">{fmt(d.value)}</span>
        </span>
        {pct && <><span className="alt-sr">, </span><span className="alt-barlist-share">{pct}</span></>}
      </>
    );
    const act = !isOther && (d.href || onSelect);
    return (
      <li key={k} ref={(el) => { if (el) refs.current.set(k, el); else refs.current.delete(k); }}
        className="alt-barlist-row" data-other={isOther ? '' : undefined} data-relevance={rel} value={isOther ? undefined : rank}>
        {d.href && !isOther
          ? <a className="alt-barlist-item" data-interactive="" href={d.href} onClick={onSelect ? () => onSelect(d) : undefined}>{body}</a>
          : act ? <button type="button" className="alt-barlist-item" data-interactive="" onClick={() => onSelect!(d)}>{body}</button>
            : <span className="alt-barlist-item">{body}</span>}
      </li>
    );
  };

  return (
    <div className={cx('alt-barlist-wrap', className)}>
      <ol className="alt-barlist" role="list" {...rest}>
        {shown.map((d, i) => row(d, i + 1))}
        {other && row(other, shown.length + 1, true)}
      </ol>
      {limit !== undefined && rows.length > limit + 1 && (
        <Button variant="ghost" size="sm" className="alt-barlist-more" aria-expanded={all} onClick={() => setAll((a) => !a)}>
          {all ? 'Show fewer' : `Show all ${rows.length}${noun ? ` ${noun}` : ''}`}
        </Button>
      )}
    </div>
  );
}
