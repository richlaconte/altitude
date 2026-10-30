<!--
title: ChartReference: labels and annotation plates are drawn over the marks they annotate
label: bug
template: .github/ISSUE_TEMPLATE/bug-report.md
-->

## What goes wrong

In the `ChartReference` preview, reference labels and `ChartAnnotation` plates are placed on top of the line or bar they refer to, so they hide the data they're there to explain.

**Kind:** visual / elevation

## Where

| | |
|---|---|
| Component | `ChartReference`, `ChartAnnotation` (laid out by `ChartContainer`) |
| Version | commit `1da13e5` (`package.json` 0.2.1), built from source |
| How it's loaded | design system preview (`build/previews.txt`, section `ChartReference`) |
| React | 18 (the preview harness's UMD build) |
| Browser and OS | Chromium via `build/shoot.mjs`, macOS |
| Schemes affected | daylight checked at 2×; nightfall checked at 1×, same placement. Mesa and alpine not checked |
| Modes affected | none checked beyond the default |

## Steps to reproduce

```sh
cd build && DPR=2 node shoot.mjs ChartReference daylight 960
# open test/shot-ChartReference-daylight.png
```

1. Look at the "Uptime" card: the "DNS outage" plate sits on the uptime line where it dips, and "Target 99.9%" is drawn across the series line.
2. Look at "Accessibility score": the "Bar 75" label sits on the Search bar's end.
3. Look at "p95 latency": the series line crosses "Average 162.5 ms" at its Apr 15 peak.

## Expected

The labels say what the data is read against without covering it. `Charts.md`, "Signals a chart can carry", "Read against": references "lie flush with the marks … Their words are laid out together so they never overlap" (E38). The rule only covers labels overlapping each other, but the readout already follows the stronger principle: "Never over the point. It opens on whichever side of the point has room, so it never hides the value it's reading" (Research.md, E27). Annotation plates are "flush at the top of the plot with a 1px `line-control` leader" (Elevation.md, "Read against"), which implies the plate is above the data and the leader reaches down to it.

If the intended rule is "labels never cover marks", it's a gap in Charts.md rule 8 and E38, and worth adding there too.

## Actual

- "DNS outage" plate: covers about 40px of the uptime line around Mar 14–15, including the drop the annotation is about.
- "Target 99.9%": its 3px halo cuts the series line where they cross.
- "Normal range": the series line runs through the label.
- "Bar 75": drawn over the top bar (Search, 92), its halo cutting a notch out of the bar's fill. That's a mark that no longer reads as flat ink of its true length.
- "Average 162.5 ms": the series line crosses the label.

Screenshot: `build/test/shot-ChartReference-daylight.png` (DPR=2). No page or console errors.

## Suspected cause (optional)

Not traced. The frame's reference layout (`RefGeo` and `NoteGeo` in `project/components/src/chart.tsx`, around line 612) nudges labels and plates apart from each other, but nothing suggests it tests them against the marks' geometry. Low confidence until someone reads the layout code. A likely fix direction: reserve a plate row above the plot's top edge (the leader already exists to reach down), and try a label's other end or the opposite side of its line before accepting a spot that intersects a mark.

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found while auditing the chart previews for a design research pass.
