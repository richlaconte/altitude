# InlineEdit: saving when leaving the complete editor

Research and design decision for [#615](https://github.com/richlaconte/altitude/issues/615), 7 November 2026. Source baseline: `4378c0c8533ec771ccc3322fa1d7aca6c339c951`. Authority: contextual interaction policy; existing accessibility and persistence contracts still apply. Owner: Altitude maintainers. Human effectiveness remains unmeasured.

## Evidence and limits

The issue records a personal 5/5 preference for saving when leaving a field and a preference for full feedback beside that field. These are local simulated comparisons, not a study of production use or proof that all editors should autosave. [#485](https://github.com/richlaconte/altitude/issues/485) deliberately excluded saving from its cancel-on-leave policy. Source inspection confirms an existing guarded submit path, draft/baseline retention, canonical publication, conflict recovery, popup ownership and focus-return logic. Reusing these mechanisms avoids a second persistence implementation.

Primary sources checked on 7 November 2026:

- [WCAG 2.2, On Input](https://www.w3.org/WAI/WCAG22/Understanding/on-input.html): changing content is not necessarily a change of context. Automatic persistence is not categorically forbidden, but unexpected navigation or focus changes are a different matter. Design implication: explain the trigger, keep explicit actions, and do not move focus on leave completion. This is an interpretation of the criterion, not a WCAG mandate to autosave.
- [UI Events, focus events](https://www.w3.org/TR/uievents/#events-focusevent): focusout bubbles and identifies the receiving target through relatedTarget. Document/window focus is distinct from movement inside a page. Design implication: test ownership of both ends, and ignore a missing destination rather than treating window blur, disabling or removal as permission to write.
- [UI Events, composition events](https://www.w3.org/TR/uievents/#events-compositionevents): composition has its own start/end lifecycle; keyboard events alone do not reliably describe it. Design implication: suppress automatic leave saves during composition, including owned portalled editors. Finishing composition itself is not a save trigger; a later intentional leave or explicit Save is required.
- [Pointer Events, activation dispatch](https://www.w3.org/TR/pointerevents3/#the-click-auxclick-and-contextmenu-events): click activation is a separate event from pointerdown/up, with target rules spanning the gesture. Design implication: do not collapse/reflow the editor during the outside press. Defer automatic submission until that activation has been dispatched, without preventing the event. A canceled touch scroll is not a completed activation.
- [HTML, focus processing](https://html.spec.whatwg.org/multipage/interaction.html#focus): focused elements can disappear or become ineligible independently of a person choosing to leave. Design implication: queued work is session-scoped and canceled on unmount/window blur; disabling never initiates persistence.
- [WCAG 2.2, Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html): status can be conveyed through semantics without taking focus. Design implication: retain one polite progress/success status outside busy content and the existing local error alert, with recovery still in normal Tab order.

## Alternatives

| Approach | Benefit | Cost / decision |
| --- | --- | --- |
| Continue application-authored Input/Surface autosave | Complete product control; suitable for document editors | Repeats InlineEdit draft, baseline, validation and conflict handling for every short field. Remains valid, but does not solve this issue. |
| Save on input blur or change the default | Small implementation | Breaks toolbar/picker ownership and established explicit/cancel policies; intermediate composition and repeated boundary events are unsafe. Rejected. |
| Add `leave="save"` to the complete editor boundary | Reuses the established session and submission contract; additive | Requires activation ordering and adversarial focus/portal tests. Chosen. |

## Contract

`keep` remains the default and `cancel` remains unchanged. `save` submits one changed eligible draft through the existing validator and onSave. Unchanged drafts close without a write. Save, Enter, Cancel, Escape and on-choose retain their roles. The editor includes actions, toolbars and associated popup subtrees named by aria-controls/aria-owns. Keyboard departure waits until focus has moved; outside pointer/touch activation runs before a submission can change the layout. No event is canceled or retargeted.

Only dispatched writes are pending. Validation is not persistence. Rejected drafts retain their original baseline, full local error and explicit retry. The same rejected value cannot be retried by another boundary crossing; a changed value may be attempted automatically. Neither accepted data, failure nor conflict takes focus back after an automatic leave save. Application adapters still own revision checks, authorization, reconciliation of uncertain outcomes and writes completing after unmount. This feature is unsuitable for navigation that immediately unmounts the editor: unmount never causes a new write.

No elevation tier or motion changes. The existing ground value, sunk editor, pending surface, failure trench and accepted afterglow remain. A visible save-on-leave instruction and named progress/error semantics make the trigger and outcome independent of height.

## Implementation plan

1. Extend the deterministic InlineEdit harness with leave-save cases; run against the baseline and observe failure because leave-save is absent.
2. Add the opt-in type and boundary handling; feed the existing submit path, preserve active-session/generation guards, and suppress automatic focus return.
3. Verify internal actions and portalled/nested popup ownership, keyboard and pointer/touch, canceled gestures, window blur/removal/unmount, composition, unchanged and rejected drafts, asynchronous validation, synchronous layout changes and conflict completion.
4. Add a controlled preview with a slow write, known rejection, explicit retry and a next field; update canonical guidance, hand-maintained declarations and generated outputs. Bump the minor version.
5. Run React 18, React 19 and StrictMode interaction suites, type checks, package checks, both-scheme renders, 320px/reduced-motion/forced-color/contrast review and an ACT interaction. Record exact engineering evidence below; do not call it participant evidence.

## Validation record

Local engineering validation completed on 7 November 2026 with Chromium **157.0.8103.38**, React **18.3.1** and **19.3.0**, DPR 2. Participant evaluation, real operating-system IME exercise, screen-reader testing and cross-engine testing have not been run.

| Check | Observed result |
| --- | --- |
| `CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node build/checks/inline-edit.mjs` | 283 assertions passed against generated React 18 previews, no page/console errors |
| `node scripts/build-check-fixtures.mjs InlineEdit`, then the same check with `ALT_FIXTURE_ROOT="$PWD/build/test/react19"` | 283 assertions passed against React 19 production |
| `ALT_CHECK_STRICT=1 node scripts/build-check-fixtures.mjs InlineEdit`, then the same check with `ALT_FIXTURE_ROOT="$PWD/build/test/react19-strict"` | 283 assertions passed against React 19 development StrictMode |
| `npm run typecheck`; in `build/`, `npx tsc -p tsconfig.json` | Passed |
| `npm run build`; `node scripts/check-actions-package.mjs`; `npm run check:guidance` | Package exports/declaration parity and 16-pattern/42-rule/217-file guidance schema/reference/version/freshness checks passed |
| `node build/checks/examples.mjs` | 122 examples have zero public API errors; the existing check reports 190 non-gated literal-inference diagnostics |
| In `build/`: `node build.mjs && node previews.mjs`; `CHROME=… DPR=2 node shoot.mjs InlineEdit daylight,nightfall 960` | Generated outputs committed; both renders had no browser errors |
| Both-scheme `shoot.mjs` with `ACT` editing Release label, continuing in Next note, awaiting one confirmed write and checking canonical text/focus | Passed; the new preview uses a controlled in-memory service, not a live server |
| `CHROME=… PHONE_FAIL=M1,M2-24,M6 node checks/phone.mjs InlineEdit` in `build/` | No overflow, targets below 24px or touch text below 16px at 320/375px; advisory 44px touch-target findings remain |

The interaction suite includes normal, reduced-motion, forced-color and increased-contrast checks in both schemes. The new leave-save error/retry matrix uses 320px, checks visible instruction association and busy/status semantics, waits for existing motion, and verifies the complete error fits its surface. Screenshots are generated at `build/test/alt-05/leave-save-<scheme>-<mode>-320.png`; selected normal and forced-color captures were visually inspected. These checks establish engineering behavior, not that assistive-technology announcements were heard or understood.

The new LS-02 test first failed against the baseline because leave-to-save was absent. Adversarial follow-ups also reproduced and fixed explicit Escape focus return after an automatic failure, a no-click gesture suppressing subsequent Tab departure, and custom-editor autofocus stealing focus after a folded pending write reopened. Existing tests now wait for the committed disabled state and actual read phase; merely seeing an Edit button also matched the folded pending view.

Custom editor focus is an explicit request: `InlineEditControl.autoFocus` is now a boolean, true for intentional entry/recovery and false for a background reopening. Normal consumers spreading the control need no change. A custom adapter that assumed the previous literal `true` type or hardcoded autofocus must accept/honor the boolean to preserve focus. Both declarations document it, and actual React portals are exercised in both runtimes (the React 19 fixture exposes `createPortal` for this).

Broader regression check: `CHROME=… node build/checks/actions-in-place.mjs` reported **115 passed, four failed** on the local browser. All four are existing CON-09 immediate visibility checks after opening a consequence dialog. Replacing only the fixture bundle with unchanged main `4378c0c` and running `ALT_FIXTURE_ROOT="$PWD/build/test/baseline615" ALT_ACTIONS_CASE="accessible mode"` reproduced the same four failures (**17 passed, four failed**). No unrelated runtime or test change is included. The PR's exact-head CI is the separate record of canonical-runner results.

An independent source/test review found no blocking findings. The preference motivating this capability remains contextual; no human effectiveness or universal autosave claim follows from these checks.
