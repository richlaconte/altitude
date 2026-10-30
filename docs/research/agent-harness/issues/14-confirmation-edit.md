<!--
title: Confirmation: edit what's proposed before approving it
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`Confirmation`.

## What you're trying to do

The agent proposes "Send campaign email to 214 Pro customers" with a subject line that's nearly right. Today the person can only approve it as is or reject it and explain in the composer, which costs a turn. Harnesses increasingly let the person change the proposal's arguments (the subject, the recipients, the command) and approve the edited version; the agent is told what was changed.

## Today

`Confirmation` shows `title`, `consequence` and read-only `details`, and approves or rejects (`project/components/Confirmation/README.md`).

## Proposal

```tsx
<Confirmation state={call.state} title="Send campaign email" consequence={`${n} Pro customers will receive “${subject}”.`}
  approveLabel={`Send ${n} emails`}
  edit={<EditRegionFields>
    <Field label="Subject"><Input value={subject} onChange={…} /></Field>
    <Field label="Segment"><Select items={segments} value={segment} onValueChange={…} /></Field>
  </EditRegionFields>}
  onApprove={() => respond(call.id, true, { subject, segment })} edited={changed} />
```

- With `edit`, the card has an "Edit" action. Editing opens the fields in place inside the raised card, as `EditRegion` does; `consequence` and `approveLabel` follow the edited values, so Approve always names what will actually happen.
- Approving an edited proposal records it: "Sent · edited and approved by you".
- Reject stays available while editing.

**Additive?** yes

## Elevation impact

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| Requested card | Raised | 1 | as today | "Approval needed" |
| Fields being edited | Sunk | −1 | `Input` / `Select` wells inside the card | their labels |
| Edited, not yet approved | Raised | 1 | as today | "Edited" plate next to the title |
| Approved after edit | hovering → Ground | pending → 0 | as today | "edited and approved by you" |

## Motion and accessibility

Opening the fields: they open in place inside the card with no layout jump (the padding was already there, as `EditRegion`). Focus moves to the first field; Escape cancels the edit (not the proposal). The consequence is the card's description, so its updated text is read when Approve is focused. No default action, as today.

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, the component's README and its `build/previews.txt` section updated
- [ ] `Elevation.md` / `Motion.md` updated if a signal or choreography changed
- [ ] `tsc` clean; `shoot.mjs` clean in all four schemes; interaction checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed

Part of the agent harness research pass (`docs/research/agent-harness/`); related to #153 and #174.
