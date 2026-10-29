import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider, Button, EditRegion, EditRegionForm, EditRegionView, Field, Icons, InlineEdit, Input, Select, Switch, useDepth,
} from '../../project/components/src/index';
import type { BuiltInScheme } from '../../project/components/src/index';

/* A prototype, not a component: today's InlineEdit and EditRegion beside a proposed in-place model, so the motion can
   be judged in a browser before any of it reaches project/components. Everything proposed lives in this file. */

const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const Lab = React.createContext<{ shouldFail: () => boolean; settleDuration: number }>({ shouldFail: () => false, settleDuration: 5000 });

// A pretend server shared by both sides: 600ms per write, and one failure when "Next save fails" is on.
async function serverSave<T>(draft: T, shouldFail: () => boolean): Promise<Result<T>> {
  await wait(600);
  if (shouldFail()) return { ok: false, error: 'We couldn’t reach the server. Your changes are still here. Try again.' };
  const value = (typeof draft === 'string' ? draft.trim()
    : Object.fromEntries(Object.entries(draft as Record<string, unknown>).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]))) as T;
  return { ok: true, value };
}

/* ───────────── the proposed motion: one engine for every change of size ───────────── */

const cssVar = (el: Element, name: string) => getComputedStyle(el).getPropertyValue(name).trim();
// dur-travel-3 up to 120px of travel, then a little longer per pixel (capped), so a long push stays readable.
const glideMs = (el: Element, distance: number) => {
  const base = parseFloat(cssVar(el, '--dur-travel-3')) || 220;
  return Math.min(base + 140, base + Math.max(0, distance - 120) * 0.9);
};

/**
 * Call the returned capture() just before a state change that alters the box. After the render, the box's real height
 * glides from the old value to the new one (so everything below is pushed, continuously), values that stayed are carried
 * from where they were (FLIP), and parts that are new fade in only as the moving edge reaches them.
 */
function useInPlaceMotion(box: React.RefObject<HTMLElement | null>) {
  const snap = React.useRef<{ h: number; slots: Map<string, DOMRect> } | null>(null);
  const capture = () => {
    const el = box.current;
    if (!el) return;
    snap.current = {
      h: el.getBoundingClientRect().height,
      slots: new Map([...el.querySelectorAll<HTMLElement>('[data-slot]')].map((s) => [s.dataset.slot!, s.getBoundingClientRect()])),
    };
  };
  React.useLayoutEffect(() => {
    const was = snap.current, el = box.current;
    snap.current = null;
    if (!was || !el || typeof el.animate !== 'function') return;
    for (const a of el.getAnimations()) if ((a.effect as KeyframeEffect | null)?.target === el && a.id === 'lab-glide') a.cancel();
    if (parseFloat(cssVar(el, '--alt-travel') || '1') === 0) return;
    const top = el.getBoundingClientRect().top;
    const to = el.getBoundingClientRect().height;
    const distance = Math.abs(to - was.h);
    const duration = glideMs(el, distance);
    const easing = cssVar(el, '--ease-glide') || 'ease';
    if (distance >= 1) {
      const glide = el.animate([{ height: was.h + 'px', overflow: 'hidden' }, { height: to + 'px', overflow: 'hidden' }], { duration, easing });
      glide.id = 'lab-glide';
    }
    for (const slot of el.querySelectorAll<HTMLElement>('[data-slot]')) {
      const from = was.slots.get(slot.dataset.slot!);
      if (!from) continue;
      const now = slot.getBoundingClientRect();
      const dx = from.left - now.left, dy = from.top - now.top, dw = now.width - from.width;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(dw) < 1) continue;
      // A well wider than its text grows sideways from the text's box; flex is pinned so the width can drive it.
      const size = Math.abs(dw) < 1 ? [{}, {}] : [{ flex: '0 0 auto', width: from.width + 'px' }, { flex: '0 0 auto', width: now.width + 'px' }];
      slot.animate([{ transform: `translate(${dx}px, ${dy}px)`, ...size[0] }, { transform: 'none', ...size[1] }], { duration, easing });
    }
    if (to > was.h + 1) for (const part of el.querySelectorAll<HTMLElement>('[data-arrive]')) {
      const at = Math.max(0, Math.min(1, (part.getBoundingClientRect().top - top - was.h) / (to - was.h)));
      part.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: duration * at * 0.85, easing: 'linear', fill: 'backwards' });
    }
  });
  return capture;
}

