import * as React from 'react';
import { cx, Icons, Kbd, Surface, useDepth, useIsoLayoutEffect, useKeyboardLikely } from './core';
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
  /**
   * What leaving the field does: focus moving out of the group, or a pointer pressed outside it. 'keep' (default) leaves
   * the session open. 'cancel' cancels it as Cancel does, without moving focus, except while checking or saving, or while
   * an error or conflict is shown. 'save' submits a changed draft once after leaving the complete editor. Outside
   * activation finishes first; errors retain the draft for explicit retry. Completion never takes focus back.
   */
  leave?: 'keep' | 'cancel' | 'save';
  /**
   * Where Save and Cancel go while editing. 'buttons' (default): a Save button and a Cancel button take Edit's place on
   * the line. 'inline': a check (Save) and a cross (Cancel) inside the field's trailing end, for tight places such as a
   * table cell. Applies to the default Input; ignored with multiline or a custom editor.
   */
  actions?: 'buttons' | 'inline';
  /**
   * Where a written value waits for the server (#513). 'editor' (default): the editor stays open, read-only, with Save
   * loading. 'value': the editor folds back at once to the value being written, which hovers as pending; a rejection or
   * a conflict opens the editor again with the draft, the message and the caret at its end. commit="on-choose" always
   * folds, once its list has closed.
   */
  pending?: 'editor' | 'value';
}
type Session<V> = {
  generation: number;
  phase: 'editing' | 'validating' | 'saving' | 'error' | 'conflict';
  baseline: V;
  draft: V;
  error?: string;
  failed?: boolean;
  conflicted?: boolean;
  /** The editor has folded back to the value, which hovers while the write runs: commit="on-choose" once its list has closed, or pending="value". */
  folded?: boolean;
  /** Automatic leave saves never restore or transfer focus. */
  restoreFocus?: boolean;
  /** Crossing the boundary again must not retry the same rejected value. */
  rejectedDraft?: { value: V };
};
const SAVE_ERROR = 'We couldn’t save this change. Try again.';
const CHANGED = 'The saved value changed. Review the current value before saving.';
const CHANGED_DURING_SAVE = 'The value changed while saving. Your save may have completed. Check the current record.';
const FOCUSABLE = 'button, input:not([type="hidden"]), select, textarea, a[href], [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
const LINE = 21; // .alt-input textarea line-height, when the value's own font doesn't set one
const isEmpty = (value: unknown) => value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
const showValue = (value: unknown, empty = 'Not set') => isEmpty(value) ? empty : String(value);
// Let a closing popup (a Select's list sinking) finish before the editor itself settles: the two never move at once.
// A chosen value's list (or calendar) closing: only the popup's own motion, so a pending surface's transitions don't hold it.
const POPUP = '[role="listbox"], [role="dialog"], [role="grid"], .alt-pop';
// Two frames first: the choice is still being published, and the popup only starts closing once it has rendered.
const frames = () => new Promise<void>(resolve => { if (typeof requestAnimationFrame === 'undefined') resolve(); else requestAnimationFrame(() => requestAnimationFrame(() => resolve())); });
const afterPopup = (element: HTMLElement | null) => !element?.getAnimations ? Promise.resolve() : Promise.race([
  frames().then(() => Promise.all(element.getAnimations({ subtree: true }).filter(a => a.effect?.getTiming().iterations !== Infinity &&
    (a.effect as KeyframeEffect | null)?.target instanceof Element && !!((a.effect as KeyframeEffect).target as Element).closest(POPUP)).map(a => a.finished.catch(() => undefined)))),
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
  trigger: triggerMode = 'button', hint = 'none', emptyLabel = 'Not set', shortcut, settleDuration = 5000, leave = 'keep', actions: placement = 'buttons', pending: pendingAt = 'editor' }: InlineEditProps<V>): React.ReactElement {
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
  // On a touch-only device the save hint says the touch way, not a shortcut (#262).
  const keyboard = useKeyboardLikely();
  const textarea = multiline && !editor;
  // A single-line value that wraps at rest opens in a field that wraps the same way, so its text stays where it is (#494).
  // It's still one line of text: Enter saves and line breaks become spaces.
  const [wrapped, setWrapped] = React.useState(false);
  const long = wrapped && !editor && !textarea;
  const trigger = React.useRef<HTMLButtonElement>(null);
  const returnFocus = React.useRef(false);
  const selectInput = React.useRef(false);
  const caretAt = React.useRef<number | null>(null);
  const editorBox = React.useRef<HTMLDivElement>(null);
  const announceValue = React.useRef(false);
  const plateFocus = React.useRef(false);
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
    const least = long ? 1 : rows;
    el.style.height = Math.min(Math.max(el.scrollHeight, least * line + edges), maxRows * line + edges) + 'px';
    el.style.overflowY = el.scrollHeight > maxRows * line + edges ? 'auto' : 'hidden';
  }, [session?.draft, session !== null, rows, maxRows, long]);

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
      } else if (long) {
        // As the single-line field: everything selected, or the caret where the value was pressed.
        if (canFocus(area.current)) { area.current.focus(); if (at === null) area.current.select(); else area.current.setSelectionRange(at, at); }
      } else if (textarea) {
        // Caret at the end (or where the value was pressed): selecting a whole paragraph invites replacing it by accident.
        if (canFocus(area.current)) { const end = at ?? area.current.value.length; area.current.focus(); area.current.setSelectionRange(end, end); }
      } else if (canFocus(input.current)) {
        input.current.focus();
        // Selecting scrolls a long value to its end; put its start back where the read text was, so nothing moves.
        if (at === null) { input.current.select(); input.current.scrollLeft = 0; } else input.current.setSelectionRange(at, at);
      }
    }
    // On-choose: the editor folded back to the value while the write runs; keep focus on it, as on success.
    if (session?.folded && plateFocus.current) {
      plateFocus.current = false;
      // aria-disabled while saving, but it still holds focus (canFocus would refuse it), so Escape is still heard.
      if (trigger.current?.isConnected) trigger.current.focus();
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
    returnFocus.current = current.current?.restoreFocus !== false && !!root.current?.contains(document.activeElement);
    generation.current++;
    capture(); publishSession(null);
  };
  const begin = (at: number | null = null) => {
    if (disabled || current.current) return;
    if (!editor && !textarea) {
      const shown = valueRef.current, line = shown ? parseFloat(getComputedStyle(shown).lineHeight) || LINE : LINE;
      setWrapped(!!shown && shown.getBoundingClientRect().height > line * 1.5);
    }
    setAnnouncement(''); setGlowing(false); selectInput.current = true; caretAt.current = at;
    capture(); publishSession({ generation: ++generation.current, phase: 'editing', baseline: value, draft: value });
  };
  const cancel = () => {
    const active = current.current;
    if (!active || active.phase === 'saving') return;
    active.restoreFocus = true;
    setAnnouncement(''); close();
  };
  // A folded on-choose session opens its editor again (to show an error or a conflict), with focus back in it.
  const unfold = (active: Session<V>) => {
    if (!active.folded) return;
    active.folded = false;
    if (active.restoreFocus !== false && root.current?.contains(document.activeElement)) {
      selectInput.current = true;
      // Back to typing where they left off, not with the whole draft selected to be replaced.
      if (!editor && typeof active.draft === 'string') caretAt.current = active.draft.length;
    }
  };
  const fail = (active: Session<V>, error: string, failed = false) => {
    if (!valid(active)) return;
    unfold(active);
    active.phase = 'error'; active.error = error; active.failed = failed; active.rejectedDraft = { value: active.draft };
    setAnnouncement(''); capture(); setSession({ ...active });
  };
  const submit = async (restoreFocus = true) => {
    const active = current.current;
    if (!active || disabledNow.current || active.conflicted || active.phase === 'saving' || active.phase === 'validating') return;
    active.restoreFocus = restoreFocus;
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
    active.phase = 'saving';
    // pending="value": the editor folds back to the value being written at once; it hovers while the write runs.
    if (!onChoose && pendingAt === 'value') { plateFocus.current = active.restoreFocus !== false && !!root.current?.contains(document.activeElement); active.folded = true; capture(); }
    setSession({ ...active }); setAnnouncement('Saving changes');
    // On-choose: once the list has closed, the editor folds back to the chosen value, which hovers while the write runs
    // (Elevation, Editing in place). It doesn't wait for the write: only an error or a conflict opens the editor again.
    const listClosed = onChoose ? afterPopup(root.current).then(() => {
      if (!valid(active) || active.phase !== 'saving') return;
      plateFocus.current = active.restoreFocus !== false && !!root.current?.contains(document.activeElement);
      active.folded = true; capture(); setSession({ ...active });
    }) : undefined;
    let result: InlineEditSaveResult<V>;
    try { result = await onSave(draft, { previousValue: active.baseline }); }
    catch { result = { ok: false, error: SAVE_ERROR }; }
    if (!valid(active)) return;
    if (active.conflicted) {
      unfold(active);
      active.phase = 'conflict'; active.error = CHANGED_DURING_SAVE; active.failed = false;
      capture(); setSession({ ...active }); setAnnouncement(''); return;
    }
    if (!result || typeof result !== 'object' ||
      (result.ok === true ? (editor ? result.value === undefined : typeof result.value !== 'string') : result.ok !== false || typeof result.error !== 'string' || !result.error)) {
      fail(active, SAVE_ERROR, true); return;
    }
    if (!result.ok) { fail(active, result.error, true); return; }
    if (listClosed) {
      // The list closes first, then the value settles.
      await listClosed;
      if (!valid(active)) return;
      if (active.conflicted) {
        unfold(active);
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
    } else if (event.key === 'Enter' && long && event.target === area.current) {
      event.preventDefault(); event.stopPropagation(); void submit();
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
  // Inside the group, or inside a popup it points at (a portalled list or calendar), counts as staying.
  const owns = (node: Node | null) => {
    const box = root.current;
    if (!box || !node) return false;
    if (box.contains(node)) return true;
    const pending: Element[] = [box], visited = new Set<Element>();
    // Follow nested ownership too, without looping on reciprocal aria-controls/aria-owns relationships.
    for (const owner of pending) {
      if (visited.has(owner)) continue;
      visited.add(owner);
      for (const el of [owner, ...owner.querySelectorAll('[aria-controls], [aria-owns]')]) {
        for (const id of `${el.getAttribute('aria-controls') ?? ''} ${el.getAttribute('aria-owns') ?? ''}`.split(/\s+/)) {
          const popup = id && document.getElementById(id);
          if (!popup) continue;
          if (popup.contains(node)) return true;
          if (!visited.has(popup)) pending.push(popup);
        }
      }
    }
    return false;
  };
  // leave="cancel": the same path as Cancel, but focus stays wherever the person went. A dispatched write or a running check
  // can't be abandoned, and an error or conflict stays until the person has seen it and their text isn't lost.
  const leaveNow = React.useRef(() => {});
  leaveNow.current = () => {
    const active = current.current;
    if (!active || active.phase !== 'editing' || active.error) return;
    if (leave === 'save') {
      if (active.rejectedDraft && isEqual(active.draft, active.rejectedDraft.value)) return;
      void submit(false); return;
    }
    if (leave !== 'cancel') return;
    setAnnouncement(''); returnFocus.current = false; generation.current++;
    capture(); publishSession(null);
  };
  React.useEffect(() => {
    if (leave !== 'cancel' || !session) return;
    const down = (event: PointerEvent) => { if (!owns(event.target as Node)) leaveNow.current(); };
    document.addEventListener('pointerdown', down, true);
    return () => document.removeEventListener('pointerdown', down, true);
  }, [leave, session !== null]);
  // Only focus that went somewhere counts. With no relatedTarget it went to another window or tab, or was dropped
  // (a control disabled or removed); a press on the page itself is the pointerdown above.
  const onLeaveFocus = (event: React.FocusEvent) => {
    if (event.relatedTarget && !owns(event.relatedTarget as Node)) leaveNow.current();
  };
  React.useEffect(() => {
    if (leave !== 'save' || !session) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pointer: number | null = null;
    let pressed = false;
    let composing = false;
    const clear = () => { clearTimeout(timer); timer = undefined; };
    const schedule = (source?: HTMLElement) => {
      clear();
      const active = current.current, token = active?.generation;
      if (composing || !active) return;
      // Native activation/focus transfer runs first. A synchronous validator, canonical save or folded pending
      // view can then change layout without removing or moving the destination underneath an unfinished click.
      timer = setTimeout(() => {
        timer = undefined;
        if (!mounted.current || current.current !== active || active.generation !== token || composing ||
          disabledNow.current || !document.hasFocus() ||
          (source && (!canFocus(source) || owns(document.activeElement)))) return;
        leaveNow.current();
      }, 0);
    };
    const down = (event: PointerEvent) => {
      clear();
      pointer = event.button === 0 && !owns(event.target as Node) ? event.pointerId : null;
      pressed = pointer !== null;
    };
    const up = () => { pressed = false; };
    const key = () => { pointer = null; pressed = false; };
    const click = (event: MouseEvent) => {
      const outside = pointer !== null && (!(event instanceof PointerEvent) || event.pointerId === pointer) && !owns(event.target as Node);
      pointer = null; pressed = false;
      if (outside) schedule();
    };
    const focusout = (event: FocusEvent) => {
      if (!pressed && event.relatedTarget && owns(event.target as Node) && !owns(event.relatedTarget as Node)) {
        schedule(event.target instanceof HTMLElement ? event.target : undefined);
      }
    };
    const cancelPointer = () => { pointer = null; pressed = false; clear(); };
    const startComposition = (event: CompositionEvent) => { if (owns(event.target as Node)) { composing = true; clear(); } };
    const endComposition = () => { composing = false; };
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('pointerup', up, true);
    document.addEventListener('keydown', key, true);
    document.addEventListener('click', click, true);
    document.addEventListener('pointercancel', cancelPointer, true);
    document.addEventListener('focusout', focusout, true);
    document.addEventListener('compositionstart', startComposition, true);
    document.addEventListener('compositionend', endComposition, true);
    window.addEventListener('blur', cancelPointer);
    return () => {
      clear();
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('pointerup', up, true);
      document.removeEventListener('keydown', key, true);
      document.removeEventListener('click', click, true);
      document.removeEventListener('pointercancel', cancelPointer, true);
      document.removeEventListener('focusout', focusout, true);
      document.removeEventListener('compositionstart', startComposition, true);
      document.removeEventListener('compositionend', endComposition, true);
      window.removeEventListener('blur', cancelPointer);
    };
  }, [leave, session !== null]);
  const useCurrent = () => {
    const active = current.current;
    if (!active || active.phase === 'saving') return;
    selectInput.current = true; setAnnouncement('');
    capture(); publishSession({ generation: ++generation.current, phase: 'editing', draft: value, baseline: value });
  };

  const saving = session?.phase === 'saving';
  const folded = saving && !!session?.folded;
  const validating = session?.phase === 'validating';
  const display = (shown: V) => isEmpty(shown) && (renderValue === undefined || ownButton) ? emptyLabel : renderValue ? renderValue(shown) : showValue(shown, emptyLabel);
  const [valueText, setValueText] = React.useState('');
  useIsoLayoutEffect(() => { if (ownButton && (!session || session.folded)) setValueText(valueRef.current?.textContent?.trim() ?? ''); });
  const controlId = fieldId + '-control';
  const errorId = fieldId + '-error', hintId = fieldId + '-hint';
  const describedBy = session?.error ? errorId : (onChoose || textarea || leave === 'save') ? hintId : undefined;
  const glowProps = glowing ? { ...glow, style: { ...glow.style, '--dur-settle': `${settleDuration}ms` } as React.CSSProperties } : {};
  const locked = saving || validating || !!session?.conflicted;
  // actions="inline": Save and Cancel as icon buttons at the field's trailing end, the same submit and cancel as the row.
  const inlineActions = placement === 'inline' && !editor && !textarea && !long;
  const icons = session && inlineActions ? <span className="alt-inline-edit-icons">
    <Button type="button" variant="ghost" size="sm" square aria-label={leave === 'save' && session.failed ? 'Try again' : saveLabel} loading={saving} disabled={disabled || validating || session.conflicted}
      onClick={() => { void submit(); }}><Icons.Check size={16} /></Button>
    <Button type="button" variant="ghost" size="sm" square aria-label={cancelLabel} disabled={saving} onClick={cancel}><Icons.X size={16} /></Button>
  </span> : undefined;
  const srLabel = <label className="alt-sr" htmlFor={controlId}>{label}</label>;

  // Folded: the chosen value, shown where the editor was while it's written.
  const shown = folded ? session!.draft : value;
  const readSlot = triggerMode === 'button'
    ? <div className="alt-inline-edit-slot" data-slot="" {...glowProps}><span ref={valueRef} className="alt-inline-edit-value">{display(shown)}</span></div>
    : <button ref={trigger} type="button" className={triggerMode === 'value' ? 'alt-inline-edit-plate' : 'alt-inline-edit-slot alt-inline-edit-slot-button'} data-slot=""
        data-empty={isEmpty(shown) ? '' : undefined} data-hint={hint !== 'none' ? hint : undefined} disabled={disabled} aria-disabled={folded || undefined} {...glowProps}
        aria-label={folded ? `${label}: ${valueText || showValue(shown, emptyLabel)}. Saving` : `${label}: ${valueText || showValue(value, emptyLabel)}. ${editLabel}`} aria-keyshortcuts={folded ? undefined : shortcut}
        onClick={(event) => begin(triggerMode === 'field' && typeof value === 'string' && !editor ? caretFrom(event, valueRef.current, value.length) : null)}>
        <span ref={valueRef} className="alt-inline-edit-value">{display(shown)}</span>
        {triggerMode === 'pencil' && <Icons.Pencil className="alt-inline-edit-pencil" size={15} />}
      </button>;

  const editSlot = session && (editor
    ? <div ref={editorBox} className="alt-inline-edit-slot-box alt-inline-edit-editor" data-slot="">{srLabel}{editor({
        value: session.draft, onValueChange: change, id: controlId, 'aria-describedby': describedBy, invalid: !!session.error,
        readOnly: locked, disabled, autoFocus: true,
      })}</div>
    : <div className="alt-inline-edit-slot-box" data-slot="" data-wrapped={long ? '' : undefined}>{srLabel}{long
      ? <Textarea ref={area} id={controlId} value={session.draft as unknown as string} maxLength={maxLength} disabled={disabled} rows={1}
          readOnly={locked} invalid={!!session.error} aria-required={required || undefined} aria-describedby={describedBy}
          onChange={event => change(event.target.value.replace(/[\r\n]+/g, ' ') as unknown as V)} />
      : textarea
      ? <Textarea ref={area} id={controlId} value={session.draft as unknown as string} maxLength={maxLength} disabled={disabled} rows={rows}
          readOnly={locked} invalid={!!session.error} aria-required={required || undefined} aria-describedby={describedBy}
          onChange={event => change(event.target.value as unknown as V)} />
      : <Input ref={input} id={controlId} value={session.draft as unknown as string} maxLength={maxLength} disabled={disabled}
          readOnly={locked} invalid={!!session.error} aria-required={required || undefined} aria-describedby={describedBy} trailing={icons}
          onChange={event => change(event.target.value as unknown as V)} />}</div>);

  const actions = folded ? !ownButton && <div className="alt-inline-edit-actions">
    <Button ref={trigger} type="button" variant="ghost" aria-disabled onClick={() => undefined}>{editLabel}</Button>
  </div> : session ? inlineActions ? session.conflicted && !saving && <div className="alt-inline-edit-actions">
    <Button type="button" onClick={useCurrent}>Use current value</Button>
  </div> : <div className="alt-inline-edit-actions">
    {session.conflicted && !saving && <Button type="button" onClick={useCurrent}>Use current value</Button>}
    {(!onChoose || session.failed) && <Button type="button" variant="primary" loading={saving} disabled={disabled || validating || session.conflicted}
      onClick={() => { void submit(); }}>{onChoose || (leave === 'save' && session.failed) ? 'Try again' : saveLabel}</Button>}
    <Button type="button" variant="ghost" disabled={saving} onClick={cancel}>{cancelLabel}</Button>
  </div> : !ownButton && <div className="alt-inline-edit-actions">
    <Button ref={trigger} type="button" variant="ghost" disabled={disabled} onClick={() => begin()}>{editLabel}</Button>
  </div>;

  return <div ref={root} className={cx('alt-inline-edit', className)} role="group" aria-label={label}
    data-state={session?.phase ?? 'read'} data-folded={folded ? '' : undefined} data-trigger={triggerMode} data-actions={inlineActions ? 'inline' : undefined} data-multiline={textarea ? '' : undefined} onKeyDown={session ? onKeyDown : undefined}
    onBlur={session && leave === 'cancel' ? onLeaveFocus : undefined}>
    <Surface className="alt-inline-edit-surface" level={0} status={saving ? 'pending' : session?.failed ? 'failed' : undefined}>
      <div className="alt-inline-edit-line">{session && !folded ? editSlot : readSlot}{actions}</div>
      {session?.error && <p className="alt-field-error alt-inline-edit-note" id={errorId} role="alert" data-arrive=""><Icons.AlertCircle size={14} />{session.error}</p>}
      {session && !session.error && textarea && leave !== 'save' && <p className="alt-field-hint alt-inline-edit-note" id={hintId} data-arrive="">
        {keyboard ? <span className="alt-inline-edit-keys">{apple ? <Kbd aria-label="Command">⌘</Kbd> : <Kbd>Ctrl</Kbd>}+<Kbd>Enter</Kbd> to save</span> : 'Save to keep it'}</p>}
      {session && !folded && !session.error && !onChoose && leave === 'save' && <p className="alt-field-hint alt-inline-edit-note" id={hintId} data-arrive="">{saving ? 'Saving changes' : validating ? 'Checking value' : 'Saves when you leave this editor. Cancel to discard.'}</p>}
      {session && !folded && !session.error && onChoose && <p className="alt-field-hint alt-inline-edit-note" id={hintId} data-arrive="">Choose to save</p>}
      {session?.conflicted && <p className="alt-inline-edit-current alt-inline-edit-note" data-arrive="">Current value: <span>{display(value)}</span></p>}
    </Surface>
    <span className="alt-sr" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
  </div>;
}
