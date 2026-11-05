<!--
title: Conversation: a chart in an agent's answer carries its label, its source and its citations
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`Conversation` (an answer's content) with `ChartContainer`, `AILabel`, `InlineCitation`/`Sources` and, when they land, `ChartCite` (#04) and `source` (#05). This is a pattern across them, so it's filed against `Conversation`, where the answer lives, as a preview and a README section rather than new props unless the review finds one is needed.

## What you're trying to do

Show how a chart an agent made belongs in its answer. Agents draw charts from queries the reader never saw and write the takeaway themselves. Today the agent-harness previews show text answers with citations and streaming; none shows a chart arriving in an answer, being not-yet-the-record while the query runs, landing with its source, carrying an `AILabel` on its takeaway, and citing the rows its figures came from. Model-written chart claims are the case the 2026 analysis ([arXiv 2607.25021](https://arxiv.org/abs/2607.25021)) warns about; Altitude has every part and no example of them together.

## Today

`Conversation` streams answers and marks content that isn't the record yet with a dashed rule (its README). `ChartContainer` takes a promise as `data` and imprints until it lands (#65). `AILabel` is a plate that lifts because it opens its explanation. `InlineCitation` cites a source in text. Nothing composes them, and the harness checks don't cover a chart in an answer.

## Proposal

A preview and README section, "A chart in an answer", that fixes the reading:

1. **While the query runs**, the chart is a `ChartContainer` imprint inside the streaming answer, under the answer's dashed rule: not yet the record, at the chart's own size, never a spinner.
2. **When it lands**, the marks fade in place (never rise); the answer's rule becomes solid when the whole answer is done.
3. **The takeaway carries an `AILabel`** ("Written by the assistant"), whose explanation names the query and the model, and its figures are `ChartCite`s so the reader can press each one and see its mark.
4. **The source line** (#05) says the data's source, the row count and the time read; `name` links to the query (a `CodeBlock` in a `Sheet`, the way `AgentActionPattern` shows a tool call).
5. **The table view** is one press away, as always; a `Sources` list at the answer's end lists the data source beside any documents.
6. **Follow-ups** that change the chart ("show me by region") glide the chart as a data change does (Motion, Charts 1), inside the same answer, rather than drawing a second chart, when the x and series are the same; otherwise a new chart below.

```tsx
<Conversation …>
  <Answer streaming={pending}>
    <p>Signups doubled after the pricing change.</p>
    <ChartContainer title="Daily signups" data={query.promise}
      takeaway={<><AILabel>Written by the assistant</AILabel> Signups doubled after 14 October, from <ChartCite x="2026-10-13" window={13}>39 a day</ChartCite> to <ChartCite x="2026-10-31" window={17}>80</ChartCite></>}
      source={{ name: 'Query', href: '#query-3', asOf: query.readAt, count: query.rows?.length }}>
      <LineChart x="day" />
    </ChartContainer>
  </Answer>
</Conversation>
```

**Additive?** yes.

## Elevation impact

None new: each part keeps its own. The only question the review must settle is whether the `AILabel` sits in the takeaway's line (a plate in a heading) or above it as the title's neighbour; propose above, as the title is already the caption-sized label there.

## Motion and accessibility

Each part's own. One addition: the answer's live region says "Chart ready: Daily signups" once when the data lands, as it says when a streamed paragraph completes, so a screen-reader user knows there's a figure to enter.

## Out of scope

Building the query runner. Charts the agent draws with Recharts (Theming covers it). Editing the chart in place (an `Artifact`).

## Done when

- [ ] A section in `build/previews.txt` under the agent-harness group, and a `Conversation` README section, with the six readings above
- [ ] `build/checks/agent-harness.mjs` (or a new `chart-answer.mjs`) renders it streaming, landed and followed up, in both schemes, under forced colours and reduced motion, with `ACT` on a cite
- [ ] `Charts.md` ("Signals") links it; `Research.md` carries the review
- [ ] `node build.mjs && node previews.mjs` run and committed
