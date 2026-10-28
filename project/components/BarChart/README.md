# BarChart

Amounts compared across categories or periods: deploys per team, signups per month, cost per region. One series, several side by side (grouped), or stacked into a total. Length on a common baseline is the most accurately read encoding there is (Cleveland & McGill, 1984), so this is the workhorse chart. It renders inside a [`ChartContainer`](../ChartContainer/README.md).

**Why it's flat.** Bars are the record drawn as lengths, so they stand on the ground line: flat `data-*` fills, square where they meet the ground and rounded (`radius-xs`) only at the data end. Neighbours and stacked segments are parted by a real 2px gap, never a shadow or an outline. A bar never lifts, on hover or anywhere else: a lifted bar leaves the ground line or casts a shadow below its top, and both misstate its value. A negative bar hangs below the ground line. That's position, not depth: it has no inner wall and doesn't read as an opening. One series wears `data-1` throughout; bars are never coloured by their value.

**Without colour.** Under forced colours and in print, and with `patterns` on the container, each series gets its hatch (the first stays solid) and filled bars a `CanvasText` edge. With `contrast="more"` bars get a 1px `ink` edge and 3px gaps. Value labels are `ink` text, never a series colour.

**Motion.** Values glide at one level, re-sorts are carried, a rescale comes first, and nothing grows from the ground line on first render; a bar grows only when its value really goes from zero to something ([Motion](../../Motion.md), "Charts").

**Accessibility.** The container names the chart and summarises it; without a written `summary`, the generated one names the series and each one's lowest and highest category. The keyboard path through the bars and the readout are #63 and #52, and the table view is #64.

**Props:**

- `data` and `x`: the records and the key of each one's category;
- `sort`: `'desc'` or `'asc'` by total;
- `stack`: `true` for parts of a total, `'expand'` for shares of 100%;
- `layout="horizontal"`: categories down the side, for long names or many of them. Names longer than 40% of the width are cut with an ellipsis; the full name stays in the summary;
- `labels`: `'max'` labels the largest bar (or stack), `'last'` the last category's. Never every bar;
- `status`: which categories aren't yet the record (`'partial'` or `'projected'`), and `boundary`, the rule's word. See below.

**Filtering in place.** `relevance={(d) => 'match' | 'miss' | undefined}` recedes misses to 35% and keeps everything in place; `rescale` fits the axis to the matches. See [ChartContainer](../ChartContainer/README.md), "Filtering in place".

**Not yet the record.** `status={(d) => d.month === thisMonth ? 'partial' : undefined}` keeps this month so far from reading as a drop. A partial bar is its series colour hatched at 45° on the plot's own colour, with no solid fill; a projected one also keeps a 1.5px outline in its colour. Neither is lifted: a pending write hovers, but a bar that hovers misstates its value, so it says "not yet" with pattern and a word instead. A 1px `line-control` rule marks where the record ends, named "Today" (`boundary="…"` renames it, `boundary={false}` drops it). The bar's value label, readout, keyboard name and table row say "So far" or "Projected". When the period completes and its status goes, the hatching cross-fades to solid over `dur-travel-3`: it's been pressed into the record. Under forced colours the pending bar takes a dotted `CanvasText` outline, the same cue as a pending write.

The y axis always includes zero, whatever the container's `zero` says: a truncated bar axis isn't offered.

**You provide:** a `ChartContainer` with a `config` naming each series, the `data` and `x`, and usually a `summary`.

```tsx
<ChartContainer config={{ deploys: { label: 'Deploys' } }} summary="Cedar deployed most, 51 times.">
  <BarChart data={byTeam} x="team" sort="desc" labels="max" />
</ChartContainer>
```

- Do sort categories that have no order of their own, so the comparison reads at a glance.
- Do keep grouped bars to four series or fewer; past that, stack them or use small multiples.
- Do use `stack="expand"` only when the shares matter more than the totals, and say so in the title.
- Don't label every bar: label the one the chart is about, and leave the rest to the readout and the table.
- Don't colour bars by their value or give them a gradient; for polarity, a diverging ramp on a separate chart says it better.
