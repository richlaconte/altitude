# Sync

Help someone trust what has reached the server: autosaving editors, optimistic lists and local-first apps that survive going offline, resolve the rare edit conflict without dropping anyone's work, and keep a draft through an expired session. It extends the persistence rules of [Edit record](edit-record.md) to work saved continuously.

## Inputs and ownership

Supply each change's write and its acknowledgement, the connection state, the queue of changes not yet acknowledged, conflict detection with both versions and who made the other one, and the session's expiry time with a way to extend it. The application owns the merge strategy (CRDT, operational transform, last write wins or a three-way merge), the durability of the local queue across reloads, idempotent replays, and re-authentication. A timer or a local write doesn't prove persistence; only the server's acknowledgement does.

## States and transitions

**Per item**: a change is `status="pending"` from the moment it's made until the server acknowledges it (it hovers, after the grace period so fast writes never flicker), then committed (it lands), or failed (it drops into a trench with Retry). **Globally**, `SyncIndicator` ties the items together: it counts the queue, says "Saved" only when the queue is empty and acknowledged (and announces "Saved" at most every few seconds), and offers Retry when sending fails.

**Offline**: queued changes stay pending and say "Waiting to sync"; the indicator says "Offline" with the count; nothing claims to be saved. Coming back online replays the queue in order; each item lands as it's acknowledged.

**Conflicts**: resolve automatically wherever the merge strategy can. For the rest, show both versions in place, as `EditRegion` does: the conflict asks for action (raised, level 1, "Changed by Jane Park while you were editing"); the other person's version wears their `presence-*` colour and name, because it's their hold on the record. Offer "Keep mine", "Keep theirs" and, where meaningful, "Keep both". Never drop an edit silently: say where the other version went ("Yours is in the history"). The indicator counts unresolved conflicts and takes you to them.

**Session expiry**: before the session ends, a stationary `Dialog` that Escape doesn't dismiss says the time left in words ("Your session ends in 2 minutes") with "Stay signed in" as primary. Any draft is kept locally across re-authentication, and the dialog says so. After expiry, signing in again returns to the same draft.

## Content, keyboard, focus and announcements

Going offline and conflicts are announced immediately; "Saved" is debounced. The indicator's plate is a button when there's something to show (the queue, the conflicts). Resolving a conflict moves focus to the resolved field's heading. Pending items keep their content readable; nothing is disabled just because it's waiting. Verify forced colors (pending items keep a dotted border, failed ones dashed), reduced motion (pending holds still, raised), zoom and RTL.

## Recovery and working implementation

A failed write offers Retry and keeps the change queued. A failed replay after reconnecting leaves the remaining items pending and says how many are waiting. The working example in `build/fixtures/patterns/sync.jsx` (shipped as `references/build/fixtures/patterns/sync.jsx`) composes pending items with a demo server, an offline queue, a conflict with keep mine, keep theirs or keep both, and an expiring session. It is also the Storybook preview "Patterns/SyncPattern". [Metadata](sync.json) names the runtime and verification sources.

## Rules, verification and evidence

`ALT-SYNC-001` covers pending until acknowledged, offline queues and conflicts that never drop work; `ALT-EDIT-001` covers truthful persistence; `ALT-STATUS-001` covers announcements. WCAG 2.2's timing-adjustable criterion applies to session expiry. `build/checks/sync-pattern.mjs` checks the example in a browser. See [rules](../rules.json). Whether people understand conflict choices still needs evaluation with representative users.

See [running examples and verification](../principles.md#run-the-examples-and-verification) for the installed example command, repository test command, and the limits of shipped test-reference snapshots.
