<!--
title: ChartContainer: a takeaway whose figures cite their marks
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`ChartContainer` (the `takeaway` and `summary` slots and the pin machinery from #190), with a new inline part, `ChartCite`. One component: the citation is resolved by the frame, which knows the marks.

## What you're trying to do

Let a reader check a chart's sentence against its marks in one gesture. E102 left open whether readers check a takeaway or take it on trust; the evidence says trust (Kong, Liu & Karahalios, 2018: a title's slant sets what's remembered, even against the chart). In the apps Altitude is for, the sentence is written by code or by an agent. A 2026 analysis of model-written chart claims found their source labels unvalidated and asked for studies of "evidence links, citations and source cues" ([arXiv 2607.25021](https://arxiv.org/abs/2607.25021)). Altitude has both halves: `InlineCitation` (E100) is a plate in text that lifts because it acts, and a pin (E107) is a reading landed on the record. Nothing joins a figure in the takeaway to the mark it came from.

## Today

`takeaway` and `summary` are free `ReactNode`s (`chart.tsx`, `ChartContainerProps`). The service-health example writes its takeaway from the rows (`writeTakeaway`), so the figures exist as data, then become plain text.

## Proposal

```tsx
<ChartContainer config={config} data={rows} x="day" title="Daily signups"
  takeaway={<>Signups doubled after the pricing change on 14 October, from <ChartCite x="2026-10-13" series="signups" window={13}>39 a day</ChartCite> to <ChartCite x="2026-10-31" series="signups" window={17}>80</ChartCite></>}>
  <LineChart data={rows} x="day" />
</ChartContainer>
```

- **`ChartCite`** wraps a figure in the takeaway, summary or description and names the record(s) it comes from: `x` (one record), `x` with `window` (an average or sum over the n records ending at `x`), or `records` (a predicate). It renders as `InlineCitation`'s plate at text size, in `ink`, with the series' marker shape as its mark; never a series colour on text (rule 5).
- **Hover or focus** lights the cited mark(s) with the keyboard's 2px `accent-ink` ring and opens the readout there, as the keyboard path does; a `window` draws a flat `line` band under the stretch it covers. Leaving closes it. **Enter or click pins** the reading (E107's plate), so the check settles into the record; Escape order is unchanged (last pin first).
- **Checked.** In development, a `ChartCite` whose `x` isn't in the data, or whose figure (the plate's text, parsed with the series' format) differs from the record's value by more than the format's precision, logs a warning: "ChartCite: '80' cites signups on 2026-10-31, which is 76." A figure that isn't in the data is a defect, not a style.
- **Words.** A cite's accessible name is its figure plus "cites Signups, 31 October 2026: 76" and "Press Enter to pin". The generated summary is unchanged.

**Additive?** yes. A takeaway without cites is as today.

## Elevation impact

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| A cite at rest | ground | 0 | `InlineCitation`'s flush plate, `ink` text | the marker shape; "cites …" in its name |
| A cite hovered or focused | raised | 1 | lifts as `InlineCitation` does, because it acts | the ring on its mark; the readout |
| The cited mark | ground | 0 | flat; 2px `accent-ink` ring | the readout's label |
| A cited window | ground | 0 | flat `line` band under the stretch | the readout says "average of 13 days" |
| A pinned check | ground | 0 | the pin plate from #190 | as pins |

## Motion and accessibility

The cite lifts one level on `ease-rise`, `dur-travel-1`, as `InlineCitation`; the readout rises as a tooltip; a pin lands as #190's does. Under reduced motion the ring and readout appear in place. The cites are in the figure's description, so a screen reader hears the takeaway with its citations, then the summary; each cite is a button in the Tab order of the frame (not the plot's one-stop path). Forced colours: the plate's 1px edge and the `Highlight` ring.

## Out of scope

Generating cites from a takeaway's text (the takeaway is authored; the cites are authored). Cites in `ChartAnnotation` plates (those already sit at their x). Cites from a `Stat` to a chart elsewhere on the page (a `ChartScope` could carry it later).

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, `ChartContainer`'s README (and a `ChartCite` section) and `build/previews.txt` updated: the report layout's signups takeaway with two cites, one of them a window; a wrong cite in a dev-only check
- [ ] `Elevation.md` ("Labels" row) names the cite; `Motion.md` ("Charts") notes it; `Research.md` carries the review
- [ ] `tsc` clean; `shoot.mjs` clean in both schemes; hover, focus, Enter and Escape checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed

## Alternatives considered

Underlining figures and matching by text. Too fragile ("39 a day" vs "39"), and it gives nothing to check against. Showing the check as a `Badge` ("Verified") on the chart. A badge is a claim about a claim; a plate the reader can press is the check itself.
