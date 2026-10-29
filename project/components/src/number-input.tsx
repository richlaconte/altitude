import * as React from 'react';
import { cx, Icons, useApproach, useControllable, useKeyFocus } from './core';

/* ───────────────────────── NumberInput ───────────────────────── */

/** The locale's separators, and the unit, currency or percent sign the format puts before or after the number. */
function partsOf(locale: string | undefined, format: Intl.NumberFormatOptions) {
  const parts = new Intl.NumberFormat(locale, format).formatToParts(12345.6);
  const decimal = new Intl.NumberFormat(locale).formatToParts(1.5).find((p) => p.type === 'decimal')?.value ?? '.';
  const group = new Intl.NumberFormat(locale).formatToParts(12345).find((p) => p.type === 'group')?.value ?? ',';
  const affix = (p: Intl.NumberFormatPart) => p.type === 'unit' || p.type === 'currency' || p.type === 'percentSign';
  const first = parts.findIndex((p) => p.type === 'integer');
  return {
    decimal, group,
    prefix: parts.slice(0, first).filter(affix).map((p) => p.value).join('').trim(),
    suffix: parts.slice(first).filter(affix).map((p) => p.value).join('').trim(),
  };
}
// Zeros of the digit sets people type numbers in besides ASCII: Arabic-Indic, Persian, Devanagari, Bengali, full-width.
const ZEROS = [0x0660, 0x06f0, 0x0966, 0x09e6, 0xff10];
/** Reads what was typed in the locale's own way: "1.000,5" is 1000.5 in German. Returns null for nothing, NaN for nonsense. */
export function parseNumber(text: string, locale?: string): number | null {
  const { decimal, group } = partsOf(locale, {});
  let t = text.replace(/[\s\u00a0\u202f]/g, '').replace(/[\u2212\u2012\u2013]/g, '-');
  t = [...t].map((c) => { const z = ZEROS.find((z) => c.charCodeAt(0) >= z && c.charCodeAt(0) <= z + 9); return z === undefined ? c : String(c.charCodeAt(0) - z); }).join('');
  if (!t) return null;
  const g = group.replace(/[\s\u00a0\u202f]/g, '');
  if (g) t = t.split(g).join('');
  t = t.replace(decimal, '.').replace(/[^0-9.\-]/g, '');
  if (!/^-?\d*\.?\d*$/.test(t) || !/\d/.test(t)) return NaN;
  return Number(t);
}

export interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'size' | 'type' | 'min' | 'max' | 'step'> {
  value?: number | null;
  defaultValue?: number | null;
  /** Called with the parsed value when it's committed (on blur, Enter, a step or a stepper), or null when cleared. */
  onValueChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  /** Default 1. Shift+arrow, PageUp and PageDown move ten steps. */
  step?: number;
  /** Intl.NumberFormat options: `{ style: 'unit', unit: 'day' }`, `{ style: 'currency', currency: 'EUR' }`, `{ style: 'percent' }` (the value is a fraction). The unit is shown beside the number and spoken with it. */
  format?: Intl.NumberFormatOptions;
  /** Default: the browser's. Parsing follows it: "1.000,5" in de-DE. */
  locale?: string;
  invalid?: boolean;
  size?: 'sm' | 'md';
  /** The scroll wheel steps the value while the field is focused. Default false. */
  wheel?: boolean;
  /** The steppers' names. Default "Increase" and "Decrease". Say what: "Increase seats". */
  incrementLabel?: string;
  decrementLabel?: string;
}
/**
 * A number field: an opening that fills, with two small raised steppers in its end cap (push up, fill down). It reads
 * what's typed in the locale's own way, clamps to min and max when committed, and is a spinbutton with its unit in
 * aria-valuetext. The steppers aren't tab stops: the arrow keys step.
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { value, defaultValue = null, onValueChange, min, max, step = 1, format = {}, locale, invalid, size = 'md', wheel = false,
    incrementLabel = 'Increase', decrementLabel = 'Decrease', disabled, className, onBlur, onKeyDown, onFocus, placeholder, ...rest }, ref) {
  useApproach();
  useKeyFocus();
  const [v, setV] = useControllable<number | null>(value, defaultValue, onValueChange);
  const percent = format.style === 'percent';
  const { prefix, suffix } = React.useMemo(() => partsOf(locale, format), [locale, JSON.stringify(format)]); // eslint-disable-line react-hooks/exhaustive-deps
  // The number alone, in the format's precision: the unit sits beside it.
  const plain = React.useMemo(() => {
    const { style, currency, currencyDisplay, unit, unitDisplay, ...digits } = format;
    const fraction = style === 'currency' ? { minimumFractionDigits: new Intl.NumberFormat(locale, { style, currency }).resolvedOptions().minimumFractionDigits } : {};
    return new Intl.NumberFormat(locale, { ...fraction, maximumFractionDigits: 20, ...digits });
  }, [locale, JSON.stringify(format)]); // eslint-disable-line react-hooks/exhaustive-deps
  const full = React.useMemo(() => new Intl.NumberFormat(locale, format), [locale, JSON.stringify(format)]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = (n: number | null) => (n === null ? '' : plain.format(percent ? n * 100 : n));

  const [text, setText] = React.useState(() => shown(v));
  const editing = React.useRef(false);
  React.useEffect(() => { if (!editing.current) setText(shown(v)); }, [v, plain]); // eslint-disable-line react-hooks/exhaustive-deps

  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
  // Steps land on the grid that starts at min (or 0), and lose no precision to binary fractions.
  const decimals = (n: number) => (String(n).split('.')[1] ?? '').length;
  // A value off the grid steps to the nearest grid point in the direction of the step, then on by whole steps.
  const stepFrom = (n: number, k: number) => {
    const base = min ?? 0, d = Math.max(decimals(step), decimals(base), decimals(n));
    const at = (n - base) / step, onGrid = Math.abs(at - Math.round(at)) < 1e-9;
    const i = onGrid ? Math.round(at) + k : k > 0 ? Math.ceil(at) + k - 1 : Math.floor(at) + k + 1;
    return Number((base + i * step).toFixed(d));
  };
  const commit = (n: number | null) => {
    const next = n === null || Number.isNaN(n) ? (n === null ? null : v) : clamp(n);
    setV(next);
    setText(shown(next));
  };
  const typed = () => { const n = parseNumber(text, locale); return n === null || Number.isNaN(n) ? n : percent ? n / 100 : n; };
  const by = (k: number) => { const cur = editing.current ? typed() : v; const base = cur === null || Number.isNaN(cur as number) ? (min ?? 0) : (cur as number); commit(stepFrom(base, k)); };

  const atMax = v !== null && max !== undefined && v >= max, atMin = v !== null && min !== undefined && v <= min;
  const valueText = v === null ? undefined : full.format(v);
  return (
    <div className={cx('alt-input', 'alt-numfield', className)} data-size={size} data-approach="56" data-invalid={invalid ? '' : undefined} data-disabled={disabled ? '' : undefined}>
      {prefix && <span className="alt-input-adorn alt-numfield-unit" aria-hidden="true">{prefix}</span>}
      <input ref={ref} type="text" inputMode={(min ?? 0) < 0 ? 'text' : 'decimal'} role="spinbutton" autoComplete="off" disabled={disabled}
        aria-valuenow={v ?? undefined} aria-valuemin={min} aria-valuemax={max} aria-valuetext={valueText} aria-invalid={invalid || undefined}
        placeholder={placeholder ?? ' '} value={text} {...rest}
        onChange={(e) => { editing.current = true; setText(e.target.value); }}
        onFocus={(e) => { onFocus?.(e); }}
        onBlur={(e) => { editing.current = false; commit(typed()); onBlur?.(e); }}
        onWheel={(e) => { if (wheel && document.activeElement === e.currentTarget) { e.preventDefault(); by(e.deltaY < 0 ? 1 : -1); } }}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.defaultPrevented) return;
          const k = { ArrowUp: e.shiftKey ? 10 : 1, ArrowDown: e.shiftKey ? -10 : -1, PageUp: 10, PageDown: -10 }[e.key];
          if (k) { e.preventDefault(); by(k); }
          else if (e.key === 'Home' && min !== undefined) { e.preventDefault(); commit(min); }
          else if (e.key === 'End' && max !== undefined) { e.preventDefault(); commit(max); }
          else if (e.key === 'Enter') { editing.current = false; commit(typed()); }
        }} />
      {suffix && <span className="alt-input-adorn alt-numfield-unit" aria-hidden="true">{suffix}</span>}
      <span className="alt-numfield-steps">
        <button type="button" tabIndex={-1} className="alt-numfield-step" aria-label={incrementLabel} disabled={disabled || atMax}
          onPointerDown={(e) => e.preventDefault()} onClick={() => by(1)}><Icons.ChevronDown style={{ transform: 'scaleY(-1)' }} size={14} /></button>
        <button type="button" tabIndex={-1} className="alt-numfield-step" aria-label={decrementLabel} disabled={disabled || atMin}
          onPointerDown={(e) => e.preventDefault()} onClick={() => by(-1)}><Icons.ChevronDown size={14} /></button>
      </span>
    </div>
  );
});
