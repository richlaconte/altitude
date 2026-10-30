<!--
title: ScatterChart: the trend's label is drawn over a dot
label: bug
template: .github/ISSUE_TEMPLATE/bug-report.md
-->

## What goes wrong

In the `ScatterChart` preview with `trend`, the "Trend" label at the line's end is drawn on top of the right-most Media triangle, so that dot is partly hidden.

**Kind:** visual / elevation

## Where

| | |
|---|---|
| Component | `ScatterChart` |
| Version | commit `1da13e5` (`package.json` 0.2.1), built from source |
| How it's loaded | design system preview (`build/previews.txt`, section `ScatterChart`) |
| React | 18 (the preview harness's UMD build) |
| Browser and OS | Chromium via `build/shoot.mjs`, macOS |
| Schemes affected | daylight checked at 2×; nightfall not checked for this |
| Modes affected | none checked beyond the default |

## Steps to reproduce

```sh
cd build && DPR=2 node shoot.mjs ScatterChart daylight 960
# open test/shot-ScatterChart-daylight.png, "Latency against payload" card, top right
```

1. The preview renders `<ScatterChart … trend>` with 30 endpoints in three services.
2. The trend line ends near (400 KB, 290 ms); its "Trend" label is placed at that end.

## Expected

The trend's word doesn't hide a record. Research.md E43: "Labels find room … Each label now tries six spots … The trend's word counts as taken." That makes the trend's word an obstacle for outlier labels, but the word itself isn't placed clear of the dots. Charts.md's scatter row says overlapping dots are "ringed 2px in the plot's colour so overlaps stay apart", which is the intent that every dot stays legible.

## Actual

The "Trend" text and its halo sit over the last triangle at about (395 KB, 288 ms), clipping its left half. The dot can still be reached by pointer and keyboard (not re-checked), but it can't be seen whole.

Screenshot: `build/test/shot-ScatterChart-daylight.png` (DPR=2). No page or console errors.

## Suspected cause (optional)

Not traced. Probably the trend label is placed at a fixed offset from the line's end before outlier labels are laid out, with dots never treated as obstacles for it. Low confidence.

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found while auditing the chart previews for a design research pass.
