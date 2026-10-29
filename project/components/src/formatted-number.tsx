import * as React from 'react';
import { cx, useDepth } from './core';

/* ───────────────────────── FormattedNumber ───────────────────────── */

export type NumberFormatPreset = 'number' | 'currency' | 'bytes' | 'duration' | 'percent' | 'compact';
export type DurationUnit = 'millisecond' | 'second' | 'minute' | 'hour' | 'day';

export interface FormatNumberOptions extends Omit<Intl.NumberFormatOptions, 'style' | 'unit' | 'notation'> {
  /** Default 'number'. */
  format?: NumberFormatPreset;
  /** Default: the browser's. */
  locale?: string;
  /** currency: an ISO 4217 code. Default 'USD'. */
  currency?: string;
  /** currency: the value is in minor units (cents), as payment APIs send it, so 4900 is €49.00. Default true. */
  minorUnits?: boolean;
  /** duration: the unit the value is in. Default 'millisecond'. It's shown in the largest unit that keeps it at 1 or more. */
  unit?: DurationUnit;
  /** bytes: 1000 (kB, MB, GB; the default) or 1024 (KiB, MiB, GiB). */
  base?: 1000 | 1024;
}

const BYTES = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte', 'petabyte'] as const;
const IEC = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
const IEC_LONG = ['bytes', 'kibibytes', 'mebibytes', 'gibibytes', 'tebibytes', 'pebibytes'];
const DURATIONS: [DurationUnit, number][] = [['millisecond', 1], ['second', 1000], ['minute', 60_000], ['hour', 3_600_000], ['day', 86_400_000]];

/** The text, the exact value (when the text rounds or abbreviates it) and the words for a symbol that's ambiguous read aloud. */
export function describeNumber(value: number, options: FormatNumberOptions = {}): { text: string; full?: string; spoken?: string } {
  const { format = 'number', locale, currency = 'USD', minorUnits = true, unit = 'millisecond', base = 1000, ...intl } = options;
  const nf = (o: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale, o).format;
  if (!isFinite(value)) return { text: '—' };
  switch (format) {
    case 'currency': {
      const digits = new Intl.NumberFormat(locale, { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
      const amount = minorUnits ? value / 10 ** digits : value;
      return { text: nf({ style: 'currency', currency, ...intl })(amount) };
    }
    case 'bytes': {
      let i = 0, n = Math.abs(value);
      while (n >= base && i < BYTES.length - 1) { n /= base; i++; }
      const signed = Math.sign(value) * n, digits = { maximumFractionDigits: i ? 1 : 0, ...intl };
      const exact = nf({})(value) + ' ' + (Math.abs(value) === 1 ? 'byte' : 'bytes');
      // Intl's short byte is "512 byte"; a count under a kilobyte reads better as "512 B".
      if (base === 1024 || !i) return { text: `${nf(digits)(signed)} ${IEC[i]}`, full: i ? exact : undefined, spoken: i ? `${nf(digits)(signed)} ${IEC_LONG[i]}` : exact };
      return {
        text: nf({ style: 'unit', unit: BYTES[i], unitDisplay: 'short', ...digits })(signed),
        full: i ? exact : undefined,
        spoken: nf({ style: 'unit', unit: BYTES[i], unitDisplay: 'long', ...digits })(signed),
      };
    }
    case 'duration': {
      const ms = value * DURATIONS.find(([u]) => u === unit)![1];
      let [u, size] = DURATIONS[0];
      for (const [cand, s] of DURATIONS) if (Math.abs(ms) >= s) [u, size] = [cand, s];
      const digits = { maximumFractionDigits: u === 'millisecond' ? 0 : 1, ...intl };
      return {
        text: nf({ style: 'unit', unit: u, unitDisplay: 'short', ...digits })(ms / size),
        spoken: nf({ style: 'unit', unit: u, unitDisplay: 'long', ...digits })(ms / size),
      };
    }
    case 'percent': return { text: nf({ style: 'percent', ...intl })(value) };
    case 'compact': {
      const text = nf({ notation: 'compact', maximumFractionDigits: 1, ...intl })(value), full = nf({})(value);
      return { text, full: full !== text ? full : undefined, spoken: full !== text ? full : undefined };
    }
    default: return { text: nf(intl)(value) };
  }
}
/** Formats a number once, the way FormattedNumber does: for DataTable columns, chart formatters and plain strings. */
export const formatNumber = (value: number, options?: FormatNumberOptions) => describeNumber(value, options).text;

export interface FormattedNumberProps extends FormatNumberOptions {
  value: number;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  /** Default: the exact value, when the text rounds or abbreviates it. */
  title?: string;
}
/**
 * A number is the record, so it lies flush: tabular figures, the exact value on hand when it's rounded or abbreviated,
 * and units spoken in words. A changed value cross-fades and settles with the afterglow; it never counts.
 */
export function FormattedNumber({ value, className, style, id, title, ...options }: FormattedNumberProps) {
  const { text, full, spoken } = describeNumber(value, options);

  // The old text fades out over the new one; the afterglow follows, once per change and never on first render.
  const [prev, setPrev] = React.useState<{ text: string; key: number } | null>(null);
  const shown = React.useRef(text);
  React.useEffect(() => {
    if (shown.current !== text) setPrev((p) => ({ text: shown.current, key: (p?.key ?? 0) + 1 }));
    shown.current = text;
  }, [text]);
  React.useEffect(() => {
    if (!prev) return;
    const t = setTimeout(() => setPrev(null), 400);
    return () => clearTimeout(t);
  }, [prev]);
  const { style: depthStyle, ...depth } = useDepth({ settle: prev?.key });

  return (
    <data id={id} value={String(value)} className={cx('alt-num', className)} title={title ?? full} {...depth} style={{ ...depthStyle, ...style }}>
      <span key={text} className="alt-num-text" data-in={prev ? '' : undefined} aria-hidden={spoken ? true : undefined}>{text}</span>
      {prev && <span key={'p' + prev.key} className="alt-num-text" data-out="" aria-hidden="true">{prev.text}</span>}
      {spoken && <span className="alt-sr">{spoken}</span>}
    </data>
  );
}
