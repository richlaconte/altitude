# ChartGrid

Small multiples. One panel per value of a key (eight services' error rates, revenue by region, a metric per cohort), each drawing the same chart type over its own records, in one figure. Use it when there are too many series to overlay, or when their scales differ: Charts rule 6 forbids a second axis and names small multiples as the answer. Juxtaposed series stay readable as their number grows where superimposed ones don't (Javed, McDonnel & Elmqvist, 2010). Vega-Lite calls it `facet` and Observable Plot `fx`/`fy`; shadcn/ui has no equivalent.

**Why it adds no height.** A grid of plots is the record cut by one key, so it lies on the ground like one chart: no panel is raised, framed or carded. Each panel is named by a caption above it in `ink`, the way a `Table` names its columns. Amounts stay length and position on flat plots, and the panels share a y scale by default so those lengths compare across them.

**What it does.**

- **One scale.** With `scales="shared"` (default) every panel draws over the whole grid's y and x, so a line twice as high is twice the value in any panel. One y axis is read in the first column and one x axis in the last row; the other panels keep the room, so every plot is the same size. When the panels differ by more than 10×, a note under the heading says so ("Checkout's scale is 40× Search's."), so `free-y` is chosen knowingly.
- **Own scales, said.** `scales="free-y"` gives each panel its own y, read inline above its gridlines, and its caption says "own scale". `scales="free"` frees x too.
- **One pointer.** Pointing at a panel marks the same x in every panel with the 1px `line-control` crosshair rule; the readout opens only in the panel under the pointer. Inside a page's `ChartScope` the grid is one more view of it (its selection recedes the misses in every panel); alone, it scopes its own panels.
- **Focus.** `focus={['checkout']}` keeps the named panels in their colour and sets the rest in `data-context`, said in words ("Highlighted: Checkout.").
- **Order.** `sort="desc"` or `"asc"` orders the panels by their last value; `"data"` (default) as the records first name them.
- **Fit.** `columns` is a maximum: at 640px and below it's 2, at 480px and below 1.

**Accessibility.** One `figure`, named by its takeaway or title, holding a `group` per panel named by its caption. The panels make one Tab stop: the panel level sits between the grid and each panel's series and points. On a panel, ←/→ move between panels (↑/↓ by a row, Home and End to the ends), Enter goes into its points as on any chart, and Escape comes back to the panel. Each panel says its name and place first ("Checkout, 1 of 8.") and then its summary. The generated summary names the grid's kind, the panel count and the scale, then which panel ends highest and lowest. Under forced colours panel names are `CanvasText`; reduced motion and `contrast="more"` are as on any chart.

**Props.**

- `config`, `data`, `x`: as on `ChartContainer`. `data` is long: one record per panel per x, each carrying the `by` key.
- `by`: the key whose values become panels. `panelLabel`: a panel's name from its value.
- `columns` (default 4), `scales` (`'shared'` | `'free-y'` | `'free'`), `sort` (`'data'` | `'desc'` | `'asc'`), `focus` (panel values), `height` (each plot, default 120).
- `title`, `takeaway`, `description`, `summary`: as on `ChartContainer`, for the whole grid.
- `xScale`, `yFormat`, `xFormat`, `locale`, `tooltip`: passed to every panel.
- `children`: the chart type every panel draws, `<LineChart />`, `<BarChart />` or `<AreaChart />`. With one series, a line's end label is off: the caption names it.

**You provide:** long records with the panel key, and a takeaway when the grid makes a point.

```tsx
<ChartGrid config={{ rate: { label: 'Error rate', format: pct } }} data={errors} x="t" by="service"
  columns={4} sort="desc" focus={['checkout']} title="Error rate by service"
  takeaway="Checkout is the only service over its SLO">
  <LineChart />
</ChartGrid>
```

- Do keep the shared scale when the question is "which is biggest": free scales make every panel look equally busy.
- Do use `free-y` when the question is each panel's shape, and let the captions say so.
- Don't overlay more than four or five series to avoid a grid; don't give one chart two y axes instead.
- Don't put a card around each panel: the panels are one record, on one ground.

Not yet: two-way facets (`by` × `by`), mixed chart types across panels, `compare` per panel, and banking (`aspect="banked"`) across the grid.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`ChartGrid` as first used in its preview:

```tsx
import { ChartGrid, LineChart } from 'altitude-design';

<ChartGrid config={{ rate: { label: 'Error rate', format: cgPct } }} data={cgErrors} x="t" by="service" panelLabel={(v) => cgNames[v]}
  columns={4} sort="desc" focus={['checkout']} locale="en-GB" yFormat={cgPct} height={96}
  title="Error rate by service, last 48 hours" takeaway="Checkout is the only service whose errors climbed, from hour 30">
  <LineChart />
</ChartGrid>
```

The full preview, as rendered in Storybook and checked in CI (`cg`, `two` are the preview page's own layout classes, not Altitude's):

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle, ChartContainer, ChartGrid, LineChart } from 'altitude-design';

