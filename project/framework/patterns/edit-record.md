# Edit record

Help someone change a durable record without losing work. Use this for settings, profiles and ordinary record forms. Prefer `InlineEdit` for a contextual single value and a route for extended work, history or deep links; a dialog is only for a bounded interruption. Do not use this hook as a backend, authorization layer or autosave engine.

## Inputs and ownership

Supply an initial value, synchronous business validation, an explicit `validationMode` (`submit` or `blur`), and a `save` adapter that returns a successful canonical value only when the promised persistence succeeds. Supply localized field labels, error messages and status text. The default equality is shallow; provide `isEqual` for nested records. The app owns service concurrency (revision/ETag or idempotency), authorization and navigation. Use server validation as authoritative where required.

## States and transitions

The runtime phases are `editing`, `invalid`, `submitting`, `saved` and `failed`; `dirty` distinguishes pristine from edited input. Pristine becomes editing when input changes. Invalid submission reveals inline errors and a summary from the same error model. Valid submit becomes pending immediately and rejects duplicate activation. Rejected persistence becomes failure while preserving input; retry revalidates and saves again. Success updates the baseline only after the adapter confirms it. A response for an older draft must never replace newer input. Only explicit reset/discard restores the baseline. Unmounting does not undo a dispatched request.

## Content, keyboard, focus and announcements

Use a named native form, persistent visible labels and outcome-specific buttons such as “Save settings”. Errors say what happened and how to fix it; transport errors belong to the operation, not an arbitrary field. `ErrorSummary` links to actual control IDs and takes focus on invalid submit via `focusKey={form.submitCount}`. Keep hint and error references valid and preserve external descriptions. `WorkflowStatus` announces operation feedback without unnecessary focus movement. Do not announce success on click or clear errors on unrelated events. Enter submits a form; Tab follows meaningful DOM order; focus remains visible.

Choose submit validation by default; blur validation is an explicit product choice. Avoid scolding during incomplete typing. Keep related labels, errors and controls together when narrow; allow long translations to wrap, use logical spacing, and preserve every action with RTL, zoom and forced colors. Pending is text/semantics as well as height.

## Recovery and unsaved work

Wire `requestLeave(reason, confirmDiscard)` to cancel, router Back and every internal navigation path. Clean forms need no prompt; pending forms cannot claim cancellation. The supplied confirmation must obtain a real decision; refusing leaves the draft intact, accepting discards deliberately. Integrate `beforeunload` separately when appropriate: browsers limit its custom text and may not fire it in all lifecycle cases. Persist resumable drafts in the application when loss across reload/session termination is unacceptable. Restore focus logically after leaving, especially when the originating control is removed.

## Working implementation

The package exports `useEditRecord`, `ErrorSummary` and `WorkflowStatus`. This minimal composition is supplemented by the executable fixture linked in metadata:

```tsx
const form = useEditRecord({
  initialValue: { name: 'Northwind' }, validationMode: 'submit',
  validate: value => value.name.trim() ? {} : { name: 'Enter a workspace name.' },
  save: async value => ({ ok: true, value: await api.saveSettings(value) }),
});
return <form onSubmit={event => { event.preventDefault(); void form.submit(); }}>
  <ErrorSummary focusKey={form.submitCount} errors={form.errors.name
    ? [{ id: 'name', label: 'Workspace name', message: form.errors.name }] : []} />
  <Field label="Workspace name" error={form.errors.name}>
    <Input id="name" value={form.draft.name}
      onChange={event => form.setField('name', event.target.value)} />
  </Field>
  <Button type="submit" disabled={form.phase === 'submitting'}>Save settings</Button>
  <WorkflowStatus>{form.status}</WorkflowStatus>
</form>;
```

The `api` is application supplied and must reject failure or return the documented `{ok:false,error,errors?}` result through the save adapter; this example does not manufacture a service. Use the full fixture for cancellation, failure and newer-edit cases.

## Rules, verification and evidence

Read [metadata](edit-record.json) for stable identity, applicability, exceptions, maturity, source IDs, implementation and executable test references. `ALT-EDIT-001` covers retained input and truthful persistence; `ALT-EDIT-002` covers error relationships; `ALT-EDIT-003` requires contextual validation/navigation choices; `ALT-STATUS-001` and `ALT-VISUAL-001` cover equivalent feedback. Run the linked browser fixtures with delayed, rejected, retried and stale saves, asserting saved data as well as text. Verify summary links and keyboard correction manually with supported assistive technology. Normative WCAG requirements are scoped; the error-summary composition and validation timing are contextual guidance. Engineering fixtures do not establish improved human task performance.

See [running examples and verification](../principles.md#run-the-examples-and-verification) for the installed example command, repository test command, and the limits of shipped test-reference snapshots.
