# Charts

A chart is the one place where Altitude's own vocabulary is dangerous. On a plot, a bar's *length* is already height on the screen, and Altitude's height (shadow, wall, sheen, tonal lift) is exactly the channel **Elevation** says must never carry an amount. So charts follow one rule before any other: **the data is the record.** It lies on the ground. Everything live about a chart (the readout, the legend you toggle, the window you drag, the drill you take) uses a build Altitude already has.

Read **Elevation** and **Motion** first; this chapter applies their laws to data. The evidence is in **Research** ("Charts").

## The rules

1. **The data is the record.** The plot is ground, and its marks are flat ink on it: no cast shadow, no wall, no sheen, no tonal lift and no gradient, ever. Length and position are the most accurately read magnitude channels and depth is one of the weakest; shadowed and 3D bars cost accuracy. A sheen on a bar would also say "press it" (E4), which a bar usually can't honour.
2. **Bars stand on the ground line.** The zero baseline is the chart's ground line, a 1px `ink-muted` rule, the same line the `Stepper` and the `Drilldown` staircase stand on. Bar charts always include zero; a bar that starts above zero misstates its length.
3. **Height belongs to the chart's chrome, not to its data.** Every live part of a chart is a component you already know (see **Every part, by its build** below). Nothing new is invented for charts.
4. **Hover is a promise, in charts too.** On a static chart the crosshair and readout appear and the marks don't respond. A grid has no crosshair, so a `Heatmap` outlines the cell under its readout in 2px `ink` instead, with no pointer cursor: that's the crosshair, not a promise. Only marks that do something when clicked show a hover outline and a pointer cursor. Marks never lift: a bar lifted off the ground line, or one casting a shadow below its top edge, misstates its value.
5. **Colour does one job per chart.** Pick one:
   - **identity**: the categorical palette, `data-1` to `data-6` in config order, then `data-other`;
   - **magnitude**: the sequential ramp `data-seq-1` to `data-seq-7`;
   - **polarity**: the diverging ramp `data-div-*` around a meaningful midpoint;
   - **status**: `positive`, `caution`, `critical`, only when the series *means* good or bad, and then with an icon and a word, as status always has.

   Colour follows the entity: hiding or filtering a series never repaints the others. **Focus** is the one exception, and it isn't a filter: `focus` is the author's statement of what the chart is about, fixed for the chart rather than toggled by the reader. The focused series or records keep their identity colours and everything else takes one shared neutral, `data-context`, with its words in `ink-muted`; it's said in words too ("Highlighted: EU."), and a change of focus cross-fades. A reader's version is `relevance`, which recedes misses to 35% and repaints nothing, so "the author's context" and "your filter" stay two readings (E105). Text wears `ink` and `ink-muted`, never a series colour. `accent` and the `presence-*` hues stay reserved for what they already mean. `data-1` shares the accent's hue so a chart's first series looks like the product, but it's a different colour from `accent` and isn't a control. The values and their gates are in **Theming** ("The data palette").
6. **One axis.** No dual-axis charts: two scales on one plot invite a correlation the data never made. Two measures of different scale are two charts, small multiples, or indexed to a common base.
7. **Spend changes carefully.** Data that changes glides to its new value at one level, as a re-sort does: it's one change. New data gets an afterglow within the attention budget. Nothing grows from the baseline on first render for decoration; the chart is simply there.
8. **A chart never travels alone.** As height never travels alone: every chart has a written summary, a keyboard path through its data, a table view, and direct labels or patterns so no series is told apart by colour alone.
9. **Say one thing first.** A chart that makes a point leads with it: a `takeaway` is the chart's heading ("Cedar deployed nearly three times as often as Delta"), and its title becomes the small label above. Readers fixate on and recall the words at the top, and take away what they say, even against the chart (E102). So the takeaway is authored, never generated: write it from the data shown, as a trend or a comparison rather than a restatement of the encoding ("Deploys by team" is a title, not a takeaway). The application owns its truth, as it owns persistence. A row of equal dashboard cards can do without one; a chart in a report rarely should.

## Choosing a form

