import * as React from 'react';
import { cx, Icons, useDepth } from './core';
import { Badge, Button, Input } from './controls';
import { DropdownMenu } from './overlays';
import { RelativeTime } from './relative-time';
import { RemovalReceipt } from './removal-receipt';
import { SidebarGroup, SidebarMenu, SidebarMenuButton } from './app-shell';

export type ThreadStatus = 'idle' | 'working' | 'needs-input' | 'failed' | 'stopped';
interface ListCtx { announce: (text: string) => void; mounted: React.MutableRefObject<boolean> }
const ThreadListCtx = React.createContext<ListCtx | null>(null);

export interface ThreadListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** A search field above the list; ⌘K / Ctrl+K focuses it. */
  searchable?: boolean;
  onSearch?: (query: string) => void;
  /** Default "Search conversations". */
  searchLabel?: string;
  /** ThreadListGroups. */
  children: React.ReactNode;
}
/**
 * Conversations with an assistant (#269), in a Sidebar: rows are destinations (flush, the current one on the raised
 * pill), and each says its state in words. A working thread isn't pending (nothing you sent is in flight), so it
 * doesn't hover: a plate with a steady lamp says "Working". One that needs you says so on a caution plate, and is
 * announced once; finishing isn't announced. Rename in place, delete with a receipt and Undo.
 */
export function ThreadList({ searchable = false, onSearch, searchLabel = 'Search conversations', className, children, ...rest }: ThreadListProps) {
  const [said, setSaid] = React.useState('');
  const mounted = React.useRef(false);
  React.useEffect(() => { mounted.current = true; }, []);
  const search = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (!searchable) return;
    const key = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); search.current?.focus(); } };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [searchable]);
  return (
    <ThreadListCtx.Provider value={{ announce: setSaid, mounted }}>
      <div className={cx('alt-threads', className)} {...rest}>
        {searchable && <Input ref={search} type="search" className="alt-threads-search" aria-label={searchLabel} placeholder={searchLabel} aria-keyshortcuts="Meta+K Control+K"
          onChange={(e) => onSearch?.(e.target.value)} />}
        {children}
        <span className="alt-sr alt-threads-said" role="status" aria-live="polite">{said}</span>
      </div>
    </ThreadListCtx.Provider>
  );
}

export interface ThreadListGroupProps { label: string; children: React.ReactNode; className?: string }
/** A run of threads under a heading: "Today", "Yesterday", "Previous 7 days". */
export function ThreadListGroup({ label, children, className }: ThreadListGroupProps) {
  return <SidebarGroup label={label} className={cx('alt-threads-group', className)}><SidebarMenu>{children}</SidebarMenu></SidebarGroup>;
}

export interface ThreadListItemProps {
  href: string;
  title: string;
  updatedAt: Date | string | number;
  /** Default 'idle'. */
  status?: ThreadStatus;
  /** For 'needs-input': what it needs. Default 'approval'. */
  needs?: 'approval' | 'question';
  /** Finished while you were away: a dot, the title in 600, and "Unread" in its name. */
  unread?: boolean;
  current?: boolean;
  onSelect?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  /** Rename in place (F2, or the row menu). */
  onRename?: (title: string) => void;
  /** Delete (Delete key, or the row menu): the row becomes a receipt with Undo. Remove it from your data in onDeleted. */
  onDelete?: () => void;
  onUndoDelete?: () => void;
  /** The receipt has closed: drop the thread now. */
  onDeleted?: () => void;
  onArchive?: () => void;
  className?: string;
}
const PLATES: Record<Exclude<ThreadStatus, 'idle'>, { tone: 'accent' | 'caution' | 'critical' | 'neutral'; lamp: boolean }> = {
  working: { tone: 'accent', lamp: true }, 'needs-input': { tone: 'caution', lamp: true }, failed: { tone: 'critical', lamp: false }, stopped: { tone: 'neutral', lamp: false },
};

