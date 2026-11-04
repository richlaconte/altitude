import * as React from 'react';
import { cx, FIELD_GROUP, useControllable } from './core';

/* ───────────────────────── TimeSlotPicker ───────────────────────── */

export interface TimeSlotPickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** The chosen time, as a TimeSlot's value ("09:30"). '' for none. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Formats each slot's time ("9:30 AM", "09:30"). Default: the browser's. */
  locale?: string;
  /** Set by Field when there's an error: the free slots take the critical tint and rim. */
  invalid?: boolean;
  required?: boolean;
  disabled?: boolean;
  /** The day's slots are loading: imprints at slot size, and aria-busy. */
  loading?: boolean;
  /** How many imprints while loading. Default 12. */
  loadingCount?: number;
  /** TimeSlot items, in time order. */
  children?: React.ReactNode;
}
export interface TimeSlotProps {
  /** The time, "HH:MM" on a 24-hour clock. It's the value and, formatted for `locale`, the label. */
  value: string;
  /** Taken: lies flush, struck through, says "Booked", and can't be chosen. */
  booked?: boolean;
  /** The label as given instead of the formatted time. */
  label?: React.ReactNode;
  className?: string;
}

type Ctx = { value: string; choose: (v: string) => void; focusable: string; locale?: string; disabled?: boolean; format: (v: string) => string };
const SlotCtx = React.createContext<Ctx | null>(null);

const clockOf = (value: string) => { const m = /^(\d{1,2}):(\d{2})/.exec(value); return m ? { h: +m[1], m: +m[2] } : null; };

/**
 * One open time from a day's slots. Each free time is an opening you can put the booking in (a well); the chosen one is
 * filled: the accent pours in and a raised check sits on it. A booked time is part of the record, so it lies flush,
 * struck through, with the word "Booked". A radio group laid out as a grid: Tab comes to the chosen or first free time,
 * arrows move between free times (↑ and ↓ by row), Space chooses, and Enter submits the form it's in.
 */
export function TimeSlotPicker({ value, defaultValue = '', onValueChange, locale, invalid, required, disabled, loading, loadingCount = 12, className, children, onKeyDown, ...rest }: TimeSlotPickerProps) {
  const [v, set] = useControllable(value, defaultValue, onValueChange);
  const root = React.useRef<HTMLDivElement>(null);
  // A 24-hour locale writes the hour with two digits ("09:30"); a 12-hour one doesn't ("9:30 AM").
  const fmt = React.useMemo(() => {
    const cycle = new Intl.DateTimeFormat(locale, { hour: 'numeric', timeZone: 'UTC' }).resolvedOptions().hourCycle;
    return new Intl.DateTimeFormat(locale, { hour: cycle === 'h23' || cycle === 'h24' ? '2-digit' : 'numeric', minute: '2-digit', timeZone: 'UTC' });
  }, [locale]);
  const format = React.useCallback((t: string) => { const c = clockOf(t); return c ? fmt.format(Date.UTC(2000, 0, 1, c.h, c.m)) : t; }, [fmt]);

  // The one tab stop: the chosen time if it's free, else the first free one.
  const free = React.Children.toArray(children).filter((c): c is React.ReactElement<TimeSlotProps> => React.isValidElement(c) && !(c.props as TimeSlotProps).booked).map((c) => c.props.value);
  const focusable = free.includes(v) ? v : free[0] ?? '';

  const slots = () => [...(root.current?.querySelectorAll<HTMLButtonElement>('.alt-slot:not([aria-disabled="true"])') ?? [])];
  const move = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    const list = slots(), at = list.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    let to = -1;
    if (e.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) to = Math.min(list.length - 1, at + 1);
    else if (e.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) to = Math.max(0, at - 1);
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = list.length - 1;
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      // The free time in the next row (or the one before) nearest the same column.
      const here = list[at].getBoundingClientRect(), down = e.key === 'ArrowDown', mid = here.left + here.width / 2;
      let best = -1, bestRow = Infinity, bestX = Infinity;
      list.forEach((el, i) => {
        const r = el.getBoundingClientRect(), dy = down ? r.top - here.top : here.top - r.top;
        if (dy < here.height / 2) return;
        const dx = Math.abs(r.left + r.width / 2 - mid);
        if (dy < bestRow - 1 || (Math.abs(dy - bestRow) <= 1 && dx < bestX)) { best = i; bestRow = dy; bestX = dx; }
      });
      to = best;
    } else return;
    e.preventDefault();
    if (to >= 0) list[to].focus();
  };

  if (loading) return (
    <div role="radiogroup" className={cx('alt-slots', className)} aria-busy="true" aria-invalid={invalid || undefined} aria-required={required || undefined} {...rest}>
      {Array.from({ length: loadingCount }, (_, i) => <span key={i} className="alt-skeleton alt-slot-imprint" aria-hidden="true" />)}
    </div>
  );
  return (
    <SlotCtx.Provider value={{ value: v, choose: set, focusable, locale, disabled, format }}>
      <div ref={root} role="radiogroup" className={cx('alt-slots', className)} data-invalid={invalid ? '' : undefined} aria-invalid={invalid || undefined}
        aria-required={required || undefined} aria-disabled={disabled || undefined} onKeyDown={move} tabIndex={-1} {...rest}
        onFocus={(e) => {
          rest.onFocus?.(e);
          // Focus sent to the group itself (an ErrorSummary link) goes on to its tab stop, so the arrow keys work at once.
          if (e.target === e.currentTarget) root.current?.querySelector<HTMLElement>('.alt-slot[tabindex="0"]')?.focus();
        }}>
        {children}
      </div>
    </SlotCtx.Provider>
  );
}
(TimeSlotPicker as any)[FIELD_GROUP] = true;

/** One time in a TimeSlotPicker. */
export function TimeSlot({ value, booked, label, className }: TimeSlotProps) {
  const ctx = React.useContext(SlotCtx);
  if (!ctx) throw new Error('TimeSlot must be inside a TimeSlotPicker.');
  const chosen = ctx.value === value && !booked;
  const text = label ?? ctx.format(value);
  const off = booked || ctx.disabled;
  return (
    <button type="button" role="radio" className={cx('alt-slot', className)} aria-checked={chosen} aria-disabled={off || undefined}
      tabIndex={!off && ctx.focusable === value ? 0 : -1} data-value={value} data-booked={booked ? '' : undefined} data-chosen={chosen ? '' : undefined}
      onClick={() => { if (!off) ctx.choose(value); }}
      onKeyDown={(e) => {
        if (e.key === ' ') { e.preventDefault(); if (!off) ctx.choose(value); }
        // Enter does what it does on a native radio: submits the form it's in (a booking step's Continue). Outside a form it chooses.
        else if (e.key === 'Enter') { e.preventDefault(); const form = e.currentTarget.form; if (form) form.requestSubmit(); else if (!off) ctx.choose(value); }
      }}>
      <span className="alt-slot-fill" aria-hidden="true" />
      <span className="alt-slot-time">{text}</span>
      {booked && <span className="alt-slot-booked">Booked</span>}
      <span className="alt-slot-mark" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-6.5" /></svg>
      </span>
    </button>
  );
}