// Polite status for assistive technology only, cleared after dur-linger so nothing visible or audible lingers.
function useStatus() {
  const [text, setText] = React.useState('');
  const timer = React.useRef<number | undefined>(undefined);
  React.useEffect(() => () => window.clearTimeout(timer.current), []);
  const say = (next: string) => {
    setText(next);
    window.clearTimeout(timer.current);
    if (next) timer.current = window.setTimeout(() => setText(''), 2000);
  };
  return [text, say] as const;
}

type Errors<T> = Partial<Record<keyof T, string>>;

/** The session: the same contract as today's components (no save on blur, one write, a failure keeps the draft). */
function useInPlace<T extends Record<string, unknown>>(label: string, value: T, onValueChange: (v: T) => void, validate: (d: T) => Errors<T> | undefined) {
  const lab = React.useContext(Lab);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [errors, setErrors] = React.useState<Errors<T>>();
  const [failure, setFailure] = React.useState<string>();
  const [saving, setSaving] = React.useState(false);
  const [glow, setGlow] = React.useState(0);
  const [justSaved, setJustSaved] = React.useState(false);
  const [status, say] = useStatus();
  const box = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const focusNext = React.useRef<string | null>(null);
  const caret = React.useRef<number | null>(null);
  const capture = useInPlaceMotion(box);
  const depth = useDepth({ settle: glow || undefined });

  React.useLayoutEffect(() => {
    const want = focusNext.current;
    if (!want) return;
    focusNext.current = null;
    if (want === 'trigger') { trigger.current?.focus(); return; }
    const scope = want === 'first' ? '' : `[data-slot="${want}"] `;
    const target = box.current?.querySelector<HTMLElement>(`${scope}input, ${scope}.alt-select-trigger, ${scope}[role="switch"]`);
    target?.focus();
    if (want === 'first' && target instanceof HTMLInputElement) {
      // Opened from a click on the text: the caret goes where the click was. Otherwise the whole value is selected.
      if (caret.current === null) target.select(); else target.setSelectionRange(caret.current, caret.current);
    }
    caret.current = null;
  });

  const open = (at?: number) => {
    if (editing) return;
    caret.current = at ?? null;
    capture(); setDraft(value); setErrors(undefined); setFailure(undefined); setJustSaved(false); say('');
    focusNext.current = 'first'; setEditing(true);
  };
  const close = () => {
    capture();
    if (box.current?.contains(document.activeElement)) focusNext.current = 'trigger';
    setEditing(false); setErrors(undefined); setFailure(undefined);
  };
  const cancel = () => { if (!saving) { setJustSaved(false); close(); } };
  const set = <K extends keyof T>(key: K, next: T[K]) => {
    setDraft((d) => ({ ...d, [key]: next }));
    if (errors?.[key] || failure) {
      capture(); setFailure(undefined);
      setErrors((e) => {
        if (!e) return e;
        const { [key]: _gone, ...rest } = e;
        return Object.keys(rest).length ? (rest as Errors<T>) : undefined;
      });
    }
  };
  const save = async () => {
    if (saving) return;
    if (!Object.keys(draft).some((k) => !Object.is(draft[k], value[k]))) { cancel(); return; }
    const found = validate(draft);
    if (found) {
      capture(); setErrors(found); setFailure(undefined);
      focusNext.current = Object.keys(found)[0];
      say(Object.keys(found).length === 1 ? 'One field needs attention' : `${Object.keys(found).length} fields need attention`);
      return;
    }
    setSaving(true); say('Saving');
    const result = await serverSave(draft, lab.shouldFail);
    setSaving(false);
    if (!result.ok) { capture(); setFailure(result.error); say(result.error); return; }
    close(); setJustSaved(true); setGlow((g) => g + 1); onValueChange(result.value); say(`${label} saved`);
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!editing || event.nativeEvent.isComposing) return;
    const target = event.target as HTMLElement;
    if (target.getAttribute('aria-expanded') === 'true') return; // an open list owns its Escape and Enter
    if (event.key === 'Escape') { event.preventDefault(); cancel(); }
    else if (event.key === 'Enter' && target instanceof HTMLInputElement) { event.preventDefault(); void save(); }
  };
  const glowProps = justSaved ? { ...depth, style: { ...depth.style, '--dur-settle': `${lab.settleDuration}ms` } as React.CSSProperties } : {};
  return { editing, draft, set, errors, failure, saving, open, cancel, save, box, trigger, onKeyDown, status, glowProps };
}

