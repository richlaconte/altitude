<!--
title: CI: render every preview as a phone and check overflow, target size and field text
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`build/` (a new `checks/phone.mjs`, and `shoot.mjs` options), `build/previews.txt`, and `.github/workflows/ci.yml`. Part of the mobile work ({{01}}, constraints M1, M2, M6).

## What you're trying to do

Catch phone regressions the way CI already catches scheme and forced-colour ones. Today a component can ship with a page-wide horizontal scroll, 15px tap targets or 14px field text, and nothing fails.

## Today

`shoot.mjs` takes a width (`node shoot.mjs Name daylight 375`) but opens a desktop page: no `isMobile`, no `hasTouch`, so `(pointer: coarse)` and `(hover: none)` never match and touch events can't be sent. Nothing measures overflow, target size or field font size.

Six previews also hard-code desktop widths, so at 375px they overflow because of the preview, not the component, and can't show how the component behaves on a phone: `Await` (`.card { width: 440px }`), `Skeleton` (`width: 420px`), `Stepper` (`grid-template-columns: 300px 1fr`), `Contrast` (two fixed columns), `CommandPalette` (`.find { width: 280px }`), `Signals` (four-column tiles).

## Proposal

```sh
# shoot.mjs: MOBILE=1 opens a context with isMobile, hasTouch and touch emulation
MOBILE=1 DPR=2 node shoot.mjs Tabs daylight 375

# checks/phone.mjs: every preview at 320 and 375, isMobile + hasTouch; exits non-zero on a failure
node checks/phone.mjs            # or: node checks/phone.mjs Tabs,Select
```

For each preview, `phone.mjs` fails on:

- **M1**: `documentElement.scrollWidth > innerWidth`, or a visible element past the right edge that isn't inside an `overflow-x` scroll container (reporting the outermost offender and its class);
- **M2**: an interactive element (`button`, `a[href]` not inline in prose, inputs through their `.alt-input` frame, checkboxes and switches through their label, `[role=button|tab|option|menuitem|checkbox|radio|switch|slider|treeitem]`, `summary`, `[tabindex="0"]`) whose hit box is under 24×24, or under 44×44 when the context has `hasTouch` (warn first, fail once {{02}} lands);
- **M6**: a text field whose computed `font-size` is under 16px with `hasTouch`.

A `phone-ignore` attribute in a preview section (with a reason) suppresses a known exception, as CONTRIBUTING asks for scoped suppressions. The six previews above get a `max-width` instead of a `width`.

A prototype of this check produced the numbers in {{01}}: 129 previews, 14 overflowing, 951/1,076 targets under 44px, 279 under 24px, 23 previews with sub-16px fields. It's about 120 lines and runs in about two minutes.

**Additive?** yes. CI gains a job; nothing in the package changes.

## Elevation impact

None.

## Motion and accessibility

None directly. The check enforces WCAG 1.4.10 (reflow at 320px) and 2.5.8, and the coarse-pointer target in M2. It doesn't certify accessibility (`framework/principles.md`: "A passing scan is not a conformance claim").

## Done when

- [ ] `MOBILE=1` in `shoot.mjs`, documented in `build/SETUP.md`
- [ ] `checks/phone.mjs` with the three checks and a suppression attribute
- [ ] The six previews no longer hard-code desktop widths
- [ ] CI runs it (as warnings until the child issues of {{01}} are fixed, then as failures), wrapped in `scripts/record-check.mjs`
- [ ] `node build.mjs && node previews.mjs` run and committed

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found during a mobile design research pass. The prototype script was run from `build/` against commit `f32b92b`.
