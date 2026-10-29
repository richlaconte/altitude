import * as React from 'react';
import { cx, Icons, useIsoLayoutEffect } from './core';

/* ───────────────────────── Pagination ───────────────────────── */

/** The pages shown: the first, the last, the current one and `siblings` either side, with a gap where pages are skipped. */
export function pageRange(page: number, count: number, siblings = 1): (number | 'gap')[] {
  const want = new Set([1, count, ...Array.from({ length: siblings * 2 + 1 }, (_, i) => page - siblings + i)].filter((p) => p >= 1 && p <= count));
  const sorted = [...want].sort((a, b) => a - b), out: (number | 'gap')[] = [];
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1];
    // A gap of exactly one page shows that page: "…" would take as much room and say less.
    if (prev !== undefined && p - prev === 2) out.push(prev + 1);
    else if (prev !== undefined && p - prev > 2) out.push('gap');
    out.push(p);
  });
  return out;
}

export interface PaginationProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> {
  /** The current page, from 1. */
  page: number;
  /** How many pages. Leave it out for cursor paging: Previous and Next, and "Page 3". */
  pageCount?: number;
  onPageChange?: (page: number) => void;
  /** With pageSize: the summary "21–40 of 214". */
  total?: number;
  pageSize?: number;
  /** Pages have URLs: they're links. Without it they're buttons. */
  hrefFor?: (page: number) => string;
  /** For cursor paging: whether there's a next page. Default true. */
  hasNext?: boolean;
  /** Pages either side of the current one. Default 1. */
  siblings?: number;
  /** The next page is loading: the thumb is held pressed until it lands. */
  loading?: boolean;
  /** What's being paged, plural, for the summary ("invoices"). */
  noun?: string;
  locale?: string;
}
/**
 * Move through pages of a collection. The page numbers sit in a trench and the current page is one raised thumb that
 * travels to it, as RadioGroup's does: "you are here, among these". They stay links (or buttons) in plain Tab order.
 */
export function Pagination({ page, pageCount, onPageChange, total, pageSize, hrefFor, hasNext = true, siblings = 1, loading, noun, locale, className, 'aria-label': label = 'Pagination', ...rest }: PaginationProps) {
  const track = React.useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = React.useState({ x: 0, w: 0, ready: false });
  const measure = React.useCallback(() => {
    const el = track.current?.querySelector<HTMLElement>('[aria-current="page"]');
    setThumb((t) => (el ? { x: el.offsetLeft, w: el.offsetWidth, ready: t.w > 0 || t.ready } : { ...t, w: 0 }));
  }, []);
  useIsoLayoutEffect(() => { measure(); }, [measure, page, pageCount]);
  React.useEffect(() => {
    if (!track.current) return;
    const ro = new ResizeObserver(measure);
    ro.observe(track.current);
    return () => ro.disconnect();
  }, [measure]);

  const nf = new Intl.NumberFormat(locale);
  const first = page <= 1, last = pageCount !== undefined ? page >= pageCount : !hasNext;
  const go = (p: number) => (e: React.MouseEvent) => { if (!hrefFor) e.preventDefault(); onPageChange?.(p); };
  const target = (p: number, props: Record<string, unknown>, children: React.ReactNode, disabled = false) => hrefFor
    ? <a href={disabled ? undefined : hrefFor(p)} aria-disabled={disabled || undefined} onClick={disabled ? undefined : go(p)} {...props}>{children}</a>
    : <button type="button" aria-disabled={disabled || undefined} onClick={disabled ? undefined : go(p)} {...props}>{children}</button>;
  const step = (p: number, text: string, icon: React.ReactNode, disabled: boolean, dir: 'prev' | 'next') =>
    target(p, { className: 'alt-btn alt-pager-step', 'data-variant': 'ghost', 'data-size': 'sm', 'data-dir': dir, 'aria-label': `${text} page` }, dir === 'prev' ? <>{icon}<span className="alt-pager-step-text">{text}</span></> : <><span className="alt-pager-step-text">{text}</span>{icon}</>, disabled);
  const summary = total !== undefined && pageSize ? (total === 0 ? `No ${noun ?? 'results'}` : `${nf.format(Math.min(total, (page - 1) * pageSize + 1))}–${nf.format(Math.min(total, page * pageSize))} of ${nf.format(total)}${noun ? ` ${noun}` : ''}`) : pageCount === undefined ? `Page ${nf.format(page)}` : '';

  return (
    <nav className={cx('alt-pager', className)} aria-label={label} data-cursor={pageCount === undefined ? '' : undefined} aria-busy={loading || undefined} {...rest}>
      {step(page - 1, 'Previous', <Icons.ChevronDown style={{ transform: 'rotate(90deg)' }} />, first, 'prev')}
      {pageCount !== undefined && (
        <div ref={track} className="alt-pager-track">
          <span className="alt-pager-thumb" aria-hidden="true" data-ready={thumb.ready ? '' : undefined} data-loading={loading ? '' : undefined}
            style={{ transform: `translateX(${thumb.x}px)`, width: thumb.w, opacity: thumb.w ? 1 : 0 }} />
          <ol className="alt-pager-pages">{pageRange(page, pageCount, siblings).map((p, i) => p === 'gap'
            ? <li key={'gap' + i} className="alt-pager-gap"><span aria-hidden="true">…</span><span className="alt-sr">More pages</span></li>
            : <li key={p}>{target(p, { className: 'alt-pager-page', 'aria-current': p === page ? 'page' : undefined, 'aria-label': `Page ${nf.format(p)}` }, nf.format(p))}</li>)}</ol>
        </div>
      )}
      {step(page + 1, 'Next', <Icons.ChevronDown style={{ transform: 'rotate(-90deg)' }} />, last, 'next')}
      {summary && <span className="alt-pager-summary" aria-live="polite">{summary}</span>}
    </nav>
  );
}
