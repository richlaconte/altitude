import * as React from 'react';
import { cx, Surface, useIsoLayoutEffect } from './core';
import { Button, Field, Input } from './controls';
export type InlineEditSaveResult = { ok: true; value: string } | { ok: false; error: string };
export interface InlineEditProps {
  value: string;
  onValueChange: (canonicalValue: string) => void;
  onSave: (draft: string, context: { previousValue: string }) => InlineEditSaveResult | Promise<InlineEditSaveResult>;
  label: string;
  validate?: (draft: string) => string | undefined | Promise<string | undefined>;
  required?: boolean;
  maxLength?: number;
  disabled?: boolean;
  editLabel?: string;
  saveLabel?: string;
  cancelLabel?: string;
  focusFallback?: () => HTMLElement | null;
  className?: string;
}
type Session = {
  generation: number;
  phase: 'editing' | 'validating' | 'saving' | 'error' | 'conflict';
  baseline: string;
  draft: string;
  error?: string;
  failed?: boolean;
  conflicted?: boolean;
};
const SAVE_ERROR = 'We couldn’t save this change. Try again.';
const CHANGED = 'The saved value changed. Review the current value before saving.';
const CHANGED_DURING_SAVE = 'The value changed while saving. Your save may have completed. Check the current record.';

function canFocus(element: HTMLElement | null | undefined): element is HTMLElement {
  return !!element?.isConnected && !element.matches(':disabled, [aria-disabled="true"]') &&
    !element.closest('[inert]') && element.matches('button, input:not([type="hidden"]), select, textarea, a[href], area[href], summary, [tabindex], [contenteditable="true"]') &&
    element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
}

