import * as React from 'react';
import { cx, DevChecksContext, Icons } from './core';

/**
 * UnitChart (#537): a frequency felt as a count. "18 of every 100 trial accounts convert" is 100 marks with 18 counted,
 * flat on the ground, the number always said beside them (icons alone read as less serious than the number). Groups
 * take the data palette; the rest is data-context. When each mark is a record, the grid is a keyboard path and a mark
 * can be chosen. A count is that many marks, never an area.
 */
export interface UnitChartGroup { key: string; label: string; value: number }
type Tone = 'positive' | 'caution' | 'critical';
export interface UnitChartProps<T = Record<string, unknown>> extends Omit<React.HTMLAttributes<HTMLElement>, 'onSelect'> {
  /** What is counted, as the figure's name: "Trial accounts that convert". */
  label: string;
  /** How many marks. Default 100, said "of every 100"; up to 400. With `units`, the number of records, said "of 40". */
  total?: number;
  /** How many are counted (one group). A fraction fills the last mark from the left. */
  value?: number;
  /** Two or more counted groups, each in its own data slot, with a direct label and its count. */
  groups?: UnitChartGroup[];
  /** Each mark is a record: the grid becomes a keyboard path, and `tone` and `onSelect` apply per record. */
  units?: T[];
  /** A record's id. Default its index. */
  getKey?: (unit: T) => string;
  /** A record's name, for its mark and the readout. */
  getLabel?: (unit: T) => string;
  /** Status for a record that means good or bad: its mark wears the status colour, and the legend says the word with its icon. */
  tone?: (unit: T) => Tone | undefined;
  /** The words for each tone in the legend and summary: { critical: 'Late' }. Default the tone's name. */
  toneLabels?: Partial<Record<Tone, string>>;
  /** What to do when a record's mark is chosen. */
  onSelect?: (unit: T) => void;
  /** What a mark is, plural: "accounts". */
  noun?: string;
  /** What the rest are called in words. Default "the rest". */
  restLabel?: string;
  /** Marks per row. Default 10 (20 above 200 marks). */
  columns?: number;
}

const TONE_WORDS: Record<Tone, string> = { positive: 'Good', caution: 'Caution', critical: 'Critical' };
const nf = new Intl.NumberFormat();
const fmt = (v: number) => (Number.isInteger(v) ? nf.format(v) : new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(v));

