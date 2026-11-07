# Assistant conversation

Help someone talk to an assistant: choose a provider and model, send, read the answer as it streams, stop it, retry, edit, and recover from every way a turn can fail, without losing their words or being told an answer is finished before it is. It composes `PromptInput`, `PromptInputModelSelector`, `Conversation`, `Message`, `Markdown`, `ConversationQueue`, `ConversationCheckpoint`, `Alert` and `Meter`; what the agent *does* follows [Agent action](agent-action.md). The hook `useAssistantTurn` holds the turn.

## Inputs and ownership

Supply a stream that yields text as it arrives and resolves only when the provider says the answer is complete (throw an `AssistantError` with its kind when it fails), the restored answer and whether it completed when the page reloads, and the context window used when you know it. The application owns the transport, persistence, retention, what "complete" means for its provider, compaction, and limits. The interface never marks an answer complete on its own.

When the person can choose a model, supply an authorized catalog of configured providers and their models, a controlled `{ providerId, modelId }` selection, and an `onValueChange` callback through `PromptInput.modelPicker`. Render `PromptInputModelSelector` inside the composer. A provider ID identifies a configured connection, not necessarily the model's author: the same model may be available directly and through a gateway. Model IDs are scoped to that provider. Provider changes clear the model until the person chooses one; no automatic fallback sends their words to a different provider.

The application owns catalog discovery, credentials, server authorization, capabilities, billing policy and preference persistence. Do not put API keys or arbitrary provider URLs in selector values. A catalog can contain a disabled provider or model with a reason; loading, errors, empty lists and removed selections must remain understandable. The selector's `disabled` prop only locks the controls; it does not make an otherwise valid selection unavailable. Before every actual dispatch, including a queued message or retry, revalidate the captured pair against current server permissions and capabilities. Explain an unavailable route and preserve the input; never silently route it elsewhere. Treat an attachment or tool capability mismatch as something to resolve before sending.

## States and transitions

| State | PromptInput | Message | Reading |
|---|---|---|---|
| ready | `ready` | — | the composer, its Send the view's one primary |
| submitted | `submitted` (Send is Stop) | — | the person's message in the log at once |
| streaming | `streaming` | `streaming` | the answer on the ground on a dashed rule, "Generating…" |
| complete | `ready` | `complete` | the rule goes solid, one afterglow, announced once |
| stopped | `ready` | `stopped` | the partial answer kept, "Stopped", Retry |
| failed | `error` | `error` | the message kept in the composer; the error in words, with what to do |
| interrupted | `ready` | `error` | after a reload: "Interrupted", Retry; never shown as complete |
| awaiting-input | `streaming` | `streaming` | a `Confirmation` or `Question` is open; the turn waits, and Stop still ends it as stopped: close the `Confirmation` or `Question` with it and settle any answer the stream awaits on its `signal` |
| queued | `streaming` | — | `ConversationQueue`: written, not sent |
| choosing-model | `ready` | unchanged | provider chosen, model empty; explain what is needed and keep Send unavailable |
| catalog-loading | unchanged | unchanged | announce loading; keep the draft and prevent new sends or queues |
| catalog-error | unchanged | unchanged | show the failure and recovery; keep the selection and draft |
| model-unavailable | unchanged | unchanged | retain the saved identity and reason; block sends and queues, keep Stop available |

**The next choice is not the current answer.** `PromptInput` copies the valid pair into `PromptMessage.model` on both send and queue. Keep that whole input in the turn state, rather than reducing it to `text`. The stream must read the model from its input, not from the current picker. Render each answer's provider/model from its recorded input or server-confirmed response metadata. Changes in the composer apply to the next message, while active answers and queued messages retain the pair captured when they were submitted or queued. If a server can reroute a request, report the actual route in its response metadata and label the answer accordingly.

