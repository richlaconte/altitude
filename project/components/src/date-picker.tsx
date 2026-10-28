import * as React from 'react';
import { cx, Icons, useApproach, useIsoLayoutEffect, useKeyFocus, useOutside, usePresence } from './core';
import { Tick } from './select';

/* Dates are ISO calendar dates, 'YYYY-MM-DD': no time, no time zone, serialisable, and comparable as strings. */
export type ISODate = string;
export interface DateRange { start: ISODate | null; end: ISODate | null }

const EXIT_3 = 160;
const pad = (n: number, w = 2) => String(n).padStart(w, '0');
const iso = (y: number, m: number, d: number) => `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
const parts = (date: ISODate) => { const [y, m, d] = date.split('-').map(Number); return { y, m, d }; };
const isISO = (v: unknown): v is ISODate => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && real(...(Object.values(parts(v)) as [number, number, number]));
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const real = (y: number, m: number, d: number) => m >= 1 && m <= 12 && d >= 1 && d <= daysIn(y, m) && y >= 1;
const utc = (date: ISODate) => { const { y, m, d } = parts(date); const t = new Date(Date.UTC(2000, m - 1, d)); t.setUTCFullYear(y); return t; };
const fromUTC = (t: Date) => iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
const addDays = (date: ISODate, n: number) => { const t = utc(date); t.setUTCDate(t.getUTCDate() + n); return fromUTC(t); };
const addMonths = (date: ISODate, n: number) => {
  const { y, m, d } = parts(date);
  const total = y * 12 + (m - 1) + n, ny = Math.floor(total / 12), nm = total - ny * 12 + 1;
  return iso(ny, nm, Math.min(d, daysIn(ny, nm)));
};
const weekday = (date: ISODate) => utc(date).getUTCDay();
const todayISO = () => { const t = new Date(); return iso(t.getFullYear(), t.getMonth() + 1, t.getDate()); };
const clamp = (date: ISODate, min?: ISODate, max?: ISODate) => (min && date < min ? min : max && date > max ? max : date);
const fmt = (locale: string | undefined, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' });
const firstDay = (locale?: string): number => {
  try {
    const loc: any = new Intl.Locale(locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-US'));
    const info = loc.getWeekInfo?.() ?? loc.weekInfo;
    if (info?.firstDay) return info.firstDay % 7;
  } catch { /* older engines: Sunday */ }
  return 0;
};

/* ───────────────────────── Presets ───────────────────────── */

/**
 * A named span for DateRangePicker: a fixed range, or a function of today, so "Last 7 days" stays relative and
 * re-resolves when today changes. `key` defaults to the label.
 */
export interface DatePreset { key?: string; label: string; range: DateRange | ((today: ISODate) => DateRange) }
const quarterStart = (date: ISODate) => { const { y, m } = parts(date); return iso(y, Math.floor((m - 1) / 3) * 3 + 1, 1); };
/** Ready-made relative presets. Each is a function, so labels and spans can be adjusted: `datePresets.lastDays(14)`. */
export const datePresets = {
  today: (): DatePreset => ({ key: 'today', label: 'Today', range: (t) => ({ start: t, end: t }) }),
  yesterday: (): DatePreset => ({ key: 'yesterday', label: 'Yesterday', range: (t) => ({ start: addDays(t, -1), end: addDays(t, -1) }) }),
  /** The last n days, today included: lastDays(7) on 27 Oct is 21–27 Oct. */
  lastDays: (n: number): DatePreset => ({ key: `last-${n}-days`, label: `Last ${n} days`, range: (t) => ({ start: addDays(t, -(n - 1)), end: t }) }),
  thisMonth: (): DatePreset => ({ key: 'this-month', label: 'This month', range: (t) => ({ start: t.slice(0, 8) + '01', end: t }) }),
  lastMonth: (): DatePreset => ({ key: 'last-month', label: 'Last month', range: (t) => { const s = addMonths(t.slice(0, 8) + '01', -1); return { start: s, end: addDays(t.slice(0, 8) + '01', -1) }; } }),
  thisQuarter: (): DatePreset => ({ key: 'this-quarter', label: 'This quarter', range: (t) => ({ start: quarterStart(t), end: t }) }),
  lastQuarter: (): DatePreset => ({ key: 'last-quarter', label: 'Last quarter', range: (t) => { const s = quarterStart(t); return { start: addMonths(s, -3), end: addDays(s, -1) }; } }),
  thisYear: (): DatePreset => ({ key: 'this-year', label: 'This year', range: (t) => ({ start: t.slice(0, 5) + '01-01', end: t }) }),
};
const presetKey = (p: DatePreset) => p.key ?? p.label;
const resolve = (p: DatePreset, today: ISODate): DateRange => (typeof p.range === 'function' ? p.range(today) : p.range);

/**
 * The preset rows: a listbox built like Select's options, one gliding highlight, the chosen row wearing the tick at its
 * end. It's its own Tab stop; ↑/↓ move, Enter or Space chooses.
 */
function PresetList({ presets, today, chosen, onChoose, min, max, listRef }: {
  presets: DatePreset[]; today: ISODate; chosen: string | null; onChoose: (p: DatePreset) => void; min?: ISODate; max?: ISODate;
  listRef: React.RefObject<HTMLDivElement | null>;
}) {
  const id = React.useId();
  const off = (p: DatePreset) => { const r = resolve(p, today); return (!!min && !!r.start && r.start < min) || (!!max && !!r.end && r.end > max); };
  const first = presets.findIndex((p) => presetKey(p) === chosen);
  const [active, setActive] = React.useState(first >= 0 ? first : Math.max(0, presets.findIndex((p) => !off(p))));
  const rows = React.useRef<(HTMLDivElement | null)[]>([]);
  const [hl, setHl] = React.useState<{ y: number; h: number } | null>(null);
  useIsoLayoutEffect(() => { const el = rows.current[active]; setHl(el ? { y: el.offsetTop, h: el.offsetHeight } : null); }, [active, presets.length]);
  const step = (d: number) => {
    for (let i = active + d; i >= 0 && i < presets.length; i += d) if (!off(presets[i])) { setActive(i); return; }
  };
  return (
    <div ref={listRef as React.Ref<HTMLDivElement>} role="listbox" tabIndex={0} aria-label="Presets" aria-activedescendant={`${id}-${active}`} className="alt-menu alt-date-presets" data-state="open"
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); step(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
        else if (e.key === 'Home') { e.preventDefault(); setActive(presets.findIndex((p) => !off(p))); }
        else if (e.key === 'End') { e.preventDefault(); for (let i = presets.length - 1; i >= 0; i--) if (!off(presets[i])) { setActive(i); break; } }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!off(presets[active])) onChoose(presets[active]); }
      }}>
      <span className="alt-menu-hl" aria-hidden="true" style={hl ? { transform: `translateY(${hl.y}px)`, height: hl.h, opacity: 1 } : { opacity: 0 }} />
      {presets.map((p, i) => {
        const k = presetKey(p), disabled = off(p);
        return (
          <div key={k} id={`${id}-${i}`} ref={(el) => { rows.current[i] = el; }} role="option" aria-selected={k === chosen} aria-disabled={disabled || undefined}
            data-active={i === active ? '' : undefined} className="alt-menu-item alt-select-option" style={{ ['--i' as string]: Math.min(i, 10) }}
            onPointerMove={() => { if (!disabled && i !== active) setActive(i); }} onClick={() => { if (!disabled) onChoose(p); }}>
            <span className="alt-menu-text">{p.label}</span>
            {k === chosen && <Tick />}
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Calendar ───────────────────────── */

interface GridProps {
  /** The chosen day (single), or the range's ends. */
  value: ISODate | null;
  range?: DateRange;
  onChoose: (date: ISODate) => void;
  min?: ISODate; max?: ISODate;
  isUnavailable?: (date: ISODate) => boolean;
  locale?: string; weekStartsOn?: number;
  /** Focus the active day when this changes to true. */
  autoFocus?: boolean;
  label?: string;
}

/** The month grid. Days are flush; the chosen day carries the one raised mark, which travels when another is chosen. */
function MonthGrid({ value, range, onChoose, min, max, isUnavailable, locale, weekStartsOn, autoFocus, label }: GridProps) {
  const today = React.useMemo(todayISO, []);
  const start = weekStartsOn ?? firstDay(locale);
  const [focus, setFocus] = React.useState<ISODate>(() => clamp(value ?? range?.start ?? today, min, max));
  const [hover, setHover] = React.useState<ISODate | null>(null);
  const [moved, setMoved] = React.useState(false);
  const grid = React.useRef<HTMLTableElement>(null);
  const markRef = React.useRef<HTMLSpanElement>(null);
  const lastMonth = React.useRef('');
  const { y, m } = parts(focus);
  const monthKey = `${y}-${m}`;
  const first = iso(y, m, 1);
  const lead = (weekday(first) - start + 7) % 7;
  const cells: (ISODate | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysIn(y, m) }, (_, i) => iso(y, m, i + 1))];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  const dayNames = Array.from({ length: 7 }, (_, i) => addDays('2023-01-01', (start + i) % 7)); // 2023-01-01 was a Sunday
  const long = fmt(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const heading = fmt(locale, { month: 'long', year: 'numeric' }).format(utc(first));
  const unavailable = (d: ISODate) => (min !== undefined && d < min) || (max !== undefined && d > max) || !!isUnavailable?.(d);
  // A range in progress previews from its start to the day under the pointer or focus (feedforward).
  const lo = range ? (range.start && !range.end && (hover ?? null) ? (hover! < range.start ? hover! : range.start) : range.start) : null;
  const hi = range ? (range.start && !range.end && (hover ?? null) ? (hover! < range.start ? range.start : hover!) : range.end) : null;
  const inSpan = (d: ISODate) => !!lo && !!hi && d >= lo && d <= hi;

  useIsoLayoutEffect(() => { if (autoFocus) grid.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus({ preventScroll: true }); }, [autoFocus]);
  useIsoLayoutEffect(() => { if (moved) { grid.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus({ preventScroll: true }); setMoved(false); } }, [moved, focus]);
  // One mark, carried to the chosen day within a month; a new month places it without travel (a cross-fade, not a move).
  useIsoLayoutEffect(() => {
    const mark = markRef.current;
    if (!mark) return;
    const target = value && grid.current?.querySelector<HTMLElement>(`[data-date="${value}"]`);
    const sameMonth = lastMonth.current === monthKey;
    lastMonth.current = monthKey;
    if (!target) { mark.style.opacity = '0'; return; }
    mark.style.transition = sameMonth && mark.style.opacity === '1' ? '' : 'none';
    // Offsets, not rects: the panel may still be scaling in as it opens.
    let x = 0, y = 0;
    for (let el: HTMLElement | null = target; el && el !== mark.parentElement; el = el.offsetParent as HTMLElement | null) { x += el.offsetLeft; y += el.offsetTop; }
    mark.style.transform = `translate(${x}px, ${y}px)`;
    mark.style.width = target.offsetWidth + 'px'; mark.style.height = target.offsetHeight + 'px';
    mark.style.opacity = '1';
    if (mark.style.transition === 'none') { void mark.offsetWidth; mark.style.transition = ''; }
  }, [value, monthKey]);

  const move = (to: ISODate) => { setFocus(clamp(to, min, max)); setMoved(true); };
  const onKey = (e: React.KeyboardEvent) => {
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const dow = (weekday(focus) - start + 7) % 7;
    const keys: Record<string, () => ISODate> = {
      ArrowLeft: () => addDays(focus, rtl ? 1 : -1), ArrowRight: () => addDays(focus, rtl ? -1 : 1),
      ArrowUp: () => addDays(focus, -7), ArrowDown: () => addDays(focus, 7),
      Home: () => addDays(focus, -dow), End: () => addDays(focus, 6 - dow),
      PageUp: () => addMonths(focus, e.shiftKey ? -12 : -1), PageDown: () => addMonths(focus, e.shiftKey ? 12 : 1),
    };
    if (keys[e.key]) { e.preventDefault(); const to = keys[e.key](); move(to); if (range) setHover(to); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!unavailable(focus)) onChoose(focus); }
  };
  return <div className="alt-cal" data-range={range ? '' : undefined}>
    <div className="alt-cal-head">
      <button type="button" className="alt-cal-nav" aria-label="Previous month" disabled={!!min && iso(y, m, 1) <= min.slice(0, 8) + '01'}
        onClick={() => setFocus(clamp(addMonths(focus, -1), min, max))}><Chevron dir={-1} /></button>
      <h2 className="alt-cal-title" aria-live="polite" id={`${label ?? 'cal'}-${monthKey}`}>{heading}</h2>
      <button type="button" className="alt-cal-nav" aria-label="Next month" disabled={!!max && iso(y, m, daysIn(y, m)) >= max}
        onClick={() => setFocus(clamp(addMonths(focus, 1), min, max))}><Chevron dir={1} /></button>
    </div>
    <div className="alt-cal-body">
      <table ref={grid} role="grid" className="alt-cal-grid" aria-label={label ? `${label}, ${heading}` : heading} onKeyDown={onKey} key={monthKey} onMouseLeave={() => setHover(null)}>
        <thead><tr>{dayNames.map((d) => <th key={d} scope="col" abbr={fmt(locale, { weekday: 'long' }).format(utc(d))}>{fmt(locale, { weekday: 'narrow' }).format(utc(d))}</th>)}</tr></thead>
        <tbody>{weeks.map((week, w) => <tr key={w}>{week.map((d, i) => {
          if (!d) return <td key={i} role="gridcell" />;
          const off = unavailable(d);
          const chosen = range ? d === range.start || d === range.end : d === value;
          const name = [long.format(utc(d)), d === today && 'today', range && d === range.start && 'start date', range && d === range.end && 'end date', off && 'unavailable'].filter(Boolean).join(', ');
          return <td key={i} role="gridcell" aria-selected={chosen || (range && inSpan(d)) ? true : undefined}>
            <button type="button" className="alt-cal-day" data-date={d} tabIndex={d === focus ? 0 : -1} aria-label={name} aria-disabled={off || undefined}
              data-today={d === today ? '' : undefined} data-chosen={chosen ? '' : undefined} data-span={range && inSpan(d) ? '' : undefined}
              data-span-start={range && d === lo ? '' : undefined} data-span-end={range && d === hi ? '' : undefined}
              onClick={() => { setFocus(d); if (!off) onChoose(d); }} onFocus={() => { if (range) setHover(d); }} onPointerEnter={() => { if (range && !off) setHover(d); }}>
              {Number(d.slice(8))}
            </button>
          </td>;
        })}</tr>)}</tbody>
      </table>
      {!range && <span ref={markRef} className="alt-cal-mark" aria-hidden="true" />}
    </div>
  </div>;
}

export interface CalendarProps {
  value?: ISODate | null;
  defaultValue?: ISODate | null;
  onValueChange?: (value: ISODate) => void;
  /** Earliest and latest days that can be chosen. */
  min?: ISODate;
  max?: ISODate;
  isUnavailable?: (date: ISODate) => boolean;
  /** Default: the browser's. */
  locale?: string;
  /** 0 Sunday … 6 Saturday. Default: the locale's. */
  weekStartsOn?: number;
  'aria-label'?: string;
  className?: string;
}
/** A month calendar laid on the page (level 0): no field, no panel. */
export function Calendar({ value, defaultValue = null, onValueChange, min, max, isUnavailable, locale, weekStartsOn, className, ...aria }: CalendarProps) {
  const [inner, setInner] = React.useState<ISODate | null>(defaultValue);
  const current = value !== undefined ? value : inner;
  return <div className={cx('alt-calendar', className)}>
    <MonthGrid value={isISO(current) ? current : null} label={aria['aria-label']} min={min} max={max} isUnavailable={isUnavailable} locale={locale} weekStartsOn={weekStartsOn}
      onChoose={(d) => { if (value === undefined) setInner(d); onValueChange?.(d); }} />
  </div>;
}

/* ───────────────────────── Segmented date field ───────────────────────── */

type Seg = 'day' | 'month' | 'year';
type Draft = Partial<Record<Seg, number>>;
const SEG_NAME: Record<Seg, string> = { day: 'Day', month: 'Month', year: 'Year' };
const SEG_HOLD: Record<Seg, string> = { day: 'DD', month: 'MM', year: 'YYYY' };
function order(locale?: string): { segs: Seg[]; sep: string } {
  const p = fmt(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(new Date(Date.UTC(2026, 10, 23)));
  const segs = p.filter((x) => x.type === 'day' || x.type === 'month' || x.type === 'year').map((x) => x.type as Seg);
  const sep = p.find((x) => x.type === 'literal')?.value ?? '/';
  return { segs: segs.length === 3 ? segs : ['month', 'day', 'year'], sep };
}
const draftOf = (v: ISODate | null): Draft => (v && isISO(v) ? (({ y, m, d }) => ({ year: y, month: m, day: d }))(parts(v)) : {});
const complete = (d: Draft) => d.day !== undefined && d.month !== undefined && d.year !== undefined && d.year >= 1000;

interface SegmentsProps {
  value: ISODate | null;
  onCommit: (value: ISODate | null, draft: Draft) => void;
  locale?: string; disabled?: boolean; invalid?: boolean;
  id?: string; name: string; describedBy?: string;
  onOpen: () => void;
  /** Focus moves on past the last segment. */
  onPastEnd?: () => void;
  firstRef?: React.Ref<HTMLSpanElement>;
}
/** Day, month and year as spinbuttons, in the locale's order: type digits, or use the arrows. */
function Segments({ value, onCommit, locale, disabled, id, name, describedBy, onOpen, onPastEnd, firstRef }: SegmentsProps) {
  const { segs, sep } = React.useMemo(() => order(locale), [locale]);
  const [draft, setDraft] = React.useState<Draft>(() => draftOf(value));
  const buffer = React.useRef<{ seg?: Seg; text: string }>({ text: '' });
  const refs = React.useRef<Partial<Record<Seg, HTMLSpanElement | null>>>({});
  const committed = React.useRef(value);
  // A value set from outside replaces the draft; our own commits don't.
  React.useEffect(() => { if (value !== committed.current) { committed.current = value; setDraft(draftOf(value)); } }, [value]);
  const publish = (next: Draft) => {
    setDraft(next);
    const v = complete(next) && real(next.year!, next.month!, next.day!) ? iso(next.year!, next.month!, next.day!) : null;
    committed.current = v;
    onCommit(v, next);
  };
  const focusSeg = (i: number) => { if (i >= segs.length) onPastEnd?.(); else refs.current[segs[Math.max(0, i)]]?.focus(); };
  const range = (s: Seg): [number, number] => s === 'day' ? [1, draft.month && draft.year ? daysIn(draft.year, draft.month) : 31] : s === 'month' ? [1, 12] : [1, 9999];
  const onKey = (s: Seg, i: number) => (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (disabled) return;
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const [lo, hi] = range(s);
    if (e.key === 'ArrowDown' && e.altKey) { e.preventDefault(); onOpen(); return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault(); buffer.current = { text: '' };
      const d = e.key === 'ArrowUp' ? 1 : -1;
      const now = draft[s] ?? (s === 'year' ? new Date().getFullYear() - d : d > 0 ? lo - 1 : hi + 1);
      publish({ ...draft, [s]: now + d > hi ? lo : now + d < lo ? hi : now + d });
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault(); buffer.current = { text: '' };
      focusSeg(i + ((e.key === 'ArrowRight') !== rtl ? 1 : -1));
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      const b = buffer.current.seg === s ? buffer.current.text.slice(0, -1) : '';
      buffer.current = { seg: s, text: b };
      const next = { ...draft }; if (b) next[s] = Number(b); else delete next[s];
      publish(next);
      if (!b && draft[s] === undefined && e.key === 'Backspace') focusSeg(i - 1);
    } else if (/^\d$/.test(e.key)) {
      e.preventDefault();
      const text = (buffer.current.seg === s ? buffer.current.text : '') + e.key;
      buffer.current = { seg: s, text };
      const n = Number(text);
      publish({ ...draft, [s]: n });
      // Move on once no further digit could make a valid value.
      const max = s === 'year' ? 4 : 2;
      // Typing allows any day up to 31: the month may change next, and a real-date check reports 31 February.
      const most = s === 'day' ? 31 : s === 'month' ? 12 : 9999;
      if (text.length >= max || (s !== 'year' && n * 10 > most)) { buffer.current = { text: '' }; focusSeg(i + 1); }
    } else if (e.key === sep.trim() || e.key === '/' || e.key === '.' || e.key === '-') { e.preventDefault(); if (draft[s] !== undefined) { buffer.current = { text: '' }; focusSeg(i + 1); } }
  };
  return <span className="alt-date-segs" data-name={name}>
    {segs.map((s, i) => {
      const v = draft[s];
      const [lo, hi] = range(s);
      const shown = v === undefined ? SEG_HOLD[s] : s === 'year' ? String(v) : pad(v);
      return <React.Fragment key={s}>
        {i > 0 && <span className="alt-date-sep" aria-hidden="true">{sep.trim() || '/'}</span>}
        <span ref={(el) => { refs.current[s] = el; if (i === 0 && firstRef) typeof firstRef === 'function' ? firstRef(el) : ((firstRef as React.MutableRefObject<HTMLSpanElement | null>).current = el); }}
          id={i === 0 ? id : undefined} role="spinbutton" tabIndex={disabled ? -1 : 0} className="alt-date-seg" data-placeholder={v === undefined ? '' : undefined}
          aria-label={`${name}${SEG_NAME[s]}`} aria-valuemin={lo} aria-valuemax={hi} aria-valuenow={v} aria-valuetext={v === undefined ? 'Empty' : String(v)}
          aria-describedby={describedBy} aria-disabled={disabled || undefined} inputMode="numeric" onKeyDown={onKey(s, i)}
          onBlur={() => { buffer.current = { text: '' }; }}>{shown}</span>
      </React.Fragment>;
    })}
  </span>;
}

/* ───────────────────────── DatePicker and DateRangePicker ───────────────────────── */

interface PickerBase {
  min?: ISODate;
  max?: ISODate;
  isUnavailable?: (date: ISODate) => boolean;
  locale?: string;
  weekStartsOn?: number;
  /** Goes on the first segment; Field sets it so its label points here. */
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
  /** Start with the calendar open (for documentation). */
  defaultOpen?: boolean;
}
export interface DatePickerProps extends PickerBase {
  value?: ISODate | null;
  defaultValue?: ISODate | null;
  /** Called with a complete, real, allowed date, or null when the field is cleared. */
  onValueChange?: (value: ISODate | null) => void;
}
export interface DateRangePickerProps extends PickerBase {
  value?: DateRange;
  defaultValue?: DateRange;
  onValueChange?: (value: DateRange) => void;
  /**
   * Named spans offered beside the calendar ("Last 7 days", "This quarter"): build them with `datePresets`, or pass
   * `{ label, range }`. Choosing one fills the field with its name and dates; typing or picking days clears it.
   */
  presets?: DatePreset[];
  /** The chosen preset's key, controlled; null when the range is custom. */
  preset?: string | null;
  /** The preset to start with, uncontrolled. Without a `defaultValue`, the range starts as this preset's. */
  defaultPreset?: string | null;
  onPresetChange?: (preset: string | null) => void;
  /** Today, as an ISO date: relative presets resolve against it, and re-resolve when it changes. Default: the local date. */
  today?: ISODate;
}

function usePicker(defaultOpen: boolean) {
  const [open, setOpen] = React.useState(defaultOpen);
  const root = React.useRef<HTMLDivElement>(null);
  const button = React.useRef<HTMLButtonElement>(null);
  const { mounted, state } = usePresence(open, EXIT_3);
  useOutside(root, open, () => setOpen(false));
  useApproach();
  useKeyFocus();
  const close = (refocus = true) => { setOpen(false); if (refocus) button.current?.focus({ preventScroll: true }); };
  return { open, setOpen, root, button, mounted, state, close };
}

function problem(v: ISODate | null, draft: Draft, { min, max, isUnavailable, locale }: PickerBase): string | null {
  const medium = fmt(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  if (!v) return complete(draft) ? 'Enter a real date.' : null;
  if (min && v < min) return `Enter a date on or after ${medium.format(utc(min))}.`;
  if (max && v > max) return `Enter a date on or before ${medium.format(utc(max))}.`;
  if (isUnavailable?.(v)) return `${medium.format(utc(v))} isn’t available.`;
  return null;
}

/**
 * A date in a field, typed or picked. The field is an opening built like Select; its floor rises flush once it holds a
 * date. The calendar floats at level 3; days are flush and the chosen one carries the raised accent mark.
 */
export function DatePicker({ value, defaultValue = null, onValueChange, min, max, isUnavailable, locale, weekStartsOn, id, name, disabled,
  required, invalid, size = 'md', className, defaultOpen = false, ...aria }: DatePickerProps) {
  const [inner, setInner] = React.useState<ISODate | null>(defaultValue);
  const current = value !== undefined ? value : inner;
  const [error, setError] = React.useState<string | null>(null);
  const [partial, setPartial] = React.useState(false);
  const { open, setOpen, root, button, mounted, state, close } = usePicker(defaultOpen);
  const auto = React.useId();
  const panelId = auto + '-panel', formatId = auto + '-format', errorId = auto + '-error';
  const { segs, sep } = React.useMemo(() => order(locale), [locale]);
  const set = (v: ISODate | null) => { if (value === undefined) setInner(v); if (v !== current) onValueChange?.(v); };
  const commit = (v: ISODate | null, draft: Draft) => {
    const issue = problem(v, draft, { min, max, isUnavailable, locale });
    setError(issue); setPartial(!v && Object.keys(draft).length > 0);
    set(issue ? null : v);
  };
  const choose = (d: ISODate) => { setError(null); setPartial(false); set(d); close(); };
  const describedBy = [aria['aria-describedby'], formatId, error ? errorId : undefined].filter(Boolean).join(' ');
  return <div ref={root} className={cx('alt-date-picker', className)} data-open={open ? '' : undefined}>
    <div className="alt-input" data-size={size} data-approach="56" data-filled={current && !partial ? '' : undefined} data-invalid={invalid || error ? '' : undefined}
      data-disabled={disabled ? '' : undefined} role="group" aria-label={aria['aria-label']} aria-labelledby={aria['aria-labelledby']} aria-describedby={describedBy}
      aria-invalid={invalid || error ? true : undefined}>
      <Segments value={current} onCommit={commit} locale={locale} disabled={disabled} id={id} name="" describedBy={describedBy} onOpen={() => setOpen(true)} />
      <button ref={button} type="button" className="alt-date-button" aria-label="Choose date" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined}
        disabled={disabled} onClick={() => setOpen(!open)}><CalendarIcon /></button>
    </div>
    {name && <input type="hidden" name={name} value={current ?? ''} required={required} />}
    <span id={formatId} hidden>Format: {segs.map((s) => SEG_HOLD[s]).join(sep.trim() || '/')}</span>
    {error && <p id={errorId} className="alt-field-error alt-date-error"><Icons.AlertCircle size={14} />{error}</p>}
    {mounted && <div id={panelId} role="dialog" aria-label="Choose date" className="alt-pop alt-date-panel" data-state={state} data-side="bottom" data-align="start"
      onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }}>
      <MonthGrid value={current} onChoose={choose} min={min} max={max} isUnavailable={isUnavailable} locale={locale} weekStartsOn={weekStartsOn} autoFocus={state === 'open'} />
    </div>}
  </div>;
}

/** Two dates as one span. In the calendar the span is a sunk track between two raised ends, the Slider's build. */
export function DateRangePicker({ value, defaultValue, onValueChange, min, max, isUnavailable, locale, weekStartsOn, id, name,
  disabled, required, invalid, size = 'md', className, defaultOpen = false, presets, preset: presetProp, defaultPreset = null, onPresetChange, today: todayProp, ...aria }: DateRangePickerProps) {
  const today = todayProp ?? todayISO();
  const startPreset = presets?.find((p) => presetKey(p) === defaultPreset);
  const [inner, setInner] = React.useState<DateRange>(() => defaultValue ?? (startPreset ? resolve(startPreset, today) : { start: null, end: null }));
  const current = value !== undefined ? value : inner;
  const [presetOwn, setPresetOwn] = React.useState<string | null>(defaultPreset);
  const presetKeyNow = presetProp !== undefined ? presetProp : presetOwn;
  const setPreset = (k: string | null) => { if (k !== presetKeyNow) onPresetChange?.(k); if (presetProp === undefined) setPresetOwn(k); };
  const activePreset = presets?.find((p) => presetKey(p) === presetKeyNow) ?? null;
  // The preset shows in the field only while the range is still the preset's: a value set from outside to something else is custom.
  const presetRange = activePreset ? resolve(activePreset, today) : null;
  const showPreset = !!presetRange && presetRange.start === current.start && presetRange.end === current.end;
  const [editing, setEditing] = React.useState(false);
  const [glow, setGlow] = React.useState<'a' | 'b' | undefined>(undefined);
  const presetsRef = React.useRef<HTMLDivElement>(null);
  const firstSeg = React.useRef<HTMLSpanElement>(null);
  const [picking, setPicking] = React.useState<DateRange | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const { open, setOpen, root, button, mounted, state, close } = usePicker(defaultOpen);
  const endFirst = React.useRef<HTMLSpanElement>(null);
  const auto = React.useId();
  const panelId = auto + '-panel', formatId = auto + '-format', errorId = auto + '-error';
  const { segs, sep } = React.useMemo(() => order(locale), [locale]);
  const set = (v: DateRange) => { if (value === undefined) setInner(v); onValueChange?.(v); };
  // Relative presets stay relative: when today changes, a chosen preset re-resolves.
  const lastToday = React.useRef(today);
  React.useEffect(() => {
    if (lastToday.current === today) return;
    lastToday.current = today;
    if (!activePreset) return;
    const r = resolve(activePreset, today);
    if (r.start !== current.start || r.end !== current.end) set(r);
  }, [today]); // eslint-disable-line react-hooks/exhaustive-deps
  const commit = (which: 'start' | 'end') => (v: ISODate | null, draft: Draft) => {
    let issue = problem(v, draft, { min, max, isUnavailable, locale });
    const next = { ...current, [which]: issue ? null : v };
    if (!issue && next.start && next.end && next.end < next.start) { issue = 'The end date must be on or after the start date.'; next[which] = null; }
    setError(issue);
    if (next.start !== current.start || next.end !== current.end) { set(next); setPreset(null); }
  };
  const choosePreset = (p: DatePreset) => {
    setError(null); setEditing(false); set(resolve(p, today)); setPreset(presetKey(p)); setGlow((g) => (g === 'a' ? 'b' : 'a')); close();
  };
  // Focus goes to the presets when the panel opens, so the common choice is one keypress away.
  React.useEffect(() => { if (state === 'open' && presets?.length) presetsRef.current?.focus({ preventScroll: true }); }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  useIsoLayoutEffect(() => { if (editing) firstSeg.current?.focus(); }, [editing]);
  React.useEffect(() => { if (!showPreset) setEditing(false); }, [showPreset]);
  React.useEffect(() => { if (!open) setPicking(null); }, [open]);
  const choose = (d: ISODate) => {
    if (!picking || !picking.start || picking.end) { setPicking({ start: d, end: null }); return; }
    const [s, e] = d < picking.start ? [d, picking.start] : [picking.start, d];
    // A span can't cross a day that isn't available.
    for (let x = s; x <= e; x = addDays(x, 1)) if (isUnavailable?.(x)) { setError('Choose a span without unavailable days.'); setPicking({ start: d, end: null }); return; }
    setError(null); set({ start: s, end: e }); setPreset(null); close();
  };
  const describedBy = [aria['aria-describedby'], formatId, error ? errorId : undefined].filter(Boolean).join(' ');
  const shown = picking ?? current;
  const short = fmt(locale, { day: 'numeric', month: 'short' }), full = fmt(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  const sameYear = current.start?.slice(0, 4) === current.end?.slice(0, 4) && current.start?.slice(0, 4) === today.slice(0, 4);
  const shortOf = (d: ISODate) => (sameYear ? short : fmt(locale, { day: 'numeric', month: 'short', year: 'numeric' })).format(utc(d));
  const presetFace = showPreset && !editing && current.start && current.end;
  return <div ref={root} className={cx('alt-date-picker alt-date-range', className)} data-open={open ? '' : undefined} data-presets={presets?.length ? '' : undefined}>
    <div className="alt-input" data-size={size} data-approach="56" data-filled={current.start && current.end ? '' : undefined} data-invalid={invalid || error ? '' : undefined}
      data-disabled={disabled ? '' : undefined} role="group" aria-label={aria['aria-label']} aria-labelledby={aria['aria-labelledby']} aria-describedby={describedBy}
      aria-invalid={invalid || error ? true : undefined}>
      {presetFace
        ? <button type="button" id={id} className="alt-date-preset" data-glow={glow} disabled={disabled} aria-describedby={describedBy}
          aria-label={`${activePreset!.label}, ${full.format(utc(current.start!))} to ${full.format(utc(current.end!))}. Type to enter dates.`}
          onClick={() => setOpen(!open)}
          onKeyDown={(e) => {
            // Typing a digit, or Backspace, turns the name back into the date segments to edit.
            if (/^\d$/.test(e.key) || e.key === 'Backspace' || e.key === 'F2') { e.preventDefault(); setEditing(true); }
            else if (e.key === 'ArrowDown' && e.altKey) { e.preventDefault(); setOpen(true); }
          }}>
          <span className="alt-date-preset-name">{activePreset!.label}</span>
          <span className="alt-date-preset-dates" aria-hidden="true">· {shortOf(current.start!)} – {shortOf(current.end!)}</span>
        </button>
        : <>
          <Segments value={current.start} onCommit={commit('start')} locale={locale} disabled={disabled} id={id} name="Start " describedBy={describedBy}
            onOpen={() => setOpen(true)} onPastEnd={() => endFirst.current?.focus()} firstRef={firstSeg} />
          <span className="alt-date-to" aria-hidden="true">–</span>
          <Segments value={current.end} onCommit={commit('end')} locale={locale} disabled={disabled} name="End " describedBy={describedBy} onOpen={() => setOpen(true)} firstRef={endFirst} />
        </>}
      <button ref={button} type="button" className="alt-date-button" aria-label="Choose dates" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined}
        disabled={disabled} onClick={() => setOpen(!open)}><CalendarIcon /></button>
    </div>
    {name && <><input type="hidden" name={`${name}-start`} value={current.start ?? ''} required={required} /><input type="hidden" name={`${name}-end`} value={current.end ?? ''} required={required} /></>}
    <span id={formatId} hidden>Format: {segs.map((s) => SEG_HOLD[s]).join(sep.trim() || '/')}</span>
    {error && <p id={errorId} className="alt-field-error alt-date-error"><Icons.AlertCircle size={14} />{error}</p>}
    {mounted && <div id={panelId} role="dialog" aria-label="Choose dates" className="alt-pop alt-date-panel" data-state={state} data-side="bottom" data-align="start"
      onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }}>
      {presets?.length
        ? <div className="alt-date-panes">
          <PresetList presets={presets} today={today} chosen={showPreset ? presetKeyNow : null} onChoose={choosePreset} min={min} max={max} listRef={presetsRef} />
          <div className="alt-date-custom">
            <p className="alt-date-step" aria-live="polite">{picking?.start && !picking.end ? 'Choose the end date' : 'Or choose the start date'}</p>
            <MonthGrid value={null} range={shown} onChoose={choose} min={min} max={max} isUnavailable={isUnavailable} locale={locale} weekStartsOn={weekStartsOn} />
          </div>
        </div>
        : <>
          <p className="alt-date-step" aria-live="polite">{picking?.start && !picking.end ? 'Choose the end date' : 'Choose the start date'}</p>
          <MonthGrid value={null} range={shown} onChoose={choose} min={min} max={max} isUnavailable={isUnavailable} locale={locale} weekStartsOn={weekStartsOn} autoFocus={state === 'open'} />
        </>}
    </div>}
  </div>;
}

const CalendarIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <rect x="2.5" y="3.5" width="11" height="10" rx="2" /><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
  </svg>
);

/** Points back or forward; mirrors under right-to-left. */
const Chevron = ({ dir }: { dir: 1 | -1 }) => (
  <svg className="alt-cal-chevron" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir < 0 ? 'M10 3.5 5.5 8l4.5 4.5' : 'M6 3.5 10.5 8 6 12.5'} />
  </svg>
);
