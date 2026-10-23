# ALT-04 Confirmation recipe

**Status:** Ready for implementation planning; a named recipe, not a new exported component.  
**Priority:** P1. **Depends on:** ALT-01 modal foundation; existing `Dialog`, `Button`, and `Field`/`Alert` where applicable.  
**Outcome:** A necessary confirmation explains one concrete consequence, preserves the person’s orientation, and performs exactly the requested action.

## Decision rule

Use InlineEdit for a small editable value, direct action with real recovery for a reversible mutation, and a focused confirmation when the consequence cannot be reliably undone or warrants an explicit decision. The application chooses the policy from its actual domain behavior. Altitude must not infer it from a button variant, action label, or target type.

The primary example is permanent deletion of an archived file. Restricting deletion to Archived is this example’s application policy, not a universal requirement imposed on all products. No hold-to-confirm gesture, typed-name challenge, nested dialog, extra review stage, or universal confirmation provider is required.

## Composition contract

Compose existing `Dialog` with `size="sm"` and ALT-01’s proposed `background="stationary"`. Pass the target name in the accessible title or description and visible dialog content. Supply Cancel and a danger button that names the outcome. Use `focusSelector="[data-cancel]"` and the proposed `returnFocus` fallback for the case where deletion removes the invoker.

Example intended consumer code, using the APIs after ALT-01:

```tsx
<Dialog
  open={confirmationOpen}
  onOpenChange={setConfirmationOpen}
  size="sm"
  background="stationary"
  title="Delete this file permanently?"
  description={`“${target?.name ?? ''}” will be removed. You won’t be able to restore it.`}
  focusSelector="[data-cancel]"
  returnFocus={() => listHeading.current}
  footer={/* Cancel, then Delete permanently; application owns mutation state */}
>
  {/* Target identity, including a disambiguator if filenames can repeat. */}
</Dialog>
```

Keep the captured target snapshot separate from confirmationOpen, retaining it through the exit presentation and replacing it only when starting a new confirmation session. This fragment illustrates composition rather than a complete asynchronous handler. The implemented recipe must supply the lifecycle below. `background` and `returnFocus` are proposed additions, not APIs in the audited 0.2.1 baseline.

## Target and action lifecycle

1. Capture the stable target ID, display name, parent/location where needed, revision and invoking element at activation. Render that target in the dialog. Assign a presentation session ID and a distinct operation ID to each dispatch. Do not derive the target from a mutable array position.
2. Opening the dialog never performs the operation. Before dispatch, Cancel, Escape and the close affordance perform no mutation and preserve the current selection/scroll position.
3. On explicit confirmation, revalidate the target and submit exactly one idempotent request with its expected revision. The application rejects a changed/deleted target rather than deleting another record or silently accepting stale intent.
4. While the request is pending, the confirm button shows “Deleting…” and ignores repeated activation. Keep the target identity and consequence visible. No page-wide progress screen is needed.
5. A close request during the write closes the presentation but **does not cancel the dispatched write**. During this phase, relabel Cancel to “Close”; announce “Deletion is in progress. Closing this dialog won’t cancel it.” The application owns the request outside the dialog’s mounted content and reports its eventual outcome in the originating context. Escape and the close icon have the same semantics. Do not add a second dialog to explain this.
6. On confirmed success, remove only the target and show one completion announcement. Close a still-open dialog only if its presentation session matches the operation’s captured session. Restore focus to a logical surviving target/list heading if focus still belongs to that closing dialog or to the row/invoker being removed. This includes Close during a pending write followed by success while focus remains on the restored Delete trigger. Never pull focus from another row/control or a newer dialog.
7. On a known failure while the matching presentation session is still open, retain the exact target, show the error inside it, re-enable an appropriately named retry action, and keep the person’s place. When already closed or displaying a different session, show the error in the originating context with a route to retry. Confirm A → Close → open B → A settles must neither close B nor put A’s error inside B. A transport interruption with unknown outcome must be reconciled before retrying or reporting that deletion failed.
8. If the target changed, stop the stale confirmation: show the current identity/state and require a fresh explicit confirmation. Do not update the target under an unchanged destructive button without explaining the change.

The pending-close behavior is part of the application recipe, not a hidden global behavior in Dialog. It prevents an uncancellable network request from masquerading as a cancelled action. Applications that truly support server cancellation must define that separate contract explicitly.

## Content requirements

Use concrete language: “Delete this file permanently?” and “Delete permanently.” Include the exact filename in accessible text; a filename rendered only in the dimmed background is insufficient. When two records can share the same name, include the parent folder, account or another meaningful discriminator. Do not rely on a decorative thumbnail or file extension alone.

