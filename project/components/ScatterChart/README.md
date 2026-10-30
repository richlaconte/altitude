# ScatterChart

Two measures per record, to see whether they move together and to spot the ones that don't: response time against payload per endpoint, spend against seats per customer. It's the form for relationships, and nothing else does it. It renders inside a [`ChartContainer`](../ChartContainer/README.md), whose `config` names and formats the two measures.

**Why it's flat.** Dots are the record, so they lie on the plot: at least 8px (squares and triangles are drawn a little larger so they're 8px too), a `data-*` fill, and a 2px ring of the plot's own colour, so dots that overlap stay apart. No shadow, no sheen, no glow, no lift.

**Groups.** `group` sorts records into at most three groups, each a colour (`data-1` to `data-3`) and a marker shape (circle, square, triangle). It's three because any two dots can be neighbours, so every pair of colours has to stay apart for colour-blind readers, and the palette's first three slots are the ones validated that way. With more than three it warns, and the rest share `data-other`: show them as small multiples instead. A `ChartLegend` keys each group by its marker, and with `toggle` hides and shows groups. A hidden group leaves the plot and the keyboard path.

**Both axes are measures**, so neither has to include zero, both start and end on a tick, and each is named: y over its axis, x under its own.

**Labels and trend.** `label={(d) => d.p95 > 400 ? d.name : null}` names a few dots in `ink` on a halo of the plot's colour, with a 1px `ink-muted` leader. Each label goes to the first spot that clears the plot's edges and the words already placed: above right, above left, beside, then below. A label with nowhere to go is left out, and is still in the summary and the readout. `trend` draws the least-squares line as 1px `ink-muted`, named "Trend" (or the words you pass) at its right end.

**Reading a dot.** There's no crosshair: the pointer reads the nearest dot within 48px, the Voronoi cell it's in, so a dense cloud is still easy to read. The readout sits beside the dot and gives its name, both measures and its group, keyed by the group's colour. The dot under it is drawn again on top, so a dot that's overlapped can be seen whole.

**Without colour.** Under forced colours the dots are `CanvasText` ringed in `Canvas`, and the shapes carry the groups. With `contrast="more"` each dot is ringed in 1px `ink`.

**Motion.** With a stable `id`, dots glide to their new places when the data changes, at one level on `ease-glide`, after any rescale. Without one, a record has no identity to follow, so the plot cross-fades instead ([Motion](../../Motion.md), "Charts").

**Accessibility.** The keyboard path is one Tab stop. Enter goes from the summary to the leftmost dot. ← and → step through the dots in x order, ↑ and ↓ go to the nearest dot above or below, Home and End go to the first and last along x, and Page Up and Page Down move a tenth of the way. That's after Data Navigator (Elavsky, Nadolskis & Moritz, 2023). Each dot is named "Checkout list, Checkout. Payload 120 KB, p95 180 ms." Without a written `summary`, the generated one says how the measures relate ("p95 rises strongly with Payload (r = 0.78)"), their ranges, and the labelled dots. The table view has a row per record: its name, its group and both measures.

**Props:** `data`, `x`, `y`; `group`; `id` and `name` (a key or a function); `label`; `trend`; `size`; `tooltip`.

**Selecting, drilling and filtering.** `selected` (the record or its id) and `onSelect`, `drill`, and `relevance` (with `rescale`) work as on every chart: the chosen dot keeps its colour, the rest recede to 35%, and the frame says "Filtered to Vandelay". See [ChartContainer](../ChartContainer/README.md).

**Focus.** `focus={['Search']}` keeps those groups' colours (and every shape) and draws the rest in `data-context`; `focus={(d) => d.p95 > 250}` picks out dots instead. See [ChartContainer](../ChartContainer/README.md), "Focus".

**You provide:** a `ChartContainer` whose `config` names and formats both measures, the records, and usually a `summary` that says what the relationship means.

```tsx
<ChartContainer config={{ kb: { label: 'Payload', format: (v) => `${v} KB` }, ms: { label: 'p95', format: (v) => `${v} ms` } }}>
  <ScatterChart data={endpoints} x="kb" y="ms" group="service" id="path" name="path" label={(d) => (d.ms > 400 ? d.path : null)} trend>
    <ChartLegend content={<ChartLegendContent toggle label="Services" />} />
  </ScatterChart>
</ChartContainer>
```

- Do give records a stable `id` if the data updates, so dots glide instead of blinking.
- Do label only the dots worth a word; the rest are in the readout and the table.
- Do say what a correlation means in the `summary`; don't let a trend line stand in for a cause.
- Don't use more than three groups; split into small multiples.
- Don't size dots by a third measure; it's two measures per record, read by position.
