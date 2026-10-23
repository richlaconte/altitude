# Altitude Actions in place implementation plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a reusable InlineEdit, reliable and optionally stationary Dialog behavior, two executable interaction recipes, and demonstrations that make their value understandable.

**Architecture:** Extend Altitude’s existing components and depth signals. Keep persistence and reversibility in application adapters. Add no action registry, global draft workflow, Undo provider, or public confirmation wrapper.

**Tech stack:** Existing React 18/19 TypeScript sources, CSS/tokens, esbuild, generated previews/Storybook, Playwright-core build checks. No new runtime dependency is planned.

**Status:** All implementation tasks below are open. The existing standalone Files prototype is a behavioral reference, not the completed library integration. This plan targets the inspected `a7bd408f97c874c517b9139aa8a35b88b685cff0` baseline, also the remote `main` observed on 23 October 2026. Reconcile later changes before implementation.

## Chunk 1: Library behavior

### T01 — Establish regression fixtures and runtime coverage

**Depends on:** none. **Specs:** ALT-01/02/05. **Owner role:** library engineer.

**Files:** create `build/checks/modal-lifecycle.mjs`, `build/checks/inline-edit.mjs`, `build/checks/fixture-path.mjs`, and `scripts/build-check-fixtures.mjs`; modify `build/SETUP.md`, existing modal sections in `build/previews.txt`, and `.github/workflows/ci.yml`.

- [ ] Record the checkout SHA and read repository guidance; compare its source/API against the spec baseline. Capture existing default Dialog screenshots before changing presentation.
- [ ] First add minimal canonical existing-Dialog/Sheet/CommandPalette/Toaster regression scenes in build/previews.txt. InlineEdit registration and its minimal scene are owned by T04; ActionsInPlace’s minimal scene is owned by T06. Add named assertions for current focus/isolation defects and the proposed behavior. Use the existing runner conventions: failed assertions and page/console errors produce a nonzero exit; assertions identify the corresponding MOD/IE criteria.
- [ ] Make new checks resolve their HTML root through `ALT_FIXTURE_ROOT`, defaulting to the existing `build/test/` folder resolved from the helper module location, not the caller’s working directory. No changes to existing checks’ default behavior are needed.
- [ ] Add a root-run `scripts/build-check-fixtures.mjs` that consumes the same relevant JSX sections from `build/previews.txt` and bundles them with root React 19 and the source component index. Generate only ignored test assets under `build/test/react19/`, with the same `p-<Name>-daylight.html` names used by the new checks. Accept an optional comma-separated section list. T01 requests only the existing Dialog, Sheet, CommandPalette and Toaster scenes. After T08, the required default list is InlineEdit, Dialog, ActionsInPlace, Sheet, CommandPalette and Toaster; missing explicitly requested/default sections fail clearly. No duplicated handwritten examples. Pin react, react-dom/client and JSX runtime resolution to the root installation using root-resolved aliases or a root-based virtual entry; generated entries under build/test must never pick up build-kit React 18. Assert the rendered runtime major is 19, use the same AltitudeProvider/tokens/CSS wrapper as the normal preview, and emit separate development StrictMode fixtures when ALT_CHECK_STRICT=1 under build/test/react19-strict/. Include a default-provider scene and explicit nested-provider cases rather than accidentally double-wrapping every example.
- [ ] Run each new assertion before implementation and record its meaningful failure; a missing file alone is not evidence that a behavioral regression is covered.
- [ ] Register the new runtime checks in CI after their corresponding fixture generation. Upload build/test/alt-05/results.json, report.md and relevant screenshots with an always-running artifact step, alongside the existing failed-render screenshot upload, so success and failure evidence survives CI. Assert React 19 runtime behavior separately from typechecking.

**Done:** failing behavioral tests/fixtures are reproducible, generated from canonical sources, and the CI route is explicit. Do not merge deliberately failing checks without their dependent implementation.

### T02 — Implement modal isolation, lifecycle and focus ownership

**Depends on:** T01. **Spec:** ALT-01. **Owner role:** library engineer.

