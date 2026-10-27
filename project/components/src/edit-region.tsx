import * as React from 'react';
import { cx, Surface, useIsoLayoutEffect } from './core';
import { Alert, Button } from './controls';

type Fields<T> = Partial<Record<keyof T, string>>;
export type EditRegionSaveResult<T> = { ok: true; value: T } | { ok: false; error: string; fieldErrors?: Fields<T> };
export interface EditRegionProps<T extends Record<string, unknown>> {
  /** Names the region: “Edit <label>”. */
  label: string;
  /** The committed record. */
  value: T;
  /** Publishes the accepted canonical record, synchronously and without a network write. */
  onValueChange: (canonical: T) => void;
  /** The sole write. `changed` lists only the fields that differ, so you can send a patch. */
  onSave: (draft: T, context: { previousValue: T; changed: (keyof T)[] }) => EditRegionSaveResult<T> | Promise<EditRegionSaveResult<T>>;
  /** Runs on Save. Return an error per field, or undefined. */
  validate?: (draft: T) => Fields<T> | undefined | Promise<Fields<T> | undefined>;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  /** The field focused on opening. Default: the first control in the form. */
  initialFocus?: keyof T;
  /** Used only when completion still owns focus and the Edit button cannot receive it. */
  focusFallback?: () => HTMLElement | null;
  /** Compares one field's values. Default Object.is. */
  isEqual?: (a: unknown, b: unknown) => boolean;
  editLabel?: string;
  saveLabel?: string;
  cancelLabel?: string;
  className?: string;
  /** EditRegionView and EditRegionForm. */
  children: React.ReactNode;
}
/** Binds one field of the draft to a control. Spread the result onto it. */
export interface EditRegionBinder<T> {
  /** Text controls (Input, Textarea): value + onChange. */
  <K extends keyof T>(key: K): { name: string; value: T[K]; onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; readOnly: boolean; disabled?: boolean; 'data-field': string };
  /** Value controls (Select, Combobox, Slider): value + onValueChange. */
  value<K extends keyof T>(key: K): { name: string; value: T[K]; onValueChange: (value: T[K]) => void; disabled?: boolean; 'data-field': string };
  /** Toggles (Switch, Checkbox): checked + onCheckedChange. */
  checked<K extends keyof T>(key: K): { checked: boolean; onCheckedChange: (checked: boolean) => void; disabled?: boolean; 'data-field': string };
  /** The field's error, for its Field. */
  error(key: keyof T): string | undefined;
  /** The current draft. */
  draft: T;
}

type Phase = 'editing' | 'validating' | 'saving' | 'error' | 'conflict';
type Session<T> = { generation: number; phase: Phase; baseline: T; draft: T; error?: string; fieldErrors?: Fields<T>; failed?: boolean; conflicted?: boolean };
interface RegionContext {
  label: string; editLabel: string; disabled: boolean; open: boolean;
  session: Session<any> | null; begin: () => void; trigger: React.Ref<HTMLButtonElement>;
  formProps: () => React.ReactNode;
}
const Ctx = React.createContext<RegionContext | null>(null);
const useRegion = (part: string) => {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error(`${part} must be inside EditRegion.`);
  return ctx;
};

const SAVE_ERROR = 'We couldn’t save these changes. Try again.';
const CHANGED = 'This record changed while you were editing. Review the current values before saving.';
const CHANGED_DURING_SAVE = 'This record changed while saving. Your save may have completed. Check the current record.';
const FOCUSABLE = 'input:not([type="hidden"]), textarea, select, button, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
const ms = (cs: CSSStyleDeclaration, name: string, fallback: number) => parseFloat(cs.getPropertyValue(name)) || fallback;

function canFocus(element: HTMLElement | null | undefined): element is HTMLElement {
  return !!element?.isConnected && !element.matches(':disabled, [aria-disabled="true"]') && !element.closest('[inert]') &&
    element.matches('button, input:not([type="hidden"]), select, textarea, a[href], [tabindex], [contenteditable="true"]') &&
    element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
}

/**
 * Several fields of one record, edited where the record is shown and saved together as one write. Read mode is the
 * record on the ground; Edit lifts it into a static raised editor holding the fields. The session follows InlineEdit:
 * no save on blur, one write in flight, a known failure keeps the draft, and an outside change blocks Save.
 */
