import * as React from 'react';
import { cx, useIsoLayoutEffect } from './core';
import { DropdownMenu } from './overlays';

/* ───────────────────────── Breadcrumb ───────────────────────── */

/**
 * One step of the staircase Breadcrumb and Drilldown share: every step stands on the same ground line, and the deeper
 * it is, the taller its slab (its wall grows 3px a level). Not exported from the package.
 */
export function CrumbStep({ depth, current, isNew, children }: { depth: number; current?: boolean; isNew?: boolean; children: React.ReactNode }) {
  return <li className="alt-crumb" data-d={Math.min(depth, 3)} style={{ ['--d' as any]: depth, zIndex: depth + 1 }}
    data-current={current ? '' : undefined} data-new={isNew ? '' : undefined}>{children}</li>;
}

export interface BreadcrumbEntry {
  label: React.ReactNode;
  /** Where the step goes. The last entry is the current page and never a link. */
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
}
export interface BreadcrumbProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  items?: BreadcrumbEntry[];
  /** Deeper paths keep the first step and the last (maxItems − 1), with the middle in a menu behind "…". */
  maxItems?: number;
  /** Renders a step's link your way (a router's Link). Spread the props onto it. */
  renderLink?: (item: BreadcrumbEntry, props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { className: string }) => React.ReactElement;
  /**
   * 'collapse' (default): when the trail doesn't fit on one line, steps from the second onward move behind "…" until it
   * does, keeping the first step and the current page (#263). 'wrap': it wraps onto more lines, as before.
   */
  fit?: 'collapse' | 'wrap';
  /** Called when a step in the "…" menu is chosen. Default: follow its href. */
  onNavigate?: (item: BreadcrumbEntry) => void;
  /** Composable parts (BreadcrumbList, BreadcrumbItem, …), instead of items. */
  children?: React.ReactNode;
}
/**
 * Where you are, as a staircase: every step stands on one ground line and each deeper place is a taller step, as in
 * Drilldown (without its pile: a route change lays no sheet). Steps you can go back to lift when pointed at; the current
 * page is a step that doesn't press. A route change re-renders it without motion: a new route isn't an arrival.
 */
export function Breadcrumb({ items, maxItems, fit = 'collapse', renderLink, onNavigate, className, children, 'aria-label': label = 'Breadcrumb', ...rest }: BreadcrumbProps) {
  // Fit to the width (#263): measured on one line, a step at a time behind "…", never fewer than the first and the
  // current page. A new width starts from every step again. It's layout, not a change, so nothing animates.
  const nav = React.useRef<HTMLElement>(null);
  const total = items?.length ?? 0;
  const [width, setWidth] = React.useState(0);
  const [fitKeep, setFitKeep] = React.useState(total);
  React.useEffect(() => {
    const el = nav.current;
    if (!el || fit !== 'collapse' || !items) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit, !items]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { setFitKeep(total); }, [width, total]);
  useIsoLayoutEffect(() => {
    const steps = nav.current?.querySelectorAll(':scope > ol > li');
    if (fit !== 'collapse' || !steps || steps.length < 2) return;
    const wrapped = (steps[steps.length - 1] as HTMLElement).offsetTop > (steps[0] as HTMLElement).offsetTop + 2;
    if (wrapped && fitKeep > 2) setFitKeep((k) => k - 1);
  }, [fitKeep, width]);
  if (!items) return <nav className={cx('alt-crumbs', 'alt-breadcrumb', className)} aria-label={label} {...rest}>{children}</nav>;
  // A deep path keeps its first step and its last (maxItems − 1); the ones between wait behind "…".
  const byCount = maxItems && items.length > maxItems ? Math.max(2, maxItems) : items.length;
  const keep = fit === 'collapse' ? Math.max(2, Math.min(byCount, fitKeep)) : byCount;
  const hidden = keep < items.length ? items.slice(1, items.length - (keep - 1)) : [];
  const steps: (BreadcrumbEntry | 'more')[] = hidden.length ? [items[0], 'more', ...items.slice(items.length - (keep - 1))] : items;
  const link = (it: BreadcrumbEntry) => {
    const props = { href: it.href, onClick: it.onClick, className: 'alt-crumb-link' };
    if (it.href) return renderLink ? renderLink(it, props) : <a {...props}>{it.label}</a>;
    return <button type="button" className="alt-crumb-link" onClick={it.onClick}>{it.label}</button>;
  };
  return (
    <nav ref={nav} className={cx('alt-crumbs', 'alt-breadcrumb', className)} aria-label={label} data-fit={fit} {...rest}>
      <ol>
        {steps.map((it, i) => {
          if (it === 'more') return <CrumbStep key="more" depth={i}><BreadcrumbEllipsisMenu items={hidden} onNavigate={onNavigate} /></CrumbStep>;
          const current = i === steps.length - 1;
          return <CrumbStep key={i} depth={i} current={current}>{current ? <BreadcrumbPage>{it.label}</BreadcrumbPage> : link(it)}</CrumbStep>;
        })}
      </ol>
    </nav>
  );
}

function BreadcrumbEllipsisMenu({ items, onNavigate }: { items: BreadcrumbEntry[]; onNavigate?: (item: BreadcrumbEntry) => void }) {
  return <DropdownMenu items={items.map((it) => ({ label: it.label, onSelect: () => (onNavigate ? onNavigate(it) : it.href && window.location.assign(it.href)) }))}
    trigger={<button type="button" className="alt-crumb-link" aria-label={`Show ${items.length} more ${items.length === 1 ? 'level' : 'levels'}`}>…</button>} />;
}

/** The ordered list of steps. Each BreadcrumbItem inside it gets its depth from its place. */
export function BreadcrumbList({ children, className, ...rest }: React.OlHTMLAttributes<HTMLOListElement>) {
  const steps = React.Children.toArray(children).filter((c) => React.isValidElement(c) && c.type === BreadcrumbItem) as React.ReactElement<BreadcrumbItemProps>[];
  return <ol className={className} {...rest}>{steps.map((c, i) => React.cloneElement(c, { depth: i, key: c.key ?? i }))}</ol>;
}
export interface BreadcrumbItemProps { depth?: number; children: React.ReactNode }
/** One step. The step holding a BreadcrumbPage is the current one. */
export function BreadcrumbItem({ depth = 0, children }: BreadcrumbItemProps) {
  const current = React.Children.toArray(children).some((c) => React.isValidElement(c) && c.type === BreadcrumbPage);
  return <CrumbStep depth={depth} current={current}>{children}</CrumbStep>;
}
/** A step you can go back to. */
export const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement>>(function BreadcrumbLink({ className, ...rest }, ref) {
  return <a ref={ref} className={cx('alt-crumb-link', className)} {...rest} />;
});
/** The current page: a step that doesn't press. */
export function BreadcrumbPage({ className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('alt-crumb-link', 'alt-crumb-page', className)} aria-current="page" {...rest} />;
}
/** The staircase needs no separators: each step's height already says it's deeper. Kept for code written for shadcn/ui; it renders nothing. */
export function BreadcrumbSeparator(_: { children?: React.ReactNode }) { return null; }
/** Collapsed steps behind "…", in a menu. */
export function BreadcrumbEllipsis({ items, onNavigate }: { items: BreadcrumbEntry[]; onNavigate?: (item: BreadcrumbEntry) => void }) {
  return <BreadcrumbEllipsisMenu items={items} onNavigate={onNavigate} />;
}