**Files:** modify `project/components/src/core.tsx`, `overlays.tsx`, `sheet.tsx`, `command.tsx`, and `build/checks/modal-lifecycle.mjs`. A focused private helper file may be introduced if needed, but no public layer-manager export.

- [ ] Implement owned isolation and scroll cleanup, preserving original state and nested-provider portal ancestry.
- [ ] Implement eligible-focus traversal, title/panel fallbacks, IME handling, invoker capture, removed-invoker recovery, and no focus theft from later owners.
- [ ] Keep locks through exit; handle reopen, handoff, unmount and Strict Mode without leaked or premature releases.
- [ ] Integrate existing Sheet, CommandPalette and Toaster behavior according to MOD-05–08; retain nonmodal Sheet behavior.
- [ ] Run `node checks/modal-lifecycle.mjs` from `build/` against generated fixtures. Require MOD-03–08 to pass before considering the shared foundation complete.

### T03 — Add per-Dialog stationary presentation

**Depends on:** T02. **Specs:** ALT-01/04. **Owner role:** library engineer.

**Files:** modify `project/components/src/overlays.tsx`, `core.tsx`, `project/components/bundle.css`, maintained `project/components/index.d.ts`, and relevant component READMEs.

- [ ] Add exactly the proposed optional Dialog props, `background` and `returnFocus`; preserve default presentation and existing provider `recede=false` behavior.
- [ ] Apply scoped stationary styling and provider ownership; no global CSS override of every scrim.
- [ ] Add the presentation-comparison portion of D2 to the existing Dialog section in `build/previews.txt`, with identical task content and modality.
- [ ] Verify MOD-01/02 and the presentation portion of MOD-09 in four themes and the supported motion/contrast modes; compare the unchanged default against the baseline capture.
- [ ] Regenerate artifacts and update source and maintained declaration documentation together. MOD-09’s complete deletion/failure experience closes at T07–T09, not at this presentation-only task.

### T04 — Build InlineEdit behavior and its public contract

**Depends on:** T01; may run in parallel with T02/T03 in an isolated branch. **Spec:** ALT-02. **Owner role:** component engineer.

**Files:** create `project/components/src/inline-edit.tsx`; modify source `index.tsx`, maintained `project/components/index.d.ts`, `project/components/bundle.css`, `build/build.mjs` names, and the new minimal InlineEdit section in `build/previews.txt`.

- [ ] Establish the minimal canonical InlineEdit scene and public export/registration before its behavioral tests need to render it. Add tests for controlled ownership, canonical result publication, no-change Save, validation, double submission, failure, external changes and unmount before implementing each path. Expand the same scene in T05, without creating a second fixture source.
- [ ] Implement the exact API/state contract from ALT-02 using Field/Input/Button and existing depth signals.
- [ ] Implement keyboard/IME behavior and focus restoration without saving on blur or trapping page navigation.
- [ ] Verify no second persistence write, no overwritten external value, no late callback after unmount, and no focus theft.
- [ ] Run `node checks/inline-edit.mjs` with React 18 fixtures and then React 19 fixtures. Require IE-01–07 to pass.

### T05 — Document and register InlineEdit with its two consumers

**Depends on:** T04. **Specs:** ALT-02/05. **Owner role:** component/docs engineer.

**Files:** create `project/components/InlineEdit/README.md`; modify `build/build.mjs` names, `build/previews.txt` InlineEdit section, source type exports and maintained declarations as needed.

- [ ] Add D1’s task-title and independent table-cell examples using the actual exported component; include all required props in copyable code. Add the harness-only dialog-rename baseline with the same save adapter/fixtures for the planned formative comparison.
- [ ] Add validation, delayed save, failed save and conflict examples through the external fixture harness.
- [ ] Document the persistence adapter contract, cancellation limits, fallback focus and supported single-line scope.
- [ ] Generate bundle/previews; verify the IIFE global, ESM/CommonJS package exports and emitted types expose InlineEdit consistently.
- [ ] Complete D1-specific IE-08/09 checks and the D1 demo criteria. Their D4 integration and whole-package evidence remain open until T08/T09.

