# ChartReference and ChartAnnotation

Reading a chart against something: an SLO target, a budget, a normal range, the average, the day you shipped v2. Overlays like these help people read charts (Kong & Agrawala 2012), and most dashboards need at least a target line and an event marker. Put them inside any cartesian chart type, or inside the container:

```tsx
<LineChart data={uptime} x="day">
  <ChartReference y={[0.995, 1]} label="Normal range" />
  <ChartReference y={0.999} label="Target 99.9%" />
  <ChartReference y={0.99} label="Limit 99%" tone="critical" />
  <ChartReference y="mean" label="Average" />
  <ChartAnnotation x="2026-03-14" label="DNS outage" />
</LineChart>
```

**Why they're flush.** References and annotations are part of the reading, not something to act on, so they lie on the ground with the marks:

| Part | Drawn as | Words |
|---|---|---|
| Reference line | 1px `ink-muted`, solid, over the marks. Dashes mean "projected", so a reference line never has them | its label at the right end, above the line, in caption text; below it, at the left end or further along when that spot would cover a mark |
| Status threshold (`tone`) | 1px `caution` or `critical` | the label in `ink`, with the status icon in its tone |
| Band (`y={[low, high]}`) | a flat `line` fill under the marks: a decorative token, so it isn't read as data or as an opening | its label inside the band, at whichever corner covers no mark, or beside it when the band is under 20px tall |
| Annotation | a `Badge` plate flush at the top of the plot, in a row of headroom above the data (a label is part of the record), with a 1px `line-control` leader down to its x | the plate's text |
| Annotation with `onSelect` | the plate is a button and lifts one level when pointed at | button semantics, named "v2 launch, Mar 4, 2026" |

**Labels stay clear, of each other and of the data.** The container draws every reference and annotation itself, so it can lay their words out together with the marks. Plates sit in rows 26px apart at the top of the plot, and the data starts below the last row, so a plate never covers a mark. A reference's label takes the first spot that covers no line, area or bar and no other word: the right end above its line, then below, then the left end, then along the line. On a plot too small for any of those, it takes the spot that covers least. Across a horizontal chart, references stand upright and their labels stack in a row above the bars. All labels are on a halo of the plot's colour.

**Values.** A reference's own values count toward the y axis, so a target above every value is still on the plot. `y="mean"` and `y="median"` are read from the settled records of `series` (default: the first shown), and the label adds the value at the data's own precision: "Average 162.5 ms".

**Motion.** References are drawn in the plot's coordinates, so they glide with a rescale and the marks ([Motion](../../Motion.md), "Charts"), and a mean or median glides to its new value when the data changes. Under reduced motion they change in place.

**Without colour.** Under forced colours lines, labels, icons and leaders are `CanvasText`, bands are hatched in `GrayText` on `Canvas`, and plates get a 1px `CanvasText` border.

**Accessibility.** References and annotations are read after the chart's summary, written or generated, and on the keyboard path's summary node: "References: Normal range, 99.5% to 100%; Target 99.9% at 99.9%. 1 annotation: DNS outage, Mar 14, 2026." Plates that only label are hidden from assistive technology, since the summary lists them. Plates with `onSelect` are buttons in the tab order after the plot.

**Props.** `ChartReference`: `y` (a value, `[low, high]`, `'mean'` or `'median'`), `label`, `tone` (`'caution'` or `'critical'`), `series`. `ChartAnnotation`: `x` (as the data's x values are written), `label`, `onSelect`.

- Do say what a reference is in its label ("Target 99.9%"), not only its value.
- Do use `tone` only when crossing the line means good or bad.
- Do keep annotations to a few words; the plate is a label, not a note.
- Don't dash a reference line; a dash means "projected".
- Don't use a reference band for data. A range in the data is an uncertainty band (`LineChart`'s `band`).

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`ChartReference` as first used in its preview:

```tsx
import { ChartReference } from 'altitude-design';

<ChartReference y={[0.995, 1]} label="Normal range" />
```

