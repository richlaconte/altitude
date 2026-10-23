# ALT-03 Act and recover recipe

**Status:** Ready for implementation planning; no public component API is added by this spec.  
**Priority:** P1. **Depends on:** existing `Alert`, `Button`, `Toaster`, and application persistence. Coordinate with ALT-05 demos.  
**Outcome:** An ordinary reversible action completes directly, and recovery remains available without asking for confirmation first.

## Problem and scope

Archive, move, and remove-from-collection often open confirmation dialogs even when the application can reliably reverse the operation. This recipe documents an application-owned transaction composed with Altitude feedback. It must demonstrate a real inverse operation, including failure, rather than placing an Undo label on an optimistic animation.

The deliverable is a documented, executable recipe using existing APIs. There is no `UndoProvider`, command bus, global history, new receipt component, or inferred action-risk policy. It applies only when the application knows what can be restored and has implemented that recovery. It must not be used for sending messages, publishing externally, irreversible deletion, or any action whose effects cannot be reliably reversed.

## User behavior

1. The person activates Archive on a specific file. The file leaves the active list immediately and the location count changes. There is no confirmation.
2. During the request, the contextual status says “Archiving ‘Brand guidelines.pdf’…”; a disabled recovery control must not promise that the request can already be undone. Fast requests need no animated pending effect. A deliberately slow demo exposes this state.
3. Once the server confirms the archive, a persistent local region says “Brand guidelines.pdf is archived.” and offers Undo. It describes a current recoverable condition, not a generic success announcement.
4. Undo restores only that record’s archive state using its confirmed revision. It does not restore an entire collection snapshot or revert unrelated edits.
5. Archived remains a visible destination with Restore, including after the local feedback has been replaced or dismissed. Undo is a convenient immediate path; the destination is the durable recovery path.
6. If archiving fails, reconcile the affected record back into the active list and show an actionable error. If Undo fails, the record remains archived and the recovery region offers Retry when retry is safe, plus access to Archived.

In the combined demo, rename uses InlineEdit’s own commit feedback. It does not create another global Undo notification. A successful Archive or Restore replaces the previous recovery region; it does not stack additional regions. A dismissed/replaced region never removes the record from Archived. Key each Alert instance by the recovery operation ID so a new operation does not inherit the previous Alert’s local closing state. Its delayed onDismiss callback may clear the current region only if that ID is still current. Dismiss A → B succeeds during A’s exit must leave B visible and actionable.

## Ownership and integration contract

| Altitude supplies | The application supplies |
|---|---|
| `Alert` structure, tone, role, and action slot | Stable target IDs, current records and their revisions |
| `Button` loading and disabled behavior | The archive/restore request and idempotency strategy |
| Optional `toast({ action, duration })` for transient feedback | Whether reversal is available, expires, or conflicts |
| Existing depth and motion tokens | Optimistic updates, targeted reconciliation, persistence and recovery destination |

The example service must accept `{id, expectedRevision, operationId}` for a mutation and return the updated authoritative record or a typed error. `operationId` identifies a logical request for duplicate suppression; retries of an uncertain request use the same ID. Undo is a separate restore request with a new operation ID and the revision produced by the confirmed archive. Business APIs may differ, but the README must explain the equivalent guarantees an adopter must provide.

Do not infer reversibility from button color, a label such as “Archive,” or an arbitrary timeout. Do not announce success until the mutation has actually been confirmed. An optimistic visual change and a committed write are separate states.

## State and concurrency requirements

| State | Record presentation | Available recovery | Error behavior |
|---|---|---|---|
| Idle | Authoritative current record | Restore in Archived if applicable | None |
| Archiving | Optimistically absent from Files | No Undo until confirmation | Pending is announced without trapping focus |
| Archived | Confirmed archived record | Undo and Archived → Restore | Persistent until replaced/dismissed |
| Restoring | Record may return optimistically | Disable duplicate Restore/Undo for that record | State names the operation in progress |
| Restored | Confirmed active record | No stale archive Undo | Optional short completion feedback |
| Failed/conflicted | Reconciled authoritative state | Retry only if safe, or inspect current record | Specific text and a recovery route |

Allow only one in-flight mutation per record; unrelated records remain usable. Tag each request with a stable target ID, revision, and monotonically increasing local initiation sequence. An older response cannot overwrite a newer record revision or replace the recovery message for a more recently initiated successful action. Do not resurrect a record deleted or changed by another actor. On a version conflict, fetch/reconcile that record and explain the conflict; never apply an old whole-list snapshot.

For an uncertain network outcome, retry idempotently or reconcile before claiming failure/success. A transport timeout alone does not prove that the server rejected the archive. The default demo offers an explicit “Connection interrupted after save” fixture in addition to an ordinary rejected request, so this distinction is testable.

When Undo is no longer valid, remove/disable it with an explanation. “This file changed after it was archived. Review it in Archived.” is appropriate for a revision conflict. A disabled button with no reason is not acceptable.

## Feedback composition and Altitude fit

