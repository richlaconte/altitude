<!--
title: ChartTooltip: the crosshair is line-control, the Charts guide says ink-muted
label: bug
template: .github/ISSUE_TEMPLATE/bug-report.md
-->

## What goes wrong

The crosshair is drawn in `line-control`, but the Charts guide says it's a 1px `ink-muted` rule. One of them is wrong.

**Kind:** visual / elevation

## Where

| | |
|---|---|
| Component | `ChartTooltip` (the crosshair drawn by `ChartContainer`) |
| Version | commit `1da13e5` (`package.json` 0.2.1), built from source |
| How it's loaded | source read; not a rendering difference that needs a screenshot |
| React | n/a |
| Browser and OS | n/a |
| Schemes affected | all (it's the token, not a scheme) |
| Modes affected | none; forced colours already uses `CanvasText` |

## Steps to reproduce

```sh
grep -n "alt-chart-crosshair" project/components/bundle.css
grep -n "crosshair" project/Charts.md project/Elevation.md
```

1. `project/components/bundle.css:1896`: `.alt-chart-crosshair { stroke: var(--line-control); … }`. The comment above it (line 1888) also says "1px line-control".
2. `project/Charts.md`, "Every part, by its build": "The crosshair | ground | a 1px `ink-muted` rule".

## Expected

The guide and the stylesheet agree. Charts.md is the stated source for each part's build.

## Actual

They disagree. Which is right is a design call. `line-control` holds 3:1 against every ground (README, Color) and is lighter, so it competes less with a 1px reference line, which is `ink-muted` (E38). Keeping the crosshair lighter than a reference line, which is something to read against, seems deliberate, which would make the guide the one to fix.

## Suspected cause (optional)

The CSS comment matches the code, so the guide probably wasn't updated when the crosshair was tuned in E27. Medium confidence.

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found while auditing the chart docs against the stylesheet for a design research pass.
