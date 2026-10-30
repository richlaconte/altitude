import * as React from 'react';
import { cx, Icons } from './core';
import { Table } from './collections';

export type DataGridResult = { ok: true } | { ok: false; error: string };
export interface DataGridChange<T> { rowId: string; key: string; draft: unknown; previousValue: unknown; row: T }
/** What a column's custom editor receives. Spread it onto a Select or Combobox. */
export interface DataGridEditorControl {
  value: any;
  onValueChange: (value: any) => void;
  id: string;
  'aria-label': string;
  invalid: boolean;
  autoFocus: true;
}
export interface DataGridColumn<T> {
  key: string;
  header: React.ReactNode;
  /** The header as words, for cell names. Default: the header when it's a string, else the key. */
  label?: string;
  align?: 'start' | 'end';
  editable?: boolean;
  /** Text typed into the cell → the value. Default: the text. */
  parse?: (text: string) => unknown;
  /** The value → text in the editing field and in copies. Default: String(value ?? ''). */
  format?: (value: unknown) => string;
  /** Return an error to refuse a value. */
  validate?: (value: any, row: T) => string | undefined;
  /** Draw the cell at rest. Default: format(value). */
  cell?: (row: T) => React.ReactNode;
  /** A custom editor (a Select): it commits as soon as a value is chosen. */
  editor?: (control: DataGridEditorControl) => React.ReactNode;
  width?: number | string;
}
export interface DataGridProps<T> {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  rows: T[];
  columns: DataGridColumn<T>[];
  getRowId: (row: T) => string;
  /** Names a row in each cell's name (“Price, Desk lamp”). */
  getRowLabel: (row: T) => string;
  /** One cell. Resolve after `rows` carries the canonical value. */
  onCellSave: (change: DataGridChange<T>) => DataGridResult | Promise<DataGridResult>;
  /** A paste or a cleared range, as one batch. Default: each cell through onCellSave. */
  onCellsSave?: (changes: DataGridChange<T>[]) => DataGridResult | Promise<DataGridResult>;
  /** Ctrl/Cmd+Z: reverse the last committed change (or batch). Omit and Ctrl+Z does nothing. */
  onUndo?: (last: DataGridChange<T>[]) => void;
  /** Check every cell against its column's `validate` at rest, not only while it's edited: an invalid value lies in a
   * trench on critical-soft, with its problem in the cell's description. For data that arrived from elsewhere (an import). */
  showInvalid?: boolean;
  maxHeight?: number | string;
  className?: string;
}

type Pos = { r: number; c: number };
type Editing = { r: number; c: number; draft: string | unknown; custom: boolean; error?: string; unsaved?: boolean };
const SAVE_ERROR = 'That change couldn’t be saved.';
const printable = (e: React.KeyboardEvent) => e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;

/**
 * A table you edit cell by cell, with spreadsheet keys. Cells are the record, flush in their rows. The cell being
 * edited opens into a well clipped to the cell; an invalid value deepens to a trench; when a value lands the floor
 * rises flush and the cell settles. A pending cell holds a small raised plate; a failed one drops to a trench. Range
 * selection is a tint, not a height: choosing a target isn't live content.
 */