Use a single `Alert variant="raised" tone="neutral"` while the contextual region asks for an action. It uses the existing raised tier/level 2 and its existing surface/shadow pairing. The Undo control uses a small secondary or ghost `Button` and a specific accessible name, such as “Undo archive of Brand guidelines.pdf.” Status that only informs uses the normal flat Alert treatment or a short Toast; there is no new elevation token.

**Required guidance change:** `project/components/Alert/README.md` currently directs all action-completion messages to Toast. Retain that rule for generic confirmations, and add a narrow exception for an ongoing recoverable condition with an action. Cross-link this recipe from the Toaster README. Do not silently contradict the existing guide.

A timed Toast may supplement an implementation with a durable recovery destination, but it is never the sole way to undo. If there is no durable recovery path, the Undo affordance must remain available for the advertised recovery lifetime; this recipe does not prescribe a universal timer. The primary demo uses the persistent local Alert, without a duplicate Toast.

`status="pending"` is reserved for a dispatched write, and existing `dur-grace` controls animated pending feedback. Do not set pending while the person is merely deciding. Do not add extra afterglows to every count, message, and row for the same operation.

## Focus and accessibility

Capture the initiating control and input modality before removing a row. For keyboard activation, place focus on the next surviving row’s corresponding action, then the previous row, then the list heading if the list is empty. Use `preventScroll` where appropriate and preserve the user’s scroll position. For pointer/touch, avoid moving focus to a distant recovery region automatically; if removal leaves focus on a detached node, choose the nearest logical list target. Never move focus when an asynchronous response arrives after the person has already moved elsewhere.

Undo remains keyboard reachable in the contextual region. Announce the action result once through the Alert’s existing live role; do not duplicate it in an independent page-wide live region. Busy state and changing button labels must remain readable; ensure `aria-busy` does not suppress the only progress announcement. Local errors use a contextual critical Alert. A modal blocks interaction with recovery controls behind it, even if a Toast’s visual layer paints above its scrim.

## Files and required artifacts

All paths below are relative to the Altitude repository.

- Create `project/ActionsInPlace.md`: shared decision guide and the full recipe, with ALT-04 confirmation and InlineEdit links. ALT-03 owns the recovery section; ALT-04 owns confirmation.
- Modify `project/components/Alert/README.md` and `project/components/Toaster/README.md`: define the current-state exception and the durable-recovery requirement.
- Modify `build/previews.txt`: canonical `ActionsInPlace` section, `group="Patterns"`. The same section supplies D3 and the D4 integrated scenario; ALT-05 owns its complete layout.
- Modify `scripts/stories.mjs`: register the guide and map ActionsInPlace documentation; do not hand-author generated stories.
- Create `build/checks/actions-in-place.mjs`: model and browser assertions for the simulated recipe, using the existing check-runner style. A pure helper can be tested independently if implementation extracts one, without creating a public runtime API.
- Modify `.github/workflows/ci.yml`: execute the new check after preview rendering.
- Generate `project/components/ActionsInPlace/preview.html` through `node previews.mjs`. Do not register ActionsInPlace as a runtime component in `build/build.mjs` or `src/index.tsx`.

## Acceptance criteria

- [ ] **REC-01** One activation archives the selected record with no modal; typing/search/other records remain usable.
- [ ] **REC-02** Undo becomes available after confirmation and restores the target’s archive state and stable list position without changing unrelated fields or records.
- [ ] **REC-03** Archived → Restore works after the immediate recovery region is replaced or dismissed.
- [ ] **REC-04** Two rapid activations cannot create duplicate writes for one record.
- [ ] **REC-05** An ordinary failed write restores the affected record and exposes actionable text without losing focus or unrelated changes.
- [ ] **REC-06** A post-commit transport interruption is reconciled or retried idempotently; it does not create a false success, duplicate action, or inappropriate rollback.
- [ ] **REC-07** Stale revisions and deleted targets cannot be overwritten/resurrected by Undo; the person receives a current recovery route.
- [ ] **REC-08** Out-of-order responses preserve the newest authoritative state and do not replace newer action feedback.
- [ ] **REC-09** The recovery control is keyboard/touch accessible, persists as specified, and is never accessible behind an open modal.
- [ ] **REC-10** Replaced/dismissed feedback leaves a visible, working durable recovery destination. A delayed dismissal for A cannot clear or visually hide B’s replacement region.
- [ ] **REC-11** D3 and D4 satisfy ALT-05, with deterministic latency, failure, conflict and uncertain-outcome fixtures and reset.
- [ ] **REC-12** Existing Alert/Toaster documentation and generated examples agree on the recipe; the check is wired into CI.

## Implementation sequence

- [ ] Add the service fixture and targeted failure/conflict tests first.
- [ ] Implement the recipe in the canonical Patterns preview using existing public components.
- [ ] Verify immediate action, confirmed Undo, durable Restore, stale revisions, uncertain outcomes and out-of-order results.
- [ ] Add the narrow Alert guidance change and copyable application code, including explicit ownership of persistence.
- [ ] Regenerate previews and stories; run the recipe check and affected visual/mode checks in ALT-06.

This work is done only when the executable recipe, guidance, failure paths and required demo all agree. A successful happy-path animation is insufficient.
