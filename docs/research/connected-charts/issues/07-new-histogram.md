<!--
title: New: Histogram — how values are spread, with every bin named
label: enhancement
template: .github/ISSUE_TEMPLATE/new-component.md
-->

## What it's for

Show how a set of values is spread: request latencies, order sizes, scores, time to first response. The form chooser has no row for it, so authors reach for a bar of the average, which hides the spread and carries a measured misreading (Newman & Scholl, 2012). A histogram is bars of counts on the ground line, so it keeps every Altitude rule; a quantile dot plot mode gives the same distribution as countable dots, which cut the variance of probability estimates and improved decisions (Kay, Kola, Hullman & Munson, 2016; Fernandes et al., 2018), with the caution that the advantage isn't uniform across tasks (Kale, Kay & Hullman, 2021).

**Closest existing components:** `BarChart` (the marks; it can't bin, and its x is categorical), `DotPlot` (dots with a spread per category, not a distribution), `Sparkline kind="bar"`.
**Name:** `Histogram`. No shadcn/ui equivalent.

## Elevation story

**What it is:** settled. Counts as lengths on the ground line.
**Signal it carries:** "Amounts are never height", unchanged; "the form fits the question" (spread is a histogram or a quantile dot plot).
**Relatives it borrows from:** `BarChart` for the bars, the ground line and the readout; `ScatterChart` for the dots; `ChartReference` for the median and percentile lines; `Heatmap` for naming a bin's range in words (E42's "180–200 ms").

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| A bin's bar | ground | 0 | flat `data-1`, bars touching (a continuous axis, no band gap) | the bin's range in its name and the readout: "180–200 ms: 42 requests (12%)" |
| A quantile dot | ground | 0 | flat `data-1`, 8px, ringed in the plot's colour | "1 of 20 dots, 5% each"; the dot's quantile in its name |
| Median, p95 or a target | ground | 0 | `ChartReference`: 1px `ink-muted`, label on a halo | "Median 212 ms" |
| Focused bin or dot (keyboard) | ground | 0 | 2px `accent-ink` ring | the readout |

## Motion

The one engine: a change of data glides bar lengths (Motion, Charts 1); a change of bins cross-fades (new x); dots glide by quantile index. Under reduced motion, in place.

## Accessibility

**WAI-ARIA pattern:** plain HTML: `figure`, with `ChartContainer`'s one-stop keyboard path.
**Keyboard:** ←/→ move between bins (or dots), Home/End to the ends; Enter on a bin does nothing unless `onSelect` is set.
**Screen reader:** the generated summary says the count, the median, the spread (10th–90th) and the shape ("most values between 160 and 240 ms; a long tail to 1.2 s"); each bin says its range, count and share.
**Forced colours:** `CanvasText` bars with a `Canvas` edge between them so touching bars stay apart; reference lines `CanvasText`.
**`contrast="more"`:** bars take a 1px `ink` edge; dots are ringed 2px.

## API sketch

```tsx
<ChartContainer config={{ latency: { label: 'Latency', format: ms } }} title="Request latency, last hour"
  takeaway="Half of requests finish under 212 ms, but 5% take over a second">
  <Histogram data={requests} value="latency" bins={20}          // or bins={{ width: 20 }} or bins={[0, 50, 100, …]}
    mode="bars"                                                  // 'bars' (default) | 'dots' (quantile dot plot, `dots={20}`)
    show={{ median: true, percentiles: [95] }} cumulative={false} />
</ChartContainer>
```

- Binning in-house: Freedman–Diaconis by default, edges snapped to 1–2–5 numbers, open-ended last bin said as "≥ 1 s". `bins` as a count, a width or explicit edges.
- `mode="dots"` draws `dots` quantiles (default 20, so each is 5%) stacked in columns on the same axis; the y axis becomes a count of dots and is said as a share.
- `cumulative` draws the running share as a step line over the bars.
- Takes `relevance`, `focus` (as a predicate over records: "requests from EU"), `onSelect` (a bin selects its records), `compare` (the period before, as a 1.5px `ink-muted` step outline, E106's trace).

## Rules it strains

None. Bars touching rather than banded is a convention for a continuous axis, not a change to rule 2.

## Out of scope

Density curves and violins (smoothing hides the count). Box plots (`DotPlot` with a range covers a per-category spread). Two-dimensional histograms (`Heatmap`).

## Done when

- [ ] Source in `project/components/src/`, exported from `index.tsx`, its name added to `names` in `build/build.mjs`, declarations in `index.d.ts`
- [ ] A `bundle.css` section with a header comment explaining its elevation model
- [ ] `project/components/Histogram/README.md` in the existing format
- [ ] A section in `build/previews.txt` (latency as bars with median and p95; the same as 20 quantile dots; a cumulative view) with an honest `@dsCard` group and subtitle
- [ ] Charts' form chooser gains "How values are spread"; `Elevation.md` and `Research.md` updated
- [ ] `tsc` clean; `shoot.mjs` renders it in both schemes with no page or console errors; also checked with `FORCED=1`, reduced motion and `contrast="more"`; at 360px
- [ ] Keyboard paths checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed

## Open questions

1. Should a quantile dot plot be `Histogram mode="dots"` or a `DotPlot` mode? The axis (continuous value, dots stacked as counts) is the histogram's, so proposed here.
2. Default dot count: 20 (5% each, countable) or 50 (Fernandes et al.'s best)? Proposed 20 on a card, 50 at `size="hero"`.