Choose by the job the data does, not by what looks rich.

| Job | Form |
|---|---|
| Change over time | `LineChart`; `AreaChart` for a total and its parts |
| Compare amounts across categories | `BarChart`; `BarList` for a ranked top-N |
| One headline number | `Stat`, with a `Sparkline` for its trend |
| A value within a known range | `Meter` (a password's strength too, in `PasswordInput`) |
| A value per cell over two dimensions | `Heatmap` |
| How two measures relate | `ScatterChart` |
| Part of a whole | a stacked `BarChart`, or a segmented `Meter` |

**No pie or donut charts.** Angle and area are read less accurately than position and length, so a part of a whole is a stacked bar or a segmented meter. **No 3D, ever**, for the reasons in rule 1.

`Progress` and `Meter` look alike and mean different things. `Progress` is a task under way, which is live, so its fill rises out of a trench. A `Meter` is a reading (storage used, a quota, a score), which is the record, so its fill is flat ink in a flush track.

## Every part, by its build

| Part | Tier | Built like |
|---|---|---|
| The plot, gridlines and axes | ground | flat; gridlines are `line`; axis text a 13px caption in weight 400, `ink-muted` and tabular, lighter than a label on a control; y labels in a gutter, or inline just above their gridlines on a halo |
| The zero baseline | ground | the ground line: 1px `ink-muted`, as under `Stepper` and `Drilldown` |
| Marks (bars, lines, points, cells) | ground | flat ink in a series colour, no shadow, no wall, no sheen |
| A scatter's dots | ground | flat `data-*` with a marker shape per group, ringed 2px in the plot's colour so overlaps stay apart; outliers named in `ink` with a 1px leader; no word, the trend's included, covers a dot |
| A heatmap's cells | ground | flat `data-seq` (or `data-div`) steps parted by 2px of the plot's colour; no data is a 1px `line` outline, not a well |
| A clickable mark, hovered | ground | a 2px `ink` outline and a pointer cursor; it never lifts |
| The readout | floating, level 3 | a `Tooltip`, rising from the side facing its mark |
| The crosshair | ground | a 1px `line-control` rule, lighter than a reference line's `ink-muted` because it's a pointer, not something to read against; it doesn't move the marks |
| A legend you can toggle | sunk and raised | a choice, so it's built like the Switch: a trench with a raised mark when the series is on |
| A legend that only labels | ground | a plate set flush, like a `Badge`; better still, label the series directly |
| An overview brush | sunk and raised | the range `Slider`: the series a flat line in a trench, the chosen window a raised lens (level 1, `accent` rim, clear face) whose grips are the thumbs; outside it the overview recedes to 35% |
| Drilling in | ground, stacked | a `Drilldown`: the detail is laid on top, the staircase shows the way back |
| Annotations and reference lines | ground | plates set into the ground, like a `Badge`; reference lines are solid 1px `ink-muted`, because dashes mean projected |
| Loading | sunk | an imprint (`Await`), at the chart's own size |
| No data | sunk | an opening (`EmptyState`) that says why and what to do |
| Projected or incomplete data | ground | not yet the record: dashed or hatched, and labelled as such |
| A chart on a dashboard | raised, level 1 | a `Card` on the ground |

## Signals a chart can carry

These are the elevation signals a chart adds to **Elevation**'s table:

- **Amounts** are never height. They are length and position on a flat plot standing on the ground line.
- **Marks that act.** Only where a click selects or drills do marks respond to the pointer, with a 2px `ink` outline and the action in the readout. A selection keeps its colour and recedes the rest, and a drill opens the child chart in `Drilldown` (E41).
- **Filtered in place.** A filter recedes misses to 35% where they stand and holds the axis, so positions survive; the frame says how many match (E40).
- **Live.** A live chart shows a change at once and leaves a fading `ink` outline on the mark; a whole refresh glows the "Updated" caption instead. Its window glides with time, and it holds still while someone reads it, with a switch to pause it (E39).
- **Read against.** Targets, limits, normal ranges and events (`ChartReference`, `ChartAnnotation`) lie flush with the marks: a solid 1px line, a flat `line` band, a `Badge` plate with a leader. Their words are laid out together so they never overlap each other or cover a mark: plates sit in headroom above the data, and a label moves to its line's other side or end before it covers a line or a bar (E38, E101).
- **Not yet the record.** A projected value or an incomplete period (this month so far) is dashed or hatched and says so in its label and readout. It's the record to come, so it's drawn as an imprint of the record, not raised as live. Built as `status` on `BarChart`, `LineChart` and `AreaChart`, with a "Today" rule where the record ends and an uncertainty `band` on `LineChart` (E37).
- **A window on the record.** An overview sits in a trench and the chosen window is a raised lens in it, so the part you're looking at is the part you can move. The lens is raised because you move it, not because it's data: the series inside it stays flat.
- **Read against the record before.** `compare` sets each value against the period before it. Both are settled, so both lie flat on the ground; the earlier one is quieter: a 2px `ink` tick across a bar at its earlier value (the bullet graph's comparative measure), or a 1.5px solid `ink-muted` trace under a line, named at its end. The difference is said in words in the readout, each point's name, the table and the summary (E106).
- **Recency.** A value that just arrived, or just changed, gets the afterglow, within the attention budget, never a lift.
- **Steps of one ramp.** A heatmap's value is a binned step of the sequential ramp (or the diverging one around a midpoint), each step's range in words in the legend, the cell's name and the table, and a pattern density when colour is lost (E42).
- **Selection** is a tint and an outline, never a height. Selected marks keep their place on the ground line; unselected ones mute rather than sink.

## Motion

The chart's choreography is in **Motion** ("Charts"). In short: changed data glides at one level on `ease-glide`; new data settles with an afterglow; the readout rises like a tooltip; nothing grows from the baseline for decoration; under reduced motion values change in place and nothing travels.

## Dashboards

- Filters sit in one row above the charts they scope (`FilterBar`, and `DateRangePicker` with presets), and every chart, stat and table below re-renders against the same slice. Say which slice in words ("Last 30 days · EU").
- Each chart sits in a `Card` on the ground. The cards are raised because they're things you can work with, not because their data is.
- The one-summit rule is unchanged: a drill-down is a `Drilldown` or a `Sheet`, never a dialog on a dialog.
- Headline numbers come first, as `Stat`s, then the charts that explain them, then the table that is the record.

## Accessibility

A chart is accessible when someone can get the same answer from it without seeing it. Check every chart against these five, after Chartability (Elavsky, Bennett & Moritz, 2022):

1. **Visual.** Marks hold 3:1 against the plot and text holds 4.5:1; no series is told apart by colour alone (direct labels, patterns or markers).
2. **Keyboard.** The chart is one tab stop; arrow keys move through the data, and every readout a pointer gets, a keyboard gets.
3. **Screen reader.** The chart has a name and a written summary of what it shows, and each point announces its series, label and value.
4. **Reduced motion.** Nothing travels; values still change and the afterglow still tints.
5. **Forced colours.** Marks keep their patterns and the baseline and outlines remain. Shadows were never there to lose.

Every chart also offers a table view of its data, built with `Table`.

## Charts Altitude doesn't draw

Charts already built with shadcn/ui or Recharts can take Altitude's palette and most of these rules: **Theming** ("With shadcn/ui", "Charts") maps the colours and lists the props that carry each rule, and what doesn't carry over.

For what Altitude's SVG charts don't draw (tens of thousands of points, maps, sankeys, treemaps), `altitude-design/chart-themes` themes ECharts and Chart.js from the active scheme's tokens: **Theming** ("Charts Altitude doesn't draw"). The rules above still apply; a theme can't keep them for you.

## Don't

- Don't give a mark a shadow, a wall, a sheen, a gradient or a glow, "because Altitude is about height".
- Don't lift a hovered or selected mark.
- Don't start a bar's axis above zero.
- Don't put two scales on one plot.
- Don't colour text with a series colour, or a series with `accent`, `presence-*`, or a status hue that doesn't mean status.
- Don't animate a chart into place on first render.