The visible consequence must match the backend: if an operation actually has Trash recovery, describe that and use the act-and-recover recipe where appropriate. “Permanent” must not be decorative emphasis.

Keep the default example to a title, one concise consequence, target identity, and two actions. Technical fixture controls belong in a collapsed demo section, outside the dialog. The body may grow for genuine domain requirements; size must not truncate the consequence or controls at 320 CSS pixels or 200% zoom.

## Altitude presentation

| Part/state | Tier and level | Existing tokens/behavior | Non-height cue |
|---|---|---|---|
| Dialog | Floating, 5 | `surface-modal` + `elev-5`, existing entry/exit tokens | Accessible dialog name and modality |
| Background | Existing record | Scrim remains; no scale/desaturation/blur in stationary mode | Inert interaction outside the dialog |
| Body identity | Flat within dialog | Inherit dialog surface; no nested floating card | Filename and discriminator |
| Confirm button | Raised, 2 | Existing danger Button, `critical`/`on-critical` | Explicit outcome label |
| Cancel/Close | Existing secondary/ghost treatment | Existing Button styles | Named safe dismissal |
| Pending write | Existing Button loading + local status | Existing grace/motion treatment; no fake progress | “Deleting…” and progress text |
| Failure | Local current-context error | Existing critical Alert or Field error where an input is involved | Specific explanation and recovery action |

Retain Altitude’s one-summit rule. The recipe must not open a confirmation on top of CommandPalette: close the palette and transfer modal ownership through ALT-01’s explicit handoff before admitting the confirmation in the originating page context. The outgoing palette may retire its exit presentation early for that handoff. Prefer direct navigation to the target context when the palette lacks sufficient identity to explain the action. No arbitrary timer may substitute for lifecycle completion.

## Files and artifacts

- Modify `project/ActionsInPlace.md`: decision rule, full copyable confirmation example, async lifecycle and applicability boundaries.
- Modify `project/components/Dialog/README.md`: link to the recipe and explain when stationary presentation is appropriate; retain defaults documented in ALT-01.
- Modify `build/previews.txt`: D2 in the existing `Dialog` section; D4 confirmation in the shared `ActionsInPlace` Patterns section. These are compositions of the same public Dialog API.
- Extend `build/checks/modal-lifecycle.mjs` for lifecycle behavior and `build/checks/actions-in-place.mjs` for target-safe deletion and failure/retry. ALT-01/03 own creating and registering these checks.
- Generate the Dialog and ActionsInPlace previews; generate Storybook through the existing pipeline.

No `ConfirmAction` export, runtime action registry, new modal primitive, package dependency or new token is introduced. Revisit a convenience wrapper only after multiple applications repeat the same composition without conflicting requirements.

## Acceptance criteria

- [ ] **CON-01** The dialog announces the exact target and consequence when opened, with Cancel initially focused.
- [ ] **CON-02** Opening, Cancel and Escape before dispatch cause zero mutations.
- [ ] **CON-03** Repeated activation produces one mutation for the captured ID/revision, never a neighboring record.
- [ ] **CON-04** The background is inert and focus is contained through exit; stationary presentation preserves page position without changing modal semantics.
- [ ] **CON-05** Pending feedback cannot be mistaken for a cancelled request; Close/Escape during a write and eventual background results follow the stated lifecycle.
- [ ] **CON-06** Known failure remains recoverable in context; unknown outcomes are reconciled before a retry can duplicate the operation.
- [ ] **CON-07** A changed/deleted target cannot be acted upon under stale confirmation; identity changes are explicit and require fresh intent.
- [ ] **CON-08** Success removes only the target and uses a surviving focus destination without stealing focus after the person has moved elsewhere. Pending Close → unchanged focus → deletion repairs focus when its restored invoker disappears; A’s completion never closes or alters a later B confirmation session.
- [ ] **CON-09** D2 and D4 show no clipped content or controls at 320 CSS pixels/200% zoom and work in reduced motion, forced colors and all four schemes.
- [ ] **CON-10** Full recipe source, pending/failure examples, generated previews and CI checks are included; implementation does not export a new confirmation framework.

## Implementation sequence

- [ ] Write captured-target, cancellation, duplicate-submit and conflict assertions in the demo check.
- [ ] Compose the idle and successful confirmation with the shared Dialog APIs from ALT-01.
- [ ] Add pending close, failure, retry and uncertain-outcome fixture paths; prove the target cannot change accidentally.
- [ ] Complete keyboard/AT and removed-invoker focus checks with the combined scenario.
- [ ] Publish the runnable source and guidance through the existing preview/Storybook generation path.
