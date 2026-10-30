import * as React from 'react';
import { cx, Icons, useDepth } from './core';
import { Button } from './controls';
import { CopyButton } from './copy-button';
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
interface MsgCtx { from: 'user' | 'assistant'; status: MessageStatus; text: () => string }
const MessageCtx = React.createContext<MsgCtx | null>(null);

export interface MessageProps extends React.HTMLAttributes<HTMLElement> {
  from: 'user' | 'assistant';
  /** An assistant message: streaming rests on the ground with a dashed rule, "Generating…" and a caret; complete settles with one afterglow; stopped and error are kept, with Retry. Default 'complete'. */
  status?: MessageStatus;
  /** Who's speaking. Default "You" or "Assistant". */
  name?: string;
  onRetry?: () => void;
}
/**
 * One message. A person's is a flush accent-soft sheet; an assistant's is flush, no bubble. While an answer streams it
 * isn't the record yet: it rests on the ground with a dashed rule down its edge (charts' "not yet the record"), never
 * hovering, because nothing you sent is in flight. When it completes the rule goes solid and it settles once.
 */
export function Message({ from, status = 'complete', name, onRetry, className, children, ...rest }: MessageProps) {
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
  return (
    <MessageCtx.Provider value={{ from, status, text }}>
      <article ref={body} {...depth} className={cx('alt-msg', className)} data-from={from} data-stream={from === 'assistant' ? status : undefined} aria-busy={status === 'streaming' || undefined}
        aria-label={who} style={style} {...rest}>
        <h3 className={from === 'user' ? 'alt-sr' : 'alt-msg-name'}>{who}</h3>
        {children}
        {status === 'streaming' && <p className="alt-msg-caption" aria-hidden="true">Generating…</p>}
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

/** The message's text. Text arrives without per-word animation; a caret marks the end while it streams. */
export function MessageContent({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  const m = React.useContext(MessageCtx);
  return <div className={cx('alt-msg-content', className)} {...rest}>{children}{m?.status === 'streaming' && <span className="alt-msg-caret" aria-hidden="true" />}</div>;
}

export interface MessageActionsProps {
  /** Shows Copy (the message's text, or this value). */
  onCopy?: boolean | (() => string);
  onRegenerate?: () => void;
  /** Shows good / bad response toggles; null when cleared. */
  onFeedback?: (value: 'up' | 'down' | null) => void;
  feedback?: 'up' | 'down' | null;
  /** Regenerated answers are kept as versions, never overwritten: "Version 2 of 2". */
  versions?: { index: number; total: number; onChange: (index: number) => void };
  className?: string;
}
/** Copy, regenerate, feedback and versions: ghost buttons that lift when pointed at. Hidden while the message streams. */
export function MessageActions({ onCopy, onRegenerate, onFeedback, feedback, versions, className }: MessageActionsProps) {
  const m = React.useContext(MessageCtx);
  const [fb, setFb] = React.useState<'up' | 'down' | null>(feedback ?? null);
  React.useEffect(() => { if (feedback !== undefined) setFb(feedback); }, [feedback]);
  if (m?.status === 'streaming') return null;
  return (
    <div className={cx('alt-msg-actions', className)} role="group" aria-label="Message actions">
      {versions && versions.total > 1 && (
        <span className="alt-msg-versions">
          <Button size="sm" variant="ghost" square aria-label="Previous version" disabled={versions.index <= 1} onClick={() => versions.onChange(versions.index - 1)}><Icons.ChevronDown size={14} style={{ rotate: '90deg' }} /></Button>
          <span className="alt-msg-version">Version {versions.index} of {versions.total}</span>
          <Button size="sm" variant="ghost" square aria-label="Next version" disabled={versions.index >= versions.total} onClick={() => versions.onChange(versions.index + 1)}><Icons.ChevronDown size={14} style={{ rotate: '-90deg' }} /></Button>
        </span>
      )}
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
