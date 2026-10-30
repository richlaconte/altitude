import * as React from 'react';
import { cx, Icons } from './core';
import { Button } from './controls';

/** A local date-time, 'YYYY-MM-DDTHH:mm': no time zone. Convert at your edges. */
export type LocalDateTime = string;
export type ScheduleResult = { ok: true } | { ok: false; error: string };
export type ScheduleCreateResult<T> = { ok: true; value: T } | { ok: false; error: string };
export interface ScheduleSpan { start: LocalDateTime; end: LocalDateTime }
export interface ScheduleProps<T> {
  /** Default 'week'. */
  view?: 'day' | 'week' | 'workweek';
  /**
   * What it shows under 480px of its own width (#257). 'day' (default): one day at a time, paged with the header's
   * previous and next, so events and slots keep a readable width. false: the view, squeezed.
   */
  narrowView?: 'day' | false;
  /** Any day in the period shown, 'YYYY-MM-DD'. */
  date: string;
  onDateChange?: (date: string) => void;
  events: T[];
  getKey: (event: T) => string;
  getStart: (event: T) => LocalDateTime;
  getEnd: (event: T) => LocalDateTime;
  getLabel: (event: T) => string;
  /** Minutes per slot, and the snap for moves and resizes. Default 15. */
  step?: number;
  /** Default '08:00' and '19:00'. */
  dayStart?: string;
  dayEnd?: string;
  /** Pixels per hour. Default 48, or 96 under a coarse pointer so a 15-minute slot is 24px tall. */
  hourHeight?: number;
  /** 0 Sunday … 6 Saturday. Default 1. */
  weekStartsOn?: number;
  /** A new event's length when made with Enter on an empty slot. Default 60 minutes. */
  defaultDuration?: number;
  renderEvent?: (event: T) => React.ReactNode;
  /** Resolve after `events` includes the new event. */
  onCreate?: (request: ScheduleSpan & { title: string }) => ScheduleCreateResult<T> | Promise<ScheduleCreateResult<T>>;
  /** A move or a resize. Resolve after `events` reflects it. */
  onChange?: (next: ScheduleSpan & { id: string }, previous: T) => ScheduleResult | Promise<ScheduleResult>;
  onRename?: (event: T, title: string) => ScheduleResult | Promise<ScheduleResult>;
  /** Enter on an event: show its details (in a Sheet, not a Dialog). */
  onOpen?: (event: T) => void;
  /** Delete. Your removal policy applies. */
  onRemove?: (event: T) => void;
  /** Someone else is moving this event: it can't be picked up. */
  heldBy?: (event: T) => { name: string; presence?: 1 | 2 | 3 } | null | undefined;
  /** Refuse a span (outside hours, a closed room). */
  isUnavailable?: (span: ScheduleSpan) => boolean;
  /** The now line's time. Default: the clock. */
  now?: LocalDateTime;
  locale?: string;
  'aria-label'?: string;
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const minutesOf = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const split = (t: LocalDateTime) => ({ day: t.slice(0, 10), min: minutesOf(t.slice(11, 16)) });
const at = (day: string, min: number): LocalDateTime => `${day}T${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
const utc = (day: string) => { const [y, m, d] = day.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const addDays = (day: string, n: number) => { const t = utc(day); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const nowLocal = () => { const t = new Date(); return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T${pad(t.getHours())}:${pad(t.getMinutes())}`; };
const fmt = (locale: string | undefined, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { ...o, timeZone: 'UTC' });
const clockText = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

type Placed<T> = { event: T; key: string; day: string; start: number; end: number; lane: number; lanes: number; overlaps: string[] };
type Carry = { key: string; day: string; start: number; end: number; mode: 'keys' | 'pointer'; kind: 'move' | 'resize'; blocked?: boolean };
type Draft = { day: string; start: number; end: number; title: string; error?: string; drawing?: boolean };

