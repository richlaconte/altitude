# InlineEdit

Edit one single-line string where its committed value already appears. Read mode shows the saved text (or “Not set”) and a visible Edit button. Editing uses Field, Input and Save/Cancel in the same local region; it is a group, with normal page Tab order and no focus trap.

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

Typing changes local text without trimming. Cancel and Escape discard that text; blur, outside clicks and Tab do nothing to the session. Enter saves, except while IME composition is active (including legacy key code 229). Composition Escape also remains with the IME. Input Enter prevents a surrounding form from submitting.

Saving an exact unchanged value closes without validation, persistence, publication or afterglow. `required` defaults to false; when true it rejects the empty string using HTML required semantics. Spaces stay legal unless application validation rejects them. `maxLength` uses JavaScript/HTML UTF-16 string length and the native input limit. Optional `validate(draft)` runs only on Save and returns a user-facing error string or `undefined`, synchronously or as a promise. Use validation to reject whitespace-only or duplicate names when your application requires it.

While validation runs, the input is read-only and Save is unavailable; Cancel and Escape remain usable. Late validation results cannot affect a cancelled or replaced session. During persistence the input stays read-only, Save shows loading and Cancel is unavailable. Escape announces “Saving changes. Wait for the result.” It does not cancel a dispatched write. Duplicate and reentrant submissions dispatch at most once. A failed save preserves editable input and the original baseline for retry; typing clears ordinary errors.

## External updates and lifecycle

An observed `value` change during editing, validation or error retains the draft and blocks Save. The region shows the latest saved value and “Use current value”. That explicit action replaces the draft and baseline and refocuses the input; Cancel displays the latest record.

An update during a write latches a conflict even if a later observed update restores the earlier string. The request may finish, but its result is never published through `onValueChange`. The recovery message says the save may have completed and asks the person to check the current record. The application must reconcile its server state; the component cannot roll back a dispatched write or assert authoritative freshness.

Unmount invalidates pending work and suppresses subsequent publication, announcements, state and focus work. It does not abort persistence. Applications must still reconcile writes after navigation. Becoming `disabled` prevents new edits and Save while keeping an existing session cancellable and allowing a dispatched write to settle.

## Focus and accessible equivalents

Opening focuses and selects the input. Save or Cancel restores focus to Edit only when focus was still in the editor at completion. Completion never steals focus from another part of the page. If Edit is unavailable while the component remains mounted, `focusFallback` may return a connected, enabled, focusable element; otherwise it leaves focus where it is. When a parent removes a row, the parent owns next-row or heading focus.

The Field label and single alert wire the input's name, description and invalid state. A polite status announces checking, saving and accepted success outside the saving region's `aria-busy` subtree. The editor is a static raised Surface, persistence uses its existing pending signal, failed writes use its failed treatment, and accepted canonical text settles locally. Text, controls, error icons and borders preserve every state without motion or shadows. Actions wrap below the field at narrow widths.

Optional labels are `editLabel` (default `Edit ${label}`), `saveLabel` (“Save changes”) and `cancelLabel` (“Cancel”). `className` applies to the local group. There is no autosave, multiline mode, history, portal or form abstraction.

## Demo and verification

The canonical `InlineEdit` section in `build/previews.txt` renders a task title and an independent filename table cell with this component. A collapsed documentation harness selects deterministic fixtures before mounting, resets records and counters, delays validation, applies external updates, removes the filename consumer during work and opens a dialog comparison using the same validation and persistence adapter. Fixture controls and operation logs stay outside the product scene.

Run `node checks/inline-edit.mjs` from `build/` after generating preview fixtures. `ALT_FIXTURE_ROOT=test/react19` selects the React 19 source fixtures. The checks cover lifecycle races, retained input, uncertainty reconciliation, conflict latching, keyboard/IME, focus, disabled behavior and the four-scheme responsive/accessibility matrix. Automated checks do not replace the human screen-reader, touch, magnification or formative comparisons recorded in [Actions in place validation](../../ActionsInPlaceValidation.md).