**Never lose the person's words.** A double Enter sends once. A failed send keeps the message (`turn.input`): put it back in the composer. Stop keeps the partial answer as "Stopped", from every state the composer shows as Stop, including awaiting-input. Pass `turn.stop` to `onStop`: it returns whether anything stopped, so the composer never announces a stop that didn't happen. Regenerating and editing keep versions (`MessageActions versions`, `onEdit`); rewinding sets turns aside (`ConversationCheckpoint`) rather than deleting them.

Return the synchronous result of `turn.submit(message)` from `PromptInput.onSubmit`. A `false` return from `onSubmit` or `onQueue` leaves the draft, attachments and mentions in place when the application rejects dispatch. An asynchronous `Promise<false>` is not that contract: accept synchronously, then retain the full submitted input for failure recovery. Existing composers without `modelPicker` keep their existing behavior.

**Completion is the stream's to say.** An answer settles only when the stream resolves. Late events from a turn that was stopped or superseded are dropped. After a reload, an answer that hadn't completed is "Interrupted" with Retry.

**Errors in words, each its own state:**
- **offline**: "We can't reach the assistant. Your message is kept; try again when you're back online."
- **rate limited**: "You've reached this hour's limit. Try again at 3:40 PM."
- **context full**: "This conversation is too long to continue. Start a new one with a summary."
- **refused**: the provider's words, or "The assistant can't help with that request."
- **outage**: "The assistant is unavailable right now. Your message is kept; try again in a few minutes."

Say them in an `Alert` resting on the page above the composer, with the action that helps (Retry, Start a new conversation), not as one generic "Something went wrong".

**The context window.** When you know how much is used, show a `Meter` in the composer toolbar with notches at 80% (caution) and 95% (critical), label it "Context" and format the reading as a percentage, so it reads "80% of 100%" (`format` formats each number, not the sentence: the meter adds "of" itself). When the app compacts, mark the place with a checkpoint ("Summarised earlier messages").

## Content, keyboard, focus and announcements

Focus stays in the composer through a turn. Each answer is announced once, on completion, never token by token; Stop and failure are announced. Enter during IME composition never sends. Escape closes an open list first, stops listening second, and only then stops generating. Provider and model fields keep visible labels, keyboard selection and the selected value when their lists close. Test duplicate model IDs under different providers, no matches, unavailable choices and narrow screens. Verify forced colours (streaming dashed, stopped and failed distinguishable without colour), reduced motion, zoom and RTL.

## Recovery and working implementation

Retry sends the kept input again, including its captured provider/model; for rate limits it waits for the time it names. Changing the next-message picker does not change Retry. Persist the input's route with the answer so restoring an unfinished turn also restores its attribution and retry target. Queues must retain that same snapshot, even when their display labels change or a provider disappears.

The working example in `build/fixtures/patterns/assistant-conversation.jsx` (also the Storybook preview "Patterns/AssistantConversationPattern") uses fictional Direct and Gateway connections with the same Beam model ID. It displays a scripted reply from the captured route, supports selection changes during a stream, stops, fails as offline, rate limited and context full, and restores an interrupted answer on a different route from the next-message choice. It makes no AI network request. [Metadata](assistant-conversation.json) names its sources and verification; the [provider and model selection research](../../../docs/research/agent-model-selection/README.md) records the comparison and design tradeoffs.

## Rules, verification and evidence

`ALT-CONVO-001` covers the turn: no double sends, no lost words, truthful completion, errors in words. `ALT-AGENT-001` covers what the agent does; `ALT-STATUS-001` covers announcements; `ALT-VISUAL-003` covers what mustn't rise (a streaming answer isn't pending). `build/checks/assistant-conversation-pattern.mjs` checks the example in a browser; `build/checks/pattern-workflows.mjs` drives the hook through a double submit, a stale stream, a reload mid-stream and a rate limit. Whether these words help people recover faster still needs evaluation with representative users.

See [running examples and verification](../principles.md#run-the-examples-and-verification) for the installed example command, repository test command, and the limits of shipped test-reference snapshots.
