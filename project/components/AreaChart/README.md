# AreaChart

A total over time and the parts that make it up (requests by region, storage by type), or a single volume over time. Stacked areas answer "how big, and from where"; `stack="expand"` answers "what share". It renders inside a [`ChartContainer`](../ChartContainer/README.md).

**Why it's flat.** Bands are the record. Each is a flat `data-*` fill, stacked on the ground line in config order from the bottom, and parted from the band above by a 2px line in the plot's own colour, the same gap a stacked bar's segments have. The topmost band carries a 2px top line in its colour. A single area is a flat `data-1` fill at reduced opacity under a 2px `data-1` line.

**No gradient fill.** Most libraries fade an area to transparent by default. Altitude's only face gradient is `--alt-sheen`, and it means "press it" (E4), so an area never has one.

**Stack order never changes.** Bands stack in config order, so a band never jumps to a new position when values change, and its colour stays its own. In a stack a missing value adds nothing (the bands above rest on the one below); in a single area it's a gap, as in a line.

**Named in place.** Stacked bands are labelled inside themselves in `ink`, on a halo of the plot's colour, at their thickest point, where they're at least 20px tall; thin bands rely on the legend and the readout. `labels={false}` turns this off.

**Without colour.** Under forced colours and in print, and with `patterns` on the container, each band takes its slot's hatch (the first band is solid). With `contrast="more"` the separators are 3px `ink`.

**Motion.** As `LineChart`: when the x values are the same, bands glide to their new values on `ease-glide`, after any rescale; when they differ, the old chart and the new one cross-fade. Nothing grows from the ground on first render ([Motion](../../Motion.md), "Charts"). While data loads, the imprint is an area pressed into the page.

**Accessibility.** The keyboard path is the container's (#63): ←/→ along x and, in a stack, ↑/↓ through the bands at that x, from the bottom up, so ↑ goes to the band above. Each point names its band's value and its share of the total: "Oct 1, 2026, EU, 1.1K. 34% of 3.2K. 1 of 14." The table view (`views`) has a column per band and a Total.

**Not yet the record.** `status` marks partial or projected records. From the last settled point on, every band is hatched in its colour on the plot's own, with no solid fill, and the top line is dashed. A 1px `line-control` rule named "Today" (`boundary`) marks where the record ends, and the readout, point names and table say "Projected" or "So far". While patterns are on, a band with its own hatch keeps it there, faded, so bands stay told apart.

**Indexed, or as change.** An unstacked area takes the container's `yMode` as a line does (see [ChartContainer](../ChartContainer/README.md)); a stack keeps its values, because indexed parts don't add up to an indexed whole.

**Selecting and drilling.** `selected` and `onSelect` make the marks a selection that cross-filters the rest of a dashboard, and `drill` opens a level down inside a `Drilldown`. Hover only promises what a click does. See [ChartContainer](../ChartContainer/README.md), "Marks you can select or drill into".

**Filtering in place.** `relevance` recedes the bands to 35% around each missing record, so the stack keeps its shape; `rescale` fits the axis to the matches. See [ChartContainer](../ChartContainer/README.md), "Filtering in place".

**A sliding window.** `window` works as `LineChart`'s: the latest stretch of x, gliding one step in a `live` container, or a chosen `{ start, end }`, which a `ChartBrush` sets (`onWindowChange`).

**Props:** `data` and `x`; `window` and `onWindowChange`; `stack` (`true` or `'expand'`); `curve` (`'linear'` or `'monotone'`); `y={{ format }}`; `labels`; `tooltip`; `status` and `boundary`; and a `ChartTooltip` or `ChartLegend` as children.

**Focus.** `focus={['team']}` keeps those bands' colours and draws the rest in `data-context`, their labels in `ink-muted`. The stack's order doesn't change. See [ChartContainer](../ChartContainer/README.md), "Focus".

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

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`AreaChart` as first used in its preview:

```tsx
import { AreaChart, ChartLegend, ChartLegendContent } from 'altitude-design';

<AreaChart data={week ? reqB : reqA} x="day" stack curve="monotone">
  <ChartLegend content={<ChartLegendContent toggle />} />
</AreaChart>
```

The full preview, as rendered in Storybook and checked in CI (`ac`, `wide` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { AreaChart, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ChartContainer, ChartLegend, ChartLegendContent } from 'altitude-design';

const acDays = Array.from({ length: 14 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
const reqA = acDays.map((day, i) => ({ day, us: 1600 + i * 40 + (i % 3) * 90, eu: 1100 + Math.round(180 * Math.sin(i / 2)), apac: 520 + i * 35 }));
const reqB = acDays.map((day, i) => ({ day, us: 1500 + i * 55 + (i % 4) * 70, eu: 1250 + Math.round(140 * Math.cos(i / 2)), apac: 700 + i * 20 }));
const plans = ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01']
  .map((month, i) => ({ month, free: 620 - i * 30, team: 210 + i * 22, business: 90 + i * 15, enterprise: 20 + i * 6 }));
const storage = acDays.map((day, i) => ({ day, used: [41, 42, 42.5, 44, 45, 45.2, 47, 49, 50, 50.4, 53, 55, 56, 58][i] }));
const k = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
function Chart({ id, title, sub, children, className, ...props }) {
  return (
    <Card className={className}>
      <CardHeader><CardTitle id={id}>{title}</CardTitle><CardDescription>{sub}</CardDescription></CardHeader>
      <CardContent><ChartContainer aria-labelledby={id} {...props}>{children}</ChartContainer></CardContent>
    </Card>
  );
}
export default function App() {
  const [week, setWeek] = React.useState(0);
  return (
    <div className="ac">
      <Chart className="wide" id="a1" title="Requests by region" sub={<>Stacked: the total and where it came from · <Button size="sm" variant="ghost" onClick={() => setWeek((w) => 1 - w)}>{week ? 'First week' : 'Second week'}</Button></>}
        config={{ us: { label: 'US', format: k.format }, eu: { label: 'EU', format: k.format }, apac: { label: 'APAC', format: k.format } }} aspect={3.2} views>
        <AreaChart data={week ? reqB : reqA} x="day" stack curve="monotone">
          <ChartLegend content={<ChartLegendContent toggle />} />
        </AreaChart>
      </Chart>
      <Chart id="a2" title="Accounts by plan" sub='stack="expand", focus on Team'
        config={{ free: { label: 'Free' }, team: { label: 'Team' }, business: { label: 'Business' }, enterprise: { label: 'Enterprise' } }} aspect={1.7}>
        <AreaChart data={plans} x="month" stack="expand" focus={['team']} />
      </Chart>
      <Chart id="a3" title="Storage used" sub="One area: a flat fill under its line" config={{ used: { label: 'Used', format: (v) => `${v} GB` } }} aspect={1.7}
        summary="Storage use rose from 41 GB to 58 GB over two weeks, fastest in the second.">
        <AreaChart data={storage} x="day" />
      </Chart>
    </div>
  );
}
```
<!-- /example -->
