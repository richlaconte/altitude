import * as React from 'react';
import { cx, Icons, useApproach, useControllable, useKeyFocus } from './core';

/* ───────────────────────── TimeInput ───────────────────────── */

const pad = (n: number) => String(n).padStart(2, '0');
type Seg = 'hour' | 'minute' | 'period';
type Draft = { hour?: number; minute?: number; pm?: boolean };
const toMin = (t: string) => { const m = /^(\d{1,2}):(\d{2})$/.exec(t); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; };

/** Whether the locale writes times on a 12-hour clock, and its words for AM and PM. */
function clockOf(locale: string | undefined, hourCycle: 'auto' | 'h12' | 'h23') {
  const f = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' });
  const h12 = hourCycle === 'auto' ? /h1[12]/.test(f.resolvedOptions().hourCycle ?? 'h23') : hourCycle === 'h12';
  const period = (h: number) => new Intl.DateTimeFormat(locale, { hour: 'numeric', hour12: true }).formatToParts(new Date(2026, 0, 1, h)).find((p) => p.type === 'dayPeriod')?.value ?? (h < 12 ? 'AM' : 'PM');
  const sep = f.formatToParts(new Date(2026, 0, 1, 9, 30)).find((p) => p.type === 'literal' && p.value.trim())?.value.trim() ?? ':';
  return { h12, am: period(9), pm: period(15), sep };
}

export interface TimeInputProps {
  /** A time of day, "HH:mm" on a 24-hour clock, or null. It's only set once every segment holds a value. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** The arrow keys move the minutes by this much. Default 1. */
  step?: number;
  /** "auto" (default) follows the locale; "h12" shows AM/PM; "h23" a 24-hour clock. */
  hourCycle?: 'auto' | 'h12' | 'h23';
  /** Earliest and latest allowed times ("09:00", "17:30"). A time outside them is invalid. */
  min?: string;
  max?: string;
  /** An IANA time zone ("Europe/Berlin"). Its short name is shown after the time and spoken with it. The value isn't converted. */
  timeZone?: string;
  locale?: string;
  invalid?: boolean;
  disabled?: boolean;
  required?: boolean;
  size?: 'sm' | 'md';
  /** Submits the value with a form, in a hidden input. */
  name?: string;
  id?: string;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}
/**
 * A time of day, typed by segment like DatePicker's dates. It's an opening that fills only when every segment holds a
 * value: a partial time ("09:__") is still a hole. Hours, minutes and AM/PM are spinbuttons in a labelled group.
 */
