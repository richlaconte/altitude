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
- **Editing** lifts the region into a static raised card (level 1, `surface-raised`, `elev-1`, a `line-control` border), as an `Accordion` lid lifts over its compartment. It doesn't lift on hover: it's being worked in, not offered. The fields inside are openings: empty wells, filled flush, invalid trenches, as `Input`, `Select` and `Field` draw them.
- **Saving** uses `Surface status="pending"`: after `dur-grace` it hovers at level 2, so a fast save shows nothing. **A known failure** drops to the failed trench with a critical `Alert` inside the editor; the draft stays. **Accepted** values settle back to the ground with one afterglow for the region, however many fields changed.
- **An outside change** while editing keeps the draft, blocks Save and shows a caution `Alert` “This record changed” with “Use current values”.

The words carry every state without height: the form's name, the button labels, `aria-invalid` and error text on fields, `aria-busy` on the form while saving, and the polite status region (“Checking”, “Saving changes”, “Saved” or the error). Under forced colours the editor is a raised Surface with a border; under `contrast="more"` it gets level 1's ink slab.

## Props

| Prop | |
|---|---|
| `label` | names the region: the form is “Edit <label>” |
| `value`, `onValueChange` | the committed record, and a synchronous setter for the accepted canonical record (no network write) |
| `onSave(draft, { previousValue, changed })` | the sole write. Return `{ ok: true, value }` with the canonical record, or `{ ok: false, error, fieldErrors? }` for a known failure. A throw or malformed result shows a generic retry message |
| `validate(draft)` | on Save: an error per field, or `undefined`; sync or a promise |
| `open`, `defaultOpen`, `onOpenChange` | control the session. Closing a controlled region doesn't cancel a dispatched save |
| `disabled`, `initialFocus`, `focusFallback`, `isEqual` | as `InlineEdit`; `initialFocus` names a field key; `isEqual` compares one field's values (default `Object.is`) |
| `editLabel`, `saveLabel`, `cancelLabel` | default “Edit <label>”, “Save changes”, “Cancel” |
| `settleDuration` | how long the afterglow takes to fade after a save, in ms. Default 5000 (shorter than `dur-settle`, because the person is watching the change) |

Parts: `EditRegionView` (read mode; `trigger={false}` to place `EditRegionTrigger` yourself), `EditRegionForm` (edit mode; children may be a function of the draft binder; `actions={false}` to place `EditRegionActions` yourself), `EditRegionTrigger`, `EditRegionActions`.

The binder: `field(key)` for text controls (`value` + `onChange`, `readOnly` while locked), `field.value(key)` for `Select`, `Combobox` and `Slider` (`value` + `onValueChange`), `field.checked(key)` for `Switch` and `Checkbox`, `field.error(key)` for the field's `Field`, and `field.draft`. Each binding carries `data-field`, which `initialFocus` and error focus use.

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

The `EditRegion` section of `build/previews.txt` lists three people with access; each row is an EditRegion over a fictional people service with revisions. A collapsed harness picks a save fixture (`success`, `slow`, `fail-once`, `conflict-during-save`) and applies an outside update. `node checks/edit-region.mjs` (from `build/`, after rendering previews; `ALT_FIXTURE_ROOT` selects React 19 fixtures) covers opening and focus, unchanged saves, one write per save, `changed`, validation and error focus, Escape with an open Select, IME Enter, failure and retry, pending lock, both conflict paths, focus return, and a 320/960px layout in four schemes under reduced motion, forced colours and `contrast="more"`.
