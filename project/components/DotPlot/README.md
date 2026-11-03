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

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`DotPlot` as first used in its preview:

```tsx
import { DotPlot } from 'altitude-design';

<DotPlot data={services} x="service" range={['p10', 'p90']} rangeLabel="10th–90th percentile" sort="desc" />
```

The full preview, as rendered in Storybook and checked in CI (`dp` is the preview page's own layout class, not Altitude's):

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle, ChartContainer, DotPlot } from 'altitude-design';

const services = [['Checkout', 212, 180, 240], ['Search', 188, 170, 205], ['Billing', 236, 190, 320], ['Accounts', 199, 182, 214], ['Media', 228, 196, 268], ['Auth', 184, 176, 193], ['Exports', 221, 187, 262], ['Email', 193, 179, 209]]
  .map(([service, p95, p10, p90]) => ({ service, p95, p10, p90 }));
const teams = [['Atlas', 71, 78], ['Birch', 64, 62], ['Cedar', 80, 86], ['Delta', 58, 69], ['Ember', 75, 77]].map(([team, q2, q3]) => ({ team, q2, q3 }));
export default function App() {
  return (
    <div className="dp">
      <Card>
        <CardHeader><CardTitle id="d1">p95 latency by service</CardTitle><CardDescription>All between 180 and 240 ms; the band is the 10th–90th percentile</CardDescription></CardHeader>
        <CardContent>
          <ChartContainer aria-labelledby="d1" aspect={1.5} config={{ p95: { label: 'p95', format: (v) => `${v} ms` } }}>
            <DotPlot data={services} x="service" range={['p10', 'p90']} rangeLabel="10th–90th percentile" sort="desc" />
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle id="d2">Accessibility score, Q2 to Q3</CardTitle><CardDescription>A dumbbell: the hollow dot is Q2, the filled one Q3</CardDescription></CardHeader>
        <CardContent>
          <ChartContainer aria-labelledby="d2" aspect={1.5} config={{ q2: { label: 'Q2' }, q3: { label: 'Q3' } }}>
            <DotPlot data={teams} x="team" from="q2" to="q3" sort="desc" />
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
```
<!-- /example -->
