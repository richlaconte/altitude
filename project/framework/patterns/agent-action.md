# Agent action

Help someone delegate work to an agent that acts: it plans, shows its steps, waits for approval where the consequence warrants it, runs what's approved, reports back, recovers from failure, and leaves a record of who did what. It composes `Trace`, `Confirmation`, `AILabel` and, for the request, `PromptInput` and `Conversation`; destructive steps follow [Consequential action](consequential-action.md).

## Inputs and ownership

Supply the agent's plan as steps with their tool calls, each step's state from the agent runtime, each step's consequence class (reversible with a real undo, external, or irreversible), approve and reject handlers that reach the runtime, a retry handler, and the provenance of every change (agent, model, approver, time). The application owns the agent runtime, tool permissions, what runs without approval, idempotent retries, the undo that makes a step reversible, and the audit trail. The interface never decides on its own that an action is safe.

## States and transitions

Map each tool-call state to exactly one reading:

| Runtime state | Reading |
|---|---|
| planned | imprint: the step is there but nothing happened |
| running | the current step, raised on its wall, with its tool call behind a lid |
| approval-requested | **Proposed**: a raised `Confirmation` that asks, **never pending** |
| approved / executing | **pending**: it hovers until the result arrives |
| done | lands and settles, with what happened in words |
| failed | sinks into a trench, says what (and that nothing changed, when true), with Retry |
| rejected | flush, "Rejected", and the step says what didn't happen |

**Escalate by consequence.** A reversible step with a real undo may run without approval; it reports its result with Undo, as a `RemovalReceipt` does ("4 leads archived. You can undo this for 30 days."). An external or irreversible step (send, pay, delete, publish) requires a `Confirmation` that states the consequence concretely ("Theo Marsh, Ines Duarte and Sam Okafor will get an email…") with an approve button named by the outcome ("Send 3 emails"). The most severe use `escalate="hold"` or `escalate="dialog"` (a stationary Dialog).

**Never claim success the runtime hasn't confirmed**, and never let a streamed answer look like the record before it completes (`Message` streams on a dashed rule). **Provenance**: everything an agent changed carries an `AILabel` on the result ("Drafted with AI" once a person approved it) and an activity entry naming the agent and the approver.

## Content, keyboard, focus and announcements

Steps are an ordered list; the current step is `aria-current`. Step changes are announced politely and throttled; approvals and failures immediately; never token by token. Approve and reject are ordinary buttons reachable by keyboard; a hold has a keyboard equivalent; focus stays where the person is unless a dialog opens. Tool-call input and output stay behind a disclosure, readable as text. Verify forced colors (Proposed, pending and failed stay distinguishable without colour), reduced motion (pending holds still, raised; no glow or gradient anywhere), zoom and RTL.

## Recovery and working implementation

A failed step offers Retry and says whether anything changed. A rejected step leaves the rest of the plan to the runtime: it may continue, re-plan or stop, and the trace says which. An undone step says so. The working example in `build/fixtures/patterns/agent-action.jsx` (shipped as `references/build/fixtures/patterns/agent-action.jsx`) composes a run with a search, a reversible archive with Undo, an email that waits for approval, a permanent delete behind a stationary dialog, a failure with Retry, and a changed record with provenance. It is also the Storybook preview "Patterns/AgentActionPattern". [Metadata](agent-action.json) names the runtime and verification sources.

## Rules, verification and evidence

`ALT-AGENT-001` covers the state mapping, escalation by consequence and provenance; `ALT-ACTION-001` covers consequential steps; `ALT-STATUS-001` covers announcements; `ALT-VISUAL-003` covers what must not rise (a proposal is not pending). `build/checks/agent-action-pattern.mjs` checks the example in a browser. See [rules](../rules.json) and Elevation.md's Proposed and Streaming readings. How much approval people want for which actions still needs evaluation with representative users.

See [running examples and verification](../principles.md#run-the-examples-and-verification) for the installed example command, repository test command, and the limits of shipped test-reference snapshots.
