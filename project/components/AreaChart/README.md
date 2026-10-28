# AreaChart

A total over time and the parts that make it up (requests by region, storage by type), or a single volume over time. Stacked areas answer "how big, and from where"; `stack="expand"` answers "what share". It renders inside a [`ChartContainer`](../ChartContainer/README.md).

**Why it's flat.** Bands are the record. Each is a flat `data-*` fill, stacked on the ground line in config order from the bottom, and parted from the band above by a 2px line in the plot's own colour, the same gap a stacked bar's segments have. The topmost band carries a 2px top line in its colour. A single area is a flat `data-1` fill at reduced opacity under a 2px `data-1` line.

**No gradient fill.** Most libraries fade an area to transparent by default. Altitude's only face gradient is `--alt-sheen`, and it means "press it" (E4), so an area never has one.

**Stack order never changes.** Bands stack in config order, so a band never jumps to a new position when values change, and its colour stays its own. In a stack a missing value adds nothing (the bands above rest on the one below); in a single area it's a gap, as in a line.

**Named in place.** Stacked bands are labelled inside themselves in `ink`, on a halo of the plot's colour, at their thickest point, where they're at least 20px tall; thin bands rely on the legend and the readout. `labels={false}` turns this off.

**Without colour.** Under forced colours and in print, and with `patterns` on the container, each band takes its slot's hatch (the first band is solid). With `contrast="more"` the separators are 3px `ink`.

**Motion.** As `LineChart`: when the x values are the same, bands glide to their new values on `ease-glide`, after any rescale; when they differ, the old chart and the new one cross-fade. Nothing grows from the ground on first render ([Motion](../../Motion.md), "Charts"). While data loads, the imprint is an area pressed into the page.

**Accessibility.** The keyboard path is the container's (#63): ←/→ along x and, in a stack, ↑/↓ through the bands at that x, from the bottom up, so ↑ goes to the band above. Each point names its band's value and its share of the total: "Oct 1, 2026, EU, 1.1K. 34% of 3.2K. 1 of 14." The table view (`views`) has a column per band and a Total.

**Props:** `data` and `x`; `stack` (`true` or `'expand'`); `curve` (`'linear'` or `'monotone'`); `y={{ format }}`; `labels`; `tooltip`; and a `ChartTooltip` or `ChartLegend` as children.

**You provide:** a `ChartContainer` whose `config` names each band in stacking order (the base first), the `data` in x order, and usually a `summary`.

```tsx
<ChartContainer config={{ us: { label: 'US' }, eu: { label: 'EU' }, apac: { label: 'APAC' } }}>
  <AreaChart data={requests} x="day" stack />          {/* stack="expand" for 100% */}
</ChartContainer>
```

- Do put the largest or steadiest part at the bottom, where it stands on the ground line and reads most accurately.
- Do use `stack="expand"` only when the share is the point; the totals disappear.
- Do keep to six bands or fewer; fold the rest into one "Other" series.
- Don't overlay several unstacked areas; compare trends with a `LineChart`.
- Don't add a gradient, a glow or a shadow to make it look richer.
