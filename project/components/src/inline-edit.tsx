import * as React from 'react';
import { cx, Icons, Kbd, Surface, useDepth, useIsoLayoutEffect } from './core';
import { Button, Input, Textarea } from './controls';
import { useInPlaceMotion, useLingeringStatus } from './in-place';
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
  /**
   * How editing starts. 'button' (default): the value, then a visible Edit button. The others make the value its own
   * button, named “<label>: <value>. <editLabel>”: 'value' a plate that lifts on hover, 'pencil' a pencil shown on hover
   * or focus, 'field' the input's own border and floor drawn on hover, and a click puts the caret where it landed.
   */
  trigger?: 'button' | 'value' | 'pencil' | 'field';
  /** With trigger 'value', 'pencil' or 'field': 'seam' scores a faint groove under the value at rest, where its well will open, so people know to point at it. Default 'none'. */
  hint?: 'none' | 'seam';
  /** Shown for an empty value. Default “Not set”. */
  emptyLabel?: string;
  /** Single-key shortcut announced on the trigger (aria-keyshortcuts); the surrounding list handles the key. */
  shortcut?: string;
  /** How long a saved value's afterglow takes to fade, in ms. Default 5000. */
  settleDuration?: number;
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
const LINE = 21; // .alt-input textarea line-height, when the value's own font doesn't set one
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

// Where in the value a pointer press landed, so the caret can go there. A keyboard press (detail 0) selects everything instead.
function caretFrom(event: React.MouseEvent, text: HTMLElement | null, length: number): number | null {
  if (event.detail === 0 || !text) return null;
  const doc = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
  const pos = doc.caretPositionFromPoint?.(event.clientX, event.clientY);
  const range = pos ? null : document.caretRangeFromPoint?.(event.clientX, event.clientY);
  const node = pos?.offsetNode ?? range?.startContainer, offset = pos?.offset ?? range?.startOffset;
  if (node && node.nodeType === Node.TEXT_NODE && text.contains(node) && offset !== undefined) return Math.min(offset, length);
  return event.clientX > text.getBoundingClientRect().right ? length : 0;
}

/**
 * One local editing session. The application remains the sole owner of the committed value and write. Editing happens
 * in place: the value's text sits in a slot with the control's own inset and font, so when the control opens there, the
 * text doesn't move; only the well (floor, walls, border) fades in around it. Whatever still changes size glides.
 */