export function DataGrid<T>({ rows, columns, getRowId, getRowLabel, onCellSave, onCellsSave, onUndo, showInvalid, maxHeight, className, ...aria }: DataGridProps<T>) {
  const [active, setActive] = React.useState<Pos>({ r: 0, c: 0 });
  const [anchor, setAnchor] = React.useState<Pos | null>(null);
  const [editing, setEditing] = React.useState<Editing | null>(null);
  const [pending, setPending] = React.useState<string[]>([]);
  const [failed, setFailed] = React.useState<Record<string, { error: string; draft: unknown }>>({});
  const [settled, setSettled] = React.useState<string[]>([]);
  const [announcement, setAnnouncement] = React.useState('');
  const grid = React.useRef<HTMLTableElement>(null);
  const field = React.useRef<HTMLInputElement>(null);
  const history = React.useRef<DataGridChange<T>[][]>([]);
  const mounted = React.useRef(true);
  const wantFocus = React.useRef<'cell' | 'field' | null>(null);
  const caretEnd = React.useRef(true);
  const auto = React.useId();
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const label = (col: DataGridColumn<T>) => col.label ?? (typeof col.header === 'string' ? col.header : col.key);
  const fmt = (col: DataGridColumn<T>, v: unknown) => (col.format ? col.format(v) : v === undefined || v === null ? '' : String(v));
  const valueOf = (r: number, c: number) => (rows[r] as any)[columns[c].key];
  const cellKey = (r: number, c: number) => `${getRowId(rows[r])}:${columns[c].key}`;
  const R = rows.length, C = columns.length;
  const clamp = (p: Pos): Pos => ({ r: Math.max(0, Math.min(R - 1, p.r)), c: Math.max(0, Math.min(C - 1, p.c)) });
  const range = anchor ? { r0: Math.min(anchor.r, active.r), r1: Math.max(anchor.r, active.r), c0: Math.min(anchor.c, active.c), c1: Math.max(anchor.c, active.c) } : null;
  const inRange = (r: number, c: number) => !!range && r >= range.r0 && r <= range.r1 && c >= range.c0 && c <= range.c1;

  React.useLayoutEffect(() => {
    const want = wantFocus.current;
    if (!want) return;
    wantFocus.current = null;
    if (want === 'field') {
      const el = field.current ?? grid.current?.querySelector<HTMLElement>('[data-editing] input, [data-editing] button, [data-editing] [tabindex="0"]');
      el?.focus();
      if (el instanceof HTMLInputElement) { const n = caretEnd.current ? el.value.length : 0; el.setSelectionRange(n, el.value.length > 0 && !caretEnd.current ? el.value.length : n); }
    } else grid.current?.querySelector<HTMLElement>(`[data-cell="${active.r}:${active.c}"]`)?.focus();
  });
  const go = (p: Pos, extend = false) => { const next = clamp(p); if (extend) setAnchor((a) => a ?? active); else setAnchor(null); setActive(next); wantFocus.current = 'cell'; };

  const save = async (changes: DataGridChange<T>[]) => {
    if (!changes.length) return true;
    const keys = changes.map((x) => `${x.rowId}:${x.key}`);
    setPending((p) => [...p, ...keys]);
    setFailed((f) => { const n = { ...f }; keys.forEach((k) => delete n[k]); return n; });
    let result: DataGridResult;
    try {
      if (changes.length > 1 && onCellsSave) result = await onCellsSave(changes);
      else {
        result = { ok: true };
        for (const x of changes) { const r = await onCellSave(x); if (!r || r.ok !== true) { result = r && typeof (r as any).error === 'string' ? r : { ok: false, error: SAVE_ERROR }; (result as any).at = x; break; } }
      }
    } catch { result = { ok: false, error: SAVE_ERROR }; }
    if (!mounted.current) return false;
    setPending((p) => p.filter((k) => !keys.includes(k)));
    if (!result || result.ok !== true) {
      const error = result && typeof (result as any).error === 'string' ? (result as any).error : SAVE_ERROR;
      const bad = (result as any)?.at ? [(result as any).at as DataGridChange<T>] : changes;
      setFailed((f) => ({ ...f, ...Object.fromEntries(bad.map((x) => [`${x.rowId}:${x.key}`, { error, draft: x.draft }])) }));
      setAnnouncement(`${bad.length === 1 ? '1 cell' : `${bad.length} cells`} couldn’t be saved: ${error}`);
      return false;
    }
    history.current.push(changes);
    setSettled(keys); setTimeout(() => mounted.current && setSettled((s) => s.filter((k) => !keys.includes(k))), 1200);
    setAnnouncement(changes.length === 1 ? 'Saved' : `${changes.length} cells saved`);
    return true;
  };
  const changeFor = (r: number, c: number, draft: unknown): DataGridChange<T> => ({ rowId: getRowId(rows[r]), key: columns[c].key, draft, previousValue: valueOf(r, c), row: rows[r] });

  const begin = (r: number, c: number, replace?: string) => {
    const col = columns[c];
    if (!col.editable) { setAnnouncement(`${label(col)} can’t be edited.`); return; }
    const prior = failed[cellKey(r, c)];
    const custom = !!col.editor;
    caretEnd.current = true;
    setEditing({ r, c, custom, draft: custom ? (prior?.draft ?? valueOf(r, c)) : replace ?? (prior ? fmt(col, prior.draft) : fmt(col, valueOf(r, c))) });
    setAnchor(null); setActive({ r, c }); wantFocus.current = 'field';
  };
  /** Validates and saves the open cell; returns false (and stays open) when it's refused. */
  const commit = (then?: Pos): boolean => {
    if (!editing) return true;
    const { r, c } = editing;
    const col = columns[c];
    const value = editing.custom ? editing.draft : (col.parse ? col.parse(String(editing.draft)) : editing.draft);
    const problem = col.validate?.(value, rows[r]);
    if (problem) { setEditing({ ...editing, error: problem }); setAnnouncement(problem); wantFocus.current = 'field'; return false; }
    setEditing(null);
    if (then) { setActive(clamp(then)); } wantFocus.current = 'cell';
    if (fmt(col, value) !== fmt(col, valueOf(r, c))) void save([changeFor(r, c, value)]);
    return true;
  };
  const cancel = () => { setEditing(null); wantFocus.current = 'cell'; };

  const onGridKey = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
    const mod = e.ctrlKey || e.metaKey;
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const right = rtl ? 'ArrowLeft' : 'ArrowRight', left = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (editing) {
      if (e.target instanceof HTMLElement && e.target.getAttribute('aria-expanded') === 'true') return; // an open popup's own keys
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); setAnnouncement('Edit discarded'); }
      else if (e.key === 'Enter' && !e.defaultPrevented && !editing.custom) { e.preventDefault(); commit({ r: editing.r + (e.shiftKey ? -1 : 1), c: editing.c }); }
      else if (e.key === 'Tab') { e.preventDefault(); commit({ r: editing.r, c: editing.c + (e.shiftKey ? -1 : 1) }); }
      return;
    }
    const { r, c } = active;
    const page = 10;
    if (mod && e.key.toLowerCase() === 'z') { if (onUndo && history.current.length) { e.preventDefault(); const last = history.current.pop()!; onUndo(last); setAnnouncement(last.length === 1 ? 'Undone' : `${last.length} cells undone`); } return; }
    const moves: Record<string, () => Pos> = {
      ArrowUp: () => ({ r: r - 1, c }), ArrowDown: () => ({ r: r + 1, c }), [left]: () => ({ r, c: c - 1 }), [right]: () => ({ r, c: c + 1 }),
      Home: () => (mod ? { r: 0, c: 0 } : { r, c: 0 }), End: () => (mod ? { r: R - 1, c: C - 1 } : { r, c: C - 1 }),
      PageUp: () => ({ r: r - page, c }), PageDown: () => ({ r: r + page, c }),
    };
    if (moves[e.key]) { e.preventDefault(); go(moves[e.key](), e.shiftKey && e.key.startsWith('Arrow')); return; }
    if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); begin(r, c); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const cells = range ? cellsIn(range) : [{ r, c }];
      const changes = cells.filter((p) => columns[p.c].editable && !columns[p.c].editor && fmt(columns[p.c], valueOf(p.r, p.c)) !== '')
        .map((p) => ({ p, v: columns[p.c].parse ? columns[p.c].parse!('') : '' }))
        .filter(({ p, v }) => !columns[p.c].validate?.(v, rows[p.r]));
      const refused = cells.filter((p) => columns[p.c].editable && !changes.some((x) => x.p === p) && fmt(columns[p.c], valueOf(p.r, p.c)) !== '' && !columns[p.c].editor);
      if (refused.length) setAnnouncement(`${refused.length === 1 ? '1 cell' : `${refused.length} cells`} can’t be empty.`);
      void save(changes.map(({ p, v }) => changeFor(p.r, p.c, v)));
      return;
    }
    if (e.key === 'Escape' && anchor) { e.preventDefault(); setAnchor(null); return; }
    if (printable(e) && columns[c].editable && !columns[c].editor) { e.preventDefault(); begin(r, c, e.key); }
  };
  const cellsIn = (g: { r0: number; r1: number; c0: number; c1: number }) => {
    const out: Pos[] = [];
    for (let r = g.r0; r <= g.r1; r++) for (let c = g.c0; c <= g.c1; c++) out.push({ r, c });
    return out;
  };
  // Copy the range (or the active cell) as tab-separated text; paste a block from the active cell.
  const onCopy = (e: React.ClipboardEvent) => {
    if (editing) return;
    const g = range ?? { r0: active.r, r1: active.r, c0: active.c, c1: active.c };
    const text = Array.from({ length: g.r1 - g.r0 + 1 }, (_, i) => Array.from({ length: g.c1 - g.c0 + 1 }, (_, j) => fmt(columns[g.c0 + j], valueOf(g.r0 + i, g.c0 + j))).join('\t')).join('\n');
    e.preventDefault(); e.clipboardData.setData('text/plain', text);
    setAnnouncement(`Copied ${(g.r1 - g.r0 + 1) * (g.c1 - g.c0 + 1)} cells`);
  };
  const onPaste = (e: React.ClipboardEvent) => {
    if (editing) return;
    e.preventDefault();
    const lines = e.clipboardData.getData('text/plain').replace(/\r/g, '').replace(/\n$/, '').split('\n').map((l) => l.split('\t'));
    const changes: DataGridChange<T>[] = [];
    const refused: string[] = [];
    lines.forEach((cells, i) => cells.forEach((text, j) => {
      const r = active.r + i, c = active.c + j;
      if (r >= R || c >= C) return;
      const col = columns[c];
      if (!col.editable || col.editor) { refused.push(`${label(col)} can’t be pasted into`); return; }
      const v = col.parse ? col.parse(text) : text;
      const problem = col.validate?.(v, rows[r]);
      if (problem) { refused.push(`${label(col)}, ${getRowLabel(rows[r])}: ${problem}`); setFailed((f) => ({ ...f, [cellKey(r, c)]: { error: problem, draft: v } })); return; }
      if (fmt(col, v) !== fmt(col, valueOf(r, c))) changes.push(changeFor(r, c, v));
    }));
    setAnchor({ r: active.r, c: active.c }); setActive(clamp({ r: active.r + lines.length - 1, c: active.c + Math.max(...lines.map((l) => l.length)) - 1 }));
    void save(changes).then(() => { if (refused.length && mounted.current) setAnnouncement(`${changes.length} cells saved. ${refused.length === 1 ? '1 cell' : `${refused.length} cells`} couldn’t be saved: ${refused[0]}`); });
  };

  const rangeText = range && (range.r1 > range.r0 || range.c1 > range.c0) ? `${range.r1 - range.r0 + 1} by ${range.c1 - range.c0 + 1} cells selected` : '';
  return <div className={cx('alt-data-grid', className)}>
    <Table ref={grid} role="grid" maxHeight={maxHeight} aria-label={aria['aria-label']} aria-labelledby={aria['aria-labelledby']} aria-rowcount={R + 1} aria-colcount={C}
      aria-describedby={auto + '-keys'} aria-multiselectable onKeyDown={onGridKey} onCopy={onCopy} onPaste={onPaste}
      onBlur={(e) => {
        // Leaving the grid keeps an open edit, marked unsaved, rather than saving or discarding it.
        if (editing && !e.currentTarget.contains(e.relatedTarget as Node)) setEditing((x) => x && { ...x, unsaved: true });
      }}>
      <thead><tr className="alt-tr" aria-rowindex={1}>
        {columns.map((col, c) => <th key={col.key} scope="col" role="columnheader" className="alt-th" data-align={col.align} aria-colindex={c + 1} style={{ width: col.width }}>
          <span className="alt-grid-head">{col.header}{col.editable && <span className="alt-grid-pencil" aria-hidden="true"><Pencil /></span>}</span>
          {col.editable && <span className="alt-grid-sr">, editable</span>}
        </th>)}
      </tr></thead>
      <tbody>
        {rows.map((row, r) => <tr key={getRowId(row)} className="alt-tr" aria-rowindex={r + 2}>
          {columns.map((col, c) => {
            const k = cellKey(r, c);
            const isActive = active.r === r && active.c === c;
            const isEditing = editing?.r === r && editing.c === c;
            const fail = failed[k];
            const invalid = showInvalid && !isEditing && !fail && !pending.includes(k) ? col.validate?.(valueOf(r, c), row) : undefined;
            const name = `${label(col)}, ${getRowLabel(row)}`;
            return <td key={col.key} role="gridcell" className="alt-td alt-grid-cell" data-align={col.align} data-cell={`${r}:${c}`} aria-colindex={c + 1}
              tabIndex={isActive && !isEditing ? 0 : -1} aria-readonly={!col.editable} aria-selected={inRange(r, c) || isActive}
              aria-invalid={fail || invalid ? true : undefined} aria-busy={pending.includes(k) || undefined} aria-describedby={fail || invalid ? `${auto}-${k}-err` : undefined}
              data-invalid={invalid ? '' : undefined} data-active={isActive ? '' : undefined} data-range={inRange(r, c) ? '' : undefined} data-editing={isEditing ? '' : undefined}
              data-status={pending.includes(k) ? 'pending' : fail ? 'failed' : undefined} data-settle={settled.includes(k) ? '' : undefined}
              onMouseDown={(e) => {
                if (isEditing) return;
                if (editing && !commit()) { e.preventDefault(); return; } // clicking another cell commits, as in a spreadsheet
                e.preventDefault(); go({ r, c }, e.shiftKey);
              }}
              onDoubleClick={() => begin(r, c)}>
              {isEditing ? (editing!.custom
                ? <span className="alt-grid-editor">{col.editor!({ value: editing!.draft, id: `${auto}-${k}-field`, 'aria-label': name, invalid: !!editing!.error, autoFocus: true,
                    onValueChange: (v) => {
                      const problem = col.validate?.(v, row);
                      if (problem) { setEditing({ ...editing!, draft: v, error: problem }); return; }
                      setEditing(null); wantFocus.current = 'cell';
                      if (fmt(col, v) !== fmt(col, valueOf(r, c))) void save([changeFor(r, c, v)]);
                    } })}</span>
                : <input ref={field} className="alt-grid-input" aria-label={name} value={String(editing!.draft)} aria-invalid={editing!.error ? true : undefined}
                    aria-describedby={editing!.error ? `${auto}-${k}-edit-err` : undefined} onChange={(e) => setEditing({ ...editing!, draft: e.target.value, error: undefined, unsaved: false })} />)
                : <span className="alt-grid-value">{col.cell ? col.cell(row) : fmt(col, valueOf(r, c))}</span>}
              {isEditing && editing!.error && <span id={`${auto}-${k}-edit-err`} className="alt-grid-tip" role="alert">{editing!.error}</span>}
              {isEditing && editing!.unsaved && !editing!.error && <span className="alt-grid-tip alt-grid-unsaved">Not saved yet</span>}
              {!isEditing && pending.includes(k) && <span className="alt-grid-plate" aria-hidden="true" />}
              {!isEditing && fail && <span className="alt-grid-fail"><Icons.AlertCircle size={13} /><span id={`${auto}-${k}-err`} className="alt-grid-sr">{fail.error}. Press Enter to try again.</span></span>}
              {invalid && <span className="alt-grid-fail"><Icons.AlertCircle size={13} /><span id={`${auto}-${k}-err`} className="alt-grid-sr">{invalid}</span></span>}
            </td>;
          })}
        </tr>)}
      </tbody>
    </Table>
    <span id={auto + '-keys'} hidden>Arrows move. Enter or F2 edits, or just type. Enter saves and moves down, Tab saves and moves right, Escape discards. Shift and arrows select a range; copy and paste work as in a spreadsheet.</span>
    <span className="alt-grid-sr" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
    <span className="alt-grid-sr" aria-live="polite" aria-atomic="true">{rangeText}</span>
  </div>;
}

const Pencil = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2.5l2.5 2.5L6 12.5H3.5V10z" /></svg>;
