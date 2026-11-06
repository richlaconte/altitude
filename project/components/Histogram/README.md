# Histogram

How a set of values is spread: request latencies, order sizes, scores, time to first response. A bar of the average hides the spread and carries a measured misreading (Newman & Scholl, 2012). A histogram shows it as bins of counts standing on the ground line, so it keeps every chart rule. `mode="dots"` draws the same distribution as a quantile dot plot: countable dots that cut the variance of people's probability estimates and improved their decisions (Kay et al., 2016; Fernandes et al., 2018), though the advantage isn't uniform across tasks (Kale, Kay & Hullman, 2021). shadcn/ui has no equivalent.

**Why it's flat.** Counts are lengths on the ground line, exactly as in a `BarChart`: flat `data-1` bars from the 1px `ink-muted` zero rule, no shadow, no sheen. The axis is continuous, so the bars touch rather than sitting in bands, parted only by a hairline of the plot's own colour. A median or percentile is a 1px `ink-muted` line, named above the plot on a halo, as a `ChartReference` is. Nothing lifts, and the keyboard's place is the 2px `accent-ink` ring.

**Without colour.** Each bin is said in words: its range, its count and its share, "180–200 ms: 42 requests (12%)". Under forced colours bars are `CanvasText` with a `Canvas` edge, so touching bars stay apart; with `contrast="more"` they take a 1px `ink` edge and dots a 2px ring.

**Binning.** In-house, with no dependency. The default is Freedman–Diaconis, with the width snapped to a 1–2–5 number and the edges on multiples of it, kept between 5 and 60 bins. `bins={20}` asks for about 20 bins, `bins={{ width: 50 }}` sets the width, and `bins={[0, 100, 200, 500, 1000]}` gives the edges. Values past explicit edges fall in an open-ended bin said as "≥ 1 s" (or "< 0 ms"). Each bin holds its start up to its end, and the last closed bin holds its end too.

**Three readings.**

- **Bars** (default): a bin's count as a bar's length.
- **Dots** (`mode="dots"`): `dots` quantiles (default 20, so each is 5%), each in its value's bin, stacked as countable dots. The y axis counts dots and is said as a share ("15%").
- **Cumulative** (`cumulative`): the running share at or below each bin's end, as a 2px step line on a 0–100% axis. Read "what share finish within 500 ms?" off it directly.

`show={{ median: true, percentiles: [95] }}` adds the lines, a label that would meet another dropping a row.

**Accessibility.** The container's keyboard path walks the bins (←/→, Home/End), each named "180–200 ms: 42 requests (12%)." The generated summary says the count, the median, the 10th–90th percentile spread, where half the values fall, and a long tail when there is one: "Histogram of Latency, 1,200 requests. Median 220 ms; 10th to 90th percentile 144 ms to 359 ms. Half of the requests fall between 150 ms and 250 ms, with a long tail to 1.7 s." With `views`, the table has a row per bin: range, count, share and the share at or below.

**Props.** `data` and `value` (the key of the value in each record, named and formatted by the container's `config`); `bins`; `mode` and `dots`; `cumulative`; `show`; `noun` (what a value is called, plural, default "values"); `selected` (a bin's start) and `onSelect` (gets the bin: `start`, `end`, `count`, `share` and its `records`, or null); `empty`; `tooltip`.

```tsx
<ChartContainer config={{ latency: { label: 'Latency', format: ms } }} title="Request latency, last hour"
  takeaway="Half of requests finish within 220 ms, but 1 in 20 take over 800 ms">
  <Histogram data={requests} value="latency" noun="requests" show={{ median: true, percentiles: [95] }} />
</ChartContainer>
```

- Do use it when the question is spread, typical value or tail; a bar of the average answers none of them.
- Do say the median and a high percentile when the tail matters (latency, wait times).
- Don't smooth it into a density curve or a violin: smoothing hides the count. For a spread per category use a `DotPlot` with a range; for two dimensions a `Heatmap`.

Not yet: `relevance`, `focus` and `compare` (the period before as an outline).

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Histogram` as first used in its preview:

```tsx
import { Histogram } from 'altitude-design';

<Histogram data={hgRequests} value="latency" bins={{ width: 50 }} noun="requests" show={{ median: true, percentiles: [95] }} />
```

The full preview, as rendered in Storybook and checked in CI (`hg`, `two` are the preview page's own layout classes, not Altitude's):

```tsx
import { Card, CardContent, ChartContainer, Histogram } from 'altitude-design';

// An hour of request latencies: most between 150 and 300 ms, and a long tail past a second. Seeded, so it's the same each time.
let hgSeed = 7;
const hgRand = () => { hgSeed = (hgSeed * 16807) % 2147483647; return hgSeed / 2147483647; };
const hgNormal = () => Math.sqrt(-2 * Math.log(hgRand())) * Math.cos(2 * Math.PI * hgRand());
const hgRequests = Array.from({ length: 1200 }, (_, i) => ({ id: i, latency: Math.round(Math.exp(5.35 + 0.32 * hgNormal()) + (hgRand() < 0.05 ? 500 + 900 * hgRand() : 0)) }));
const hgMs = (v) => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)} s` : `${Math.round(v)} ms`);
const hgConfig = { latency: { label: 'Latency', format: hgMs } };
export default function App() {
  return (
    <div className="hg">
      <Card>
        <CardContent>
          <ChartContainer config={hgConfig} title="Request latency, last hour" takeaway="Half of requests finish within 220 ms, but 1 in 20 take over 800 ms" aspect={2.6} views>
            <Histogram data={hgRequests} value="latency" bins={{ width: 50 }} noun="requests" show={{ median: true, percentiles: [95] }} />
          </ChartContainer>
        </CardContent>
      </Card>
      <div className="two">
        <Card>
          <CardContent>
            <ChartContainer config={hgConfig} title="The same, as 20 dots of 5% each" aspect={1.5}>
              <Histogram data={hgRequests} value="latency" mode="dots" dots={20} bins={{ width: 100 }} noun="requests" />
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <ChartContainer config={hgConfig} title="Share of requests at or below each time" aspect={1.5}>
              <Histogram data={hgRequests} value="latency" cumulative bins={{ width: 50 }} noun="requests" show={{ percentiles: [95] }} />
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```
<!-- /example -->
