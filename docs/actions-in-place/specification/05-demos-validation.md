# ALT-05 — Demonstrations and validation

**Priority:** P1 · **Status:** Proposed specification; no implementation or validation completed.

Demonstrate Actions in place through renaming, archiving, restoring, and deleting an item, using future shared InlineEdit and ALT-01/03/04 contracts. Research explanations and scenario controls belong outside the product flow. Do not revive Rehearsal or add a receipt component.

## Source and delivery contract

The audited repository uses `build/previews.txt` for published previews and generated Storybook stories. `build/previews.mjs` creates `project/components/<Name>/preview.html`; `scripts/stories.mjs` reads these sections and matching READMEs. ALT-03 adds the ActionsInPlace mapping to `project/ActionsInPlace.md`. Generated stories remain uncommitted; generated `project/` previews are committed and checked against regeneration.

Deliver **three preview cards and four experiences**, without duplicating the integrated example:

| Source section | Storybook group | Experiences | Committed generated output |
|---|---|---|---|
| `InlineEdit` | `Inputs` | D1: task name and independent table cell | `project/components/InlineEdit/preview.html` |
| Existing `Dialog` | `Overlays` | D2: existing and stationary background comparison | `project/components/Dialog/preview.html` |
| `ActionsInPlace` | `Patterns` | D3: focused recovery; D4: complete Files flow | `project/components/ActionsInPlace/preview.html` |

For D3/D4, define one example and fixture adapter in `ActionsInPlace`. Its compact view demonstrates recovery; “Open complete Files example” loads the **same generated preview** with a `#files` view selection. Both views share behavior. Do not create a second application or HTML demo. Verify the full view fits its Storybook frame.

`ActionsInPlace` is documentation composition, **not a runtime export**: do not add it to `build/build.mjs`’s component `names` array or the package barrel. InlineEdit’s export/registration belongs to its component specification.

## Experiences to implement

### DEM-01 — Edit the actual value

- [ ] Add D1 to the `InlineEdit` section, using the actual future `A.InlineEdit` and existing Field, Input, Button, and Surface primitives.
- [ ] Show a task title, initially **Prepare launch checklist**, and a separate table-cell consumer, initially **Brand guidelines.pdf**. Each has independent state and validation; editing one must not alter the other.
- [ ] Provide a visible Edit/Rename action, input, Save, and Cancel. Enter saves; Escape cancels; composition Enter does not submit. Keep the value in its original location and preserve the previous committed value on cancellation.
- [ ] Demonstrate empty-input validation and retained text after a rejected save. Successful save returns to the reading state and gives restrained acknowledgement, without opening a dialog.

- [ ] Provide a harness-only dialog-rename baseline for the formative comparison. It uses the same target, validation, fixtures, and save adapter as InlineEdit, with only the interaction container changed. It is not a second product workflow or a separate application.

**Observable value:** both consumers reuse one component; cancellation produces no write; a failed save loses no typed text; users can locate the changed value without finding a second surface. Do not advertise fewer rename clicks.

### DEM-02 — Keep context stationary without changing modality

- [ ] Replace the Dialog preview’s automatically opened, generic scene with a user-triggered task: permanently delete **Brand guidelines.pdf** from Archived.
- [ ] Offer existing and stationary-background presentations in the documentation harness. Run them sequentially, never as simultaneous modal providers. Reset to identical records before each trial.
- [ ] Keep target, consequence, dimensions, buttons, initial Cancel focus, Tab containment, Escape, background inertness, and focus restoration identical. Only the approved background presentation changes: existing recede/scrim treatment versus stationary content without blur.
- [ ] Keep the exact filename inside the dialog. Before dispatch, Cancel/Escape perform no write. During dispatch, Cancel becomes Close: Close/Escape dismiss presentation without cancelling the application-owned write. Demonstrate eventual success/failure after closing; neither result steals focus. If still open, apply ALT-04's conditional focus restoration.