// Two days of error rates for eight services, hourly, as long records: one row per service per hour.
const cgHours = Array.from({ length: 48 }, (_, i) => new Date(Date.UTC(2026, 10, 3, i)).toISOString());
const cgServices = ['checkout', 'search', 'payments', 'auth', 'catalog', 'cart', 'shipping', 'email'];
const cgNames = { checkout: 'Checkout', search: 'Search', payments: 'Payments', auth: 'Auth', catalog: 'Catalog', cart: 'Cart', shipping: 'Shipping', email: 'Email' };
const cgErrors = cgServices.flatMap((service, k) => cgHours.map((t, i) => ({
  t, service,
  rate: +(Math.max(0.05, 0.35 + 0.2 * Math.sin((i + k * 5) / 5) + k * 0.04) + (service === 'checkout' && i >= 30 ? 1.4 + 0.3 * Math.sin(i) : 0)).toFixed(2),
})));
const cgPct = (v) => `${v.toFixed(1)}%`;
// Monthly revenue for three regions an order of magnitude apart, in millions.
const cgMonths = ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01'];
const cgBase = { na: 42, eu: 18, apac: 2.4 };
const cgRevenue = Object.keys(cgBase).flatMap((region, k) => cgMonths.map((m, i) => ({ m, region, revenue: +(cgBase[region] * (1 + 0.04 * i + 0.05 * Math.sin(i + k))).toFixed(1) })));
const cgRegions = { na: 'North America', eu: 'Europe', apac: 'Asia Pacific' };
const cgMoney = (v) => `$${v.toFixed(1)}M`;
const cgWide = cgMonths.map((m) => Object.fromEntries([['m', m], ...Object.keys(cgBase).map((r) => [r, cgRevenue.find((d) => d.m === m && d.region === r).revenue])]));
export default function App() {
  return (
    <div className="cg">
      <Card>
        <CardContent>
          <ChartGrid config={{ rate: { label: 'Error rate', format: cgPct } }} data={cgErrors} x="t" by="service" panelLabel={(v) => cgNames[v]}
            columns={4} sort="desc" focus={['checkout']} locale="en-GB" yFormat={cgPct} height={96}
            title="Error rate by service, last 48 hours" takeaway="Checkout is the only service whose errors climbed, from hour 30">
            <LineChart />
          </ChartGrid>
        </CardContent>
      </Card>
      <div className="two">
        <Card>
          <CardContent>
            <ChartGrid config={{ revenue: { label: 'Revenue', format: cgMoney } }} data={cgRevenue} x="m" by="region" panelLabel={(v) => cgRegions[v]}
              columns={1} scales="free-y" locale="en-GB" height={112} title="Revenue by region, each on its own scale"
              description="Asia Pacific is a twentieth of North America, so a shared scale would flatten it: here each panel reads its own ticks.">
              <LineChart />
            </ChartGrid>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle id="cg3">The same revenue, overlaid</CardTitle><CardDescription>For contrast: on one axis Asia Pacific's growth is a flat line on the floor.</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer aria-labelledby="cg3" config={{ na: { label: 'North America', format: cgMoney }, eu: { label: 'Europe', format: cgMoney }, apac: { label: 'Asia Pacific', format: cgMoney } }} aspect={1.4} locale="en-GB" yFormat={cgMoney}>
              <LineChart data={cgWide} x="m" />
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```
<!-- /example -->