/**
 * A day or week of time whose events you handle directly. The grid is ground; events are live work items raised one
 * level, like BoardCards. Time opens into wells only while something could land in it (carrying or drawing), and the
 * slot under a carried event deepens to a trench the length of the event. A carried event floats at level 3, tilted.
 */
export function Schedule<T>({ view: viewProp = 'week', narrowView = 'day', date, onDateChange, events, getKey, getStart, getEnd, getLabel, step = 15, dayStart = '08:00', dayEnd = '19:00',
  hourHeight: hourHeightProp, weekStartsOn = 1, defaultDuration = 60, renderEvent, onCreate, onChange, onRename, onOpen, onRemove, heldBy, isUnavailable, now, locale,
  className, ...aria }: ScheduleProps<T>) {
  // Narrow (#257): measured on the schedule itself, at the narrow breakpoint.
  const [root, setRoot] = React.useState<HTMLDivElement | null>(null);
  const [isNarrow, setIsNarrow] = React.useState(false);
  React.useEffect(() => {
    if (!root || !narrowView) { setIsNarrow(false); return; }
    const ro = new ResizeObserver(([e]) => setIsNarrow(e.contentRect.width < 480));
    ro.observe(root);
    return () => ro.disconnect();
  }, [root, narrowView]);
  const view = isNarrow && narrowView ? narrowView : viewProp;
  // Under a coarse pointer an hour is twice as tall (unless hourHeight is set), so a 15-minute slot or event is 24px:
  // big enough for a finger, and still in proportion to its time (#257).
  const [coarse, setCoarse] = React.useState(false);
  React.useEffect(() => { const mq = window.matchMedia?.('(pointer: coarse)'); if (!mq) return; const sync = () => setCoarse(mq.matches); sync(); mq.addEventListener?.('change', sync); return () => mq.removeEventListener?.('change', sync); }, []);
  const hourHeight = hourHeightProp ?? (coarse ? 96 : 48);
  const first = minutesOf(dayStart), last = minutesOf(dayEnd);
  const px = hourHeight / 60;
  const slots = Array.from({ length: Math.ceil((last - first) / step) }, (_, i) => first + i * step);
  const weekday = utc(date).getUTCDay();
  const startDay = view === 'day' ? date : addDays(date, -((weekday - weekStartsOn + 7) % 7));
  const days = view === 'day' ? [date] : Array.from({ length: 7 }, (_, i) => addDays(startDay, i)).filter((d) => view === 'week' || ![0, 6].includes(utc(d).getUTCDay()));
  const longDay = fmt(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const shortDay = fmt(locale, { weekday: 'short', day: 'numeric' });

  const [focus, setFocus] = React.useState<{ day: string; min: number }>({ day: days.includes(date) ? date : days[0], min: first + Math.floor((9 * 60 - first) / step) * step });
  const [carry, setCarry] = React.useState<Carry | null>(null);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [failure, setFailure] = React.useState<{ key: string; error: string; retry: () => void } | null>(null);
  const [renaming, setRenaming] = React.useState<{ key: string; title: string; error?: string } | null>(null);
  const [settled, setSettled] = React.useState<string | null>(null);
  const [polite, setPolite] = React.useState('');
  const [assertive, setAssertive] = React.useState('');
  const grid = React.useRef<HTMLDivElement>(null);
  const body = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLInputElement>(null);
  const wantFocus = React.useRef<'cell' | 'title' | null>(null);
  const mounted = React.useRef(true);
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const say = (text: string) => { setAssertive(''); requestAnimationFrame(() => mounted.current && setAssertive(text)); };

  const byKey = new Map(events.map((e) => [getKey(e), e]));
  // Events by day, with overlapping ones laid out side by side in lanes.
  const placed = React.useMemo(() => {
    const out: Placed<T>[] = [];
    for (const day of days) {
      const list = events.map((event) => ({ event, key: getKey(event), s: split(getStart(event)), e: split(getEnd(event)) }))
        .filter((x) => x.s.day === day).map((x) => ({ event: x.event, key: x.key, day, start: x.s.min, end: x.e.day === day ? x.e.min : 24 * 60, lane: 0, lanes: 1, overlaps: [] as string[] }))
        .sort((a, b) => a.start - b.start || b.end - a.end);
      let cluster: Placed<T>[] = [], clusterEnd = -1;
      const close = () => { const lanes = Math.max(1, ...cluster.map((p) => p.lane + 1)); cluster.forEach((p) => { p.lanes = lanes; }); cluster = []; };
      for (const p of list) {
        if (p.start >= clusterEnd) { close(); clusterEnd = p.end; } else clusterEnd = Math.max(clusterEnd, p.end);
        const used = new Set(cluster.filter((q) => q.end > p.start).map((q) => q.lane));
        while (used.has(p.lane)) p.lane++;
        cluster.push(p);
        for (const q of list) if (q !== p && q.start < p.end && p.start < q.end) p.overlaps.push(getLabel(q.event));
        out.push(p);
      }
      close();
    }
    return out;
  }, [events, date, view]); // eslint-disable-line react-hooks/exhaustive-deps

  const spanText = (day: string, s: number, e: number) => `${longDay.format(utc(day))}, ${clockText(s)} to ${clockText(e)}`;
  const nameOf = (p: Placed<T>) => [`${getLabel(p.event)}, ${spanText(p.day, p.start, p.end)}`, p.overlaps.length && `overlaps with ${p.overlaps.join(', ')}`,
    heldBy?.(p.event) && `${heldBy(p.event)!.name} is moving this event`].filter(Boolean).join('. ');
  const blocked = (day: string, s: number, e: number) => s < 0 || e > 24 * 60 || e <= s || !!isUnavailable?.({ start: at(day, s), end: at(day, e) });

  React.useLayoutEffect(() => {
    if (!wantFocus.current) return;
    const what = wantFocus.current; wantFocus.current = null;
    if (what === 'title') { titleRef.current?.focus(); titleRef.current?.select(); return; }
    const key = carry?.key;
    const target = (key && grid.current?.querySelector<HTMLElement>(`[data-event="${CSS.escape(key)}"]`))
      || grid.current?.querySelector<HTMLElement>(`[data-cell="${focus.day}T${focus.min}"] [data-event]`)
      || grid.current?.querySelector<HTMLElement>(`[data-cell="${focus.day}T${focus.min}"]`);
    target?.focus({ preventScroll: false });
  });
  const moveFocus = (day: string, min: number) => { setFocus({ day, min }); wantFocus.current = 'cell'; };

  // ── Writes, with the InlineEdit contract: one at a time; a known failure puts things back and offers Retry. ──
  const write = async (key: string, label: string, run: () => ScheduleResult | ScheduleCreateResult<T> | Promise<ScheduleResult | ScheduleCreateResult<T>>, retry: () => void) => {
    setBusy(key); setFailure(null); setPolite(label);
    let result: any;
    try { result = await run(); } catch { result = { ok: false, error: 'That change couldn’t be saved.' }; }
    if (!mounted.current) return null;
    setBusy(null);
    if (!result || (result.ok !== true && (result.ok !== false || typeof result.error !== 'string'))) result = { ok: false, error: 'That change couldn’t be saved.' };
    if (!result.ok) { setFailure({ key, error: result.error, retry }); setPolite(result.error); return null; }
    setSettled(key); setTimeout(() => mounted.current && setSettled((s) => (s === key ? null : s)), 1200);
    return result;
  };
  const commitCarry = async (c: Carry) => {
    const event = byKey.get(c.key)!;
    const s0 = split(getStart(event)), e0 = split(getEnd(event));
    setCarry(null);
    if (c.blocked || blocked(c.day, c.start, c.end)) { say(`That time isn’t available. ${getLabel(event)} is back in its place.`); moveFocus(s0.day, s0.min); return; }
    if (c.day === s0.day && c.start === s0.min && c.end === (e0.day === s0.day ? e0.min : 24 * 60)) { say(`${getLabel(event)} dropped. ${spanText(c.day, c.start, c.end)}`); moveFocus(c.day, c.start); return; }
    if (!onChange) return;
    setFocus({ day: c.day, min: c.start }); wantFocus.current = 'cell';
    const next = { id: c.key, start: at(c.day, c.start), end: at(c.day, c.end) };
    const ok = await write(c.key, c.kind === 'resize' ? 'Changing the end time' : 'Moving', () => onChange(next, event), () => void commitCarry(c));
    if (ok) say(`${c.kind === 'resize' ? 'Changed' : 'Moved'} ${getLabel(event)} to ${spanText(c.day, c.start, c.end)}`);
    else { say(`${getLabel(event)} is back in its place.`); moveFocus(s0.day, s0.min); }
  };
  const create = async () => {
    if (!draft || !onCreate) return;
    const title = draft.title.trim();
    if (!title) { setDraft({ ...draft, error: 'Enter a title.' }); return; }
    if (blocked(draft.day, draft.start, draft.end)) { setDraft({ ...draft, error: 'That time isn’t available.' }); return; }
    const d = draft;
    const result = await write('__draft', 'Adding event', () => onCreate({ start: at(d.day, d.start), end: at(d.day, d.end), title }), () => void create());
    if (!result) { wantFocus.current = 'title'; return; }
    setDraft(null); setSettled(getKey((result as { value: T }).value)); setFocus({ day: d.day, min: d.start }); wantFocus.current = 'cell';
    say(`Added ${title}, ${spanText(d.day, d.start, d.end)}`);
  };
  const rename = async () => {
    if (!renaming || !onRename) return;
    const event = byKey.get(renaming.key)!;
    const title = renaming.title.trim();
    if (title === getLabel(event)) { setRenaming(null); wantFocus.current = 'cell'; return; }
    if (!title) { setRenaming({ ...renaming, error: 'Enter a title.' }); return; }
    const r = renaming;
    const ok = await write(r.key, 'Saving changes', () => onRename(event, title), () => void rename());
    if (!ok) { wantFocus.current = 'title'; return; }
    setRenaming(null); wantFocus.current = 'cell'; setPolite('Changes saved');
  };
  const startDraft = (day: string, start: number, end: number) => {
    if (!onCreate) return;
    if (blocked(day, start, end)) { say('That time isn’t available.'); return; }
    setDraft({ day, start, end, title: '' }); wantFocus.current = 'title';
    say(`New event, ${spanText(day, start, end)}. Type a title, then Enter.`);
  };

  // ── Keyboard: the grid moves by slot and day; a held event moves by step and day. ──
  const onGridKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input')) return;
    const di = days.indexOf(focus.day);
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const left = rtl ? 'ArrowRight' : 'ArrowLeft', right = rtl ? 'ArrowLeft' : 'ArrowRight';
    const onEvent = (e.target as HTMLElement).dataset.event;
    const event = onEvent ? byKey.get(onEvent) : undefined;
    if (carry?.mode === 'keys') {
      const c = carry, len = c.end - c.start;
      let next: Carry | null = null;
      if (e.key === 'ArrowUp' && e.shiftKey) next = { ...c, end: Math.max(c.start + step, c.end - step), kind: 'resize' };
      else if (e.key === 'ArrowDown' && e.shiftKey) next = { ...c, end: Math.min(24 * 60, c.end + step), kind: 'resize' };
      else if (e.key === 'ArrowUp') next = { ...c, start: Math.max(0, c.start - step), end: Math.max(len, c.end - step) };
      else if (e.key === 'ArrowDown') next = { ...c, start: Math.min(24 * 60 - len, c.start + step), end: Math.min(24 * 60, c.end + step) };
      else if (e.key === left || e.key === right) { const d = days[days.indexOf(c.day) + (e.key === right ? 1 : -1)]; if (d) next = { ...c, day: d }; }
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); void commitCarry(c); return; }
      else if (e.key === 'Escape') { e.preventDefault(); const ev = byKey.get(c.key)!; setCarry(null); say(`Move cancelled. ${getLabel(ev)} is back in its place.`); const s0 = split(getStart(ev)); moveFocus(s0.day, s0.min); return; }
      if (next) { e.preventDefault(); next.blocked = blocked(next.day, next.start, next.end); setCarry(next); wantFocus.current = 'cell'; say(`${spanText(next.day, next.start, next.end)}${next.blocked ? '. Not available' : ''}`); }
      return;
    }
    if (event && onChange && e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && !heldBy?.(event)) {
      e.preventDefault();
      const s = split(getStart(event)), en = split(getEnd(event)).min;
      void commitCarry({ key: onEvent!, day: s.day, start: s.min, end: e.key === 'ArrowUp' ? Math.max(s.min + step, en - step) : en + step, mode: 'keys', kind: 'resize' });
      return;
    }
    if (event && e.key === ' ' && onChange) {
      e.preventDefault();
      const who = heldBy?.(event);
      if (who) { say(`${who.name} is moving ${getLabel(event)}.`); return; }
      const s = split(getStart(event)), en = split(getEnd(event));
      setCarry({ key: onEvent!, day: s.day, start: s.min, end: en.day === s.day ? en.min : 24 * 60, mode: 'keys', kind: 'move' });
      wantFocus.current = 'cell';
      say(`Picked up ${getLabel(event)}. ↑ and ↓ move by ${step} minutes, ← and → by a day, Shift with ↑ and ↓ changes the end. Space drops, Escape cancels.`);
      return;
    }
    if (event && e.key === 'Enter') { e.preventDefault(); onOpen?.(event); return; }
    if (event && e.key === 'F2' && onRename) { e.preventDefault(); setRenaming({ key: onEvent!, title: getLabel(event) }); wantFocus.current = 'title'; return; }
    if (event && e.key === 'Delete' && onRemove) { e.preventDefault(); onRemove(event); wantFocus.current = 'cell'; return; }
    const i = slots.indexOf(focus.min);
    const keys: Record<string, () => void> = {
      ArrowUp: () => moveFocus(focus.day, slots[Math.max(0, i - 1)]),
      ArrowDown: () => moveFocus(focus.day, slots[Math.min(slots.length - 1, i + 1)]),
      [left]: () => moveFocus(days[Math.max(0, di - 1)], focus.min),
      [right]: () => moveFocus(days[Math.min(days.length - 1, di + 1)], focus.min),
      Home: () => moveFocus(focus.day, slots[0]),
      End: () => moveFocus(focus.day, slots[slots.length - 1]),
      PageUp: () => shift(-1), PageDown: () => shift(1),
      Enter: () => startDraft(focus.day, focus.min, Math.min(24 * 60, focus.min + defaultDuration)),
    };
    if (keys[e.key]) { e.preventDefault(); keys[e.key](); }
  };
  const shift = (n: number) => {
    const by = view === 'day' ? n : n * 7;
    const next = addDays(date, by);
    onDateChange?.(next); setFocus({ day: addDays(focus.day, by), min: focus.min }); wantFocus.current = 'cell';
  };

  // ── Pointer: draw on empty time, carry an event, pull its bottom edge. ──
  const pointAt = (x: number, y: number, offset = 0, snap: 'round' | 'floor' = 'round') => {
    // The body is display: contents (rows join the grid), so measure from the first cell.
    const b = grid.current!.querySelector<HTMLElement>(`[data-cell="${days[0]}T${slots[0]}"]`)!.getBoundingClientRect();
    const col = b.width;
    const di = Math.max(0, Math.min(days.length - 1, Math.floor((x - b.left) / col)));
    const raw = first + (y - b.top - offset) / px;
    return { day: days[di], min: Math[snap](raw / step) * step };
  };
  const startDrag = (e: React.PointerEvent, kind: 'draw' | 'move' | 'resize', key?: string) => {
    if (e.button !== 0 || busy || renaming) return;
    if (kind === 'draw' && (!onCreate || (e.target as HTMLElement).closest('[data-event], .alt-schedule-draft'))) return;
    if (kind !== 'draw' && (!onChange || (key && heldBy?.(byKey.get(key)!)))) return;
    const origin = { x: e.clientX, y: e.clientY };
    const event = key ? byKey.get(key)! : undefined;
    const s = event ? split(getStart(event)) : null, en = event ? split(getEnd(event)).min : 0;
    const grab = event && kind === 'move' ? e.clientY - (grid.current!.querySelector<HTMLElement>(`[data-cell="${days[0]}T${slots[0]}"]`)!.getBoundingClientRect().top + (s!.min - first) * px) : 0;
    const p0 = pointAt(e.clientX, e.clientY, 0, 'floor');
    let moved = false, latest: Carry | Draft | null = null;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) < 5) return;
      moved = true;
      if (kind === 'draw') {
        // The span covers every slot the pointer has crossed, including the one it's in.
        const p = pointAt(ev.clientX, ev.clientY, 0, 'floor');
        const a = Math.min(p0.min, p.min), b = Math.max(p0.min, p.min);
        latest = { day: p0.day, start: Math.max(first, a), end: Math.min(last, b + step), title: '', drawing: true };
        setDraft(latest);
      } else if (kind === 'move') {
        const p = pointAt(ev.clientX, ev.clientY, grab);
        const len = en - s!.min;
        const start = Math.max(0, Math.min(24 * 60 - len, p.min));
        latest = { key: key!, day: p.day, start, end: start + len, mode: 'pointer', kind: 'move', blocked: blocked(p.day, start, start + len) };
        setCarry(latest);
      } else {
        const p = pointAt(ev.clientX, ev.clientY);
        const end = Math.max(s!.min + step, Math.min(24 * 60, p.min));
        latest = { key: key!, day: s!.day, start: s!.min, end, mode: 'pointer', kind: 'resize', blocked: blocked(s!.day, s!.min, end) };
        setCarry(latest);
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      if (!moved || !latest) { setCarry(null); return; }
      if (kind === 'draw') { const d = latest as Draft; setDraft(null); latestStart.current(d.day, d.start, d.end); }
      else void latestCommit.current(latest as Carry);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  // Window listeners outlive their render: reach the current handlers through refs.
  const latestCommit = React.useRef(commitCarry); latestCommit.current = commitCarry;
  const latestStart = React.useRef(startDraft); latestStart.current = startDraft;

  const nowAt = split(now ?? nowLocal());
  const title = view === 'day' ? longDay.format(utc(date)) : `${fmt(locale, { day: 'numeric', month: 'short' }).format(utc(days[0]))} – ${fmt(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(utc(days[days.length - 1]))}`;
  const eventsIn = (day: string, min: number) => placed.filter((p) => p.day === day && Math.max(first, Math.floor(p.start / step) * step) === min && (carry?.key !== p.key));
  const field = (value: string, label: string, error: string | undefined, onValue: (v: string) => void, onSave: () => void, onCancel: () => void) =>
    <span className="alt-schedule-field">
      <input ref={titleRef} className="alt-schedule-title-input" aria-label={label} value={value} aria-invalid={error ? true : undefined}
        onChange={(e) => onValue(e.target.value)} onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => { e.stopPropagation(); if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return; if (e.key === 'Enter') { e.preventDefault(); onSave(); } else if (e.key === 'Escape') { e.preventDefault(); onCancel(); } }} />
      {error && <span className="alt-schedule-error" role="alert"><Icons.AlertCircle size={12} />{error}</span>}
    </span>;
  const eventBox = (p: { key: string; day: string; start: number; end: number; lane: number; lanes: number }, inner: React.ReactNode, extra: Record<string, unknown>) =>
    <div key={p.key} className="alt-schedule-event-box" style={{ top: (p.start - Math.max(first, Math.floor(p.start / step) * step)) * px, height: Math.max(step * px, (p.end - p.start) * px) - 2, left: `calc(${(p.lane / p.lanes) * 100}% + 2px)`, width: `calc(${100 / p.lanes}% - 4px)` }} {...extra}>{inner}</div>;

  return <div ref={setRoot} className={cx('alt-schedule', className)} data-narrow={isNarrow && narrowView ? '' : undefined} data-carrying={carry || draft?.drawing ? '' : undefined} style={{ ['--days' as any]: days.length, ['--slot' as any]: `${step * px}px` }}>
    <div className="alt-schedule-head">
      <h2 className="alt-schedule-period" aria-live="polite">{title}</h2>
      {onDateChange && <div className="alt-schedule-nav">
        <Button size="sm" variant="ghost" aria-label={view === 'day' ? 'Previous day' : 'Previous week'} onClick={() => shift(-1)}>‹</Button>
        <Button size="sm" variant="ghost" onClick={() => onDateChange((now ?? nowLocal()).slice(0, 10))}>Today</Button>
        <Button size="sm" variant="ghost" aria-label={view === 'day' ? 'Next day' : 'Next week'} onClick={() => shift(1)}>›</Button>
      </div>}
    </div>
    <div ref={grid} role="grid" className="alt-schedule-grid" aria-label={aria['aria-label'] ?? 'Schedule'} aria-rowcount={slots.length + 1} aria-colcount={days.length + 1} onKeyDown={onGridKey} key={days[0]}>
      <div role="row" className="alt-schedule-row alt-schedule-dayrow" aria-rowindex={1}>
        <span role="columnheader" className="alt-schedule-corner" aria-colindex={1}><span className="alt-schedule-sr">Time</span></span>
        {days.map((d, i) => <span key={d} role="columnheader" className="alt-schedule-day" aria-colindex={i + 2} aria-label={longDay.format(utc(d))} data-today={d === nowAt.day ? '' : undefined}>{shortDay.format(utc(d))}</span>)}
      </div>
      <div ref={body} className="alt-schedule-body" onPointerDown={(e) => startDrag(e, 'draw')}>
        {slots.map((min, r) => <div key={min} role="row" className="alt-schedule-row" aria-rowindex={r + 2} data-hour={min % 60 === 0 ? '' : undefined}>
          <span role="rowheader" className="alt-schedule-time" aria-colindex={1}>{min % 60 === 0 ? clockText(min) : <span className="alt-schedule-sr">{clockText(min)}</span>}</span>
          {days.map((d, c) => {
            const here = eventsIn(d, min);
            const isFocus = focus.day === d && focus.min === min;
            const carried = carry && carry.day === d && Math.max(first, Math.floor(carry.start / step) * step) === min ? carry : null;
            const drafted = draft && draft.day === d && draft.start === min ? draft : null;
            return <div key={d} role="gridcell" className="alt-schedule-cell" data-cell={`${d}T${min}`} aria-colindex={c + 2} aria-label={`${longDay.format(utc(d))}, ${clockText(min)}${here.length ? `, ${here.length} event${here.length > 1 ? 's' : ''}` : ''}`}
              tabIndex={isFocus && !here.length ? 0 : -1} onFocus={(e) => { if (e.target === e.currentTarget) setFocus({ day: d, min }); }}>
              {here.map((p) => {
                const who = heldBy?.(p.event);
                const isRenaming = renaming?.key === p.key;
                return eventBox(p, <>
                  <button type="button" className="alt-schedule-event" data-event={p.key} tabIndex={isFocus ? 0 : -1} aria-label={nameOf(p)} aria-busy={busy === p.key || undefined}
                    data-status={busy === p.key ? 'pending' : failure?.key === p.key ? 'failed' : undefined} data-settle={settled === p.key ? '' : undefined}
                    data-held={who ? (who.presence ?? 1) : undefined} data-short={(p.end - p.start) * px < 36 ? '' : undefined} onFocus={() => setFocus({ day: d, min })}
                    onPointerDown={(e) => { e.stopPropagation(); startDrag(e, 'move', p.key); }} onDoubleClick={() => onOpen?.(p.event)}
                    onClick={(e) => { if ((e.nativeEvent as PointerEvent).pointerType === 'touch') onOpen?.(p.event); }}>
                    {isRenaming ? null : renderEvent ? renderEvent(p.event) : <><strong>{getLabel(p.event)}</strong><small>{clockText(p.start)}–{clockText(p.end)}</small></>}
                    {who && <span className="alt-schedule-holder" aria-hidden="true">{who.name}</span>}
                  </button>
                  {isRenaming && field(renaming.title, `Rename ${getLabel(p.event)}`, renaming.error, (t) => setRenaming({ ...renaming, title: t, error: undefined }), () => void rename(), () => { setRenaming(null); wantFocus.current = 'cell'; })}
                  {onChange && !who && <span className="alt-schedule-handle" aria-hidden="true" onPointerDown={(e) => { e.stopPropagation(); startDrag(e, 'resize', p.key); }} />}
                </>, {});
              })}
              {carried && <>
                <div className="alt-schedule-slot" data-blocked={carried.blocked ? '' : undefined} aria-hidden="true"
                  style={{ top: (carried.start - min) * px, height: (carried.end - carried.start) * px - 2 }} />
                {eventBox({ ...carried, lane: 0, lanes: 1 }, <button type="button" className="alt-schedule-event" data-event={carried.key} data-carried={carried.mode} tabIndex={0}
                  aria-pressed aria-label={`${getLabel(byKey.get(carried.key)!)}, ${spanText(carried.day, carried.start, carried.end)}`}>
                  <strong>{getLabel(byKey.get(carried.key)!)}</strong><small>{clockText(carried.start)}–{clockText(carried.end)}</small></button>, {})}
              </>}
              {drafted && eventBox({ ...drafted, key: '__draft', lane: 0, lanes: 1 }, drafted.drawing
                ? <div className="alt-schedule-drawn" aria-hidden="true"><small>{clockText(drafted.start)}–{clockText(drafted.end)}</small></div>
                : <div className="alt-schedule-draft" data-status={busy === '__draft' ? 'pending' : undefined}>
                  {field(drafted.title, 'Event title', drafted.error, (t) => setDraft({ ...drafted, title: t, error: undefined }), () => void create(), () => { setDraft(null); wantFocus.current = 'cell'; say('New event discarded.'); })}
                  <small>{clockText(drafted.start)}–{clockText(drafted.end)}</small>
                </div>, {})}
              {d === nowAt.day && nowAt.min >= min && nowAt.min < min + step && <span className="alt-schedule-now" style={{ top: (nowAt.min - min) * px }}><span className="alt-schedule-sr">Now, {clockText(nowAt.min)}</span></span>}
            </div>;
          })}
        </div>)}
      </div>
    </div>
    {failure && <div className="alt-schedule-failure" role="alert"><Icons.AlertCircle size={14} /><span>{failure.error}</span>
      <Button size="sm" variant="ghost" onClick={() => { const f = failure; setFailure(null); f.retry(); }}>Retry</Button>
      <Button size="sm" variant="ghost" aria-label="Dismiss" onClick={() => setFailure(null)}><Icons.X size={14} /></Button></div>}
    <span className="alt-schedule-sr" role="status" aria-live="polite" aria-atomic="true">{polite}</span>
    <span className="alt-schedule-sr" aria-live="assertive" aria-atomic="true">{assertive}</span>
  </div>;
}