**Observable value:** reviewers can compare context retention during a meaningful decision. Verify the stationary stage’s computed transform/filter and element geometry remain unchanged; visual stillness must not weaken modal behavior. APG supports a least-destructive initial action for difficult-to-reverse operations and requires actual modal focus behavior. [W3C APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

### DEM-03 — Act and recover

- [ ] Archive **Brand guidelines.pdf** immediately in the local UI, with no confirmation. Announce “Archiving…” while pending; offer no Undo until server confirmation. Then show the persistent local Alert **“Brand guidelines.pdf is archived.”** with Undo.
- [ ] Use `variant="raised"` when the recovery action is present, following Alert’s existing actionable treatment. A status without an action uses the informational treatment. Do not add a floating receipt or duplicate toast for the same state.
- [ ] Keep Archived → Restore as the durable recovery route. Dismissing the local Alert must not delete the archived record or remove Restore.
- [ ] Demonstrate slow acknowledgement, rejected requests, version conflicts, and uncertain outcomes. Allow one in-flight mutation per record; unrelated records remain usable. Undo targets only the confirmed revision, without reverting unrelated edits or whole-list snapshots.

The Alert represents **ongoing recoverable state**, not generic “Saved” feedback. ALT-03 amends Alert and Toaster guidance narrowly; the current Alert action API is sufficient. Ordinary completion remains a toast or quiet settle. Apple advises avoiding alerts for common undoable actions; this supports skipping archive confirmation, not hiding recovery. [Apple Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts)

### DEM-04 — Complete one ordinary Files task

- [ ] Expand the same ActionsInPlace source into a small Files view with Active/Archived navigation, filenames, useful metadata, shared InlineEdit, Archive, Restore, and shared Dialog.
- [ ] Restrict Delete permanently to Archived. Demonstrate D2's pending-close lifecycle and background completion/error in this integrated flow. Never offer Undo after permanent deletion.
- [ ] Replace the earlier handrolled prototype’s editable controls and modal with these actual shared components. Do not reproduce their keyboard or focus behavior in the example.
- [ ] Keep fixture selection, timing, reset counters, API traces, and baseline toggles in a separate harness/docs area. The product scene contains no technical controls, demo-mode toolbar, or instructions explaining a framework.

## DEM-05 — Deterministic local fixtures

Use fictional, immutable IDs with versioned records: `file-brand` / **Brand guidelines.pdf**; `file-brand-draft` / **Brand guidelines draft.pdf**; `file-launch` / **Launch checklist.md**. Similar names expose wrong-target mistakes. No personal data, external requests, real files, or server writes. Reset restores the same records and request counters.

| Fixture | Behavior | Required observation |
|---|---|---|
| `success-100` | Acknowledge after 100 ms | One operation, correct final value and version; no prolonged loading state. |
| `success-1200` | Acknowledge after 1,200 ms | Immediate truthful local feedback; pending state is distinguishable; duplicate action cannot submit twice. |
| `fail-once` | First request rejects after 1,200 ms; explicit retry succeeds after 100 ms | Rename retains input. Rejected optimistic archive restores the known server record and states failure; no false success receipt. |
| `conflict` | Before completion, server fixture changes the target’s name/version | Reject stale writes; preserve attempted input, reconcile only the target, and require fresh destructive intent. Never resurrect a deleted target. |
| `interrupted-after-save` | “Connection interrupted after save”: commit at 100 ms, lose acknowledgement at 1,200 ms | Reconcile or retry with the same operation ID; no duplicate write, false rollback, or premature success/failure. |

Select fixtures before mount in a collapsed harness outside the product scene. Default to `success-100`; define records once. Inspect visible state and the accepted-operation log. Test archive, restore, and deletion against ALT-03/04's `{id, expectedRevision, operationId}` contract, including out-of-order responses from independent records.

## DEM-06 — Exact documentation and work artifacts

- [ ] Author only the relevant sections in `build/previews.txt`; regenerate the three `project/components/*/preview.html` files.
- [ ] Add InlineEdit's README; use the shared `project/ActionsInPlace.md` guide for D3/D4. Amend Dialog and ALT-03-owned Alert/Toaster guidance. Map the shared guide in `scripts/stories.mjs`; do not duplicate it in a component README.
- [ ] Link demos from root `README.md` and `project/ActionsInPlace.md`. Storybook titles are `Inputs/InlineEdit`, `Overlays/Dialog`, and `Patterns/ActionsInPlace`; verify generated routes before publishing URLs.
- [ ] Extend the owning specs' checks: `build/checks/inline-edit.mjs`, `build/checks/modal-lifecycle.mjs`, and `build/checks/actions-in-place.mjs`. Run them in CI after preview rendering; do not add a parallel Dialog check.
- [ ] Store review evidence under `build/test/alt-05/`: `results.json`, `report.md`, and `<demo>-<fixture>-<scheme>-<mode>.png`. Keep `.storybook/generated/` generated and uncommitted. Record browser/AT versions and known limitations in the report. ALT-06 adds an always-running CI artifact upload for this evidence and a retained project/ActionsInPlaceValidation.md summary linking artifacts/manual evidence; participant identifiers and raw personal notes stay out of the repository.

## DEM-07 — Automated and visual acceptance

- [ ] Run the documented build-kit type-check, bundle, and preview generation; run root React 19 type-check, package build, and Storybook build. Regeneration must leave committed `project/` artifacts unchanged.
- [ ] Render all three sections at 960 px in daylight, nightfall, mesa, and alpine. Run `FORCED=1` renders and reduced-motion interaction checks. No console/page errors, clipped names, misleading click affordances, or invisible focus/state indicators.
- [ ] At **320 CSS px**, complete each flow without horizontal page scrolling or covered actions. Separately test **200% browser zoom**, recording viewport and effective CSS width; do not substitute doubled screenshot DPR for zoom.
- [ ] Assert confirmed-only Undo, single submission, retained input, targeted reconciliation, uncertain outcomes, and stale destructive rejection. Assert one active modal, inert background, Cancel initial focus, Tab loop, pre-dispatch Escape, pending Close/Escape, and no asynchronous focus theft in both presentations and D4.

## DEM-08 — Human interaction checks

- [ ] Complete all critical routes with keyboard only and touch only; hover and double-click cannot be sole entry points. Inspect long filenames, IME entry, narrow layouts, and touch keyboard coverage.
- [ ] Manually check screen-reader names, input/error associations, announcement order, and focus using VoiceOver/Safari and a Windows screen reader/browser combination. Repeat critical states with magnification, reduced motion, and forced colors. Report unavailable combinations honestly; automated ARIA assertions do not substitute for these checks.

## DEM-09 — Formative evidence and release decisions

Conduct **six to eight formative sessions**, including varied input and access needs. Counterbalance baseline order and equivalent filename sets: dialog rename versus inline rename; existing versus stationary modal background. Keep task content and modal semantics constant. Ask participants to rename, cancel, archive/Undo, restore later, and confirm the exact target of permanent deletion. Record completion, wrong-target actions, remembered filename, accidental commits, cancellation/recovery, focus loss, and observed hesitation.

Counts are structural: rename **2 → 2** activations with **1 → 0** modals; archive **2 → 1** when the baseline asks confirmation; permanent delete **2 → 2**. Exclude typing and count Enter as one activation; identical overflow menus add one to both. Claim no measured speed benefit without evidence.

**Accept** when specified behavior is demonstrated, critical automated checks pass, and observed blockers are resolved. **Revise and repeat affected tasks** after lost input, wrong-target commitment, inaccessible recovery, broken focus, or repeated state confusion. **Keep a decision open** when findings conflict or necessary access testing is missing. Do not invent statistical pass percentages for this small sample. Carbon’s guidance to keep repeated tasks on the page motivates the comparison but does not predetermine its result. [Carbon Dialogs](https://www.carbondesignsystem.com/building-blocks/core/patterns/dialogs)

## DEM-10 — Explicit discovery gates

- [ ] Treat a future EditRegion, universal contextual dialog, or broader editing framework as **discovery-gated**, not implementation scope. Reconsider only when two real consumers reveal a shared need that InlineEdit and existing primitives cannot meet.
- [ ] Publish what the demonstrations establish and what remains untested. This specification requests usable evidence, not a comprehensive usability or accessibility certification.
