# EditRegion

Edit several fields of one record where the record is shown, and save them together as one write. Use it when two or more related values change together (a contact's name, email and role; a task's title, assignee and due date): several `InlineEdit`s would save one at a time and could leave the record half-changed, and a `Dialog` would cover the neighbouring records people look at to judge what a reasonable value is.

```tsx
<EditRegion label="Contact" value={contact} onValueChange={setContact}
  validate={(draft) => draft.email.includes('@') ? undefined : { email: 'Enter an email address.' }}
  onSave={async (draft, { previousValue, changed }) => {
    const result = await api.patchContact(contact.id, pick(draft, changed), contact.revision);
    return result.ok ? { ok: true, value: result.contact } : { ok: false, error: result.message, fieldErrors: result.fieldErrors };
  }}>
  <EditRegionView>
    <strong>{contact.name}</strong> <span>{contact.email}</span>
  </EditRegionView>
  <EditRegionForm>
    {(field) => <>
      <Field label="Name" required error={field.error('name')}><Input {...field('name')} /></Field>
      <Field label="Email" required error={field.error('email')}><Input type="email" {...field('email')} /></Field>
      <Field label="Role"><Select {...field.value('role')} items={roles} /></Field>
      <Switch {...field.checked('notify')} label="Email them when this project changes" />
    </>}
  </EditRegionForm>
</EditRegion>
```

## Elevation

- **Read mode** is the record on the ground (level 0): the values as text and a visible ghost “Edit <label>” button.
- **Editing** lifts the region into a static raised card (level 1, `surface-raised`, `elev-1`, a `line-control` border), as an `Accordion` lid lifts over its compartment. The card's padding and border are there in read mode too, transparent, under a matching negative margin, so lifting changes colour and shadow but never moves the record. Leave room for that margin either side: `space-3` plus 1px, or 22px with `layout="in-place"`. It doesn't lift on hover: it's being worked in, not offered. The fields inside are openings: empty wells, filled flush, invalid trenches, as `Input`, `Select` and `Field` draw them.
- **Saving** uses `Surface status="pending"`: after `dur-grace` it hovers at level 2, so a fast save shows nothing. **A known failure** drops to the failed trench with a critical `Alert` inside the editor; the draft stays. **Accepted** values settle back to the ground with one afterglow for the region, however many fields changed.
- **An outside change** while editing keeps the draft, blocks Save and shows a caution `Alert` “This record changed” with “Use current values”.

The words carry every state without height: the form's name, the button labels, `aria-invalid` and error text on fields, `aria-busy` on the form while saving, and the polite status (“Checking”, “Saving changes”, “Saved” or the error), which is announced, never shown, and clears itself after `dur-linger`. The afterglow fills the padded card, so it never sits against the text. Under forced colours the editor is a raised Surface with a border; under `contrast="more"` it gets level 1's ink slab.

## Props

| Prop | |
|---|---|
| `label` | names the region: the form is “Edit <label>” |
| `value`, `onValueChange` | the committed record, and a synchronous setter for the accepted canonical record (no network write) |
| `onSave(draft, { previousValue, changed })` | the sole write. Return `{ ok: true, value }` with the canonical record, or `{ ok: false, error, fieldErrors? }` for a known failure. A throw or malformed result shows a generic retry message |
| `validate(draft)` | on Save: an error per field, or `undefined`; sync or a promise |
| `open`, `defaultOpen`, `onOpenChange` | control the session. With `open`, Edit only calls `onOpenChange(true)`: the editor opens when you set `open`, so you can decline or defer it. Closing a controlled region doesn't cancel a dispatched save |
| `disabled`, `initialFocus`, `focusFallback`, `isEqual` | as `InlineEdit`; `initialFocus` names a field key; `isEqual` compares one field's values (default `Object.is`) |
| `editLabel`, `saveLabel`, `cancelLabel` | default “Edit <label>”, “Save changes”, “Cancel” |
| `settleDuration` | how long the afterglow takes to fade after a save, in ms. Default 5000 (shorter than `dur-settle`, because the person is watching the change) |
| `layout` | `'form'` (default): editing opens your form. `'in-place'`: each value's well opens where its text is (below) |