const ErrorLine = ({ id, children }: { id?: string; children: React.ReactNode }) =>
  <p className="lab-error" id={id} role="alert" data-arrive=""><Icons.AlertCircle size={14} />{children}</p>;

/* ───────────── proposed: one value ───────────── */

const Pencil = () => <svg className="lab-pencil" viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <path d="M11 2.5l2.5 2.5L6 12.5 2.5 13.5l1-3.5z" /><path d="M9.5 4l2.5 2.5" />
</svg>;

// Where in the value a click landed, so the caret can go there. A keyboard press (detail 0) selects everything instead.
function caretFrom(event: React.MouseEvent, text: HTMLElement | null, length: number): number | undefined {
  if (event.detail === 0 || !text) return undefined;
  const doc = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
  const pos = doc.caretPositionFromPoint?.(event.clientX, event.clientY);
  const range = pos ? null : document.caretRangeFromPoint?.(event.clientX, event.clientY);
  const node = pos?.offsetNode ?? range?.startContainer, offset = pos?.offset ?? range?.startOffset;
  if (node && node.nodeType === Node.TEXT_NODE && text.contains(node) && offset !== undefined) return offset;
  return event.clientX > text.getBoundingClientRect().right ? length : 0;
}

export type TextTrigger = 'button' | 'pencil' | 'field';

function InPlaceText({ label, value, onValueChange, trigger = 'button', className }: { label: string; value: string; onValueChange: (v: string) => void; trigger?: TextTrigger; className?: string }) {
  const s = useInPlace(label, { text: value }, (v) => onValueChange(v.text), (d) => d.text.trim() ? undefined : { text: `Enter a ${label.toLowerCase()}.` });
  const errorId = React.useId();
  const problem = s.errors?.text ?? s.failure;
  const textRef = React.useRef<HTMLSpanElement>(null);
  const shown = value || 'Not set';
  return (
    <div ref={s.box} className={cx('lab-ip', className)} role="group" aria-label={label} data-trigger={trigger} data-editing={s.editing ? '' : undefined} onKeyDown={s.onKeyDown}>
      <div className="lab-ip-line">
        {s.editing
          ? <div className="lab-slot-box" data-slot="text">
              <Input aria-label={label} value={s.draft.text} readOnly={s.saving} invalid={!!s.errors?.text}
                aria-describedby={problem ? errorId : undefined} onChange={(e) => s.set('text', e.target.value)} />
            </div>
          : trigger === 'button'
            ? <div className="lab-slot" data-slot="text" {...s.glowProps}><span ref={textRef} className="lab-slot-text">{shown}</span></div>
            // The value is its own button. Its pencil's space is always reserved, so showing it moves nothing.
            : <button ref={s.trigger} type="button" className="lab-slot lab-slot-button" data-slot="text" {...s.glowProps}
                aria-label={`${label}: ${shown}. Edit ${label.toLowerCase()}`}
                onClick={(event) => s.open(trigger === 'field' ? caretFrom(event, textRef.current, value.length) : undefined)}>
                <span ref={textRef} className="lab-slot-text">{shown}</span>{trigger === 'pencil' && <Pencil />}
              </button>}
        {(s.editing || trigger === 'button') && <div className="lab-actions">
          {s.editing ? <>
            <Button variant="primary" loading={s.saving} onClick={() => void s.save()}>Save</Button>
            <Button variant="ghost" disabled={s.saving} onClick={s.cancel}>Cancel</Button>
          </> : <Button ref={s.trigger} variant="ghost" onClick={() => s.open()}>Edit<span className="alt-sr"> {label.toLowerCase()}</span></Button>}
        </div>}
      </div>
      {s.editing && problem && <ErrorLine id={errorId}>{problem}</ErrorLine>}
      <span className="alt-sr" role="status" aria-live="polite">{s.status}</span>
    </div>
  );
}

