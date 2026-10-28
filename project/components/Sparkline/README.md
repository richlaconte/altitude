# Sparkline

A trend the size of a word: the last 30 days of a metric in a `DataTable` cell, a `PropertyList` value, a `Stat`, or a sentence. It says rising, falling, spiky or flat at a glance, beside the number that gives the detail (after Tufte's sparklines).

**Why it's flat.** A sparkline is part of the record in the row it sits in, so it lies on the ground like every mark a chart draws: a 1.5px stroke with round joins, no fill under it, no shadow, no glow. There are no axes, gridlines or readout; the text beside it carries the numbers. The last point wears a 4px marker, so you can see where "now" is. `kind="bar"` draws flat bars 1px apart, standing on zero, for counts. A missing value (`null`) is a gap, never bridged. A normal range (`band`) is a flat band of `line` behind the marks.

**Its size.** Its height is the line height of the text it sits beside (`1lh`), and it sits in that line. Its width is `5em` unless you give one.

**Colour does one job.** By default it's `ink-muted`: context for the number beside it. `tone="data"` makes it `data-1`, when the sparkline *is* the series. `positive`, `caution` or `critical` only when the series means good or bad, and then the text beside it says so too ("Rising"), because colour never travels alone.

**Accessibility.** It's `role="img"` with a generated label that says the trend in words: "Up 17% over 30 days, from 1.2K to 1.4K. Low 1.2K, high 1.5K." With `x` naming daily dates it says "days"; otherwise "values". With a `band` it counts the values outside it. An `aria-label` you pass goes first ("Signups, last 30 days. Up 17%…"); `summary` replaces the generated text. When the row already says it, pass `decorative` and it's hidden from assistive technology. It's never focusable. Under forced colours it's drawn in `CanvasText` and the band is a dashed outline; under `contrast="more"` the line is 2px.

**Loading.** Pass `data` as it is: `undefined` while it loads, or a promise, and it's an imprint one line high and its own width (`Await`), which lands within the attention budget. A value that changes in a live table gets the row's afterglow, not a sparkline animation.

**Props:** `data` (numbers, or records with `y`); `y`; `x` (a date key, for the label); `kind` (`'line'` or `'bar'`); `tone` (`'neutral'`, `'data'`, `'positive'`, `'caution'`, `'critical'`); `band` (`[low, high]`); `width`; `format` (for the label; default compact); `summary`; `decorative`; `locale`.

**You provide:** the values, oldest first; the number they explain, beside them; and either an `aria-label` naming the measure or `decorative` when the row already says it all.

```tsx
<Sparkline data={daily} x="day" y="signups" aria-label="Signups, last 30 days" />
<DataTable columns={[…, { key: 'trend', header: 'Last 30 days', cell: (r) => <Sparkline data={r.daily} decorative /> }]} rows={teams} />
```

- Do put the number it explains right beside it; a sparkline alone has no scale.
- Do use `kind="bar"` for discrete counts (deploys per day), and the line for measures.
- Do leave missing values as `null`.
- Don't give it axes, a tooltip or a legend; when someone needs to read values, that's a `LineChart`.
- Don't colour it with a status hue unless the series means good or bad, and say so in words beside it.
- Don't compare sparklines in different rows as if they shared a scale: each is scaled to its own values.
