import * as React from 'react';
import { cx, Icons, useOutside, usePresence } from './core';
import { commandScore } from './command';
import { Button } from './controls';

export interface FilterOption { value: string; label: string }
export interface FilterField {
  key: string;
  label: string;
  /** enum: choose from options. text: a phrase. number. date: an ISO 'YYYY-MM-DD' date ('between' takes two). */
  type: 'enum' | 'text' | 'number' | 'date';
  options?: FilterOption[];
  /** Enum lists get a search field. Default: when there are more than 8 options. */
  searchable?: boolean;
  /** Default by type: enum ['is', 'is not'], text ['contains', 'does not contain'], number ['=', '>', '<'], date ['before', 'after', 'between']. */
  operators?: string[];
}
export type FilterValue = string | number | { start: string; end: string } | undefined;
export interface Filter { id: string; field: string; operator: string; value: FilterValue }
export interface FilterBarProps {
  fields: FilterField[];
  value: Filter[];
  onValueChange: (filters: Filter[]) => void;
  /** Shown as a segment when there's more than one filter. Omit to hide it. */
  match?: 'all' | 'any';
  onMatchChange?: (match: 'all' | 'any') => void;
  /** Announced after each change: “Status is Done. 12 results”. */
  resultCount?: number;
  /** Ids for new filters. Default: a counter. */
  createId?: () => string;
  'aria-label'?: string;
  className?: string;
}

const DEFAULT_OPS: Record<FilterField['type'], string[]> = { enum: ['is', 'is not'], text: ['contains', 'does not contain'], number: ['=', '>', '<'], date: ['before', 'after', 'between'] };
const EXIT = 160;
let counter = 0;
const opsOf = (f: FilterField) => f.operators ?? DEFAULT_OPS[f.type];
const dateText = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
};
/** The value as words, or undefined while there isn't one. */
export const filterValueText = (f: FilterField, v: FilterValue): string | undefined => {
  if (v === undefined || v === '') return undefined;
  if (f.type === 'enum') return f.options?.find((o) => o.value === v)?.label ?? String(v);
  if (f.type === 'date') return typeof v === 'object' ? `${dateText(v.start)} and ${dateText(v.end)}` : dateText(String(v));
  if (f.type === 'text') return `“${v}”`;
  return String(v);
};
const sentence = (f: FilterField, x: Filter) => `${f.label} ${x.operator} ${filterValueText(f, x.value) ?? '…'}`;

type Seg = { filter: string; part: 'field' | 'operator' | 'value' | 'remove' } | { filter: null; part: 'match' | 'add' };
const segKey = (s: Seg) => `${s.filter ?? ''}:${s.part}`;

/**
 * A query as a row of conditions. Each condition is a plate stamped into the bar (ground), split into segments that
 * lift when pointed at because each opens its picker (level 3). A condition still waiting for a value keeps that
 * segment as an opening, and so does Add filter. The bar is one Tab stop: a toolbar with ←/→ between segments.
 */
