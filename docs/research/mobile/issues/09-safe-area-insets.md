<!--
title: Toaster, SaveBar, Sheet: fixed layers ignore the safe-area insets
label: bug
template: .github/ISSUE_TEMPLATE/bug-report.md
-->

## What goes wrong

Layers fixed to the screen's edges are offset by a plain `space-*` value. In a page that uses `viewport-fit=cover` (any installed PWA, any edge-to-edge app), they sit under the iPhone home indicator, the notch, or the rounded corners.

**Kind:** visual / elevation

## Where

| | |
|---|---|
| Component | `Toaster`, `SaveBar`, `Sheet` (all sides), `Tour`, the `AltitudeProvider mode` frame, `Dialog` and `CommandPalette` roots (one family: every `position: fixed` layer) |
| Version | commit `f32b92b` (`package.json` 0.2.1), built from source |
| How it's loaded | design system previews |
| React | 18 (the preview harness's UMD build) |
| Browser and OS | Code reading. **Not observed on a device** (Chromium has no notch or home indicator to emulate) |
| Schemes affected | all |
| Modes affected | `viewport-fit=cover` on iOS; Android with gesture navigation and edge-to-edge |

## Steps to reproduce

```sh
cd project/components && grep -c "safe-area-inset" bundle.css     # 0
grep -n "position: fixed" bundle.css
```

1. In an app with `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, open it on an iPhone with a home indicator.
2. Make a change so `SaveBar` appears (`bottom: var(--space-4)`), or show a toast (`bottom: var(--space-6)`).
3. The bar's buttons sit in the home-indicator zone, where a swipe goes home instead of pressing.

## Expected

Constraint M9 in {{01}}: fixed layers add `env(safe-area-inset-*)` to their edge offset. `env()` resolves to 0 without `viewport-fit=cover`, so pages that don't opt in are unaffected.

## Actual

| Layer | Rule | Line |
|---|---|---|
| `Toaster` | `right: var(--space-6); bottom: var(--space-6)` | `bundle.css:847` |
| `SaveBar` | `bottom: var(--space-4)`; `max-width: calc(100vw - 32px)` | `:1542` |
| `Sheet` | `--edge: var(--space-2)` on every side | `:2091` |
| mode frame | `position: fixed; inset: 0; border: 2px` | `:1399` |
| `Tour` | fixed, clamped to 8px from `innerWidth`/`innerHeight` | `bundle.css:1670`, `tour.tsx:57` |

## Suspected cause (optional)

Confident. Fix direction: `bottom: calc(var(--space-4) + env(safe-area-inset-bottom, 0px))` and the matching left/right/top. For `Sheet`, pad the scroll area and footer rather than moving the whole sheet, so its rounded corner still meets the screen's. The mode frame should probably stay at the physical edge (it frames the whole viewport), with its strip padded instead. Add a "Safe area" note to `Mobile.md` saying apps need `viewport-fit=cover` to opt in.

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found during a mobile design research pass (CSS audit).
