# LineChart

Change over time: latency over a day, revenue over a year, one series or a few compared. It renders inside a [`ChartContainer`](../ChartContainer/README.md), which places x by time (ISO dates, timestamps) or by number.

**Why it's flat.** Lines are the record, so they lie on the plot: 2px strokes in their series' colours, round joins and caps, no fill, no glow, no shadow. A missing value (`null`) is a gap in the line, never bridged: nothing was recorded there, as `Await` tells `null` from not-yet. `curve="monotone"` curves through the points without overshooting them (Fritsch–Carlson), so a curve never invents a peak or a dip the data doesn't have. The last point wears an 8px marker, and each line is named at its end in `ink` (up to four series), so the lines are their own legend; end labels are nudged at least 16px apart where lines converge.

**The axis.** Unlike bars, a line's y axis doesn't have to include zero, but its range is always labelled. When zero isn't on it, the plot's foot is drawn as an ordinary gridline, not the ground line, so nothing reads as a baseline that isn't one.

**Without colour.** Under forced colours and in print, and with `patterns` on the container, each line takes its slot's dash and every point its slot's marker (circle, square, triangle, diamond, ring, cross), in `CanvasText` when forced. With `contrast="more"` lines are 3px.

**Motion.** When the data changes and the x values are the same, the line morphs on `ease-glide`; when they differ (a new range), the old chart and the new one cross-fade. A rescale comes first. There's no draw-on animation on first render ([Motion](../../Motion.md), "Charts").

**Accessibility.** Without a written `summary`, the generated one says which way each series went between its first and last values ("p95 rises from 168 ms at 14 Mar, 12:00 AM to 207 ms…"), and its lowest and highest points. The keyboard path along x and between series is #63, the readout #52, and the table view #64.

**Props:** `data` and `x`; `curve` (`'linear'` or `'monotone'`); `y={{ format }}` to format the axis; `endLabels` to turn end labels on or off (default on for up to four series, and always under forced colours and in print). `status` and `boundary` (below); `band={{ low, high, series?, label? }}` for an uncertainty band. `linePath(points, curve)` is exported for your own marks: it draws the same path, gaps and all.

**Selecting and drilling.** `selected` and `onSelect` make the marks a selection that cross-filters the rest of a dashboard, and `drill` opens a level down inside a `Drilldown`. Hover only promises what a click does. See [ChartContainer](../ChartContainer/README.md), "Marks you can select or drill into".

**Filtering in place.** `relevance={(d) => 'match' | 'miss' | undefined}` recedes misses to 35% and keeps everything in place; `rescale` fits the axis to the matches. See [ChartContainer](../ChartContainer/README.md), "Filtering in place".

**Not yet the record.** `status={(d) => d.day > today ? 'projected' : undefined}` dashes the line (5 4) from the last settled point on, and draws those points hollow: ringed in the series colour on the plot's own. It's one path clipped two ways, so a curve doesn't kink where the record ends. A 1px `line-control` rule named "Today" marks the boundary. Point names, the readout's heading and the table say "Projected" or "So far", and the generated summary reads its trend from the settled points only, then says what's projected. While patterns are on, a line that has its own dash keeps it, and the hollow points carry the difference.

**A sliding window.** `window={{ minutes: 15 }}` (or `hours`, `days`, or `points` for the last N records) shows only the latest stretch, and the axis spans exactly that window, however sparse the data. In a `live` container, when the window moves on, x glides one step and the line rides along with it.

**A chosen window.** `window={{ start, end }}` shows a fixed stretch of x, both ends included; a `DateRange` fits as it is. Put a `ChartBrush` inside the chart to pick it on an overview, with `onWindowChange` to hear where it moved.

**Uncertainty is a band.** `band={{ low: 'p10', high: 'p90', label: 'Range 10th–90th percentile' }}` draws a flat fill of the series colour at 16% between the two keys, under the lines. It's never error bars, which readers misjudge (Correll & Gleicher 2014), and never a gradient. Its edges count toward the y axis. The readout adds a row for it ("499–787 Range 10th–90th percentile"), and so do point names and the table.

**Banked to 45°.** `aspect="banked"` lets the data choose the chart's height: slopes read best when the segments average about 45° (Cleveland's banking), so the plot takes the width ÷ height that sets their mean absolute orientation there, held between 1 and 4 for the data area so a card is never a sliver or a tower. Steep, jagged data banks wide; a gentle trend banks tall. The width stays the card's. It's read from every shown series, and kept while values glide; only new x values, which cross-fade as a new chart, bank it afresh, and the height change itself never animates. Put it on the `LineChart` or on the container. In a grid of equal cards, keep a fixed `aspect`: banked neighbours would differ in height.

**Focus.** `focus={['team']}` keeps those lines' colours and draws the rest in `data-context`, their end labels in `ink-muted`; the readout and the keyboard path list the focused lines first. See [ChartContainer](../ChartContainer/README.md), "Focus".