## Chunk 2: Application recipes and demonstrations

### T06 — Implement the act-and-recover recipe

**Depends on:** existing components; can start after T01. **Spec:** ALT-03. **Owner role:** application/docs engineer.

**Files:** create `project/ActionsInPlace.md`, `build/checks/actions-in-place.mjs`; modify `build/previews.txt` ActionsInPlace section, Alert and Toaster READMEs, and CI.

- [ ] Create the minimal canonical ActionsInPlace section before its tests/builders consume it. Add deterministic versioned service fixtures and assertions for immediate archive, confirmed Undo and durable Restore.
- [ ] Add targeted reconciliation, duplicate suppression, out-of-order responses, operation-keyed Alert dismissal, conflict and uncertain-outcome tests before their implementations.
- [ ] Build the composition using existing Alert/Button APIs; amend the narrow ongoing-recovery exception in Alert guidance.
- [ ] Verify standalone REC behavior and the focused D3 experience; REC-11’s D4 coverage and final generated documentation integration close in T08/T09. Keep persistence code visibly application-owned.

### T07 — Implement the confirmation recipe

**Depends on:** T03/T06; shares the example fixture with T06. **Spec:** ALT-04. **Owner role:** application/docs engineer.

**Files:** modify `project/ActionsInPlace.md`, Dialog README, `build/previews.txt` Dialog/ActionsInPlace sections and the two relevant checks.

- [ ] Add target-ID/revision, presentation-session identity, pre-dispatch cancellation, duplicate confirmation, pending-close, focused-invoker removal, failure/retry and uncertain-outcome assertions.
- [ ] Compose the Dialog with a named target, explicit consequence, Cancel focus and removed-invoker fallback.
- [ ] Keep pending requests owned outside the dialog; prove close does not falsely cancel or later steal focus.
- [ ] Complete the standalone CON behavior and D2 recipe; defer D4 portions of CON-09/10 to T08/T09. Add no ConfirmAction runtime export.

### T08 — Complete the integrated example and documentation navigation

**Depends on:** T05/T06/T07. **Spec:** ALT-05. **Owner role:** docs/demo engineer.

**Files:** modify `build/previews.txt`, `scripts/stories.mjs`, `.storybook/preview.tsx`, root `README.md`, `project/README.md`, `project/Elevation.md`, and `project/ActionsInPlace.md`.

- [ ] Finish D4 in the same ActionsInPlace source as D3. Its ordinary Files screen uses shared InlineEdit and Dialog; no forked keyboard or focus implementation.
- [ ] Keep scenario controls outside the product scene and add reset, fixtures and source links as specified. Include a non-demo production-style default.
- [ ] Register Actions in place in the guide generator and `pageDocs` mapping; link the existing patterns guide instead of creating duplicate component guidance.
- [ ] Add Patterns to Storybook’s explicit navigation order. ActionsInPlace has a Patterns story but no runtime component/export entry.
- [ ] Update the design guide with the decision rule and its relationship to existing elevation signals. Do not redefine the meaning of ground/pending or introduce a new depth tier.
- [ ] Generate all previews/stories and verify the actual resulting routes, links, frame heights and `#files` selection.

### T09 — Complete automated, visual and accessibility verification

**Depends on:** T08. **Spec:** ALT-05 DEM-07/08. **Owner role:** QA/accessibility engineer.

- [ ] Run the exact validation sequence below; preserve meaningful evidence and fix failures before broadening the checks.
- [ ] Complete each critical task at 320 CSS pixels, actual 200% browser zoom, keyboard only, touch only, reduced motion, increased contrast, forced colors and all four schemes.
- [ ] Run screen-reader task checks using VoiceOver/Safari and a Windows screen reader/browser combination. Record unavailable combinations as outstanding work, not passes.
- [ ] Record browser/AT versions, checked fixture IDs, failures and resolutions in the validation report. Add a concise retained summary at project/ActionsInPlaceValidation.md linking the CI artifact or attached manual evidence; exclude participant identifiers and raw personal notes. Do not infer full accessibility conformance from a green automated suite.

### T10 — Validate understanding and decide on later abstractions

