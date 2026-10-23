# ALT-02 — InlineEdit

**Priority:** P1. **Status:** proposed new component; implementation is not included. **Baseline:** `richlaconte/altitude`, commit `a7bd408f97c874c517b9139aa8a35b88b685cff0`, package `0.2.1`. References and paths below are repository-relative. This specification follows `AGENTS.md`, the root README’s single-source rule, `project/README.md`, `project/Elevation.md`, and the inspected implementation.

## Problem and boundary

Renaming one item should happen where its name already appears. Today, consumers compose the appearance from Input and Button but must repeatedly implement temporary text, Save/Cancel, asynchronous validation, duplicate-submit protection, focus return, and protection against overwriting an external update. Errors in that wiring are consequential: trimming on every keystroke prevents natural typing, blur can accidentally save, and a late response can replace a newer name.

InlineEdit supplies that bounded interaction for **one single-line string**. The application continues to own its committed value, validation rules, persistence, authorization and server concurrency. V1 excludes autosave, multiline/rich text, generic forms, Undo/history, optimistic committed values, action-policy inference, portals and a new elevation system. It creates neither a modal nor a workspace-wide draft mode. Existing Field/Input/Button and Surface signals remain the visual vocabulary.

## Proposed public API

Every symbol in this block is **new**, not available at the audited revision.

```ts
export type InlineEditSaveResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export interface InlineEditProps {
  value: string;
  onValueChange: (canonicalValue: string) => void;
  onSave: (
    draft: string,
    context: { previousValue: string }
  ) => InlineEditSaveResult | Promise<InlineEditSaveResult>;
  label: string;
  validate?: (draft: string) =>
    string | undefined | Promise<string | undefined>;
  required?: boolean;                 // default false
  maxLength?: number;                 // HTML string-length semantics
  disabled?: boolean;                 // default false
  editLabel?: string;                 // default `Edit ${label}`
  saveLabel?: string;                 // default "Save changes"
  cancelLabel?: string;               // default "Cancel"
  focusFallback?: () => HTMLElement | null;
  className?: string;
}

export declare function InlineEdit(props: InlineEditProps): React.ReactElement;
```

Read mode displays `value` as text, or “Not set” for an empty value, beside a visible ghost Edit button. The component owns only its editing session. It never caches a second committed value. `onSave` performs the sole write and returns the server’s canonical string. On accepted success, InlineEdit calls `onValueChange` exactly once and exits editing. The consumer publishes that string using an ordinary synchronous state setter; React may batch the render. This callback must not perform another network write, veto the result, or defer publication. There is no “awaiting controlled value” state.

Updating `value` optimistically inside `onSave` is incompatible with this contract: observed external changes are conflicts. The application must enforce server revisions or another concurrency guard; comparing strings in this component is not a server lock.

All required props appear in this minimal usage:

```tsx
const [name, setName] = React.useState('Brand guidelines.pdf');
<InlineEdit
  label="File name"
  value={name}
  onValueChange={setName}
  onSave={async (draft, { previousValue }) => {
    const result = await renameFileOnServer(draft, previousValue);
    return result.ok
      ? { ok: true, value: result.canonicalName }
      : { ok: false, error: result.userMessage };
  }}
  required
  maxLength={100}
/>
```

The example’s server function is application code, not an Altitude API. Production adapters should capture a real record version rather than rely on `previousValue` alone.

## States, events and async rules

The internal states are read, editing, validating, saving, error and conflict. Opening captures the current value and a session generation, copies text without trimming, and focuses/selects the input. Typing changes only the draft. A visible label, Save and Cancel remain within the original region; controls wrap below the field on narrow screens.

Save or non-composing Enter checks required/maxLength, then optional `validate`, then invokes `onSave`. Validation runs on submission only in v1. A returned validation string stops before persistence and becomes Field’s error. No-change Save, compared exactly with the captured string, closes without validation, persistence, publication or afterglow. Empty values remain legal unless required or rejected by the application. Canonicalization belongs to `onSave`, never to keystroke handling.

Validating makes the input read-only and Save unavailable; Cancel and Escape abandon the session. Ignore a late validation result using its generation. Validation is not a write and must not use `status="pending"`.

