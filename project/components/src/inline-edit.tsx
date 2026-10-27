import * as React from 'react';
import { cx, Icons, Kbd, Surface, useIsoLayoutEffect } from './core';
import { Button, Field, Input, Textarea } from './controls';
export type InlineEditSaveResult<V = string> = { ok: true; value: V } | { ok: false; error: string };
/** Spread onto any Altitude control (Select, Combobox, Switch through a small adapter, a numeric Input). */
export interface InlineEditControl<V> {
  value: V;
  onValueChange: (value: V) => void;
  id: string;
  'aria-describedby'?: string;
  invalid: boolean;
  /** True while checking, saving or blocked by a conflict: changes are ignored until it clears. */
  readOnly: boolean;
  disabled: boolean;
  autoFocus: true;
}
export interface InlineEditProps<V = string> {
  value: V;
  onValueChange: (canonicalValue: V) => void;
  onSave: (draft: V, context: { previousValue: V }) => InlineEditSaveResult<V> | Promise<InlineEditSaveResult<V>>;
  label: string;
  validate?: (draft: V) => string | undefined | Promise<string | undefined>;
  required?: boolean;
  maxLength?: number;
  disabled?: boolean;
  editLabel?: string;
  saveLabel?: string;
  cancelLabel?: string;
  focusFallback?: () => HTMLElement | null;
  className?: string;
  /** Read mode. Default: the value as text, or “Not set” when empty. */
  renderValue?: (value: V) => React.ReactNode;
  /** Edit mode. Default: the existing Input for a string. */
  editor?: (control: InlineEditControl<V>) => React.ReactNode;
  /** 'on-choose' saves as soon as a single-choice editor reports a value; Save is hidden. Default 'explicit'. */
  commit?: 'explicit' | 'on-choose';
  /** An unchanged draft closes without a write, and an equal observed value isn't an external change. Default Object.is. */
  isEqual?: (a: V, b: V) => boolean;
  /** A Textarea instead of the Input: Enter inserts a newline and Ctrl/Cmd+Enter saves. Default false. */
  multiline?: boolean;
  /** With multiline, the textarea's initial height in lines. Default 3. */
  rows?: number;
  /** With multiline, the textarea grows with its content up to this many lines, then scrolls. Default 12. */
  maxRows?: number;
  /** 'value': read mode is one button holding the value, named “<label>: <value>. <editLabel>”. Default 'button' (value, then an Edit button). */
  trigger?: 'button' | 'value';
  /** Shown for an empty value. Default “Not set”. */
  emptyLabel?: string;
  /** Single-key shortcut announced on the trigger (aria-keyshortcuts); the surrounding list handles the key. */
  shortcut?: string;
}
type Session<V> = {
  generation: number;
  phase: 'editing' | 'validating' | 'saving' | 'error' | 'conflict';
  baseline: V;
  draft: V;
  error?: string;
  failed?: boolean;
  conflicted?: boolean;
};
const SAVE_ERROR = 'We couldn’t save this change. Try again.';
const CHANGED = 'The saved value changed. Review the current value before saving.';
const CHANGED_DURING_SAVE = 'The value changed while saving. Your save may have completed. Check the current record.';
const FOCUSABLE = 'button, input:not([type="hidden"]), select, textarea, a[href], [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
const LINE = 21; // .alt-input textarea line-height
const ms = (cs: CSSStyleDeclaration, name: string, fallback: number) => parseFloat(cs.getPropertyValue(name)) || fallback;
const isEmpty = (value: unknown) => value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
const showValue = (value: unknown, empty = 'Not set') => isEmpty(value) ? empty : String(value);
// Let a closing popup (a Select's list sinking) finish before the editor itself settles: the two never move at once.
const afterMotion = (element: HTMLElement | null) => !element?.getAnimations ? Promise.resolve() : Promise.race([
  Promise.all(element.getAnimations({ subtree: true }).filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => undefined))),
  new Promise(resolve => setTimeout(resolve, 400)),
]);

function canFocus(element: HTMLElement | null | undefined): element is HTMLElement {
  return !!element?.isConnected && !element.matches(':disabled, [aria-disabled="true"]') &&
    !element.closest('[inert]') && element.matches('button, input:not([type="hidden"]), select, textarea, a[href], area[href], summary, [tabindex], [contenteditable="true"]') &&
    element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
}

