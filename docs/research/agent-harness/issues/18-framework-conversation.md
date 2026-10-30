<!--
title: Framework: an assistant conversation pattern (send, stream, stop, retry, limits)
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

Framework: a new task pattern (`assistant-conversation.md` + `assistant-conversation.json`), with a small workflow hook.

## What you're trying to do

#174 covers what happens when an agent acts (propose, approve, run, recover). It doesn't cover the conversation that surrounds it, which is where most harness bugs live: a double Enter sends twice; Stop leaves the composer stuck in "streaming"; a reload loses a half-finished answer or shows it as complete; a rate limit or a full context window appears as "Something went wrong"; regenerate overwrites the previous answer; a stale stream from a previous thread writes into the current one. An agent building a chat UI has no contract to check itself against.

## Today

The components exist or are proposed (`PromptInput` #150, `Conversation` #151, `Trace` #152, `Confirmation` #153) and the framework has four patterns (`project/framework/patterns/`), none for a conversation. The framework's hooks already guard duplicate dispatch and stale responses for other tasks (README, "Design and HCI framework").

## Proposal

An `assistant-conversation` contract that:

- **States and transitions**: `ready → submitted → streaming → complete | stopped | failed`, plus `awaiting-input` (a `Confirmation` or `Question`, #270, is open) and `queued` (#276); each mapped to `PromptInput status`, `Message status` and announcements.
- **Never loses the person's words**: a failed send keeps the text in the composer; Stop keeps the partial answer as "Stopped"; regenerate and edit keep versions.
- **Truthful completion**: an answer settles only when the stream says it's complete; after a reload, an unfinished answer is "Interrupted" with Retry, never shown as complete.
- **Errors in words, with what to do**: offline ("We can't reach the assistant. Your message is kept."), rate limited ("You've reached this hour's limit. Try again at 3:40 PM.", with `RelativeTime`), context full ("This conversation is too long to continue. Start a new one with a summary."), refused, and provider outage, each a distinct state, not one generic error.
- **Context window**: a `Meter` in the composer toolbar with thresholds (caution at 80%, critical at 95%) and a "Summarised earlier messages" checkpoint when the app compacts.
- **Focus and announcements**: focus stays in the composer; each answer is announced once on completion; nothing is announced token by token.
- A hook, `useAssistantTurn`, that guards duplicate submits, ignores events from a superseded turn or thread, and exposes the state above, as `useConsequentialAction` does for its task.
- Intents: "chat", "assistant", "copilot", "chatbot", "agent conversation".

**Additive?** yes

## Elevation impact

None new: the pattern maps conversation states onto readings defined in #150–#153 and the issues filed with this one.

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| Streaming answer | Ground | 0 | dashed rule (`Message`) | "Generating…" |
| Interrupted after reload | Ground | 0 | `critical` rule | "Interrupted", Retry |
| Rate limited / context full | Ground | 0 | `Alert` resting on the page above the composer | the words above, and the action |
| Context nearly full | Ground | 0 | `Meter` past its caution notch | "80% of context used" |

## Motion and accessibility

None new. The contract requires the announcements above and the IME rule from `PromptInput`.

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, the component's README and its `build/previews.txt` section updated
- [ ] `Elevation.md` / `Motion.md` updated if a signal or choreography changed
- [ ] `tsc` clean; `shoot.mjs` clean in all four schemes; interaction checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed
- [ ] Pattern JSON validates against `pattern.schema.json`; rules and evidence added; adverse-state fixtures (double submit, stale stream, reload mid-stream, rate limit) pass in `npm run check:framework`

Part of the agent harness research pass (`docs/research/agent-harness/`); complements #174.
