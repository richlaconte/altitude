import * as React from 'react';
import { cx, Icons } from './core';
import { Button } from './controls';
import { DropdownMenu, MenuEntry } from './overlays';

/* ───────────────────────── PageHeader ───────────────────────── */

declare const process: { env: { NODE_ENV?: string } } | undefined;
const dev = () => typeof process === 'undefined' || process?.env.NODE_ENV !== 'production';

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** A Breadcrumb above the title. */
  breadcrumb?: React.ReactNode;
  /** The page's one primary action: a single Button variant="primary". There's one slot, so there's one primary. */
  primary?: React.ReactElement;
  /** Secondary and ghost actions, before the primary. */
  actions?: React.ReactNode;
  /** Actions that don't need to be seen, in a "More actions" menu. */
  overflow?: MenuEntry[];
  /** Tabs under the title, for the page's sections. */
  tabs?: React.ReactNode;
  /** Stays at the top while the page scrolls, and rises one level when content passes under it. */
  sticky?: boolean;
  /** PageHeaderTitle and PageHeaderDescription. */
  children?: React.ReactNode;
}
/**
 * The block every page opens with: breadcrumb, title, description, actions and tabs. The page's name is the record, so
 * the block lies on the ground; only its actions are live, and it has one slot for the primary action (law 1).
 */
export function PageHeader({ breadcrumb, primary, actions, overflow, tabs, sticky, className, children, ...rest }: PageHeaderProps) {
  const sentinel = React.useRef<HTMLSpanElement>(null);
  const [under, setUnder] = React.useState(false);
  React.useEffect(() => {
    if (!sticky || !sentinel.current) return;
    // The sentinel sits just above the header: once it scrolls away, content is passing under the header.
    const io = new IntersectionObserver(([e]) => setUnder(!e.isIntersecting), { threshold: 0 });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [sticky]);
  React.useEffect(() => {
    if (!dev()) return;
    const primaries = React.Children.toArray(actions).filter((a) => React.isValidElement<{ variant?: string }>(a) && a.props.variant === 'primary');
    if (primaries.length) console.warn('PageHeader: a primary Button is in `actions`. Law 1: a page has one primary action, at level 2. Put it in `primary` and make the others secondary.');
  }, [actions]);
  return (
    <>
      {sticky && <span ref={sentinel} className="alt-page-head-sentinel" aria-hidden="true" />}
      <header className={cx('alt-page-head', className)} data-sticky={sticky ? '' : undefined} data-under={under ? '' : undefined} {...rest}>
        {breadcrumb && <div className="alt-page-head-crumbs">{breadcrumb}</div>}
        <div className="alt-page-head-main">
          <div className="alt-page-head-text">{children}</div>
          {(actions || primary || overflow?.length) && (
            <div className="alt-page-head-actions">
              {actions}
              {overflow?.length ? <DropdownMenu align="end" items={overflow} trigger={<Button variant="secondary" square aria-label="More actions"><Icons.More /></Button>} /> : null}
              {primary}
            </div>
          )}
        </div>
        {tabs && <div className="alt-page-head-tabs">{tabs}</div>}
      </header>
    </>
  );
}

/** The page's h1. */
export function PageHeaderTitle({ className, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={cx('alt-page-head-title', className)} {...rest} />;
}
/** One line saying what the page is for. */
export function PageHeaderDescription({ className, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cx('alt-page-head-desc', className)} {...rest} />;
}