Parts: `EditRegionView` (read mode; `trigger={false}` to place `EditRegionTrigger` yourself), `EditRegionValue` (one value in read mode, named by its field; `reserve` for labelled rows), `EditRegionForm` (edit mode; children may be a function of the draft binder; `actions={false}` to place `EditRegionActions` yourself), `EditRegionTrigger`, `EditRegionActions`.

The binder: `field(key)` for text controls (`value` + `onChange`, `readOnly` while locked), `field.value(key)` for `Select`, `Combobox` and `Slider` (`value` + `onValueChange`), `field.checked(key)` for `Switch` and `Checkbox`, `field.error(key)` for the field's `Field`, and `field.draft`. Each binding carries `data-field`, which `initialFocus` and error focus use.

## In place: `layout="in-place"`

With `layout="in-place"` the fields open where the values are, as a single `InlineEdit` does, instead of a form replacing the record.

```tsx
<EditRegion layout="in-place" label={person.name} value={person} onValueChange={…} onSave={…}>
  <EditRegionView>
    <span className="name"><EditRegionValue field="name">{person.name}</EditRegionValue></span>
    <span className="meta"><EditRegionValue field="email">{person.email}</EditRegionValue> · <EditRegionValue field="role">{roleName}</EditRegionValue></span>
  </EditRegionView>
  <EditRegionForm>
    {(field) => <>
      <div className="name"><Field label="Name" error={field.error('name')}><Input {...field('name')} /></Field></div>
      <div className="meta-row">
        <Field label="Email" error={field.error('email')}><Input {...field('email')} /></Field>
        <Field label="Role"><Select {...field.value('role')} items={roles} /></Field>
      </div>
    </>}
  </EditRegionForm>
</EditRegion>
```

- **Mark each read value** with `EditRegionValue field="…"`, using the same key you bind. A field whose text opens where its value was simply appears; one that opens elsewhere (a control wider or taller than its text pushes the next one along) fades in there. Nothing slides.
- **Lay the fields out where the values were**, in the same wrappers, so each control takes the value's font. Controls reach 13px past their column on each side, the inset their text sits at, so the text lines up and the well reaches into the gutter: leave 26px more between columns than you want to see. Give rows fixed columns (a grid) rather than columns sized by what's typed, so nothing reflows while the editor opens. The form adds no spacing of its own.
- **A `Field`'s label is announced, not shown**: the record around the field already names it (a row's label, the value's place). Its error, `aria-invalid` and description still work.
- **Labelled rows**: `EditRegionValue reserve` gives a read value its control's height and inset now. In a list of label–value rows, Edit all then moves nothing, and only the actions row is added at the end.

## Behaviour

