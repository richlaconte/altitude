# An agent harness in Altitude: research, coverage and gaps

October 2026 · a research pass on what it takes to build a complete AI harness (a chat assistant, a coding agent, an agent embedded in a product) with Altitude alone, ending in a coverage map, the gaps, and a set of issues ([issues/](issues/)).

**The question.** Altitude now has a first family of AI components: `PromptInput` (#150), `Conversation` and `Message` (#151), `Trace` (#152), `Confirmation` (#153), suggestions on `Input` and `Textarea` (#154), proposals on `PropertyList` (#155), `AILabel` (#156) and `InlineCitation` (#157), with the agent action pattern filed as #174. Could someone build Claude.ai, ChatGPT, Claude Code's desktop app, Cursor's agent pane or an assistant inside a SaaS product from these, without leaving Altitude or inventing elevation of their own? What's missing?

**The short answer.** The elevation model already has the hard readings: a streamed answer rests on the ground under a dashed rule ("not yet the record"), a proposal is raised and not pending, a step is a Stepper plate, provenance is a plate. What's missing is mostly **around the turn** rather than in it: the text of an answer itself (Markdown), the list of conversations, the agent asking a question, the thing the agent is making, prompts to start from, and command output. And a set of behaviours that every serious harness has converged on: attachments and edits on sent messages, a queue while the agent works, checkpoints, subagents, live reasoning, approval scopes, editing a proposal, reviewing changes hunk by hunk, @-context and /commands, and dictation. Six new components, eleven features, one framework pattern, and one showcase.

---

## 1. Method

| Step | What was done |
|---|---|
| Read the system | `README.md`, `project/README.md`, `Elevation.md` (every AI-related row and "States that don't rise"), `CONTRIBUTING.md`, `AGENTS.md`, the three issue templates, the framework patterns in `project/framework/patterns/`, and the two earlier research passes (`docs/research/charts/`, `docs/research/mobile/`). |
| Read the AI components | READMEs and sources of `Conversation`, `PromptInput`, `Trace`, `Confirmation`, `AILabel`, `InlineCitation`, `CodeBlock`, `DiffView`, `CommentThread` (for mentions), `AppShell`, at commit `66a94cc` on `feat/inline-citation` (`package.json` 0.2.1). The AI components are on unmerged feature branches; their issues (#150–#157) are still open. |
| Surveyed the field | Vercel AI Elements (49 components across chatbot, code, voice and workflow), assistant-ui (ThreadList, BranchPicker, EditComposer, Attachments), the Shape of AI pattern catalogue (wayfinders, inputs, tuners, governors, trust builders, identifiers), and the behaviour of Claude.ai, Claude Code, ChatGPT and Cursor as harnesses (queued follow-ups, checkpoints and rewind, permission modes, subagents, plan approval, artifacts and canvases). |
| Prior issues | `gh issue list --state all` (all 267): AI is covered by #150–#157 and #174; editors and canvases by #179–#181; nothing covers thread history, Markdown, questions, artifacts, terminal output, or the behaviours in §4. |

Not done: no prototype was built and nothing was rendered for this pass; the elevation proposals in the issues are designs to be agreed, not observations. No user study.

## 2. What a harness is made of

A harness is the UI between a person and a model that can act. Every one surveyed has the same five regions:

1. **Where you are:** the list of conversations (or sessions, or tasks), which ones are still running, which need you.
2. **The turn:** the person's message (with attachments and context), the answer as it streams (text, reasoning, tool calls, sources), and actions on it (copy, regenerate, edit, feedback).
3. **The agent's work:** its steps, its plan, its subagents, and command output.
4. **The person in the loop:** approvals (with a scope), questions the agent asks, edits to what it proposes, review of the changes it made, and rewinding.
5. **The composer:** text, attachments, @-context, /commands, a model and mode picker, context usage, voice, Send that becomes Stop, and a queue for follow-ups.

Beside these sits the **artifact**: the document, code or preview the agent is making.

## 3. Coverage

| Need | Altitude today | Gap → issue |
|---|---|---|
| Thread of messages, streaming, stop, retry, regenerate with versions, feedback | `Conversation`, `Message`, `MessageActions` (#151) | — |
| Answer text with headings, lists, tables, code, links, as it streams | `MessageContent` takes children; no prose styles or parser | **New: Markdown** |
| Attachments shown on a sent message | composer chips only (#150) | **Message: attachments** |
| Edit a sent message and branch | versions only for regenerate | **Message: edit and branch** |
| Composer, attachments, Send → Stop, IME-safe | `PromptInput` (#150) | — |
| @-mention files and context, /commands | `CommentThread` has @people only | **PromptInput: @ and /** |
| Dictation | — | **PromptInput: voice** |
| Follow-ups while the agent works | Send is Stop while streaming | **Conversation: queue** |
| Model or mode picker | `Select`, `ToggleGroup` | composition (shown in the example) |
| Context window used, cost estimate | `Meter`, `FormattedNumber` | composition (shown in the example) |
| Prompt starters and follow-up suggestions | `EmptyState` actions, plain buttons | **New: Suggestions** |
| Steps, tool calls, reasoning, failure, retry | `Trace`, `TraceToolCall`, `TraceReasoning` (#152) | — |
| Reasoning while it streams | `TraceReasoning` has only "Thought for 12s" | **Trace: streaming reasoning** |
| Subagents and parallel steps | `Trace` is one flat list | **Trace: nested and parallel** |
| Command output with exit status | `CodeBlock streaming` (no exit, stderr or follow) | **New: Terminal** |
| Approve or reject a tool call | `Confirmation` (#153) | — |
| Allow once, for the session, always | approve is one choice | **Confirmation: scope** |
| Edit the proposal before approving | — | **Confirmation: edit** |
| Agent asks a question with options | — (Confirmation is approve/reject only) | **New: Question** |
| Review the agent's changes, accept or reject per change | `DiffView` (read only); `PropertyList proposed` for fields (#155) | **DiffView: accept or reject each change** |
| Rewind to a checkpoint | — | **Conversation: checkpoints** |
| Sources and citations | `InlineCitation`, `Sources` (#157) | — |
| AI provenance | `AILabel` (#156) | — |
| Suggested values in fields | `suggestion` on `Input`, `Textarea` (#154) | — |
| Conversation and session list, running and needs-you states | `Sidebar` (destinations only) | **New: ThreadList** |
| The thing being made, with versions, preview and code | `ResizablePanelGroup`, `Sheet`, `CodeBlock`, `DiffView` | **New: Artifact** |
| App frame | `AppShell`, `ResizablePanelGroup`, `Sheet` | — |
| File tree, test results, stack trace, env vars | `Tree`, `Table` + `Badge`, `CodeBlock`, `SecretField` / `PropertyList` | composition |
| Workflow canvas, code editor, rich text | — | already filed: #181, #180, #179 |
| Agent actions end to end | `useConsequentialAction` | already filed: #174 |
| The conversation itself as a task (errors, limits, persistence) | — | **Framework: assistant conversation pattern** |

## 4. The gaps, in Altitude's terms

Each gap is a question of which of the three things it is (settled, live, an opening) and what says it without height. The answers proposed in the issues, in short:

- **Markdown** is the record: prose on the ground, tables flush with `line` dividers, code handed to `CodeBlock`, links to `Link`, `[n]` to `InlineCitation`. It adds no state of its own; it must not flash half-built constructs while streaming (an unclosed fence is a streaming `CodeBlock`, not a paragraph of backticks).
- **ThreadList** rows are destinations on the ground; the current one on `Sidebar`'s raised pill. A running thread is **not** pending (nothing you sent is in flight; see `Conversation`), so it's a word and a steady lamp. A thread that needs you is a `caution` plate ("Needs approval"), not a height. A finished, unread answer is a dot and weight 600 ("States that don't rise").
- **Question** is status that asks for action, so raised (level 1), as `Confirmation`; its options are choices built like the Switch (`RadioGroup`, `Checkbox`); "Other" is an opening; answered, it lies flush in the record ("You chose …").
- **Artifact** is the record being made: flush in its pane, a dashed rule and "Writing…" while it's written (as `CodeBlock streaming`), versions kept and never overwritten (as `MessageActions versions`); a reference to it in a message is a plate that acts and lifts one level.
- **Suggestions** are things you press, so slabs; follow-ups cross-fade in after the answer settles rather than rising ("Spend rises carefully").
- **Terminal** is the record, flush like `CodeBlock`; running is "not yet the record" (dashed rule, "Running", `aria-busy`); the exit is a word and an icon ("Exited with 1"), never colour alone.
- **A queued message** has been written but not dispatched, so it isn't pending (hovering is for a write in flight): a flush `accent-soft` sheet with a dashed rim and "Queued".
- **A checkpoint** is a labelled divider on the ground; restoring is a consequential action with real recovery (the abandoned turns are kept as a branch).
- **Subagents** are a nested Trace behind a lid; parallel steps are several running steps at once, each raised, said in words ("3 running").
- **Streaming reasoning** is "not yet the record": "Thinking…" with a dashed rule, **no shimmer** (AI Elements' `Shimmer` is the anti-pattern: light moving across a surface).
- **Approval scope** is an action with alternatives: `SplitButton`.
- **Editing a proposal** opens `EditRegion`'s wells inside the raised card; the Approve label follows the edited values.
- **Accept or reject a hunk** follows `PropertyList proposed` (#155): a change awaiting a decision is raised; accepted settles flush; rejected stays flush, muted, in the record.
- **@ and /** open a floating list at level 3 from the caret (Combobox's list); a chosen mention is a flush plate in the text, as `CommentThread`'s mentions.
- **Dictation** latches the mic as a `Toggle` that's on; the interim transcript is a ghost in `ink-faint` (as `suggestion`), so the well stays an opening until the words are final.

## 5. What not to build

- **Shimmer, glow, gradient rims, sparkle icons that animate.** Light comes from straight above and never moves (law 6); `AILabel` already rejects them.
- **Spinners for thinking.** Loading is a held press or an imprint (`Trace`).
- **A persona orb or avatar that pulses while speaking.** A pulse is a height that moves on its own (law 4). Voice output and personas are out of scope for this pass.
- **A component for what composes.** Model picker (`Select`), context usage (`Meter` with thresholds), cost (`FormattedNumber`), file tree (`Tree`), test results (`Table` and status `Badge`s), stack traces (`CodeBlock`), env vars (`SecretField`, `PropertyList`). The showcase demonstrates each so the composition is documented rather than reinvented.

## 6. Showcase

The landing page is one static, inlined page on GitHub Pages, so a live model call isn't possible there without a key and a server. The proposal (issue 19) is better than a chat box on a page: a **second page that replays a scripted, deterministic agent run** through every state above, in a complete harness layout, with a **moment rail** to jump to any named state (streaming, tool running, approval requested, question asked, failed, retried, queued follow-up, rewound, done), annotations naming the Elevation rule each moment shows, and the site's scheme and mode toggles. The same script is a Storybook story and a `shoot.mjs` fixture, so every moment is rendered in all four schemes in CI, and an `examples/agent-harness` app runs the same layout against a real model through an AI SDK transport.

## 7. Issues

| # | File | Title |
|---|---|---|
| #268 | [01](issues/01-markdown.md) | New: Markdown — an answer's text, rendered as it streams, in Altitude's type |
| #269 | [02](issues/02-threadlist.md) | New: ThreadList — conversations with an assistant, with the ones still working said in words |
| #270 | [03](issues/03-question.md) | New: Question — an agent asks the person something before it carries on |
| #271 | [04](issues/04-artifact.md) | New: Artifact — what an agent is making, beside the conversation, with its versions |
| #272 | [05](issues/05-suggestions.md) | New: Suggestions — prompts to start from or follow up with |
| #273 | [06](issues/06-terminal.md) | New: Terminal — a command's output as it runs, with its exit status |
| #274 | [07](issues/07-message-attachments.md) | Message: show what was attached to a sent message |
| #275 | [08](issues/08-message-edit.md) | Message: edit a sent message, keeping the earlier one as a version |
| #276 | [09](issues/09-conversation-queue.md) | Conversation, PromptInput: queue messages while the agent is working |
| #277 | [10](issues/10-conversation-checkpoints.md) | Conversation: checkpoints to rewind the conversation to |
| #278 | [11](issues/11-trace-nested.md) | Trace: nested and parallel steps, for subagents |
| #279 | [12](issues/12-trace-reasoning-streaming.md) | Trace: show reasoning while it streams |
| #280 | [13](issues/13-confirmation-scope.md) | Confirmation: approve once, for the session, or always |
| #281 | [14](issues/14-confirmation-edit.md) | Confirmation: edit what's proposed before approving it |
| #282 | [15](issues/15-diffview-review.md) | DiffView: accept or reject each change |
| #283 | [16](issues/16-promptinput-mentions.md) | PromptInput: add context with @ and run commands with / |
| #284 | [17](issues/17-promptinput-voice.md) | PromptInput: dictate a message |
| #285 | [18](issues/18-framework-conversation.md) | Framework: an assistant conversation pattern (send, stream, stop, retry, limits) |
| #286 | [19](issues/19-site-harness.md) | Site: an agent harness page that replays a scripted run through every state |

## Sources

- Vercel AI Elements, component index: https://elements.ai-sdk.dev/
- assistant-ui, primitives (ThreadList, BranchPicker, EditComposer, Attachment): https://www.assistant-ui.com/docs/api-reference/primitives.md
- Emily Campbell, The Shape of AI: https://www.shapeof.ai/
- Altitude issues #150–#157, #174, #179–#181
