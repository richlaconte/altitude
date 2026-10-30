import * as React from 'react';
import { cx, Icons, useDepth } from './core';
import { Button } from './controls';
import { RelativeTime } from './relative-time';

/* ───────────────────────── Timeline ───────────────────────── */

const dayKey = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
function dayLabel(t: number, locale?: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(t); d.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return new Intl.DateTimeFormat(locale, { weekday: days < 7 ? 'long' : undefined, month: 'long', day: 'numeric', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' }).format(d);
}

export interface TimelineProps extends React.HTMLAttributes<HTMLElement> {
  /** 'day' (default) puts a heading before each day's events ("Today", "Yesterday", "March 4"). */
  groupBy?: 'day' | 'none';
  /** The level of the day headings. Default 3. */
  headingLevel?: 2 | 3 | 4;
  locale?: string;
  /** Names the history ("Activity"). */
  'aria-label'?: string;
  /** TimelineItem elements, newest first or oldest first, as you like; give each a key. */
  children: React.ReactNode;
}
/**
 * Events in order on one ground line: the 1px ink-muted rule Stepper and the chart baseline stand on, turned upright.
 * Events are flush entries stamped onto it. A new event arrives lifted and settles; one you caused hovers until it
 * lands, or drops to a trench with Retry.
 */
export function Timeline({ groupBy = 'day', headingLevel = 3, locale, className, children, 'aria-label': label, ...rest }: TimelineProps) {
  const items = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<TimelineItemProps>[];
  // Events that weren't here on the last render are new: they arrive with the afterglow (riseDelay staggers them).
  const seen = React.useRef<Set<React.Key> | null>(null);
  const fresh = seen.current ? new Set(items.map((i) => i.key!).filter((k) => !seen.current!.has(k))) : new Set<React.Key>();
  const [said, setSaid] = React.useState('');
  React.useEffect(() => {
    if (fresh.size) setSaid(`${fresh.size} new ${fresh.size === 1 ? 'event' : 'events'}.`);
    seen.current = new Set(items.map((i) => i.key!));
  }); // eslint-disable-line react-hooks/exhaustive-deps
  const H = `h${headingLevel}` as 'h3';
  let lastDay = '';
  return (
    <section className={cx('alt-timeline', className)} aria-label={label} {...rest}>
      <ol className="alt-timeline-list">
        {items.map((it) => {
          const t = new Date(it.props.time).getTime();
          const day = groupBy === 'day' && isFinite(t) ? dayKey(t) : '';
          const head = day && day !== lastDay ? <li key={'d' + day} className="alt-timeline-day"><H className="alt-timeline-day-label">{dayLabel(t, locale)}</H></li> : null;
          lastDay = day || lastDay;
          return <React.Fragment key={it.key}>{head}{React.cloneElement(it, { isNew: fresh.has(it.key!) } as Partial<TimelineItemProps>)}</React.Fragment>;
        })}
      </ol>
      <span className="alt-sr" aria-live="polite">{said}</span>
    </section>
  );
}

export interface TimelineItemProps {
  /** The event's own icon; it sits on the line as a flush plate. Default a dot. */
  icon?: React.ReactNode;
  /** When it happened. */
  time: Date | string | number;
  /** An event you caused: pending hovers ("Sending…") until it lands; failed drops to a trench with Retry. */
  status?: 'pending' | 'committed' | 'failed';
  onRetry?: () => void;
  /** More about it (a DiffView, a payload), behind a Details disclosure. */
  detail?: React.ReactNode;
  /** The event links somewhere: it lifts when pointed at. */
  href?: string;
  locale?: string;
  /** The sentence: who did what to what. */
  children: React.ReactNode;
  /** Set by Timeline: arrived since the last render. */
  isNew?: boolean;
}
/** One event: a sentence with its time, flush on the line. */
export function TimelineItem({ icon, time, status, onRetry, detail, href, locale, children, isNew }: TimelineItemProps) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  const { style, ...depth } = useDepth({ status, settle: isNew ? true : undefined });
  const body = <>
    <span className="alt-timeline-text">{children}</span>
    <span className="alt-timeline-meta">
      <RelativeTime date={time} format="auto" locale={locale} />
      {status === 'pending' && <span className="alt-timeline-state">· Sending…</span>}
      {status === 'failed' && <span className="alt-timeline-state" data-failed=""><Icons.AlertCircle size={13} />Couldn't send</span>}
    </span>
  </>;
  return (
    <li className="alt-timeline-item" {...depth} style={style}>
      <span className="alt-timeline-marker" aria-hidden="true">{icon ?? <span className="alt-timeline-dot" />}</span>
      <div className="alt-timeline-body">
        {href ? <a className="alt-timeline-link" href={href}>{body}</a> : <div className="alt-timeline-entry">{body}</div>}
        {(status === 'failed' && onRetry) || detail ? (
          <div className="alt-timeline-actions">
            {status === 'failed' && onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>Retry</Button>}
            {detail && <Button size="sm" variant="ghost" aria-expanded={open} aria-controls={`${id}-d`} onClick={() => setOpen(!open)}>
              {open ? 'Hide details' : 'Details'}<Icons.ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : undefined }} /></Button>}
          </div>
        ) : null}
        {detail && open && <div id={`${id}-d`} className="alt-timeline-detail">{detail}</div>}
      </div>
    </li>
  );
}