Saving captures one immutable draft. Set a synchronous in-flight guard before calling `onSave`, including synchronous callbacks: double-clicks, repeated Enter and re-entrant events cannot dispatch twice. The input stays read-only; Save shows loading; Cancel is disabled. Escape is consumed and announces “Saving changes. Wait for the result.” It does not close, abort or promise cancellation. Outside clicks and Tab never save or cancel; the surrounding page remains usable.

Failure preserves the draft and returns to an editable error state. Display the supplied user-facing error through Field; subsequent typing clears ordinary errors. A thrown/rejected callback or malformed result uses “We couldn’t save this change. Try again.” Do not expose exception details. The adapter contract is critical: a transport timeout is not a known failed write. Before returning a retryable failure or throwing, the adapter must reconcile an uncertain outcome or idempotently retry the same logical operation ID. It returns canonical success if the write committed, and a retryable failure only if the write is known not to have committed. The component cannot infer this from an exception. A new user Retry starts a new operation only after that known failure, with the same captured baseline. Successful publication displays the controlled canonical value and triggers one local afterglow; it does not show a success dialog or automatically create a toast.

If `value` changes while editing, validating or showing an error, retain the draft and enter conflict. Invalidate pending validation. Show “The saved value changed. Review the current value before saving.” and the latest value, with “Use current value” and Cancel. Save is unavailable. “Use current value” explicitly replaces the draft and baseline, clears the conflict and focuses the input. Cancel returns to the latest controlled value.

If an external change occurs during saving, latch the conflict, retain the draft, and allow the request to settle. Never publish its result through `onValueChange`, even if it reports success; it would overwrite the externally supplied record. After settlement show “The value changed while saving. Your save may have completed. Check the current record.” with the same recovery controls. The application must reconcile its actual server record; InlineEdit claims neither rollback nor authoritative freshness. Changes that return to the earlier string still count if observed by the component.

Unmount invalidates validation/save generations and suppresses subsequent publication, state changes, announcements and focus work. It cannot cancel a write already dispatched. Application adapters remain responsible for reconciling successful writes after navigation. Becoming disabled prevents new edits/submissions; an existing session can still be canceled, and an in-flight write still settles.

## Keyboard, focus and semantics

Render a labeled local group, not a dialog, gridcell or nested form. Use the existing Field to wire its single Input’s label, description and invalid state. All buttons have `type="button"`. Enter from the input prevents parent-form submission, except while `isComposing` or legacy keyCode 229 indicates IME composition. Composition Escape must also remain available to the IME; it must not cancel the editor. Normal Tab order is Input → Save → Cancel; no trap and no document-wide Escape listener.

Escape before dispatch and explicit Cancel discard only local text. After Save/Cancel, restore focus to the Edit button **only if focus was still inside the editor when completion occurred**. If the user moved elsewhere during asynchronous work, do not steal focus. If the trigger is unavailable but the component remains mounted, try `focusFallback()` only when it returns a connected, enabled, focusable element. Otherwise leave focus alone. A parent that removes the entire row owns its next-row/heading focus; no unmount cleanup may reclaim it.

Use a polite status for “Checking value”, “Saving changes”, and “Changes saved”. Existing Field errors already have `role="alert"`; do not announce the same error twice. The saving region is `aria-busy`, while its status remains outside that busy subtree. Editing, errors and conflicts must remain understandable with motion and shadows removed.

## Elevation and motion

These are **existing tokens and behaviors**, not new levels. Text, layout and border cues accompany height.

| Part/state | Tier / level | Surface and shadow | Equivalent non-height signal |
|---|---|---|---|
| Read value | ground / 0 | `surface-ground`, `elev-0` | committed text |
| Edit trigger; Cancel | ground / 0, existing hover 1 | ghost Button tokens | named button, focus ring |
| Editor container | raised / 1, static | `surface-raised`, `elev-1` | field label, Save/Cancel |
| Empty/filled input | existing Input opening/floor | `surface-well` and existing inset wall; filled floor `surface-raised` | label, caret, value |
| Invalid field | sunk / −2 | existing Input invalid treatment, `critical-soft`, critical rim | error icon/text, `aria-invalid` |
| Save | raised / 2; pressed while loading | primary Button `accent`, `elev-2` | Save/Saving label, busy state |
| Dispatched write | existing pending 2–3 after grace | editor Surface `status="pending"` | “Saving changes”, dotted forced-color border |
| Write failure | sunk / −2 | Surface `status="failed"`, `critical-soft`, `trench` | retained input and error |
| Accepted success | return to 0 | Surface `settle` afterglow | canonical text, saved announcement |

