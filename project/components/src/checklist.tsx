import * as React from 'react';
import { cx, Icons } from './core';
import { Button, Checkbox } from './controls';

export interface ChecklistPlace { parentId: string | null; index: number }
/** One change per action. The application applies it to `items` (synchronously, or before resolving). */
export type ChecklistOp =
  | { type: 'add'; id: string; text: string; done: boolean; parentId: string | null; index: number }
  | { type: 'edit'; id: string; text: string; previous: string }
  | { type: 'toggle'; id: string; done: boolean }
  | { type: 'remove'; id: string; text: string; done: boolean; parentId: string | null; index: number }
  | { type: 'move' | 'indent' | 'outdent'; id: string; parentId: string | null; index: number; from: ChecklistPlace };
export type ChecklistResult = { ok: true } | { ok: false; error: string };
export interface ChecklistProps<T> {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  items: T[];
  getKey: (item: T) => string;
  getText: (item: T) => string;
  isDone: (item: T) => boolean;
  getChildren?: (item: T) => T[] | undefined;
  /** Allow Tab and Shift+Tab to nest items. Default false: a flat list. */
  nested?: boolean;
  /** Show done items after the rest in each list. Default false. */
  sortDone?: boolean;
  /** Each action, as one op. Return a failure to mark the item and offer Retry. */
  onChange: (op: ChecklistOp) => ChecklistResult | void | Promise<ChecklistResult | void>;
  /** Ctrl/Cmd+Z, and the Undo after a removal: reverse the last structural op (add, remove, move, indent, outdent). */
  onUndo?: (op: ChecklistOp) => void;
  /** Ids for new items. Default: a random id. */
  createId?: () => string;
  /** The last, empty line's placeholder. Default “Add an item”. */
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

type Row<T> = { item: T; key: string; text: string; done: boolean; level: number; parentKey: string | null; index: number; siblings: T[]; children: T[] };
const SAVE_ERROR = 'Couldn’t save.';
const STRUCTURAL = new Set(['add', 'remove', 'move', 'indent', 'outdent']);
let seq = 0;
const randomId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `item-${Date.now().toString(36)}-${++seq}`);

/**
 * A list you write into, one line per item. Each line is the editor (no Save, no read mode): it commits when you
 * leave it. Items lie flush; the empty line at the end is an opening; the checkbox is a choice built like the Switch,
 * and a done item is pressed into the record: muted and struck through, kept in place.
 */
