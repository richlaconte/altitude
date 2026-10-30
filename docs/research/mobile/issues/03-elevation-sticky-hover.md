<!--
title: Elevation: hover lift sticks after a tap on touch screens
label: bug
template: .github/ISSUE_TEMPLATE/bug-report.md
-->

## What goes wrong

On a touch screen, tapping a pressable surface leaves it lifted one level (and in its hover colour) after it has done its job, until you tap somewhere else.

**Kind:** visual / elevation

## Where

| | |
|---|---|
| Component | every component with a `:hover` rule: `Button`, `Card interactive`, `Breadcrumb`, `Avatar` (pressable), `Tabs`, `Toggle`, menu items, `Tree` rows, `Board` cards, `ChartBrush` grips and others (98 rules in `bundle.css`) |
| Version | commit `f32b92b` (`package.json` 0.2.1), built from source |
| How it's loaded | design system previews |
| React | 18 (the preview harness's UMD build) |
| Browser and OS | Code reading plus Chromium via Playwright with `isMobile`/`hasTouch`. Sticky `:hover` after a tap is standard mobile Safari and Chrome behaviour. **Not checked on a physical device** |
| Schemes affected | all (not scheme-specific) |
| Modes affected | touch |

## Steps to reproduce

```sh
cd project/components
grep -c ':hover' bundle.css                         # 98
grep -c '@media (hover: hover)' bundle.css           # 0
```

1. On a phone, open the `Button` preview and tap "Preview" (a secondary button that doesn't navigate).
2. Lift your finger. The button stays at level 2 (`elev-2`, `surface-lifted`) until you tap elsewhere.

## Expected

`project/README.md`, law 4: "A surface lifts on hover only if clicking it does something … **Pressing returns it to ground**." "States": "Hover: +1 level. Press: down to 0." After a tap there's no pointer over the control, so nothing should say there is. `Elevation.md` already excludes touch from approach ("never for touch"); hover is the same kind of pointer-only signal.

Hover styles should apply only under `@media (hover: hover)` (constraint M3 in {{01}}). Keyboard focus keeps its one-level lift, since `:focus-visible` is independent.

## Actual

All 98 `:hover` rules apply on touch devices. The only `(hover: none)` rule in the file is `.alt-inline-edit-pencil` (`bundle.css`, one line), which makes a hover-revealed control visible on touch. That's the right idea, but there's nothing in the other direction.

## Suspected cause (optional)

Confident: the rules are written as plain `:hover`. Fix direction: wrap them in `@media (hover: hover) { … }` (the grouped form keeps the diff readable) and add a CSS lint to CI that fails on a bare `:hover` that changes `box-shadow`, `background`, `transform`, `translate` or `opacity`. `.alt-input:hover { border-color }` and similar hairline-only rules can stay bare if the maintainers prefer, as they don't carry height.

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found during a mobile design research pass (CSS audit of `bundle.css`).
