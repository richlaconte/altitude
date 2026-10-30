<!--
title: New: DotPlot — compare values where zero isn't meaningful, with their spread
label: enhancement
template: .github/ISSUE_TEMPLATE/new-component.md
-->

## What it's for

Comparing a value across categories when zero isn't part of the story (p95 latency of ten services, all between 180 and 240ms), or when each value is an average with a spread (scores by team, with the 10th–90th percentile). It also covers before and after per category (a dumbbell: last quarter → this quarter).

`BarChart` can't do this job: it rightly always includes zero (Charts rule 2), which squashes differences of a few percent into identical bars. Bars of averages also carry a measured misreading: values inside the bar are judged more likely than values equally far outside it ([Newman & Scholl, *Psychon. Bull. Rev.* 19(4), 2012](https://www.sci.utah.edu/~kpotter/Library/Papers/newman:2012:WTBB/index.html)), and dot plots reduced that error ([Okan et al., *Q. J. Exp. Psychol.* 2018](https://doi.org/10.1177/1747021817744546)). `LineChart` is for change over time and implies continuity between categories. `ScatterChart` needs two measures. Without this form, people will reach for bars and either squash the data or truncate the axis, which Altitude forbids.

**Closest existing components:** `BarChart` (categories, but must stand on zero), `ScatterChart` (dots, but two measures), `LineChart`'s `band` (spread, but over time).
**Name:** `DotPlot` (shadcn/ui has no equivalent; the name follows Cleveland's dot plot).

## Elevation story

**What it is:** settled. The values are the record, flat on the ground.
**Signal it carries:** **Amounts**, as position (never height), on a scale that need not include zero. Because there's no zero, there's no ground line, as in `LineChart` when zero is off its axis ("the plot's foot is a gridline, not ground").
**Relatives it borrows from:** dots are `ScatterChart`'s (flat, ≥ 8px, ringed 2px in the plot's colour); the spread is `LineChart`'s uncertainty `band` (a flat low-opacity fill, after Correll & Gleicher, E37); rows are `BarChart` horizontal's category layout and label budget (E25); the readout, legend, table view and keyboard path are `ChartContainer`'s.

| Part / state | Tier | Level | Surface · shadow | Non-height cue (word, icon, ARIA state or border) |
|---|---|---|---|---|
| Row guide | ground | 0 | 1px `line` · none | the category label |
| Value dot | ground | 0 | flat `data-*` (or `data-1` for one series), 2px ring of the plot's colour · none | marker shape per series (as Scatter); name "Checkout, 212 ms" |
| Spread | ground | 0 | flat band, the series colour at 16%, `radius-full` · none | "10th–90th percentile 180 to 240 ms" in the readout and name |
| Dumbbell link (from → to) | ground | 0 | 2px `ink-muted` line · none | direction in words: "up 14 from Q2"; the "from" dot hollow, the "to" dot filled |
| Mark that acts, hovered | ground | 0 | 2px `ink` outline, pointer cursor | the action in the readout (E41) |
| Loading | sunk | −1 | an imprint of dots on rows (`surface-well`) | announced as loading |
| No data | sunk | −1 | `EmptyState` | says why and what to do |

## Motion

Uses `ChartContainer`'s engine. Rescale first (`dur-travel-2`), then dots glide to new values on `ease-glide` over `dur-travel-3`. Re-sorted rows are carried (FLIP), as `BarList` rows are. Nothing grows in on first render. A spread band glides with its dot. Under reduced motion, values change in place. Nothing rises, so the attention budget isn't touched except by live afterglows.

## Accessibility

**WAI-ARIA pattern:** the chart's existing one-Tab-stop path (E29): summary → series → points.
**Keyboard:** ↑/↓ between categories, ←/→ between series in a category (or from → to in a dumbbell), Home/End, Escape out.
**Screen reader:** the summary names the range, the highest and lowest, and the widest spread; each point says "Checkout, 212 ms, 10th–90th percentile 180 to 240 ms".
**Forced colours:** dots `CanvasText` with their marker shapes, band `GrayText`, link `CanvasText`.
**`contrast="more"`:** row guides `line-control`, as gridlines are.

## API sketch

```tsx
<ChartContainer config={{ p95: { label: 'p95', format: (v) => `${v} ms` } }}>
  <DotPlot data={services} x="service" y="p95" range={['p10', 'p90']} sort="desc" />
</ChartContainer>

// Before and after
<DotPlot data={teams} x="team" from="q2" to="q3" />
```

Props mirror `BarChart`'s where they mean the same thing (`sort`, `relevance`, `selected`, `onSelect`, `drill`, `tooltip`). `zero` defaults to false; `zero` true is allowed, though a bar chart is usually the better form then.

## Rules it strains (optional)

None directly. It needs one line in Charts.md's "Choosing a form": *Compare values where zero isn't meaningful, or averages with their spread → `DotPlot`.*

## Done when

- [ ] Source in `project/components/src/`, exported from `index.tsx`, its name added to `names` in `build/build.mjs`, declarations in `index.d.ts`
- [ ] A `bundle.css` section with a header comment explaining its elevation model
- [ ] `project/components/DotPlot/README.md` in the existing format (what it is, elevation, props, "You provide", do and don't)
- [ ] A section in `build/previews.txt` with an honest `@dsCard` group and subtitle
- [ ] A row in the signals table in `Elevation.md`; the form chooser row in `Charts.md`; new choreography (if any) in `Motion.md`; sources and a prototype review in `Research.md`
- [ ] `tsc` clean; `shoot.mjs` renders it in all four schemes with no page or console errors; also checked with `FORCED=1`, reduced motion and `contrast="more"`
- [ ] Keyboard paths checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed (CI fails otherwise)

## Open questions (optional)

- Should the dumbbell be its own component? Proposed as a mode of `DotPlot`, since the layout, keyboard path and spread are shared.
- Is a hollow "from" dot confused with a projected mark (E37 keeps a projection's outline)? Check in review.

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte, from a chart design research pass (`docs/research/charts/`).