/* ───────────── proposed: a record in a list ───────────── */

const ROLES = [{ value: 'owner', label: 'Owner' }, { value: 'editor', label: 'Editor' }, { value: 'viewer', label: 'Viewer' }];
const roleName = (role: string) => ROLES.find((r) => r.value === role)?.label ?? role;
type Person = { name: string; email: string; role: string; notify: boolean };
const PEOPLE: (Person & { id: string })[] = [
  { id: 'mara', name: 'Mara Quist', email: 'mara@northwind.example', role: 'owner', notify: true },
  { id: 'ines', name: 'Inés Ortega', email: 'ines@northwind.example', role: 'editor', notify: false },
  { id: 'tobi', name: 'Tobi Adeyemi', email: 'tobi@northwind.example', role: 'viewer', notify: true },
];
const validatePerson = (d: Person): Errors<Person> | undefined => {
  const errors: Errors<Person> = {};
  if (!d.name.trim()) errors.name = 'Enter a name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) errors.email = 'Enter an email address, like name@example.com.';
  return Object.keys(errors).length ? errors : undefined;
};

function InPlacePerson({ person, onValueChange }: { person: Person; onValueChange: (p: Person) => void }) {
  const s = useInPlace(person.name, person, onValueChange, validatePerson);
  const d = s.draft;
  return (
    <div ref={s.box} className="lab-surface lab-rec" role="group" aria-label={s.editing ? `Edit ${person.name}` : person.name}
      data-editing={s.editing ? '' : undefined} onKeyDown={s.onKeyDown} {...s.glowProps}>
      <div className="lab-line lab-name">
        {s.editing
          ? <div className="lab-slot-box" data-slot="name"><Input aria-label="Name" value={d.name} readOnly={s.saving} invalid={!!s.errors?.name} onChange={(e) => s.set('name', e.target.value)} /></div>
          : <div className="lab-slot" data-slot="name"><span className="lab-slot-text">{person.name}</span></div>}
        {!s.editing && <Button ref={s.trigger} size="sm" variant="ghost" className="lab-edit" onClick={() => s.open()}>Edit<span className="alt-sr"> {person.name}</span></Button>}
      </div>
      <div className="lab-line lab-meta">
        {s.editing
          ? <div className="lab-slot-box" data-slot="email"><Input aria-label="Email" type="email" value={d.email} readOnly={s.saving} invalid={!!s.errors?.email} onChange={(e) => s.set('email', e.target.value)} /></div>
          : <div className="lab-slot" data-slot="email"><span className="lab-slot-text">{person.email}</span></div>}
        <span className="lab-sep" aria-hidden="true">·</span>
        {s.editing
          ? <div className="lab-slot-box" data-slot="role"><Select aria-label="Role" value={d.role} disabled={s.saving} items={ROLES} onValueChange={(v) => s.set('role', v)} /></div>
          : <div className="lab-slot" data-slot="role"><span className="lab-slot-text">{roleName(person.role)}</span></div>}
        <span className="lab-sep" aria-hidden="true">·</span>
        {s.editing
          ? <div className="lab-slot-box" data-slot="notify"><Switch checked={d.notify} disabled={s.saving} label="Gets updates" onCheckedChange={(v) => s.set('notify', v)} /></div>
          : <div className="lab-slot" data-slot="notify"><span className="lab-slot-text">{person.notify ? 'Gets updates' : 'No updates'}</span></div>}
      </div>
      {s.editing && s.errors && Object.values(s.errors).map((message) => <ErrorLine key={message}>{message}</ErrorLine>)}
      {s.editing && s.failure && <ErrorLine>{s.failure}</ErrorLine>}
      {s.editing && <div className="lab-actions lab-rec-actions" data-arrive="">
        <Button variant="primary" loading={s.saving} onClick={() => void s.save()}>Save changes</Button>
        <Button variant="ghost" disabled={s.saving} onClick={s.cancel}>Cancel</Button>
      </div>}
      <span className="alt-sr" role="status" aria-live="polite">{s.status}</span>
    </div>
  );
}

/* ───────────── proposed: a property sheet whose read rows already have the controls' height ───────────── */