/** One conversation: a destination row with its state in words, a row menu, rename in place and delete with Undo. */
export function ThreadListItem({ href, title, updatedAt, status = 'idle', needs = 'approval', unread = false, current = false, onSelect, onRename, onDelete, onUndoDelete, onDeleted, onArchive, className }: ThreadListItemProps) {
  const c = React.useContext(ThreadListCtx);
  const [renaming, setRenaming] = React.useState(false);
  const [draft, setDraft] = React.useState(title);
  const [removed, setRemoved] = React.useState(false);
  const [gone, setGone] = React.useState(false);
  const link = React.useRef<HTMLAnchorElement>(null);
  const arrived = React.useRef(c?.mounted.current ?? false);
  const { style, 'aria-busy': _b, ...depth } = useDepth({ settle: arrived.current ? true : undefined });
  const word = status === 'working' ? 'Working' : status === 'needs-input' ? (needs === 'question' ? 'Has a question' : 'Needs approval') : status === 'failed' ? "Couldn't finish" : status === 'stopped' ? 'Stopped' : '';
  // A background thread that starts needing you is said once; finishing isn't.
  const last = React.useRef(status);
  React.useEffect(() => {
    if (status === 'needs-input' && last.current !== 'needs-input' && !current) c?.announce(`${title} ${needs === 'question' ? 'has a question for you' : 'needs your approval'}`);
    last.current = status;
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  const startRename = () => { if (!onRename) return; setDraft(title); setRenaming(true); };
  const endRename = (save: boolean) => {
    if (save && draft.trim() && draft.trim() !== title) onRename?.(draft.trim());
    setRenaming(false);
    requestAnimationFrame(() => link.current?.focus());
  };
  const remove = () => { if (!onDelete) return; onDelete(); setRemoved(true); };
  if (gone) return null;
  const plate = status !== 'idle' ? PLATES[status] : null;
  return (
    <RemovalReceipt as="li" removed={removed} className={cx('alt-sidebar-item alt-thread', className)} data-thread-status={status} data-unread={unread ? '' : undefined}
      title={`Deleted “${title}”.`} action={onUndoDelete && <Button size="sm" variant="ghost" onClick={() => { onUndoDelete(); setRemoved(false); }}>Undo</Button>}
      onClosed={() => { setGone(true); onDeleted?.(); }} {...depth} style={style}>
      {renaming ? (
        <span className="alt-thread-rename">
          <Input autoFocus aria-label="Conversation name" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => endRename(true)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); endRename(true); } else if (e.key === 'Escape') { e.preventDefault(); endRename(false); } }} />
        </span>
      ) : (
        <>
          <SidebarMenuButton ref={link} href={href} current={current} onClick={onSelect} className="alt-thread-link"
            onKeyDown={(e) => { if (e.key === 'F2') { e.preventDefault(); startRename(); } else if (e.key === 'Delete') { e.preventDefault(); remove(); } }}>
            <span className="alt-thread-main">
              {unread && <span className="alt-thread-dot" aria-hidden="true" />}
              <span className="alt-thread-title">{title}</span>
              {unread && <span className="alt-sr">, unread</span>}
            </span>
            <span className="alt-thread-meta">
              {plate && <span className="alt-thread-plate"><span className="alt-sr">, </span><Badge tone={plate.tone} variant={plate.tone === 'neutral' ? 'plate' : 'soft'} lamp={plate.lamp}>{word}</Badge></span>}
              <span className="alt-thread-time"><span className="alt-sr">, </span><RelativeTime date={updatedAt} tooltip={false} /></span>
            </span>
          </SidebarMenuButton>
          {(onRename || onDelete || onArchive) && (
            <DropdownMenu align="end" trigger={<Button size="sm" variant="ghost" square className="alt-thread-more" aria-label={`More actions for ${title}`}><Icons.More size={15} /></Button>}
              items={[
                ...(onRename ? [{ label: 'Rename', shortcut: 'F2', onSelect: startRename }] : []),
                ...(onArchive ? [{ label: 'Archive', onSelect: onArchive }] : []),
                ...(onDelete ? [{ type: 'separator' as const }, { label: 'Delete', tone: 'critical' as const, onSelect: remove }] : []),
              ]} />
          )}
        </>
      )}
    </RemovalReceipt>
  );
}

/** "New conversation": secondary, so the composer's Send keeps the view's one primary. */
export function ThreadListNew({ children = 'New conversation', className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) {
  return <Button variant="secondary" size="sm" className={cx('alt-threads-new', className)} {...rest}><Icons.Pencil size={14} aria-hidden="true" />{children}</Button>;
}

/** Groups threads by when they were last updated: Today, Yesterday, Previous 7 days, Previous 30 days, then by month. */
export function groupByDate<T>(threads: T[], getDate: (t: T) => Date | string | number, now: Date | number = Date.now(), locale?: string): { label: string; threads: T[] }[] {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = day(new Date(now));
  const month = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const groups = new Map<string, T[]>();
  const sorted = [...threads].sort((a, b) => new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime());
  for (const t of sorted) {
    const d = new Date(getDate(t)), ago = Math.round((today - day(d)) / 86400000);
    const label = ago <= 0 ? 'Today' : ago === 1 ? 'Yesterday' : ago <= 7 ? 'Previous 7 days' : ago <= 30 ? 'Previous 30 days' : month.format(d);
    groups.set(label, [...(groups.get(label) ?? []), t]);
  }
  return [...groups].map(([label, ts]) => ({ label, threads: ts }));
}