export function EditRegion<T extends Record<string, unknown>>({ label, value, onValueChange, onSave, validate, open: openProp,
  defaultOpen = false, onOpenChange, disabled = false, initialFocus, focusFallback, isEqual = Object.is,
  editLabel = `Edit ${label.toLowerCase()}`, saveLabel = 'Save changes', cancelLabel = 'Cancel', className, children }: EditRegionProps<T>) {
  const [session, setSession] = React.useState<Session<T> | null>(() => defaultOpen || openProp ? { generation: 1, phase: 'editing', baseline: value, draft: value } : null);
  const [announcement, setAnnouncement] = React.useState('');
  const [settled, setSettled] = React.useState(0);
  const current = React.useRef<Session<T> | null>(session);
  const generation = React.useRef(session ? 1 : 0);
  const mounted = React.useRef(false);
  const observed = React.useRef(value);
  const disabledNow = React.useRef(disabled);
  const root = React.useRef<HTMLDivElement>(null);
  const surface = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const returnFocus = React.useRef(false);
  const focusField = React.useRef<keyof T | true | null>(null);
  const fromHeight = React.useRef<number | null>(null);
  const formId = React.useId();

  const same = (a: T, b: T) => {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) if (!isEqual(a[key], b[key])) return false;
    return true;
  };
  const changedKeys = (draft: T, baseline: T) => Object.keys({ ...baseline, ...draft }).filter(key => !isEqual(draft[key], baseline[key])) as (keyof T)[];
  const publishSession = (next: Session<T> | null) => {
    const wasOpen = !!current.current;
    current.current = next;
    setSession(next ? { ...next } : null);
    if (wasOpen !== !!next) onOpenChange?.(!!next);
  };
  const refresh = (active: Session<T>) => setSession({ ...active });
  const valid = (candidate: Session<T>) => mounted.current && current.current === candidate && candidate.generation === generation.current;

  useIsoLayoutEffect(() => {
    mounted.current = true;
    // A remount (StrictMode's simulated one, or a real one) keeps an open session but starts a new generation, so
    // work dispatched before it can't publish, and work after it isn't mistaken for stale.
    if (current.current) current.current.generation = ++generation.current;
    return () => { mounted.current = false; generation.current++; returnFocus.current = false; focusField.current = null; };
  }, []);

  // An observed change while editing is someone else's write: keep the draft, block Save, offer the current values.
  useIsoLayoutEffect(() => {
    disabledNow.current = disabled;
    if (same(observed.current, value)) return;
    observed.current = value;
    const active = current.current;
    if (!active) return;
    active.conflicted = true;
    if (active.phase !== 'saving') {
      active.generation = ++generation.current;
      active.phase = 'conflict'; active.error = CHANGED; active.failed = false;
      setAnnouncement('');
    }
    refresh(active);
  }, [value, disabled]);

  const glide = () => { fromHeight.current = surface.current?.offsetHeight ?? null; };
  const begin = () => {
    if (disabled || current.current) return;
    setAnnouncement(''); focusField.current = initialFocus ?? true; glide();
    publishSession({ generation: ++generation.current, phase: 'editing', baseline: value, draft: value });
  };
  const close = () => {
    returnFocus.current = !!root.current?.contains(document.activeElement);
    generation.current++; glide();
    publishSession(null);
  };
  const cancel = () => {
    const active = current.current;
    if (!active || active.phase === 'saving') return;
    setAnnouncement(''); close();
  };

  // Controlled open: follow it, except that a dispatched save can't be cancelled.
  useIsoLayoutEffect(() => {
    if (openProp === undefined) return;
    if (openProp && !current.current) begin();
    else if (!openProp && current.current) cancel();
  }, [openProp]);

  useIsoLayoutEffect(() => {
    const want = focusField.current;
    if (session && want !== null) {
      focusField.current = null;
      const form = root.current?.querySelector<HTMLElement>('.alt-edit-region-form');
      const named = want === true ? null : form?.querySelector<HTMLElement>(`[data-field="${CSS.escape(String(want))}"]`);
      const target = canFocus(named) ? named : [...form?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []].find(canFocus);
      target?.focus();
    }
    if (!session && returnFocus.current) {
      returnFocus.current = false;
      const target = canFocus(trigger.current) ? trigger.current : focusFallback?.();
      if (canFocus(target)) target.focus();
    }
    // The editor's height glides between the read view and the form; under reduced motion it changes at once.
    const from = fromHeight.current, el = surface.current;
    fromHeight.current = null;
    if (from === null || !el || typeof el.animate !== 'function') return;
    const cs = getComputedStyle(el);
    if (parseFloat(cs.getPropertyValue('--alt-travel')) === 0) return;
    const to = el.offsetHeight;
    if (Math.abs(to - from) < 2) return;
    el.animate([{ height: from + 'px', overflow: 'hidden' }, { height: to + 'px', overflow: 'hidden' }],
      { duration: ms(cs, '--dur-travel-3', 280) * (session ? 1 : 0.7), easing: cs.getPropertyValue(session ? '--ease-glide' : '--ease-sink').trim() || 'ease' });
  }, [session !== null, session?.generation, session?.fieldErrors, focusFallback]);

  const fail = (active: Session<T>, error: string | undefined, fieldErrors?: Fields<T>, failed = false) => {
    if (!valid(active)) return;
    active.phase = 'error'; active.error = error; active.fieldErrors = fieldErrors; active.failed = failed;
    setAnnouncement('');
    refresh(active);
    const first = fieldErrors && Object.keys(fieldErrors).find(key => fieldErrors[key as keyof T]);
    if (first && !failed) focusField.current = first as keyof T;
  };
  const cleanErrors = (errors: Fields<T> | undefined) => {
    if (!errors || typeof errors !== 'object') return undefined;
    const kept = Object.fromEntries(Object.entries(errors).filter(([, message]) => typeof message === 'string' && message)) as Fields<T>;
    return Object.keys(kept).length ? kept : undefined;
  };
  const submit = async () => {
    const active = current.current;
    if (!active || disabledNow.current || active.conflicted || active.phase === 'saving' || active.phase === 'validating') return;
    const draft = active.draft;
    const changed = changedKeys(draft, active.baseline);
    if (!changed.length) { setAnnouncement(''); close(); return; }
    active.error = undefined; active.fieldErrors = undefined; active.failed = false;
    if (validate) {
      active.phase = 'validating'; refresh(active); setAnnouncement('Checking');
      const checking = active.generation;
      let errors: Fields<T> | undefined;
      try { errors = cleanErrors(await validate(draft)); }
      catch { if (valid(active) && active.generation === checking) fail(active, SAVE_ERROR); return; }
      if (!valid(active) || active.generation !== checking || active.conflicted) return;
      if (errors) { fail(active, undefined, errors); setAnnouncement(`${Object.keys(errors).length === 1 ? 'One field needs' : `${Object.keys(errors).length} fields need`} attention`); return; }
      if (disabledNow.current) { active.phase = 'editing'; refresh(active); setAnnouncement(''); return; }
    }
    // A synchronous in-flight lock: one write per record, however often Save or Enter is pressed.
    active.phase = 'saving'; refresh(active); setAnnouncement('Saving changes');
    let result: EditRegionSaveResult<T>;
    try { result = await onSave(draft, { previousValue: active.baseline, changed }); }
    catch { result = { ok: false, error: SAVE_ERROR }; }
    if (!valid(active)) return;
    if (active.conflicted) {
      active.phase = 'conflict'; active.error = CHANGED_DURING_SAVE; active.failed = false;
      refresh(active); setAnnouncement(''); return;
    }
    if (!result || typeof result !== 'object' || (result.ok === true ? !result.value || typeof result.value !== 'object'
      : result.ok !== false || typeof result.error !== 'string' || !result.error)) { fail(active, SAVE_ERROR, undefined, true); return; }
    if (!result.ok) { fail(active, result.error, cleanErrors(result.fieldErrors), true); setAnnouncement(result.error); return; }
    observed.current = result.value;
    close(); setSettled(count => count + 1); setAnnouncement('Saved');
    onValueChange(result.value);
  };
  const set = (key: keyof T, next: unknown) => {
    const active = current.current;
    if (!active || active.phase === 'saving' || active.phase === 'validating' || active.conflicted) return;
    active.draft = { ...active.draft, [key]: next };
    active.phase = 'editing'; active.failed = false; active.error = undefined;
    if (active.fieldErrors?.[key]) { const { [key]: _gone, ...rest } = active.fieldErrors; active.fieldErrors = Object.keys(rest).length ? rest as Fields<T> : undefined; }
    refresh(active);
  };
  const useCurrent = () => {
    const active = current.current;
    if (!active || active.phase === 'saving') return;
    setAnnouncement(''); focusField.current = initialFocus ?? true;
    publishSession({ generation: ++generation.current, phase: 'editing', baseline: value, draft: value });
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!current.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || event.defaultPrevented) return;
    const target = event.target as HTMLElement;
    // An open popup (a Select's list) owns its Escape and Enter.
    if (target.getAttribute?.('aria-expanded') === 'true') return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation();
      if (current.current.phase === 'saving') setAnnouncement('Saving changes. Wait for the result.');
      else cancel();
    } else if (event.key === 'Enter') {
      const line = target instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'color'].includes(target.type);
      const area = target instanceof HTMLTextAreaElement && (event.ctrlKey || event.metaKey);
      if (line || area) { event.preventDefault(); event.stopPropagation(); void submit(); }
    }
  };

  const binder = React.useMemo(() => {
    const s = session;
    const locked = !s || s.phase === 'saving' || s.phase === 'validating' || !!s.conflicted;
    const off = disabled || undefined;
    const field = (<K extends keyof T>(key: K) => ({
      name: String(key), value: s?.draft[key] as T[K], readOnly: locked, disabled: off, 'data-field': String(key),
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, event.target.value),
    })) as EditRegionBinder<T>;
    field.value = key => ({ name: String(key), value: s?.draft[key] as T[typeof key], disabled: off || (locked ? true : undefined), 'data-field': String(key), onValueChange: v => set(key, v) });
    field.checked = key => ({ checked: !!s?.draft[key], disabled: off || (locked ? true : undefined), 'data-field': String(key), onCheckedChange: v => set(key, v) });
    field.error = key => s?.fieldErrors?.[key];
    field.draft = s?.draft as T;
    return field;
  }, [session, disabled]);

  const saving = session?.phase === 'saving';
  const validating = session?.phase === 'validating';
  const formProps = () => {
    if (!session) return null;
    return <div className="alt-edit-region-chrome">
      {session.conflicted ? <Alert tone="caution" title="This record changed" action={!saving && <Button size="sm" type="button" onClick={useCurrent}>Use current values</Button>}>{session.error}</Alert>
        : session.error && <Alert tone="critical">{session.error}</Alert>}
      <div className="alt-edit-region-actions">
        <Button type="button" variant="primary" loading={saving} disabled={disabled || validating || session.conflicted} onClick={() => { void submit(); }}>{saveLabel}</Button>
        <Button type="button" variant="ghost" disabled={saving} onClick={cancel}>{cancelLabel}</Button>
      </div>
    </div>;
  };
  const ctx: RegionContext & { binder: EditRegionBinder<T>; saving: boolean; formId: string; label: string } = {
    label, editLabel, disabled, open: !!session, session, begin, trigger, formProps, binder, saving, formId,
  };
  return <Ctx.Provider value={ctx}>
    <div ref={root} className={cx('alt-edit-region', className)} data-state={session?.phase ?? 'read'} onKeyDown={onKeyDown}>
      <Surface ref={surface} className="alt-edit-region-surface" level={session ? 1 : 0} settle={settled || undefined}
        status={saving ? 'pending' : session?.failed ? 'failed' : undefined}>
        {children}
      </Surface>
      <span className="alt-edit-region-status" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
    </div>
  </Ctx.Provider>;
}

