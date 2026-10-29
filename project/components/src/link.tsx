import * as React from 'react';
import { cx, Icons } from './core';

/* ───────────────────────── Link ───────────────────────── */

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Leaves the app: opens in a new tab (rel="noopener noreferrer"), with an icon and "(opens in a new tab)" for screen readers. */
  external?: boolean;
  /** Styles your own link element (a router's Link) instead of rendering an <a>. Pass exactly one element. */
  asChild?: boolean;
  /** Mark links already followed: their underline turns ink-muted. Off by default; use it in long lists of documents. */
  visited?: boolean;
}
/** Navigation in accent-ink with an underline. A link is text in the record, so it never lifts: hover thickens the underline. */
export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { external, asChild, visited, className, children, target, rel, ...rest }, ref) {
  const icon = <Icons.ExternalLink className="alt-link-ext" size={14} />;
  const said = <span className="alt-sr"> (opens in a new tab)</span>;
  // The icon is kept on the line of the last word: it never wraps onto a line of its own.
  const glue = (content: React.ReactNode) => {
    if (!external) return content;
    if (typeof content !== 'string') return <>{content}{icon}{said}</>;
    const at = content.trimEnd().lastIndexOf(' ') + 1;
    return <>{content.slice(0, at)}<span className="alt-link-tail">{content.slice(at)}{icon}</span>{said}</>;
  };
  const props = {
    ...rest, ref, className: cx('alt-link', className), 'data-visited': visited ? '' : undefined,
    target: external ? target ?? '_blank' : target,
    rel: external ? rel ?? 'noopener noreferrer' : rel,
  };
  if (asChild && React.isValidElement<any>(children)) {
    const child = children;
    return React.cloneElement(child, { ...props, className: cx('alt-link', child.props.className, className) }, glue(child.props.children));
  }
  return <a {...props}>{glue(children)}</a>;
});