export function TimeInput({ value, defaultValue = null, onValueChange, step = 1, hourCycle = 'auto', min, max, timeZone, locale, invalid, disabled, required,
  size = 'md', name, id, className, 'aria-describedby': describedBy, ...aria }: TimeInputProps) {
  useApproach();
  useKeyFocus();
  const [v, setV] = useControllable<string | null>(value, defaultValue, onValueChange);
  const clock = React.useMemo(() => clockOf(locale, hourCycle), [locale, hourCycle]);
  const segs: Seg[] = clock.h12 ? ['hour', 'minute', 'period'] : ['hour', 'minute'];
  const draftOf = (t: string | null): Draft => { const m = t ? toMin(t) : NaN; return isNaN(m) ? {} : { hour: Math.floor(m / 60), minute: m % 60, pm: m >= 720 }; };
  const [draft, setDraft] = React.useState<Draft>(() => draftOf(v));
  const committed = React.useRef(v);
  React.useEffect(() => { if (v !== committed.current) { committed.current = v; setDraft(draftOf(v)); } }, [v]); // eslint-disable-line react-hooks/exhaustive-deps
  const buffer = React.useRef<{ seg?: Seg; text: string }>({ text: '' });
  const refs = React.useRef<Partial<Record<Seg, HTMLSpanElement | null>>>({});

  // In the draft, hour is always 0–23; on a 12-hour clock it's shown as 1–12 with the period beside it.
  const complete = (d: Draft) => d.hour !== undefined && d.minute !== undefined && (!clock.h12 || d.pm !== undefined);
  const publish = (d: Draft) => {
    setDraft(d);
    const t = complete(d) ? `${pad(d.hour!)}:${pad(d.minute!)}` : null;
    committed.current = t;
    setV(t);
  };
  const shownHour = (h: number) => (clock.h12 ? ((h + 11) % 12) + 1 : h);
  const setHour12 = (d: Draft, h12: number) => ({ ...d, hour: (h12 % 12) + (d.pm ? 12 : 0) });
  const focusSeg = (i: number) => refs.current[segs[Math.max(0, Math.min(segs.length - 1, i))]]?.focus();

  const onKey = (s: Seg, i: number) => (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (disabled) return;
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); buffer.current = { text: '' }; focusSeg(i + ((e.key === 'ArrowRight') !== rtl ? 1 : -1)); return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault(); buffer.current = { text: '' };
      const d = e.key === 'ArrowUp' ? 1 : -1;
      if (s === 'period') publish({ ...draft, pm: !(draft.pm ?? d < 0), hour: draft.hour === undefined ? undefined : (draft.hour + 12) % 24 });
      else if (s === 'hour') { const h = draft.hour ?? (d > 0 ? -1 : 24); const n = (h + d + 24) % 24; publish({ ...draft, hour: n, pm: clock.h12 ? (draft.pm ?? n >= 12) : n >= 12 }); }
      else { const m = draft.minute ?? (d > 0 ? -step : 60); const snapped = d > 0 ? Math.floor(m / step) * step + step : Math.ceil(m / step) * step - step; publish({ ...draft, minute: ((snapped % 60) + 60) % 60 }); }
      return;
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      const b = buffer.current.seg === s ? buffer.current.text.slice(0, -1) : '';
      buffer.current = { seg: s, text: b };
      const next: Draft = { ...draft };
      if (s === 'period') delete next.pm;
      else if (b) Object.assign(next, s === 'hour' ? (clock.h12 ? setHour12(next, Number(b)) : { hour: Number(b) }) : { minute: Number(b) });
      else delete next[s];
      publish(next);
      if (!b && draft[s === 'period' ? 'pm' : s] === undefined && e.key === 'Backspace') focusSeg(i - 1);
      return;
    }
    if (s === 'period') {
      const k = e.key.toLowerCase();
      if (k === clock.am[0]?.toLowerCase() || k === 'a') { e.preventDefault(); publish({ ...draft, pm: false, hour: draft.hour === undefined ? undefined : draft.hour % 12 }); }
      else if (k === clock.pm[0]?.toLowerCase() || k === 'p') { e.preventDefault(); publish({ ...draft, pm: true, hour: draft.hour === undefined ? undefined : (draft.hour % 12) + 12 }); }
      return;
    }
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      const most = s === 'minute' ? 59 : clock.h12 ? 12 : 23;
      // A digit that can't follow the ones typed so far starts the segment again.
      let text = (buffer.current.seg === s ? buffer.current.text : '') + e.key;
      if (Number(text) > most) text = e.key;
      buffer.current = { seg: s, text };
      const n = Number(text);
      publish(s === 'hour' ? (clock.h12 ? setHour12(draft, n === 0 ? 12 : n) : { ...draft, hour: n, pm: n >= 12 }) : { ...draft, minute: n });
      // Move on once no further digit could make a valid value.
      if (text.length >= 2 || n * 10 > most) { buffer.current = { text: '' }; focusSeg(i + 1); }
      return;
    }
    if (e.key === clock.sep || e.key === ':' || e.key === '.') { e.preventDefault(); buffer.current = { text: '' }; focusSeg(i + 1); }
  };

  const t = complete(draft) ? draft.hour! * 60 + draft.minute! : NaN;
  const outside = !isNaN(t) && ((min !== undefined && t < toMin(min)) || (max !== undefined && t > toMin(max)));
  const bad = invalid || outside;
  const zone = timeZone ? new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'short' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value : undefined;
  const zoneId = React.useId();

  return (
    <div className={cx('alt-input', 'alt-time', className)} data-size={size} data-approach="56" data-filled={complete(draft) ? '' : undefined} data-invalid={bad ? '' : undefined}
      data-disabled={disabled ? '' : undefined} role="group" {...aria} aria-describedby={describedBy} aria-invalid={bad || undefined}>
      <Icons.Clock className="alt-input-adorn alt-time-icon" size={16} />
      <span className="alt-date-segs">
        {segs.map((s, i) => {
          const val = s === 'period' ? (draft.pm === undefined ? undefined : draft.pm ? 1 : 0) : draft[s];
          const shown = s === 'period' ? (val === undefined ? clock.am.replace(/./g, '–') : val ? clock.pm : clock.am) : val === undefined ? '––' : pad(s === 'hour' ? shownHour(val) : val);
          const [lo, hi] = s === 'minute' ? [0, 59] : s === 'period' ? [0, 1] : clock.h12 ? [1, 12] : [0, 23];
          const label = s === 'hour' ? 'Hour' : s === 'minute' ? 'Minute' : 'AM/PM';
          return <React.Fragment key={s}>
            {i === 1 && <span className="alt-date-sep" aria-hidden="true">{clock.sep}</span>}
            {i === 2 && <span className="alt-time-gap" aria-hidden="true" />}
            <span ref={(el) => { refs.current[s] = el; }} id={i === 0 ? id : undefined} role="spinbutton" tabIndex={disabled ? -1 : 0}
              className="alt-date-seg" data-placeholder={val === undefined ? '' : undefined} aria-label={label}
              aria-valuemin={lo} aria-valuemax={hi} aria-valuenow={val === undefined ? undefined : s === 'hour' ? shownHour(val) : val}
              aria-valuetext={val === undefined ? 'Empty' : s === 'period' ? shown : String(s === 'hour' ? shownHour(val) : val)}
              aria-describedby={[describedBy, zone && zoneId].filter(Boolean).join(' ') || undefined} aria-disabled={disabled || undefined} aria-required={required || undefined}
              inputMode={s === 'period' ? 'text' : 'numeric'} onKeyDown={onKey(s, i)} onBlur={() => { buffer.current = { text: '' }; }}>{shown}</span>
          </React.Fragment>;
        })}
      </span>
      {zone && <span id={zoneId} className="alt-input-adorn alt-time-zone">{zone}</span>}
      {name && <input type="hidden" name={name} value={v ?? ''} required={required} />}
    </div>
  );
}