export function UnitChart<T = Record<string, unknown>>({ label, total: totalProp, value, groups, units, getKey, getLabel, tone, toneLabels, onSelect, noun, restLabel = 'the rest',
  columns, className, ...rest }: UnitChartProps<T>) {
  const id = React.useId();
  const dev = React.useContext(DevChecksContext);
  const records = Array.isArray(units);
  const total = records ? units!.length : Math.max(0, Math.round(totalProp ?? 100));
  const tooMany = total > 400;
  React.useEffect(() => { if (dev && tooMany) console.warn(`UnitChart: ${total} marks is too many to count; say the number instead (at most 400).`); }, [dev, tooMany, total]);

  // What each mark is: a group's slot (filled up to a fraction), a tone, or the rest.
  const parts: Array<{ key: string; label: string; value: number; slot: string; tone?: Tone }> = [];
  if (records) {
    const counts: Partial<Record<Tone, number>> = {};
    for (const u of units!) { const t = tone?.(u); if (t) counts[t] = (counts[t] ?? 0) + 1; }
    for (const t of ['critical', 'caution', 'positive'] as Tone[]) if (counts[t]) parts.push({ key: t, label: toneLabels?.[t] ?? TONE_WORDS[t], value: counts[t]!, slot: t, tone: t });
  } else if (groups?.length) groups.forEach((g, i) => parts.push({ key: g.key, label: g.label, value: Math.max(0, g.value), slot: i < 6 ? `data-${i + 1}` : 'data-other' }));
  else parts.push({ key: 'value', label, value: Math.max(0, value ?? 0), slot: 'data-1' });
  const counted = parts.reduce((t, q) => t + q.value, 0);
  const restCount = Math.max(0, total - counted);
  const of = records ? `of ${fmt(total)}` : `of every ${fmt(total)}`;
  const nounWords = noun ? ` ${noun}` : '';

  // Marks in order: each group's whole marks, then its fraction filling the next mark from the left.
  type Mark = { slot: string; fill: number; tone?: Tone; unit?: T; index: number };
  const marks: Mark[] = [];
  if (records) units!.forEach((u, i) => { const t = tone?.(u); marks.push({ slot: t ?? 'data-context', fill: 1, tone: t, unit: u, index: i }); });
  else {
    let carry = 0;
    for (const q of parts) {
      let left = q.value;
      if (carry > 0 && marks.length) { const m = marks[marks.length - 1]; const take = Math.min(left, 1 - carry); if (take > 0) { m.fill = carry + take; left -= take; carry = (carry + take) % 1; } }
      while (left >= 1 && marks.length < total) { marks.push({ slot: q.slot, fill: 1, index: marks.length }); left -= 1; }
      if (left > 1e-9 && marks.length < total) { marks.push({ slot: q.slot, fill: left, index: marks.length }); carry = left; } else carry = 0;
    }
    while (marks.length < total) marks.push({ slot: 'data-context', fill: 0, index: marks.length });
  }

  const cols = Math.max(1, Math.floor(columns ?? (total > 200 ? 20 : 10)));
  const summary = records
    ? `${label}: ${fmt(total)}${nounWords}.${parts.length ? ' ' + parts.map((q) => `${q.label}: ${fmt(q.value)} ${of}`).join('. ') + '.' : ''}`
    : `${label}: ${parts.map((q) => `${parts.length > 1 ? `${q.label} ` : ''}${fmt(q.value)} ${of}${nounWords}`).join(', ')}. ${restLabel.charAt(0).toUpperCase() + restLabel.slice(1)}: ${fmt(restCount)}.`;

  // Records: one Tab stop, arrows by row and column, Enter or Space to choose.
  const [at, setAt] = React.useState(0);
  const refs = React.useRef<Array<HTMLElement | null>>([]);
  const move = (e: React.KeyboardEvent, i: number) => {
    const n = marks.length;
    const to = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'ArrowDown' ? i + cols : e.key === 'ArrowUp' ? i - cols
      : e.key === 'Home' ? (e.ctrlKey ? 0 : i - (i % cols)) : e.key === 'End' ? (e.ctrlKey ? n - 1 : Math.min(n - 1, i - (i % cols) + cols - 1)) : null;
    if (to !== null) { e.preventDefault(); const j = Math.max(0, Math.min(n - 1, to)); setAt(j); refs.current[j]?.focus(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && onSelect && marks[i].unit !== undefined) { e.preventDefault(); onSelect(marks[i].unit as T); }
  };
  const nameOf = (m: Mark) => {
    const u = m.unit as T;
    const nm = getLabel ? getLabel(u) : getKey ? getKey(u) : `${m.index + 1}`;
    return `${nm}${m.tone ? `, ${toneLabels?.[m.tone] ?? TONE_WORDS[m.tone]}` : ''}. ${m.index + 1} of ${total}.${onSelect ? ' Press Enter to open it.' : ''}`;
  };

  return (
    <figure className={cx('alt-unit', className)} aria-labelledby={`${id}-l`} aria-describedby={`${id}-s`} {...rest}>
      <div className="alt-unit-head">
        <div id={`${id}-l`} className="alt-unit-label">{label}</div>
        {!records && parts.length === 1 && (
          <div className="alt-unit-value"><strong>{fmt(parts[0].value)}</strong> <span>{of}{nounWords}</span></div>
        )}
      </div>
      {tooMany ? <p className="alt-unit-value"><strong>{fmt(counted)}</strong> <span>{of}{nounWords}</span></p> : (
        <div className="alt-unit-grid" style={{ '--alt-unit-cols': cols } as React.CSSProperties}
          {...(records ? { role: 'grid', 'aria-label': label, 'aria-rowcount': Math.ceil(total / cols), 'aria-colcount': cols } : { role: 'img', 'aria-label': summary })}>
          {records
            ? Array.from({ length: Math.ceil(marks.length / cols) }, (_, r) => (
              <div key={r} role="row" className="alt-unit-row">
                {marks.slice(r * cols, r * cols + cols).map((m) => (
                  <span key={getKey ? getKey(m.unit as T) : m.index} role="gridcell" ref={(el) => { refs.current[m.index] = el; }} tabIndex={m.index === at ? 0 : -1}
                    className="alt-unit-mark" data-slot={m.slot} data-acts={onSelect ? '' : undefined} aria-label={nameOf(m)} title={getLabel ? getLabel(m.unit as T) : undefined}
                    onKeyDown={(e) => move(e, m.index)} onFocus={() => setAt(m.index)} onClick={onSelect ? () => { setAt(m.index); onSelect(m.unit as T); } : undefined} />
                ))}
              </div>
            ))
            : marks.map((m) => (
              <span key={m.index} className="alt-unit-mark" data-slot={m.fill >= 1 ? m.slot : 'data-context'} aria-hidden="true">
                {m.fill > 0 && m.fill < 1 && <span className="alt-unit-part" data-slot={m.slot} style={{ width: `${m.fill * 100}%` }} />}
              </span>
            ))}
        </div>
      )}
      {(parts.length > 1 || records) && parts.length > 0 && (
        <ul className="alt-unit-legend">
          {[...parts, ...(!records && parts.length > 1 && restCount > 0 ? [{ key: '__rest', label: restLabel.charAt(0).toUpperCase() + restLabel.slice(1), value: restCount, slot: 'data-context', tone: undefined }] : [])].map((q) => (
            <li key={q.key} data-slot={q.slot}>
              {q.tone ? <span className="alt-unit-tone">{q.tone === 'positive' ? <Icons.Check size={14} /> : <Icons.AlertTriangle size={14} />}</span> : <span className="alt-unit-swatch" aria-hidden="true" />}
              <span>{q.label}</span> <strong>{fmt(q.value)}</strong>
            </li>
          ))}
        </ul>
      )}
      <figcaption id={`${id}-s`} className="alt-sr">{summary}</figcaption>
    </figure>
  );
}
