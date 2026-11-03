# InlineEdit

Edit one value where its committed value already appears: by default a single-line string, a paragraph with `multiline`, or any value with a custom `editor`. Read mode shows the saved text (or “Not set”) and a visible Edit button. Editing happens in place: the value's text sits in a slot with the control's own inset and font, so when the control opens there the text doesn't move, and Save and Cancel take Edit's place on the same line. It is a group, with normal page Tab order and no focus trap.

```tsx
const [name, setName] = React.useState('Brand guidelines.pdf');

<InlineEdit
  label="File name"
  value={name}
  onValueChange={setName}
  onSave={async (draft, { previousValue }) => {
    // Application code: enforce the record's server revision and reconcile
    // an interrupted response before reporting a retryable failure.
    const result = await renameFileOnServer(draft, previousValue);
    return result.ok
      ? { ok: true, value: result.canonicalName }
      : { ok: false, error: result.userMessage };
  }}
  required
  maxLength={100}
/>
```

`value`, `onValueChange`, `onSave` and `label` are required. The application owns the committed string, authorization, validation policy and persistence. `onSave(draft, { previousValue })` is the sole write. It returns `{ ok: true, value: string }` with the canonical value, or `{ ok: false, error: string }` for a known failed write. A throw, rejection or malformed result displays “We couldn’t save this change. Try again.” without exception details.

Use an ordinary synchronous state setter for `onValueChange`: it publishes the accepted canonical string exactly once. It must not make another network write, veto success or defer publication. Do not update `value` optimistically from `onSave`; an observed external change means conflict. The captured `previousValue` helps an adapter identify its baseline, but is not a server lock. Enforce a record revision or equivalent server-side concurrency guard.

A transport timeout does not prove a write failed. Before throwing or returning a retryable failure, the adapter must reconcile the server record or retry the same logical operation ID idempotently. If the write committed, return canonical success. Only a known uncommitted write may become a new user retry. The preview includes an interrupted-after-save fixture demonstrating one committed mutation and reconciliation of the lost response.

## Editing and validation

Typing changes local text without trimming. Cancel and Escape discard that text; blur, outside clicks and Tab do nothing to the session. Enter saves (Ctrl/Cmd+Enter with `multiline`), except while IME composition is active (including legacy key code 229). Composition Escape also remains with the IME. Input Enter prevents a surrounding form from submitting.

Saving an exact unchanged value closes without validation, persistence, publication or afterglow. `required` defaults to false; when true it rejects the empty string using HTML required semantics. Spaces stay legal unless application validation rejects them. `maxLength` uses JavaScript/HTML UTF-16 string length and the native input limit. Optional `validate(draft)` runs only on Save and returns a user-facing error string or `undefined`, synchronously or as a promise. Use validation to reject whitespace-only or duplicate names when your application requires it.

While validation runs, the input is read-only and Save is unavailable; Cancel and Escape remain usable. Late validation results cannot affect a cancelled or replaced session. During persistence the input stays read-only, Save shows loading and Cancel is unavailable. Escape announces “Saving changes. Wait for the result.” It does not cancel a dispatched write. Duplicate and reentrant submissions dispatch at most once. A failed save preserves editable input and the original baseline for retry; typing clears ordinary errors.

## External updates and lifecycle

An observed `value` change during editing, validation or error retains the draft and blocks Save. The region shows the latest saved value and “Use current value”. That explicit action replaces the draft and baseline and refocuses the input; Cancel displays the latest record.

An update during a write latches a conflict even if a later observed update restores the earlier string. The request may finish, but its result is never published through `onValueChange`. The recovery message says the save may have completed and asks the person to check the current record. The application must reconcile its server state; the component cannot roll back a dispatched write or assert authoritative freshness.

Unmount invalidates pending work and suppresses subsequent publication, announcements, state and focus work. It does not abort persistence. Applications must still reconcile writes after navigation. Becoming `disabled` prevents new edits and Save while keeping an existing session cancellable and allowing a dispatched write to settle.

## Paragraphs: `multiline`

`multiline` swaps the Input for a Textarea, for a description, note or comment edited where it's shown.

