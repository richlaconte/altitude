import * as React from 'react';
import { cx, useIsoLayoutEffect } from './core';

/** A paper size: 'a4' (210 × 297 mm), 'letter' (8.5 × 11 in), 'legal' (8.5 × 14 in), or any CSS lengths. */
export type PrintSheetSize = 'a4' | 'letter' | 'legal' | { width: string; height: string };
export interface PrintSheetProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** Names the document ("Invoice 1042"). */
  title: string;
  /** Default 'a4'. */
  size?: PrintSheetSize;
  /** The page's margins as CSS lengths, one or four (as `margin`). Default '20mm'. */
  margins?: string;
  /** Default 'portrait'. */
  orientation?: 'portrait' | 'landscape';
  /**
   * On screen only: 'fit' (default) scales the pages down to the container's width, never up; a number is a fixed scale
   * (1 = actual size). A transform, so the page keeps its print geometry exactly. Print is always actual size.
   */
  scale?: 'fit' | number;
  /** Repeated at the top of every page: a `PrintSheetHeader`. */
  header?: React.ReactNode;
  /** Repeated at the foot of every page: a `PrintSheetFooter`, perhaps with `PrintSheetPageNumber` and `PrintSheetPageCount`. */
  footer?: React.ReactNode;
  /** The data is on its way: each page is an imprint at its paper size, and the document says it's loading. */
  loading?: boolean;
}

const SIZES: Record<'a4' | 'letter' | 'legal', [string, string]> = { a4: ['210mm', '297mm'], letter: ['8.5in', '11in'], legal: ['8.5in', '14in'] };
/** The top and bottom of a 1-to-4-value margin, as `margin` reads it. */
function verticalMargins(margins: string): [string, string] {
  const v = margins.trim().split(/\s+(?![^(]*\))/);
  return [v[0], v.length > 2 ? v[2] : v[0]];
}
const PageContext = React.createContext<{ page: number; count: number }>({ page: 1, count: 1 });

/** The top of every page: flush caption text, as PageHeader's. */
export function PrintSheetHeader({ className, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return <header className={cx('alt-print-header', className)} {...rest} />;
}
/** The foot of every page. */
export function PrintSheetFooter({ className, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return <footer className={cx('alt-print-footer', className)} {...rest} />;
}
/** This page's number, inside a header or footer. */
export function PrintSheetPageNumber() { return <>{React.useContext(PageContext).page}</>; }
/** The number of pages, inside a header or footer. */
export function PrintSheetPageCount() { return <>{React.useContext(PageContext).count}</>; }
/**
 * A page break placed by hand. Directly inside a PrintSheet it starts a new page, on screen and in print, and is
 * announced as "Page 2 of 3". Nested deeper, it only breaks the printed page.
 */
export function PrintSheetBreak({ className }: { className?: string }) {
  return <hr className={cx('alt-print-break', className)} aria-hidden="true" />;
}

/**
 * A paper document previewed on screen and printed as it is. On screen each page is a piece of paper raised one level
 * from the ground (a card that only holds content: no wall, no lift), always light paper with ink text, since it
 * previews print. In print there is no ground and no height: the sheet is the page.
 */
export function PrintSheet({ title, size = 'a4', margins = '20mm', orientation = 'portrait', scale = 'fit', header, footer, loading, className, style, children, ...rest }: PrintSheetProps) {
  const [pw, ph] = typeof size === 'string' ? SIZES[size] : [size.width, size.height];
  const [w, h] = orientation === 'landscape' ? [ph, pw] : [pw, ph];
  const [mt, mb] = verticalMargins(margins);
  // Top-level breaks split the content into pages.
  const pages: React.ReactNode[][] = [[]];
  React.Children.toArray(children).forEach((child) => {
    if (React.isValidElement(child) && child.type === PrintSheetBreak) pages.push([]);
    else pages[pages.length - 1].push(child);
  });
  const count = pages.length;

  // Fit: a transform from the top-left corner, measured against the container; the wrapper takes the scaled height.
  const outer = React.useRef<HTMLDivElement>(null);
  const stack = React.useRef<HTMLElement>(null);
  const [fit, setFit] = React.useState({ k: 1, height: 0 });
  useIsoLayoutEffect(() => {
    const o = outer.current, s = stack.current;
    if (!o || !s) return;
    const measure = () => {
      const k = scale === 'fit' ? Math.min(1, o.clientWidth / Math.max(1, s.offsetWidth)) : scale;
      setFit((f) => (Math.abs(f.k - k) < 0.001 && Math.abs(f.height - s.offsetHeight * k) < 0.5 ? f : { k, height: s.offsetHeight * k }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(o); ro.observe(s);
    return () => ro.disconnect();
  }, [scale, w, h, count]);

  return <div ref={outer} className={cx('alt-print', className)} style={{ height: fit.k !== 1 ? fit.height : undefined, ...style }} data-scaled={fit.k !== 1 ? '' : undefined}>
    <style>{`@page { size: ${w} ${h}; margin: ${margins}; }`}</style>
    <article ref={stack} role="document" aria-label={loading ? `Loading ${title}` : title} aria-busy={loading || undefined} className="alt-print-stack" {...rest}
      style={{ ['--sheet-w' as any]: w, ['--sheet-h' as any]: h, ['--sheet-margin' as any]: margins, ['--sheet-mt' as any]: mt, ['--sheet-mb' as any]: mb, transform: fit.k !== 1 ? `scale(${fit.k})` : undefined }}>
      {pages.map((content, i) => <React.Fragment key={i}>
        {i > 0 && <hr role="separator" className="alt-print-gap" aria-label={`Page ${i + 1} of ${count}`} />}
        <div className="alt-print-page" data-theme="daylight" data-loading={loading ? '' : undefined}>
          {!loading && <PageContext.Provider value={{ page: i + 1, count }}>
            {header}
            <div className="alt-print-body">{content}</div>
            {footer}
          </PageContext.Provider>}
        </div>
      </React.Fragment>)}
    </article>
  </div>;
}
