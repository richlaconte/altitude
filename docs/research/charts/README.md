# Charts with Altitude's voice: research and synthesis

October 2026 · a design research pass over the chart library, ending in eleven draft issues ([issues/](issues/)).

**The question.** The charts are correct but read as generic: put a `BarChart` preview beside a Tremor or shadcn/Recharts chart and little says it's Altitude. How can Altitude's design and HCI philosophy make them better for the person reading them, and make them belong to the rest of the system?

**The short answer.** The chart rules are complete about what a chart *must not* do with height, and the chrome (legend switches, brush lens, imprints, Drilldown) is already pure Altitude. What's missing is the positive half of the philosophy. **Law 1, "altitude is importance", has no chart equivalent.** A chart can't raise what matters, so today nothing in it matters more than anything else: every series is a saturated categorical colour, the title is a label, and the sentence that says what the chart means sits under the plot in 13px `ink-muted`. Altitude's other ideas about time (settled, live, still to come) have been carried in only partly: `live` and `status` exist, but "what was it before?" and "what changed since I last looked?" have no answer. The proposals give importance and time a channel that isn't height: **emphasis, words, comparison and recency.**

---

## 1. Method

| Step | What was done |
|---|---|
| Read the system | `project/README.md`, `Elevation.md`, `Charts.md`, `Motion.md` ("Charts"), `Research.md` (literature, E23–E48, "What was rejected"), `CONTRIBUTING.md`, the issue templates, `chart.tsx`'s public props and the chart sections of `bundle.css`. |
| Looked at the output | `node shoot.mjs BarChart,LineChart,AreaChart,ScatterChart,Heatmap,Stat,Meter,BarList,Sparkline,ChartReference daylight,nightfall 960`, then `ChartReference` and `ScatterChart` again at `DPR=2`. Commit `1da13e5` (`package.json` 0.2.1). No page or console errors. |
| Audited | Each render against the eight chart rules, the seven laws and the content rules, and against what a reader actually has to do to get an answer. |
| Literature | Verified sources on emphasis, titles and text, comparison, gridlines, bar perception, aspect ratio, embellishment and dashboards (§4). Each one is cited by DOI or the author's page. |
| Prior issues | `gh issue list --state all --search chart`: #48–#77 built the current library; none covers anything proposed here. |