- Edit opens the form and focuses the first field (or `initialFocus`). Tab moves through the fields and out to the page; blur and outside clicks do nothing to the session (no save on blur, as `InlineEdit`).
- Enter in a single-line field saves; Ctrl/Cmd+Enter in a textarea saves. Nothing acts during IME composition. Escape cancels, except while a popup inside (a Select's list) is open: that Escape closes the popup, and the next one cancels. Escape never cancels a dispatched save; it announces “Saving changes. Wait for the result.”
- Saving an unchanged draft closes without a write. `changed` lists only the fields that differ, so the application can send a patch.
- Validation errors mark each field and focus the first invalid one; typing in a field clears its error. A save's `fieldErrors` are shown the same way, beside the `error` Alert.
- One write per record may be in flight: Save, Enter and repeated presses dispatch once. While saving, text fields are read-only and choice controls disabled.
- An observed `value` change during a save latches a conflict: the result is never published, and the message says the save may have completed. The application must reconcile its server state.
- Completion returns focus to the Edit button only if focus was still in the editor. Unmounting invalidates pending work and suppresses publication.
- Inside another `<form>`, the editor is a `role="group"` instead of a form, so forms don't nest.

## You provide

The record, the write (with a server-side revision or equivalent concurrency guard), validation policy, and reconciliation of interrupted writes, exactly as for `InlineEdit`. EditRegion doesn't autosave, keep history, or roll back a dispatched write.

## Do and don't

- **Do** keep the record's neighbours visible: that's why it edits in place.
- **Do** use `InlineEdit` for a single value; EditRegion is for values that must change together.
- **Don't** put more than about five fields in one region. A long form belongs in a `Sheet` beside the page.
- **Don't** update `value` optimistically from `onSave`: an observed change is treated as someone else's write.

## Demo and verification

The `EditRegion` section of `build/previews.txt` lists three people with access; each row is an in-place EditRegion over a fictional people service with revisions. Below it, trip details are label–value rows with reserved values. A collapsed harness picks a save fixture (`success`, `slow`, `fail-once`, `conflict-during-save`) and applies an outside update. `node checks/edit-region.mjs` (from `build/`, after rendering previews; `ALT_FIXTURE_ROOT` selects React 19 fixtures) covers editing in place (fields hold their place on every frame while the editor grows, the record below is pushed through the glide, lifting never moves the record, each field opens at its value's x, reserved values open exactly where they were, the padded afterglow, the announcement that clears itself), opening and focus, controlled opening a parent declines or accepts, unchanged saves, one write per save, `changed`, validation and error focus, Escape with an open Select, IME Enter, failure and retry, pending lock, both conflict paths, focus return, and a 320/960px layout in both schemes under reduced motion, forced colours and `contrast="more"`.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`EditRegion` as first used in its preview:

```tsx
import { EditRegion, EditRegionForm, EditRegionValue, EditRegionView, Field, Input, Select, Switch } from 'altitude-design';

<EditRegion layout="in-place" label={person.name} editLabel={`Edit ${person.name}`} value={erFields(person)} validate={validate}
  onValueChange={canonical => setPeople(people => people.map(p => p.id === person.id ? { ...server.current.get(person.id), ...canonical } : p))}
  onSave={save(person)}>
  <EditRegionView>
    <span className="er-name"><EditRegionValue field="name">{person.name}</EditRegionValue></span>
    <span className="er-meta"><EditRegionValue field="email">{person.email}</EditRegionValue> · <EditRegionValue field="role">{ER_ROLES.find(r => r.value === person.role).label}</EditRegionValue>{person.notify ? <> · <EditRegionValue field="notify">Gets updates</EditRegionValue></> : ''}</span>
  </EditRegionView>
  <EditRegionForm>
    {field => <>
      <div className="er-name-edit"><Field label="Name" required error={field.error('name')}><Input {...field('name')} autoComplete="off" /></Field></div>
      <div className="er-meta-edit">
        <Field label="Email" required error={field.error('email')}><Input {...field('email')} type="email" autoComplete="off" /></Field>
        <Field label="Role"><Select {...field.value('role')} items={ER_ROLES} /></Field>
        <Switch {...field.checked('notify')} label="Gets updates" />
      </div>
    </>}
  </EditRegionForm>
</EditRegion>
```

The full preview, as rendered in Storybook and checked in CI (`er-list`, `er-name`, `er-meta`, `er-name-edit`, `er-meta-edit`, `er-harness`, `er-harness-controls`, `er-log`, `er-sheet`, `er-sheet-head`, `er-sheet-grid`, `er-demo` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Button, EditRegion, EditRegionForm, EditRegionTrigger, EditRegionValue, EditRegionView, Field, Input, Select, Switch } from 'altitude-design';

const ER_ROLES = [{ value: 'owner', label: 'Owner' }, { value: 'editor', label: 'Editor' }, { value: 'viewer', label: 'Viewer' }];
const ER_PEOPLE = Object.freeze([
  Object.freeze({ id: 'p-mara', name: 'Mara Quist', email: 'mara@juniperphysio.example', role: 'owner', notify: true, revision: 1 }),
  Object.freeze({ id: 'p-ines', name: 'Inés Ortega', email: 'ines@juniperphysio.example', role: 'editor', notify: false, revision: 1 }),
  Object.freeze({ id: 'p-tobi', name: 'Tobi Adeyemi', email: 'tobi@juniperphysio.example', role: 'viewer', notify: true, revision: 1 }),
]);
const ER_FIXTURES = ['success', 'slow', 'fail-once', 'conflict-during-save'];
const erWait = ms => new Promise(resolve => setTimeout(resolve, ms));
const erFields = ({ revision, id, ...fields }) => fields;

// A fictional people service with revisions: a stale write is rejected, an accepted one returns the canonical record.
function EditRegionExample({ fixture }) {
  const server = React.useRef(new Map(ER_PEOPLE.map(p => [p.id, { ...p }])));
  const [people, setPeople] = React.useState(() => ER_PEOPLE.map(p => ({ ...p })));
  const [log, setLog] = React.useState([]);
  const failed = React.useRef(false);
  const trace = event => setLog(log => [...log, event]);
  const reconcile = id => setPeople(people => people.map(p => p.id === id ? { ...server.current.get(id) } : p));
  const externalUpdate = () => {
    const current = server.current.get('p-mara');
    server.current.set('p-mara', { ...current, email: 'm.quist@juniperphysio.example', revision: current.revision + 1 });
    trace({ event: 'external-update', id: 'p-mara', revision: current.revision + 1 }); reconcile('p-mara');
  };
  const save = person => async (draft, { changed }) => {
    trace({ event: 'requested', id: person.id, expectedRevision: person.revision, changed });
    await erWait(fixture === 'slow' ? 1400 : 250);
    if (fixture === 'fail-once' && !failed.current) { failed.current = true; trace({ event: 'rejected', id: person.id }); return { ok: false, error: 'We couldn’t reach the people service. Your changes are still here. Try again.' }; }
    if (fixture === 'conflict-during-save') { externalUpdate(); await erWait(300); }
    const current = server.current.get(person.id);
    if (current.revision !== person.revision) { trace({ event: 'rejected-stale', id: person.id }); return { ok: false, error: 'Someone else changed this person. Review the current details.' }; }
    if ([...server.current.values()].some(p => p.id !== person.id && p.email === draft.email.trim())) return { ok: false, error: 'Check the highlighted field.', fieldErrors: { email: 'Someone else already uses this email.' } };
    const next = { ...current, ...draft, name: draft.name.trim(), email: draft.email.trim(), revision: current.revision + 1 };
    server.current.set(person.id, next);
    trace({ event: 'committed', id: person.id, revision: next.revision, changed });
    return { ok: true, value: erFields(next) };
  };
  const validate = draft => {
    const errors = {};
    if (!draft.name.trim()) errors.name = 'Enter a name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) errors.email = 'Enter an email address, like name@example.com.';
    return Object.keys(errors).length ? errors : undefined;
  };
  return <>
    <section aria-labelledby="er-title">
      <h2 id="er-title">People with access</h2>
      <ul className="er-list">
        {people.map(person => <li key={person.id}>
          <EditRegion layout="in-place" label={person.name} editLabel={`Edit ${person.name}`} value={erFields(person)} validate={validate}
            onValueChange={canonical => setPeople(people => people.map(p => p.id === person.id ? { ...server.current.get(person.id), ...canonical } : p))}
            onSave={save(person)}>
            <EditRegionView>
              <span className="er-name"><EditRegionValue field="name">{person.name}</EditRegionValue></span>
              <span className="er-meta"><EditRegionValue field="email">{person.email}</EditRegionValue> · <EditRegionValue field="role">{ER_ROLES.find(r => r.value === person.role).label}</EditRegionValue>{person.notify ? <> · <EditRegionValue field="notify">Gets updates</EditRegionValue></> : ''}</span>
            </EditRegionView>
            <EditRegionForm>
              {field => <>
                <div className="er-name-edit"><Field label="Name" required error={field.error('name')}><Input {...field('name')} autoComplete="off" /></Field></div>
                <div className="er-meta-edit">
                  <Field label="Email" required error={field.error('email')}><Input {...field('email')} type="email" autoComplete="off" /></Field>
                  <Field label="Role"><Select {...field.value('role')} items={ER_ROLES} /></Field>
                  <Switch {...field.checked('notify')} label="Gets updates" />
                </div>
              </>}
            </EditRegionForm>
          </EditRegion>
        </li>)}
      </ul>
    </section>
    <TripSheet />
    <details className="er-harness">
      <summary>Fixture controls</summary>
      <p>Documentation harness only: change Mara's record on the “server” while it's being edited.</p>
      <div className="er-harness-controls"><Button onClick={externalUpdate}>Apply external update to Mara</Button></div>
      <output className="er-log" data-er-log="" aria-label="Fixture operation log">{JSON.stringify(log, null, 2)}</output>
    </details>
  </>;
}

// Labelled rows whose values already have their controls' height (EditRegionValue reserve): Edit all moves nothing.
const ER_SEATS = [{ value: 'aisle', label: 'Aisle' }, { value: 'window', label: 'Window' }, { value: 'any', label: 'No preference' }];
function TripSheet() {
  const [trip, setTrip] = React.useState({ traveller: 'Mara Quist', email: 'mara@juniperphysio.example', phone: '', seat: 'aisle' });
  const validate = draft => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()) ? undefined : { email: 'Enter an email address, like name@example.com.' };
  const rows = [['traveller', 'Traveller'], ['email', 'Email'], ['phone', 'Phone'], ['seat', 'Seat']];
  return <section className="er-sheet" aria-labelledby="er-sheet-title">
    <EditRegion layout="in-place" label="Trip details" editLabel="Edit all trip details" value={trip} validate={validate} onValueChange={setTrip}
      onSave={async draft => { await erWait(250); return { ok: true, value: { ...draft, traveller: draft.traveller.trim(), email: draft.email.trim(), phone: draft.phone.trim() } }; }}>
      <EditRegionView trigger={false}>
        <div className="er-sheet-head"><h2 id="er-sheet-title">Trip details</h2><EditRegionTrigger>Edit all</EditRegionTrigger></div>
        <dl className="er-sheet-grid">{rows.map(([key, label]) => <React.Fragment key={key}><dt>{label}</dt><dd>
          <EditRegionValue field={key} reserve>{key === 'seat' ? ER_SEATS.find(s => s.value === trip.seat).label : trip[key] || <span className="er-meta">Not set</span>}</EditRegionValue>
        </dd></React.Fragment>)}</dl>
      </EditRegionView>
      <EditRegionForm>
        {field => <>
          <div className="er-sheet-head"><h2>Trip details</h2></div>
          <dl className="er-sheet-grid">
            <dt>Traveller</dt><dd><Field label="Traveller" required error={field.error('traveller')}><Input {...field('traveller')} autoComplete="off" /></Field></dd>
            <dt>Email</dt><dd><Field label="Email" required error={field.error('email')}><Input {...field('email')} type="email" autoComplete="off" /></Field></dd>
            <dt>Phone</dt><dd><Field label="Phone"><Input {...field('phone')} type="tel" placeholder="Add a phone number" autoComplete="off" /></Field></dd>
            <dt>Seat</dt><dd><Field label="Seat"><Select {...field.value('seat')} items={ER_SEATS} /></Field></dd>
          </dl>
        </>}
      </EditRegionForm>
    </EditRegion>
  </section>;
}

export default function App() {
  const [fixture, setFixture] = React.useState('success');
  const [mounted, setMounted] = React.useState({ fixture: 'success', epoch: 0 });
  return <div className="er-demo">
    <EditRegionExample key={mounted.epoch} fixture={mounted.fixture} />
    <details className="er-harness">
      <summary>Choose the next fixture</summary>
      <div className="er-harness-controls">
        <label>Save fixture<select value={fixture} onChange={event => setFixture(event.target.value)}>{ER_FIXTURES.map(name => <option key={name}>{name}</option>)}</select></label>
        <Button onClick={() => setMounted({ fixture, epoch: mounted.epoch + 1 })}>Reset example</Button>
      </div>
    </details>
  </div>;
}
```
<!-- /example -->
