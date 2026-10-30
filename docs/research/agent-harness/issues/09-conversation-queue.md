<!--
title: Conversation, PromptInput: queue messages while the agent is working
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`PromptInput` and `Conversation` together: the composer is where a message is queued, and the conversation is where the queue is shown, so one can't ship without the other.

## What you're trying to do

An agent takes minutes. While it works, the person thinks of the next thing ("also update the changelog") and wants to say it now without stopping the run. Claude Code, Cursor and AI Elements (`Queue`) let them type and press Enter: the message is queued, shown above the composer, and sent when the turn ends, with Send now, Edit and Remove. Today, while `status="streaming"`, Send is Stop and Enter does nothing useful.

## Today

`PromptInput`: "While generating, Send becomes Stop in the same slot and size" and "Escape stops generating" (`project/components/PromptInput/README.md`). There's no queued state for a message.

## Proposal

```tsx
<PromptInput status={status} onStop={stop} onSubmit={send} queue onQueue={(msg) => enqueue(msg)}>…</PromptInput>
<ConversationQueue items={queued} onSendNow={(id) => interruptAndSend(id)} onEdit={editQueued} onRemove={dequeue} />
```

- With `queue`, Enter while streaming calls `onQueue` instead of doing nothing; the button stays Stop. The composer empties and focus stays there.
- `ConversationQueue` lists queued messages between the thread and the composer, in order, each with Send now (stops the current turn and sends it), Edit and Remove.
- When the turn ends, the application sends the first queued message; it becomes an ordinary person's message in the log.

**Additive?** yes (off unless `queue` is set)

## Elevation impact

A queued message has been written but not dispatched. Pending ("hovers") is only for a write in flight, so a queued message must not hover; it's the person's message not yet in the record, which Altitude already draws with a dashed rule.

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| Queued message | Ground | 0 | `accent-soft` sheet · none, dashed 1px `line-control` rim | "Queued", position ("1 of 2") |
| Its actions | Ground → +1 on hover | 0 | ghost buttons | "Send now", "Edit", "Remove" |
| Sent from the queue | Ground | 0 | becomes a person's message in the log | — |

## Motion and accessibility

A queued message appears in place (it's the person's own action; no rise). When it's sent, it leaves the queue and arrives in the log with the person-message afterglow; under reduced motion it moves at once. The queue is a labelled list ("Queued messages"). Queuing is announced politely ("Message queued. It will be sent when the assistant finishes."); sending from the queue is not announced. Under forced colours the rim is dotted, as other not-yet-the-record states.

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, the component's README and its `build/previews.txt` section updated
- [ ] `Elevation.md` / `Motion.md` updated if a signal or choreography changed
- [ ] `tsc` clean; `shoot.mjs` clean in all four schemes; interaction checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed

## Alternatives considered (optional)

Showing queued messages inside the log as the newest entries. Rejected: they'd sit below the streaming answer they haven't been read against yet, and would scroll away from the composer that controls them.

Part of the agent harness research pass (`docs/research/agent-harness/`); related to #150 and #151.