/** Read mode: the record as text. Shows an Edit button after it unless `trigger={false}` (then place EditRegionTrigger yourself). */
export function EditRegionView({ children, trigger = true, className }: { children?: React.ReactNode; trigger?: boolean; className?: string }) {
  const ctx = useRegion('EditRegionView');
  if (ctx.open) return null;
  return <div className={cx('alt-edit-region-view', className)}>
    <div className="alt-edit-region-values">{children}</div>
    {trigger && <EditRegionTrigger />}
  </div>;
}

/** The visible Edit button. Rendered by EditRegionView by default. */
export function EditRegionTrigger({ children, className }: { children?: React.ReactNode; className?: string }) {
  const ctx = useRegion('EditRegionTrigger');
  if (ctx.open) return null;
  return <Button ref={ctx.trigger} type="button" variant="ghost" size="sm" className={className} disabled={ctx.disabled} onClick={ctx.begin}>{children ?? ctx.editLabel}</Button>;
}

/**
 * Edit mode: a form (or a group, inside another form) named “Edit <label>”, holding your fields, then any error and
 * Save/Cancel. Children may be a function of the draft binder: `{(field) => <Input {...field('name')} />}`.
 */
export function EditRegionForm<T extends Record<string, unknown> = Record<string, unknown>>({ children, actions = true, className }:
  { children: React.ReactNode | ((field: EditRegionBinder<T>) => React.ReactNode); actions?: boolean; className?: string }) {
  const ctx = useRegion('EditRegionForm') as RegionContext & { binder: EditRegionBinder<T>; saving: boolean; formId: string };
  const ref = React.useRef<HTMLElement>(null);
  const [nested, setNested] = React.useState(false);
  useIsoLayoutEffect(() => { if (ctx.open) setNested(!!ref.current?.parentElement?.closest('form')); }, [ctx.open]);
  if (!ctx.open) return null;
  const body = <>
    <div className="alt-edit-region-fields">{typeof children === 'function' ? children(ctx.binder) : children}</div>
    {actions && <EditRegionActions />}
  </>;
  const shared = { ref: ref as any, className: cx('alt-edit-region-form', className), 'aria-label': `Edit ${ctx.label.toLowerCase()}`, 'aria-busy': ctx.saving || undefined };
  // Nested in an application form, a group: forms can't nest, and its submit stays the application's.
  return nested ? <div role="group" {...shared}>{body}</div>
    : <form {...shared} noValidate onSubmit={(event) => event.preventDefault()}>{body}</form>;
}

/** Any error, the conflict notice and Save/Cancel. EditRegionForm renders them after the fields unless `actions={false}`. */
export function EditRegionActions() {
  return useRegion('EditRegionActions').formProps();
}
