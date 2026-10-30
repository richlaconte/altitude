import * as React from 'react';
import { cx, Icons, useApproach, useDepth, useKeyFocus } from './core';
import { Button } from './controls';
import { Tag } from './tag-input';

/* ───────────────────────── PromptInput ───────────────────────── */

export type PromptStatus = 'ready' | 'submitted' | 'streaming' | 'error';
export interface PromptAttachment { id: string; file: File; name: string; status?: 'pending' }
export interface PromptMention { id: string; label: string; kind?: 'file' | 'record' | 'person'; description?: string }
export interface PromptCommand { name: string; description?: string }
export interface PromptMessage {
  text: string; files: File[];
  /** What was pointed at with @ and is still in the text. */
  mentions?: PromptMention[];
  /** The command chosen with / at the start, without its slash; it's taken out of `text`. */
  command?: string;
}
type Option = { id: string; label: string; kind: 'file' | 'record' | 'person' | 'command'; description?: string; source: PromptMention | PromptCommand };
interface Suggest {
  open: boolean; listId: string; active: number; activeId?: string; enabled: boolean;
  read: (value: string, caret: number) => void; close: () => void; key: (e: React.KeyboardEvent<HTMLTextAreaElement>) => boolean;
}

interface Ctx {
  text: string; setText: (t: string) => void; files: PromptAttachment[]; attach: (files: File[]) => void; remove: (id: string) => void;
  status: PromptStatus; submit: () => void; stop: () => void; busy: boolean; pick: () => void; area: React.MutableRefObject<HTMLTextAreaElement | null>;
  suggest: Suggest;
}
const PromptCtx = React.createContext<Ctx | null>(null);
const usePrompt = (part: string) => { const c = React.useContext(PromptCtx); if (!c) throw new Error(`${part} must be inside <PromptInput>.`); return c; };

export interface PromptInputProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  /** Called with the text and attached files when sent. */
  onSubmit: (message: PromptMessage) => void;
  /** 'submitted' and 'streaming' turn Send into Stop, in the same slot. Default 'ready'. */
  status?: PromptStatus;
  onStop?: () => void;
  /**
   * Lets a person queue a message while the agent works (#276): Enter while 'submitted' or 'streaming' calls this
   * instead of doing nothing; the button stays Stop, the composer empties and keeps focus. Show the queue with
   * ConversationQueue and send the first one when the turn ends.
   */
  onQueue?: (message: PromptMessage) => void;
  /**
   * Things to point the agent at (#283): typing @ opens a list of what matches, filtered as you type. A chosen one is
   * "@label" in the text and a plate above it; Backspace after it removes it whole. A promise shows "Searching…".
   */
  mentionable?: (query: string) => PromptMention[] | Promise<PromptMention[]>;
  /** Commands: typing / at the start of an empty composer opens them ("/review"). */
  commands?: PromptCommand[];
  /** Controlled text. */
  value?: string;
  onValueChange?: (text: string) => void;
  /** Called when files are attached; a promise holds the chip as pending ("Uploading") until it settles, a rejection removes it. */
  onAttach?: (files: File[]) => void | Promise<unknown>;
  /** Accepted file types, as for an input. Leave out to turn attachments off for the picker and drop. */
  accept?: string;
  children: React.ReactNode;
}
/**
 * Where a person writes to an agent. The whole composer is an opening, the Input well: empty it shows its back wall and
 * deepens as the pointer nears, and once it holds text the floor rises flush. Send is the level-2 primary; while a
 * response is generating it becomes Stop in the same slot and size, so nothing moves. Enter sends, Shift+Enter adds a
 * line, and Enter during IME composition never sends.
 */
