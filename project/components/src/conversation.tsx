import * as React from 'react';
import { cx, Icons, useDepth } from './core';
import { Button, Textarea } from './controls';
import { CopyButton } from './copy-button';
import { FormattedNumber } from './formatted-number';
import { ToggleGroup, ToggleGroupItem } from './toggle';
import { Tooltip } from './overlays';

/* ───────────────────────── Conversation ───────────────────────── */

interface ConvoCtx { atBottom: boolean; toBottom: (smooth?: boolean) => void; announce: (text: string, urgent?: boolean) => void }
const ConversationCtx = React.createContext<ConvoCtx | null>(null);

export interface ConversationProps extends React.HTMLAttributes<HTMLDivElement> {
  'aria-label': string;
}
/**
 * The thread between a person and an assistant. Settled messages are the record. It follows new text to the bottom
 * until the person scrolls up, then offers "Jump to latest". A streamed answer is announced once, when it completes,
 * never token by token.
 */
export function Conversation({ className, children, 'aria-label': label, ...rest }: ConversationProps) {
  const scroller = React.useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = React.useState(true);
  const follow = React.useRef(true);
  const [said, setSaid] = React.useState({ polite: '', urgent: '' });
  const toBottom = React.useCallback((smooth = false) => {
    const el = scroller.current; if (!el) return;
    follow.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' });
  }, []);
  React.useEffect(() => {
    const el = scroller.current; if (!el) return;
    // Follows the newest text while the person is at the bottom; scrolling up lets go.
    const keep = () => { if (follow.current) el.scrollTop = el.scrollHeight; };
    const ro = new ResizeObserver(keep);
    const mo = new MutationObserver(keep);
    [...el.children].forEach((c) => ro.observe(c));
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    keep();
    return () => { ro.disconnect(); mo.disconnect(); };
  }, []);
  const onScroll = () => {
    const el = scroller.current!; const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 32;
    follow.current = bottom; setAtBottom(bottom);
  };
  const announce = React.useCallback((text: string, urgent = false) => setSaid((s) => (urgent ? { ...s, urgent: text } : { ...s, polite: text })), []);
  return (
    <ConversationCtx.Provider value={{ atBottom, toBottom, announce }}>
      <div className={cx('alt-convo', className)} {...rest}>
        {/* A log, but its own announcements are off: streamed text would be read token by token. Completions are said below. */}
        <div ref={scroller} role="log" aria-label={label} aria-live="off" className="alt-convo-scroll" tabIndex={0} onScroll={onScroll}>{children}</div>
        <span className="alt-sr" aria-live="polite">{said.polite}</span>
        <span className="alt-sr" aria-live="assertive">{said.urgent}</span>
      </div>
    </ConversationCtx.Provider>
  );
}

/** The messages, in order. */
export function ConversationContent({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('alt-convo-content', className)} {...rest} />;
}

/** "Jump to latest message": floats at level 3 once the person has scrolled up from the bottom. */
export function ConversationScrollButton({ className }: { className?: string }) {
  const c = React.useContext(ConversationCtx);
  if (!c || c.atBottom) return null;
  return <Button size="sm" className={cx('alt-convo-jump', className)} onClick={() => c.toBottom(true)}><Icons.ArrowDown size={14} />Jump to latest message</Button>;
}

export type MessageStatus = 'streaming' | 'complete' | 'stopped' | 'error';
interface MsgCtx {
  from: 'user' | 'assistant'; status: MessageStatus; text: () => string;
  // Editing a sent message in place (#275): MessageActions offers it, MessageContent draws the editor.
  editing: string | null; startEdit: (from: HTMLElement | null) => void; endEdit: (text?: string) => void; edit: React.MutableRefObject<((text: string) => void) | undefined>;
}
const MessageCtx = React.createContext<MsgCtx | null>(null);

export interface MessageProps extends React.HTMLAttributes<HTMLElement> {
  from: 'user' | 'assistant';
  /** An assistant message: streaming rests on the ground with a dashed rule, "Generating…" and a caret; complete settles with one afterglow; stopped and error are kept, with Retry. Default 'complete'. */
  status?: MessageStatus;
  /** Who's speaking. Default "You" or "Assistant". */
  name?: string;
  onRetry?: () => void;
  /** A person's message that was edited and resent: "Edited" in its caption. */
  edited?: boolean;
}
/**
 * One message. A person's is a flush accent-soft sheet; an assistant's is flush, no bubble. While an answer streams it
 * isn't the record yet: it rests on the ground with a dashed rule down its edge (charts' "not yet the record"), never
 * hovering, because nothing you sent is in flight. When it completes the rule goes solid and it settles once.
 */
