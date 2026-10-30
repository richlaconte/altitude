# ChartReference and ChartAnnotation

Reading a chart against something: an SLO target, a budget, a normal range, the average, the day you shipped v2. Overlays like these help people read charts (Kong & Agrawala 2012), and most dashboards need at least a target line and an event marker. Put them inside any cartesian chart type, or inside the container:

```tsx
<LineChart data={uptime} x="day">
  <ChartReference y={[0.995, 1]} label="Normal range" />
  <ChartReference y={0.999} label="Target 99.9%" />
  <ChartReference y={0.99} label="Limit 99%" tone="critical" />
  <ChartReference y="mean" label="Average" />
  <ChartAnnotation x="2026-03-14" label="DNS outage" />
</LineChart>
```

**Why they're flush.** References and annotations are part of the reading, not something to act on, so they lie on the ground with the marks:

| Part | Drawn as | Words |
|---|---|---|
| Reference line | 1px `ink-muted`, solid, over the marks. Dashes mean "projected", so a reference line never has them | its label at the right end, above the line, in caption text; below it, at the left end or further along when that spot would cover a mark |
| Status threshold (`tone`) | 1px `caution` or `critical` | the label in `ink`, with the status icon in its tone |
| Band (`y={[low, high]}`) | a flat `line` fill under the marks: a decorative token, so it isn't read as data or as an opening | its label inside the band, at whichever corner covers no mark, or beside it when the band is under 20px tall |
| Annotation | a `Badge` plate flush at the top of the plot, in a row of headroom above the data (a label is part of the record), with a 1px `line-control` leader down to its x | the plate's text |
| Annotation with `onSelect` | the plate is a button and lifts one level when pointed at | button semantics, named "v2 launch, Mar 4, 2026" |

**Labels stay clear, of each other and of the data.** The container draws every reference and annotation itself, so it can lay their words out together with the marks. Plates sit in rows 26px apart at the top of the plot, and the data starts below the last row, so a plate never covers a mark. A reference's label takes the first spot that covers no line, area or bar and no other word: the right end above its line, then below, then the left end, then along the line. On a plot too small for any of those, it takes the spot that covers least. Across a horizontal chart, references stand upright and their labels stack in a row above the bars. All labels are on a halo of the plot's colour.

**Values.** A reference's own values count toward the y axis, so a target above every value is still on the plot. `y="mean"` and `y="median"` are read from the settled records of `series` (default: the first shown), and the label adds the value at the data's own precision: "Average 162.5 ms".

**Motion.** References are drawn in the plot's coordinates, so they glide with a rescale and the marks ([Motion](../../Motion.md), "Charts"), and a mean or median glides to its new value when the data changes. Under reduced motion they change in place.

**Without colour.** Under forced colours lines, labels, icons and leaders are `CanvasText`, bands are hatched in `GrayText` on `Canvas`, and plates get a 1px `CanvasText` border.

**Accessibility.** References and annotations are read after the chart's summary, written or generated, and on the keyboard path's summary node: "References: Normal range, 99.5% to 100%; Target 99.9% at 99.9%. 1 annotation: DNS outage, Mar 14, 2026." Plates that only label are hidden from assistive technology, since the summary lists them. Plates with `onSelect` are buttons in the tab order after the plot.

**Props.** `ChartReference`: `y` (a value, `[low, high]`, `'mean'` or `'median'`), `label`, `tone` (`'caution'` or `'critical'`), `series`. `ChartAnnotation`: `x` (as the data's x values are written), `label`, `onSelect`.

- Do say what a reference is in its label ("Target 99.9%"), not only its value.
- Do use `tone` only when crossing the line means good or bad.
- Do keep annotations to a few words; the plate is a label, not a note.
- Don't dash a reference line; a dash means "projected".
- Don't use a reference band for data. A range in the data is an uncertainty band (`LineChart`'s `band`).