The full preview, as rendered in Storybook and checked in CI (`cr`, `row` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { BarChart, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ChartAnnotation, ChartContainer, ChartReference, LineChart } from 'altitude-design';

const uptime = Array.from({ length: 30 }, (_, i) => ({ day: `2026-03-${String(i + 1).padStart(2, '0')}`, uptime: [0.9995, 0.9991, 0.9998, 0.9962, 0.9971, 0.9993, 0.9997, 0.9999, 0.9994, 0.9988, 0.9996, 0.9999, 0.9997, 0.9921, 0.9984, 0.9995, 0.9998, 0.9996, 0.9999, 0.9997, 0.9993, 0.9996, 0.9998, 0.9999, 0.9995, 0.9997, 0.9999, 0.9998, 0.9996, 0.9999][i] }));
const pct = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 2 });
const usd = new Intl.NumberFormat('en', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const weekA = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => ({ day, cost: [412, 455, 498, 430, 610, 220, 190][i] }));
const weekB = weekA.map((d, i) => ({ ...d, cost: [520, 590, 640, 575, 780, 300, 260][i] }));
const teams = [['Search', 92], ['Checkout', 81], ['Accounts', 74], ['Messaging', 66], ['Billing', 58]].map(([team, score]) => ({ team, score }));
const deploys = Array.from({ length: 21 }, (_, i) => ({ day: `2026-04-${String(i + 1).padStart(2, '0')}`, latency: 180 + Math.round(30 * Math.sin(i / 3)) + (i > 9 ? -40 : 0) + (i === 14 ? 60 : 0) }));
function Chart({ id, title, sub, children, ...props }) {
  return (
    <Card>
      <CardHeader><CardTitle id={id}>{title}</CardTitle><CardDescription>{sub}</CardDescription></CardHeader>
      <CardContent><ChartContainer aria-labelledby={id} aspect={1.9} {...props}>{children}</ChartContainer></CardContent>
    </Card>
  );
}
export default function App() {
  const [later, setLater] = React.useState(false);
  const [picked, setPicked] = React.useState(null);
  return (
    <div className="cr" data-tells-ignore="LA4 a gallery of references in each chart, to compare">
      <Chart id="r1" title="Uptime" sub="March, against the SLO" config={{ uptime: { label: 'Uptime', format: pct.format } }}>
        <LineChart data={uptime} x="day">
          <ChartReference y={[0.995, 1]} label="Normal range" />
          <ChartReference y={0.999} label="Target 99.9%" />
          <ChartReference y={0.99} label="Limit 99%" tone="critical" />
          <ChartAnnotation x="2026-03-14" label="DNS outage" />
        </LineChart>
      </Chart>
      <Card>
        <CardHeader><CardTitle id="r2">Cloud spend</CardTitle><CardDescription>Against the daily budget; the median moves with the week</CardDescription></CardHeader>
        <CardContent>
          <ChartContainer aria-labelledby="r2" aspect={2.2} config={{ cost: { label: 'Cost', format: usd.format } }}>
            <BarChart data={later ? weekB : weekA} x="day">
              <ChartReference y={700} label="Budget $700" tone="caution" />
              <ChartReference y="median" label="Median" />
            </BarChart>
          </ChartContainer>
          <div className="row" style={{ marginTop: 12 }}><Button size="sm" onClick={() => setLater((v) => !v)}>{later ? 'Last week' : 'This week'}</Button></div>
        </CardContent>
      </Card>
      <Chart id="r3" title="Accessibility score" sub="By team, against the bar of 75" config={{ score: { label: 'Score' } }}>
        <BarChart data={teams} x="team" layout="horizontal"><ChartReference y={75} label="Bar 75" /></BarChart>
      </Chart>
      <Chart id="r4" title="p95 latency" sub={picked ? `Picked: ${picked}` : 'Events stack into rows where they would overlap'} config={{ latency: { label: 'p95', format: (v) => `${v} ms` } }}>
        <LineChart data={deploys} x="day">
          <ChartReference y="mean" label="Average" />
          <ChartAnnotation x="2026-04-10" label="Cache rollout" onSelect={() => setPicked('Cache rollout')} />
          <ChartAnnotation x="2026-04-11" label="v2 launch" onSelect={() => setPicked('v2 launch')} />
          <ChartAnnotation x="2026-04-15" label="Incident 412" />
        </LineChart>
      </Chart>
    </div>
  );
}
```
<!-- /example -->