type Trip = { traveller: string; email: string; phone: string; seat: string };
const SEATS = [{ value: 'aisle', label: 'Aisle' }, { value: 'window', label: 'Window' }, { value: 'any', label: 'No preference' }];
const validateTrip = (d: Trip): Errors<Trip> | undefined => {
  const errors: Errors<Trip> = {};
  if (!d.traveller.trim()) errors.traveller = 'Enter the traveller’s name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) errors.email = 'Enter an email address, like name@example.com.';
  return Object.keys(errors).length ? errors : undefined;
};

function InPlaceSheet() {
  const [trip, setTrip] = React.useState<Trip>({ traveller: 'Mara Quist', email: 'mara@northwind.example', phone: '', seat: 'aisle' });
  const s = useInPlace('Trip details', trip, setTrip, validateTrip);
  const d = s.draft;
  const text = (key: keyof Trip, label: string, type = 'text') => s.editing
    ? <div className="lab-slot-box" data-slot={key}>
        <Input aria-label={label} type={type} value={d[key]} placeholder={key === 'phone' ? 'Add a phone number' : undefined} readOnly={s.saving}
          invalid={!!s.errors?.[key]} onChange={(e) => s.set(key, e.target.value)} />
      </div>
    : <div className="lab-slot" data-slot={key}><span className={cx('lab-slot-text', !trip[key] && 'lab-unset')}>{trip[key] || 'Not set'}</span></div>;
  return (
    <div ref={s.box} className="lab-surface lab-sheet" role="group" aria-label={s.editing ? 'Edit trip details' : 'Trip details'}
      data-editing={s.editing ? '' : undefined} onKeyDown={s.onKeyDown} {...s.glowProps} data-measure="[data-slot=traveller] .lab-slot-text|[data-slot=traveller] input">
      <div className="lab-sheet-head">
        <h3 className="lab-h4">Trip details</h3>
        {!s.editing && <Button ref={s.trigger} size="sm" variant="ghost" onClick={() => s.open()}>Edit all</Button>}
      </div>
      <dl className="lab-sheet-grid">
        <dt>Traveller</dt><dd>{text('traveller', 'Traveller')}</dd>
        <dt>Email</dt><dd>{text('email', 'Email', 'email')}</dd>
        <dt>Phone</dt><dd>{text('phone', 'Phone', 'tel')}</dd>
        <dt>Seat</dt><dd>{s.editing
          ? <div className="lab-slot-box" data-slot="seat"><Select aria-label="Seat" value={d.seat} disabled={s.saving} items={SEATS} onValueChange={(v) => s.set('seat', v)} /></div>
          : <div className="lab-slot" data-slot="seat"><span className="lab-slot-text">{SEATS.find((x) => x.value === trip.seat)?.label}</span></div>}</dd>
      </dl>
      {s.editing && s.errors && Object.values(s.errors).map((message) => <ErrorLine key={message}>{message}</ErrorLine>)}
      {s.editing && s.failure && <ErrorLine>{s.failure}</ErrorLine>}
      {s.editing && <div className="lab-actions lab-sheet-actions" data-arrive="">
        <Button variant="primary" loading={s.saving} onClick={() => void s.save()}>Save changes</Button>
        <Button variant="ghost" disabled={s.saving} onClick={s.cancel}>Cancel</Button>
      </div>}
      <span className="alt-sr" role="status" aria-live="polite">{s.status}</span>
    </div>
  );
}

/* ───────────── today's components, wired to the same server ───────────── */

function CurrentTask() {
  const lab = React.useContext(Lab);
  const [title, setTitle] = React.useState('Prepare launch checklist');
  return (
    <div className="lab-task" data-measure=".alt-inline-edit-value|input">
      <InlineEdit label="Task title" value={title} onValueChange={setTitle} required className="lab-title" settleDuration={lab.settleDuration}
        onSave={(draft) => serverSave(draft, lab.shouldFail)} />
      <TaskRest />
    </div>
  );
}

function ProposedTask({ trigger }: { trigger: TextTrigger }) {
  const [title, setTitle] = React.useState('Prepare launch checklist');
  return (
    <div className="lab-task" data-measure=".lab-slot-text|input">
      <InPlaceText label="Task title" value={title} onValueChange={setTitle} trigger={trigger} className="lab-title" />
      <TaskRest />
    </div>
  );
}

