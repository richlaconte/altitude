<!--
title: LineChart, AreaChart: index series to a common base, or read them as change
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`LineChart` and `AreaChart`, with the frame's y axis and generated summary in `ChartContainer`. They change together because the rebasing is done once in the frame and both types draw its result.

## What you're trying to do

Compare how two measures of different scale moved: signups (hundreds) against revenue (hundreds of thousands), or three regions' growth from the same start. Charts rule 6 forbids a second axis and names the answer: "indexed to a common base". There's no way to do it today; authors pre-compute, and the axis then says "118" with nothing saying what 118 is. The FT, the Economist and Datawrapper all offer "indexed, start = 100" and "% change" as one switch on a line chart.

## Today

y is always the series' values, linear, with zero included unless `zero={false}` (`chart.tsx`, `ChartContainerProps.zero`, `yDomain`). `stack="expand"` is the only re-reading, and only for stacks.

## Proposal

```tsx
<ChartContainer config={config} data={rows} x="month" yMode="indexed" base="2026-01">
  <LineChart data={rows} x="month" />
</ChartContainer>
// yMode: 'value' (default) | 'indexed' | 'change'
```

- `yMode="indexed"` divides each series by its value at `base` (default: the first x) and draws it ×100. The y axis says "Index, Jan 2026 = 100" once at its top (inline label, E103's unit rule), a reference line at 100 is the ground line's peer, named "Jan 2026 = 100", and the readout shows both the index and the value ("118 · $104K").
- `yMode="change"` draws the percentage change from `base`; the axis says "% change from Jan 2026"; zero is the ground line.
- The generated summary says the mode first ("Indexed to January 2026.") and reads trends from the indexed values; the table view keeps the values and adds the indexed column.
- A `ChartScope` can carry one `yMode` for every chart in it. An optional `Tabs`-style control (`modes`) in the frame lets the reader switch, the way `views` switches chart and table; it's a choice, so it's built like segmented Tabs, and the switch cross-fades the plot as a rescale does.

**Additive?** yes. Without `yMode`, nothing changes.

## Elevation impact

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| Indexed or change line | ground | 0 | flat series colour | the axis's unit and the readout's two figures |
| The base line (100, or 0) | ground | 0 | 1px `ink-muted`, as the ground line | "Jan 2026 = 100" label |
| The mode control (optional) | sunk + raised | as `Tabs` segmented | as `Tabs` | `aria-pressed` / tab state; the axis label changes |

## Motion and accessibility

Switching mode is a rescale then a glide (Motion, Charts 2); across a `base` change the lines glide to their new places on the same x. Under reduced motion, in place. The summary and each point's name say the mode and both figures ("Mar 2026, Signups, index 118, 1,954. Up 4% from Feb."). Forced colours and `contrast="more"` unchanged.

## Out of scope

Log scales (a separate reading, worth its own issue if asked for). Indexing bars: a bar's length must be its value (rule 2).

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, the `ChartContainer`, `LineChart` and `AreaChart` READMEs and their `build/previews.txt` sections updated (signups against revenue, indexed; three regions as % change)
- [ ] `Charts.md` rule 6 links the build; `Motion.md` ("Charts") notes the mode switch
- [ ] `tsc` clean; `shoot.mjs` clean in both schemes; the mode switch checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed

## Alternatives considered

A second y axis with distinct colours. Rejected by rule 6 and Isenberg et al. (in Research.md). Pre-computing in the app: loses the axis's words and the readout's second figure, which are the point.
