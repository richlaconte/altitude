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

**Accessibility.** It's a `figure`, named by its `title` or by `aria-labelledby` (point it at the `CardTitle`), and described by its description and a summary. Pass `summary` with what the chart shows ("Revenue rose 44% while costs held flat."): it's shown under the plot. Without it a summary is generated for screen readers: the chart's kind, its series, the x range, and each series' lowest and highest values with where they fall. The plot is a `group` with `aria-roledescription="chart"`, and its SVG is hidden from assistive technology; the keyboard path through the data and the table view come with the chart types (#63, #64).

**Scales.** All in-house, no dependency:

- `band` for categories, in data order, with `bandPadding` (default 0.2) between them;
- `time` for ISO `'YYYY-MM-DD'` strings (read as UTC, as `DatePicker` writes them), timestamps or `Date`s, with ticks at whole days, weeks, months, quarters or years, as many as fit;
- `linear` for other numbers;
- y is always linear, with about five 1–2–5 ticks, made nice, and includes zero unless you pass `zero={false}`. Bars always need zero.

x is inferred from the first value of `x`; set `xScale` to override it. Numbers and dates are formatted with `Intl`, in the reader's locale unless you pass `locale`.

**Colour.** Series take slots in config order: the first is `data-1`, the seventh and later are `data-other`. Set `color: 'data-3'` to pin one. The order is fixed for the chart's life, so hiding or filtering a series never repaints the others. The figure also sets `--color-<key>` for each series, for your own CSS.

**Motion.** When the data changes, the frame moves its marks by the one engine every chart shares ([Motion](../../Motion.md), "Charts"). Values glide at one level on `ease-glide`, after the axis has rescaled if its domain changed, never at the same time. Re-sorted bands are carried, and records and series entering or leaving cross-fade. First render, a change of x under a line, more than 500 marks and reduced motion all cross-fade instead. Resizing never animates. The plot's `data-stage` says where a change is (`rescale`, `values` or `fade`).

**Your own marks.** `useChart()` gives you the following, and children are drawn inside the plot, in its coordinates, under the ground line's rule:

- `width` and `height`: the plot's size;
- the `x` and `y` scales, and `xOf(datum)` (a band's centre, or a time or value);
- `ground`: the y of the ground line;
- `data`: the records as they're shown right now (gliding values, lingering leavers);
- `alpha(datum, seriesKey)`: how present a mark is while it enters or leaves, to multiply into its opacity;
- `series`, with their colours and formats, and `format`;
- `encode(key)`: the series' `fill`, `stroke`, `dash`, `marker` and `edge` for the current mode. `ChartMarker` draws the marker shape;
- `patterns`, `directLabels`, `strokeWidth` and `gap`.

Draw with `encode()` rather than `series.color`, and forced colours, print and `contrast="more"` are handled for you.

Draw from these and your marks move like every other chart's.

```tsx
function Target({ value }) {
  const { y, width } = useChart();
  return <line x1={0} x2={width} y1={y(value)} y2={y(value)} stroke="var(--ink-muted)" strokeDasharray="4 3" />;
}
```

**You provide:** `config` (each data key: `label`, optionally `format` and `color`), the `data` and its `x` key (or a chart type inside that takes them), and a size: `aspect` (width ÷ height, default 2) or `height` in px. Usually a `summary`, and `aria-labelledby` or `title`.

- Do give every chart a summary that says what it shows, not what it is.
- Do put a chart on a dashboard in a `Card`: the card is raised because it's something you work with, not because its data is.
- Do keep one y axis. Two measures of different scale are two charts.
- Don't give marks a shadow, a wall, a sheen, a gradient or a lift.
- Don't colour text with a series colour; labels and ticks wear `ink` and `ink-muted`.
- Don't draw more than about 2,000 marks: SVG gets slow. Aggregate, or use a canvas library with Altitude's theme (#77).