export function InlineEdit<V = string>({ value, onValueChange, onSave, label, validate, required = false, maxLength,
  disabled = false, editLabel = `Edit ${label}`, saveLabel = 'Save changes', cancelLabel = 'Cancel',
  focusFallback, className, renderValue, editor, commit = 'explicit', isEqual = Object.is, multiline = false, rows = 3, maxRows = 12,
  trigger: triggerMode = 'button', hint = 'none', emptyLabel = 'Not set', shortcut, settleDuration = 5000 }: InlineEditProps<V>): React.ReactElement {
  const [session, setSession] = React.useState<Session<V> | null>(null);
  const [announcement, setAnnouncement] = useLingeringStatus();
  const [settled, setSettled] = React.useState(0);
  const [glowing, setGlowing] = React.useState(false);
  const current = React.useRef<Session<V> | null>(null);
  const generation = React.useRef(0);
  const mounted = React.useRef(false);
  const previousObserved = React.useRef(value);
  const disabledNow = React.useRef(disabled);
  const root = React.useRef<HTMLDivElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const area = React.useRef<HTMLTextAreaElement>(null);
  const [apple, setApple] = React.useState(false);
  const textarea = multiline && !editor;
  const trigger = React.useRef<HTMLButtonElement>(null);
  const returnFocus = React.useRef(false);
  const selectInput = React.useRef(false);
  const caretAt = React.useRef<number | null>(null);
  const editorBox = React.useRef<HTMLDivElement>(null);
  const announceValue = React.useRef(false);
  const valueRef = React.useRef<HTMLSpanElement>(null);
  const fieldId = React.useId();
  const onChoose = commit === 'on-choose';
  const ownButton = triggerMode !== 'button';
  const capture = useInPlaceMotion(root, { widths: !textarea });
  const glow = useDepth({ settle: settled || undefined });

  // Set the synchronous guard before any consumer callback. React state alone cannot guard reentrant events.
  const publishSession = (next: Session<V> | null) => {
    current.current = next;
    setSession(next ? { ...next } : null);
  };
  const valid = (candidate: Session<V>) => mounted.current && current.current === candidate && candidate.generation === generation.current;

  React.useEffect(() => {
    if (typeof navigator !== 'undefined') setApple(/mac|iphone|ipad|ipod/i.test((navigator as any).userAgentData?.platform || navigator.platform || navigator.userAgent));
  }, []);
  // The textarea grows with its content up to maxRows, without animating each line.
  useIsoLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    const cs = getComputedStyle(el);
    const line = parseFloat(cs.lineHeight) || LINE;
    const edges = el.offsetHeight - el.clientHeight + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    el.style.height = Math.min(Math.max(el.scrollHeight, rows * line + edges), maxRows * line + edges) + 'px';
    el.style.overflowY = el.scrollHeight > maxRows * line + edges ? 'auto' : 'hidden';
  }, [session?.draft, session !== null, rows, maxRows]);

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
    capture(); setSession({ ...active });
  }, [value, disabled]);

  useIsoLayoutEffect(() => {
    if (selectInput.current && session) {
      selectInput.current = false;
      const at = caretAt.current;
      caretAt.current = null;
      if (editor) {
        const first = [...editorBox.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []].find(canFocus);
        if (first && !editorBox.current?.contains(document.activeElement)) first.focus();
      } else if (textarea) {
        // Caret at the end (or where the value was pressed): selecting a whole paragraph invites replacing it by accident.
        if (canFocus(area.current)) { const end = at ?? area.current.value.length; area.current.focus(); area.current.setSelectionRange(end, end); }
      } else if (canFocus(input.current)) {
        input.current.focus();
        if (at === null) input.current.select(); else input.current.setSelectionRange(at, at);
      }
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
    capture(); publishSession(null);
  };
  const begin = (at: number | null = null) => {
    if (disabled || current.current) return;
    setAnnouncement(''); setGlowing(false); selectInput.current = true; caretAt.current = at;
    capture(); publishSession({ generation: ++generation.current, phase: 'editing', baseline: value, draft: value });
  };
  const cancel = () => {
    const active = current.current;
    if (!active || active.phase === 'saving') return;
    setAnnouncement(''); close();
  };
  const fail = (active: Session<V>, error: string, failed = false) => {
    if (!valid(active)) return;
    active.phase = 'error'; active.error = error; active.failed = failed;
    setAnnouncement(''); capture(); setSession({ ...active });
  };
  const submit = async () => {
    const active = current.current;
    if (!active || disabledNow.current || active.conflicted || active.phase === 'saving' || active.phase === 'validating') return;
    const draft = active.draft;
    if (isEqual(draft, active.baseline)) { setAnnouncement(''); close(); return; }
    if (required && isEmpty(draft)) { fail(active, editor ? 'Choose a value.' : 'Enter a value.'); return; }
    if (maxLength !== undefined && typeof draft === 'string' && draft.length > maxLength) { fail(active, `Use ${maxLength} characters or fewer.`); return; }
    if (active.error) capture();
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
      capture(); setSession({ ...active }); setAnnouncement(''); return;
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
        capture(); setSession({ ...active }); setAnnouncement(''); return;
      }
    }
    // Close first: the consumer's synchronous publication is our accepted result, not an external conflict.
    close(); setSettled(count => count + 1); setGlowing(true);
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
    if (active.error) capture();
    active.draft = next; active.phase = 'editing'; active.error = undefined; active.failed = false;
    setSession({ ...active });
    if (onChoose) void submit();
  };
  const useCurrent = () => {
    const active = current.current;
    if (!active || active.phase === 'saving') return;
    selectInput.current = true; setAnnouncement('');
    capture(); publishSession({ generation: ++generation.current, phase: 'editing', draft: value, baseline: value });
  };

  const saving = session?.phase === 'saving';
  const validating = session?.phase === 'validating';
  const display = (shown: V) => isEmpty(shown) && (renderValue === undefined || ownButton) ? emptyLabel : renderValue ? renderValue(shown) : showValue(shown, emptyLabel);
  const [valueText, setValueText] = React.useState('');
  useIsoLayoutEffect(() => { if (ownButton && !session) setValueText(valueRef.current?.textContent?.trim() ?? ''); });
  const controlId = fieldId + '-control';
  const errorId = fieldId + '-error', hintId = fieldId + '-hint';
  const describedBy = session?.error ? errorId : (onChoose || textarea) ? hintId : undefined;
  const glowProps = glowing ? { ...glow, style: { ...glow.style, '--dur-settle': `${settleDuration}ms` } as React.CSSProperties } : {};
  const locked = saving || validating || !!session?.conflicted;
  const srLabel = <label className="alt-sr" htmlFor={controlId}>{label}</label>;

  const readSlot = triggerMode === 'button'
    ? <div className="alt-inline-edit-slot" data-slot="" {...glowProps}><span ref={valueRef} className="alt-inline-edit-value">{display(value)}</span></div>
    : <button ref={trigger} type="button" className={triggerMode === 'value' ? 'alt-inline-edit-plate' : 'alt-inline-edit-slot alt-inline-edit-slot-button'} data-slot=""
        data-empty={isEmpty(value) ? '' : undefined} data-hint={hint !== 'none' ? hint : undefined} disabled={disabled} {...glowProps}
        aria-label={`${label}: ${valueText || showValue(value, emptyLabel)}. ${editLabel}`} aria-keyshortcuts={shortcut}
        onClick={(event) => begin(triggerMode === 'field' && typeof value === 'string' && !editor ? caretFrom(event, valueRef.current, value.length) : null)}>
        <span ref={valueRef} className="alt-inline-edit-value">{display(value)}</span>
        {triggerMode === 'pencil' && <Icons.Pencil className="alt-inline-edit-pencil" size={15} />}
      </button>;

  const editSlot = session && (editor
    ? <div ref={editorBox} className="alt-inline-edit-slot-box alt-inline-edit-editor" data-slot="">{srLabel}{editor({
        value: session.draft, onValueChange: change, id: controlId, 'aria-describedby': describedBy, invalid: !!session.error,
        readOnly: locked, disabled, autoFocus: true,
      })}</div>
    : <div className="alt-inline-edit-slot-box" data-slot="">{srLabel}{textarea
      ? <Textarea ref={area} id={controlId} value={session.draft as unknown as string} maxLength={maxLength} disabled={disabled} rows={rows}
          readOnly={locked} invalid={!!session.error} aria-required={required || undefined} aria-describedby={describedBy}
          onChange={event => change(event.target.value as unknown as V)} />
      : <Input ref={input} id={controlId} value={session.draft as unknown as string} maxLength={maxLength} disabled={disabled}
          readOnly={locked} invalid={!!session.error} aria-required={required || undefined} aria-describedby={describedBy}
          onChange={event => change(event.target.value as unknown as V)} />}</div>);

  const actions = session ? <div className="alt-inline-edit-actions">
    {session.conflicted && !saving && <Button type="button" onClick={useCurrent}>Use current value</Button>}
    {(!onChoose || session.failed) && <Button type="button" variant="primary" loading={saving} disabled={disabled || validating || session.conflicted}
      onClick={() => { void submit(); }}>{onChoose ? 'Try again' : saveLabel}</Button>}
    <Button type="button" variant="ghost" disabled={saving} onClick={cancel}>{cancelLabel}</Button>
  </div> : !ownButton && <div className="alt-inline-edit-actions">
    <Button ref={trigger} type="button" variant="ghost" disabled={disabled} onClick={() => begin()}>{editLabel}</Button>
  </div>;

  return <div ref={root} className={cx('alt-inline-edit', className)} role="group" aria-label={label}
    data-state={session?.phase ?? 'read'} data-trigger={triggerMode} data-multiline={textarea ? '' : undefined} onKeyDown={session ? onKeyDown : undefined}>
    <Surface className="alt-inline-edit-surface" level={0} status={saving ? 'pending' : session?.failed ? 'failed' : undefined}>
      <div className="alt-inline-edit-line">{session ? editSlot : readSlot}{actions}</div>
      {session?.error && <p className="alt-field-error alt-inline-edit-note" id={errorId} role="alert" data-arrive=""><Icons.AlertCircle size={14} />{session.error}</p>}
      {session && !session.error && textarea && <p className="alt-field-hint alt-inline-edit-note" id={hintId} data-arrive="">
        <span className="alt-inline-edit-keys">{apple ? <Kbd aria-label="Command">⌘</Kbd> : <Kbd>Ctrl</Kbd>}+<Kbd>Enter</Kbd> to save</span></p>}
      {session && !session.error && onChoose && <p className="alt-field-hint alt-inline-edit-note" id={hintId} data-arrive="">Choose to save</p>}
      {session?.conflicted && <p className="alt-inline-edit-current alt-inline-edit-note" data-arrive="">Current value: <span>{display(value)}</span></p>}
    </Surface>
    <span className="alt-sr" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
  </div>;
}
