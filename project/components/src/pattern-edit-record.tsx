import * as React from 'react';
import { useIsoLayoutEffect } from './core';

export type FieldErrors<T> = Partial<Record<keyof T, string>>;
export type EditRecordResult<T> = { ok: true; value: T } | { ok: false; error: string; errors?: FieldErrors<T> };
export type EditRecordPhase = 'editing' | 'invalid' | 'submitting' | 'saved' | 'failed';
export type LeaveReason = 'cancel' | 'back' | 'navigation';
export interface EditRecordOptions<T extends object> {
  /** Initial snapshot only. Use reset to deliberately adopt another record; keep snapshots immutable. */
  initialValue: T;
  validate: (draft: T) => FieldErrors<T>;
  /** Submit validates every field; blur additionally validates the blurred field. Corrections revalidate visible errors. */
  validationMode: 'submit' | 'blur';
  save: (draft: T, context: { previousValue: T }) => EditRecordResult<T> | Promise<EditRecordResult<T>>;
  /** Supply semantic equality for nested values. The default compares top-level fields with Object.is. */
  isEqual?: (a: T, b: T) => boolean;
  messages?: Partial<{ saving: string; saved: string; failed: string; invalid: string; newerEdits: string }>;
}
const shallowEqual = <T extends object>(a: T, b: T) => Object.keys(a).length === Object.keys(b).length &&
  Object.keys(a).every(key => Object.is(a[key as keyof T], b[key as keyof T]));
const cleanErrors = <T,>(errors: FieldErrors<T>): FieldErrors<T> => Object.fromEntries(
  Object.entries(errors).filter(([, value]) => typeof value === 'string' && value.length > 0)) as FieldErrors<T>;

/** Small record workflow. Persistence, concurrency/version checks, authorization and route interception belong to the app.
 * See altitude-design/guidance/patterns/edit-record.md. A response never replaces edits made after dispatch.
 */
