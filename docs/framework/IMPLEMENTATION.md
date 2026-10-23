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

Steps 1–3 and 5 were done on 2026-10-23, after the pilot. Steps 4 and 6 remain.

1. **Done — the two protocol confounds.**
   - The Claude allowlist (`claudeAllowedTools` in `evals/framework/protocol.mjs`) now includes `npm exec -- altitude *`. A harness test fails if the setup text or agent docs name an altitude command the allowlist denies. In a fresh workspace, a single Claude Code probe that ran `npm exec -- altitude doctor --json` had no `permission_denied` under the new list. The old list denied the same command.
   - `evals/framework/guidance-rewrites.json` replaces every guidance-only sentence that names an omitted runtime export or reference snapshot. That covers all four pattern documents, not just the two found in the pilot. Preparation fails if a listed sentence drifts or an omitted export is still named, and preflight asserts the same on the installed package.
2. **Done — the assessor is frozen.** `run.mjs` records the assessor's version and SHA-256 (`evaluator/frozen.mjs`) in each `run.json` and `summary.json`. `assess.mjs` sets `postHoc: true` when it runs under a different fingerprint and still keeps superseded reports.
3. **Done — the assessor is extended** (assessor 2.0.0, protocol 1.1.0).
   - New scenarios: invalid submission, unsaved edits on leave (keep, then discard), out-of-order query responses and first-use empty. The final stage also checks the follow-up features: the description saved and shown on the overview, name sort in both directions, and a selection count that must equal the selected rows.
   - axe *incomplete* results are reported per state.
   - The metrics are renamed to `axeScanPassed`, `keyboardPassed` and `followupPreserved`. New metrics are `adverseStates` and `followupFeatures`.
   - Finite animations still running after 3 s are finished and named, not left unmeasured.
   - Not re-validated against real generated apps: the new selectors have been tested only on fixture apps. Expect selector adaptation on the first rerun, and report it as post-hoc.
4. **Rerun the pilot with repeated samples per cell** to new evidence roots (never the 2026-10-23 ones). Reconsider the 180 s budget. Write reviews with `evals/framework/reviews/review-lib.cjs`.
5. **Done — library defect candidates**, each checked against `main` at `8a4b675` in Chromium:
   - Table: filed as [#26](https://github.com/richlaconte/altitude/issues/26). At 320px the toolbar measures 530px and the document 546px.
   - Textarea: not filed. The counter's text is "0 / 160". In an RTL paragraph, normal bidi layout places the count at the right ("160 / 0" read left to right), which an RTL reader reads as "0 / 160". Isolating it as LTR would reverse that for RTL readers. Revisit only if an RTL-language reviewer says otherwise.
   - Checkbox: not filed. A real mouse click at the centre of the `aria-hidden` track toggles the checkbox, because the track is inside the `<label>`. Only Playwright's actionability check reports that the track "intercepts pointer events". Automation should click the label or use the keyboard.
6. **Before any user-facing claim:** run the [manual validation matrix](MANUAL-VALIDATION.md) with a screen reader and keyboard, and test in non-Chromium engines. A representative participant study remains unperformed.