**Depends on:** T09. **Spec:** ALT-05 DEM-09/10. **Owner role:** design/research lead.

- [ ] Run the specified six to eight formative sessions with counterbalanced baselines; include access needs and realistic similar filenames.
- [ ] Review wrong-target actions, lost input, cancellation/recovery failures, focus failures and repeated state confusion. Fix observed blockers and repeat affected tasks.
- [ ] Publish findings and the accept/revise decision beside the spec completion record. Structural click counts are not measured performance.
- [ ] Evaluate the gated EditRegion/ConfirmAction/useAction candidates against two actual consumer needs; record “defer” if the evidence does not justify a shared API. Their absence does not block this release.

## Validation commands and expected evidence

Commands below are **planned implementation checks**, not checks already run on this specification package. Run from the named directory; do not edit generated output to make a check pass.

**Repository root, once:**

```sh
npm ci
npm ci --prefix build
```

**From `build/`, after changes:**

```sh
npx tsc -p tsconfig.json
node build.mjs
node previews.mjs
npx playwright-core install chromium
mkdir -p test
cp node_modules/react/umd/react.production.min.js node_modules/react-dom/umd/react-dom.production.min.js test/
python3 tokcss.py ../project/tokens.json test/tokens.css
DPR=2 node shoot.mjs "" daylight,nightfall,mesa,alpine 960
node checks/approach-and-lamps.mjs
node checks/field-focus.mjs
node checks/avatar.mjs
node checks/modal-lifecycle.mjs
node checks/inline-edit.mjs
node checks/actions-in-place.mjs
DPR=2 node shoot.mjs InlineEdit,Dialog,ActionsInPlace daylight,nightfall,mesa,alpine 320
DPR=2 FORCED=1 node shoot.mjs InlineEdit,Dialog,ActionsInPlace daylight 960
```

The three new checks must explicitly test reduced motion and increased contrast, async fixtures and focus/state outcomes; `DPR=2` is image density, not browser zoom. Existing checks remain required because shared modal changes can affect existing controls.

**Repository root:**

```sh
node scripts/build-check-fixtures.mjs
ALT_FIXTURE_ROOT="$PWD/build/test/react19" node build/checks/modal-lifecycle.mjs
ALT_FIXTURE_ROOT="$PWD/build/test/react19" node build/checks/inline-edit.mjs
ALT_FIXTURE_ROOT="$PWD/build/test/react19" node build/checks/actions-in-place.mjs
ALT_CHECK_STRICT=1 node scripts/build-check-fixtures.mjs
ALT_FIXTURE_ROOT="$PWD/build/test/react19-strict" node build/checks/modal-lifecycle.mjs
ALT_FIXTURE_ROOT="$PWD/build/test/react19-strict" node build/checks/inline-edit.mjs
npm run typecheck
npm run build
npm run build-storybook
npm run build-site
```

Expected: every command exits 0; behavioral assertions pass without unexpected console/page errors; every preview is generated and reachable. Once intended source/generated changes are committed, rerun generation and `git diff --exit-code -- project` from root: no differences. New files must also be tracked; an empty diff alone does not prove untracked outputs were included.

## Completion and handoff

- [ ] All applicable MOD, IE, REC, CON and DEM criteria have evidence or an explicit unresolved gap; code tasks alone do not mark the demonstrations complete.
- [ ] Commit source and regenerated `project/` outputs together in reviewable work packages; do not commit `build/test`, `.storybook/generated`, local credentials or node_modules.
- [ ] Add a release note explaining InlineEdit, the optional Dialog props, the shared focus fixes and the recipe docs, including behavior changes relevant to existing consumers.
- [ ] Re-run the source-sync check and inspect API/type exports. Package is ready for maintainers’ normal release process; version bump, npm publication and deployment are not tasks authorized by this specification-writing request.

ALT-01 and ALT-02 may be implemented independently; both must land before the final integrated demo. T06 and T07 share the ActionsInPlace preview and guide, so sequence their edits or coordinate file ownership. Avoid parallel edits to the shared source index, preview catalog or CSS bundle without an integration owner.
