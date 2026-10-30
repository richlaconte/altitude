<!--
title: BarChart, LineChart: read each value against a previous period
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`BarChart` and `LineChart`. They change together because "against the previous period" is one prop with one meaning, and the readout, table and summary wording are shared through `ChartContainer`.

## What you're trying to do

Show each value against what it was before: this month's revenue by region against last month's, this week's latency against last week's. Most dashboard questions are comparisons ([Bach et al., *Dashboard Design Patterns*, TVCG 2023](https://arxiv.org/abs/2205.00757)). `Stat` already says "vs last month" in words, but its neighbouring charts can't show it.

Gleicher names three comparison designs: juxtapose, superpose, or explicitly encode the difference ([*Considerations for Visualizing Comparison*, TVCG 2018](https://pages.graphics.cs.wisc.edu/VisSnacks/papers/comparison)). This proposes superposition for the shape and explicit encoding for the number. The workarounds today are a second series, which competes as an equal and takes a categorical colour, or per-bar `ChartReference` lines, which can't be per-category.

In Altitude's terms this is the record read against the record before it. Both are settled, so both lie flat on the ground; the earlier one is quieter.

## Today

`BarChart` (`project/components/src/bar-chart.tsx:5`) and `LineChart` have no comparison prop. References (`ChartReference`) are single values or bands across the whole plot.

## Proposal

```tsx
<BarChart data={regions} x="region" y="revenue"
  compare={{ key: 'revenueLastMonth', label: 'August' }} />

<LineChart data={latency} x="t" y="p95"
  compare={{ data: lastWeek, label: 'Last week' }} />
```

- **`compare?: { key?: string; data?: ChartDatum[]; label: string }`**: the previous value comes from a field on the same record (`key`) or from records matched by x position (`data`, for a shifted period on a time axis).
- **Bars:** the previous value is a 2px `ink` tick across the bar, 4px wider than it on each side, at the previous value's position: the comparative measure of Few's bullet graph (*Bullet Graph Design Specification*, 2006). A value that fell shows the tick above the bar's end, so the drop is visible as empty space.
- **Lines:** the previous period is a 1.5px solid `ink-muted` line under the series, without points, labelled at its end in `ink-muted` ("Last week"). It's solid, because dashed means projected (E37).
- **Explicit difference, in words:** the readout adds "August 2,180 · +10.6%"; each point's accessible name adds "up 10.6% from August"; the table gains a "vs August" column; the generated summary says how many rose and fell.
- Previous values join y's extent, so a tick or trace is never off the plot.

**Open questions, to settle in review:**

1. **Trace vs reference line.** A reference line is a 1px solid `ink-muted` straight line (E38); the trace is 1.5px `ink-muted` but follows the data. Is shape plus label enough to tell them apart, or should the trace use `line-control`?
2. **Tick vs hover outline.** Marks that act get a 2px `ink` outline on hover (E41). A 2px `ink` tick across the same bar should be checked side by side with it.
3. **Stacked bars.** Compare the total only (a tick at the stack's top), or each segment? Propose total only.

**Additive?** Yes.

## Elevation impact

No tier or level changes. Two new flat marks.

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| Comparison tick (bars) | ground | 0 | flat 2px `ink` · none | readout row, point name "up/down n% from …", table column |
| Comparison trace (lines) | ground | 0 | flat 1.5px `ink-muted` line · none | end label in words; readout row; table column |

## Motion and accessibility

- **Motion:** ticks and traces are marks; they glide with the data on `ease-glide` over `dur-travel-3`, after any rescale (Motion, Charts rules 1–2). A trace follows rule 5: it morphs only when x is the same, and cross-fades otherwise.
- **Keyboard:** no new stops; the comparison is part of each point's name.
- **Forced colours:** the tick is `CanvasText`, the trace `CanvasText` at 1px. Neither may be dotted (dotted means pending under forced colours).
- **Reduced motion:** values change in place.

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, both READMEs and their `build/previews.txt` sections updated, with one preview each
- [ ] `Elevation.md` **Amounts** row and `Charts.md` "Signals a chart can carry" gain "Read against the record before"
- [ ] A design review in `Research.md` (four schemes, 960 and 360, forced colours, `contrast="more"`), answering the open questions
- [ ] `tsc` clean; `shoot.mjs` clean in all four schemes; keyboard names checked with `ACT`; `checks/chart-motion.mjs` passes with comparison marks
- [ ] `node build.mjs && node previews.mjs` run and committed

## Alternatives considered (optional)

- **A ghost bar beside each bar** (paired bars). It doubles the bars, and a hollow bar reads as "projected" (E37's projection keeps its outline).
- **Only a delta label per bar.** Explicit but shapeless, and it crowds small charts. It's available through the readout and table instead.

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte, from a chart design research pass (`docs/research/charts/`).
