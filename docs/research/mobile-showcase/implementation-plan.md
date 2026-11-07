# Mobile promotional showcase implementation plan

**Goal:** Give narrow-screen visitors three purposeful touch-friendly demos while preserving the wide workbench.

**Architecture:** A responsive site boundary mounts either the mobile showcase or the existing Workbench. Mobile tabs compose shipped components under the existing provider. All data is local and resettable; scene state survives tab/theme changes, while breakpoint changes deliberately reset it.

**Stack:** React, TypeScript, existing Altitude components/CSS, esbuild, Playwright checks.

## Work

1. Record baseline: build site, type-check `site/`, run `site/workbench-state.test.mjs`; inspect the current homepage at phone width. Add a failing browser assertion that a compact viewport leads with the Book tab and contains no Board.
2. Add `site/mobile-showcase.tsx` and its layout CSS: booking picker, bottom-sheet review, local receipt; preference controls and result; existing resilient note edit. Export/reuse WritingScene and the cancellable demo delay instead of maintaining duplicate behavior. Preserve state between mobile tabs and guard late async results on reset.
3. Add `site/showcase.tsx`: choose the showcase at 640px, cancel/unmount the outgoing family, recover focus only when it was inside that family (including its sheet), and announce resets. Integrate it in `site/main.tsx`; register CSS in `scripts/build-site.mjs`. Adjust only necessary mobile intro/toolbar spacing.
4. Create `scripts/check-site.mjs` to test actual outcomes, mobile width matrix, touch targets, keyboard controls, mode changes, sheet dismissal/unlock, retained edits, reset cancellation, scheme, reduced motion/forced colors, and desktop regression. Run it after the landing build in CI; include the site TypeScript project and existing site state test there.
5. Build and visually inspect phone, sheet, narrowest width, nightfall, and desktop screenshots. Compare baseline/output sizes; correct layout based on evidence. Record verification and remaining device checks in `validation.md`.
6. Independently review the diff for design/spec compliance, lifecycle/accessibility risks, and test quality. Resolve actionable findings, rerun affected checks, commit, push, and open the requested PR against `main`.

## Review criteria

One active showcase family, one provider, no custom component reimplementation, no hidden portalled modal, no real booking/notification side effects, no horizontal page overflow, labelled ≥44px touch controls, clear failure recovery, unchanged desktop task behavior, and research claims traceable to primary sources or repository evidence.