export function Message({ from, status = 'complete', name, onRetry, edited, className, children, ...rest }: MessageProps) {
  const c = React.useContext(ConversationCtx);
  const who = name ?? (from === 'user' ? 'You' : 'Assistant');
  const body = React.useRef<HTMLElement>(null);
  const [done, setDone] = React.useState(0);
  const last = React.useRef(status);
  React.useEffect(() => {
    if (last.current === 'streaming' && status !== 'streaming') {
      const text = body.current?.querySelector('.alt-msg-content')?.textContent?.trim() ?? '';
      if (status === 'complete') { setDone((n) => n + 1); c?.announce(`${who}: ${text.length > 280 ? `${text.slice(0, 280)}…` : text}`); }
      else if (status === 'stopped') c?.announce(`${who} stopped.`);
      else c?.announce(`${who} couldn't finish.`, true);
    }
    last.current = status;
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  const { style, 'aria-busy': _busy, ...depth } = useDepth({ settle: done || undefined });
  const text = () => body.current?.querySelector('.alt-msg-content')?.textContent?.trim() ?? '';
  const [editing, setEditing] = React.useState<string | null>(null);
  const edit = React.useRef<((text: string) => void) | undefined>(undefined);
  const opener = React.useRef<HTMLElement | null>(null);
  const startEdit = (from: HTMLElement | null) => { opener.current = from; setEditing(text()); };
  const endEdit = (sent?: string) => {
    setEditing(null);
    if (sent !== undefined) {
      edit.current?.(sent);
      // After sending, back to the composer, where the new branch's answer will be followed.
      requestAnimationFrame(() => { const near = body.current?.closest('.alt-convo')?.parentElement ?? document; near.querySelector<HTMLElement>('.alt-prompt textarea')?.focus(); });
    } else requestAnimationFrame(() => (opener.current?.isConnected ? opener.current : body.current?.querySelector<HTMLElement>('button[aria-label="Edit message"]'))?.focus());
  };
  return (
    <MessageCtx.Provider value={{ from, status, text, editing, startEdit, endEdit, edit }}>
      <article ref={body} {...depth} className={cx('alt-msg', className)} data-from={from} data-editing={editing !== null ? '' : undefined} data-stream={from === 'assistant' ? status : undefined} aria-busy={status === 'streaming' || undefined}
        aria-label={who} style={style} {...rest}>
        <h3 className={from === 'user' ? 'alt-sr' : 'alt-msg-name'}>{who}</h3>
        {children}
        {status === 'streaming' && <p className="alt-msg-caption" aria-hidden="true">Generating…</p>}
        {edited && editing === null && <p className="alt-msg-caption alt-msg-edited">Edited</p>}
        {(status === 'stopped' || status === 'error') && (
          <p className="alt-msg-caption" data-tone={status === 'error' ? 'critical' : undefined}>
            {status === 'error' ? <><Icons.AlertCircle size={13} aria-hidden="true" />Couldn't finish</> : 'Stopped'}
            {onRetry && <Button size="sm" variant="ghost" onClick={onRetry}><Icons.Refresh size={13} />Retry</Button>}
          </p>
        )}
      </article>
    </MessageCtx.Provider>
  );
}

export interface MessageAttachment {
  name: string;
  /** Its MIME type: image/* with a `url` shows as a thumbnail; anything else as a file plate. */
  type?: string;
  /** In bytes, shown on a file plate. */
  size?: number;
  /** An image's thumbnail. */
  url?: string;
  /** An image's text alternative. Default its name. */
  alt?: string;
  /** Opens the file as a link. */
  href?: string;
  /** Opens the file in the app (a preview Dialog, say). */
  onOpen?: () => void;
  /** Expired or deleted: "No longer available", and it doesn't act. */
  unavailable?: boolean;
}
export interface MessageAttachmentsProps extends Omit<React.HTMLAttributes<HTMLUListElement>, 'children'> {
  items: MessageAttachment[];
}
const kindOf = (a: MessageAttachment) => {
  const sub = a.type?.split('/')[1]?.split(/[.+;-]/)[0];
  const ext = /\.([a-z0-9]{1,6})$/i.exec(a.name)?.[1];
  return (a.type === 'application/pdf' ? 'PDF' : ext ?? sub ?? 'File').toUpperCase();
};
/**
 * What went with a message: the files the composer showed as plates, now settled into the record. Images are 64px
 * thumbnails, other files Tag plates with name, type and size; those with href or onOpen act (and lift one level when
 * pointed at). Put it before MessageContent. A sent attachment was uploaded before the message went, so it's never
 * pending.
 */
export function MessageAttachments({ items, className, ...rest }: MessageAttachmentsProps) {
  if (!items.length) return null;
  return (
    <ul className={cx('alt-msg-attachments', className)} aria-label={`${items.length} attachment${items.length === 1 ? '' : 's'}`} {...rest}>
      {items.map((a, i) => {
        const acts = !a.unavailable && !!(a.href || a.onOpen);
        const image = !a.unavailable && !!a.url && !!a.type?.startsWith('image/');
        const open = `Open ${a.name}`;
        const face = image
          ? <img src={a.url} alt={acts ? '' : a.alt ?? a.name} />
          : <>
            <Icons.Paperclip size={13} aria-hidden="true" />
            <span className="alt-msg-file-name">{a.name}</span>
            <span className="alt-msg-file-meta">{a.unavailable ? 'No longer available' : <>{kindOf(a)}{a.size !== undefined && <> · <FormattedNumber value={a.size} format="bytes" maximumFractionDigits={a.size >= 1e6 ? 1 : 0} /></>}</>}</span>
          </>;
        const cls = image ? 'alt-msg-thumb' : 'alt-tag-face';
        const el = !acts ? <span className={cls}>{face}</span>
          : a.href ? <a className={cls} href={a.href} aria-label={image ? open : undefined} title={image ? undefined : open} onClick={a.onOpen ? (e) => { e.preventDefault(); a.onOpen!(); } : undefined}>{face}</a>
          : <button type="button" className={cls} aria-label={image ? open : undefined} title={image ? undefined : open} onClick={a.onOpen}>{face}</button>;
        return (
          <li key={`${a.name}-${i}`} className={image ? 'alt-msg-attachment' : 'alt-msg-attachment alt-tag alt-msg-file'} data-acts={acts ? '' : undefined} data-unavailable={a.unavailable ? '' : undefined}>
            {el}
          </li>
        );
      })}
    </ul>
  );
}

/** The message's text. Text arrives without per-word animation; a caret marks the end while it streams. */
export function MessageContent({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  const m = React.useContext(MessageCtx);
  if (m && m.editing !== null) return <MessageEditor initial={m.editing} onDone={m.endEdit} />;
  return <div className={cx('alt-msg-content', className)} {...rest}>{children}{m?.status === 'streaming' && <span className="alt-msg-caret" aria-hidden="true" />}</div>;
}

// The message opened in place: a Textarea well inside the sheet, with Cancel and "Send edit". Editing is temporary
// local input, not a pending write, so nothing hovers until it's sent. Escape cancels; Ctrl/⌘+Enter sends.
function MessageEditor({ initial, onDone, action = 'Send edit' }: { initial: string; onDone: (text?: string) => void; action?: string }) {
  const [value, setValue] = React.useState(initial);
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => { const t = ref.current; if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }, []);
  const changed = value.trim() !== '' && value.trim() !== initial.trim();
  return (
    <div className="alt-msg-editor">
      <Textarea ref={ref} aria-label="Edit message" value={value} rows={Math.min(8, Math.max(2, value.split('\n').length))} onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onDone(); }
          else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && changed) { e.preventDefault(); onDone(value.trim()); }
        }} />
      <div className="alt-msg-editor-actions">
        <Button size="sm" variant="ghost" onClick={() => onDone()}>Cancel</Button>
        <Button size="sm" variant="secondary" disabled={!changed} onClick={() => onDone(value.trim())}>{action}</Button>
      </div>
    </div>
  );
}