Not done: no studies with people, no screen-reader pass (as in E29, VoiceOver and NVDA weren't available), and only two of the four schemes were reviewed for the identity findings (bugs were checked in Daylight at 2×). §8 lists what each proposal should be validated with.

## 2. What's already right (keep it)

These are distinctive and research-backed. Nothing proposed here weakens them.

- **Flat marks on a ground line**, no 3D, no pies, no dual axes (Cleveland & McGill; Zacks et al.; Isenberg et al.).
- **Chrome built from components:** legend keys as Checkbox trenches, the brush as a range Slider lens, the readout as a `Tooltip`, drilling as `Drilldown`. No other chart library does this, and it's the strongest identity the charts have.
- **Waiting and absence:** shaped imprints, an `EmptyState` opening, half strength on refetch.
- **Not yet the record:** hatched partial periods, dashed projections, a "Today" rule (E37).
- **Motion that is the change:** staged rescale before values (Heer & Robertson), no decorative entrances, a readout that steps instead of drifting.
- **Access:** one Tab stop, summary → series → point, a table view, patterns under forced colours.

## 3. Why they read as generic: findings

### F1 · Every series shouts equally
Every multi-series preview (grouped, stacked, area, scatter, meter segments) uses `data-1`–`data-3` at full strength. The palette is *mathematically* Altitude's (E23), but its look is the categorical rainbow every library defaults to. There is no way to say "this series is the point; the rest is context". Practitioners' strongest move is grey for context and one hue for the story (Knaflic's *Storytelling with Data*; Datawrapper's and the FT's house styles), and in the one controlled test of it, **focus** (a headline that states the pattern, a distinct colour on the subset that matters, and annotation) strongly shaped which pattern viewers remembered and raised clarity and aesthetics ratings. Decluttering alone had small effects (Ajani et al., 2021).

### F2 · The chart never says what it means first
`title` is a noun phrase ("Deploys by team"), `description` describes the encoding ("One series, sorted, labels=max"), and `summary`, the only sentence with a finding, renders **below** the plot in `ink-muted` 13px. The evidence points the other way. Titles that convey the message are what people fixate on and recall, especially at the top (Borkin et al., 2016). A title's slant changes the message people take away and remember, even against the chart (Kong et al., 2018). Readers preferred heavily annotated charts, and text about statistical or relational features produced statistical and relational takeaways (Stokes et al., 2022). When caption and chart emphasise the same feature, that feature is the takeaway; when the caption names a low-prominence feature, readers fall back to whatever is most prominent (Kim, Setlur & Agrawala, 2021). An author also can't judge what's salient to a fresh reader (the curse of knowledge, Xiong et al., 2020), so the emphasis has to be explicit.

### F3 · Nothing in a chart can be read against the record before it
Dashboards are mostly comparison ("vs last month"). `Stat` does it in words. The charts can't, beyond hand-placed `ChartReference` lines. Gleicher's comparison framework names three designs (juxtapose, superpose, explicitly encode the difference), and the library offers none of them for "this period against the last".

### F4 · The readout is the only way to inspect, and it vanishes
Inspection is hover-only and ephemeral: move the pointer and the number is gone. Comparing two points means remembering one. In Altitude terms the readout is live (level 3) but has no way to settle into the record, although "live things settle" is the system's most characteristic move (afterglow, pending → landed, `RemovalReceipt`).

### F5 · Recency stops at live data
Altitude spends real effort on "what just changed" (afterglow, the attention budget, Phosphor). For charts it covers only changes that arrive while the reader is watching (`live`). The more common question on a dashboard, "what moved since I was last here?", has no answer. Change blindness predicts people won't spot it unaided (Rensink, O'Regan & Clark, 1997).

### F6 · A form is missing: comparing values where zero isn't meaningful
`BarChart` must include zero (rule 2, correctly). `LineChart` is for change over time. So comparing, say, p95 latency across ten services in the 180–240ms range, or team averages with their spread, has no right form. People will reach for bars and either squash the differences or truncate the axis. Bars of averages also carry a measured misreading: values inside the bar are judged more likely than values equally far outside it (Newman & Scholl, 2012), and dot plots reduced it (Okan et al., 2018).

### F7 · Labels sit on the data they label (bugs)
At 2× in Daylight: `ChartAnnotation` plates and `ChartReference` labels are drawn over the line or bar they annotate ("DNS outage" covers the uptime line, "Bar 75" sits on the Search bar, the line crosses "Average 162.5 ms"). `ScatterChart`'s "Trend" label sits on the top-right triangle. Rule 8 and E38 cover labels not overlapping *each other*; nothing stops them overlapping *marks*, which hides data. That's the inverse of E27's "never over the point".

### F8 · The frame's ink isn't in Altitude's order
Tick labels are 12.5px weight **500**. In the content rules, 500 is the weight of control labels, so axis text claims the emphasis of something pressable. Y labels take a fixed gutter at the left, which costs a narrow card about 15% of its plot width. Gridlines should be "visible but subtle" (Stone & Bartram, 2011), and `line` already is, so the fix is weight, placement and count, not a new grey (Color: "never invent an in-between gray").

### F9 · Doc and code disagree on the crosshair
`Charts.md` ("Every part, by its build") says the crosshair is 1px `ink-muted`; `bundle.css:1896` draws it in `line-control`.

### F10 · Line shape depends on a fixed aspect
`aspect` defaults to 2 for every chart. Slopes are judged best when the line segments average about 45° (Cleveland; Heer & Agrawala, 2006), so the same data in a half-width card and in a full-width card gives different impressions of steepness.

## 4. Evidence

| Source | Finding | Applies to |
|---|---|---|
| Ajani, Lee, Xiong, Knaflic, Kemper & Franconeri, *Declutter and Focus*, IEEE TVCG 2021 ([PDF](https://visualcognition.psych.northwestern.edu/publications/Ajani_Declutter_2021.pdf)) | Focus (a headline stating the pattern, distinct colour on the key subset, annotation) strongly shaped which pattern was remembered and raised aesthetics and clarity ratings; decluttering had small effects, mainly on rated professionalism | F1, F2, F8 |
| Borkin et al., *Beyond Memorability*, IEEE TVCG 22(1) 2016 ([page](https://vcg.seas.harvard.edu/publications/20150101-beyond-memorability-visualization-recognition-and-recall)) | Titles and supporting text that convey the message aid recall; titles at the top are fixated on more | F2 |
| Kong, Liu & Karahalios, *Frames and Slants in Titles*, CHI 2018 ([PDF](https://mail.zcliu.cs.umd.edu/vistitles/CHI18-VisTitles.pdf)) | A title's slant changes the perceived message; recall follows the title | F2 (and the truthfulness duty in 04) |
| Stokes, Cogley, Satyanarayan, Hearst & Setlur, *Striking a Balance*, IEEE VIS 2022 ([abstract](https://www.tableau.com/en-gb/research/publications/striking-balance-reader-takeaways-and-preferences-when-integrating-text-and)) | Readers preferred the most-annotated charts; statistical and relational text produced statistical and relational takeaways; some text belongs in the title, some near the data | F2, F7 |
| Kim, Setlur & Agrawala, CHI 2021 ([page](https://hci.stanford.edu/publications/paper.php?id=429)) | Double emphasis (caption and chart highlight the same feature) sets the takeaway; a caption on a low-prominence feature loses to the chart | F1 + F2 together |
| Xiong, van Weelden & Franconeri, *The Curse of Knowledge*, IEEE TVCG 26(10) 2020 ([PDF](https://visualcognition.psych.northwestern.edu/publications/XiongCurse2020.pdf)) | Authors over-estimate how salient their pattern is to others | F1, F2 |
| Gleicher, *Considerations for Visualizing Comparison*, IEEE TVCG 2018 ([page](https://pages.graphics.cs.wisc.edu/VisSnacks/papers/comparison)) | Comparison designs are juxtaposition, superposition and explicit encoding | F3, F4 |
| Few, *Bullet Graph Design Specification*, Perceptual Edge 2006 | A short perpendicular mark as the comparative measure on a bar | F3 |
| Newman & Scholl, Psychon. Bull. Rev. 19(4) 2012; Okan, Garcia-Retamero, Cokely & Maldonado, Q. J. Exp. Psychol. 2018 ([DOI](https://doi.org/10.1177/1747021817744546)) | Within-the-bar bias in bars of averages; dot plots improved accuracy | F6 |
| Correll & Gleicher, *Error Bars Considered Harmful*, IEEE TVCG 2014 (already in Research.md, E37) | Bands and graded forms beat error bars for spread | F6 |
| Stone & Bartram, *Whisper, Don't Scream*, IEEE TVCG 17(10) 2011 ([page](https://tableau.com/research/publications/whisper-dont-scream-grids-and-transparency)) | Grids work within a "visible but subtle" band | F8 |
| Heer & Agrawala, *Multi-Scale Banking to 45°*, IEEE TVCG 12(5) 2006 ([page](https://idl.uw.edu/papers/banking)) | Aspect ratio chosen by banking makes slopes discriminable, and different scales want different ratios | F10 |
| Rensink, O'Regan & Clark, *To See or Not to See*, Psych. Science 1997 | Changes go unnoticed without a transient cue (change blindness) | F5 |
| Baudisch et al., *Phosphor*, UIST 2006 (already in Research.md) | Afterglow makes changes noticeable | F5 |
| Bach et al., *Dashboard Design Patterns*, IEEE TVCG 29(1) 2023 ([arXiv](https://arxiv.org/abs/2205.00757)) | 144 dashboards, 8 pattern groups; comparison and annotation are recurring needs | F3, F4, F5 |
| Bateman et al., *Useful Junk?*, CHI 2010 ([PDF](https://vis.csail.mit.edu/classes/6.859/readings/pdfs/Bateman-UsefulJunk.pdf)) | Embellished charts read as accurately and were remembered better after 2–3 weeks | Caution: identity can come from something other than minimalism; it doesn't license decorating marks |
| Franconeri, Padilla, Shah, Zacks & Hullman, *The Science of Visual Data Communication*, PSPI 22(3) 2021 ([DOI](https://doi.org/10.1177/15291006211051956)) | A review across perception and graph comprehension: emphasise the comparison you intend; state the takeaway | All |

## 5. Synthesis

### The tension, restated

Altitude's identity is height, and a chart is the one place height is forbidden to the content. So far the library has resolved this by **subtraction**: marks are flat, so the charts look like everyone's flat charts. The resolution should be **translation**: every law that uses height to say something still has something to say in a chart, through another channel.

| Law | What it says elsewhere | What carries it in a chart | Status |
|---|---|---|---|
| 1 · Altitude is importance | the primary action stands highest; one summit | **Emphasis:** the focused series in colour, the rest in a neutral context colour; a takeaway at the top that names it | missing → 04, 05 |
| 2 · Push up, fill down | controls raised, inputs sunk | chrome built from components | done |
| 4 · Only what moves, moves | hover lifts only what acts | outline on marks that act; crosshair otherwise | done |
| 5 · Live above, settled on the ground | new content settles; pending writes land | `live` afterglow and `status` hatching exist; **a reading you take settles into the plot**; **what changed since you looked** | partial → 07, 08 |
| (the record) | the ground is the record | **read each value against the record before it** | missing → 06 |
| 7 · Height never travels alone | word, icon, ARIA, border | summary exists; the takeaway and the focus must say the same thing (double emphasis) | partial → 04 + 05 |

### Principles for the work (proposed additions to Charts.md)

1. **A chart says one thing first.** The takeaway is the first line, in words, and the marks it names are the marks in colour. Words and emphasis agree (Kim et al.).
2. **Importance is emphasis, not height.** Colour's first job in an explanatory chart is to say what matters. Identity colours are for when several things matter equally.
3. **Every value has a "compared to what".** Where a chart has a natural comparison (the previous period, a snapshot, a pinned reading), it's drawn as a flat mark on the ground and the difference is said in words.
4. **A reading can be put down.** What the reader inspects settles into the plot as a plate, as live things settle everywhere else.
5. **Change since you looked is recency too.** Recency is spent within the attention budget, as an outline and a word.
6. **Words never sit on data.** Labels, plates and halos give way to marks, not the reverse.

### The colour jobs, revised

Rule 5 says colour does one of four jobs (identity, magnitude, polarity, status). Focus is not a fifth job: it's **identity for the few, with one shared colour for the rest**. It does strain "colour follows the entity: … never repaints the others", and draft 05 names that rule and argues the exception: focus is authored, never a reader's filter, and changing it cross-fades.

## 6. The draft issues

| # | Kind | Title | Depends on | Priority |
|---|---|---|---|---|
| [01](issues/01-chartreference-labels-over-marks.md) | bug | ChartReference: labels and annotation plates are drawn over the marks they annotate | — | P1 |
| [02](issues/02-scatterchart-trend-label-over-dot.md) | bug | ScatterChart: the trend's label is drawn over a dot | — | P2 |
| [03](issues/03-charttooltip-crosshair-colour.md) | bug | ChartTooltip: the crosshair is `line-control`, the Charts guide says `ink-muted` | — | P3 |
| [04](issues/04-chartcontainer-takeaway.md) | enhancement | ChartContainer: lead with a takeaway, above the plot | — (pairs with 05) | P1 |
| [05](issues/05-chartcontainer-focus.md) | enhancement | ChartContainer: focus on the series or records that matter, and set the rest in a context colour | `data-context` token (inside) | P1 |
| [06](issues/06-barchart-linechart-compare.md) | enhancement | BarChart, LineChart: read each value against a previous period | — | P1 |
| [07](issues/07-charttooltip-pin-readings.md) | enhancement | ChartTooltip: pin a reading to the plot, and compare two | — | P2 |
| [08](issues/08-chartcontainer-since.md) | enhancement | ChartContainer: say what changed since a snapshot | 06 (its mark) | P2 |
| [09](issues/09-new-dotplot.md) | enhancement | New: DotPlot — compare values where zero isn't meaningful, with their spread | — | P2 |
| [10](issues/10-chartcontainer-frame-ink.md) | enhancement | ChartContainer: set axis text as captions and y labels on their gridlines | — | P3 |
| [11](issues/11-linechart-banked-aspect.md) | enhancement | LineChart: choose the aspect ratio by banking to 45° | — | P3 |

**Suggested order.** 01 first (it hides data today). Then 04 + 05 together: they're the largest change to how the charts look and read, and they share one design review. Then 06, which 08 builds on. 07, 09, 02, 03, 10 and 11 are independent.

Each draft follows its template in `.github/ISSUE_TEMPLATE/` and uses only tokens from `project/tokens.json`. They're unfiled. To file one, strip the header comment (it holds the title and label) and pass the rest as the body:

```sh
sed '1,/^-->$/d' issues/04-chartcontainer-takeaway.md > /tmp/body.md
gh issue create --title "ChartContainer: lead with a takeaway, above the plot" --label enhancement --body-file /tmp/body.md
```

## 7. Considered and rejected

- **A raised plot, or a plot sunk into the card as a well.** A well means "waiting to receive" (an opening); a raised plot would put the record above the ground.
- **A ground strip under the axis in `surface-ground` inside a raised card.** The page colour showing inside a card reads as a hole, which says "opening". The ground line stays the 1px `ink-muted` rule it shares with `Stepper` and `Drilldown`.
- **A lighter gridline grey.** "Never invent an in-between gray." Fewer gridlines and lighter text do the job (10).
- **Emphasis by opacity alone.** Already taken: 35% means "receded by a filter or selection" (E40, E41). Focus uses a distinct neutral at full strength, so the two read differently and can combine.
- **Dashed comparison lines.** Dashes mean projected (E37). The comparison trace is solid and thinner (06).
- **Count-up, grow-in or staggered entrances for character.** Ruled out by Motion; the identity has to come from meaning, not show.
- **Pictorial embellishment** (after Bateman et al.). It helps memorability, but marks are the record and stay plain ink. Memorability comes from the takeaway (Borkin et al.).
- **An auto-generated takeaway.** A takeaway's slant shapes what people remember (Kong et al.), so it must be authored. The generated summary stays for screen readers, as now.

## 8. Validation to plan

These belong in Research.md's "How to validate with people" once the work lands:

1. **Takeaway + focus (04, 05).** The same charts in three conditions (today's, takeaway only, takeaway + focus); after a delay, ask for the main message and a redrawing. This is Ajani et al.'s protocol on Altitude's renders.
2. **Focus vs relevance (05).** Can people tell "the author highlighted" from "I filtered" when both are on screen?
3. **Comparison marks (06).** Speed and accuracy of "which categories fell?", with a tick, with a delta label, and with neither.
4. **Pins (07).** Whether pinning is found without being taught, and whether two pins beat memory for comparing two points.
5. **Since (08).** Time to name what changed since the last visit, with and without `since`.
6. **DotPlot (09).** The within-the-bar task, bars against dots with a band, on Altitude's render.
