# ChartContainer

The frame every chart shares. It sizes the plot, turns data into positions (the scales), draws the axes, the gridlines and the ground line, gives each series a label, a format and a colour slot, and names and summarises the chart. Every chart type renders inside it, and so can marks you draw yourself.

**Why it's flush.** A chart is the record drawn as a shape (see [Charts](../../Charts.md)), so everything in the frame lies on whatever it sits on, the page or a `Card`'s `surface-raised`, at no level and with no shadow. Amounts are length and position on a flat plot standing on the ground line, never height: the zero baseline is a 1px `ink-muted` rule, the same ground line `Stepper` and the `Drilldown` staircase stand on. Gridlines are `line` hairlines, horizontal only. When zero isn't on the axis (a line chart may leave it off), the plot's foot is an ordinary gridline, not the ground line. Tick labels are caption text in `ink-muted` with tabular figures. Marks wear `data-*` colours and nothing else. On resize the frame lays out again without animating.

**Without height, and without colour.** Nothing here relies on height to begin with. Colour is never alone either: each slot carries a redundant encoding, fixed like its colour.

| Slot | Line dash | Marker | Fill hatch |
|---|---|---|---|
| `data-1` | solid | circle | none (solid) |
| `data-2` | 6 3 | square | 45° lines |
| `data-3` | 2 2 | triangle | 135° lines |
| `data-4` | 8 3 2 3 | diamond | dots |
| `data-5` | 12 4 | ring | horizontal lines |
| `data-6` | 4 2 1 2 | cross | crosshatch |
| `data-other` | 1 3 | circle | dots |

Patterns are on under forced colours and in print, and anywhere with `patterns` (for readers who want them, or a chart whose slots fall in the colour-blind warning band). Under forced colours:

- marks are `CanvasText`, hatches are `CanvasText` on `Canvas`, and fills get a `CanvasText` edge;
- tick labels and the ground line are `CanvasText`, and gridlines are `GrayText`;
- `directLabels` turns on, as it does in print, so chart types label series at their marks.

With `contrast="more"`, lines are 3px, adjacent marks are 3px apart, fills get a 1px `ink` edge, gridlines take `line-control` and the ground line `ink`.

**Accessibility.** It's a `figure`, named by its `title` or by `aria-labelledby` (point it at the `CardTitle`), and described by its description and a summary. Pass `summary` with what the chart shows ("Revenue rose 44% while costs held flat."): it's shown under the plot. Without it a summary is generated for screen readers: the chart's kind, its series, the x range, and each series' lowest and highest values with where they fall. The plot is a `group` with `aria-roledescription="chart"`, and its SVG is hidden from assistive technology.

**Say one thing first.** `takeaway` is the one thing the chart says, set as its heading in `text-heading` ink ("Cedar deployed nearly three times as often as Delta"). The `title` then sits above it as a caption-sized `ink-muted` label, so the chart is still named: the figure's accessible name stays the title, and its description is the takeaway, then the summary. When the takeaway's words change with the data they cross-fade over `dur-travel-2`, without the afterglow. Write it yourself, from the data shown; nothing generates one, because a slanted or trivial headline is worse than none. In a `Card`, name the chart with the figure's `title` rather than a `CardTitle`, so the takeaway isn't a second heading under the card's. See [Charts](../../Charts.md), rule 9.

```tsx
<ChartContainer config={config} title="Deploys by team" takeaway="Cedar deployed nearly three times as often as Delta"
  summary="Cedar deployed most, 51 times; Delta least, 19.">
  <BarChart data={deploys} x="team" sort="desc" />
</ChartContainer>
```

**Axis text.** Tick labels are captions: 13px, weight 400, `ink-muted`, tabular figures. Weight 500 is for labels on controls, so axis text is lighter, and the frame's words rank below the marks, the ground line and the references. (This changed from 500 12.5px in #193, with no API change.) `yLabels="inline"` sets each y label just above its gridline at the plot's left, on a halo of the plot's colour, so the plot runs the card's full width: 56px more in a 440px card, about a fifth of the plot at phone width. The top label carries the unit ("250 ms"), the rest only the number. A label that would sit on a line, an area or a bar is left out, and its gridline stays. The ground line goes unlabelled, because it's zero. It's for vertical cartesian charts; the default stays `'gutter'`.

**The keyboard path.** The plot is one Tab stop: a layer of focusable nodes over the SVG, one level at a time, with a roving tabindex. After Olli and Data Navigator, it goes from the summary to the series to the data:

| Key | On the summary | On a series | On a point |
|---|---|---|---|
| ←/→ | — | previous/next series | previous/next x |
| ↑/↓ | — | previous/next series | same x, previous/next series |
| Home/End | — | first/last series | first/last x |
| Page Up/Down | — | — | ±10% of the x range |
| Enter | into the series | into its points | — |
| Escape | — | back to the summary | back to its series |

A chart with one series skips the series level. In a stacked `AreaChart`, whose bands are drawn from the bottom up, ↑ moves to the band above and ↓ to the one below. The nodes are named:

- **the summary:** the written `summary`, or the generated one, then "Press Enter to explore the series";
- **a series:** "Revenue, 12 points, $61K to $104K, rising. 1 of 2.";
- **a point:** "Mar 1, 2026, Revenue, $83K. Down 2% from Feb 1, 2026. 9 of 12." Stacks add "Total …"; a stacked `AreaChart` says the band's share instead ("34% of 3.2K").

A focused point gets a 2px `accent-ink` ring on its mark (`Highlight` under forced colours) and opens the readout, so keyboard and pointer get the same feedback. A focused series draws the others receded. Chart types say where each of their marks sits (`chartPoint`); hand-drawn marks get a ring at `(xOf, y(value))`. The table view is #64.

**Scales.** All in-house, no dependency:

- `band` for categories, in data order, with `bandPadding` (default 0.2) between them;
- `time` for ISO `'YYYY-MM-DD'` strings (read as UTC, as `DatePicker` writes them), timestamps or `Date`s, with ticks at whole days, weeks, months, quarters or years, as many as fit;
- `linear` for other numbers;
- y is always linear, with about five 1–2–5 ticks, made nice, and includes zero unless you pass `zero={false}`. Bars always need zero.

x is inferred from the first value of `x`; set `xScale` to override it. Numbers and dates are formatted with `Intl`, in the reader's locale unless you pass `locale`.

**Colour.** Series take slots in config order: the first is `data-1`, the seventh and later are `data-other`. Set `color: 'data-3'` to pin one. The order is fixed for the chart's life, so hiding or filtering a series never repaints the others. The figure also sets `--color-<key>` for each series, for your own CSS.

**Focus.** A chart type's `focus` says what the chart is about: `focus={['eu']}` keeps those series' colours and draws the rest in `data-context`, one flat neutral, with their end labels and legend keys in `ink-muted`; on bars and dots, `focus={(d) => d.team === 'Cedar'}` does the same for records. It's said in words: "Highlighted: EU." leads the generated summary (and follows a written one), focused legend keys say "highlighted", and the readout and the keyboard path list focused series first. Changing it cross-fades the colours over `dur-travel-1`, at once under reduced motion. It's the author's statement of importance, not a reader's control; the reader's is `relevance`, which recedes misses to 35% without repainting, so the two never read alike. Your own marks get it from `encode(key, d).context` and its colour. Pair it with a `takeaway`: when the words and the colour pick out the same thing, that's what people remember (E102, E105).

**Motion.** When the data changes, the frame moves its marks by the one engine every chart shares ([Motion](../../Motion.md), "Charts"). Values glide at one level on `ease-glide`, after the axis has rescaled if its domain changed, never at the same time. Re-sorted bands are carried, and records and series entering or leaving cross-fade. First render, a change of x under a line, more than 500 marks and reduced motion all cross-fade instead. Resizing never animates. The plot's `data-stage` says where a change is (`rescale`, `values` or `fade`).

**Loading, refetch and nothing.** Pass what you have (`data={query.data}`) and the frame does the rest, Suspense-native like `DataTable`:

| `data` | What shows |
|---|---|
| `undefined`, or a pending promise | an imprint after `dur-grace`: the title, description and legend in place, the plot pressed into the page in the chart's shape (`surface-well` bars, a band, or an area), no labels, `aria-busy` and "Loading" |
| arrives | the marks fade in place. Unlike `Await`'s content they never rise out of the imprint, because a rising bar would leave the ground line and misstate its value |
| `null` or `[]` | an `EmptyState` at widget size in the plot's own box, with no axes; set its words and action with `empty={{ title, description, action }}` (on the container or the chart type). All-zero data is real data, and is drawn |
| a new promise while data shows, or `refreshing` | the old chart stays; after `dur-grace` its marks drop to half strength, with `aria-busy` and "Updating". Nothing is imprinted over what someone is reading |
| rejected | your error boundary (put an `Alert` there), as with `Await` |

