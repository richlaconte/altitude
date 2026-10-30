<!--
title: Conversation: checkpoints to rewind the conversation to
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`Conversation` (a new part, `ConversationCheckpoint`, placed between messages).

## What you're trying to do

An agent edited six files and went the wrong way. The person wants to go back to before that turn: the conversation and, where the app supports it, the files. Claude Code's rewind and AI Elements' `Checkpoint` mark these points in the thread with a Restore action. Today there's no way to mark a point in a `Conversation`, and nothing says what restoring does or how to get back.

## Today

`Conversation` lays out `Message`s in a log (`project/components/src/conversation.tsx`). Regenerated answers are kept as versions, but there's no marker between turns.

## Proposal

```tsx
<ConversationContent>
  <Message from="user">…</Message>
  <ConversationCheckpoint label="Before editing 6 files" at={cp.at}
    consequence="The 4 messages after this and the changes to 6 files will be set aside. You can return to them."
    onRestore={() => restore(cp.id)} />
  <Message from="assistant">…</Message>
</ConversationContent>
```

- A checkpoint is a labelled divider with its time and a Restore action.
- Restore goes through the `consequential-action` contract (`useConsequentialAction`): with real recovery (the abandoned turns kept as a branch, as #151's versions), restore runs directly and leaves a result in place with "Return to where you were"; without it, `escalate="dialog"` asks in a stationary `Dialog`.
- After restoring, the turns after the checkpoint are reachable from the version switch on the next message, not deleted.

**Additive?** yes

## Elevation impact

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| Checkpoint | Ground | 0 | `Separator` with a word between its lines | "Checkpoint · Before editing 6 files · 2:14 PM" |
| Restore | Ground → +1 on hover | 0 | ghost `Button` | "Restore to this checkpoint" |
| Restoring | Raised (pending) | hovering | `status="pending"` on the divider's label | "Restoring…" |
| Restored | Ground | 0 | one afterglow on the divider | "Restored · Return to where you were" |
| Failed | Sunk | −2 | trench | "Couldn't restore. Retry" |

## Motion and accessibility

Restoring: pending hovers after `dur-grace`, then lands with one afterglow; the turns set aside fade out (no travel). The divider is a `separator` with an accessible label; Restore is a button whose description is the consequence. Outcomes are announced ("Restored to Before editing 6 files"). Forced colours: pending dotted, failed dashed thick.

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, the component's README and its `build/previews.txt` section updated
- [ ] `Elevation.md` / `Motion.md` updated if a signal or choreography changed
- [ ] `tsc` clean; `shoot.mjs` clean in all four schemes; interaction checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed

Part of the agent harness research pass (`docs/research/agent-harness/`); related to #151 and #174.
