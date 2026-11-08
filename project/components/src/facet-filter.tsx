import * as React from 'react';
import { cx, Icons } from './core';
import { Button, Checkbox, Input } from './controls';

/* FacetFilter (#631): narrow a collection through one named set of choices whose counts come from a search service.
   It's a fieldset of real Checkboxes (WCAG 1.3.1 without ARIA), so the build is Checkbox's: a trench that the accent
   pours into, with a raised mark. The group, its labels and counts are the record and lie on the ground; counts change
   in place (a cross-fade; the digits never tick, rise or reorder). The component edits a draft: the host owns
   fetching, Apply, and the announcement of settled results (NN/g: batch filtering when results can be slow; WCAG 3.2.2:
   no change of context on input).

   Counts describe the host's applied query, not the draft, so a zero or unknown count never disables an option. Unknown
   is never zero. A selected value the latest response omitted (Algolia: "a user's chosen value can vanish if they alter
   the query") stays listed, checked and removable, first in the list so truncation can't hide it. Truncation follows
   Baymard: about 10 before "Show more", never to hide a single option, and never hiding a selected one. */

export interface FacetOption {
  /** Stable id. Selection is by value, so a refreshed `options` array never remounts the focused box. */
  value: string;
  label: string;
  /** Results for this value under the applied query. `undefined` or `null` is unknown, never zero. */
  count?: number | null;
  /** `approximate` reads "about 40". Default `exact`. */
  countKind?: 'exact' | 'approximate';
  /** Why it can't be chosen ("Not sold in your region"). Shown as its description; a selected one stays removable. */
  unavailable?: string;
}

export interface FacetFilterProps extends Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, 'onChange'> {
  /** The group's name, drawn as its legend ("Asset type"). */
  label: string;
  options: FacetOption[];
  /** The draft selection, by value. */
  value: string[];
  onValueChange: (next: string[]) => void;
  /** The count snapshot as a whole. `refreshing` keeps the previous counts and says "Updating counts…". Default `current`. */
  counts?: 'current' | 'refreshing' | 'stale' | 'unavailable';
  /** Which query the counts describe, said under the legend ("Counts for your applied filters"). */
  countsLabel?: React.ReactNode;
  /** Labels for selected values the latest response left out. Without one, the value itself is shown. */
  retainedLabels?: Record<string, string>;
  /** Options shown before "Show more". Default 10; it never truncates to hide just one. */
  limit?: number;
  /** A search field over the options' labels. Default: on when there are more than 15. */
  searchable?: boolean;
  /** The plural noun for the options, used in "Show 12 more asset types" and "Search asset types". Default "options". */
  noun?: string;
  /** Called by "Clear … filters". Default: `onValueChange([])`. */
  onClear?: () => void;
  /** Number → words. Default: the browser's grouping (`Intl.NumberFormat`). Pass a fixed locale when you render on a server. */
  formatCount?: (n: number) => string;
}

const SearchIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" />
  </svg>
);

const defaultFormat = (n: number) => { try { return new Intl.NumberFormat().format(n); } catch { return String(n); } };

type Row = FacetOption & { retained?: boolean };