export interface QueuedMessage { id: string; text: string }
export interface ConversationQueueProps {
  /** Messages written while the agent worked, in the order they'll be sent. */
  items: QueuedMessage[];
  /** Stop the current turn and send this one now. */
  onSendNow?: (id: string) => void;
  /** Edit opens it in place; called with the new text. */
  onEdit?: (id: string, text: string) => void;
  onRemove?: (id: string) => void;
  className?: string;
}
/**
 * Messages queued while the agent works (#276), between the thread and the composer, in order, each with Send now,
 * Edit and Remove. A queued message is written but not dispatched, so it doesn't hover (pending is for a write in
 * flight): it's the person's sheet on the ground with a dashed rim, "Queued · 1 of 2". Your app sends the first when
 * the turn ends, and it becomes an ordinary message in the log.
 */
export function ConversationQueue({ items, onSendNow, onEdit, onRemove, className }: ConversationQueueProps) {
  const [editing, setEditing] = React.useState<string | null>(null);
  const list = React.useRef<HTMLOListElement>(null);
  const remove = (id: string, i: number) => {
    onRemove?.(id);
    // Focus the next queued message's first action, or the composer when it was the last.
    requestAnimationFrame(() => {
      const rows = list.current?.querySelectorAll<HTMLElement>('.alt-queued');
      const next = rows && i < rows.length ? rows[i].querySelector<HTMLElement>('button') : null;
      (next ?? (list.current?.parentElement ?? document).querySelector<HTMLElement>('.alt-prompt textarea') ?? document.querySelector<HTMLElement>('.alt-prompt textarea'))?.focus();
    });
  };
  if (!items.length) return null;
  return (
    <ol ref={list} className={cx('alt-convo-queue', className)} aria-label="Queued messages">
      {items.map((q, i) => (
        <li key={q.id} className="alt-queued" data-editing={editing === q.id ? '' : undefined}>
          {editing === q.id
            ? <MessageEditor initial={q.text} action="Save" onDone={(text) => { setEditing(null); if (text !== undefined) onEdit?.(q.id, text); }} />
            : <>
              <p className="alt-queued-text">{q.text}</p>
              <div className="alt-queued-foot">
                <span className="alt-queued-state">Queued · {i + 1} of {items.length}</span>
                <span className="alt-queued-actions">
                  {onSendNow && <Button size="sm" variant="ghost" onClick={() => onSendNow(q.id)}>Send now</Button>}
                  {onEdit && <Button size="sm" variant="ghost" onClick={() => setEditing(q.id)}>Edit</Button>}
                  {onRemove && <Button size="sm" variant="ghost" square aria-label={`Remove queued message ${i + 1}`} onClick={() => remove(q.id, i)}><Icons.X size={14} /></Button>}
                </span>
              </div>
            </>}
        </li>
      ))}
    </ol>
  );
}