A `RevealGroup` around a row of charts and stats lands them together.

**The table view.** `views` adds a segmented Chart | Table control beside the title: the same record as a sortable `DataTable`, x first (headed by `xLabel`), a column per series in its own format, and a Total for stacks. It sits in the chart's own box and scrolls there, so switching doesn't move the page; the two views cross-fade over `dur-travel-2`, and the hidden one is inert. `views="table"` starts on the table; `view` and `onViewChange` control it. It's opt-in so that small widget charts don't each grow a control; give it to any chart people may want to read, copy or check.

**Not yet the record.** `BarChart`, `LineChart` and `AreaChart` take `status={(d) => 'partial' | 'projected' | undefined}`. The ground is the record, and a projection or an unfinished period isn't yet, so it's drawn hatched or dashed, never raised, and said in words: "So far" or "Projected" in point names ("Oct 1, 2026, Revenue, $61K, so far."), after the readout's heading, in a Status column in the table, and at the end of the generated summary, whose trend and extremes are read from the settled records. A 1px `line-control` rule named "Today" marks where the record ends. For your own marks, `useChart()` gives `status(d)`, `statusRanges` (the stretches of x that are pending, for `ChartStatusClip`) and `encode(key).pending`, `pendingOpacity` and `pendingDash`.

**Marks you can select or drill into.** Give a chart type `onSelect` (with `selected`), or `drill` inside a `Drilldown`, and its marks act. Hover is a promise, so only then do they respond to the pointer:

- **Hover:** a pointer cursor, a 2px `ink` outline on the record's marks (appearing over `dur-travel-1`), and the readout ends with the action: "Select to filter", "Select to clear", "Select to open". A mark can't lift without misstating its value, so the outline, cursor and readout carry the cue, and height stays with the readout. Without `onSelect` or `drill`, marks don't respond at all; only the crosshair and readout do.
- **Selected:** the selected record keeps its full colour and the others recede to 35%, in the same language as a filter. The frame says "Filtered to EU" with a "Clear" ghost button, and so does the summary. Choosing it again, Clear or Escape clears it.
- **Drilling:** `drill={(d) => d.q}` returns the id of the current `Drilldown` node's child to open. The child is laid on top as a sheet with a step added to the breadcrumb staircase, `Drilldown`'s own choreography, and focus moves to the new chart's summary. A node with `content` and `children` shows its content and lets the chart open the children (`useDrilldown().open(id)`).
- **Keyboard and touch:** on a point, Enter or Space selects or drills, and points carry `aria-pressed` (or `aria-haspopup` for a drill) and say what Enter does. A tap selects; press and hold still shows the readout. Under forced colours the outline is `Highlight`.

**Filtering in place.** `BarChart`, `LineChart` and `AreaChart` take `relevance={(d) => 'match' | 'miss' | undefined}`, to pair with a `FilterBar`, a legend or a selection in another chart. Filtered-out data stays where it was, so nothing you'd just read is reshuffled:

- **Misses recede** to 35% opacity, keeping their place and their colour slot; their value labels turn `ink-muted`. A line or an area recedes around each missing record (each owns its stretch of x, to the midpoints with its neighbours), so its shape never changes. The change cross-fades over `dur-travel-1`.
- **The axis holds** by default. `rescale` fits it to the matches, and the rescale is staged like any other.
- **It's said in words.** The frame shows "4 of 12 match" (`countLabel` rewrites it: "4 of 12 services match"), and so does the summary. A miss says "Not matching." in its point name and readout.
- **Contrast only.** Elsewhere relevance raises matches, but marks can't rise, so in a chart it's spent as contrast alone. Under forced colours misses are `GrayText`.

`useChart()` gives `relevance(d)`, `hasRelevance` and `relevanceRegions`; wrap your own marks in `ChartRelevance`. `BarList` takes the same `relevance`, and there rows rise and sink as `TableRow`s do.

**Live data.** `live` is for charts that update on their own (deploys, error rates, queue depth). People miss changes they weren't attending to, so, as elsewhere in Altitude, a change shows at once and leaves a fading trace:

- **A changed mark glows.** A point or bar whose value is new or changed carries a 2px `ink` outline (an outline, not height), full for the first second and decaying over `dur-settle` on `ease-decay`, with its value beside it for that first second. Its point name says "Changed." until it fades. Afterglows share the page's attention budget (`riseDelay`), so no more than four begin in any 250ms.
- **A whole refresh is one change.** If more than four marks change at once, none glows; the "Updated 12:04" caption under the plot gets a ground-level tint instead, as a table re-sort does.
- **A window glides.** A chart type's `window` (`{ minutes: 15 }`) keeps the latest stretch of x. When it moves on, x glides one step on `ease-glide` over `dur-travel-2` and the marks ride with it, clipped to the plot. The motion is the passage of time. Under reduced motion it updates in place.
- **It holds still while you read.** While the pointer or keyboard focus is in the plot, updates wait and the caption says "new data when you move away"; they land when you leave, so the readout never changes under you. `pausable` adds a "Pause updates" `Switch` (WCAG 2.2.2); `paused` and `onPausedChange` control it.
- **It doesn't chatter.** Nothing is announced per tick. `announce={(data, previous) => …}` returns a sentence for what matters ("Error rate crossed 2%"), said politely.

**References and annotations.** [`ChartReference`](../ChartReference/README.md) draws a target, a limit, a normal range or the mean as a flush 1px line or a flat band, and `ChartAnnotation` marks an event on x with a `Badge` plate and a leader. Place them inside the chart type or the container. The frame draws them, so their labels are laid out together and kept clear of each other, and they're read after the summary.

**Charts that draw their own plot.** A [`Heatmap`](../Heatmap/README.md) has no value axis: its cells lie on two categories it names itself. The frame leaves out the gridlines, the ground line, the axes and the crosshair, makes the plot as tall as the cells need, puts the readout beside the cell, and goes from the summary straight to the cells, which the chart type moves between by row and column. A [`ScatterChart`](../ScatterChart/README.md) keeps the axes but both are measures: the frame finds the nearest dot in two dimensions, leaves out the crosshair, puts the readout beside the dot, and lets the chart type name each axis in room above and below the plot. Its series are its groups rather than the config's keys; the config names the two measures. Records are known by their own id rather than by x, for motion, the table, selection and live changes. Records without one cross-fade rather than glide.

**Readout and legend.** Every chart has a readout ([`ChartTooltip`](../ChartTooltip/README.md)); add a [`ChartLegend`](../ChartLegend/README.md) to name series, or to let people hide and show them. Hidden series keep their slots and leave the scales. A [`ChartBrush`](../ChartBrush/README.md) inside a chart over time adds an overview under the plot to pick a window on.

**Your own marks.** `useChart()` gives you the following, and children are drawn inside the plot, in its coordinates, under the ground line's rule:

- `width` and `height`: the plot's size;
- the `x` and `y` scales, and `xOf(datum)` (a band's centre, or a time or value);
- `ground`: the y of the ground line;
- `data`: the records as they're shown right now (gliding values, lingering leavers);
- `alpha(datum, seriesKey)`: how present a mark is while it enters or leaves, to multiply into its opacity;
- `series`, with their colours and formats, and `format`;
- `encode(key)`: the series' `fill`, `stroke`, `dash`, `marker` and `edge` for the current mode. `ChartMarker` draws the marker shape;
- `patterns`, `directLabels`, `strokeWidth` and `gap`;
- `status(datum)`, `hasStatus` and `statusRanges`, for data that isn't yet the record.

Draw with `encode()` rather than `series.color`, and forced colours, print and `contrast="more"` are handled for you.

Draw from these and your marks move like every other chart's.

```tsx
function Target({ value }) {
  const { y, width } = useChart();
  return <line x1={0} x2={width} y1={y(value)} y2={y(value)} stroke="var(--ink-muted)" strokeDasharray="4 3" />;
}
```

**You provide:** `config` (each data key: `label`, optionally `format` and `color`), the `data` and its `x` key (or a chart type inside that takes them), and a size: `aspect` (width ÷ height, default 2) or `height` in px. Usually a `summary`, and `aria-labelledby` or `title`; a `takeaway` when the chart makes a point.

- Do give every chart a summary that says what it shows, not what it is.
- Do put a chart on a dashboard in a `Card`: the card is raised because it's something you work with, not because its data is.
- Do keep one y axis. Two measures of different scale are two charts.
- Don't give marks a shadow, a wall, a sheen, a gradient or a lift.
- Don't colour text with a series colour; labels and ticks wear `ink` and `ink-muted`.
- Don't draw more than about 2,000 marks: SVG gets slow. Aggregate, or use a canvas library with Altitude's theme (#77).