```tsx
<InlineEdit
  label="Description"
  multiline
  rows={4}          // initial height in lines (default 3)
  maxRows={16}      // grows with its content up to here, then scrolls (default 12)
  maxLength={2000}  // the Textarea's fill from the floor and live count near the limit
  value={task.description}
  onValueChange={setDescription}
  onSave={(draft) => api.setDescription(task.id, draft, task.revision)}
/>
```

Enter inserts a newline; Ctrl+Enter (⌘+Enter on Apple platforms) saves; Escape cancels. During IME composition none of these act. The hint under the field names the keys with `Kbd` and describes the textarea. Opening puts the caret at the end instead of selecting everything, because selecting a paragraph invites replacing it by accident. Read mode keeps line breaks (`white-space: pre-wrap`) in a slot with the textarea's inset, with Edit (then Save and Cancel) below it, and shows “Not set” when empty. Opening glides the region's height from the read text to the editor's; after that the textarea grows line by line without animating, and under reduced motion the height changes at once. A chat-style “Enter sends” composer is a different component.

`multiline` applies to the default editor; with a custom `editor` it's ignored. `renderValue` still draws read mode if you pass it.

## Other values: `editor`, `renderValue` and `commit`

`InlineEdit<V>` takes any value type. `renderValue(value)` draws read mode (default: the value as text, or “Not set” when it's `''`, `null`, `undefined` or an empty array). `editor(control)` draws edit mode; spread `control` onto an Altitude control. It carries `value`, `onValueChange`, the `id` the label points at, `aria-describedby` for the error or hint, `invalid`, `readOnly` (checking, saving or blocked by a conflict; changes are ignored then), `disabled` and `autoFocus`. The session is unchanged: baseline, draft, `validate`, the `onSave` contract, conflict latching, unmount safety and focus return all work the same way. Without `editor`, the existing Input is used and nothing about the string case changes.

```tsx
<InlineEdit<Status>
  label="Status"
  value={issue.status}
  onValueChange={setStatus}
  renderValue={(s) => <Badge tone={toneFor(s)}>{labelFor(s)}</Badge>}
  editor={(control) => <Select {...control} items={statuses} />}
  commit="on-choose"
  onSave={(draft) => api.setStatus(issue.id, draft, issue.revision)}
/>

<InlineEdit<number | null>
  label="Estimate"
  value={task.estimate}
  onValueChange={setEstimate}
  required
  validate={(n) => Number.isInteger(n) && n >= 0 ? undefined : 'Use a whole number, 0 or more.'}
  renderValue={(n) => `${n} points`}
  editor={({ value, onValueChange, ...control }) => (
    <Input {...control} type="number" value={value ?? ''}
      onChange={(e) => onValueChange(e.target.value === '' ? null : Number(e.target.value))} />
  )}
  onSave={(draft) => api.setEstimate(task.id, draft, task.revision)}
/>
```

`commit="on-choose"` is for single-choice editors (Select, Combobox, a date picker): choosing a value is the deliberate act, so it dispatches the save. Save is hidden and the hint under the control reads “Choose to save”; Cancel stays, so a pointer user can leave without choosing. Choosing the current value closes without a write. A rejected save keeps the editor open on the chosen value with the error, and adds “Try again”; choosing another value saves that instead. On success the list closes first, then the editor settles, and the status region names the value (“Status set to In review”, from the rendered read value). With the default `commit="explicit"`, Enter in a custom editor's single-line text input saves, as it does in the default Input; a choice control's own Enter (opening or choosing) is left to it.

Escape inside an open popup closes the popup only; the next Escape cancels the session. `isEqual(a, b)` (default `Object.is`) decides both whether a draft is unchanged and whether an observed `value` is an external change, so pass one for object values (a date range) whose identity changes on every render. `required` rejects an empty value of any type; `maxLength` applies to strings only. A canonical `onSave` result for a custom editor may be any value except `undefined`; for the default Input it must still be a string.

## In place

The value lives in a slot that has the control's inset (12px and a transparent 1px border, as `Input` and `Select` have) and, by default, its height (40px, or the value's line height plus 18px if that's taller). The line reaches 13px past its column on each side, so the value's text lines up with the text around it and the opened well reaches into the gutter. The control takes the value's own font: a 19px title is edited as a 19px title. Opening fades in only the well's floor, walls and border around text that stays put; no visible label is added above it (the label names the control for assistive technology). Whatever still changes size glides on the real box, so what's below is pushed rather than jumped: Save and Cancel wrapping onto a line of their own at narrow widths, an error, the key hint. Leave 13px of room either side of an InlineEdit for its well.

## Ways to open: `trigger` and `hint`

`trigger` sets how editing starts:

| `trigger` | read mode | opening |
|---|---|---|
| `'button'` (default) | the value, then a visible Edit button (`editLabel`) | Edit, or Enter/Space on it; the value is selected |
| `'value'` | one button holding the value, a plate that lifts on hover | click, Enter or Space; the value is selected |
| `'pencil'` | one button holding the value; a pencil appears at the end of the text on hover or keyboard focus, in space that's always reserved, so showing it moves nothing. Touch screens can't hover, so they always show it | click, Enter or Space; the value is selected |
| `'field'` | one button holding the value; pointing at it draws the filled input's border and floor around the text, so the click only focuses it | a click puts the caret where it landed; Enter or Space selects the value |

With every trigger except `'button'`, the button is named “<label>: <value>. <editLabel>”, `emptyLabel` names an empty value (default “Not set”), and `shortcut` puts a key in the button's `aria-keyshortcuts` for a surrounding list to handle. `PropertyList` uses `'value'` with all three.

A trigger that only shows on hover needs a sign at rest, or people won't know to point at the value. `hint="seam"` scores a faint groove under the value: a hairline cut in `line-control` with the well's light lip beneath it, where the well will open. It's an opening's edge drawn on the ground, not a link's underline, so it reads as something that can be opened rather than followed. With `'field'` the field's own border replaces it on hover. It's flat in `contrast="more"` and dashed in forced colours, and not drawn for an empty value, which already shows its own words. Default `hint="none"`.

## Focus and accessible equivalents

Opening focuses and selects the input (with a custom `editor`, it focuses the editor's first focusable control). Save or Cancel restores focus to Edit only when focus was still in the editor at completion. Completion never steals focus from another part of the page. If Edit is unavailable while the component remains mounted, `focusFallback` may return a connected, enabled, focusable element; otherwise it leaves focus where it is. When a parent removes a row, the parent owns next-row or heading focus.

A visually hidden label and a single alert wire the input's name, description and invalid state. A polite status announces checking, saving and accepted success outside the saving region's `aria-busy` subtree; it's never shown, and clears itself after `dur-linger`. The editor stays on the ground with its well open, persistence uses Surface's pending signal, failed writes use its failed treatment, and accepted canonical text settles with an afterglow that fills the value's slot, so it never sits against the text. Text, controls, error icons and borders preserve every state without motion or shadows. Actions wrap below the field at narrow widths.

Optional labels are `editLabel` (default `Edit ${label}`), `saveLabel` (“Save changes”) and `cancelLabel` (“Cancel”). `settleDuration` sets how long a saved value's afterglow takes to fade, in ms (default 5000, shorter than `dur-settle` because the person is watching the change). `className` applies to the local group. There is no autosave, history, portal or form abstraction.

## Demo and verification

The canonical `InlineEdit` section in `build/previews.txt` renders a task title (in its heading font), a multiline description, the task's status (Select, on choose, with a rejected “Blocked”), assignee (Combobox, on choose) and estimate (a numeric Input), an independent filename table cell with this component, and “Ways to open”: a pencil and two fields on hover, with seams. A collapsed documentation harness selects deterministic fixtures before mounting, resets records and counters, delays validation, applies external updates, removes the filename consumer during work and opens a dialog comparison using the same validation and persistence adapter. Fixture controls and operation logs stay outside the product scene.

Run `node checks/inline-edit.mjs` from `build/` after generating preview fixtures. `ALT_FIXTURE_ROOT=test/react19` selects the React 19 source fixtures. The checks cover editing in place (the value's text doesn't move, the control takes its font, the pencil and the field move nothing on hover, the caret lands where clicked, the seam, the announcement that clears itself), multiline (newline on Enter, Ctrl/Cmd+Enter, IME, Escape, caret at the end, growth to `maxRows`, line breaks in read mode), custom editors (focus, Escape layering, on-choose saves and rejections, unchanged choices, numeric validation), lifecycle races, retained input, uncertainty reconciliation, conflict latching, keyboard/IME, focus, disabled behavior and the four-scheme responsive/accessibility matrix. Automated checks do not replace the human screen-reader, touch, magnification or formative comparisons recorded in [Actions in place validation](../../ActionsInPlaceValidation.md).

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`InlineEdit` as first used in its preview:

```tsx
import { InlineEdit } from 'altitude-design';

<InlineEdit label="Description" value={task.description} onValueChange={publish('description')} onSave={save('description')}
  multiline rows={3} maxRows={8} maxLength={500} />
```

The full preview, as rendered in Storybook and checked in CI (`inline-demo-description`, `inline-demo-prop-label`, `inline-demo-props`, `inline-demo-prop`, `inline-demo-scene`, `inline-demo-task`, `inline-demo-meta`, `inline-demo-harness`, `inline-demo-controls`, `inline-demo-log`, `inline-demo` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Badge, Button, Combobox, Dialog, Field, InlineEdit, Input, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'altitude-design';

const INLINE_RECORDS = Object.freeze([
  Object.freeze({ id: 'task-launch', name: 'Prepare launch checklist', revision: 1 }),
  Object.freeze({ id: 'file-brand', name: 'Brand guidelines.pdf', revision: 1 }),
  Object.freeze({ id: 'file-brand-draft', name: 'Brand guidelines draft.pdf', revision: 1 }),
  Object.freeze({ id: 'file-launch', name: 'Launch checklist.md', revision: 1 }),
]);
const INLINE_FIXTURES = ['success-100', 'success-1200', 'fail-once', 'conflict', 'interrupted-after-save'];
const inlineWait = ms => new Promise(resolve => setTimeout(resolve, ms));
const INLINE_STATUSES = [{ value: 'todo', label: 'To do' }, { value: 'progress', label: 'In progress' }, { value: 'review', label: 'In review' }, { value: 'blocked', label: 'Blocked' }];
const INLINE_TONES = { todo: 'neutral', progress: 'accent', review: 'caution', blocked: 'critical' };
const INLINE_PEOPLE = [{ value: 'mara', label: 'Mara Quist' }, { value: 'ines', label: 'Inés Ortega' }, { value: 'tobi', label: 'Tobi Adeyemi' }, { value: 'wen', label: 'Li Wen' }];
const inlineLabel = (list, value) => list.find(option => option.value === value)?.label ?? 'Not set';

// Task properties: the same session with a different editor. Status and assignee save on choose; the estimate waits for Save.
function InlineTaskProperties() {
  const [task, setTask] = React.useState({ status: 'progress', assignee: 'mara', estimate: 3, description: 'Collect sign-off from design, support and legal.\nShare the final list in #launch by Thursday.' });
  const publish = key => value => setTask(task => ({ ...task, [key]: value }));
  const save = key => async draft => {
    await inlineWait(300);
    if (key === 'status' && draft === 'blocked') return { ok: false, error: 'Only the project lead can block a task. Choose another status.' };
    return { ok: true, value: draft };
  };
  return <>
    <div className="inline-demo-description"><span className="inline-demo-prop-label" aria-hidden="true">Description</span>
      <InlineEdit label="Description" value={task.description} onValueChange={publish('description')} onSave={save('description')}
        multiline rows={3} maxRows={8} maxLength={500} /></div>
    <div className="inline-demo-props">
    <div className="inline-demo-prop"><span className="inline-demo-prop-label" aria-hidden="true">Status</span>
      <InlineEdit label="Status" value={task.status} onValueChange={publish('status')} onSave={save('status')} commit="on-choose"
        renderValue={status => <Badge tone={INLINE_TONES[status]}>{inlineLabel(INLINE_STATUSES, status)}</Badge>}
        editor={control => <Select {...control} items={INLINE_STATUSES} size="sm" />} /></div>
    <div className="inline-demo-prop"><span className="inline-demo-prop-label" aria-hidden="true">Assignee</span>
      <InlineEdit label="Assignee" value={task.assignee} onValueChange={publish('assignee')} onSave={save('assignee')} commit="on-choose"
        renderValue={person => inlineLabel(INLINE_PEOPLE, person)}
        editor={control => <Combobox {...control} items={INLINE_PEOPLE} size="sm" placeholder="Type a name" />} /></div>
    <div className="inline-demo-prop"><span className="inline-demo-prop-label" aria-hidden="true">Estimate</span>
      <InlineEdit label="Estimate" value={task.estimate} onValueChange={publish('estimate')} onSave={save('estimate')} required
        validate={points => Number.isInteger(points) && points >= 0 && points <= 40 ? undefined : 'Use a whole number from 0 to 40.'}
        renderValue={points => `${points} point${points === 1 ? '' : 's'}`}
        editor={({ value, onValueChange, ...control }) => <Input {...control} type="number" inputMode="numeric" min={0} max={40} size="sm"
          value={value ?? ''} onChange={event => onValueChange(event.target.value === '' ? null : Number(event.target.value))} />} /></div>
    </div>
  </>;
}

function InlineExample({ fixture, slowValidation, epoch }) {
  const server = React.useRef(null);
  if (!server.current) server.current = new Map(INLINE_RECORDS.map(record => [record.id, { ...record }]));
  const [records, setRecords] = React.useState(() => INLINE_RECORDS.map(record => ({ ...record })));
  const [log, setLog] = React.useState([]);
  const [visible, setVisible] = React.useState(true);
  const [outsideCount, setOutsideCount] = React.useState(0);
  const [baseline, setBaseline] = React.useState(false);
  const sequence = React.useRef(0), failUsed = React.useRef(false), accepted = React.useRef(new Map());
  const alive = React.useRef(true);
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const record = id => records.find(record => record.id === id);
  const trace = event => { if (alive.current) setLog(log => [...log, event]); };
  const reconcile = id => { if (alive.current) setRecords(records => records.map(record => record.id === id ? { ...server.current.get(id) } : record)); };
  const publish = id => canonicalValue => {
    trace({ event: 'published', id, value: canonicalValue });
    setRecords(records => records.map(record => record.id === id ? { ...server.current.get(id), name: canonicalValue } : record));
  };
  const validate = id => async draft => {
    if (slowValidation) await inlineWait(1200);
    if (!draft.trim()) return 'Enter a name.';
    if ([...server.current.values()].some(record => record.id !== id && record.name === draft.trim())) return 'A file already has this name. Choose another.';
  };
  const save = id => async (draft, { previousValue }) => {
    const expectedRevision = record(id).revision;
    const operationId = `rename-${epoch}-${++sequence.current}`;
    trace({ event: 'requested', id, expectedRevision, operationId, draft });
    const commit = () => {
      if (accepted.current.has(operationId)) return accepted.current.get(operationId);
      const current = server.current.get(id);
      if (current.revision !== expectedRevision || current.name !== previousValue) {
        reconcile(id); trace({ event: 'rejected-stale', id, operationId });
        return { ok: false, error: 'The saved name changed. Review the current name.' };
      }
      const next = { ...current, name: draft.trim(), revision: current.revision + 1 };
      server.current.set(id, next);
      const result = { ok: true, value: next.name };
      accepted.current.set(operationId, result);
      trace({ event: 'committed', id, revision: next.revision, operationId, value: next.name });
      return result;
    };
    if (fixture === 'interrupted-after-save') {
      await inlineWait(100); const result = commit();
      await inlineWait(1100);
      // Simulate a lost acknowledgement, then query/retry the same operation ID.
      // A known committed result is returned as success; no second mutation occurs.
      trace({ event: 'reconciled', id, operationId, revision: server.current.get(id).revision });
      return accepted.current.get(operationId) || result;
    }
    if (fixture === 'conflict') {
      await inlineWait(100);
      const current = server.current.get(id);
      server.current.set(id, { ...current, name: id === 'task-launch' ? 'Prepare updated launch checklist' : 'Brand guidelines revised.pdf', revision: current.revision + 1 });
      reconcile(id); trace({ event: 'external-update', id, revision: current.revision + 1 });
      await inlineWait(1100); return commit();
    }
    if (fixture === 'fail-once' && !failUsed.current) {
      failUsed.current = true; await inlineWait(1200);
      trace({ event: 'rejected', id, operationId });
      return { ok: false, error: 'We couldn’t save this name. Your text is still here. Try again.' };
    }
    await inlineWait(fixture === 'success-1200' ? 1200 : 100);
    return commit();
  };
  const file = record('file-brand');
  const externalUpdate = () => {
    const current = server.current.get('file-brand');
    server.current.set('file-brand', { ...current, name: 'Brand guidelines updated.pdf', revision: current.revision + 1 });
    trace({ event: 'external-update', id: 'file-brand', revision: current.revision + 1 }); reconcile('file-brand');
  };
  return <>
    <div className="inline-demo-scene" data-inline-scene="">
      <section className="inline-demo-task" aria-labelledby="inline-task-title">
        <h2 id="inline-task-title">Launch preparation</h2>
        <InlineEdit label="Task title" editLabel="Edit task title" value={record('task-launch').name} onValueChange={publish('task-launch')} onSave={save('task-launch')} validate={validate('task-launch')} required maxLength={100} />
        <p className="inline-demo-meta">Due Friday · Product team</p>
        <InlineTaskProperties />
      </section>
      <section aria-labelledby="inline-files-title">
        <h2 id="inline-files-title">Files</h2>
        <Table>
          <TableHeader><TableRow><TableHead>File name</TableHead><TableHead>Size</TableHead></TableRow></TableHeader>
          <TableBody>
            {visible && <TableRow><TableCell>
              <InlineEdit label="File name" editLabel="Rename file" value={file.name} onValueChange={publish('file-brand')} onSave={save('file-brand')} validate={validate('file-brand')} required maxLength={100} />
            </TableCell><TableCell>2.4 MB</TableCell></TableRow>}
            <TableRow><TableCell>{record('file-brand-draft').name}<p className="inline-demo-meta">Draft · Updated yesterday</p></TableCell><TableCell>1.8 MB</TableCell></TableRow>
            <TableRow><TableCell>{record('file-launch').name}</TableCell><TableCell>8 KB</TableCell></TableRow>
          </TableBody>
        </Table>
        <Button variant="ghost" onClick={() => setOutsideCount(count => count + 1)}>Show file details</Button>
        {outsideCount > 0 && <p className="inline-demo-meta">Three fictional files · Details opened {outsideCount} time{outsideCount === 1 ? '' : 's'}.</p>}
      </section>
      <InlineWaysToOpen />
    </div>
    <details className="inline-demo-harness">
      <summary>Comparison and fixture controls</summary>
      <p>These controls belong to the documentation harness. The dialog comparison uses the same filename, validation and save adapter. Reset before each trial.</p>
      <div className="inline-demo-controls">
        <Button onClick={externalUpdate}>Apply external filename update</Button>
        <Button onClick={() => { if (!visible) reconcile('file-brand'); setVisible(visible => !visible); }}>{visible ? 'Remove filename editor' : 'Show filename editor'}</Button>
        <Button onClick={() => setBaseline(true)}>Open dialog rename baseline</Button>
      </div>
      <output className="inline-demo-log" data-inline-log="" aria-label="Fixture operation log">{JSON.stringify(log, null, 2)}</output>
    </details>
    <InlineDialogBaseline open={baseline} onOpenChange={setBaseline} value={file.name} validate={validate('file-brand')} onSave={save('file-brand')} onValueChange={publish('file-brand')} />
  </>;
}

function InlineDialogBaseline({ open, onOpenChange, value, validate, onSave, onValueChange }) {
  const [draft, setDraft] = React.useState(value), [error, setError] = React.useState(''), [busy, setBusy] = React.useState('');
  const baseline = React.useRef(value), generation = React.useRef(0), guard = React.useRef(false), latest = React.useRef(value);
  latest.current = value;
  React.useEffect(() => {
    generation.current++; guard.current = false; setBusy(''); setError('');
    if (open) { baseline.current = value; setDraft(value); }
    return () => { generation.current++; };
  }, [open]);
  const submit = async () => {
    if (guard.current) return;
    if (latest.current !== baseline.current) { setError('The saved value changed. Close and reopen to review it.'); return; }
    if (draft === baseline.current) { onOpenChange(false); return; }
    guard.current = true; const token = generation.current; setError(''); setBusy('Checking value');
    const error = draft.length > 100 ? 'Use 100 characters or fewer.' : await validate(draft);
    if (token !== generation.current) return;
    if (error) { guard.current = false; setBusy(''); setError(error); return; }
    setBusy('Saving changes');
    const result = await onSave(draft, { previousValue: baseline.current });
    if (token !== generation.current) return;
    guard.current = false; setBusy('');
    if (latest.current !== baseline.current) { setError('The value changed while saving. Your save may have completed. Check the current record.'); return; }
    if (!result.ok) { setError(result.error); return; }
    onValueChange(result.value); onOpenChange(false);
  };
  return <Dialog open={open} onOpenChange={onOpenChange} title="Rename file" description="Change the name of this file." dismissible={busy !== 'Saving changes'} footer={<>
    <Button variant="ghost" disabled={busy === 'Saving changes'} onClick={() => onOpenChange(false)}>Cancel</Button>
    <Button variant="primary" loading={busy === 'Saving changes'} disabled={busy === 'Checking value'} onClick={submit}>Save changes</Button>
  </>}>
    <Field label="File name" error={error} required><Input value={draft} maxLength={100} readOnly={!!busy} onChange={event => { setDraft(event.target.value); setError(''); }} onKeyDown={event => {
      if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
      if (event.key === 'Enter') { event.preventDefault(); submit(); }
    }} /></Field>
    <p role="status">{busy}</p>
  </Dialog>;
}

// The value as its own button: a pencil on hover, or the field itself on hover. The seam says so at rest.
function InlineWaysToOpen() {
  const [values, setValues] = React.useState({ project: 'Spring catalogue launch', meeting: 'Quarterly planning review', owner: '' });
  const set = key => next => setValues(all => ({ ...all, [key]: next }));
  const save = draft => ({ ok: true, value: draft.trim() });
  return <section aria-labelledby="inline-ways-title">
    <h2 id="inline-ways-title">Ways to open</h2>
    <div className="inline-demo-props">
      <div className="inline-demo-prop"><span className="inline-demo-prop-label">Pencil on hover, with a seam</span>
        <InlineEdit label="Project name" trigger="pencil" hint="seam" value={values.project} onValueChange={set('project')} onSave={save} required /></div>
      <div className="inline-demo-prop"><span className="inline-demo-prop-label">Field on hover, with a seam</span>
        <InlineEdit label="Meeting title" trigger="field" hint="seam" value={values.meeting} onValueChange={set('meeting')} onSave={save} required /></div>
      <div className="inline-demo-prop"><span className="inline-demo-prop-label">Field on hover, empty</span>
        <InlineEdit label="Owner" trigger="field" hint="seam" emptyLabel="Add an owner" value={values.owner} onValueChange={set('owner')} onSave={save} /></div>
    </div>
  </section>;
}

export default function App() {
  const [fixture, setFixture] = React.useState('success-100'), [slow, setSlow] = React.useState(false);
  const [mounted, setMounted] = React.useState({ fixture: 'success-100', slow: false, epoch: 0 });
  return <div className="inline-demo">
    <InlineExample key={mounted.epoch} fixture={mounted.fixture} slowValidation={mounted.slow} epoch={mounted.epoch} />
    <details className="inline-demo-harness">
      <summary>Choose the next fixture</summary>
      <p>Select before mounting. Reset restores the same fictional records, revisions and request counters.</p>
      <div className="inline-demo-controls">
        <label>Rename fixture<select value={fixture} onChange={event => setFixture(event.target.value)}>{INLINE_FIXTURES.map(name => <option key={name}>{name}</option>)}</select></label>
        <label><input type="checkbox" checked={slow} onChange={event => setSlow(event.target.checked)} />Delay validation by 1,200 ms</label>
        <Button onClick={() => setMounted({ fixture, slow, epoch: mounted.epoch + 1 })}>Reset example</Button>
      </div>
    </details>
  </div>;
}
```
<!-- /example -->
