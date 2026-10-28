# ChartLegend

Names each series, and optionally lets people hide and show series. Every chart with two or more series needs one, unless its marks are labelled directly (a `LineChart` with up to four series names each line at its end). A single series doesn't need one: the title names it.

**Why it's flat, or why it lifts.** A legend that only labels is settled: keys flush on the ground, each a swatch in its series colour (a block for bars, a short line for lines) and its name in `ink`. A legend you can toggle is a row of choices, and in most chart libraries those are invisible affordances: the key looks like a label and behaves like a button, which is the flat-UI failure Burmistrov et al. (2015) measured. So with `toggle` each key is built like a `Checkbox`. It's a ghost button that lifts one level when pointed at, because clicking it does something. It holds a trench (sunk, `surface-trench`) that the series colour pours into while the series is shown and drains out of when it's hidden. The fill is the series colour rather than `accent`, because the swatch *is* the key.

**What toggling does.** The series fades out of (or into) the plot over `dur-travel-1`. If y has to rescale, that's staged first, as every change to a chart is ([Motion](../../Motion.md), "Charts"). Hidden series keep their colour slots, so nothing else repaints. The last shown series can't be hidden; its key says "At least one series stays shown."

**Without height.** Under forced colours, swatches take each series' pattern, hidden swatches are dashed, and a hovered key gets a 1px border. With `contrast="more"` the trench gets a solid inner top edge.

**Accessibility.** A static legend is a list named "Series". A toggle legend is an APG toolbar named "Series" holding `aria-pressed` buttons, one per series, so a long legend is one Tab stop: ←/→ (or ↑/↓) move between keys, Home and End go to the ends, and Space or Enter toggles. Toggling is announced politely ("Costs hidden. 2 of 3 series shown.").

**Props.** `ChartLegend` takes `content`: a `ChartLegendContent` with these options:

- `toggle`: make the keys switches;
- `hidden` and `onHiddenChange`, controlled; or `defaultHidden`, uncontrolled;
- `label`: the toolbar's name, default "Series".

**You provide:** a `ChartLegend` inside the chart type or the container.

```tsx
<ChartContainer config={config}>
  <AreaChart data={usage} x="day" stack>
    <ChartLegend content={<ChartLegendContent toggle />} />
  </AreaChart>
</ChartContainer>

// controlled
<ChartLegendContent toggle hidden={hidden} onHiddenChange={setHidden} />
```

- Do label lines directly when there are four or fewer, and keep the legend for toggling.
- Do use `toggle` when people need to compare a few series out of many; otherwise a static legend is quieter.
- Don't let colour be the only link between a key and its series: under forced colours the keys show each series' pattern.
- Don't put the legend somewhere the chart's readout or summary can't be read alongside it.
