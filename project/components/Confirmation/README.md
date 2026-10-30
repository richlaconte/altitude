# Confirmation

Approve or reject an action an agent proposes, before anything happens: "Send 214 emails to Pro customers", "Delete 3 stale branches". Human-in-the-loop for tool calls (the AI SDK's `approval-requested` state).

**Elevation: proposed is raised, not pending.** A pending write hovers because it's already in flight. A proposal hasn't been dispatched, so drawing it hovering would tell the person being asked for permission that it's already happening.
- **Requested:** a raised card (level 1, `Alert`'s rule for status that asks for action): "Approval needed", what's proposed, **the concrete consequence in words**, optional details (a `DiffView`, a list), "The assistant is asking", and Reject and Approve. Approve names the verb and outcome ("Send 214 emails").
- **Approved / running:** now it's a write, so it hovers as pending ("Sending…").
- **Done:** lands with the afterglow ("Sent · approved by you · now").
- **Failed:** drops to a trench ("Couldn't send"), with Retry.
- **Rejected / expired:** flush and muted, kept in the record ("Rejected by Maya · 2 minutes ago", "No longer needed").

**Escalation.** Consequential proposals use the `consequential-action` contract: `escalate="hold"` makes Approve a `HoldButton`; `escalate="dialog"` asks again in a stationary `Dialog` for irreversible actions.

**Accessibility.** A labelled `section` (its title) described by the consequence. Not a dialog unless escalated. **There's no default action**: nothing is approved by an accidental Enter, and nothing is focused automatically. Outcomes are announced ("Send campaign email: Sent."). Under forced colours the card has a 1px border, pending is dotted and failed dashed thick. Under `contrast="more"` the requested card gets a hard slab.

**Props:** `state` (`'requested' | 'approved' | 'running' | 'done' | 'failed' | 'rejected' | 'expired'`); `title`; `consequence`; `details`; `approveLabel`, `rejectLabel`, `runningLabel`, `doneLabel`, `failedLabel`; `escalate`; `resolvedBy`, `resolvedAt`; `requestedBy`; `onApprove`, `onReject`, `onRetry`.

**Scopes.** For an action that comes up again and again ("Run npm test"), give `scopes`: Approve becomes a SplitButton whose face approves once and whose menu, "More ways to approve", holds the wider scopes ("Allow npm test for this session", "Always allow npm test · Saved to this project's settings"). `onApprove` gets `'once'` or the scope's value; pass it back as `resolvedScope` and the resolved line says it: "Ran · allowed for this session by you". With `escalate`, scopes are ignored: an action that needs a hold or a dialog is never pre-approved.

**Editing the proposal.** Give `edit` (fields, e.g. `Field` + `Input`) and the card offers Edit: the fields open in place inside it, as `EditRegion` does, focusing the first. Keep `consequence` and `approveLabel` following the edited values so Approve always names what will happen, and set `edited` when they differ: "Edited" shows by the title, and once done the line reads "Sent · edited and approved by you". Escape or Cancel edit closes the fields and calls `onEditCancel` (put the values back); it doesn't reject the proposal. Reject stays available while editing.

**You provide:** the state from your tool call, the consequence in words, and what approving and rejecting do.

```tsx
<Confirmation state={call.state} title="Send campaign email"
  consequence="214 Pro customers will receive “October product update”."
  approveLabel="Send 214 emails" rejectLabel="Don't send" runningLabel="Sending…" doneLabel="Sent"
  onApprove={() => respond(call.id, true)} onReject={() => respond(call.id, false)} />
```

- Do state the consequence concretely: who, how many, what.
- Do name the outcome on Approve.
- Don't draw a proposal as pending.
- Don't remove a rejected proposal; keep it in the record.
