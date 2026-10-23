# Design and HCI framework implementation

The user approved the full research/roadmap on 2026-10-23. This execution plan reconciles it with main at 8a4b675 (audited baseline a7bd408). No release or deployment is authorized.

**Goal:** ordinary product requests receive focused guidance, tested workflow behavior, and verifiable outcomes.
**Architecture:** preserve authoritative TSX/CSS/tokens/previews; add authored framework metadata/prose, generated installed guidance, a separately built local CLI, and small exported hooks/compositions. No runtime subpath or new provider. Existing Actions in place and modal ownership work remain intact.
**Stack:** React 18/19, TypeScript, esbuild, Node CLI, Playwright, npm tarball consumers.

## Increment 1 — current-main baseline and semantics
- [x] Reproduce Surface, Field, required Select and sparse Dialog audit cases on current main before repair.
- [x] Repair underlying contracts in core.tsx, controls.tsx, select.tsx; extend existing modal checks only where needed.
- [x] Verify native keyboard, descriptions, form validity/reset/disabled and modal containment/restoration.

## Increment 2 — authored knowledge and installed setup (independent ownership)
- [x] Add project/framework pattern schema, evidence/rules, compact entry, four task contracts and examples.
- [x] Build dist/guidance after dist cleanup; package exports and declaration pointers.
- [x] Separately build altitude CLI: preview/apply/remove setup, intent discovery, explanations, scoped diagnostics.
- [x] Verify two clients' official instruction mechanisms, preserve existing instructions, test idempotence/reversal.
- [x] Validate schemas, references, freshness, version and published resources.

## Increment 3 — workflow runtime
- [x] First test and implement edit record: shared errors, explicit validation, persistence, stale-response protection, dirty leave policy and feedback.
- [x] Then test and implement async collection, consequential action, review and submit using small hooks/components.
- [x] Include positive/negative types and runtime JavaScript fixtures.

## Increment 4 — installed consumer and presentation
- [x] Pack/install clean consumers; verify ESM/CJS/types/CSS/guidance/CLI and browser outcomes with controlled service state.
- [x] Automate meaningful accessibility/state, narrow/RTL/long-content/reduced-motion/forced-color checks; document manual AT matrix.
- [x] Author previews in build/previews.txt; update metadata and generate Storybook/site pattern presentation.
- [x] Preserve and extend CI, run existing checks and generated-artifact verification.

## Increment 5 — evaluation and delivery
- [x] Implement fresh-context three-condition harness with identical stabilized primitives; evaluator-only rubrics and failure injections.
- [x] Run 12-build pilot where supported, record exact tools/model/budgets and only observed results; identify unavailable dependencies. See `evals/framework/results/PILOT-2026-10-23.md`; manual AT, other engines and human studies remain unperformed.
- [x] Update installation/contribution/migration/release/validation records, review changes and repair findings. Pilot protocol confounds are recorded for the next run, not repaired in this PR.
- [x] Commit coherent increments, push feature branch and open/attach draft PR with evidence and unperformed checks (draft PR #11).

Ownership: semantic agent owns primitive source/regressions; knowledge agent owns project/framework and guidance/CLI scripts; runtime agent owns new pattern TSX/checks. Coordinator owns integration, evaluation, preview/site, CI and delivery. Shared index/package edits are coordinated. Rebuilds are serialized by coordinator.

## Next steps

The work in this PR is complete; what follows comes from the [2026-10-23 pilot](../../evals/framework/results/PILOT-2026-10-23.md). PR #11 stays a draft until a maintainer decides to merge. Filing an issue or finishing an item here does not authorise merging, publishing or a version bump.

1. **Fix the two protocol confounds before generating again.**
   - Allow the documented `npm exec -- altitude *` command in the Claude invocation in `evals/framework/run.mjs`, or make the setup text and the allowlist name the same command. Check by searching a fresh trace for `permission_denied`.
   - In `evals/framework/prepare.mjs`, rewrite the sentences in the guidance-only package's `edit-record.md` and `async-collection.md` that name runtime exports that condition omits. Add a preflight assertion that no guidance-only document names an omitted export.
2. **Freeze the assessor before generating.** Record its version and hash in the run metadata. Any later correction must be applied uniformly and reported as post-hoc, keeping the superseded reports.
3. **Extend the assessor.**
   - Exercise the follow-up features (the description field, sort, selected count) and the scenarios currently listed as unmeasured: invalid submission, dirty leave, first-use empty and out-of-order responses.
   - Report axe *incomplete* results.
   - Make EVAL-SELECTION check that counts are truthful.
   - Rename `accessibilityDefects` and `followupRegressions` so that `true` cannot be misread.
   - Settle or exclude the Card animation that left codex-settings-framework's saved-state scan unmeasured.
4. **Rerun the pilot with repeated samples per cell** to new evidence roots (never the 2026-10-23 ones). Reconsider the 180 s budget. Write reviews with `evals/framework/reviews/review-lib.cjs`.
5. **Library defect candidates, not yet filed.** File one issue each with the bug template if the person you are working for agrees:
   - Table: `.alt-table-tools` has no `flex-wrap`, so a full toolbar overflows at 320px (measured in claude-records-primitives).
   - Textarea: the counter renders "160 / 0" under RTL without bidi isolation (claude-settings-framework screenshot).
   - Checkbox: the `aria-hidden` track intercepts synthetic pointer clicks. Verify a real mouse click on the track before filing.
6. **Before any user-facing claim:** run the [manual validation matrix](MANUAL-VALIDATION.md) with a screen reader and keyboard, and test in non-Chromium engines. A representative participant study remains unperformed.
