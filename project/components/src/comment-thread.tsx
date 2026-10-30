import * as React from 'react';
import { cx, Icons, useApproach, useDepth, useKeyFocus } from './core';
import { Avatar, Button } from './controls';
import { RelativeTime } from './relative-time';

/* ───────────────────────── CommentThread ───────────────────────── */

export interface ThreadComment {
  id: string;
  author: { name: string; avatar?: string };
  /** Plain text; "@Name" for someone mentioned (their names in `mentions`). */
  body: string;
  createdAt: Date | string | number;
  /** One you're posting: pending hovers ("Posting…"), failed drops to a trench with Retry and keeps the text. */
  status?: 'pending' | 'failed';
  /** Names mentioned in the body, drawn as plates. */
  mentions?: string[];
  /** Yours: it can be deleted. */
  mine?: boolean;
  /** Deleted: its result stays in its slot ("Comment deleted") with Undo. */
  deleted?: boolean;
}
export interface Mentionable { id: string; name: string }

export interface CommentThreadProps {
  comments: ThreadComment[];
  /** The thread is resolved: stamped, muted and collapsed to one line, kept in place. */
  resolved?: { by: string } | false;
  onPost?: (body: string, mentions: Mentionable[]) => void;
  onResolve?: () => void;
  onReopen?: () => void;
  onRetry?: (id: string) => void;
  onDelete?: (id: string) => void;
  onUndoDelete?: (id: string) => void;
  /** People who can be mentioned, for a query after "@". */
  mentionable?: (query: string) => Mentionable[];
  /** Other people typing now (shown with their presence, never announced). */
  typing?: string[];
  'aria-label'?: string;
  className?: string;
}