export function FilterBar({ fields, value, onValueChange, match, onMatchChange, resultCount, createId = () => `filter-${++counter}`, className, ...aria }: FilterBarProps) {
  const [open, setOpen] = React.useState<Seg | null>(null);
  const [active, setActive] = React.useState<string>('');
  const [stamped, setStamped] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState('');
  const pendingValue = React.useRef<string | null>(null);
  const root = React.useRef<HTMLDivElement>(null);
  const segRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const wantFocus = React.useRef<string | null>(null);
  const announceAfter = React.useRef<string | null>(null);
  const fieldOf = (key: string) => fields.find((f) => f.key === key)!;

  const segs: Seg[] = [
    ...(match && value.length > 1 ? [{ filter: null, part: 'match' } as Seg] : []),
    ...value.flatMap((x) => (['field', 'operator', 'value', 'remove'] as const).map((part) => ({ filter: x.id, part }) as Seg)),
    { filter: null, part: 'add' },
  ];
  const keys = segs.map(segKey);
  const current = keys.includes(active) ? active : keys[0];

  React.useLayoutEffect(() => {
    if (wantFocus.current) { segRefs.current.get(wantFocus.current)?.focus(); wantFocus.current = null; }
  });
  // Announce the new sentence once the application has published it (and its result count).
  React.useEffect(() => {
    const id = announceAfter.current;
    if (!id) return;
    announceAfter.current = null;
    const x = value.find((f) => f.id === id);
    if (!x) return;
    setAnnouncement(`${sentence(fieldOf(x.field), x)}.${resultCount !== undefined ? ` ${resultCount} result${resultCount === 1 ? '' : 's'}` : ''}`);
  }, [value, resultCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const focusSeg = (k: string) => { setActive(k); wantFocus.current = k; };
  const stamp = (id: string) => { setStamped(id); setTimeout(() => setStamped((s) => (s === id ? null : s)), 400); };
  const update = (id: string, patch: Partial<Filter>) => {
    const next = value.map((x) => (x.id === id ? { ...x, ...patch } : x));
    announceAfter.current = id; stamp(id);
    onValueChange(next);
  };
  const remove = (id: string) => {
    const i = value.findIndex((x) => x.id === id);
    const x = value[i];
    const nextFilter = value[i + 1] ?? value[i - 1];
    focusSeg(nextFilter ? `${nextFilter.id}:field` : ':add');
    setAnnouncement(`Removed ${sentence(fieldOf(x.field), x)}.${resultCount !== undefined ? '' : ''}`);
    onValueChange(value.filter((f) => f.id !== id));
  };
  const close = (refocus = true) => { if (open && refocus) focusSeg(segKey(open)); setOpen(null); };
  useOutside(root, !!open, () => setOpen(null));

  // After a field is chosen for a new filter, its field list sinks first and only then does the value picker rise.
  React.useEffect(() => {
    const id = pendingValue.current;
    if (!id || open) return;
    pendingValue.current = null;
    const t = setTimeout(() => { setOpen({ filter: id, part: 'value' }); setActive(`${id}:value`); }, EXIT);
    return () => clearTimeout(t);
  }, [open, value]);

  const onKey = (e: React.KeyboardEvent) => {
    if (open) return;
    const i = keys.indexOf(current);
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const next = rtl ? 'ArrowLeft' : 'ArrowRight', prev = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === next) { e.preventDefault(); focusSeg(keys[Math.min(keys.length - 1, i + 1)]); }
    else if (e.key === prev) { e.preventDefault(); focusSeg(keys[Math.max(0, i - 1)]); }
    else if (e.key === 'Home') { e.preventDefault(); focusSeg(keys[0]); }
    else if (e.key === 'End') { e.preventDefault(); focusSeg(keys[keys.length - 1]); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && segs[i].filter) { e.preventDefault(); remove(segs[i].filter!); }
    else if (e.key === 'ArrowDown' && segs[i].part !== 'remove' && segs[i].part !== 'match') { e.preventDefault(); setOpen(segs[i]); }
  };
  const activate = (s: Seg) => {
    if (s.part === 'remove') { remove(s.filter!); return; }
    if (s.part === 'match') { const m = match === 'all' ? 'any' : 'all'; onMatchChange?.(m); setAnnouncement(`Match ${m} filters`); return; }
    setOpen(open && segKey(open) === segKey(s) ? null : s);
  };

  const button = (s: Seg, label: React.ReactNode, name: string, extra: Record<string, unknown> = {}) => {
    const k = segKey(s);
    const popup = s.part !== 'remove' && s.part !== 'match';
    return <button key={k} ref={(el) => { if (el) segRefs.current.set(k, el); else segRefs.current.delete(k); }} type="button" tabIndex={k === current ? 0 : -1}
      className={`alt-filter-seg alt-filter-${s.part}`} aria-label={name} aria-haspopup={popup ? 'dialog' : undefined}
      aria-expanded={popup ? (open ? segKey(open) === k : false) : undefined} onFocus={() => setActive(k)} onClick={() => activate(s)} {...extra}>{label}</button>;
  };
  const picker = (s: Seg) => {
    if (!open || segKey(open) !== segKey(s)) return null;
    if (s.part === 'add') return <Picker title="Add filter" kind="list" options={fields.map((f) => ({ value: f.key, label: f.label }))} searchable={fields.length > 8}
      onClose={close} onChoose={(key) => {
        const f = fieldOf(key);
        const id = createId();
        pendingValue.current = id; setOpen(null); stamp(id);
        onValueChange([...value, { id, field: key, operator: opsOf(f)[0], value: undefined }]);
        setAnnouncement(`Added ${f.label}. Choose a value.`);
      }} />;
    const x = value.find((f) => f.id === s.filter)!;
    const f = fieldOf(x.field);
    if (s.part === 'field') return <Picker title="Change field" kind="list" options={fields.map((o) => ({ value: o.key, label: o.label }))} current={x.field} onClose={close}
      onChoose={(key) => { close(); if (key !== x.field) update(x.id, { field: key, operator: opsOf(fieldOf(key))[0], value: undefined }); }} />;
    if (s.part === 'operator') return <Picker title={`${f.label}: change condition`} kind="list" options={opsOf(f).map((o) => ({ value: o, label: o }))} current={x.operator} onClose={close}
      onChoose={(op) => { close(); const between = op === 'between', was = typeof x.value === 'object';
        update(x.id, { operator: op, value: between === was ? x.value : undefined }); }} />;
    if (f.type === 'enum') return <Picker title={`${f.label} ${x.operator}`} kind="list" options={f.options ?? []} current={x.value as string} searchable={f.searchable ?? (f.options?.length ?? 0) > 8}
      onClose={close} onChoose={(v) => { close(); update(x.id, { value: v }); }} />;
    return <Picker title={`${f.label} ${x.operator}`} kind={f.type === 'date' ? (x.operator === 'between' ? 'range' : 'date') : f.type} current={x.value} onClose={close}
      onChoose={(v) => { close(); update(x.id, { value: v }); }} />;
  };

  return <div ref={root} className={cx('alt-filter-bar', className)} role="toolbar" aria-label={aria['aria-label'] ?? 'Filters'} onKeyDown={onKey}>
    {match && value.length > 1 && button({ filter: null, part: 'match' }, <>Match <strong>{match}</strong> of</>, `Match ${match} filters. Change to ${match === 'all' ? 'any' : 'all'}`)}
    {value.map((x) => {
      const f = fieldOf(x.field);
      const v = filterValueText(f, x.value);
      return <div key={x.id} role="group" aria-label={sentence(f, x)} className="alt-filter-token" data-stamp={stamped === x.id ? '' : undefined} data-incomplete={v ? undefined : ''}>
        <span className="alt-filter-anchor">{button({ filter: x.id, part: 'field' }, f.label, `Field: ${f.label}. Change field`)}{picker({ filter: x.id, part: 'field' })}</span>
        <span className="alt-filter-anchor">{button({ filter: x.id, part: 'operator' }, x.operator, `Condition: ${x.operator}. Change condition`)}{picker({ filter: x.id, part: 'operator' })}</span>
        <span className="alt-filter-anchor">{button({ filter: x.id, part: 'value' }, v ?? 'Choose a value', v ? `Value: ${v}. Change value` : `${f.label}: choose a value`, { 'data-empty': v ? undefined : '' })}{picker({ filter: x.id, part: 'value' })}</span>
        {button({ filter: x.id, part: 'remove' }, <Icons.X size={12} />, `Remove filter: ${sentence(f, x)}`)}
      </div>;
    })}
    <span className="alt-filter-anchor">{button({ filter: null, part: 'add' }, <><span aria-hidden="true" className="alt-filter-plus">+</span>Add filter</>, 'Add filter')}{picker({ filter: null, part: 'add' })}</span>
    <span className="alt-filter-count" aria-hidden="true">{value.length ? `${value.length} filter${value.length === 1 ? '' : 's'}` : ''}</span>
    <span className="alt-filter-status" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
  </div>;
}

type PickerProps = {
  title: string; kind: 'list' | 'text' | 'number' | 'date' | 'range'; options?: FilterOption[]; current?: FilterValue; searchable?: boolean;
  onChoose: (value: any) => void; onClose: (refocus?: boolean) => void;
};
/** A segment's picker: a list (with an optional search), or a small form for text, numbers and dates. */
function Picker({ title, kind, options = [], current, searchable, onChoose, onClose }: PickerProps) {
  const { state } = usePresence(true, EXIT);
  const [query, setQuery] = React.useState('');
  const shown = query ? options.map((o, i) => ({ o, i, s: commandScore(o.label, query) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.o) : options;
  const [active, setActive] = React.useState(() => Math.max(0, options.findIndex((o) => o.value === current)));
  const [draft, setDraft] = React.useState<any>(current ?? (kind === 'range' ? { start: '', end: '' } : ''));
  const list = React.useRef<HTMLDivElement>(null);
  const first = React.useRef<HTMLInputElement>(null);
  const id = React.useId();
  React.useEffect(() => { (searchable || kind !== 'list' ? first.current : list.current)?.focus({ preventScroll: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const a = Math.min(active, shown.length - 1);
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); return; }
    if (kind !== 'list') return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((x) => Math.min(shown.length - 1, x + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((x) => Math.max(0, x - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(shown.length - 1); }
    else if (e.key === 'Enter' && shown[a]) { e.preventDefault(); onChoose(shown[a].value); }
    e.stopPropagation();
  };
  const ready = kind === 'range' ? draft.start && draft.end && draft.start <= draft.end : String(draft).trim() !== '';
  const apply = () => { if (ready) onChoose(kind === 'number' ? Number(draft) : kind === 'text' ? String(draft).trim() : draft); };
  return <div className="alt-pop alt-filter-picker" role="dialog" aria-label={title} data-state={state} data-side="bottom" data-align="start" onKeyDown={keys}>
    {kind === 'list' ? <>
      {searchable && <input ref={first} className="alt-filter-search" type="text" placeholder="Search" aria-label={`Search ${title}`} value={query}
        role="combobox" aria-expanded aria-controls={id} aria-activedescendant={shown[a] ? `${id}-${a}` : undefined} onChange={(e) => { setQuery(e.target.value); setActive(0); }} />}
      <div ref={list} id={id} role="listbox" aria-label={title} tabIndex={searchable ? undefined : -1} className="alt-filter-list" aria-activedescendant={!searchable && shown[a] ? `${id}-${a}` : undefined}>
        {shown.map((o, i) => <div key={o.value} id={`${id}-${i}`} role="option" aria-selected={o.value === current} data-active={i === a ? '' : undefined}
          className="alt-filter-option" onPointerMove={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => onChoose(o.value)}>
          {o.label}{o.value === current && <Icons.Check size={14} />}</div>)}
        {!shown.length && <div className="alt-filter-empty">No matches</div>}
      </div>
    </> : <form className="alt-filter-form" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); apply(); }}>
      {kind === 'range' ? <>
        <label>From<input ref={first} className="alt-filter-input" type="date" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} /></label>
        <label>To<input className="alt-filter-input" type="date" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} /></label>
      </> : <input ref={first} className="alt-filter-input" aria-label={title} type={kind === 'number' ? 'number' : kind === 'date' ? 'date' : 'text'}
        value={draft} onChange={(e) => setDraft(e.target.value)} />}
      <Button type="submit" variant="primary" size="sm" disabled={!ready}>Apply</Button>
    </form>}
  </div>;
}