const TaskRest = () => <>
  <p className="lab-muted">Due Friday · Product team</p>
  <p className="lab-body">Collect sign-off from design, support and legal before the launch review. This paragraph is here to be pushed.</p>
</>;

function CurrentPeople() {
  const lab = React.useContext(Lab);
  const [people, setPeople] = React.useState(PEOPLE);
  return (
    <ul className="lab-people">
      {people.map(({ id, ...person }) => <li key={id} data-measure=".lab-cur-name|input[name='name']">
        <EditRegion label={person.name} editLabel={`Edit ${person.name}`} value={person} validate={validatePerson} settleDuration={lab.settleDuration}
          onValueChange={(next) => setPeople((all) => all.map((p) => p.id === id ? { ...p, ...next } : p))}
          onSave={(draft) => serverSave(draft, lab.shouldFail)}>
          <EditRegionView>
            <span className="lab-cur-name">{person.name}</span>
            <span className="lab-cur-meta">{person.email} · {roleName(person.role)}{person.notify ? ' · Gets updates' : ''}</span>
          </EditRegionView>
          <EditRegionForm<Person>>
            {(field) => <>
              <div className="lab-pair">
                <Field label="Name" required error={field.error('name')}><Input {...field('name')} autoComplete="off" /></Field>
                <Field label="Email" required error={field.error('email')}><Input {...field('email')} type="email" autoComplete="off" /></Field>
              </div>
              <Field label="Role"><Select {...field.value('role')} items={ROLES} /></Field>
              <Switch {...field.checked('notify')} label="Email them when this project changes" />
            </>}
          </EditRegionForm>
        </EditRegion>
      </li>)}
    </ul>
  );
}

function ProposedPeople() {
  const [people, setPeople] = React.useState(PEOPLE);
  return (
    <ul className="lab-people">
      {people.map(({ id, ...person }) => <li key={id} data-measure="[data-slot=name] .lab-slot-text|[data-slot=name] input">
        <InPlacePerson person={person} onValueChange={(next) => setPeople((all) => all.map((p) => p.id === id ? { ...p, ...next } : p))} />
      </li>)}
    </ul>
  );
}

/* ───────────── the lab around them ───────────── */

function textPoint(el: Element) {
  if (el instanceof HTMLInputElement) { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top + r.height / 2 }; }
  const range = document.createRange();
  range.selectNodeContents(el);
  const r = range.getClientRects()[0] ?? el.getBoundingClientRect();
  return { x: r.left, y: r.top + r.height / 2 };
}
async function settled(host: Element) {
  const running = () => document.getAnimations().filter((a) => {
    const target = (a.effect as KeyframeEffect | null)?.target;
    const timing = a.effect?.getTiming();
    return target instanceof Element && host.contains(target) && timing?.iterations !== Infinity && Number(timing?.duration) < 2000 && a.playState === 'running';
  });
  await wait(40);
  await Promise.race([Promise.all(running().map((a) => a.finished.catch(() => undefined))), wait(6000)]);
}

// Opening anything in the panel measures where the value's text was and where it ends up once motion has stopped.
function Panel({ kind, title, children, notes, toolbar }: { kind: 'today' | 'proposed'; title: string; children: React.ReactNode; notes: React.ReactNode; toolbar?: React.ReactNode }) {
  const [reading, setReading] = React.useState('Open an editor to measure how far its value moves.');
  const onClickCapture = (event: React.MouseEvent) => {
    const button = (event.target as Element).closest('button');
    if (!button || !(button.matches('[data-slot]') || /^Edit/.test(button.textContent?.trim() ?? ''))) return;
    const host = button.closest<HTMLElement>('[data-measure]');
    const [readSel, editSel] = host?.dataset.measure?.split('|') ?? [];
    const readEl = host?.querySelector(readSel);
    if (!host || !readEl) return;
    const before = textPoint(readEl);
    void settled(host).then(() => {
      const editEl = host.querySelector(editSel);
      if (!editEl) return;
      const after = textPoint(editEl);
      const dx = Math.round(after.x - before.x), dy = Math.round(after.y - before.y);
      setReading(dx === 0 && dy === 0 ? 'Opening left the value exactly where it was.'
        : `Opening moved the value ${Math.abs(dx)}px ${dx < 0 ? 'left' : 'right'} and ${Math.abs(dy)}px ${dy < 0 ? 'up' : 'down'}.`);
    });
  };
  return (
    <section className="lab-panel" data-kind={kind} aria-label={`${kind === 'today' ? 'Today' : 'Proposed'}: ${title}`} onClickCapture={onClickCapture}>
      <header className="lab-panel-head">
        <span className="lab-tag" data-kind={kind}>{kind === 'today' ? 'Today' : 'Proposed'}</span>
        <span className="lab-panel-title">{title}</span>
      </header>
      {toolbar}
      <div className="lab-stage lab-inplace">{children}</div>
      <p className="lab-reading" aria-live="polite"><Icons.Info size={14} />{reading}</p>
      <div className="lab-notes">{notes}</div>
    </section>
  );
}