export function Checklist<T>({ items, getKey, getText, isDone, getChildren = () => undefined, nested = false, sortDone = false, onChange, onUndo,
  createId = randomId, placeholder = 'Add an item', disabled = false, className, ...aria }: ChecklistProps<T>) {
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [newText, setNewText] = React.useState('');
  const [pending, setPending] = React.useState<string[]>([]);
  const [failed, setFailed] = React.useState<Record<string, { op: ChecklistOp; error: string }>>({});
  const [removed, setRemoved] = React.useState<{ op: ChecklistOp; text: string } | null>(null);
  const [announcement, setAnnouncement] = React.useState('');
  const [arrived, setArrived] = React.useState<string | null>(null);
  const inputs = React.useRef(new Map<string, HTMLInputElement>());
  const lines = React.useRef(new Map<string, HTMLLIElement>());
  const newLine = React.useRef<HTMLInputElement>(null);
  const focusNext = React.useRef<{ key: string | '__new'; caret: number | 'end' } | null>(null);
  const lastStructural = React.useRef<ChecklistOp | null>(null);
  const mounted = React.useRef(true);
  const auto = React.useId();
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const order = (list: T[]) => (sortDone ? [...list.filter((x) => !isDone(x)), ...list.filter((x) => isDone(x))] : list);
  const rows: Row<T>[] = [];
  const walk = (list: T[], level: number, parentKey: string | null) => list.forEach((item) => {
    const kids = getChildren(item) ?? [];
    rows.push({ item, key: getKey(item), text: getText(item), done: isDone(item), level, parentKey, index: list.indexOf(item), siblings: list, children: kids });
    walk(order(kids), level + 1, getKey(item));
  });
  walk(order(items), 1, null);
  // Indexes are positions in the application's lists, not the display order.
  const placeOf = (key: string): ChecklistPlace & { siblings: T[] } => {
    const find = (list: T[], parentId: string | null): (ChecklistPlace & { siblings: T[] }) | null => {
      for (const [index, item] of list.entries()) {
        if (getKey(item) === key) return { parentId, index, siblings: list };
        const hit = find(getChildren(item) ?? [], getKey(item));
        if (hit) return hit;
      }
      return null;
    };
    return find(items, null)!;
  };

  React.useLayoutEffect(() => {
    const want = focusNext.current;
    if (!want) return;
    const el = want.key === '__new' ? newLine.current : inputs.current.get(want.key);
    if (!el) return;
    focusNext.current = null;
    el.focus();
    const at = want.caret === 'end' ? el.value.length : Math.min(want.caret, el.value.length);
    el.setSelectionRange(at, at);
  });

  const send = async (op: ChecklistOp, quiet = false) => {
    if (STRUCTURAL.has(op.type)) lastStructural.current = op;
    setFailed((f) => { const { [op.id]: _, ...rest } = f; return rest; });
    let result: ChecklistResult | void;
    const slow = window.setTimeout(() => mounted.current && setPending((p) => [...p, op.id]), 0);
    try { result = await onChange(op); } catch { result = { ok: false, error: SAVE_ERROR }; }
    window.clearTimeout(slow);
    if (!mounted.current) return false;
    setPending((p) => p.filter((k) => k !== op.id));
    if (result && result.ok === false) {
      const error = typeof result.error === 'string' && result.error ? result.error : SAVE_ERROR;
      setFailed((f) => ({ ...f, [op.id]: { op, error } })); setAnnouncement(error);
      return false;
    }
    if (!quiet) setAnnouncement('');
    return true;
  };
  /** Commits a line's draft, if it changed. */
  const commit = (row: Row<T>) => {
    const draft = drafts[row.key];
    if (draft === undefined) return;
    setDrafts((d) => { const { [row.key]: _, ...rest } = d; return rest; });
    if (draft !== row.text) void send({ type: 'edit', id: row.key, text: draft, previous: row.text });
  };
  const textOf = (row: Row<T>) => drafts[row.key] ?? row.text;
  const add = (text: string, place: ChecklistPlace, done = false, focus: 'new' | 'item' | 'none' = 'item', caret: number | 'end' = 0) => {
    const id = createId();
    if (focus === 'item') focusNext.current = { key: id, caret };
    if (focus === 'new') focusNext.current = { key: '__new', caret: 'end' };
    setArrived(id);
    void send({ type: 'add', id, text, done, ...place });
    return id;
  };
  const remove = (row: Row<T>, focusTo: string | '__new' | null, caret: number | 'end' = 'end') => {
    const place = placeOf(row.key);
    if (focusTo) focusNext.current = { key: focusTo, caret };
    setDrafts((d) => { const { [row.key]: _, ...rest } = d; return rest; });
    const op: ChecklistOp = { type: 'remove', id: row.key, text: row.text, done: row.done, parentId: place.parentId, index: place.index };
    setRemoved(onUndo ? { op, text: row.text || 'Empty item' } : null);
    setAnnouncement(onUndo ? `${row.text || 'Empty item'} removed. Undo is available.` : `${row.text || 'Empty item'} removed.`);
    void send(op, true);
  };
  const move = (row: Row<T>, type: 'move' | 'indent' | 'outdent', to: ChecklistPlace, message: string) => {
    commit(row);
    const from = placeOf(row.key);
    focusNext.current = { key: row.key, caret: inputs.current.get(row.key)?.selectionStart ?? 'end' };
    void send({ type, id: row.key, ...to, from: { parentId: from.parentId, index: from.index } }, true);
    setAnnouncement(message);
  };
  const undo = () => {
    const op = lastStructural.current;
    if (!op || !onUndo) return false;
    lastStructural.current = null; setRemoved(null);
    onUndo(op);
    if (op.type === 'remove') focusNext.current = { key: op.id, caret: 'end' };
    setAnnouncement('Undone.');
    return true;
  };

  /** Paste: one item per line; GitHub task-list markers and (when nested) two-space or tab indentation are read. */
  const paste = (text: string, at: ChecklistPlace) => {
    const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim());
    if (lines.length < 2) return false;
    const parents: (string | null)[] = [at.parentId];
    const indexAt: number[] = [at.index];
    let base = -1;
    for (const line of lines) {
      const indent = line.match(/^[\t ]*/)![0].replace(/\t/g, '  ').length;
      if (base < 0) base = indent;
      const depth = nested ? Math.max(0, Math.min(Math.floor((indent - base) / 2), parents.length - 1)) : 0;
      const m = line.trim().match(/^(?:[-*+]\s+)?(?:\[( |x|X)\]\s+)?(.*)$/)!;
      parents.length = depth + 1; indexAt.length = depth + 1;
      const id = add(m[2], { parentId: parents[depth], index: indexAt[depth] ?? 0 }, m[1] === 'x' || m[1] === 'X', 'none');
      indexAt[depth] = (indexAt[depth] ?? 0) + 1;
      parents[depth + 1] = id; indexAt[depth + 1] = 0;
    }
    focusNext.current = { key: '__new', caret: 'end' };
    setAnnouncement(`Added ${lines.length} items.`);
    return true;
  };

  const onKey = (row: Row<T>, i: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
    const el = e.currentTarget, text = textOf(row);
    const caret = el.selectionStart ?? 0, atStart = caret === 0 && el.selectionEnd === 0;
    const mod = e.ctrlKey || e.metaKey;
    const place = placeOf(row.key);
    if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey && onUndo) { if (undo()) e.preventDefault(); return; }
    if (e.key === 'Enter' && mod) { e.preventDefault(); void send({ type: 'toggle', id: row.key, done: !row.done }); setAnnouncement(`${text} ${row.done ? 'not done' : 'done'}`); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      // Split at the caret: the text after it becomes the next item.
      const before = text.slice(0, caret), after = text.slice(el.selectionEnd ?? caret);
      setDrafts((d) => ({ ...d, [row.key]: before })); commitText(row, before);
      const into = row.children.length && nested ? { parentId: row.key, index: 0 } : { parentId: place.parentId, index: place.index + 1 };
      add(after, into);
      return;
    }
    if (e.key === 'Backspace' && atStart) {
      const prev = rows[i - 1];
      if (!text) { e.preventDefault(); remove(row, prev ? prev.key : '__new'); return; }
      if (prev && !row.children.length) {
        // Merge into the previous line, caret at the join.
        e.preventDefault();
        const joined = textOf(prev) + text;
        focusNext.current = { key: prev.key, caret: textOf(prev).length };
        commitText(prev, joined);
        remove(row, prev.key, textOf(prev).length);
      }
      return;
    }
    if (e.key === 'Tab' && nested && !e.altKey && !mod) {
      if (!e.shiftKey) {
        const above = place.index > 0 ? place.siblings[place.index - 1] : null;
        if (!above) return;
        e.preventDefault();
        move(row, 'indent', { parentId: getKey(above), index: (getChildren(above) ?? []).length }, `Indented under ${getText(above) || 'the item above'}`);
      } else {
        if (place.parentId === null) return;
        e.preventDefault();
        const parent = placeOf(place.parentId);
        move(row, 'outdent', { parentId: parent.parentId, index: parent.index + 1 }, `Outdented after ${getText(parent.siblings[parent.index]) || 'its parent'}`);
      }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); commit(row); el.blur(); lines.current.get(row.key)?.focus(); return; }
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.altKey) {
      e.preventDefault();
      const to = place.index + (e.key === 'ArrowUp' ? -1 : 1);
      if (to < 0 || to >= place.siblings.length) return;
      move(row, 'move', { parentId: place.parentId, index: to }, `Moved to position ${to + 1} of ${place.siblings.length}`);
      return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const target = e.key === 'ArrowUp' ? rows[i - 1]?.key : rows[i + 1]?.key ?? '__new';
      if (!target) return;
      e.preventDefault(); commit(row);
      focusNext.current = { key: target, caret }; setDrafts((d) => ({ ...d }));
    }
  };
  // Commit a known text for a line now (used by split and merge, which change it and leave it in one step).
  const commitText = (row: Row<T>, text: string) => {
    setDrafts((d) => { const { [row.key]: _, ...rest } = d; return rest; });
    if (text !== row.text) void send({ type: 'edit', id: row.key, text, previous: row.text }, true);
  };
  const onNewKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey && onUndo) { if (undo()) e.preventDefault(); return; }
    if (e.key === 'Enter' && newText.trim()) { e.preventDefault(); add(newText, { parentId: null, index: items.length }, false, 'new'); setNewText(''); setAnnouncement(`Added ${newText}`); return; }
    if (e.key === 'ArrowUp' && rows.length) { e.preventDefault(); focusNext.current = { key: rows[rows.length - 1].key, caret: 'end' }; setDrafts((d) => ({ ...d })); return; }
    if (e.key === 'Backspace' && !newText && rows.length) { e.preventDefault(); focusNext.current = { key: rows[rows.length - 1].key, caret: 'end' }; setDrafts((d) => ({ ...d })); }
  };

  // Group rows back into nested lists for rendering.
  const render = (parentKey: string | null): React.ReactNode[] => rows.filter((r) => r.parentKey === parentKey).map((row) => {
    const i = rows.indexOf(row);
    const fail = failed[row.key];
    const kids = rows.some((r) => r.parentKey === row.key);
    return <li key={row.key} ref={(el) => { if (el) lines.current.set(row.key, el); else lines.current.delete(row.key); }} tabIndex={-1}
      className="alt-checklist-item" data-done={row.done ? '' : undefined} data-status={pending.includes(row.key) ? 'pending' : fail ? 'failed' : undefined}
      data-arrived={arrived === row.key ? '' : undefined} aria-busy={pending.includes(row.key) || undefined}>
      <div className="alt-checklist-line">
        <Checkbox checked={row.done} disabled={disabled} aria-label={row.text || 'Empty item'} aria-describedby={auto + '-keys'}
          onCheckedChange={(done) => { commit(row); void send({ type: 'toggle', id: row.key, done }); }} />
        <input ref={(el) => { if (el) inputs.current.set(row.key, el); else inputs.current.delete(row.key); }} className="alt-checklist-text" type="text"
          value={textOf(row)} disabled={disabled} aria-label={row.done ? `${textOf(row) || 'Empty item'}, done` : textOf(row) || 'Empty item'} aria-describedby={auto + '-keys'}
          spellCheck onChange={(e) => setDrafts((d) => ({ ...d, [row.key]: e.target.value }))} onBlur={() => commit(row)} onKeyDown={onKey(row, i)}
          onPaste={(e) => { const at = placeOf(row.key); if (paste(e.clipboardData.getData('text'), { parentId: at.parentId, index: at.index + 1 })) e.preventDefault(); }} />
        {fail && <span className="alt-checklist-failed"><Icons.AlertCircle size={14} /><span>{fail.error}</span>
          <Button size="sm" variant="ghost" onClick={() => { void send(fail.op); }}>Retry</Button></span>}
      </div>
      {kids && <ul className="alt-checklist-list" role="list">{render(row.key)}</ul>}
    </li>;
  });

  return <div className={cx('alt-checklist', className)} data-nested={nested ? '' : undefined}>
    <ul className="alt-checklist-list" role="list" aria-label={aria['aria-label']} aria-labelledby={aria['aria-labelledby']} aria-describedby={auto + '-keys'}>
      {render(null)}
      <li className="alt-checklist-item alt-checklist-new">
        <div className="alt-checklist-line">
          <span className="alt-checklist-plus" aria-hidden="true">+</span>
          <input ref={newLine} className="alt-checklist-text" type="text" value={newText} placeholder={placeholder} aria-label={placeholder} disabled={disabled}
            aria-describedby={auto + '-keys'} onChange={(e) => setNewText(e.target.value)} onKeyDown={onNewKey}
            onBlur={() => { if (newText.trim()) { add(newText, { parentId: null, index: items.length }, false, 'none'); setNewText(''); } }}
            onPaste={(e) => { if (paste(e.clipboardData.getData('text'), { parentId: null, index: items.length })) e.preventDefault(); }} />
        </div>
      </li>
    </ul>
    <span id={auto + '-keys'} hidden>
      Enter adds an item, Backspace on an empty item removes it, Ctrl+Enter checks it, Alt+arrows move it{nested ? ', Tab and Shift+Tab indent and outdent, Escape then Tab leaves the list' : ''}.
    </span>
    {removed && <div className="alt-checklist-undo"><span>“{removed.text}” removed.</span>
      <Button size="sm" variant="ghost" onClick={() => { lastStructural.current = removed.op; undo(); }}>Undo</Button>
      <Button size="sm" variant="ghost" aria-label="Dismiss" onClick={() => setRemoved(null)}><Icons.X size={14} /></Button></div>}
    <span className="alt-checklist-status" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
  </div>;
}
