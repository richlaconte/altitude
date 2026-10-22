import * as React from 'react';
import { cx } from './core';

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** A line icon, drawn in ink-muted: 24px, or 18px at size sm. */
  icon?: React.ReactNode;
  /** What is empty, as a statement: "No gift ideas yet". It names the region. */
  title: React.ReactNode;
  /** Why it's empty, or what will appear here. Linked as the region's description. */
  description?: React.ReactNode;
  /** The one obvious next step: usually a primary Button. */
  action?: React.ReactNode;
  /** A quieter alternative beside it: usually a ghost Button or a link. */
  secondary?: React.ReactNode;
  /** md fills a page or a panel; sm fits a widget or a list. Default 'md'. */
  size?: 'sm' | 'md';
  /** The title's heading level. Default 3. */
  headingLevel?: 2 | 3 | 4;
  /** Say it politely when it appears, for an empty that follows a change (a filter, a search). true says the title, if it's text; a string says that. */
  announce?: boolean | string;
}

/**
 * An opening the first record will fill. Nothing here yet is a well cut into the page (not a raised card, not an
 * alert), with a dashed rim, a title that names what's empty and one next action standing in it.
 */
export function EmptyState({ icon, title, description, action, secondary, size = 'md', headingLevel = 3, announce,
  className, children, ...rest }: EmptyStateProps) {
  const id = React.useId();
  const H = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const words = typeof announce === 'string' ? announce : announce && typeof title === 'string' ? title : '';
  // A live region has to exist before its text changes, so the words arrive a moment after it mounts.
  const [said, setSaid] = React.useState('');
  React.useEffect(() => {
    if (!words) { setSaid(''); return; }
    const t = setTimeout(() => setSaid(words), 100);
    return () => clearTimeout(t);
  }, [words]);
  return (
    <section className={cx('alt-empty', className)} data-size={size} aria-labelledby={`${id}-t`}
      aria-describedby={description ? `${id}-d` : undefined} {...rest}>
      {icon && <span className="alt-empty-icon" aria-hidden="true">{icon}</span>}
      <H id={`${id}-t`} className="alt-empty-title">{title}</H>
      {description && <p id={`${id}-d`} className="alt-empty-desc">{description}</p>}
      {children}
      {(action || secondary) && <div className="alt-empty-actions">{action}{secondary}</div>}
      {announce && <span className="alt-sr" aria-live="polite">{said}</span>}
    </section>
  );
}
