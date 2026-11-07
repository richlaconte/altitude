import * as React from 'react';
import { cx, Icons, Layer, useDepth, usePresence } from './core';
import { Button } from './controls';

/* ───────────────────────── SaveBar ───────────────────────── */

/** Whether a field's draft value matches its baseline, for any value a record holds (bigint, Date, nested, cyclic). */
function same(a: unknown, b: unknown, seen = new Map<object, Set<object>>()): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  if (a instanceof Date) return Object.is(a.getTime(), (b as Date).getTime());
  // Every pair already under comparison is assumed equal, so cycles of different lengths terminate too.
  const pairs = seen.get(a) ?? new Set<object>();
  if (pairs.has(b)) return true;
  seen.set(a, pairs.add(b));
  if (a instanceof Map || a instanceof Set) {
    const x = [...a.entries()], y = [...(b as Map<unknown, unknown> | Set<unknown>).entries()];
    return x.length === y.length && x.every(([k, v], i) => same(k, y[i][0], seen) && same(v, y[i][1], seen));
  }
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && same((a as any)[k], (b as any)[k], seen));
}

/** What SaveBar reads from useEditRecord. */
interface RecordLike { dirty: boolean; phase: 'editing' | 'invalid' | 'submitting' | 'saved' | 'failed'; errors: object; error?: string; status?: string; draft?: object; baseline?: object; submit: () => unknown; reset: () => unknown }

export interface SaveBarProps {
  /** A useEditRecord result: SaveBar reads dirty, phase and errors from it, and Save and Discard call submit and reset. */
  record?: RecordLike;
  dirty?: boolean;
  saving?: boolean;
  /** Why the last save failed. The draft is kept. */
  error?: string;
  /** Fields that need attention before saving. */
  invalidCount?: number;
  /** How many fields changed. Default: counted from the record. */
  changedCount?: number;
  onSave?: () => void;
  onDiscard?: () => void;
  /** The bar appears once a change has settled into the draft (this long without another), not on the first key. Default 600. */
  delay?: number;
  saveLabel?: string;
  discardLabel?: string;
  className?: string;
}

/**
 * Unsaved changes on a page, held above it until saved or discarded. A draft is something in your hand, so the bar
 * floats at level 3, docked to the bottom edge (below Sheets and Dialogs). Saving hovers as a pending write; a saved
 * draft lowers away while the fields settle; a failed save drops the bar to a trench and keeps the draft.
 */
export function SaveBar({ record, dirty: dirtyProp, saving: savingProp, error: errorProp, invalidCount: invalidProp, changedCount, onSave, onDiscard, delay = 600,
  saveLabel = 'Save changes', discardLabel = 'Discard', className }: SaveBarProps) {
  const dirty = record ? record.dirty : !!dirtyProp;
  const saving = record ? record.phase === 'submitting' : !!savingProp;
  const error = record ? (record.phase === 'failed' ? record.error || "We couldn't save." : '') : errorProp ?? '';
  const invalid = record ? Object.keys(record.errors).length : invalidProp ?? 0;
  const changed = changedCount ?? (record?.draft && record.baseline
    ? Object.keys({ ...record.baseline, ...record.draft }).filter((k) => !same((record.draft as any)[k], (record.baseline as any)[k])).length : undefined);
  const save = () => (record ? record.submit() : onSave?.());
  const discard = () => (record ? record.reset() : onDiscard?.());

  // Shown once a change has settled into the draft, so it doesn't rise on the first key; held while saving or failed.
  const wanted = dirty || saving || !!error;
  const [settled, setSettled] = React.useState(false);
  React.useEffect(() => {
    if (!wanted) { setSettled(false); return; }
    if (settled) return;
    const t = window.setTimeout(() => setSettled(true), delay);
    return () => window.clearTimeout(t);
  }, [wanted, dirty && record?.draft]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = wanted && (settled || saving || !!error);
  const { mounted, state } = usePresence(shown, 240);
  const { style, ...depth } = useDepth({ status: saving ? 'pending' : error ? 'failed' : undefined });

  const [said, setSaid] = React.useState('');
  const wasSaving = React.useRef(false);
  React.useEffect(() => { if (shown && !saving && !error) setSaid('Unsaved changes.'); }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    // An earlier save that resolves while newer edits are still in the draft saved those earlier changes, not these.
    if (wasSaving.current && !saving) setSaid(error ? `${error} Your changes are kept.`
      : dirty ? (record?.phase === 'editing' && record.status) || 'The earlier changes were saved. Your newer edits still need saving.' : 'Saved.');
    wasSaving.current = saving;
  }, [saving, error]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!saving) save(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const words = saving ? 'Saving…' : error ? `${error} Your changes are kept.` : invalid ? `${invalid} ${invalid === 1 ? 'field needs' : 'fields need'} attention`
    : `Unsaved changes${changed ? ` · ${changed} ${changed === 1 ? 'field' : 'fields'}` : ''}`;
  return <>
    {mounted && (
      <Layer>
        <section className={cx('alt-savebar', className)} aria-label="Unsaved changes" data-state={state} {...depth} style={style}>
          <span className="alt-savebar-text">{error && <Icons.AlertCircle size={16} />}{words}</span>
          <span className="alt-savebar-actions">
            <Button size="sm" variant="secondary" onClick={discard} disabled={saving}>{discardLabel}</Button>
            <Button size="sm" variant="primary" onClick={save} loading={saving} aria-keyshortcuts="Meta+S Control+S">{error ? 'Retry' : saveLabel}</Button>
          </span>
        </section>
      </Layer>
    )}
    <span className="alt-sr" role="status" aria-live="polite">{said}</span>
  </>;
}
