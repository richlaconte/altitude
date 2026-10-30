# Assistant conversation

Help someone talk to an assistant: send, read the answer as it streams, stop it, retry, edit, and recover from every way a turn can fail, without losing their words or being told an answer is finished before it is. It composes `PromptInput`, `Conversation`, `Message`, `Markdown`, `ConversationQueue`, `ConversationCheckpoint`, `Alert` and `Meter`; what the agent *does* follows [Agent action](agent-action.md). The hook `useAssistantTurn` holds the turn.

## Inputs and ownership

Supply a stream that yields text as it arrives and resolves only when the provider says the answer is complete (throw an `AssistantError` with its kind when it fails), the restored answer and whether it completed when the page reloads, and the context window used when you know it. The application owns the transport, persistence, retention, what "complete" means for its provider, compaction, and limits. The interface never marks an answer complete on its own.

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
| awaiting-input | `streaming` | `streaming` | a `Confirmation` or `Question` is open; the turn waits |
| queued | `streaming` | — | `ConversationQueue`: written, not sent |

**Never lose the person's words.** A double Enter sends once. A failed send keeps the message (`turn.input`): put it back in the composer. Stop keeps the partial answer as "Stopped". Regenerating and editing keep versions (`MessageActions versions`, `onEdit`); rewinding sets turns aside (`ConversationCheckpoint`) rather than deleting them.

**Completion is the stream's to say.** An answer settles only when the stream resolves. Late events from a turn that was stopped or superseded are dropped. After a reload, an answer that hadn't completed is "Interrupted" with Retry.

**Errors in words, each its own state:**
- **offline**: "We can't reach the assistant. Your message is kept; try again when you're back online."
- **rate limited**: "You've reached this hour's limit. Try again at 3:40 PM."
- **context full**: "This conversation is too long to continue. Start a new one with a summary."
- **refused**: the provider's words, or "The assistant can't help with that request."
- **outage**: "The assistant is unavailable right now. Your message is kept; try again in a few minutes."

Say them in an `Alert` resting on the page above the composer, with the action that helps (Retry, Start a new conversation), not as one generic "Something went wrong".

**The context window.** When you know how much is used, show a `Meter` in the composer toolbar with notches at 80% (caution) and 95% (critical), and say it ("80% of context used"). When the app compacts, mark the place with a checkpoint ("Summarised earlier messages").

## Content, keyboard, focus and announcements

Focus stays in the composer through a turn. Each answer is announced once, on completion, never token by token; Stop and failure are announced. Enter during IME composition never sends. Escape closes an open list first, stops listening second, and only then stops generating. Verify forced colours (streaming dashed, stopped and failed distinguishable without colour), reduced motion, zoom and RTL.

## Recovery and working implementation

Retry sends the kept input again; for rate limits it waits for the time it names. The working example in `build/fixtures/patterns/assistant-conversation.jsx` (also the Storybook preview "Patterns/AssistantConversationPattern") streams answers, stops, fails as offline, rate limited and context full, and restores an interrupted answer. [Metadata](assistant-conversation.json) names its sources and verification.

## Rules, verification and evidence

`ALT-CONVO-001` covers the turn: no double sends, no lost words, truthful completion, errors in words. `ALT-AGENT-001` covers what the agent does; `ALT-STATUS-001` covers announcements; `ALT-VISUAL-003` covers what mustn't rise (a streaming answer isn't pending). `build/checks/assistant-conversation-pattern.mjs` checks the example in a browser; `build/checks/pattern-workflows.mjs` drives the hook through a double submit, a stale stream, a reload mid-stream and a rate limit. Whether these words help people recover faster still needs evaluation with representative users.

See [running examples and verification](../principles.md#run-the-examples-and-verification) for the installed example command, repository test command, and the limits of shipped test-reference snapshots.