Do not mark the editor interactive or lift it on hover. Reuse `dur-grace`, `dur-settle`, existing travel durations and reduced-motion behavior. No resize animation, continuous parallax or elevation difference assigned to validating versus editing.

## Source changes and generated outputs

Create `project/components/src/inline-edit.tsx`; export component and types from `project/components/src/index.tsx`. Update the maintained `project/components/index.d.ts`, including `Window.Altitude`. Add only necessary `.alt-inline-edit*` layout styles to `project/components/bundle.css`; change no tokens. Create `project/components/InlineEdit/README.md` documenting ownership, async limitations and usage. Add `InlineEdit` to `build/build.mjs`’s explicit `names` array.

Author D1 under `=== InlineEdit` in `build/previews.txt`; D4 is the integration catalog’s file-workspace preview using the same component. Never hand-edit generated `project/components/InlineEdit/preview.html`, `project/components/bundle.js`, package `dist/` or `.storybook/generated/`. `node build.mjs` and `node previews.mjs` regenerate committed project artifacts; package/Storybook scripts already consume the source index and preview catalog.

Create `build/checks/inline-edit.mjs`, following existing Playwright checks and `CHROME` override. It opens generated `build/test/p-InlineEdit-daylight.html`, fails nonzero on assertions/browser errors, and uses controllable promises in demo fixtures for races. Register `node checks/inline-edit.mjs` after existing checks in `.github/workflows/ci.yml`’s render/check step; update the interaction-check list in `build/SETUP.md`. Existing React 18 build-kit and React 19 root type checks must pass.

## Demonstrations and acceptance

**D1:** real editable filename, canonical trimming on successful Save, duplicate-name validation, delayed validation, delayed save, retryable server failure, external-update control, and removal during pending work. Keep test controls separate from the normal editing surface. **D4:** file-table rename beside existing Archive/Undo and explicit deletion confirmation; other rows and their actions remain usable. Neither demo adds a rehearsal dashboard or asks users to understand transaction terminology.

- [ ] **IE-01:** D1 shows a labeled Edit affordance; start, Save, Cancel, no-change and outside interaction follow this contract.
- [ ] **IE-02:** spaces/empty drafts remain editable; validation preserves text and never dispatches an invalid write.
- [ ] **IE-03:** async validation cancellation and repeated submission invoke persistence at most once per operation.
- [ ] **IE-04:** canonical success publishes once; no optimistic cache or second write exists; rejection remains editable. The interrupted-after-save fixture reconciles a committed rename without duplicate mutation; adapters do not expose an uncertain write as a retryable failure.
- [ ] **IE-05:** external updates before/during save never overwrite newer controlled values; conflict recovery is inline.
- [ ] **IE-06:** unmount and stale completions produce no callbacks, announcements or focus changes.
- [ ] **IE-07:** Enter/Escape respect IME, parent forms and pending semantics; keyboard focus return and no-stealing cases pass.
- [ ] **IE-08:** D1/D4 render in all four schemes, 320px and 960px widths, reduced motion, forced colors and increased contrast without clipped actions or lost state meaning.
- [ ] **IE-09:** run the new browser check, both type checks, package and Storybook builds; regenerate project artifacts and obtain a clean generated-file diff before review.

Run from `build/`: `npx tsc -p tsconfig.json`, `node build.mjs`, `node previews.mjs`, `DPR=2 node shoot.mjs InlineEdit daylight,nightfall,mesa,alpine 960`, then `node checks/inline-edit.mjs`. Repeat targeted captures at 320px and with `FORCED=1`; the check must emulate reduced motion and increased contrast. From root run `npm run typecheck`, `npm run build` and `npm run build-storybook`. Record actual results; this specification does not claim these implementation checks have run.