export function PromptInput({ onSubmit, status = 'ready', onStop, onQueue, mentionable, commands, value, onValueChange, onAttach, accept, className, children, ...rest }: PromptInputProps) {
  useApproach(); useKeyFocus();
  const [own, setOwn] = React.useState('');
  const text = value ?? own;
  const setText = (t: string) => { if (value === undefined) setOwn(t); onValueChange?.(t); };
  const [files, setFiles] = React.useState<PromptAttachment[]>([]);
  const [over, setOver] = React.useState(false);
  const [said, setSaid] = React.useState('');
  const area = React.useRef<HTMLTextAreaElement | null>(null);
  const picker = React.useRef<HTMLInputElement>(null);
  const busy = status === 'submitted' || status === 'streaming';
  const wasBusy = React.useRef(busy);
  React.useEffect(() => { wasBusy.current = busy; }, [busy]);

  const attach = (list: File[]) => {
    if (!list.length) return;
    const added = list.map((file) => ({ id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`, file, name: file.name }));
    const result = onAttach?.(list);
    const pending = !!result && typeof (result as Promise<unknown>).then === 'function';
    setFiles((xs) => [...xs, ...added.map((a) => (pending ? { ...a, status: 'pending' as const } : a))]);
    setSaid(`${list.length === 1 ? list[0].name : `${list.length} files`} attached.`);
    if (pending) (result as Promise<unknown>).then(
      () => setFiles((xs) => xs.map((x) => (added.some((a) => a.id === x.id) ? { ...x, status: undefined } : x))),
      () => { setFiles((xs) => xs.filter((x) => !added.some((a) => a.id === x.id))); setSaid(`Couldn't attach ${list.length === 1 ? list[0].name : `${list.length} files`}.`); });
  };
  // @ mentions and / commands (#283): the query at the caret, its options, what's been chosen.
  const listId = `${React.useId().replace(/:/g, '')}-suggest`;
  const [query, setQuery] = React.useState<{ kind: '@' | '/'; q: string; at: number } | null>(null);
  const [found, setFound] = React.useState<PromptMention[] | null>([]);
  const [active, setActive] = React.useState(0);
  const [chosen, setChosen] = React.useState<PromptMention[]>([]);
  const [command, setCommand] = React.useState<string | null>(null);
  const asked = React.useRef(0);
  React.useEffect(() => {
    if (query?.kind !== '@' || !mentionable) return;
    const n = ++asked.current;
    const r = mentionable(query.q);
    if (r && typeof (r as Promise<PromptMention[]>).then === 'function') { setFound(null); (r as Promise<PromptMention[]>).then((xs) => { if (n === asked.current) setFound(xs); }, () => { if (n === asked.current) setFound([]); }); }
    else setFound(r as PromptMention[]);
  }, [query?.kind, query?.q]); // eslint-disable-line react-hooks/exhaustive-deps
  const options: Option[] = !query ? [] : query.kind === '/'
    ? (commands ?? []).map((c) => ({ c, s: c.name.toLowerCase().startsWith(query.q.toLowerCase()) ? 0 : c.name.toLowerCase().includes(query.q.toLowerCase()) ? 1 : 2 }))
      .filter((x) => x.s < 2).sort((a, b) => a.s - b.s).map(({ c }) => ({ id: `cmd-${c.name}`, label: `/${c.name}`, kind: 'command' as const, description: c.description, source: c }))
    : (found ?? []).slice(0, 8).map((m) => ({ id: `m-${m.id}`, label: m.label, kind: m.kind ?? 'record', description: m.description, source: m }));
  const searching = query?.kind === '@' && found === null;
  const listOpen = !!query && (options.length > 0 || searching);
  const read = (v: string, caret: number) => {
    const before = v.slice(0, caret);
    let m: RegExpExecArray | null;
    if (commands?.length && (m = /^\/([\w-]*)$/.exec(before)) && !v.includes('\n')) setQuery({ kind: '/', q: m[1], at: 0 });
    else if (mentionable && (m = /(^|\s)@([^\s@]*)$/u.exec(before))) setQuery({ kind: '@', q: m[2], at: caret - m[2].length - 1 });
    else setQuery(null);
    setActive(0);
    // What's no longer in the text is no longer chosen.
    setChosen((cs) => cs.filter((x) => v.includes(`@${x.label}`)));
    setCommand((c) => (c && v.startsWith(`/${c}`) ? c : null));
  };
  const caretTo = (pos: number) => requestAnimationFrame(() => { area.current?.focus(); area.current?.setSelectionRange(pos, pos); });
  const choose = (o: Option) => {
    if (!query) return;
    const caret = area.current?.selectionStart ?? text.length;
    if (o.kind === 'command') {
      const name = (o.source as PromptCommand).name, rest = text.slice(caret).replace(/^\s+/, '');
      setText(`/${name} ${rest}`); setCommand(name); caretTo(name.length + 2);
    } else {
      const m = o.source as PromptMention;
      setText(`${text.slice(0, query.at)}@${m.label} ${text.slice(caret)}`); setChosen((cs) => (cs.some((x) => x.id === m.id) ? cs : [...cs, m]));
      caretTo(query.at + m.label.length + 2);
    }
    setQuery(null);
  };
  // Takes a mention or command out of the text whole.
  const unmention = (token: string, after = false) => {
    const at = text.indexOf(token);
    if (at < 0) return;
    const end = at + token.length + (text[at + token.length] === ' ' ? 1 : 0);
    setText(text.slice(0, at) + text.slice(end));
    setChosen((cs) => cs.filter((x) => `@${x.label}` !== token));
    if (token.startsWith('/')) setCommand(null);
    if (after) caretTo(at);
  };
  const key = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return false;
    if (listOpen) {
      if (e.key === 'ArrowDown' && options.length) { e.preventDefault(); setActive((a) => (a + 1) % options.length); return true; }
      if (e.key === 'ArrowUp' && options.length) { e.preventDefault(); setActive((a) => (a - 1 + options.length) % options.length); return true; }
      if ((e.key === 'Enter' || e.key === 'Tab') && options[active]) { e.preventDefault(); choose(options[active]); return true; }
      // The first Escape closes the list; only a second one stops generating.
      if (e.key === 'Escape') { e.preventDefault(); setQuery(null); return true; }
    }
    if (e.key === 'Backspace') {
      const el = e.currentTarget;
      if (el.selectionStart !== el.selectionEnd) return false;
      const before = text.slice(0, el.selectionStart);
      const tokens = [...chosen.map((x) => `@${x.label}`), ...(command ? [`/${command}`] : [])];
      const hit = tokens.find((t) => before.endsWith(t) || before.endsWith(`${t} `));
      if (hit) { e.preventDefault(); unmention(hit, true); return true; }
    }
    return false;
  };
  const suggest: Suggest = { open: listOpen, listId, active, activeId: listOpen && options[active] ? `${listId}-${options[active].id}` : undefined, enabled: !!(mentionable || commands?.length), read, close: () => setQuery(null), key };
  const remove = (id: string) => { const f = files.find((x) => x.id === id); setFiles((xs) => xs.filter((x) => x.id !== id)); if (f) setSaid(`${f.name} removed.`); area.current?.focus(); };
  const ready = !!text.trim() && !files.some((f) => f.status === 'pending');
  const message = (): PromptMessage => {
    const body = command ? text.replace(new RegExp(`^/${command}\\s*`), '') : text;
    const mentions = chosen.filter((x) => body.includes(`@${x.label}`));
    return { text: body.trim(), files: files.map((f) => f.file), ...(mentions.length ? { mentions } : {}), ...(command ? { command } : {}) };
  };
  const clear = () => { setText(''); setFiles([]); setChosen([]); setCommand(null); setQuery(null); };
  const submit = () => {
    if (!ready || (busy && !onQueue)) return;
    if (busy) {
      onQueue!(message());
      clear();
      setSaid('Message queued. It will be sent when the assistant finishes.');
      area.current?.focus();
      return;
    }
    onSubmit(message());
    clear();
    area.current?.focus();
  };
  const stop = () => { if (!busy) return; onStop?.(); setSaid('Generating stopped.'); area.current?.focus(); };
  const pick = () => { if (accept !== undefined) picker.current?.click(); };
  const hasFiles = (e: React.DragEvent) => accept !== undefined && [...e.dataTransfer.types].includes('Files');

  return (
    <PromptCtx.Provider value={{ text, setText, files, attach, remove, status, submit, stop, busy, pick, area, suggest }}>
      <form {...rest} className={cx('alt-prompt', className)} data-status={status} onSubmit={(e) => { e.preventDefault(); submit(); }}
        onDragEnter={(e) => { if (hasFiles(e)) { e.preventDefault(); setOver(true); } }}
        onDragOver={(e) => { if (hasFiles(e)) e.preventDefault(); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false); }}
        onDrop={(e) => { if (!hasFiles(e)) return; e.preventDefault(); setOver(false); attach([...e.dataTransfer.files]); }}>
        {listOpen && (
          <div id={listId} role="listbox" aria-label={query?.kind === '/' ? 'Commands' : 'Mention'} className="alt-pop alt-prompt-suggest" data-state="open" data-side="top" data-align="start" aria-busy={searching || undefined}>
            {searching ? <p className="alt-prompt-searching"><span className="alt-skeleton" data-shape="text" aria-hidden="true" />Searching…</p>
              : (['command', 'file', 'record', 'person'] as const).map((kind) => {
                const group = options.filter((o) => o.kind === kind);
                if (!group.length) return null;
                const name = { command: 'Commands', file: 'Files', record: 'Records', person: 'People' }[kind];
                return (
                  <div key={kind} role="group" aria-label={name}>
                    <p className="alt-prompt-suggest-head" aria-hidden="true">{name}</p>
                    {group.map((o) => { const i = options.indexOf(o); return (
                      <div key={o.id} id={`${listId}-${o.id}`} role="option" aria-selected={i === active} className="alt-prompt-option" data-active={i === active ? '' : undefined}
                        onMouseDown={(e) => e.preventDefault()} onClick={() => choose(o)} onPointerMove={() => setActive(i)}>
                        <span className="alt-prompt-option-label" data-kind={o.kind}>{o.label}</span>
                        {o.description && <span className="alt-prompt-option-desc">{o.description}</span>}
                      </div>
                    ); })}
                  </div>
                );
              })}
          </div>
        )}
        <div className="alt-input alt-prompt-well" data-multiline="" data-approach="56" data-drop={over ? 'over' : undefined}>
          {(chosen.length > 0 || command) && (
            <div className="alt-prompt-context" role="group" aria-label="Context">
              {command && <Tag className="alt-prompt-command" label={`/${command}`} onRemove={() => unmention(`/${command}`)}>/{command}</Tag>}
              {chosen.map((m) => <Tag key={m.id} label={m.label} onRemove={() => unmention(`@${m.label}`)}><span className="alt-prompt-kind" data-kind={m.kind ?? 'record'} aria-hidden="true" />{m.label}</Tag>)}
            </div>
          )}
          {children}
          {over && <span className="alt-prompt-drop" aria-hidden="true">Drop to attach</span>}
        </div>
        {accept !== undefined && <input ref={picker} type="file" accept={accept || undefined} multiple hidden tabIndex={-1} onChange={(e) => { attach([...(e.target.files ?? [])]); e.target.value = ''; }} />}
        <span className="alt-sr" role="status" aria-live="polite">{said}</span>
      </form>
    </PromptCtx.Provider>
  );
}

export interface PromptInputTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  /** The tallest it grows, in pixels, before it scrolls. Default 200. */
  maxHeight?: number;
}
/** The text: it grows with what's written, up to maxHeight, then scrolls. */
export function PromptInputTextarea({ placeholder = 'Ask anything', maxHeight = 200, className, onKeyDown, 'aria-label': label, ...rest }: PromptInputTextareaProps) {
  const c = usePrompt('PromptInputTextarea');
  const grow = React.useCallback(() => {
    const el = c.area.current; if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(maxHeight, el.scrollHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [c.area, maxHeight]);
  React.useLayoutEffect(grow, [c.text, grow]);
  return (
    <textarea ref={c.area} rows={1} value={c.text} placeholder={placeholder} aria-label={label ?? (rest['aria-labelledby'] ? undefined : 'Message')} className={cx('alt-prompt-text', className)}
      aria-keyshortcuts="Enter"
      {...(c.suggest.enabled ? { role: 'combobox', 'aria-autocomplete': 'list' as const, 'aria-expanded': c.suggest.open, 'aria-controls': c.suggest.open ? c.suggest.listId : undefined, 'aria-activedescendant': c.suggest.activeId } : {})}
      {...rest}
      onChange={(e) => { c.setText(e.target.value); c.suggest.read(e.target.value, e.target.selectionStart); }}
      onBlur={(e) => { rest.onBlur?.(e); setTimeout(c.suggest.close, 150); }}
      onPaste={(e) => { const fs = [...e.clipboardData.files]; if (fs.length) { e.preventDefault(); c.attach(fs); } }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.defaultPrevented || c.suggest.key(e)) return;
        // Enter while an IME is composing (Japanese, Chinese, Korean input) confirms the composition; it must never send.
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); c.submit(); }
        else if (e.key === 'Escape' && c.busy) { e.preventDefault(); c.stop(); }
        else if (e.key.toLowerCase() === 'u' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); c.pick(); }
      }} />
  );
}