function Choice<V extends string>({ label, value, options, onChange }: { label: string; value: V; options: [V, string][]; onChange: (v: V) => void }) {
  return (
    <div className="lab-choice" role="group" aria-label={label}>
      <span className="lab-choice-label" aria-hidden="true">{label}</span>
      {options.map(([v, text]) => <Button key={v} size="sm" variant={v === value ? 'secondary' : 'ghost'} aria-pressed={v === value} onClick={() => onChange(v)}>{text}</Button>)}
    </div>
  );
}

// Slow motion: every running animation on the page, Altitude's and the lab's, plays at the chosen rate.
function usePlaybackRate(rate: number) {
  React.useEffect(() => {
    let frame = 0;
    const tick = () => {
      for (const a of document.getAnimations()) if (a.playbackRate !== rate) a.playbackRate = rate;
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [rate]);
}

function systemScheme(): BuiltInScheme {
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'nightfall' : 'daylight';
}

function LabPage() {
  const [scheme, setScheme] = React.useState<BuiltInScheme>(systemScheme);
  const [slow, setSlow] = React.useState(false);
  const [reduced, setReduced] = React.useState(false);
  const [failNext, setFailNext] = React.useState(false);
  const [settleDuration, setSettleDuration] = React.useState('5000');
  const [trigger, setTrigger] = React.useState<TextTrigger>('button');
  const fail = React.useRef(false);
  fail.current = failNext;
  const shouldFail = React.useCallback(() => { if (!fail.current) return false; fail.current = false; setFailNext(false); return true; }, []);
  const lab = React.useMemo(() => ({ shouldFail, settleDuration: Number(settleDuration) }), [shouldFail, settleDuration]);
  const [epoch, setEpoch] = React.useState(0);
  usePlaybackRate(slow ? 0.25 : 1);
  React.useLayoutEffect(() => { document.body.setAttribute('data-theme', scheme); }, [scheme]);

  return (
    <AltitudeProvider scheme={scheme} motion={reduced ? 'reduced' : 'system'} className="page">
      <Lab.Provider value={lab}>
        <header className="lab-hero">
          <div className="wrap">
            <a className="lab-back" href="../">← Altitude</a>
            <p className="kicker">Lab · prototype</p>
            <h1 className="h2">Edit in place</h1>
            <p className="lede">Today, Edit swaps the record for a form: values jump to new places, the push is hard to follow, and “Saved” stays on screen. The proposal opens a well under each value <strong>where it already is</strong>. Whatever still changes size glides, so you can see what's being pushed. Each panel measures how far its value moved when it opened.</p>
          </div>
        </header>

        <div className="lab-controls" role="region" aria-label="Lab controls">
          <div className="wrap lab-controls-row">
            <Switch checked={slow} onCheckedChange={setSlow} label="Slow motion (¼ speed)" />
            <Switch checked={reduced} onCheckedChange={setReduced} label="Reduced motion" />
            <Switch checked={failNext} onCheckedChange={setFailNext} label="Next save fails" />
            <Switch checked={scheme === 'nightfall'} onCheckedChange={(on) => setScheme(on ? 'nightfall' : 'daylight')} label="Dark" />
            <span className="lab-control">
              <span id="lab-settle-label">Afterglow</span>
              <Select size="sm" aria-labelledby="lab-settle-label" value={settleDuration} onValueChange={setSettleDuration} items={[
                { value: '2000', label: '2s' }, { value: '3000', label: '3s' }, { value: '5000', label: '5s (new default)' }, { value: '8000', label: '8s (dur-settle)' },
              ]} />
            </span>
            <Button size="sm" variant="ghost" onClick={() => setEpoch((n) => n + 1)}>Reset examples</Button>
          </div>
        </div>

        <main key={epoch}>
          <section className="lab-section" aria-labelledby="one-value">
            <div className="wrap">
              <h2 className="h3" id="one-value">One value</h2>
              <p className="lede small">InlineEdit on a task title. Try Edit, then Save with the title cleared to see an error arrive.</p>
              <div className="lab-grid">
                <Panel kind="today" title="InlineEdit" notes={<ul>
                  <li>The editor appears in one frame: 36px becomes 140px and the text below jumps.</li>
                  <li>A label is added above, so the title moves down and right, and shrinks to 14px.</li>
                  <li>After a save, “Changes saved” stays under the title.</li>
                </ul>}><CurrentTask /></Panel>
                <Panel kind="proposed" title="In-place value" toolbar={<Choice label="Open with" value={trigger} onChange={setTrigger}
                  options={[['button', 'Edit button'], ['pencil', 'Pencil on hover'], ['field', 'Field on hover']]} />} notes={<ul>
                  <li>The well opens under the title's own text, in its own font, so nothing moves.</li>
                  {trigger === 'button' && <li>Save and Cancel take Edit's place on the same row. They wrap below only when there's no room, and that wrap glides.</li>}
                  {trigger === 'pencil' && <li>The title is the button. A pencil shows at the end of the text on hover or keyboard focus, in space that's always reserved, so it moves nothing. Touch screens can't hover, so they always show it.</li>}
                  {trigger === 'field' && <li>Hovering draws the input's border and floor around the text, so clicking just puts the caret where you clicked. Keyboard focus shows the same field, and Enter or Space selects the whole title.</li>}
                  <li>The afterglow has room around the text. The status is for screen readers only, and clears itself.</li>
                </ul>}><ProposedTask key={trigger} trigger={trigger} /></Panel>
              </div>
            </div>
          </section>

          <section className="lab-section" aria-labelledby="record">
            <div className="wrap">
              <h2 className="h3" id="record">A record in a list</h2>
              <p className="lede small">EditRegion on people with access. Watch the rows underneath while one opens; turn on slow motion to follow the push.</p>
              <div className="lab-grid">
                <Panel kind="today" title="EditRegion" notes={<ul>
                  <li>The finished card is drawn at once and uncovered by a fast height animation (220ms for about 225px).</li>
                  <li>Padding and labels arrive together, so the name lands about 30px right and 50px down.</li>
                  <li>The afterglow sits right against the text, and “Saved” stays on screen.</li>
                </ul>}><CurrentPeople /></Panel>
                <Panel kind="proposed" title="In-place record" notes={<ul>
                  <li>Padding is always there, with a negative margin, so lifting changes colour and shadow, not position.</li>
                  <li>Each value's well opens where its text was. Values that must move, because a control is wider or taller than its text, are carried there.</li>
                  <li>Height glides on the real box, longer for longer pushes, and the actions fade in as the edge reaches them.</li>
                </ul>}><ProposedPeople /></Panel>
              </div>
            </div>
          </section>

          <section className="lab-section" aria-labelledby="sheet">
            <div className="wrap">
              <h2 className="h3" id="sheet">A property sheet that reserves height</h2>
              <p className="lede small">When values sit in labelled rows, the read rows can already be as tall as the controls. Then Edit all moves nothing; only the actions row is added at the end.</p>
              <div className="lab-grid lab-grid-one">
                <Panel kind="proposed" title="Reserved rows" notes={<ul>
                  <li>Labels stay visible in both modes, so no label has to be added above a field.</li>
                  <li>Empty values read “Not set” in the same slot their well will open in.</li>
                </ul>}><InPlaceSheet /></Panel>
              </div>
            </div>
          </section>
        </main>

        <footer className="foot">
          <div className="wrap foot-row">
            <span>A prototype for discussion. Nothing here is in the package yet.</span>
            <a href="https://github.com/richlaconte/altitude">GitHub</a>
          </div>
        </footer>
      </Lab.Provider>
    </AltitudeProvider>
  );
}

createRoot(document.getElementById('altitude-site')!).render(<LabPage />);