export function useEditRecord<T extends object>(options: EditRecordOptions<T>) {
  const [state, setState] = React.useState(() => ({ draft: options.initialValue, baseline: options.initialValue,
    errors: {} as FieldErrors<T>, error: '', phase: 'editing' as EditRecordPhase, status: '', submitCount: 0 }));
  const current = React.useRef(state);
  const revision = React.useRef(0);
  const mounted = React.useRef(false);
  const leaving = React.useRef(false);
  const messages = { saving: 'Saving changes', saved: 'Changes saved', failed: 'We couldn’t save your changes. Try again.',
    invalid: 'Check the highlighted fields.', newerEdits: 'The earlier changes were saved. Your newer edits still need saving.', ...options.messages };
  useIsoLayoutEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const publish = (patch: Partial<typeof state>) => { current.current = { ...current.current, ...patch }; if (mounted.current) setState(current.current); };
  const equal = options.isEqual || shallowEqual;
  const validate = (draft: T) => cleanErrors(options.validate(draft));
  const setDraft = (draft: T) => {
    revision.current++;
    const previous = current.current;
    const visible = Object.keys(previous.errors) as (keyof T)[];
    const checked = visible.length ? validate(draft) : {} as FieldErrors<T>;
    const errors = Object.fromEntries(visible.filter(key => checked[key]).map(key => [key, checked[key]])) as FieldErrors<T>;
    publish({ draft, errors, error: '', status: previous.phase === 'submitting' ? previous.status : '',
      phase: previous.phase === 'submitting' ? 'submitting' : Object.keys(errors).length ? 'invalid' : 'editing' });
  };
  const validateField = (key: keyof T) => {
    if (options.validationMode !== 'blur' || current.current.phase === 'submitting') return;
    const checked = validate(current.current.draft);
    const errors = { ...current.current.errors }; delete errors[key]; if (checked[key]) errors[key] = checked[key];
    publish({ errors, phase: Object.keys(errors).length ? 'invalid' : 'editing' });
  };
  const validateAll = () => {
    if (current.current.phase === 'submitting') return false;
    const errors = validate(current.current.draft);
    publish({ errors, phase: Object.keys(errors).length ? 'invalid' : 'editing', error: '',
      status: Object.keys(errors).length ? messages.invalid : '', submitCount: current.current.submitCount + 1 });
    return Object.keys(errors).length === 0;
  };
  const submit = async (): Promise<EditRecordResult<T> | undefined> => {
    if (!mounted.current || current.current.phase === 'submitting') return;
    const snapshot = current.current;
    const errors = validate(snapshot.draft);
    if (Object.keys(errors).length) { publish({ errors, phase: 'invalid', status: messages.invalid, error: '', submitCount: snapshot.submitCount + 1 }); return; }
    const dispatchedRevision = revision.current;
    // Synchronous lock precedes invocation, protecting repeated and reentrant activation.
    publish({ errors: {}, error: '', phase: 'submitting', status: messages.saving, submitCount: snapshot.submitCount + 1 });
    let result: EditRecordResult<T>;
    try { result = await options.save(snapshot.draft, { previousValue: snapshot.baseline }); }
    catch { result = { ok: false, error: messages.failed }; }
    if (!mounted.current) return;
    if (!result || typeof result !== 'object' || (result.ok === true ? !result.value || typeof result.value !== 'object' : result.ok !== false || typeof result.error !== 'string' || !result.error)) result = { ok: false, error: messages.failed };
    const newer = dispatchedRevision !== revision.current;
    if (result.ok) publish({ baseline: result.value, ...(newer ? {} : { draft: result.value }),
      phase: newer ? 'editing' : 'saved', status: newer ? messages.newerEdits : messages.saved });
    else publish({ phase: 'failed', error: result.error, status: result.error, errors: newer ? current.current.errors : cleanErrors(result.errors || {}) });
    return result;
  };
  const reset = (value: T = current.current.baseline) => {
    if (current.current.phase === 'submitting') return false;
    revision.current++; publish({ draft: value, baseline: value, phase: 'editing', errors: {}, error: '', status: '' }); return true;
  };
  /** Wire every cancel/Back/router transition through this adapter. It does not intercept history or cancel server writes.
   * Pending writes block leaving; dirty drafts require an explicit app-owned discard decision. */
  const requestLeave = async (reason: LeaveReason, confirmDiscard: (context: { reason: LeaveReason; draft: T }) => boolean | Promise<boolean>) => {
    if (current.current.phase === 'submitting' || leaving.current) return false;
    if (equal(current.current.draft, current.current.baseline)) return true;
    const seen = revision.current; leaving.current = true;
    try {
      const discard = await confirmDiscard({ reason, draft: current.current.draft });
      if (!mounted.current || !discard || seen !== revision.current || (current.current.phase as EditRecordPhase) === 'submitting') return false;
      return reset();
    } finally { leaving.current = false; }
  };
  return { ...state, dirty: !equal(state.draft, state.baseline), setDraft,
    setField: <K extends keyof T>(key: K, value: T[K]) => setDraft({ ...current.current.draft, [key]: value }),
    validateField, validateAll, submit, reset, requestLeave };
}

export interface ErrorSummaryProps {
  errors: readonly { id: string; label: string; message: string }[];
  title?: string;
  /** Change after an unsuccessful submit to focus the summary. Omit to keep focus where it is. */
  focusKey?: number;
  className?: string;
}
/** Render from the same errors passed to Field; use each input's actual id. Inline Field owns alert announcements. */
export function ErrorSummary({ errors, title = 'Check these fields', focusKey, className }: ErrorSummaryProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const id = React.useId();
  const focusedKey = React.useRef<number | undefined>(undefined);
  useIsoLayoutEffect(() => {
    if (focusKey && errors.length && focusedKey.current !== focusKey) { focusedKey.current = focusKey; ref.current?.focus(); }
  }, [focusKey, errors.length]);
  if (!errors.length) return null;
  return <div ref={ref} tabIndex={-1} role="region" aria-labelledby={id} className={['alt-error-summary', className].filter(Boolean).join(' ')}>
    <h2 id={id}>{title}</h2><ul>{errors.map(error => <li key={error.id}><a href={`#${encodeURIComponent(error.id)}`}
      onClick={event => { const input = document.getElementById(error.id); if (input) { event.preventDefault(); input.focus(); input.scrollIntoView({ block: 'nearest' }); } }}>
      {error.label}: {error.message}</a></li>)}</ul>
  </div>;
}
/** Place outside any aria-busy region so pending and completion remain announced. */
export function WorkflowStatus({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <div className={className} role="status" aria-live="polite" aria-atomic="true">{children}</div>;
}
