<!--
title: ChartContainer: set axis text as captions and y labels on their gridlines
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`ChartContainer` (it draws every chart's axes, gridlines and ground line).

## What you're trying to do

Put the frame's ink in Altitude's order: data, then the ground line and references, then gridlines, then axis text. Two things are out of order today.

1. **Tick labels are 12.5px weight 500** (`bundle.css:1490`). In Altitude's type rules, weight 500 is for labels on controls ("labels are 500, titles 600"), so axis text has the weight of something you press, and competes with the marks. Weight is meant to carry hierarchy before size does.
2. **Y labels take a gutter.** A fixed column at the left holds the y labels ("$1,000", "250 ms"), which costs a half-width card a noticeable share of its plot width. Placing each label on its gridline, at the left and just above it (the FT and Economist convention), lets the plot run the card's full width.

Gridlines themselves are already right: `line` is decorative and subtle, which is the "visible but subtle" band Stone & Bartram measured ([*Whisper, Don't Scream*, TVCG 2011](https://tableau.com/research/publications/whisper-dont-scream-grids-and-transparency)). A lighter grey is off the table anyway ("never invent an in-between gray"). Decluttering of this kind raised rated professionalism, with small effects ([Ajani et al., TVCG 2021](https://visualcognition.psych.northwestern.edu/publications/Ajani_Declutter_2021.pdf)); this issue is about hierarchy, not decoration.

## Today

- `.alt-chart-axis text { fill: var(--ink-muted); font: 500 12.5px/17px var(--font-sans); … }` (`bundle.css:1490`).
- The y axis reserves its labels' width at the plot's left (`chart.tsx`, frame layout).
- Ground line 1px `ink-muted` (unchanged by this issue: it's shared with `Stepper` and `Drilldown`).

## Proposal

```tsx
// No API needed for the weight. For the placement, an opt-in first:
<ChartContainer config={config} yLabels="inline">…</ChartContainer>   // 'gutter' (today) | 'inline'
```

- **Weight:** axis tick text 400, `ink-muted`, tabular figures, the caption scale (13px/19px, as `.alt-chart-desc`). This is a visual default change with no API.
- **`yLabels?: 'gutter' | 'inline'`**: `inline` sets each y label at the plot's left edge, sitting 2px above its gridline on a halo of the plot's colour (as reference labels are). The top label carries the unit ("250 ms"); the others carry the number only. Default stays `gutter` until a review decides.
- The ground line's label ("0") stays in the gutter or inline below the ground line, so the label never sits on the ground.

**Additive?** The placement is (opt-in). **The weight change is not:** it's a visual default change to every chart, with no API change and nothing to migrate. Worth it because it puts the frame back under the content rules; say so in the release notes.

## Elevation impact

None. All parts stay on the ground, flat.

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| Tick text | ground | 0 | text · none | unchanged |
| Inline y label | ground | 0 | text on a 3px halo of the plot's colour · none | unchanged |

## Motion and accessibility

- **Motion:** inline labels move with their gridlines on a rescale (`dur-travel-2`, Motion rule 2), entering and leaving with the ticks' cross-fade.
- **Contrast:** `ink-muted` at 13px weight 400 still clears 4.5:1 on all eight surfaces (README, Color), so the weight change keeps the gate. Recheck the halo against `data-*` where a label crosses a mark.
- **Forced colours:** `CanvasText`, as now.
- **Labels never sit on data:** an inline label that would overlap a mark at the plot's left edge drops behind the gutter fallback for that tick. Shares its collision logic with "ChartReference: labels and annotation plates are drawn over the marks they annotate".

## Done when

- [ ] Weight changed; `yLabels` implemented without changing existing placement
- [ ] `index.d.ts`, the ChartContainer README and `build/previews.txt` updated (one preview with `yLabels="inline"` in a half-width card)
- [ ] `Charts.md` "Every part, by its build" names the tick text's weight
- [ ] A short design review in `Research.md`: plot width gained at 360 and 960, label legibility in all four schemes
- [ ] `tsc` clean; `shoot.mjs` clean in all four schemes; `FORCED=1` and `contrast="more"` checked
- [ ] `node build.mjs && node previews.mjs` run and committed

## Alternatives considered (optional)

- **Thicker ground line in charts.** It would break the shared 1px ground line under `Stepper` and `Drilldown`.
- **Remove gridlines by default.** Gridlines are what you read position against; keep three or more, as E24 settled.

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte, from a chart design research pass (`docs/research/charts/`).
