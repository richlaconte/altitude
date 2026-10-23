# ALT-01 · Dialog foundation

**Priority:** P1. **Status:** implementation-ready proposal; no upstream implementation implied. **Baseline:** `richlaconte/altitude` commit `a7bd408f97c874c517b9139aa8a35b88b685cff0`.

## Outcome and boundary

Make the existing modal machinery reliable, and let an individual Dialog keep its background stationary. Preserve Altitude's summit, scrim, elevation, focus language, and default appearance. This is an extension of Dialog and its shared internals, not a new dialog framework, anchored-dialog component, or transaction system. ALT-04 defines the destructive-action recipe; it does not introduce a `ConfirmAction` component.

Read `AGENTS.md`, root `README.md`, `project/README.md`, `project/Elevation.md`, and `project/Motion.md` before implementation. The ground remains the record; a stationary background does not make a modal nonmodal. The panel remains level 5, `surface-modal`/`elev-5`, with a title, modal semantics, and the existing forced-colors border. Do not change default themes, radii, sizes, shadows, or timing tokens.

## Evidence and inspected limitations

At the baseline, `core.tsx` stores a provider-local layer count; `useModal` in `overlays.tsx` increments it, assigns `body.style.overflow`, records focus, and increments a module-global summit count. Its cleanup follows `open`, while `usePresence` keeps the exiting panel mounted. Sheet and CommandPalette consume this machinery. Provider stages receive recession styling but no modal background isolation.

The Shift+Tab handler checks only the first tabbable element. A prototype reproduced escape when a dialog initially focused its non-tabbable title; a local fix was retested. Source inspection additionally identifies missing zero-tabbable handling, per-instance scroll restoration, and no shared inert ownership. These are reasons for targeted regression tests, not claims that every browser has demonstrated every failure.