/** One named group of counted choices: a fieldset of Checkboxes whose counts come from your search service. It edits a draft; you apply it. */
export function FacetFilter({
  label, options, value, onValueChange, counts = 'current', countsLabel, retainedLabels, limit = 10, searchable, noun = 'options',
  onClear, formatCount = defaultFormat, className, ...rest
}: FacetFilterProps) {
  const id = React.useId();
  const root = React.useRef<HTMLFieldSetElement>(null);
  const [expanded, setExpanded] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const selected = React.useMemo(() => new Set(value), [value]);
  const known = React.useMemo(() => new Set(options.map((o) => o.value)), [options]);
  const rows: Row[] = React.useMemo(() => [
    ...value.filter((v) => !known.has(v)).map((v) => ({ value: v, label: retainedLabels?.[v] ?? v, count: undefined, retained: true })),
    ...options,
  ], [value, known, options, retainedLabels]);

  const canSearch = searchable ?? options.length > 15;
  const q = query.trim().toLowerCase();
  const matches = q ? rows.filter((r) => r.label.toLowerCase().includes(q)) : rows;
  // Truncate only when at least two would be hidden, and never hide a selected option.
  const truncates = !q && matches.length > limit + 1;
  const visible = truncates && !expanded ? matches.filter((r, i) => i < limit || selected.has(r.value)) : matches;
  const hidden = matches.length - visible.length;

  const toggle = (v: string, on: boolean) => onValueChange(on ? (selected.has(v) ? value : [...value, v]) : value.filter((x) => x !== v));
  const clear = () => {
    if (onClear) onClear(); else onValueChange([]);
    // Clear disappears with the selection; keep focus in the group rather than dropping it to the page.
    requestAnimationFrame(() => root.current?.querySelector<HTMLInputElement>('input[type="checkbox"]:not(:disabled)')?.focus());
  };

  const showCounts = counts !== 'unavailable';
  const lower = label.toLowerCase();
  const status = counts === 'refreshing' ? <><Icons.Refresh size={14} />Updating counts…</>
    : counts === 'stale' ? <><Icons.AlertTriangle size={14} />Counts may be out of date</>
    : counts === 'unavailable' ? <><Icons.Info size={14} />Counts unavailable</>
    : null;

  return (
    <fieldset ref={root} className={cx('alt-facet', className)} aria-busy={counts === 'refreshing' || undefined}
      aria-describedby={countsLabel || status ? `${id}-counts` : undefined} data-counts={counts} {...rest}>
      <legend className="alt-facet-legend">
        <span className="alt-facet-name">{label}</span>
        {value.length > 0 && <span className="alt-facet-chosen">{value.length} selected</span>}
      </legend>
      {(countsLabel || status) && (
        <p className="alt-facet-counts" id={`${id}-counts`} data-tone={counts === 'stale' ? 'caution' : undefined}>
          {status && <span className="alt-facet-status">{status}</span>}
          {countsLabel && <span>{countsLabel}</span>}
        </p>
      )}
      {canSearch && (
        <div className="alt-facet-search">
          <Input size="sm" aria-label={`Search ${noun}`} leading={<SearchIcon />} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      )}
      <ul className="alt-facet-list" role="list">
        {visible.map((r) => {
          const on = selected.has(r.value);
          const disabled = !!r.unavailable && !on;
          const description = r.retained ? 'Not in the latest results' : r.unavailable;
          return (
            <li key={r.value} className="alt-facet-item" data-retained={r.retained ? '' : undefined}>
              <Checkbox checked={on} disabled={disabled} onCheckedChange={(c) => toggle(r.value, c)}
                label={<span className="alt-facet-row"><span className="alt-facet-label">{r.label}</span>
                  {showCounts && !r.retained && <Count key={`${r.count ?? 'x'}-${r.countKind ?? ''}`} count={r.count} kind={r.countKind} format={formatCount} />}
                </span>}
                description={description} />
            </li>
          );
        })}
      </ul>
      {q && matches.length === 0 && <p className="alt-facet-none" role="status">No {noun} match “{query.trim()}”</p>}
      {(truncates || value.length > 0) && (
        <div className="alt-facet-foot">
          {truncates && (
            <button type="button" className="alt-facet-more" aria-expanded={expanded} onClick={() => setExpanded((e) => !e)}>
              {expanded ? `Show fewer ${noun}` : `Show ${hidden} more ${noun}`}
              <Icons.ChevronDown size={14} />
            </button>
          )}
          {value.length > 0 && <Button variant="ghost" size="sm" className="alt-facet-clear" onClick={clear}>Clear {lower} filters</Button>}
        </div>
      )}
    </fieldset>
  );
}

function Count({ count, kind, format }: { count?: number | null; kind?: 'exact' | 'approximate'; format: (n: number) => string }) {
  if (count == null) return <span className="alt-facet-count" data-unknown=""><span aria-hidden="true">–</span><span className="alt-sr">, count unavailable</span></span>;
  const n = format(count);
  const words = kind === 'approximate' ? `about ${n}` : n;
  return (
    <span className="alt-facet-count" data-zero={count === 0 ? '' : undefined}>
      <span aria-hidden="true">{words}</span><span className="alt-sr">, {words} {count === 1 && kind !== 'approximate' ? 'result' : 'results'}</span>
    </span>
  );
}
