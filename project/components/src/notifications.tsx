import * as React from 'react';
import { cx, Icons, useDepth } from './core';
import { Button } from './controls';
import { Popover } from './overlays';
import { Sheet, SheetHeader, SheetTitle } from './sheet';
import { Link } from './link';
import { RelativeTime } from './relative-time';

/* ───────────────────────── NotificationCenter ───────────────────────── */

export interface NotificationEntry {
  id: string;
  title: React.ReactNode;
  body?: React.ReactNode;
  createdAt: Date | string | number;
  read: boolean;
  /** Where it leads. The item is a link, and opening it marks it read. */
  href?: string;
  /** Things to do about it ("Approve"), as Buttons. */
  actions?: React.ReactNode;
}

const dayOf = (t: Date | string | number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const dayName = (t: number, locale?: string) => {
  const today = dayOf(Date.now()), days = Math.round((today - t) / 86_400_000);
  return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric' }).format(t);
};

export interface NotificationListProps {
  items: NotificationEntry[];
  onMarkRead?: (ids: string[]) => void;
  onMarkAllRead?: () => void;
  preferencesHref?: string;
  /** 'day' (default) puts a heading before each day. */
  groupBy?: 'day' | 'none';
  locale?: string;
  /** Called when an item that links is opened. */
  onOpen?: (item: NotificationEntry) => void;
  /** Ids that arrived while the list wasn't showing (NotificationCenter passes them), to arrive with the afterglow. */
  fresh?: Set<string>;
}
/**
 * The list itself, for a page or a panel. It's a record of what happened, so it lies on the ground. Unread is a mark,
 * not a height: a dot, weight 600 and "Unread" in its name. A new notification arrives lifted and settles, as anything
 * new does.
 */
export function NotificationList({ items, onMarkRead, onMarkAllRead, preferencesHref, groupBy = 'day', locale, onOpen, fresh: given }: NotificationListProps) {
  const unread = items.filter((n) => !n.read).length;
  const seen = React.useRef<Set<string> | null>(null);
  const fresh = seen.current ? new Set(items.map((n) => n.id).filter((id) => !seen.current!.has(id))) : given ?? new Set<string>();
  React.useEffect(() => { seen.current = new Set(items.map((n) => n.id)); });
  let last = -1;
  return (
    <div className="alt-notes">
      <div className="alt-notes-head">
        <span className="alt-notes-count">{unread ? `${unread} unread` : 'All caught up'}</span>
        {onMarkAllRead && unread > 0 && <Button size="sm" variant="ghost" onClick={onMarkAllRead}>Mark all as read</Button>}
      </div>
      {items.length === 0 ? <p className="alt-notes-empty">Nothing yet. When something needs you, it shows up here.</p> : (
        <ul className="alt-notes-list" aria-label="Notifications">
          {items.map((n) => {
            const day = dayOf(n.createdAt);
            const head = groupBy === 'day' && day !== last ? <li key={'d' + day} className="alt-notes-day" role="presentation"><span>{dayName(day, locale)}</span></li> : null;
            last = day;
            return <React.Fragment key={n.id}>{head}<NotificationItem item={n} isNew={fresh.has(n.id)} locale={locale}
              onOpen={() => { if (!n.read) onMarkRead?.([n.id]); onOpen?.(n); }} onMarkRead={onMarkRead} /></React.Fragment>;
          })}
        </ul>
      )}
      {preferencesHref && <div className="alt-notes-foot"><Link href={preferencesHref}>Notification settings</Link></div>}
    </div>
  );
}

function NotificationItem({ item: n, isNew, locale, onOpen, onMarkRead }: { item: NotificationEntry; isNew: boolean; locale?: string; onOpen: () => void; onMarkRead?: (ids: string[]) => void }) {
  const { style, ...depth } = useDepth({ settle: isNew ? true : undefined });
  const inner = <>
    <span className="alt-notes-dot" aria-hidden="true" />
    <span className="alt-notes-text">
      <span className="alt-notes-title">{!n.read && <span className="alt-sr">Unread: </span>}{n.title}</span>
      {n.body && <span className="alt-notes-body">{n.body}</span>}
      <span className="alt-notes-time"><RelativeTime date={n.createdAt} tooltip={false} locale={locale} /></span>
    </span>
  </>;
  return (
    <li className="alt-notes-item" data-unread={n.read ? undefined : ''} {...depth} style={style}>
      {n.href ? <a className="alt-notes-link" href={n.href} onClick={onOpen}>{inner}</a> : <div className="alt-notes-link" data-static="">{inner}</div>}
      {(n.actions || (!n.read && !n.href && onMarkRead)) && (
        <div className="alt-notes-actions">
          {n.actions}
          {!n.read && !n.href && onMarkRead && <Button size="sm" variant="ghost" onClick={() => onMarkRead([n.id])}>Mark as read</Button>}
        </div>
      )}
    </li>
  );
}

export interface NotificationCenterProps extends NotificationListProps {
  /** Below this width the panel is a bottom Sheet. Default 640. */
  mobileBreakpoint?: number;
  className?: string;
}
/**
 * A bell with a count that opens the list. The bell is live (a ghost button), the count floats (only a count wants
 * you), the panel floats at level 3 (a Sheet at level 4 on narrow screens), and the list in it lies on the ground.
 * New notifications are announced, batched, whether or not the panel is open.
 */
export function NotificationCenter({ mobileBreakpoint = 640, className, ...list }: NotificationCenterProps) {
  const [open, setOpen] = React.useState(false);
  const [narrow, setNarrow] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${mobileBreakpoint - 0.02}px)`);
    const f = () => setNarrow(mq.matches); f(); mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [mobileBreakpoint]);
  const unread = list.items.filter((n) => !n.read).length;
  // New arrivals are said once, batched: "2 new notifications".
  // Arrivals while the panel is closed are kept, so the list can greet them with the afterglow when it next opens.
  const known = React.useRef<Set<string> | null>(null);
  const [said, setSaid] = React.useState('');
  const [fresh, setFresh] = React.useState<Set<string>>(() => new Set());
  React.useEffect(() => {
    const ids = list.items.map((n) => n.id);
    if (known.current) {
      const added = ids.filter((id) => !known.current!.has(id));
      if (added.length) { setSaid(`${added.length} new ${added.length === 1 ? 'notification' : 'notifications'}.`); if (!open) setFresh((f) => new Set([...f, ...added])); }
    }
    known.current = new Set(ids);
  }, [list.items]); // eslint-disable-line react-hooks/exhaustive-deps
  // Once the panel has shown them, they're no longer new.
  React.useEffect(() => { if (!open) return; const t = window.setTimeout(() => setFresh(new Set()), 50); return () => window.clearTimeout(t); }, [open]);
  const bell = (
    <Button variant="ghost" square className="alt-notes-bell" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} onClick={narrow ? () => setOpen(true) : undefined}>
      <Icons.Bell />
      {unread > 0 && <span className="alt-badge alt-notes-badge" data-variant="count" data-tone="accent" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
    </Button>
  );
  const body = <NotificationList {...list} fresh={fresh} onOpen={(n) => { setOpen(false); list.onOpen?.(n); }} />;
  return (
    <span className={cx('alt-notes-center', className)}>
      {narrow
        ? <>{bell}<Sheet open={open} onOpenChange={setOpen} side="bottom" size="sm"><SheetHeader><SheetTitle>Notifications</SheetTitle></SheetHeader>{body}</Sheet></>
        : <Popover trigger={bell} align="end" open={open} onOpenChange={setOpen} aria-label="Notifications" className="alt-notes-pop"><p className="alt-notes-title-bar">Notifications</p>{body}</Popover>}
      <span className="alt-sr" aria-live="polite">{said}</span>
    </span>
  );
}