[WAI-ARIA APG's dialog guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) supports contained focus, inert background, context-sensitive initial focus, and logical restoration when an invoker disappears. APG is guidance, not a conformance certification.

## Public contract

Add exactly two optional properties to `DialogProps`:

- `background?: 'recede' | 'stationary'`, default `'recede'`.
- `returnFocus?: () => HTMLElement | null`, a lazy fallback destination when the captured invoker is unavailable or cannot receive focus. It returns an element, not an imperative cleanup function.

Existing call sites retain their visual behavior. `AltitudeProvider recede={false}` remains an upper bound: a Dialog cannot force its stage to recede. With the default background, that provider setting continues to suppress stage scale/desaturation while retaining the existing scrim blur. `background="stationary"` suppresses stage scale/desaturation **and** backdrop blur; scrim opacity, modal behavior, and the panel's own rise remain unchanged. Reduced motion continues to use existing tokens.

Keep `initialFocus`, `focusSelector`, `dismissible`, `trigger`, and controlled/uncontrolled behavior. `initialFocus=false` suppresses selected-target autofocus, not containment: the panel is the safe fallback until the application places focus inside. Do not expose new registry, stack, queue, or focus-management APIs. `returnFocus` is optional for unchanged triggers; ALT-04 uses `returnFocus={() => listHeadingRef.current}` after deletion. The callback is evaluated at restoration, never at opening, and must return a connected, visible, non-inert element in the same document. A static heading must already have `tabIndex={-1}`.

## Shared ownership and nested providers

Extend the existing internal layer registration with stable owner identity, panel/root references, provider ancestry, modal/summit flags, and background policy. Keep coordination scoped by `ownerDocument`, with private reference-counted ownership of isolation and scroll state. This supports multiple providers without a public framework or cross-document globals.

Only the active modal owns focus containment and `aria-modal`. A permitted modal Sheet → Dialog transition suspends the Sheet's interaction, then resumes it when the Dialog finishes closing. CommandPalette competes for the same summit as Dialog. A Sheet requested beneath a summit must not autofocus or displace it. Nonmodal Sheets acquire no modal lock or recession vote.

Preserve documented one-summit use. Unsupported simultaneous controlled summit requests must produce a development warning and cannot create two interactive modal owners: the first accepted owner retains control; reject the competing open attempt until that component receives `open=false` and a fresh open request. Do not queue it or open it later automatically. Palette selection that opens a Dialog is an explicit handoff: an owner whose `open` became false may transfer its retained exit lease to the incoming summit. Retire its exiting root before admitting the Dialog, without briefly unlocking the page or restoring background focus. Preserve the palette's current callback ordering; do not defer every command until an exit animation finishes.

Each provider tracks its own registered layers rather than a blind count. Its stage recedes only for an owned modal request and if its own `recede` permits it; nested providers retain their existing independent settings. The top active modal's stationary policy suppresses recession and blur for participating lower modal layers, so a parent Sheet cannot keep blurring the background. Closing that Dialog restores the Sheet's existing policy. A provider stage containing the active portal is never transformed or made inert as a whole; isolate sibling branches along the portal's ancestry instead. Preserve the nearest provider's theme and portal host. A modal in a nested themed region blocks the rest of the document, not just that region, without double-scaling an ancestor containing the panel.

## Isolation and lifecycle

Capture the invoker before applying library-owned isolation. The convenience trigger supplies its actual element; controlled opening captures the document's active element before locks are acquired. Once the portal is ready, move focus inside and isolate other branches before the next paint. Do not require applications to add their own competing `inert` wrapper.

Walk from the active modal root toward `body`, isolating sibling branches and unrelated layer roots while retaining the active root and its ancestors. Native `inert` blocks pointer, keyboard, and programmatic focus entry; use a document `focusin` guard as containment recovery. Do not rely on `aria-hidden`, a Tab listener, or a transparent scrim alone. Never inert an ancestor containing the active panel. Reconcile newly inserted background branches while a modal is active. Treat the scrim as part of the owner; retain dismissal behavior.

Track original inert attribute presence/value for each touched element and restore it only on that element's final library release. Do not clear pre-existing application inertness. The document's first modal lease snapshots the inline overflow value and priority; the last release restores them. Intermediate closes cannot unlock a remaining modal. Clean up listeners, observers, timers, and leases exactly once under Strict Mode replay, rapid reopening, route unmount, and provider unmount. Avoid restoring an old value over an independently changed style.

An ordinary close retains isolation, scroll lock, and summit ownership through the existing exit interval. Do not leave an interactive transparent panel after release. Reopening during exit cancels release and reuses ownership. Unmount releases immediately; cleanup must work even when its DOM nodes have already disappeared. A handoff transfers ownership without a release/reacquire gap.

After release, prefer a newer active modal. Otherwise preserve focus already moved to a connected, visible, non-inert element outside the retiring panel; body is not such a destination. If restoration is needed, try the captured invoker, then `returnFocus()`, then the nearest surviving provider stage as a neutral fallback. Temporarily make that stage focusable if necessary and restore its original tabindex. If the entire provider vanished, permit the document fallback. Restore background availability before focusing; an old close cannot steal focus from a newer modal or an application's completion destination.

## Focus, toast, and destructive behavior

For a readable structured Dialog, preserve `initialFocus="title"`; Tab reaches the first control and Shift+Tab reaches the last. Recalculate eligible tabbables when handling navigation: exclude hidden, disabled, inert, and negative-tabindex elements. With none, keep focus on the panel and prevent Tab escape. Containment also covers script-driven focus and removed focused controls. Escape requests dismissal once; when `dismissible=false`, it changes nothing. IME composition Escape must not accidentally dismiss an editing dialog.

ALT-04 uses the existing `focusSelector` to focus Cancel, announces the specific object and irreversible consequence, keeps asynchronous failure inside the dialog, and supplies a removed-invoker fallback. A failed action must not close the dialog or restore background focus.

Toasts retain their visual position above the scrim, as Elevation requires, but background toast Undo/Dismiss controls cannot steal modal focus or mutate background data. While a modal owns the document, make the external toast subtree inert, pause its expiry timers, and route its announcement text to a noninteractive live region inside the active modal, avoiding duplicate announcements. Restore normal toaster operation after final release. Do not make the toaster an additional interactive modal island. Essential action-specific errors belong inside the Dialog.

## Acceptance and D2 demonstration

- [ ] **MOD-01:** Omitted `background` preserves baseline visuals in all four schemes; provider `recede=false` remains respected.
- [ ] **MOD-02:** Stationary mode removes recession/desaturation and every participating modal scrim's blur, while preserving dimming, level 5, and keyboard/pointer isolation.
- [ ] **MOD-03:** Field, title, Cancel, panel-only, and dynamically removed focus targets stay contained in both Tab directions; IME Escape does not dismiss.
- [ ] **MOD-04:** Existing invoker, removed invoker fallback, application-placed focus, and subsequent-modal ownership restore correctly.
- [ ] **MOD-05:** Nested providers, newly mounted background controls, and toast actions cannot bypass isolation; original inertness survives.
- [ ] **MOD-06:** Close, exit/reopen, unmount, Strict Mode, and Sheet → Dialog handoff leave no leaked locks/styles/listeners or premature unlock.
- [ ] **MOD-07:** Palette shortcuts cannot steal an occupied summit; explicit palette handoff works; competing controlled requests warn and require reset, never queue.
- [ ] **MOD-08:** Nonmodal Sheet still permits page interaction and scrolling, has no scrim/recession/trap, and closes from inside without stealing focus from a later modal.
- [ ] **MOD-09:** D2 shows the same familiar file list with default and stationary Dialog examples. Delete names the file, initially focuses Cancel, returns to its invoker on cancellation, and to the heading after deletion. A developer-only control exercises inline failure and unmount. No extra user-facing workflow vocabulary.

## Files, build, and regression delivery

Change `project/components/src/core.tsx` for provider registration; `overlays.tsx` for Dialog, shared lifecycle, and Toaster; `sheet.tsx` and `command.tsx` only for ownership integration; `project/components/bundle.css` for scoped stationary styling. Update the exact DialogProps declaration and comments in `project/components/index.d.ts`; source props generate npm `dist/types/overlays.d.ts`. Update Dialog, AltitudeProvider, Sheet, CommandPalette, and Toaster READMEs where their contracts changed. Add D2 to the Dialog section of `build/previews.txt`; never hand-edit generated preview HTML or Storybook stories.

Create `build/checks/modal-lifecycle.mjs` using the existing Playwright-core/`CHROME` conventions. First reproduce the title-focus defect and add lifecycle assertions corresponding to MOD-01–08. Exercise React 18's generated bundle, 320px/desktop viewports, four schemes, reduced motion, and forced colors. Add React 19 runtime coverage through a separately bundled fixture; type-checking alone is insufficient for inert differences. Assert expected development warnings explicitly; fail on unexpected page/console errors or warnings.

Run build-kit typecheck, `node build.mjs`, `node previews.mjs`, and `node shoot.mjs Dialog,Sheet,CommandPalette,Toaster daylight,nightfall,mesa,alpine 960`; then `node checks/modal-lifecycle.mjs` and existing interaction checks. Add the new check to `.github/workflows/ci.yml` after preview rendering, including React 19 fixture execution. Run root `npm run typecheck`, `npm run build`, and `npm run build-storybook`. Commit regenerated `project/components/bundle.js` and previews; the existing source-sync CI must remain clean. Record manual screen-reader checks for names, initial focus, live announcements, and restoration separately from automated results. Passing this checklist is not a comprehensive accessibility certification.
