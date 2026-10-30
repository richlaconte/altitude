# DotPlot

Values compared across categories where zero isn't part of the story: ten services' p95, all between 180 and 240 ms; scores by team with their spread; last quarter against this one. A `BarChart` must stand on zero, which squashes differences of a few percent into identical bars, and bars of averages carry a measured misreading: values inside the bar are judged likelier than values equally far outside it (Newman & Scholl, 2012), which dot plots reduce (Okan et al., 2018). Without this form people reach for bars and either squash the data or truncate the axis, which Altitude forbids.

**Why it's flat.** The values are the record, so the dots lie on the plot as a `ScatterChart`'s do: at least 8px, a `data-*` fill (a marker shape per series when there's more than one), and a 2px ring of the plot's own colour so neighbours stay apart. Never raised, never shaded. The value is position, never height, on an axis that needn't include zero; with no zero there's no ground line, only the plot's foot, as on a `LineChart` that leaves zero off.

**Rows.** Categories run down the side, as on a horizontal `BarChart`, with the same label budget. Each row has a 1px `line` guide from its label across the plot. `sort="desc"` orders the rows by value (the first series', or `to`'s), and re-sorted rows are carried to their places.

**A spread.** `range={['p10', 'p90']}` draws a flat band of the series colour at 16% behind the dot, with round ends: an uncertainty band, as on a `LineChart`, never error bars, which readers misjudge (Correll & Gleicher, 2014). `rangeLabel` says what it is ("10th–90th percentile"). It joins the axis, the readout, each point's name ("Billing, p95, 236 ms. 10th–90th percentile 190 ms to 320 ms.") and a column of the table.

**Before and after.** `from="q2" to="q3"` makes a dumbbell: the earlier dot hollow, the later filled, both in one colour because they're one entity at two times, joined by a 2px `ink-muted` link. The change is said in words, as `compare` says it: "Up 7.5% from Q2" in the later dot's name, a row in the readout, "Q2" and "vs Q2" columns in the table, and "Against Q2: 4 rose, 1 fell." in the summary.

**Without colour.** Under forced colours the dots are `CanvasText` ringed in `Canvas` (a hollow dot is a `CanvasText` ring on `Canvas`), the spread `GrayText`, the link `CanvasText`. With `contrast="more"` the row guides are `line-control`, as gridlines are.

**Motion.** The container's engine: a rescale first, then the dots, their spreads and their links glide to their new values on `ease-glide`; re-sorted rows are carried. Nothing grows in on first render. Under reduced motion values change in place.

**Accessibility.** The keyboard path is one Tab stop: the summary, then the series, then the points down the rows. The generated summary names the range, the lowest and highest, and the widest spread. The readout, each point's name and the table view carry the spread and the change.

**Props:** `data`, `x`; `sort`; `range`, `rangeLabel`, `rangeSeries`; `from` and `to`; `zero` (default false); `relevance` and `rescale`; `selected`, `onSelect`, `drill`; `focus`; `tooltip`; `empty`.

**Selecting, drilling and filtering** work as on every chart: a mark that acts gets a 2px `ink` outline round its dots under the pointer or keyboard, never a lift; misses recede to 35% where they stand.

**You provide:** a `ChartContainer` whose `config` names and formats the value (or `from` and `to`), the records, and usually a `summary` or a `takeaway` that says what the comparison means.

```tsx
<ChartContainer config={{ p95: { label: 'p95', format: (v) => `${v} ms` } }}>
  <DotPlot data={services} x="service" range={['p10', 'p90']} rangeLabel="10th–90th percentile" sort="desc" />
</ChartContainer>

<ChartContainer config={{ q2: { label: 'Q2' }, q3: { label: 'Q3' } }}>
  <DotPlot data={teams} x="team" from="q2" to="q3" sort="desc" />
</ChartContainer>
```

- Do use it when the differences are a few percent of the values, or when each value is an average with a spread.
- Do sort the rows unless their order means something.
- Don't use it for change over time; that's a `LineChart`, which implies continuity.
- Don't set `zero` just to have it: if zero matters, a `BarChart` is usually the better form.
