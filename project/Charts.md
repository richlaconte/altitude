# Charts

A chart is the one place where Altitude's own vocabulary is dangerous. On a plot, a bar's *length* is already height on the screen, and Altitude's height (shadow, wall, sheen, tonal lift) is exactly the channel **Elevation** says must never carry an amount. So charts follow one rule before any other: **the data is the record.** It lies on the ground. Everything live about a chart (the readout, the legend you toggle, the window you drag, the drill you take) uses a build Altitude already has.

Read **Elevation** and **Motion** first; this chapter applies their laws to data. The evidence is in **Research** ("Charts").

## The rules

1. **The data is the record.** The plot is ground, and its marks are flat ink on it: no cast shadow, no wall, no sheen, no tonal lift and no gradient, ever. Length and position are the most accurately read magnitude channels and depth is one of the weakest; shadowed and 3D bars cost accuracy. A sheen on a bar would also say "press it" (E4), which a bar usually can't honour.
2. **Bars stand on the ground line.** The zero baseline is the chart's ground line, a 1px `ink-muted` rule, the same line the `Stepper` and the `Drilldown` staircase stand on. Bar charts always include zero; a bar that starts above zero misstates its length.
3. **Height belongs to the chart's chrome, not to its data.** Every live part of a chart is a component you already know (see **Every part, by its build** below). Nothing new is invented for charts.
4. **Hover is a promise, in charts too.** On a static chart the crosshair and readout appear and the marks don't respond. Only marks that do something when clicked show a hover outline and a pointer cursor. Marks never lift: a bar lifted off the ground line, or one casting a shadow below its top edge, misstates its value.
5. **Colour does one job per chart.** Pick one:
   - **identity**: the categorical `data-*` palette, one colour per series;
   - **magnitude**: a sequential ramp, light to dark;
   - **polarity**: a diverging ramp around a meaningful midpoint;
   - **status**: `positive`, `caution`, `critical`, only when the series *means* good or bad, and then with an icon and a word, as status always has.

   Colour follows the entity: hiding or filtering a series never repaints the others. Text wears `ink` and `ink-muted`, never a series colour. `accent` and the `presence-*` hues stay reserved for what they already mean.
6. **One axis.** No dual-axis charts: two scales on one plot invite a correlation the data never made. Two measures of different scale are two charts, small multiples, or indexed to a common base.
7. **Spend changes carefully.** Data that changes glides to its new value at one level, as a re-sort does: it's one change. New data gets an afterglow within the attention budget. Nothing grows from the baseline on first render for decoration; the chart is simply there.
8. **A chart never travels alone.** As height never travels alone: every chart has a written summary, a keyboard path through its data, a table view, and direct labels or patterns so no series is told apart by colour alone.

## Choosing a form

Choose by the job the data does, not by what looks rich.

| Job | Form |
|---|---|
| Change over time | `LineChart`; `AreaChart` for a total and its parts |
| Compare amounts across categories | `BarChart`; `BarList` for a ranked top-N |
| One headline number | `Stat`, with a `Sparkline` for its trend |
| A value within a known range | `Meter` |
| A value per cell over two dimensions | `Heatmap` |
| How two measures relate | `ScatterChart` |
| Part of a whole | a stacked `BarChart`, or a segmented `Meter` |

**No pie or donut charts.** Angle and area are read less accurately than position and length, so a part of a whole is a stacked bar or a segmented meter. **No 3D, ever**, for the reasons in rule 1.

`Progress` and `Meter` look alike and mean different things. `Progress` is a task under way, which is live, so its fill rises out of a trench. A `Meter` is a reading (storage used, a quota, a score), which is the record, so its fill is flat ink in a flush track.

## Every part, by its build

| Part | Tier | Built like |
|---|---|---|
| The plot, gridlines and axes | ground | flat; gridlines are `line`, axis text `ink-muted` |
| The zero baseline | ground | the ground line: 1px `ink-muted`, as under `Stepper` and `Drilldown` |
| Marks (bars, lines, points, cells) | ground | flat ink in a series colour, no shadow, no wall, no sheen |
| A clickable mark, hovered | ground | a 2px `ink` outline and a pointer cursor; it never lifts |
| The readout | floating, level 3 | a `Tooltip`, rising from the side facing its mark |
| The crosshair | ground | a 1px `ink-muted` rule; it doesn't move the marks |
| A legend you can toggle | sunk and raised | a choice, so it's built like the Switch: a trench with a raised mark when the series is on |
| A legend that only labels | ground | a plate set flush, like a `Badge`; better still, label the series directly |
| An overview brush | sunk and raised | the `Slider`: an overview in a trench, the chosen window a raised thumb |
| Drilling in | ground, stacked | a `Drilldown`: the detail is laid on top, the staircase shows the way back |
| Annotations and reference lines | ground | plates set into the ground, like a `Badge`; reference lines are dashed `ink-muted` |
| Loading | sunk | an imprint (`Await`), at the chart's own size |
| No data | sunk | an opening (`EmptyState`) that says why and what to do |
| Projected or incomplete data | ground | not yet the record: dashed or hatched, and labelled as such |
| A chart on a dashboard | raised, level 1 | a `Card` on the ground |

## Signals a chart can carry

These are the elevation signals a chart adds to **Elevation**'s table:

- **Amounts** are never height. They are length and position on a flat plot standing on the ground line.
- **Not yet the record.** A projected value or an incomplete period (this month so far) is dashed or hatched and says so in its label and readout. It's the record to come, so it's drawn as an imprint of the record, not raised as live.
- **A window on the record.** An overview sits in a trench and the chosen window is a raised thumb in it, so the part you're looking at is the part you can move.
- **Recency.** A value that just arrived, or just changed, gets the afterglow, within the attention budget, never a lift.
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

## Don't

- Don't give a mark a shadow, a wall, a sheen, a gradient or a glow, "because Altitude is about height".
- Don't lift a hovered or selected mark.
- Don't start a bar's axis above zero.
- Don't put two scales on one plot.
- Don't colour text with a series colour, or a series with `accent`, `presence-*`, or a status hue that doesn't mean status.
- Don't animate a chart into place on first render.
