# Heatmap

A value per cell across two dimensions: load by hour and weekday, error rate by service and region, or activity by day over a year (`variant="calendar"`, as in GitHub's contributions). It renders inside a [`ChartContainer`](../ChartContainer/README.md), which gives it the frame, the readout, the keyboard path, the table view, loading and empty states.

**Why it's flat.** The cells are the record, so they lie on the plot: flat fills, parted by a 2px gap of the plot's own colour and rounded at `radius-xs` (less on small cells, so a cell stays a square). No shadow, no wall, no sheen and no gradient. Amounts are carried by the **Amounts** signal's colour channel, the sequential ramp, never by height.

**Steps, not a gradient.** Values are binned into two to seven steps (`bins={[0, 1, 4, 10]}` gives "0", "1–3", "4–9", "10+"), spread over `data-seq-1` to `data-seq-7`, so each colour is a class you can name and find in the legend. Zero is the lightest step. Without `bins`, counts get a step of their own for zero and even steps above it, and other values five to seven even steps. `scale="diverging"` uses `data-div-*` around `data-div-mid` for which side of `midpoint` (default 0) a value is on; without `bins` that's seven steps on round numbers, the middle one within a step of the midpoint.

**No data.** A cell with no record, or a `null` value, has no fill and a 1px `line` outline, and says "No data". It isn't a well: it isn't waiting for anything.

**The legend** is the steps as swatches, each with its range in words, under the cells (`legend={false}` to leave it out). Ranges say their unit once ("−0.5 to +0.5 pts").

**Layout.** In the grid, columns fill the width and rows are as tall as a column is wide, up to 34px. In the calendar, a column is a week (`weekStart` 0, Sunday, or 1, Monday), months are named above the week each begins in, and Mon, Wed and Fri down the side. The plot is as tall as its cells need. Cells are at least 10px: narrower than that, the columns wrap into bands (a year into three at 360px; 24 hours into 00–11 and 12–23), each naming its rows and columns.

**Reading a cell.** There's no crosshair in a grid, so the cell under the readout wears a 2px `ink` outline. The readout sits beside it: the place ("Tue, 14"), then the value keyed by its step's colour.

**Without colour.** Under forced colours and in print, and with `patterns` on the container, each step also gets a pattern density (none, sparse dots, dense dots, hatching, crosshatch), so the ramp survives losing its colours; a diverging scale hatches its two sides in opposite directions. The values stay in the cell's name and the table view. With `contrast="more"` every cell has a 1px `ink` edge.

**Motion.** A value change cross-fades the cell's fill over `dur-travel-1`; a whole refresh is one change, so in a `live` container it lights the "Updated" caption, not every cell. Under reduced motion it's instant.

**Accessibility.** The keyboard path is one Tab stop; Enter goes from the summary straight to the cells (there's no series level), and Escape comes back. Arrows move cell to cell and stop at the edges; Home and End go to the start and end of the row, and with Ctrl (or Cmd) the grid's; Page Up and Page Down move a month in the calendar. Each cell is named by its row, its column, its value and its step: "Tuesday, 14:00, 312 requests, step 5 of 7." (rows and columns as `yFormat` and `xFormat` write them), or in the calendar "Thursday, Nov 27, 2025, 4 commits, step 3 of 4." A diverging cell also says its side ("below 0"). The focus ring is the cell's own box. Without a written `summary`, the generated one names the highest and lowest cells, how many have no data, and the steps. The table view has a row per cell with its step.

**Props:** `data`, `value`; `x` and `y` for the grid, or `variant="calendar"` and `date`; `bins`, `scale`, `midpoint`; `xFormat` and `yFormat` for column and row names; `weekStart`; `legend`; `tooltip`.

**Selecting and drilling.** `selected` and `onSelect` make cells a selection that cross-filters the rest of a dashboard; `drill` opens a level down inside a `Drilldown`. `selected` is the record or its id: `"14|Tue"` (x, then y) for a grid, `"2026-03-14"` for a calendar. The selected cell keeps its colour, the rest recede to 35%, and the frame says "Filtered to Tue, 14". See [ChartContainer](../ChartContainer/README.md), "Marks you can select or drill into".

**Filtering in place.** `relevance={(d) => 'match' | 'miss' | undefined}` recedes misses to 35% where they stand.

**You provide:** a `ChartContainer` whose `config` names the value key (its label and format), the records, and usually a `summary`.

```tsx
<ChartContainer config={{ count: { label: 'Commits' } }} title="Commits">
  <Heatmap variant="calendar" data={commits} date="day" value="count" bins={[0, 1, 4, 10]} />
</ChartContainer>

<ChartContainer config={{ requests: { label: 'Requests' } }} title="Requests by hour">
  <Heatmap data={load} x="hour" y="weekday" value="requests" />
</ChartContainer>
```

- Do use five to seven steps; more can't be told apart, especially in small cells.
- Do give zero its own step when zero means "nothing happened".
- Do use `scale="diverging"` only when the midpoint means something (no change, a target).
- Don't use a heatmap to compare a handful of values; that's `BarChart`.
- Don't encode a second measure in cell size or a glow; it's one value per cell.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Heatmap` as first used in its preview:

```tsx
import { Heatmap } from 'altitude-design';

<Heatmap variant="calendar" data={commits} date="day" value="count" bins={[0, 1, 4, 10]} />
```

The full preview, as rendered in Storybook and checked in CI (`hm`, `wide` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, ChartContainer, Heatmap } from 'altitude-design';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Requests per hour: a working-day hump, quieter weekends, and a Tuesday-afternoon peak.
const load = days.flatMap((weekday, w) => Array.from({ length: 24 }, (_, hour) => {
  const day = Math.max(0, Math.sin(((hour - 6) / 15) * Math.PI));
  const base = (w < 5 ? 300 : 110) * day + 20 + ((hour * 7 + w * 13) % 17);
  return { weekday, hour, requests: Math.round(base + (w === 1 && hour >= 13 && hour <= 15 ? 160 : 0)) };
}));
// Commits per day for a year, with quiet weekends, a holiday gap and a few busy weeks.
const start = Date.UTC(2025, 9, 27);
const commits = Array.from({ length: 365 }, (_, i) => {
  const t = start + i * 864e5, wd = new Date(t).getUTCDay(), r = (i * 37 + 11) % 23;
  const busy = (i > 120 && i < 140) || (i > 300 && i < 312);
  const n = wd === 0 || wd === 6 ? (r < 18 ? 0 : r - 17) : i > 56 && i < 68 ? 0 : busy ? 6 + (r % 9) : r < 5 ? 0 : Math.round(r / 3);
  return { day: new Date(t).toISOString().slice(0, 10), count: n };
});
const services = ['Checkout', 'Search', 'Accounts', 'Media', 'Payments'];
const regions = ['US', 'EU', 'APAC', 'LATAM'];
// Error rate against last week, in points: below zero is better.
const change = services.flatMap((service, s) => regions.map((region, r) => ({ service, region, delta: s === 3 && r === 3 ? null : Math.round((Math.sin(s * 2.1 + r * 1.3) * 1.6 + (s === 4 && r === 1 ? 1.8 : 0)) * 10) / 10 })));
const pts = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1) + ' pts';
export default function App() {
  const [cell, setCell] = React.useState(null);
  return (
    <div className="hm">
      <Card className="wide">
        <CardHeader><CardTitle id="h1">Commits</CardTitle><CardDescription>A year, a cell per day: zero is the lightest step, and each step says its range</CardDescription></CardHeader>
        <CardContent>
          <ChartContainer aria-labelledby="h1" config={{ count: { label: 'Commits' } }}>
            <Heatmap variant="calendar" data={commits} date="day" value="count" bins={[0, 1, 4, 10]} />
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle id="h2">Requests by hour</CardTitle><CardDescription>Load by weekday and hour, with the table view</CardDescription></CardHeader>
        <CardContent>
          <ChartContainer aria-labelledby="h2" views config={{ requests: { label: 'Requests' } }} xLabel="Weekday">
            <Heatmap data={load} x="hour" y="weekday" value="requests" xFormat={(h) => String(h).padStart(2, '0')} />
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle id="h3">Error rate against last week</CardTitle><CardDescription>{cell ? `${cell.service} in ${cell.region}: select it again to clear` : 'scale="diverging": better below zero. Select a cell'}</CardDescription></CardHeader>
        <CardContent>
          <ChartContainer aria-labelledby="h3" config={{ delta: { label: 'Change', format: pts } }}>
            <Heatmap data={change} x="region" y="service" value="delta" scale="diverging" selected={cell} onSelect={setCell} />
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
```
<!-- /example -->
