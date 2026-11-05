# Connected charts: research and synthesis

November 2026 · a second design research pass over the chart library, ending in fourteen issues filed under the [Connected charts](https://github.com/richlaconte/altitude/milestone/5) milestone (drafts in [issues/](issues/), umbrella #528). The first pass, [Charts with Altitude's voice](../charts/README.md) (October 2026), asked why the charts read as generic and answered with emphasis, words, comparison and recency; its eleven issues (#184–#194) have all shipped.

**The question, again.** With a takeaway, focus, comparison, pins and `since` built, the charts still feel like a good chart library rather than a different idea of what a chart in a product is. What's left that only Altitude's philosophy would do?

**The short answer.** The first pass made one chart say what it means. Every chart is still alone: it doesn't know the chart beside it, where its data came from, or whether the sentence above it is true. And the positive half shipped as opt-in props, so the chart an agent draws without reading the guide is still the generic one. The proposals give the charts three things the rest of Altitude already has and charts don't: **one record behind many views** (a shared slice, pointer and palette; small multiples; a common base), **claims you can check** (a takeaway whose figures cite their marks; where the data came from and when), and **rules the tooling holds you to** (defaults set once for an app, and `altitude check` rules for charts). Beside them, the form chooser is missing three jobs product apps ask for every week (how values are spread, where people leave a process, how many in a hundred), and the one non-visual path is still the keyboard.

---

## 1. Method

| Step | What was done |
|---|---|
| Read the system | `project/README.md`, `Elevation.md`, `Charts.md`, `Motion.md` ("Charts"), `Theming.md` ("Charts", "Charts Altitude doesn't draw"), `Research.md` (literature, E23–E48, E100–E109, "What was rejected"), `CONTRIBUTING.md`, the issue templates, the first pass and its eleven drafts, `chart.tsx`'s public props and every chart type's props. |
| Looked at the output | `DPR=2 node shoot.mjs BarChart,LineChart,AreaChart,Stat,ScreenLayoutReport,ChartTooltip,Heatmap,ScatterChart,ChartSelect daylight,nightfall 960` at `ff89440` (`package.json` 0.5.x). No page or console errors. |
| Looked at use | Every chart in `examples/` and `site/`: 6 `ChartContainer`s, 9 `Meter`s, 3 `Stat`s, 3 `BarList`s, 2 `LineChart`s, one each of `BarChart`, `AreaChart`, `Heatmap`, `SpanWaterfall`. The service-health app is the only complete dashboard: six charts, each with its own config, filter language and pointer. |
| Prior issues | `gh issue list --state all --search chart`: 48 closed, none open. Milestone "Explanatory charts": 11 closed, 0 open. `altitude check` carries one chart rule (`ALT-CHART-001`, no pie charts). |
| Literature | Verified sources on coordinated views, small multiples, title trust, data trust, distributions, icon arrays, funnels, sonification and narrative (§4), each by DOI or the author's page. |

Not done: no studies with people, no screen-reader or sonification pass with blind readers, and the renders were reviewed in Daylight and Nightfall only. §8 lists what each proposal should be validated with.

## 2. What's already right (keep it)

Everything in the first pass's list, and what it added:

- **A chart says one thing first** (`takeaway`, E102) and **importance is emphasis** (`focus`, `data-context`, E105).
- **Every value has a compared-to-what** (`compare`, E106; `since`, E108) and **a reading can be put down** (`pinnable`, E107).
- **Words never sit on data** (E101), **the frame's ink ranks below the data** (E103), **the data chooses the aspect** (E104), and **zero isn't always the story** (`DotPlot`, E109).
- **Chrome built from components:** legend keys as switches, the brush as a range Slider lens, the readout as a `Tooltip`, drilling as `Drilldown`, loading as an imprint, nothing as an opening.
- **Access as a path:** one Tab stop, summary → series → point, a table view, patterns under forced colours.

Nothing proposed here weakens any of it.

## 3. Findings

### F1 · Charts don't know each other
`Charts.md` ("Dashboards") says filters sit in one row and "every chart, stat and table below re-renders against the same slice. Say which slice in words." That's a sentence to the author, not a build. There is no shared pointer (a crosshair at 14:05 on the error-rate chart says nothing on the latency chart beside it), no shared window (a `ChartBrush` moves one chart), no shared selection (a bar selected in one chart recedes nothing in the next unless the app wires `relevance` itself), and no shared palette (each `ChartConfig` assigns slots in its own order, so "EU" is `data-2` in one card and `data-1` in the next). The service-health example shows the cost: six `ChartContainer`s, six configs, six captions. Coordination is the oldest result in multiple-view research: Snap-Together's coordinated views improved task performance by 30–80% depending on task (North & Shneiderman, 2000), and Roberts' survey (2007) treats brushing, linking and shared navigation as the defining features of a multi-view system. Recharts' `syncId` shares only the tooltip.

### F2 · Rule 6 promises what nothing builds
"Two measures of different scale are two charts, small multiples, or indexed to a common base." There is no small-multiples build (shared scales, one axis, one legend, one pointer), and no way to index a series to a base. Juxtaposed series are more robust than superimposed ones as their number grows (Javed, McDonnel & Elmqvist, 2010), which is exactly when an author reaches for a second axis. E104 already deferred multi-scale banking to "small multiples could carry it later".

### F3 · The takeaway is trusted, not checked
E102 left open "whether readers check a takeaway against the marks, or take it on trust." The evidence says trust: a title's slant changes the message people take away, even against the chart (Kong, Liu & Karahalios, 2018), and when caption and chart emphasise the same feature that's the takeaway (Kim, Setlur & Agrawala, 2021). In Altitude's own apps the takeaway is written by code (`writeTakeaway` in the service-health example) and, in the apps Altitude is for, by an agent. A 2026 analysis of model-written chart claims found the models' own source labels unvalidated and asked for user studies of "evidence links, citations and source cues" ([Chart-supported or model-supplied?](https://arxiv.org/abs/2607.25021)). Altitude has the parts: `InlineCitation` (E100) is a plate in text that lifts because it acts, and a pin (E107) is a reading landed on the record. Nothing joins a figure in the takeaway to the mark it came from.

### F4 · A chart doesn't say where its data came from or how old it is
Only a `live` chart says "Updated 12:04". A settled chart (the common case) says nothing about its source, its freshness or its row count; `Stat` has `help` for a definition, `ChartContainer` has nothing. Interviews with data producers and consumers found a recurring, unmet need for validation and verification, especially among consumers (Sultanum, Bromley & Correll, *Data Guards*, VIS 2024). Journalism's source line (FT, Economist, Datawrapper) is the settled convention. The content rules already ask for it in spirit: "Show real data or say there's none."

### F5 · The form chooser is missing three jobs
Product analytics asks, every week, how values are spread (latency, order size, scores), where people leave a process (signup → activation → paid) and how many in a hundred (churn risk, conversion). The chooser has no row for any of them. Bars of averages hide the spread and carry a measured misreading (Newman & Scholl, 2012); quantile dotplots cut estimation variance and improved decisions (Kay et al., 2016; Fernandes et al., 2018). Icon arrays raised accuracy for low- and high-numeracy readers alike and removed denominator neglect (Galesic, Garcia-Retamero & Gigerenzer, 2009; Garcia-Retamero, Galesic & Gigerenzer, 2010). A funnel drawn as a tapering shape encodes counts as area and is forbidden by rule 1's logic as surely as a pie; drawn as aligned bars with the drop-off in words it's the form that compares best (Talbot, Setlur & Anand, 2014: adjacent, aligned bars).

### F6 · The one non-visual path is the keyboard
Charts' rule 8 says a chart never travels alone, and the keyboard path (after Olli and Data Navigator) is good. But a path through 200 points by arrow key is slow, and the generated summary gives the shape only in words. Audio data narratives that interleave description with sonification produced more insights than either alone (Siu et al., CHI 2022); Apple's Audio Graphs and Highcharts ship it. No React chart library gives it free.

### F7 · The positive half is opt-in, so the default chart is still the generic one
`yLabels="inline"`, `takeaway`, `focus`, `compare`, `aspect="banked"`, `patterns` and `directLabels` (forced colours and print only) are all off by default. The grouped "Requests by service" preview, with none of them, is three saturated bars per month and a gutter: any library's default. E103 kept the gutter "until people have used the inline layout". Altitude is built for agents, and an agent draws what the defaults give it. There's no way to set a chart default once for an app.

### F8 · `altitude check` knows one chart rule
`ALT-CHART-001` (no pie charts) is the only deterministic chart rule, and it applies to Recharts and the other engines, not to Altitude's own charts. The adherence evals (#419) measure whether agents keep the rules; nothing measures the chart rules because nothing checks them.

## 4. Evidence

| Source | Finding | Applies to |
|---|---|---|
| North & Shneiderman, *Snap-Together Visualization*, AVI 2000 ([DOI](https://doi.org/10.1145/345513.345282)) | Coordinated views improved performance 30–80% by task | F1 |
| Roberts, *State of the Art: Coordinated & Multiple Views*, CMV 2007 ([DOI](https://doi.org/10.1109/CMV.2007.20)) | Brushing, linking and shared navigation define multi-view systems | F1 |
| Javed, McDonnel & Elmqvist, *Graphical Perception of Multiple Time Series*, IEEE TVCG 2010 ([DOI](https://doi.org/10.1109/TVCG.2010.162)) | Shared-space (superimposed) designs degrade as series grow; juxtaposed (small multiples) are robust; superimposed favour local tasks, multiples global ones | F2 |
| Ondov, Jardine, Elmqvist & Franconeri, *Face to Face*, IEEE TVCG 2019 ([DOI](https://doi.org/10.1109/TVCG.2018.2864884)) | Arrangement matters for comparison; mirrored multiples and animation helped | F2 |
| Kong, Liu & Karahalios, *Frames and Slants in Titles*, CHI 2018 ([DOI](https://doi.org/10.1145/3173574.3174079)) | A title's slant changes the perceived message and recall, even against the chart | F3 |
| Kim, Setlur & Agrawala, *Towards Understanding How Readers Integrate Charts and Captions*, CHI 2021 ([DOI](https://doi.org/10.1145/3411764.3445443)) | Double emphasis sets the takeaway | F3 |
| *Chart-supported or model-supplied?*, 2026 ([arXiv](https://arxiv.org/abs/2607.25021)) | Model-written chart claims carry unvalidated source labels; studies of citations and evidence links are asked for | F3 |
| Lan et al., *The Evolving Duet of Two Modalities*, CHI 2026 ([arXiv](https://arxiv.org/abs/2603.15640)) | Survey of 98 papers on text with charts; verification widgets for model-written narrative among open directions | F3 |
| Sultanum, Bromley & Correll, *Data Guards*, IEEE VIS 2024 ([page](https://www.tableau.com/research/publications/data-guards)) | Consumers need validation and verification of data artifacts; no standard exists | F4 |
| Kay, Kola, Hullman & Munson, *When(ish) is My Bus?*, CHI 2016 ([DOI](https://doi.org/10.1145/2858036.2858558)) | Quantile dotplots cut the variance of probability estimates against densities | F5 |
| Fernandes, Walls, Munson, Hullman & Kay, CHI 2018 ([DOI](https://doi.org/10.1145/3173574.3173718)) | Quantile dotplots yielded decisions at 97% of optimal payoff | F5 |
| Kale, Kay & Hullman, IEEE TVCG 2021 ([arXiv](https://arxiv.org/abs/2007.14516)) | Dotplots least biased for magnitude estimation; not uniformly best for decisions | F5 (caution) |
| Galesic, Garcia-Retamero & Gigerenzer, *Using Icon Arrays*, Health Psychology 2009 ([DOI](https://doi.org/10.1037/a0014474)) | Icon arrays raised accuracy for low- and high-numeracy readers; risks read as less serious than numbers alone | F5 |
| Garcia-Retamero, Galesic & Gigerenzer, Med. Decis. Making 2010 ([DOI](https://doi.org/10.1177/0272989X10369000)) | Icon arrays removed denominator neglect, equally for younger and older adults | F5 |
| Talbot, Setlur & Anand, *Four Experiments on the Perception of Bar Charts*, IEEE TVCG 2014 ([DOI](https://doi.org/10.1109/TVCG.2014.2346320)) | Adjacent aligned bars compare best; stacked and distant bars worse | F5 (funnel) |
| Newman & Scholl 2012; Okan et al. 2018 (first pass) | Within-the-bar bias; dot plots reduced it | F5 |
| Siu, Fan, Kim, Rao, Vazquez, O'Modhrain & Follmer, *Audio Data Narratives*, CHI 2022 ([DOI](https://doi.org/10.1145/3491102.3517678)) | Interleaving description with sonification gave more insights than either alone | F6 |
| Apple, *Audio Graphs*, WWDC 2021 ([video](https://developer.apple.com/videos/play/wwdc2021/10122/)); Highcharts, *Sonification* ([docs](https://www.highcharts.com/docs/sonification/getting-started)) | Shipping precedents: pitch for value, one series at a time, play and scrub | F6 |
| Elavsky, Nadolskis & Moritz, *Data Navigator*, IEEE TVCG 2023 (in Research.md); adopted by Adobe's React Spectrum Charts | Input-agnostic navigation structures over charts | F6 |
| Ajani et al. 2021; Borkin et al. 2016; Xiong et al. 2020 (first pass) | Focus and a stated takeaway shape what's remembered; authors misjudge salience | F7 |
| *What Makes a GitHub Issue Ready for Copilot?* 2025; *Where Do AI Coding Agents Fail?* 2026 (in CONTRIBUTING.md) | Agents follow what's explicit and checkable | F7, F8 |
| McKenna et al., *Visual Narrative Flow*, EuroVis 2017 ([DOI](https://doi.org/10.1111/cgf.13195)); Chen et al. 2026 ([arXiv](https://arxiv.org/abs/2607.03023)) | Stepper and scroller stories raise engagement, not comprehension | Rejected: a chart story (§7) |

## 5. Synthesis

### Three ideas charts still lack

| Elsewhere in Altitude | In a chart today | Proposed |
|---|---|---|
| **One record.** A `DataTable`, its `FilterBar` and its `SavedViews` are one slice; `relevance` and `selected` are one language across components | Each chart is its own record, with its own pointer, window, selection and colours | `ChartScope` (01), `ChartGrid` (02), a common base (03) |
| **Claims rest on the record.** `InlineCitation` makes an answer's sentence point at its source; a pin lands a reading on the plot | The takeaway is a sentence the reader must trust; the chart says nothing about where its data came from | `ChartCite` (04), `source` and `asOf` (05), `definition` (06) |
| **Rules are checked, not assumed.** `altitude check`, the spacing and tells checks, the adherence evals | One chart rule, for other libraries; every Altitude-specific move is an opt-in | chart defaults on the provider (12), chart rules in `altitude check` (13) |

### Principles for the work (proposed additions to Charts.md, in the umbrella issue)

1. **One record, many views.** Charts that share a page share a slice, a pointer, a window and a palette, and say the slice in words once. A selection anywhere is a filter everywhere, in the filter's own language (35%, positions held).
2. **Two measures are two charts.** When series differ in scale or number, juxtapose them: small multiples with one axis, or index them to a base named in words. Never a second axis.
3. **A claim points at its mark.** A figure in a takeaway or summary is a citation: it lights the mark it came from and lands a reading there. A figure that isn't in the data is a defect.
4. **The record says where it came from.** Source, time read and count are part of the chart, at caption weight, and stale is said in words.
5. **The form fits the question.** Spread is a histogram or a quantile dot plot; a process is a funnel of aligned bars with the drop-off in words; a frequency is counted marks. Never area for a count.
6. **A path by ear is a path.** A chart can be played: pitch for value, one series at a time, narrated at its extremes, from the same keyboard path.
7. **The default is the rule.** What the guide recommends is what the chart does unless told otherwise, set once for an app; what the guide forbids, `altitude check` reports.

## 6. The draft issues

| # | Issue | Kind | Title | Depends on | Priority |
|---|---|---|---|---|---|
| [00](issues/00-docs-charts-second-pass.md) | #528 | docs (umbrella) | Docs: Charts chapter, second pass — one record, many views; claims you can check | — | P2 |
| [01](issues/01-new-chartscope.md) | #529 | new component | New: ChartScope — one slice, one pointer and one palette across every chart on a page | — | P1 |
| [02](issues/02-new-chartgrid.md) | #530 | new component | New: ChartGrid — small multiples with one axis, one legend and one pointer | 01 | P1 |
| [03](issues/03-linechart-common-base.md) | #531 | enhancement | LineChart, AreaChart: index series to a common base, or read them as change | — | P2 |
| [04](issues/04-chartcontainer-cite.md) | #532 | enhancement | ChartContainer: a takeaway whose figures cite their marks | — | P1 |
| [05](issues/05-chartcontainer-source.md) | #533 | enhancement | ChartContainer, Stat: say where the data came from and when it was read | — | P2 |
| [06](issues/06-chartconfig-definition.md) | #534 | enhancement | ChartConfig: a definition for each measure, on hand at the legend, the readout and the table | 05 | P3 |
| [07](issues/07-new-histogram.md) | #535 | new component | New: Histogram — how values are spread, with every bin named | — | P2 |
| [08](issues/08-new-funnel.md) | #536 | new component | New: Funnel — the steps of a process and where people leave it | — | P2 |
| [09](issues/09-new-unitchart.md) | #537 | new component | New: UnitChart — how many in a hundred, as counted marks | — | P3 |
| [10](issues/10-chartcontainer-sonify.md) | #538 | enhancement, accessibility | ChartContainer: play a series by ear from the keyboard path | — | P2 |
| [11](issues/11-provider-chart-defaults.md) | #539 | enhancement | AltitudeProvider: chart defaults for a whole app (inline y labels, direct labels, patterns, banking) | — | P2 |
| [12](issues/12-cli-chart-rules.md) | #540 | enhancement | CLI: altitude check rules for charts, Altitude's own and Recharts' | — | P2 |
| [13](issues/13-conversation-chart-answer.md) | #541 | enhancement | Conversation: a chart in an agent's answer carries its label, its source and its citations | 04, 05 | P3 |

**Suggested order.** 01 first: it's the largest change to how a page of charts behaves and 02 builds on its pointer. 04 and 05 together: they share one design review (what a chart says about itself above and below the plot) and 13 waits on both. 11 and 12 are independent and cheap, and they're what makes the rest reach agents' builds. 07, 08, 09, 03, 10 and 06 are independent.

Each draft follows its template in `.github/ISSUE_TEMPLATE/` and uses only tokens from `project/tokens.json`. They were filed on 5 November 2026 as `needs-design` proposals, each a sub-issue of #528, with #530 blocked by #529, #534 by #533 and #541 by #532 and #533. The command that filed them, for the record:

```sh
sed '1,/^-->$/d' issues/01-new-chartscope.md > /tmp/body.md
gh issue create --title "New: ChartScope — one slice, one pointer and one palette across every chart on a page" --label enhancement,needs-design --body-file /tmp/body.md
```

## 7. Considered and rejected

- **A chart story (stepper or scroller through one chart's focus and annotations).** Studies find engagement, not comprehension or recall (McKenna et al. 2017; Chen et al. 2026). A report with several charts, each leading with its takeaway (`ScreenLayoutReport`), already does the job without moving the record under the reader.
- **Wheel and pinch zoom on the plot.** The brush is the window, and it holds the record still while it's read (E39). A wheel that rescales under the pointer is the opposite. Pinch on touch is deferred to the brush's touch pass.
- **Export as an image.** A picture of a chart loses its summary, its table and its keyboard path. The table is the record; exporting it is the app's (as the report layout's "Export CSV" is), and 05's source line is what a picture would have needed to carry.
- **Slope and bump charts as components.** A two-point `LineChart` with end labels is a slopegraph already ("Seats by plan" preview). A bump chart ranks over time, which is a `LineChart` of ranks with `yDomain` reversed; a component would add nothing but a name.
- **Horizon charts.** They fold a value into layered bands of colour, which reads as stacked height. Juxtaposed multiples (02) cover the dense-time-series case they're for.
- **Shared pins and presence on charts.** A collaborator's pin in a `presence-*` hue is a good idea with no persistence model behind it; the framework leaves persistence to the application. Deferred until a `CommentThread`-style anchor exists for charts.
- **A generated takeaway**, still. 04 makes an authored one checkable instead.
- **Flipping defaults in place.** E103's condition stands. 11 makes the recommended defaults one setting away, additively, and the evals say when to flip them.

## 8. Validation to plan

1. **Coordination (01).** The service-health dashboard with and without `ChartScope`: time to answer "what was latency when errors peaked?" and "which services were affected?" (after North & Shneiderman).
2. **Multiples vs overlay (02).** Eight services' error rates, overlaid against a `ChartGrid`: slope and discrimination tasks (Javed et al.'s protocol).
3. **Checked claims (04).** The same takeaway, with and without citations: do readers verify, and do they catch a wrong figure?
4. **Source line (05).** Trust ratings and "how old is this?" accuracy with and without `source` and `asOf`.
5. **Spread (07).** The within-the-bar task against a histogram and a quantile dot plot on Altitude's render.
6. **Funnel (08).** Reading drop-off: aligned bars with words against a tapering shape.
7. **Counted marks (09).** Galesic et al.'s accuracy task on Altitude's `UnitChart` against a segmented `Meter`.
8. **By ear (10).** With blind and low-vision readers: trend, extreme and comparison tasks, keyboard path alone against path plus audio.
9. **Defaults (11, 12).** The adherence evals, before and after: how many agent-built charts carry a takeaway, focus, inline labels and a source.
