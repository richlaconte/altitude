# ChartBrush

Picks a time window on an overview of the whole series, under the plot: look at a year and read a fortnight without losing where you are (overview + detail; Cockburn, Karlson & Bederson, 2009). Put it inside a `LineChart`, `AreaChart` or `BarChart` over time.

**Why it's sunk, and why the window lifts.** Most chart libraries draw a brush as a grey rectangle with handles, which nobody recognises as something to drag. Altitude already has a build for "a window you slide along a range": the range `Slider`. The overview is an opening, a 40px trench (`surface-trench`, `trench`) with the series lying in it as a flat 1.5px line, because it's a track you slide along. Like a `Sparkline`'s line it spans its own low to high: it's there for the shape, and an area that didn't stand on zero would misstate every value. The window is a raised lens over it: level 1, a 2px `accent` rim and a clear face, level 2 on hover and 3 while held. Its two grips are the slider's thumbs. Outside the window the overview recedes to 35%.

**What it does.**

- **Drag the lens** to pan. The window keeps its length and stops at the ends.
- **Drag a grip** to resize. A grip pushed against the other stops a record short; the window always holds at least two records.
- **Press outside the lens** to centre the window there, then keep dragging to pan from it.
- A held grip shows its date in a bubble below the overview, clear of the plot's axis; panning shows both. Near an end, the bubble aligns to that end so it never leaves the frame.
- The frame says the window in words under the overview: "1 Mar – 30 Apr 2026".
- The chart shows only the window, and its axis spans exactly the window. The plot cross-fades to it, because the x values under the marks changed ([Motion](../../Motion.md), "Charts", rule 5).

**Accessibility.** The brush is a group named "Overview, 1 Jan – 31 Dec 2026" (or your `aria-label`). It follows the APG multi-thumb slider: "Window start" and "Window end" are each a Tab stop and a `role="slider"` with the date as `aria-valuetext`, bounded by the other grip; arrows step a record, Page Up/Down a tenth, and Home/End go to the grip's own bounds. The lens is a focusable group named "Window, 1 Mar – 30 Apr 2026": arrows pan both ends by a record, Page Up/Down by a tenth, Home and End to the start and the end.

**Without height.** Under forced colours the trench is dashed, the lens is a 1px `Highlight` border (2px while held), the grips are outlined in `CanvasText` and the line is `CanvasText`. With `contrast="more"` the lens rim is `ink`.

**Props.** `series`: the series the overview draws (default the chart's first shown series); `aria-label`; `className`. The window itself is the chart type's:

- `window={{ start, end }}` with `onWindowChange`, controlled. `start` and `end` are the records' own x values, so a `DateRange` from a `DateRangePicker` fits as it is, and the picker and the brush share one state. `null` leaves an end open.
- Neither, and the brush keeps its own window, starting over every record.

**You provide:** a `ChartBrush` inside the chart type, and the window state if anything else needs it.

```tsx
const [range, setRange] = React.useState({ start: '2026-03-01', end: '2026-04-30' });

<DateRangePicker value={range} onValueChange={setRange} />
<ChartContainer config={config}>
  <AreaChart data={year} x="day" window={range} onWindowChange={setRange}>
    <ChartBrush />
  </AreaChart>
</ChartContainer>
```

- Do use a brush when the whole range matters for context and a part of it for reading: a year and a fortnight.
- Do give the window a typed twin (a `DateRangePicker`) when exact dates matter; dragging is for finding, typing for stating.
- Don't use a brush for a few dozen records: the chart can show them all.
- Don't put a brush on a chart of categories; it windows records in their order, which only means something over time.
