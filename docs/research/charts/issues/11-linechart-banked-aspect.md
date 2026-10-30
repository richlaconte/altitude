<!--
title: LineChart: choose the aspect ratio by banking to 45°
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`LineChart` (`AreaChart` could follow, since it shares the line geometry).

## What you're trying to do

Let the data decide how tall a line chart is, so its slopes read accurately. `aspect` defaults to 2 for every chart, so a sharp monthly rise and a gentle one both fill the same box. People judge slopes best when the line's segments average about 45° (Cleveland's banking). Heer and Agrawala refined the criteria and showed that different frequency scales want different ratios: a near-square CO₂ chart shows the trend, a wide one the seasonal cycle ([*Multi-Scale Banking to 45°*, TVCG 2006](https://idl.uw.edu/papers/banking)).

## Today

`ChartContainerProps.aspect` (chart.tsx around line 767): "Width ÷ height of the plot. Default 2, unless `height` is set." `height` sets pixels directly.

## Proposal

```tsx
<LineChart data={revenue} x="month" aspect="banked" />
```

- **`aspect="banked"`** on `LineChart` (and `ChartContainer`, where the line type supplies the geometry): compute the ratio that banks the segments to 45° (Cleveland's average-absolute-orientation method, or one of Heer & Agrawala's refinements; choose in review), then **clamp it to 1–4**, so a card never becomes a sliver or a tower.
- The width is the card's; the banking sets the height. The ratio is computed from all shown series together, and is stable while the data glides (it's recomputed only when the data's x values change, as the cross-fade rule already treats that as a new chart).
- Default stays 2. Recommend `banked` in the README for single charts that aren't in a grid of equal cards.

**Additive?** Yes.

## Elevation impact

None: it changes the plot's proportions, not any part's tier or level.

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| — | — | — | — | — |

## Motion and accessibility

- **Motion:** a new aspect after new x values happens with the existing cross-fade (Motion, Charts rule 5); the height change itself doesn't animate ("resizing never animates").
- **Layout:** in a `Card` grid, banking can make neighbours unequal; the README should say to use a fixed `aspect` in grids.
- **Accessibility:** none.

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, the LineChart README and `build/previews.txt` updated (one banked preview beside the default)
- [ ] A short entry in `Research.md` with the measured average absolute orientation before and after for the preview data
- [ ] `tsc` clean; `shoot.mjs` clean in all four schemes
- [ ] `node build.mjs && node previews.mjs` run and committed

## Alternatives considered (optional)

- **Multi-scale banking** (one chart per frequency scale). Powerful, but it's an analysis feature, not a default; it could come later as small multiples.

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte, from a chart design research pass (`docs/research/charts/`).
