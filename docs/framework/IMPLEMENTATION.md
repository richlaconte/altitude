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
- [ ] Run 12-build pilot where supported, record exact tools/model/budgets and only observed results; identify unavailable dependencies.
- [ ] Update installation/contribution/migration/release/validation records, review changes and repair findings.
- [ ] Commit coherent increments, push feature branch and open/attach draft PR with evidence and unperformed checks.

Ownership: semantic agent owns primitive source/regressions; knowledge agent owns project/framework and guidance/CLI scripts; runtime agent owns new pattern TSX/checks. Coordinator owns integration, evaluation, preview/site, CI and delivery. Shared index/package edits are coordinated. Rebuilds are serialized by coordinator.
