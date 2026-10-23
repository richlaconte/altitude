# Foundational semantics regression record

The four audit cases were reproduced against current `main`, commit `8a4b6752080928c50836da1e0979c28b894ed3a1`, before changing their implementation. The independent browser fixture used the checked-out source, React 18.3.1, and Google Chrome 155.0.8059.86. The initial 22 assertions produced **10 passes and 12 failures**. Assertions include supporting cases as well as the four original reports.

| Audited case | Observed on current main | Change |
|---|---|---|
| Default interactive Surface, Enter and Space | Focusable div did not activate and had no button role | Preserve the default element; supply button semantics and Enter/Space activation for non-native action surfaces. Preserve native button/link behavior. |
| Field with hint, error, external description | Hint ID pointed to an unrendered node; external description IDs were replaced | Render hint alongside error, merge/deduplicate existing description IDs, remove error ID when cleared. Preserve child `required` unless Field explicitly supplies it. |
| Empty required Select and form.checkValidity() | Form was valid; hidden input did not participate in validation | Native hidden select supplies required validity, form data and disabled exclusion. Invalid events focus the visible trigger, mark it invalid and link actionable required feedback. Uncontrolled reset restores the declared default; controlled state remains application-owned. |
| Sparse Dialog, initial panel focus then Shift+Tab | Already correct: focus moved to Close and stayed inside the modal | No modal ownership changes. Keep the regression to protect the existing Actions in place fixes. |

## Reproduce

```sh
node build/checks/semantics.mjs
ALT_REACT19=1 node build/checks/semantics.mjs
```

`CHROME=/path/to/chrome` optionally selects an installed browser; otherwise Playwright's installed Chromium is used. The check creates and removes its own temporary source bundle and HTML; it does not depend on generated previews or rewrite committed build outputs. React 18 is resolved from `build/node_modules`; React 19 from root `node_modules`. Source CSS and token CSS are included so pointer/focus checks exercise real styling.

After repair and edge-case expansion, **33/33 assertions pass** in the cached Chromium 130 with React 18, and in Chrome 155 with React 18 and React 19. Root source typechecking also passes. The additional cases cover Space release timing, native button/link single activation, descendant controls, consumer `preventDefault`, disabled activation (including anchors without callbacks and context-menu destinations), localized required-error announcements and their clearing on selection/reset, description deduplication, reset defaults and cancellation, application-owned controlled reset, explicit empty options, unnamed required selects, disabled form submission, background isolation, invoker restoration, and a Dialog with no tabbable controls.

An additional test-first case found that an explicitly empty Select option after non-empty options is not treated as a native required placeholder. The native proxy now always puts its empty option first; the custom option presentation retains the supplied order.

## Contracts and remaining scope

Use a native button for one action and a native link for navigation. Do not put other interactive elements inside either; a complex card needs separate named actions. The compatible default Surface uses button semantics only when `interactive` and `onClick` are supplied; explicitly different roles remain the caller's responsibility.

Required Select validation uses a localizable `requiredMessage` (default “Choose an option.”). It preserves caller description IDs and defers to a supplied Field error to avoid a duplicate announcement. `disabled` anchors omit their destination while retaining link semantics.

The native Select proxy is hidden from the visual and accessibility trees; its visible button and listbox remain the accessible interaction. Native constraint validation is engineering coverage, not a claim of assistive-technology usability. The checks are Chromium-based; human screen-reader testing and other browser engines remain unperformed here. Combobox form semantics are outside these four audited repairs.

The existing `build/checks/modal-lifecycle.mjs` remains the broader authority for modal ownership, nested providers, deleted invokers, overlays and stationary backgrounds. This work preserves that implementation and adds the sparse-dialog regression only.