**Against the record before.** `compare={{ data: lastWeek, label: 'Last week' }}` matches records by position (or `key` reads a field on each record) and draws the earlier period as a 1.5px solid `ink-muted` trace under the compared series (`series`, default the first), without points, named at its end in `ink-muted`. It's solid because dashes mean projected, and it follows the data, which a 1px straight reference line never does. The readout, point names, the table and the summary say the difference.

**You provide:** a `ChartContainer` with a `config` naming each series, the `data` in x order, and usually a `summary`.

```tsx
<ChartContainer config={{ p50: { label: 'p50' }, p95: { label: 'p95' } }} aspect={2.5}>
  <LineChart data={latency} x="minute" curve="monotone" y={{ format: (ms) => `${ms} ms` }} />
</ChartContainer>
```

- Do keep it to four series or fewer; past that, use small multiples, or a legend and the readout.
- Do leave missing values as `null`; don't fill them with zero or the last value.
- Do use `monotone` for smooth measures, and `linear` when each point is a discrete count.
- Don't fill the area under a line to make it look richer; that's `AreaChart`, for a total and its parts.
- Don't put two measures of different scale on one plot; that's two charts.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`LineChart` as first used in its preview:

```tsx
import { LineChart } from 'altitude-design';

<LineChart data={latency} x="t" y={{ format: (ms) => `${ms} ms` }} />
```

The full preview, as rendered in Storybook and checked in CI (`lc` is the preview page's own layout class, not Altitude's):

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle, ChartContainer, LineChart } from 'altitude-design';

const t0 = Date.UTC(2026, 2, 14, 0, 0);
const latency = Array.from({ length: 49 }, (_, i) => ({ t: t0 + i * 30 * 60e3, p50: 92 + Math.round(18 * Math.sin(i / 6) + (i % 5)), p95: 168 + Math.round(30 * Math.sin(i / 6 + 0.6) + (i % 7) * 3) }));
const revenue = ['2025-07-01', '2025-08-01', '2025-09-01', '2025-10-01', '2025-11-01', '2025-12-01', '2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01']
  .map((month, i) => ({ month, revenue: [61, 64, 63, 70, 74, 72, 79, 85, 83, 92, 98, 104][i] * 1000 }));
const signups = Array.from({ length: 14 }, (_, i) => ({ day: `2026-04-${String(i + 1).padStart(2, '0')}`, signups: [42, 48, 51, null, null, 55, 61, 58, 63, null, 66, 70, 68, 74][i] }));
const signupsBefore = [38, 41, 40, 44, 47, 45, 49, 52, 50, 53, 55, 54, 57, 58].map((signups) => ({ signups }));
const plans = ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01'].map((month, i) => ({ month, free: 40 + i * 2, team: 34 + i * 3, business: 30 + i * 2.6, enterprise: 12 + i }));
const usd = new Intl.NumberFormat('en', { style: 'currency', currency: 'USD', notation: 'compact' });
function Chart({ id, title, sub, children, ...props }) {
  // With a takeaway the figure names itself: the title becomes the label over the takeaway, the heading.
  if (props.takeaway) return (
    <Card>
      <CardContent style={{ paddingTop: 'var(--space-5)' }}><ChartContainer title={title} description={sub} aspect={1.9} {...props}>{children}</ChartContainer></CardContent>
    </Card>
  );
  return (
    <Card>
      <CardHeader><CardTitle id={id}>{title}</CardTitle><CardDescription>{sub}</CardDescription></CardHeader>
      <CardContent><ChartContainer aria-labelledby={id} aspect={1.9} {...props}>{children}</ChartContainer></CardContent>
    </Card>
  );
}
export default function App() {
  return (
    <div className="lc">
      <Chart id="l1" title="Response time" sub='14 Mar, every 30 minutes; yLabels="inline"' yLabels="inline" config={{ p50: { label: 'p50' }, p95: { label: 'p95' } }}>
        <LineChart data={latency} x="t" y={{ format: (ms) => `${ms} ms` }} />
      </Chart>
      <Chart id="l2" title="Monthly revenue" takeaway="Revenue rose 70% over the year" sub='curve="monotone": no overshoot' config={{ revenue: { label: 'Revenue', format: usd.format } }} summary="Revenue rose 70% over the year, with small dips in September, December and March.">
        <LineChart data={revenue} x="month" curve="monotone" />
      </Chart>
      <Chart id="l3" title="Daily signups" sub="Gaps stay gaps; read against the two weeks before" config={{ signups: { label: 'Signups' } }}>
        <LineChart data={signups} x="day" compare={{ data: signupsBefore, label: '2 weeks before' }} />
      </Chart>
      <Chart id="l4" title="Seats by plan" sub="Four series, focus on Team: the rest in data-context" config={{ free: { label: 'Free' }, team: { label: 'Team' }, business: { label: 'Business' }, enterprise: { label: 'Enterprise' } }}>
        <LineChart data={plans} x="month" focus={['team']} />
      </Chart>
      <Chart id="l5" title="Monthly revenue, banked" sub='aspect="banked": the segments average 45°' aspect="banked" config={{ revenue: { label: 'Revenue', format: usd.format } }}>
        <LineChart data={revenue} x="month" curve="monotone" />
      </Chart>
    </div>
  );
}
```
<!-- /example -->
