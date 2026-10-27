import * as React from 'react';
import { cx, Icons, useApproach, useControllable, useIsoLayoutEffect, useKeyFocus, useOutside, usePresence } from './core';
import { commandScore } from './command';
import { EXIT_3, OptionList, SelectOption, textOf, useLabelId, useSide } from './select';

export type TagResult = { ok: true; value: string } | { ok: false; error: string };
export interface TagInputProps {
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Offered as you type, ranked as the Combobox ranks. Free entry is still allowed unless `restrict`. */
  suggestions?: (string | SelectOption)[];
  /** Only suggestions can be added. Default false. */
  restrict?: boolean;
  /** Keys that add what's typed: Enter and any single characters (also used to split a paste). Default [',', 'Enter']. */
  separators?: string[];
  /** The most tags allowed; then the field is read-only with “Limit reached”. */
  max?: number;
  /** Return an error to refuse a tag. Runs after `normalize`. */
  validate?: (tag: string) => string | undefined;
  /** Applied before validating and before comparing for duplicates. Default: trim. */
  normalize?: (tag: string) => string;
  /** Persist one added tag. Return its canonical text, or an error; the tag waits, pending, until then. */
  onAdd?: (tag: string) => TagResult | Promise<TagResult>;
  /** Persist one removal. The tag stays, pending, until the result. */
  onRemove?: (tag: string) => TagResult | Promise<TagResult> | { ok: true } | Promise<{ ok: true } | TagResult>;
  /** Draw a tag's contents. Default: its text. */
  renderTag?: (tag: string) => React.ReactNode;
  /** Words for the count and the messages. Default ['tag', 'tags']. */
  noun?: [singular: string, plural: string];
  placeholder?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  /** Field sets it for you when it has an error. */
  invalid?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

type Busy = { tag: string; kind: 'adding' | 'removing' };
const SAVE_ERROR = 'That change couldn’t be saved. Try again.';

/**
 * A field that holds a set of short values. The field is an opening; each tag is a label stamped flush into its floor
 * like a Badge plate, and once it holds a tag the floor rises flush (filled). The last tag, armed by a first Backspace,
 * lifts one level on a critical tint before a second Backspace takes it off. Suggestions are the Combobox's list.
 */
export function TagInput({ value, defaultValue = [], onValueChange, suggestions, restrict = false, separators = [',', 'Enter'], max,
  validate, normalize = (tag) => tag.trim(), onAdd, onRemove, renderTag, noun = ['tag', 'tags'], placeholder, id, name, disabled,
  required, invalid, size = 'md', className, ...aria }: TagInputProps) {
  const [tags, setTags] = useControllable(value, defaultValue, onValueChange);
  const [text, setText] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const [armed, setArmed] = React.useState(false);
  const [focusTag, setFocusTag] = React.useState(0);
  const [editing, setEditing] = React.useState<{ index: number; text: string; error?: string } | null>(null);
  const [busy, setBusy] = React.useState<Busy[]>([]);
  const [failed, setFailed] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [stamped, setStamped] = React.useState<string[]>([]);
  const [leaving, setLeaving] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState('');
  const auto = React.useId();
  const inputId = id ?? auto + '-input';
  const listId = auto + '-list';
  const hintId = auto + '-hint';
  const errorId = auto + '-error';
  const root = React.useRef<HTMLDivElement>(null);
  const field = React.useRef<HTMLDivElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const list = React.useRef<HTMLDivElement>(null);
  const tagRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const editRef = React.useRef<HTMLInputElement>(null);
  const pendingFocus = React.useRef<number | 'input' | null>(null);
  const mounted = React.useRef(true);
  const latest = React.useRef(tags);
  latest.current = tags;
  const { mounted: listMounted, state } = usePresence(open, EXIT_3);
  const side = useSide(listMounted, field, list);
  const labelId = useLabelId(inputId, auto + '-label');
  useApproach();
  useKeyFocus();
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const keyOf = (tag: string) => normalize(tag).toLowerCase();
  const options: SelectOption[] = React.useMemo(() => (suggestions ?? []).map((s) => typeof s === 'string' ? { value: s, label: s } : s), [suggestions]);
  const have = new Set(tags.map(keyOf));
  const pendingAdds = busy.filter((b) => b.kind === 'adding').map((b) => b.tag);
  const shownTags = [...tags, ...pendingAdds.filter((t) => !have.has(keyOf(t)))];
  const full = max !== undefined && shownTags.length >= max;
  const q = text.trim();
  const available = options.filter((o) => !have.has(keyOf(o.value)) && !pendingAdds.some((t) => keyOf(t) === keyOf(o.value)));
  const shown = q ? available.map((o, i) => ({ o, i, s: commandScore(textOf(o), q) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.o) : available;
  const word = (n: number) => `${n} ${n === 1 ? noun[0] : noun[1]}`;
  const sepChars = separators.filter((s) => s.length === 1);
  const splitter = sepChars.length ? new RegExp(`[${sepChars.map((c) => c.replace(/[\\\]^-]/g, '\\$&')).join('')}\\n]`) : /\n/;

  useIsoLayoutEffect(() => {
    const want = pendingFocus.current;
    if (want === null) return;
    pendingFocus.current = null;
    if (want === 'input') input.current?.focus();
    else tagRefs.current[want]?.focus();
  });
  useIsoLayoutEffect(() => { if (editing) { editRef.current?.focus(); editRef.current?.select(); } }, [editing?.index]);
  useOutside(root, open, () => setOpen(false));

  const stamp = (tag: string) => { setStamped((s) => [...s, tag]); setTimeout(() => mounted.current && setStamped((s) => s.filter((t) => t !== tag)), 400); };
  const check = (raw: string, except?: number): { tag?: string; error?: string } => {
    const tag = normalize(raw);
    if (!tag) return {};
    if (restrict && !options.some((o) => keyOf(o.value) === keyOf(tag) || keyOf(textOf(o)) === keyOf(tag))) return { error: `Choose a ${noun[0]} from the list.` };
    if (latest.current.some((t, i) => i !== except && keyOf(t) === keyOf(tag)) || pendingAdds.some((t) => keyOf(t) === keyOf(tag))) return { error: `${tag} is already added.` };
    const invalidText = validate?.(tag);
    if (invalidText) return { error: invalidText };
    return { tag: restrict ? (options.find((o) => keyOf(o.value) === keyOf(tag) || keyOf(textOf(o)) === keyOf(tag))!.value) : tag };
  };

  /** Adds each entry in turn; returns what couldn't be added, for the input. */
  const add = (entries: string[]) => {
    let next = latest.current;
    const rest: string[] = [];
    let count = next.length + pendingAdds.length;
    for (const entry of entries) {
      if (!normalize(entry)) continue;
      if (max !== undefined && count >= max) { rest.push(entry); setError(`Limit reached (${max}).`); continue; }
      const { tag, error: problem } = check(entry);
      if (!tag) { if (problem) { rest.push(entry); setError(problem); setAnnouncement(problem); } continue; }
      if (onAdd) { void persistAdd(tag); count++; continue; }
      next = [...next, tag]; latest.current = next; count++;
      stamp(tag); setAnnouncement(`Added ${tag}`);
    }
    if (next !== tags) setTags(next);
    return rest;
  };
  const persistAdd = async (tag: string) => {
    setBusy((b) => [...b, { tag, kind: 'adding' }]); setAnnouncement(`Adding ${tag}`); setFailed(null);
    let result: TagResult;
    try { result = await onAdd!(tag); } catch { result = { ok: false, error: SAVE_ERROR }; }
    if (!mounted.current) return;
    setBusy((b) => b.filter((x) => !(x.kind === 'adding' && x.tag === tag)));
    if (!result || typeof result !== 'object' || (result.ok ? typeof result.value !== 'string' : typeof result.error !== 'string')) result = { ok: false, error: SAVE_ERROR };
    if (!result.ok) {
      // The text comes back to the input for correction.
      setError(result.error); setAnnouncement(result.error); setFailed(tag);
      setText((t) => t ? t : tag); pendingFocus.current = 'input';
      return;
    }
    const canonical = result.value;
    if (!latest.current.some((t) => keyOf(t) === keyOf(canonical))) { latest.current = [...latest.current, canonical]; setTags(latest.current); }
    stamp(canonical); setAnnouncement(`Added ${canonical}`);
  };
  const remove = async (index: number, from: 'tag' | 'input') => {
    const tag = shownTags[index];
    if (tag === undefined || index >= tags.length || busy.some((b) => b.tag === tag)) return;
    setArmed(false); setError(null);
    const after = () => {
      const remaining = latest.current.length - 1;
      pendingFocus.current = from === 'input' || remaining <= 0 ? 'input' : Math.min(index, remaining - 1);
      setFocusTag(typeof pendingFocus.current === 'number' ? pendingFocus.current : 0);
    };
    if (onRemove) {
      setBusy((b) => [...b, { tag, kind: 'removing' }]); setAnnouncement(`Removing ${tag}`);
      let result: any;
      try { result = await onRemove(tag); } catch { result = { ok: false, error: SAVE_ERROR }; }
      if (!mounted.current) return;
      setBusy((b) => b.filter((x) => !(x.kind === 'removing' && x.tag === tag)));
      if (!result || result.ok !== true) { const message = typeof result?.error === 'string' ? result.error : SAVE_ERROR; setError(message); setAnnouncement(message); return; }
    }
    // The plate lifts off, then the gap closes.
    setLeaving(tag);
    setTimeout(() => {
      if (!mounted.current) return;
      setLeaving(null);
      const i = latest.current.findIndex((t) => t === tag);
      if (i < 0) return;
      after();
      latest.current = latest.current.filter((_, j) => j !== i); setTags(latest.current);
      setAnnouncement(`Removed ${tag}`);
    }, 140);
  };
  const commitText = (raw: string) => {
    const rest = add(raw.split(splitter));
    setText(rest.join(', ')); setOpen(false); setActive(-1);
  };
  const choose = (i: number) => {
    const o = shown[i];
    if (!o || o.disabled) return;
    add([o.value]); setText(''); setOpen(false); setActive(-1);
    input.current?.focus({ preventScroll: true });
  };
  const saveEdit = () => {
    if (!editing) return;
    const { tag, error: problem } = check(editing.text, editing.index);
    if (problem) { setEditing({ ...editing, error: problem }); setAnnouncement(problem); return; }
    const old = tags[editing.index];
    if (tag && tag !== old) { latest.current = tags.map((t, i) => i === editing.index ? tag : t); setTags(latest.current); stamp(tag); setAnnouncement(`Changed ${old} to ${tag}`); }
    pendingFocus.current = editing.index; setEditing(null);
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
    const el = e.currentTarget;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!options.length) return;
      e.preventDefault();
      if (!open) { setOpen(true); setActive(shown.length ? 0 : -1); return; }
      const d = e.key === 'ArrowDown' ? 1 : -1;
      setActive((a) => shown.length ? (a + d + shown.length) % shown.length : -1);
    } else if (e.key === 'Enter' && open && active >= 0 && shown[active]) {
      e.preventDefault(); choose(active);
    } else if (separators.includes(e.key) && !(e.key === 'Enter' && !text.trim())) {
      e.preventDefault(); commitText(text);
    } else if (e.key === 'Escape') {
      if (open) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
      else if (armed) { e.preventDefault(); setArmed(false); setAnnouncement(''); }
    } else if (e.key === 'Backspace' && el.selectionStart === 0 && el.selectionEnd === 0 && tags.length) {
      e.preventDefault();
      if (armed) remove(tags.length - 1, 'input');
      else { setArmed(true); setAnnouncement(`Press Backspace again to remove ${tags[tags.length - 1]}`); }
    } else if (e.key === 'ArrowLeft' && el.selectionStart === 0 && el.selectionEnd === 0 && tags.length) {
      e.preventDefault(); setArmed(false); setFocusTag(tags.length - 1); tagRefs.current[tags.length - 1]?.focus();
    } else if (e.key === 'Tab' && open) setOpen(false);
  };
  const onTagKey = (index: number) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.nativeEvent.isComposing) return;
    const last = tags.length - 1;
    const move = (to: number) => { e.preventDefault(); if (to > last) { input.current?.focus(); return; } const i = Math.max(0, to); setFocusTag(i); tagRefs.current[i]?.focus(); };
    if (e.key === 'ArrowRight') move(index + 1);
    else if (e.key === 'ArrowLeft') move(index - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(last);
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); if (!disabled) remove(index, 'tag'); }
    else if ((e.key === 'Enter' || e.key === 'F2') && !onAdd && !onRemove && !disabled) { e.preventDefault(); setEditing({ index, text: tags[index] }); }
  };
  const onEditKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
    if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); pendingFocus.current = editing!.index; setEditing(null); }
  };

  const hint = full ? `Limit reached (${max}).` : `Press ${separators.map((s) => s === 'Enter' ? 'Enter' : s === ',' ? 'comma' : s).join(' or ')} to add.`;
  const describedBy = [aria['aria-describedby'], hintId, error ? errorId : undefined].filter(Boolean).join(' ');
  const editable = !onAdd && !onRemove && !disabled;
  const roving = Math.min(focusTag, Math.max(0, tags.length - 1));
  return (
    <div ref={root} className={cx('alt-tag-input', className)} data-open={open ? '' : undefined}>
      <div ref={field} className="alt-input" data-size={size} data-approach="56" data-filled={shownTags.length ? '' : undefined}
        data-invalid={invalid || error ? '' : undefined} data-disabled={disabled ? '' : undefined} onMouseDown={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); input.current?.focus(); } }}>
        {shownTags.length > 0 && <ul className="alt-tag-list" aria-label={word(tags.length)}>
          {shownTags.map((tag, i) => {
            const pending = busy.find((b) => b.tag === tag);
            if (editing?.index === i) return <li key={tag} className="alt-tag-edit">
              <input ref={editRef} className="alt-tag-edit-input" aria-label={`Edit ${tag}`} value={editing.text} aria-invalid={editing.error ? true : undefined}
                size={Math.max(4, editing.text.length + 1)} onChange={(e) => setEditing({ ...editing, text: e.target.value, error: undefined })} onKeyDown={onEditKey}
                onBlur={() => setEditing(null)} />
            </li>;
            return <li key={tag} className="alt-tag" data-stamp={stamped.includes(tag) ? '' : undefined} data-armed={armed && i === tags.length - 1 ? '' : undefined}
              data-status={pending ? 'pending' : failed === tag ? 'failed' : undefined} data-leaving={leaving === tag ? '' : undefined} aria-busy={pending ? true : undefined}>
              <button ref={(el) => { tagRefs.current[i] = el; }} type="button" className="alt-tag-face" tabIndex={i === roving && !pending ? 0 : -1} disabled={disabled}
                aria-describedby={i < tags.length ? auto + '-taghint' : undefined} onKeyDown={i < tags.length ? onTagKey(i) : undefined}
                onFocus={() => { setFocusTag(i); setArmed(false); }} onDoubleClick={() => { if (editable && i < tags.length) setEditing({ index: i, text: tag }); }}>
                {renderTag ? renderTag(tag) : tag}
              </button>
              {i < tags.length && !disabled && <button type="button" className="alt-tag-remove" tabIndex={-1} aria-label={`Remove ${tag}`}
                onMouseDown={(e) => e.preventDefault()} onClick={() => remove(i, 'tag')}><Icons.X size={12} /></button>}
            </li>;
          })}
        </ul>}
        <input ref={input} id={inputId} type="text" role="combobox" autoComplete="off" spellCheck={false} disabled={disabled} readOnly={full}
          aria-autocomplete={options.length ? 'list' : 'none'} aria-expanded={options.length ? open : undefined} aria-controls={listMounted ? listId : undefined}
          aria-activedescendant={open && active >= 0 && shown[active] ? `${listId}-${active}` : undefined}
          aria-invalid={invalid || error ? true : undefined} aria-required={required || undefined} aria-label={aria['aria-label']} aria-labelledby={aria['aria-labelledby']}
          aria-describedby={describedBy} placeholder={shownTags.length ? undefined : placeholder ?? ' '} value={text}
          onKeyDown={onInputKey}
          onChange={(e) => {
            const next = e.target.value;
            setArmed(false); setError(null); setFailed(null);
            // A separator typed on a soft keyboard arrives as text, not a key.
            if (!(e.nativeEvent as InputEvent).isComposing && sepChars.some((c) => next.includes(c))) { commitText(next); return; }
            setText(next); if (options.length) { setOpen(true); setActive(0); }
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text');
            if (!splitter.test(pasted)) return;
            e.preventDefault(); commitText(text + pasted);
          }}
          onBlur={(e) => { if (!root.current?.contains(e.relatedTarget as Node)) { setOpen(false); setArmed(false); } }} />
      </div>
      {name && tags.map((tag) => <input key={tag} type="hidden" name={name} value={tag} />)}
      <span id={hintId} className="alt-tag-hint">{word(tags.length)}.{disabled ? '' : ' ' + hint}</span>
      <span id={auto + '-taghint'} hidden>{editable ? 'Delete to remove, Enter to edit.' : 'Delete to remove.'}</span>
      {error && <p id={errorId} className="alt-field-error alt-tag-error"><Icons.AlertCircle size={14} />{error}</p>}
      <span className="alt-tag-status" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
      {listMounted && options.length > 0 && (
        <OptionList id={listId} options={shown} active={Math.min(active, shown.length - 1)} value="" state={state} side={side} listRef={list} labelledBy={labelId}
          label={aria['aria-label']} focusable={false} query={q} empty={restrict ? 'No matches' : `Press Enter to add “${q}”`} onActive={setActive} onChoose={choose} />
      )}
    </div>
  );
}

export interface TagProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  children: React.ReactNode;
  /** Adds a ghost remove button named “Remove <label>”. */
  onRemove?: () => void;
  /** Names the remove button when the children aren't plain text. */
  label?: string;
}
/** A tag on its own: the TagInput's plate, stamped flush into the page, for showing a set outside a field. */
export function Tag({ children, onRemove, label, className, ...rest }: TagProps) {
  const text = label ?? (typeof children === 'string' ? children : undefined);
  return <span className={cx('alt-tag alt-tag-standalone', className)} {...rest}>
    <span className="alt-tag-face">{children}</span>
    {onRemove && <button type="button" className="alt-tag-remove" aria-label={text ? `Remove ${text}` : 'Remove'} onClick={onRemove}><Icons.X size={12} /></button>}
  </span>;
}