function AttachmentChip({ a, onRemove }: { a: PromptAttachment; onRemove: () => void }) {
  const { style, ...depth } = useDepth({ status: a.status });
  return <span className="alt-prompt-chip" {...depth} style={style}>
    <Tag onRemove={onRemove} label={a.name}>{a.name}{a.status === 'pending' && <span className="alt-prompt-uploading"> · Uploading</span>}</Tag>
  </span>;
}
/** The attached files as Tag plates; one being uploaded hovers as pending. */
export function PromptInputAttachments({ className }: { className?: string }) {
  const c = usePrompt('PromptInputAttachments');
  if (!c.files.length) return null;
  return <div className={cx('alt-prompt-files', className)} role="group" aria-label="Attachments">{c.files.map((a) => <AttachmentChip key={a.id} a={a} onRemove={() => c.remove(a.id)} />)}</div>;
}

/** The row under the text: tools and pickers on the left, Send on the right. */
export function PromptInputToolbar({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div className={cx('alt-prompt-bar', className)}>{children}</div>;
}

/** Attach files (the picker); ⌘/Ctrl+U does the same from the text. Needs `accept` on PromptInput. */
export function PromptInputAttach({ label = 'Attach files' }: { label?: string }) {
  const c = usePrompt('PromptInputAttach');
  return <Button size="sm" variant="ghost" square aria-label={label} aria-keyshortcuts="Meta+U Control+U" onClick={c.pick}><Icons.Paperclip size={16} /></Button>;
}

/** Send, which becomes Stop in the same slot and size while a response is generating. */
export function PromptInputSubmit({ className }: { className?: string }) {
  const c = usePrompt('PromptInputSubmit');
  const empty = !c.text.trim() || c.files.some((f) => f.status === 'pending');
  return c.busy
    ? <Button size="sm" variant="primary" square className={cx('alt-prompt-send', className)} data-stop="" aria-label="Stop generating" aria-keyshortcuts="Escape" onClick={c.stop}><Icons.Stop size={18} /></Button>
    : <Button type="submit" size="sm" variant="primary" square className={cx('alt-prompt-send', className)} aria-label="Send message" aria-disabled={empty || undefined}
        onClick={(e) => { if (empty) e.preventDefault(); }}><Icons.ArrowUp size={16} /></Button>;
}
