# Review and submit

Help someone inspect and correct meaningful answers before final commitment. Use a review stage for processes whose consequences or complexity warrant it. Prefer edit-record for a simple save; an extra review step is not automatically more usable. Do not invent steps or progress percentages unsupported by the real process.

## Inputs and ownership

Supply initial answers, business validation, final submission and a meaningful receipt returned by the service. The app owns step navigation, applicable conditional answers, authorization, durable draft storage, server idempotency and a receipt destination. Reuse known information rather than requiring redundant entry unless a scoped exception applies. If interruption recovery across reload is required, store it in the app or service; in-memory state is not durable recovery.

## States and transitions

Runtime phases are `editing`, `review`, `submitting` and `complete`; validation is represented by `errors`, and rejected submission returns to `review` with `error` while retaining answers. Editing becomes reviewing after validation succeeds; invalid answers remain editable with clear errors. Review shows the actual submitted values and labels, including omitted/optional answers where useful. Correction returns to editing while preserving still-applicable data. Explicit final commitment becomes submitting, then failure or complete. Failed submission keeps answers and permits retry. A service-confirmed receipt establishes complete; correcting a completed process must follow product rules rather than silently resubmitting. Newer edits and stale responses follow edit-record protections.

## Content, keyboard, focus and announcements

Say where the person is in the process using meaningful step labels. Give each Change action an accessible name tied to the answer. Focus the heading or relevant field after stage changes and return logically to the review item after correction. Errors use inline text plus a linked summary when appropriate. Use native form semantics and named buttons; Enter must not accidentally bypass a required review. Announce submission progress and failure with `WorkflowStatus`. Completion states what was received, the real reference and next steps; retain it visibly instead of relying on a transient toast.

On narrow screens place each answer near its Change action and allow long values to wrap. Avoid a wide stepper as the only indication of position. Preserve logical order in RTL and test zoom, forced colors and reduced motion. Never convey completion only through green or elevation.

## Recovery and working implementation

Compose `useReviewSubmit`, `ErrorSummary`, `WorkflowStatus` and ordinary controls from the main package export. The working composition in `build/fixtures/pattern-workflows.tsx` exercises review, correction, retained answers, rejected submission, retry and a service result. Its shipped snapshot is `references/build/fixtures/pattern-workflows.tsx`; [metadata](review-submit.json) maps implementation and tests. Use the hook's explicit review/correct/submit operations and render the returned receipt. Adapters must reconcile ambiguous network failure before retrying consequential submissions and restore drafts/receipts across reload when promised.

## Rules, verification and evidence

`ALT-REVIEW-001` covers correction, retained applicable information and truthful persistent confirmation. `ALT-EDIT-001`, `ALT-EDIT-002` and `ALT-STATUS-001` carry save/error/feedback obligations into the process. Verify the complete journey and data outcome, not only each isolated step. Check repeated activation, correction after invalid review, failed submission and interruption recovery in the application. [Metadata](review-submit.json) records contextual authority, sources, applicability, exceptions and provisional evidence. Human comprehension and process suitability remain unmeasured by the engineering suite.

See [running examples and verification](../principles.md#run-the-examples-and-verification) for the installed example command, repository test command, and the limits of shipped test-reference snapshots.
