import * as React from 'react';
import { cx } from './core';

/* ───────────────────────── Separator ───────────────────────── */

export interface SeparatorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Default horizontal. A vertical one stretches to the height of the row it's in. */
  orientation?: 'horizontal' | 'vertical';
  /** Purely visual: hidden from assistive technology (role="none"). Use it when the layout already says what's parted. */
  decorative?: boolean;
  /** A word between two lines ("or"). It's read in the flow, so it's never decorative. */
  label?: React.ReactNode;
}
/** A divider on the ground: 1px of `line`, never `line-control` and never a shadow. role="separator" unless decorative. */
export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(function Separator(
  { orientation = 'horizontal', decorative = false, label, className, ...rest }, ref) {
  // role="separator" makes its children presentational, so a labelled separator is plain text between two drawn
  // lines: the word is what parts the content for a screen reader.
  if (label != null) return <div ref={ref} className={cx('alt-sep', 'alt-sep-labelled', className)} data-orientation={orientation} {...rest}><span className="alt-sep-label">{label}</span></div>;
  return <div ref={ref} className={cx('alt-sep', className)} data-orientation={orientation}
    role={decorative ? 'none' : 'separator'} aria-orientation={decorative ? undefined : orientation} {...rest} />;
});
