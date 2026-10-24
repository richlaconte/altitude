# Consequential action

Help someone understand and complete an action whose consequences matter: deletion, revocation, publishing or bulk changes. Match protection to actual impact. Prefer direct action with genuine recovery where appropriate, or a focused review/confirmation when correction before commitment matters. Avoid confirmation rituals for trivial operations. A hold gesture is a scoped option, never the universal destructive-action policy.

## Inputs and ownership

Supply the exact target, scope and consequence, an `execute` adapter, explicit confirmation policy, optional genuine `undo`, and a logical focus destination. Explain what becomes unavailable, who is affected, and whether recovery expires. The application owns authorization, persistence, idempotency and recovery durability; an Undo label does not create an inverse operation. Legal/financial/data error prevention criteria have specific applicability and alternatives, not a blanket “confirm all deletes” rule.

## States and transitions

Runtime phases are `idle`, `confirming`, `pending`, `failed`, `succeeded`, `undoing` and `undone`; failed execution and failed undo share `failed`, and `retry` repeats the correct operation. Request moves from idle to confirming or pending according to policy. Cancel before execution returns to idle without a mutation. Confirm records intent and starts pending; it does not establish completion. Pending blocks repeated activation. Rejection becomes failure and offers a useful retry; success only follows a resolved execution result. Undo is available only when supplied and truthful: complete → undo-pending → undone or undo-failure. Keep a failed undo recoverable and do not report restoration before the inverse succeeds. Do not claim an in-flight operation was cancelled because its UI closed.

## Content, keyboard, focus and announcements

Name actions by outcome (“Delete Northwind workspace”), not “OK”. Make the target and consequence visible before commitment. Use native buttons, and an accessible Dialog for bounded confirmation; its name, inert background, contained Tab/Shift+Tab, dismissal and initial focus must remain correct. Initial focus may favor the safe option for irreversible consequences. On cancel return to the trigger; after a removed record, focus a surviving logical neighbor or heading via the application callback. Persistent failure belongs near the task; concise status uses `WorkflowStatus` without stealing focus.

Long target names and consequences must wrap on narrow screens; keep cancellation and commitment visible and keyboard reachable. Verify RTL, zoom, forced colors, reduced motion and touch. Meaning must survive without animation, shadow or color.

## Recovery and working implementation

Compose `useConsequentialAction`, named buttons, `Dialog` when required, and `WorkflowStatus`. Wire `execute` to the real mutation and `undo` only to its real inverse. The executable `build/fixtures/pattern-workflows.tsx` demonstrates intent cancellation, delayed execution, failure/retry, true removal and restoration; the distributed snapshot is `references/build/fixtures/pattern-workflows.tsx`. [Metadata](consequential-action.json) names runtime and verification sources. App adapters must handle deletion races, permission changes and ambiguous transport outcomes; retries need idempotency or reconciliation where duplicate effects matter. Recovery should have a durable destination beyond an ephemeral toast when its availability requires it.

## Rules, verification and evidence

`ALT-ACTION-001` checks the integration boundary between confirmation and actual completion, including real undo and logical focus. `ALT-STATUS-001` covers feedback. `ALT-EXP-001` explicitly marks hold-to-confirm task benefit as unvalidated. See [rules](../rules.json) and [metadata](consequential-action.json) for source authority, applicability, exceptions, provisional maturity and executable references. Browser tests establish operation sequences; representative-user evaluation is still needed for the suitability and comprehensibility of the protection.

See [running examples and verification](../principles.md#run-the-examples-and-verification) for the installed example command, repository test command, and the limits of shipped test-reference snapshots.
