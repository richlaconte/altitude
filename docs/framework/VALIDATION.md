# Framework validation record

This unreleased change was developed against main `8a4b6752080928c50836da1e0979c28b894ed3a1` on 2026-10-23. The earlier research audited `a7bd408f97c874c517b9139aa8a35b88b685cff0`; current main already included the Actions in place/modal ownership fixes. The [semantic record](SEMANTICS.md) distinguishes reproduced defects from the already-correct Dialog case.

## Deterministic engineering evidence

The following commands passed locally on macOS with Node 26.5.0. GitHub CI (Node 24, Linux) passed on the implementation commit `d2ba0a0` in run [39994727602](https://github.com/richlaconte/altitude/actions/runs/39994727602); later commits are reported in the PR. After the pilot, `npm run check:framework` also passed locally under Node 24.18/npm 12.0.2. npm 12 returns `pack --json` keyed by package name, so the pack-based checks and `evals/framework/prepare.mjs` now accept both output shapes.

| Check | Observed coverage |
| --- | --- |
| `npm run check:framework` | Primitive semantics: 33 assertions each with React 18 and 19. Four workflow contracts: 46 assertions against source and again against the installed tarball. Positive/negative TypeScript contracts. Guidance schema/reference/version/freshness checks. Two installed CLI adapters. Deterministic evaluation harness and browser-evaluator tests. |
| Packed consumer, included above | Fresh install; ESM/CommonJS runtime and NodeNext ESM/CommonJS/Bundler declarations; CSS, font/token resources, IIFE, guidance and executable CLI. Controlled service data verifies actual outcomes. |
| Accessibility, included above | 29 axe scans across meaningful initial, invalid, failed, saved, no-results, review and completed states; all four themes, 320px width, RTL, long content, reduced motion and forced colors. Error-summary keyboard navigation. |
| `npm run typecheck`; `npx tsc -p build/tsconfig.json` | React 19 source and React 18 build-kit types. |
| `node scripts/check-actions-package.mjs` | Existing ESM/CommonJS/IIFE exports, declaration agreement and rejection of invalid API examples. |
| `npm run build`; `npm run build-storybook`; `npm run build-site` | Package, 49 stories/11 guide entries and landing page build successfully. |
| `node build.mjs && node previews.mjs` from `build/`, followed by `git diff --exit-code -- project` at root | Generated bundle and previews match authoritative source. |

The preserved interaction suite also passed: approach/lamps (37), field focus (16), avatar (24), React 18 modal lifecycle (123), inline edit (157), Actions in place (106); React 19 modal lifecycle (162), inline edit (157), Actions in place (141); StrictMode modal lifecycle (162) and inline edit (157). Every generated preview rendered in all four schemes at 960 CSS px without page/console errors. InlineEdit, Dialog, ActionsInPlace and all four new workflow previews also passed DPR 2 rendering in all four schemes at 320px and in forced colors at 960px.

Browser checks used Playwright Chromium 130.0.6723.31. The primitive suite additionally passed against installed Chrome 155.0.8059.86 with React 18 and 19. These are Chromium-family results, not evidence for other rendering engines.

## Cost and scope

`node scripts/measure-framework.mjs` emits exact sizes to `build/test/framework-sizes.json`. The minified IIFE grew from 115,333 bytes (37,027 gzip) at the baseline to 127,345 bytes (40,776 gzip): **3,749 additional gzip bytes**. There are no new runtime dependencies. Guidance and the separately built Node CLI are outside the browser graph. The separately packaged CLI is 9,717 bytes (3,403 gzip); installed guidance totals 181,048 bytes including reference snapshots. The compact installed entry is 2,213 bytes; the focused edit-record guide is 5,556 bytes. These byte counts are not model-token estimates.

The framework enforces its own interaction contracts: validation and error navigation, explicit operation outcomes, duplicate/stale-response protection, query identity and selection policy, and deliberate review/confirmation transitions. Applications supply real persistence, authorization, business validation, concurrency/idempotency, router/Back integration, durable recovery and actual undo adapters. A callback that falsely reports success cannot be validated by a UI hook.

## Evaluation and unperformed validation

The [evaluation harness](../../evals/framework/README.md) compares identical stabilized primitives under three framework conditions, with ordinary product briefs and private evaluator failures/rubrics. Live generation is excluded from CI. Generation/build success is recorded separately from executed task outcomes and independent source review. Pilot findings refine the protocol; one run per cell cannot establish effectiveness.

The corrected 12-build pilot ran on 2026-10-23 with `gpt-5.6-sol` (Codex CLI 0.149.1) and `claude-opus-5-5` (Claude Code 2.1.309), 180 s per generation and follow-up. Results, defects and limits are in the [pilot report](../../evals/framework/results/PILOT-2026-10-23.md):

- Eleven runs completed with passing follow-up builds. claude-records-framework exhausted its budget; its build of the partial work passed, but it had no follow-up.
- Executed defects appeared in four runs: contrast in two Codex settings apps, 320px overflow in two Claude primitives apps, and one concurrent second write.
- Independent AI review found further source-only defects in every condition.
- The pilot also found protocol confounds that must be fixed before any comparison: the Claude allowlist denied the documented `npm exec -- altitude` command, and the guidance-only docs name runtime exports that condition omits.
- The assessor was corrected twice after outcomes were visible, uniformly across all runs, with earlier reports preserved.

No representative participant study, manual screen-reader session, full cross-browser review, touch-device study or complete WCAG conformance audit was performed. RTL and long content exercise layout resilience; they do not validate translated terminology. Follow the [manual validation matrix](MANUAL-VALIDATION.md) in a consuming application's real workflows before making user-facing accessibility or usability claims.
