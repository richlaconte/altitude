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

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Confirmation` as first used in its preview:

```tsx
import { Confirmation } from 'altitude-design';

<Confirmation state={state} title={title} consequence={consequence} escalate={escalate} approveLabel={approveLabel} rejectLabel={rejectLabel}
runningLabel={runningLabel} doneLabel={doneLabel} failedLabel={failedLabel} resolvedBy="you" resolvedAt={at} scopes={scopes} resolvedScope={scope}
onApprove={approve} onReject={() => { setState('rejected'); setAt(new Date()); }} onRetry={() => { setState('running'); setTimeout(() => { setState('done'); setAt(new Date()); }, 1000); }} />
```

The full preview, as rendered in Storybook and checked in CI (`col` is the preview page's own layout class, not Altitude's):

```tsx
import * as React from 'react';
import { Confirmation, Field, Input, Select } from 'altitude-design';

function Proposal({ escalate, title, consequence, approveLabel, rejectLabel, runningLabel, doneLabel, failedLabel, fails, scopes }) {
  const [state, setState] = React.useState('requested');
  const [scope, setScope] = React.useState();
  const [at, setAt] = React.useState();
  const approve = (s) => { setScope(s); setState('running'); setTimeout(() => { setState(fails ? 'failed' : 'done'); setAt(new Date()); }, 1400); };
  return <Confirmation state={state} title={title} consequence={consequence} escalate={escalate} approveLabel={approveLabel} rejectLabel={rejectLabel}
    runningLabel={runningLabel} doneLabel={doneLabel} failedLabel={failedLabel} resolvedBy="you" resolvedAt={at} scopes={scopes} resolvedScope={scope}
    onApprove={approve} onReject={() => { setState('rejected'); setAt(new Date()); }} onRetry={() => { setState('running'); setTimeout(() => { setState('done'); setAt(new Date()); }, 1000); }} />;
}
// Edit what's proposed before approving: the consequence and the button follow the edited values.
function EditableProposal() {
  const original = { subject: 'October product update', segment: 'Pro customers', n: 214 };
  const [v, setV] = React.useState(original);
  const [state, setState] = React.useState('requested');
  const [at, setAt] = React.useState();
  const counts = { 'Pro customers': 214, 'All customers': 1180, 'Trial users': 96 };
  const edited = v.subject !== original.subject || v.segment !== original.segment;
  return <Confirmation state={state} title="Send campaign email" consequence={`${v.n} ${v.segment} will receive “${v.subject}”.`}
    approveLabel={`Send ${v.n} emails`} rejectLabel="Don't send" runningLabel="Sending…" doneLabel="Sent" resolvedBy="you" resolvedAt={at} edited={edited}
    edit={<>
      <Field label="Subject"><Input value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} /></Field>
      <Field label="Segment"><Select value={v.segment} onValueChange={(segment) => setV({ ...v, segment, n: counts[segment] })} items={Object.keys(counts).map((k) => ({ value: k, label: k }))} /></Field>
    </>}
    onEditCancel={() => setV(original)}
    onApprove={() => { setState('running'); setTimeout(() => { setState('done'); setAt(new Date()); }, 1200); }} onReject={() => { setState('rejected'); setAt(new Date()); }} />;
}
export default function App() {
  return (
    <div className="col">
      <Proposal title="Send campaign email" consequence="214 Pro customers will receive “October product update”." approveLabel="Send 214 emails" rejectLabel="Don't send" runningLabel="Sending…" doneLabel="Sent" failedLabel="Couldn't send" />
      <Proposal title="Delete 3 stale branches" consequence="release/2.3, spike/maps and fix/old-auth will be deleted from the repository." approveLabel="Delete 3 branches" rejectLabel="Keep them" runningLabel="Deleting…" doneLabel="Deleted" escalate="hold" />
      <Proposal title="Archive the Atlas workspace" consequence="12 people lose access; it can't be restored after 30 days." approveLabel="Archive workspace" rejectLabel="Don't archive" runningLabel="Archiving…" failedLabel="Couldn't archive" escalate="dialog" fails />
      <Proposal title="Run npm test" consequence="Runs the test suite in this workspace." approveLabel="Run once" rejectLabel="Don't run" runningLabel="Running…" doneLabel="Ran"
        scopes={[{ value: 'session', label: 'Allow npm test for this session' }, { value: 'always', label: 'Always allow npm test', description: 'Saved to this project’s settings' }]} />
      <EditableProposal />
    </div>
  );
}
```
<!-- /example -->