/** A comment's text with its mentions as plates. */
function Body({ text, mentions = [] }: { text: string; mentions?: string[] }) {
  if (!mentions.length) return <>{text}</>;
  const re = new RegExp(`@(${mentions.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  const out: React.ReactNode[] = []; let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text))) { out.push(text.slice(last, m.index), <span key={m.index} className="alt-comment-mention">@{m[1]}</span>); last = m.index + m[0].length; }
  out.push(text.slice(last));
  return <>{out}</>;
}

function CommentItem({ c, onRetry, onDelete, onUndoDelete, isNew }: { c: ThreadComment; onRetry?: (id: string) => void; onDelete?: (id: string) => void; onUndoDelete?: (id: string) => void; isNew: boolean }) {
  const { style, ...depth } = useDepth({ status: c.status, settle: isNew && !c.status ? true : undefined });
  if (c.deleted) return (
    <li className="alt-comment" data-deleted="">
      <span className="alt-comment-receipt">Comment deleted</span>
      {onUndoDelete && <Button size="sm" variant="ghost" onClick={() => onUndoDelete(c.id)}>Undo</Button>}
    </li>
  );
  return (
    <li className="alt-comment" {...depth} style={style}>
      <article className="alt-comment-article" aria-label={`${c.author.name}`}>
        <Avatar name={c.author.name} src={c.author.avatar} size={28} />
        <div className="alt-comment-main">
          <header className="alt-comment-head">
            <span className="alt-comment-author">{c.author.name}</span>
            <span className="alt-comment-time">{c.status === 'pending' ? 'Posting…' : c.status === 'failed' ? <span className="alt-comment-failed"><Icons.AlertCircle size={13} />Couldn't post</span> : <RelativeTime date={c.createdAt} />}</span>
          </header>
          <p className="alt-comment-body"><Body text={c.body} mentions={c.mentions} /></p>
          {(c.status === 'failed' && onRetry) || (c.mine && onDelete && !c.status) ? (
            <div className="alt-comment-actions">
              {c.status === 'failed' && onRetry && <Button size="sm" variant="secondary" onClick={() => onRetry(c.id)}>Retry</Button>}
              {c.mine && onDelete && !c.status && <Button size="sm" variant="ghost" onClick={() => onDelete(c.id)}>Delete</Button>}
            </div>
          ) : null}
        </div>
      </article>
    </li>
  );
}

/**
 * Comments on a record. Posted comments are the record, flush on the ground; the composer is an opening that fills; a
 * comment being posted hovers until it lands, or drops to a trench keeping its text. A resolved thread is stamped like a
 * done Checklist item: muted, collapsed to one line, kept in place. Mentions are a listbox at level 3.
 */
export function CommentThread({ comments, resolved, onPost, onResolve, onReopen, onRetry, onDelete, onUndoDelete, mentionable, typing = [], 'aria-label': label = 'Comments', className }: CommentThreadProps) {
  useApproach(); useKeyFocus();
  const [text, setText] = React.useState('');
  const [chosen, setChosen] = React.useState<Mentionable[]>([]);
  const [query, setQuery] = React.useState<{ q: string; at: number } | null>(null);
  const [active, setActive] = React.useState(0);
  const [showResolved, setShowResolved] = React.useState(false);
  const area = React.useRef<HTMLTextAreaElement>(null);
  const id = React.useId();
  const options = query && mentionable ? mentionable(query.q).slice(0, 6) : [];
  const listOpen = !!query && options.length > 0;

  // New comments from others are said politely and batched; the afterglow marks them.
  const seen = React.useRef<Set<string> | null>(null);
  const fresh = seen.current ? new Set(comments.map((c) => c.id).filter((x) => !seen.current!.has(x))) : new Set<string>();
  const [said, setSaid] = React.useState('');
  React.useEffect(() => {
    const others = comments.filter((c) => fresh.has(c.id) && !c.mine).length;
    if (others) setSaid(`${others} new ${others === 1 ? 'comment' : 'comments'}.`);
    seen.current = new Set(comments.map((c) => c.id));
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const readQuery = (value: string, caret: number) => {
    const before = value.slice(0, caret), m = /(^|\s)@([\p{L}\p{N}._-]*)$/u.exec(before);
    setQuery(m ? { q: m[2], at: caret - m[2].length - 1 } : null);
    setActive(0);
  };
  const choose = (p: Mentionable) => {
    if (!query) return;
    const caret = area.current?.selectionStart ?? text.length;
    const next = `${text.slice(0, query.at)}@${p.name} ${text.slice(caret)}`;
    setText(next); setChosen((c) => (c.some((x) => x.id === p.id) ? c : [...c, p])); setQuery(null);
    requestAnimationFrame(() => { const pos = query.at + p.name.length + 2; area.current?.setSelectionRange(pos, pos); area.current?.focus(); });
  };
  const post = () => {
    const body = text.trim();
    if (!body) return;
    onPost?.(body, chosen.filter((p) => body.includes(`@${p.name}`)));
    setText(''); setChosen([]); setQuery(null);
  };
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (listOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % options.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + options.length) % options.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); choose(options[active]); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setQuery(null); return; }
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); post(); }
  };

  const typingText = typing.length === 1 ? `${typing[0]} is typing` : typing.length === 2 ? `${typing[0]} and ${typing[1]} are typing` : typing.length > 2 ? `${typing.length} people are typing` : '';
  const list = <ul className="alt-comment-list">{comments.map((c) => <CommentItem key={c.id} c={c} isNew={fresh.has(c.id)} onRetry={onRetry} onDelete={onDelete} onUndoDelete={onUndoDelete} />)}</ul>;
  return (
    <section className={cx('alt-comments', className)} aria-label={label} data-resolved={resolved ? '' : undefined}>
      {resolved ? (
        <div className="alt-comments-resolved">
          <span className="alt-comments-stamp"><Icons.Check size={14} aria-hidden="true" />Resolved by {resolved.by}</span>
          <Button size="sm" variant="ghost" aria-expanded={showResolved} onClick={() => setShowResolved(!showResolved)}>{showResolved ? 'Hide' : 'Show'} {comments.length} {comments.length === 1 ? 'comment' : 'comments'}</Button>
          {onReopen && <Button size="sm" variant="ghost" onClick={onReopen}>Reopen</Button>}
        </div>
      ) : null}
      {(!resolved || showResolved) && list}
      {!resolved && (
        <div className="alt-comments-compose">
          {typingText && <p className="alt-comments-typing" aria-hidden="true"><span className="alt-comments-dots"><i /><i /><i /></span>{typingText}</p>}
          <div className="alt-comments-field">
            <div className="alt-input" data-multiline="" data-approach="56">
              <textarea ref={area} value={text} placeholder="Add a comment — @ to mention" aria-label="Add a comment" rows={2}
                role="combobox" aria-autocomplete="list" aria-expanded={listOpen} aria-controls={listOpen ? `${id}-list` : undefined}
                aria-activedescendant={listOpen ? `${id}-o${active}` : undefined}
                onChange={(e) => { setText(e.target.value); readQuery(e.target.value, e.target.selectionStart); }}
                onKeyDown={onKey} onBlur={() => setTimeout(() => setQuery(null), 150)} />
            </div>
            {listOpen && (
              <div id={`${id}-list`} role="listbox" aria-label="People to mention" className="alt-pop alt-comments-mentions" data-state="open" data-side="bottom" data-align="start">
                {options.map((p, i) => <div key={p.id} id={`${id}-o${i}`} role="option" aria-selected={i === active} className="alt-comments-option" data-active={i === active ? '' : undefined}
                  onMouseDown={(e) => e.preventDefault()} onClick={() => choose(p)} onPointerMove={() => setActive(i)}><span aria-hidden="true"><Avatar name={p.name} size={20} /></span><span className="alt-comments-name">{p.name}</span></div>)}
              </div>
            )}
          </div>
          <div className="alt-comments-actions">
            {onResolve && comments.length > 0 && <Button size="sm" variant="ghost" onClick={onResolve}><Icons.Check size={14} />Resolve</Button>}
            <Button size="sm" variant="primary" onClick={post} disabled={!text.trim()} aria-keyshortcuts="Meta+Enter Control+Enter">Comment</Button>
          </div>
        </div>
      )}
      <span className="alt-sr" aria-live="polite">{said}</span>
    </section>
  );
}
