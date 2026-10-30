import * as React from 'react';
import { cx, Icons, useApproach, useDepth, useKeyFocus } from './core';
import { Button } from './controls';
import { Tag } from './tag-input';

/* ───────────────────────── PromptInput ───────────────────────── */

export type PromptStatus = 'ready' | 'submitted' | 'streaming' | 'error';
export interface PromptAttachment { id: string; file: File; name: string; status?: 'pending' }
export interface PromptMessage { text: string; files: File[] }

interface Ctx {
  text: string; setText: (t: string) => void; files: PromptAttachment[]; attach: (files: File[]) => void; remove: (id: string) => void;
  status: PromptStatus; submit: () => void; stop: () => void; busy: boolean; pick: () => void; area: React.RefObject<HTMLTextAreaElement | null>;
}
const PromptCtx = React.createContext<Ctx | null>(null);
const usePrompt = (part: string) => { const c = React.useContext(PromptCtx); if (!c) throw new Error(`${part} must be inside <PromptInput>.`); return c; };

export interface PromptInputProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  /** Called with the text and attached files when sent. */
  onSubmit: (message: PromptMessage) => void;
  /** 'submitted' and 'streaming' turn Send into Stop, in the same slot. Default 'ready'. */
  status?: PromptStatus;
  onStop?: () => void;
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
export function PromptInput({ onSubmit, status = 'ready', onStop, value, onValueChange, onAttach, accept, className, children, ...rest }: PromptInputProps) {
  useApproach(); useKeyFocus();
  const [own, setOwn] = React.useState('');
  const text = value ?? own;
  const setText = (t: string) => { if (value === undefined) setOwn(t); onValueChange?.(t); };
  const [files, setFiles] = React.useState<PromptAttachment[]>([]);
  const [over, setOver] = React.useState(false);
  const [said, setSaid] = React.useState('');
  const area = React.useRef<HTMLTextAreaElement>(null);
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
  const remove = (id: string) => { const f = files.find((x) => x.id === id); setFiles((xs) => xs.filter((x) => x.id !== id)); if (f) setSaid(`${f.name} removed.`); area.current?.focus(); };
  const ready = !!text.trim() && !files.some((f) => f.status === 'pending');
  const submit = () => {
    if (busy || !ready) return;
    onSubmit({ text: text.trim(), files: files.map((f) => f.file) });
    setText(''); setFiles([]);
    area.current?.focus();
  };
  const stop = () => { if (!busy) return; onStop?.(); setSaid('Generating stopped.'); area.current?.focus(); };
  const pick = () => { if (accept !== undefined) picker.current?.click(); };
  const hasFiles = (e: React.DragEvent) => accept !== undefined && [...e.dataTransfer.types].includes('Files');

  return (
    <PromptCtx.Provider value={{ text, setText, files, attach, remove, status, submit, stop, busy, pick, area }}>
      <form {...rest} className={cx('alt-prompt', className)} data-status={status} onSubmit={(e) => { e.preventDefault(); submit(); }}
        onDragEnter={(e) => { if (hasFiles(e)) { e.preventDefault(); setOver(true); } }}
        onDragOver={(e) => { if (hasFiles(e)) e.preventDefault(); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false); }}
        onDrop={(e) => { if (!hasFiles(e)) return; e.preventDefault(); setOver(false); attach([...e.dataTransfer.files]); }}>
        <div className="alt-input alt-prompt-well" data-multiline="" data-approach="56" data-drop={over ? 'over' : undefined}>
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
      aria-keyshortcuts="Enter" {...rest}
      onChange={(e) => c.setText(e.target.value)}
      onPaste={(e) => { const fs = [...e.clipboardData.files]; if (fs.length) { e.preventDefault(); c.attach(fs); } }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
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
    ? <Button size="sm" variant="primary" square className={cx('alt-prompt-send', className)} data-stop="" aria-label="Stop generating" aria-keyshortcuts="Escape" onClick={c.stop}><Icons.Stop size={14} /></Button>
    : <Button type="submit" size="sm" variant="primary" square className={cx('alt-prompt-send', className)} aria-label="Send message" aria-disabled={empty || undefined}
        onClick={(e) => { if (empty) e.preventDefault(); }}><Icons.ArrowUp size={16} /></Button>;
}
