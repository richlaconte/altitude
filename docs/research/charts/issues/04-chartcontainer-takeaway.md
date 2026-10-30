<!--
title: ChartContainer: lead with a takeaway, above the plot
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`ChartContainer`, so every chart type that renders in it gets this (`BarChart`, `LineChart`, `AreaChart`, `ScatterChart`, `Heatmap`). Pairs with "ChartContainer: focus on the series or records that matter" (05): the takeaway says it, the focus shows it.

## What you're trying to do

Make a chart say what it means before the reader has to work it out. Today the only sentence with a finding is `summary`, which renders *under* the plot in 13px `ink-muted`, after the axes, marks and legend. `title` is a label ("Deploys by team") and `description` is usually about the encoding. On a dashboard, a reader scans a row of cards and gets six nouns.

The evidence is consistent:

- Titles and text that convey the message are what people fixate on and recall, and titles at the top are fixated on more ([Borkin et al., *Beyond Memorability*, TVCG 2016](https://vcg.seas.harvard.edu/publications/20150101-beyond-memorability-visualization-recognition-and-recall)).
- A headline that states the pattern is one of the three "focus" moves that strongly shaped which pattern people remembered ([Ajani et al., *Declutter and Focus*, TVCG 2021](https://visualcognition.psych.northwestern.edu/publications/Ajani_Declutter_2021.pdf)).
- Text about statistical or relational features yields statistical or relational takeaways, and some text belongs in the title ([Stokes et al., VIS 2022](https://www.tableau.com/en-gb/research/publications/striking-balance-reader-takeaways-and-preferences-when-integrating-text-and)).
- A title's slant changes what people take away, and recall follows the title even against the chart ([Kong et al., CHI 2018](https://mail.zcliu.cs.umd.edu/vistitles/CHI18-VisTitles.pdf)). So it has to be authored and truthful, never generated.

It's also Altitude's own law 7 ("height never travels alone") turned around: a chart's emphasis shouldn't travel without its words.

## Today

`ChartContainerProps` (`project/components/src/chart.tsx`, around line 756): `title`, `description`, and `summary` ("What the chart shows, in a sentence or two … Shown under the plot. Without it a summary is generated for screen readers"). `.alt-chart-summary` is 13px/19px weight 400 `ink-muted` (`bundle.css:1491`). README: [ChartContainer](../../../../project/components/ChartContainer/README.md).

## Proposal

```tsx
<Card>
  <ChartContainer
    config={config}
    title="Deploys by team"                                  // becomes the small label above
    takeaway="Cedar shipped twice as often as Delta in March" // the chart's heading
    summary="Cedar 51, Atlas 42, Birch 35, Ember 28, Delta 19."
  >
    <BarChart data={deploys} x="team" sort="desc" focus={['Cedar', 'Delta']} />
  </ChartContainer>
</Card>
```

- **`takeaway?: React.ReactNode`**: one sentence, rendered first in the figure as the chart's heading (`text-heading`, 600, `ink`). When it's present, `title` renders above it as a label (`text-caption`, 500, `ink-muted`), so the chart is still named.
- The figure's accessible name stays `title`. The takeaway joins the description (`aria-describedby`) ahead of `summary`, so a screen reader hears the name, then the finding.
- When a `takeaway` is given and `summary` isn't, the generated summary still runs for screen readers, as now. The takeaway never replaces the generated data summary, which says the range and trend (Lundgard & Satyanarayan).
- Optional, follow-up: a `CardTitle` slot pattern in the README, for charts named by the card rather than the figure.

**Additive?** Yes. Without `takeaway`, nothing changes.

## Elevation impact

None. All parts are text on the ground of the card or the page; no part changes tier or level.

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| Takeaway | ground | 0 | inherits (card or page) · none | it's text: part of the figure's description |
| Title, as the label over a takeaway | ground | 0 | inherits · none | the figure's accessible name |

## Motion and accessibility

- **Motion:** when `takeaway` changes with the data, the text cross-fades over `dur-travel-2`, as a `Stat`'s value does. It doesn't take the afterglow: the marks' changes already spend the attention budget.
- **Screen reader:** name = title; description = takeaway, then summary. Check in VoiceOver and NVDA that the order reads naturally (not checked here; neither was available).
- **Forced colours, `contrast="more"`:** text tokens only, no change.
- **Docs:** add to Charts.md a "Say one thing first" rule, with an authoring note: the takeaway must be supported by the data shown, ideally a trend or comparison rather than restating the encoding, and the application owns its truth (as with persistence elsewhere in the framework).

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, the ChartContainer README and its `build/previews.txt` section updated; at least the BarChart and LineChart previews lead with a takeaway
- [ ] `Charts.md` gains the "say one thing first" rule and the authoring note
- [ ] `tsc` clean; `shoot.mjs` clean in all four schemes at 960 and 360; checked with `FORCED=1`
- [ ] `node build.mjs && node previews.mjs` run and committed

## Alternatives considered (optional)

- **Move `summary` above the plot.** It changes existing behaviour, and `summary` is often a full data description, too long to be a heading.
- **Generate the takeaway** from the same analysis that writes the screen-reader summary. Rejected: a slanted or trivial generated headline is worse than none (Kong et al.), and the curse of knowledge runs both ways: a generator doesn't know what the author wants the reader to see.

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte, from a chart design research pass (`docs/research/charts/`).