export interface MessageActionsProps {
  /** Shows Copy (the message's text, or this value). */
  onCopy?: boolean | (() => string);
  onRegenerate?: () => void;
  /** Shows good / bad response toggles; null when cleared. */
  onFeedback?: (value: 'up' | 'down' | null) => void;
  feedback?: 'up' | 'down' | null;
  /**
   * Regenerated answers, or a person's edited message, are kept as versions, never overwritten: "Version 2 of 2".
   * Switching is announced ("Showing version 1 of 2").
   */
  versions?: { index: number; total: number; onChange: (index: number) => void };
  /** A person's message: an Edit action that opens it in place; sending the edit calls this with the new text (start a branch from it). */
  onEdit?: (text: string) => void;
  className?: string;
}
/** Copy, regenerate, feedback and versions: ghost buttons that lift when pointed at. Hidden while the message streams. */
export function MessageActions({ onCopy, onRegenerate, onFeedback, feedback, versions, onEdit, className }: MessageActionsProps) {
  const m = React.useContext(MessageCtx);
  const c = React.useContext(ConversationCtx);
  if (m) m.edit.current = onEdit;
  const switchTo = (i: number) => { versions!.onChange(i); c?.announce(`Showing version ${i} of ${versions!.total}`); };
  const [fb, setFb] = React.useState<'up' | 'down' | null>(feedback ?? null);
  React.useEffect(() => { if (feedback !== undefined) setFb(feedback); }, [feedback]);
  if (m?.status === 'streaming' || (m && m.editing !== null)) return null;
  return (
    <div className={cx('alt-msg-actions', className)} role="group" aria-label="Message actions">
      {versions && versions.total > 1 && (
        <span className="alt-msg-versions">
          <Button size="sm" variant="ghost" square aria-label="Previous version" disabled={versions.index <= 1} onClick={() => switchTo(versions.index - 1)}><Icons.ChevronDown size={14} style={{ rotate: '90deg' }} /></Button>
          <span className="alt-msg-version">Version {versions.index} of {versions.total}</span>
          <Button size="sm" variant="ghost" square aria-label="Next version" disabled={versions.index >= versions.total} onClick={() => switchTo(versions.index + 1)}><Icons.ChevronDown size={14} style={{ rotate: '-90deg' }} /></Button>
        </span>
      )}
      {onEdit && m && <Tooltip content="Edit"><Button size="sm" variant="ghost" square aria-label="Edit message" onClick={(e) => m.startEdit(e.currentTarget)}><Icons.Pencil size={14} /></Button></Tooltip>}
      {onCopy && <CopyButton size="sm" label="Copy message" value={() => (typeof onCopy === 'function' ? onCopy() : m?.text() ?? '')} />}
      {onRegenerate && <Tooltip content="Regenerate"><Button size="sm" variant="ghost" square aria-label="Regenerate response" onClick={onRegenerate}><Icons.Refresh size={15} /></Button></Tooltip>}
      {onFeedback && (
        <ToggleGroup type="multiple" size="sm" aria-label="Rate this response" value={fb ? [fb] : []}
          onValueChange={(v) => { const list = v as string[]; const next = (list.find((x) => x !== fb) ?? null) as 'up' | 'down' | null; setFb(next); onFeedback(next); }}>
          <ToggleGroupItem value="up" square aria-label="Good response"><Icons.ThumbsUp size={15} /></ToggleGroupItem>
          <ToggleGroupItem value="down" square aria-label="Bad response"><Icons.ThumbsDown size={15} /></ToggleGroupItem>
        </ToggleGroup>
      )}
    </div>
  );
}