/** One local string-editing session. The application remains the sole owner of the committed value and write. */
export function InlineEdit({ value, onValueChange, onSave, label, validate, required = false, maxLength,
  disabled = false, editLabel = `Edit ${label}`, saveLabel = 'Save changes', cancelLabel = 'Cancel',
  focusFallback, className }: InlineEditProps): React.ReactElement {
  const [session, setSession] = React.useState<Session | null>(null);
  const [announcement, setAnnouncement] = React.useState('');
  const [settled, setSettled] = React.useState(0);
  const current = React.useRef<Session | null>(null);
  const generation = React.useRef(0);
  const mounted = React.useRef(false);
  const previousObserved = React.useRef(value);
  const disabledNow = React.useRef(disabled);
  const root = React.useRef<HTMLDivElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const returnFocus = React.useRef(false);
  const selectInput = React.useRef(false);

  // Set the synchronous guard before any consumer callback. React state alone cannot guard reentrant events.
  const publishSession = (next: Session | null) => {
    current.current = next;
    setSession(next ? { ...next } : null);
  };
  const valid = (candidate: Session) => mounted.current && current.current === candidate && candidate.generation === generation.current;

  useIsoLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current++; current.current = null; returnFocus.current = false; selectInput.current = false; };
  }, []);

  useIsoLayoutEffect(() => {
    disabledNow.current = disabled;
    if (previousObserved.current === value) return;
    previousObserved.current = value;
    const active = current.current;
    if (!active) return;
    active.conflicted = true;
    if (active.phase !== 'saving') {
      // Change the generation as well as phase so pending validation cannot dispatch after recovery.
      active.generation = ++generation.current;
      active.phase = 'conflict'; active.error = CHANGED; active.failed = false;
      setAnnouncement('');
    }
    setSession({ ...active });
  }, [value, disabled]);

  useIsoLayoutEffect(() => {
    if (selectInput.current && session) {
      selectInput.current = false;
      if (canFocus(input.current)) { input.current.focus(); input.current.select(); }
    }
    if (!session && returnFocus.current) {
      returnFocus.current = false;
      const target = canFocus(trigger.current) ? trigger.current : focusFallback?.();
      if (canFocus(target)) target.focus();
    }
  }, [session, focusFallback]);

  const close = () => {
    returnFocus.current = !!root.current?.contains(document.activeElement);
    generation.current++;
    publishSession(null);
  };
  const begin = () => {
    if (disabled || current.current) return;
    setAnnouncement(''); selectInput.current = true;
    publishSession({ generation: ++generation.current, phase: 'editing', baseline: value, draft: value });
  };
  const cancel = () => {
    const active = current.current;
    if (!active || active.phase === 'saving') return;
    setAnnouncement(''); close();
  };
  const fail = (active: Session, error: string, failed = false) => {
    if (!valid(active)) return;
    active.phase = 'error'; active.error = error; active.failed = failed;
    setAnnouncement(''); setSession({ ...active });
  };
  const submit = async () => {
    const active = current.current;
    if (!active || disabledNow.current || active.conflicted || active.phase === 'saving' || active.phase === 'validating') return;
    const draft = active.draft;
    if (draft === active.baseline) { setAnnouncement(''); close(); return; }
    if (required && draft.length === 0) { fail(active, 'Enter a value.'); return; }
    if (maxLength !== undefined && draft.length > maxLength) { fail(active, `Use ${maxLength} characters or fewer.`); return; }
    active.error = undefined; active.failed = false;
    if (validate) {
      active.phase = 'validating'; setSession({ ...active }); setAnnouncement('Checking value');
      const validatingGeneration = active.generation;
      let error: string | undefined;
      try { error = await validate(draft); }
      catch { error = SAVE_ERROR; }
      if (!valid(active) || active.generation !== validatingGeneration || active.conflicted) return;
      if (error !== undefined) { fail(active, typeof error === 'string' ? error : SAVE_ERROR); return; }
      if (disabledNow.current) { active.phase = 'editing'; setSession({ ...active }); setAnnouncement(''); return; }
    }
    // This phase is a synchronous in-flight lock, including for synchronous onSave implementations.
    active.phase = 'saving'; setSession({ ...active }); setAnnouncement('Saving changes');
    let result: InlineEditSaveResult;
    try { result = await onSave(draft, { previousValue: active.baseline }); }
    catch { result = { ok: false, error: SAVE_ERROR }; }
    if (!valid(active)) return;
    if (active.conflicted) {
      active.phase = 'conflict'; active.error = CHANGED_DURING_SAVE; active.failed = false;
      setSession({ ...active }); setAnnouncement(''); return;
    }
    if (!result || typeof result !== 'object' ||
      (result.ok === true ? typeof result.value !== 'string' : result.ok !== false || typeof result.error !== 'string' || !result.error)) {
      fail(active, SAVE_ERROR, true); return;
    }
    if (!result.ok) { fail(active, result.error, true); return; }
    // Close first: the consumer's synchronous publication is our accepted result, not an external conflict.
    close(); setSettled(count => count + 1); setAnnouncement('Changes saved');
    onValueChange(result.value);
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation();
      if (current.current?.phase === 'saving') setAnnouncement('Saving changes. Wait for the result.');
      else cancel();
    } else if (event.key === 'Enter' && event.target === input.current) {
      event.preventDefault(); event.stopPropagation(); void submit();
    }
  };
  const saving = session?.phase === 'saving';
  const validating = session?.phase === 'validating';
  return <div ref={root} className={cx('alt-inline-edit', className)} role="group" aria-label={label}
    data-state={session?.phase ?? 'read'} onKeyDown={session ? onKeyDown : undefined}>
    <Surface className="alt-inline-edit-surface" level={session ? 1 : 0} settle={settled || undefined}
      status={saving ? 'pending' : session?.failed ? 'failed' : undefined}>
      {session ? <>
        <Field label={label} required={required} error={session.error}>
          <Input ref={input} value={session.draft} maxLength={maxLength} disabled={disabled}
            readOnly={saving || validating || session.conflicted}
            onChange={event => {
              const active = current.current;
              if (!active || active.phase === 'saving' || active.phase === 'validating' || active.conflicted) return;
              active.draft = event.target.value; active.phase = 'editing'; active.error = undefined; active.failed = false;
              setSession({ ...active });
            }} />
        </Field>
        {session.conflicted && <p className="alt-inline-edit-current">Current value: <span>{value || 'Not set'}</span></p>}
        <div className="alt-inline-edit-actions">
          {session.conflicted && !saving && <Button type="button" onClick={() => {
            const active = current.current;
            if (!active || active.phase === 'saving') return;
            selectInput.current = true; setAnnouncement('');
            publishSession({ generation: ++generation.current, phase: 'editing', draft: value, baseline: value });
          }}>Use current value</Button>}
          <Button type="button" variant="primary" loading={saving} disabled={disabled || validating || session.conflicted}
            onClick={() => { void submit(); }}>{saveLabel}</Button>
          <Button type="button" variant="ghost" disabled={saving} onClick={cancel}>{cancelLabel}</Button>
        </div>
      </> : <div className="alt-inline-edit-read">
        <span className="alt-inline-edit-value">{value || 'Not set'}</span>
        <Button ref={trigger} type="button" variant="ghost" disabled={disabled} onClick={begin}>{editLabel}</Button>
      </div>}
    </Surface>
    <span className="alt-inline-edit-status" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
  </div>;
}