/** One local editing session. The application remains the sole owner of the committed value and write. */
export function InlineEdit<V = string>({ value, onValueChange, onSave, label, validate, required = false, maxLength,
  disabled = false, editLabel = `Edit ${label}`, saveLabel = 'Save changes', cancelLabel = 'Cancel',
  focusFallback, className, renderValue, editor, commit = 'explicit', isEqual = Object.is, multiline = false, rows = 3, maxRows = 12, trigger: triggerMode = 'button', emptyLabel = 'Not set', shortcut }: InlineEditProps<V>): React.ReactElement {
  const [session, setSession] = React.useState<Session<V> | null>(null);
  const [announcement, setAnnouncement] = React.useState('');
  const [settled, setSettled] = React.useState(0);
  const current = React.useRef<Session<V> | null>(null);
  const generation = React.useRef(0);
  const mounted = React.useRef(false);
  const previousObserved = React.useRef(value);
  const disabledNow = React.useRef(disabled);
  const root = React.useRef<HTMLDivElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const area = React.useRef<HTMLTextAreaElement>(null);
  const surface = React.useRef<HTMLDivElement>(null);
  const openedFrom = React.useRef<number | null>(null);
  const [apple, setApple] = React.useState(false);
  const textarea = multiline && !editor;
  const trigger = React.useRef<HTMLButtonElement>(null);
  const returnFocus = React.useRef(false);
  const selectInput = React.useRef(false);
  const editorBox = React.useRef<HTMLDivElement>(null);
  const announceValue = React.useRef(false);
  const fieldId = React.useId();
  const onChoose = commit === 'on-choose';

  // Set the synchronous guard before any consumer callback. React state alone cannot guard reentrant events.
  const publishSession = (next: Session<V> | null) => {
    current.current = next;
    setSession(next ? { ...next } : null);
  };
  const valid = (candidate: Session<V>) => mounted.current && current.current === candidate && candidate.generation === generation.current;

  React.useEffect(() => {
    if (typeof navigator !== 'undefined') setApple(/Mac|iPhone|iPad|iPod/.test((navigator as any).userAgentData?.platform || navigator.platform || navigator.userAgent));
  }, []);
  // The textarea grows with its content up to maxRows, without animating each line.
  useIsoLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    const edges = el.offsetHeight - el.clientHeight + parseFloat(getComputedStyle(el).paddingTop) + parseFloat(getComputedStyle(el).paddingBottom);
    el.style.height = Math.min(Math.max(el.scrollHeight, rows * LINE + edges), maxRows * LINE + edges) + 'px';
    el.style.overflowY = el.scrollHeight > maxRows * LINE + edges ? 'auto' : 'hidden';
  }, [session?.draft, session !== null, rows, maxRows]);
  // Opening a multiline editor glides the region's height from the read text to the textarea's.
  useIsoLayoutEffect(() => {
    const from = openedFrom.current, el = surface.current;
    openedFrom.current = null;
    if (from === null || !el || !session || typeof el.animate !== 'function') return;
    const cs = getComputedStyle(el);
    if (parseFloat(cs.getPropertyValue('--alt-travel')) === 0) return;
    const to = el.offsetHeight;
    if (Math.abs(to - from) < 2) return;
    el.animate([{ height: from + 'px', overflow: 'hidden' }, { height: to + 'px', overflow: 'hidden' }],
      { duration: ms(cs, '--dur-travel-3', 280), easing: cs.getPropertyValue('--ease-glide').trim() || 'ease' });
  }, [session !== null]);

  useIsoLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current++; current.current = null; returnFocus.current = false; selectInput.current = false; announceValue.current = false; };
  }, []);

  useIsoLayoutEffect(() => {
    disabledNow.current = disabled;
    if (isEqual(previousObserved.current, value)) return;
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
      if (editor) {
        const first = [...editorBox.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []].find(canFocus);
        if (first && !editorBox.current?.contains(document.activeElement)) first.focus();
      } else if (textarea) {
        // Caret at the end: selecting a whole paragraph invites replacing it by accident.
        if (canFocus(area.current)) { const end = area.current.value.length; area.current.focus(); area.current.setSelectionRange(end, end); }
      } else if (canFocus(input.current)) { input.current.focus(); input.current.select(); }
    }
    if (!session && returnFocus.current) {
      returnFocus.current = false;
      const target = canFocus(trigger.current) ? trigger.current : focusFallback?.();
      if (canFocus(target)) target.focus();
    }
    if (!session && announceValue.current) {
      announceValue.current = false;
      const shown = root.current?.querySelector('.alt-inline-edit-value')?.textContent?.trim();
      setAnnouncement(shown ? `${label} set to ${shown}` : 'Changes saved');
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
    if (textarea) openedFrom.current = surface.current?.offsetHeight ?? null;
    publishSession({ generation: ++generation.current, phase: 'editing', baseline: value, draft: value });
  };
  const cancel = () => {
    const active = current.current;
    if (!active || active.phase === 'saving') return;
    setAnnouncement(''); close();
  };
  const fail = (active: Session<V>, error: string, failed = false) => {
    if (!valid(active)) return;
    active.phase = 'error'; active.error = error; active.failed = failed;
    setAnnouncement(''); setSession({ ...active });
  };
  const submit = async () => {
    const active = current.current;
    if (!active || disabledNow.current || active.conflicted || active.phase === 'saving' || active.phase === 'validating') return;
    const draft = active.draft;
    if (isEqual(draft, active.baseline)) { setAnnouncement(''); close(); return; }
    if (required && isEmpty(draft)) { fail(active, editor ? 'Choose a value.' : 'Enter a value.'); return; }
    if (maxLength !== undefined && typeof draft === 'string' && draft.length > maxLength) { fail(active, `Use ${maxLength} characters or fewer.`); return; }
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
    let result: InlineEditSaveResult<V>;
    try { result = await onSave(draft, { previousValue: active.baseline }); }
    catch { result = { ok: false, error: SAVE_ERROR }; }
    if (!valid(active)) return;
    if (active.conflicted) {
      active.phase = 'conflict'; active.error = CHANGED_DURING_SAVE; active.failed = false;
      setSession({ ...active }); setAnnouncement(''); return;
    }
    if (!result || typeof result !== 'object' ||
      (result.ok === true ? (editor ? result.value === undefined : typeof result.value !== 'string') : result.ok !== false || typeof result.error !== 'string' || !result.error)) {
      fail(active, SAVE_ERROR, true); return;
    }
    if (!result.ok) { fail(active, result.error, true); return; }
    if (onChoose) {
      await afterMotion(root.current);
      if (!valid(active)) return;
      if (active.conflicted) {
        active.phase = 'conflict'; active.error = CHANGED_DURING_SAVE; active.failed = false;
        setSession({ ...active }); setAnnouncement(''); return;
      }
    }
    // Close first: the consumer's synchronous publication is our accepted result, not an external conflict.
    close(); setSettled(count => count + 1);
    if (onChoose) { announceValue.current = true; setAnnouncement(''); } else setAnnouncement('Changes saved');
    onValueChange(result.value);
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    // An open popup (a Select's list) owns its Escape, even while focus is still on its trigger: the next Escape cancels.
    if (event.key === 'Escape' && event.target instanceof HTMLElement && event.target.getAttribute('aria-expanded') === 'true') return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation();
      if (current.current?.phase === 'saving') setAnnouncement('Saving changes. Wait for the result.');
      else cancel();
    } else if (event.key === 'Enter' && textarea) {
      // Enter writes a newline; Ctrl/Cmd+Enter saves.
      if (event.target === area.current && (event.ctrlKey || event.metaKey)) { event.preventDefault(); event.stopPropagation(); void submit(); }
    } else if (event.key === 'Enter' && !event.defaultPrevented && (editor ? submitsOnEnter(event.target) : event.target === input.current)) {
      event.preventDefault(); event.stopPropagation(); void submit();
    }
  };
  // A custom editor's single-line text input saves on Enter, as the default Input does; choice controls handle Enter themselves.
  const submitsOnEnter = (target: EventTarget) => !onChoose && target instanceof HTMLInputElement &&
    !!editorBox.current?.contains(target) && !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'color'].includes(target.type) &&
    target.getAttribute('aria-expanded') !== 'true';
  const change = (next: V) => {
    const active = current.current;
    if (!active || active.phase === 'saving' || active.phase === 'validating' || active.conflicted) return;
    active.draft = next; active.phase = 'editing'; active.error = undefined; active.failed = false;
    setSession({ ...active });
    if (onChoose) void submit();
  };
  const saving = session?.phase === 'saving';
  const validating = session?.phase === 'validating';
  const display = (shown: V) => isEmpty(shown) && (renderValue === undefined || triggerMode === 'value') ? emptyLabel : renderValue ? renderValue(shown) : showValue(shown, emptyLabel);
  const valueRef = React.useRef<HTMLSpanElement>(null);
  const [valueText, setValueText] = React.useState('');
  useIsoLayoutEffect(() => { if (triggerMode === 'value' && !session) setValueText(valueRef.current?.textContent?.trim() ?? ''); });
  const controlId = fieldId + '-control';
  const describedBy = session?.error ? fieldId + '-error' : onChoose ? fieldId + '-hint' : undefined;
  return <div ref={root} className={cx('alt-inline-edit', className)} role="group" aria-label={label}
    data-state={session?.phase ?? 'read'} data-multiline={textarea ? '' : undefined} onKeyDown={session ? onKeyDown : undefined}>
    <Surface ref={surface} className="alt-inline-edit-surface" level={session ? 1 : 0} settle={settled || undefined}
      status={saving ? 'pending' : session?.failed ? 'failed' : undefined}>
      {session ? <>
        {editor ? <div className="alt-field">
          <label className="alt-field-label" htmlFor={controlId}>{label}{required && <span className="alt-field-req" aria-hidden="true"> *</span>}</label>
          <div ref={editorBox} className="alt-inline-edit-editor">{editor({
            value: session.draft, onValueChange: change, id: controlId, 'aria-describedby': describedBy, invalid: !!session.error,
            readOnly: saving || validating || !!session.conflicted, disabled, autoFocus: true,
          })}</div>
          {session.error ? <p className="alt-field-error" id={fieldId + '-error'} role="alert"><Icons.AlertCircle size={14} />{session.error}</p>
            : onChoose && <p className="alt-field-hint" id={fieldId + '-hint'}>Choose to save</p>}
        </div> : textarea ? <Field label={label} required={required} error={session.error}
          hint={<span className="alt-inline-edit-keys">{apple ? <Kbd aria-label="Command">⌘</Kbd> : <Kbd>Ctrl</Kbd>}+<Kbd>Enter</Kbd> to save</span>}>
          <Textarea ref={area} value={session.draft as unknown as string} maxLength={maxLength} disabled={disabled} rows={rows}
            readOnly={saving || validating || session.conflicted}
            onChange={event => change(event.target.value as unknown as V)} />
        </Field> : <Field label={label} required={required} error={session.error}>
          <Input ref={input} value={session.draft as unknown as string} maxLength={maxLength} disabled={disabled}
            readOnly={saving || validating || session.conflicted}
            onChange={event => change(event.target.value as unknown as V)} />
        </Field>}
        {session.conflicted && <p className="alt-inline-edit-current">Current value: <span>{display(value)}</span></p>}
        <div className="alt-inline-edit-actions">
          {session.conflicted && !saving && <Button type="button" onClick={() => {
            const active = current.current;
            if (!active || active.phase === 'saving') return;
            selectInput.current = true; setAnnouncement('');
            publishSession({ generation: ++generation.current, phase: 'editing', draft: value, baseline: value });
          }}>Use current value</Button>}
          {(!onChoose || session.failed) && <Button type="button" variant="primary" loading={saving} disabled={disabled || validating || session.conflicted}
            onClick={() => { void submit(); }}>{onChoose ? 'Try again' : saveLabel}</Button>}
          <Button type="button" variant="ghost" disabled={saving} onClick={cancel}>{cancelLabel}</Button>
        </div>
      </> : triggerMode === 'value' ? <div className="alt-inline-edit-read">
        <button ref={trigger} type="button" className="alt-inline-edit-plate" data-empty={isEmpty(value) ? '' : undefined} disabled={disabled}
          aria-label={`${label}: ${valueText || showValue(value, emptyLabel)}. ${editLabel}`} aria-keyshortcuts={shortcut} onClick={begin}>
          <span ref={valueRef} className="alt-inline-edit-value">{display(value)}</span>
        </button>
      </div> : <div className="alt-inline-edit-read">
        <span className="alt-inline-edit-value">{display(value)}</span>
        <Button ref={trigger} type="button" variant="ghost" disabled={disabled} onClick={begin}>{editLabel}</Button>
      </div>}
    </Surface>
    <span className="alt-inline-edit-status" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
  </div>;
}
