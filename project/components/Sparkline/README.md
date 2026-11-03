# Sparkline

A trend the size of a word: the last 30 days of a metric in a `DataTable` cell, a `PropertyList` value, a `Stat`, or a sentence. It says rising, falling, spiky or flat at a glance, beside the number that gives the detail (after Tufte's sparklines).

**Why it's flat.** A sparkline is part of the record in the row it sits in, so it lies on the ground like every mark a chart draws: a 1.5px stroke with round joins, no fill under it, no shadow, no glow. There are no axes, gridlines or readout; the text beside it carries the numbers. The last point wears a 4px marker, so you can see where "now" is. `kind="bar"` draws flat bars 1px apart, standing on zero, for counts. A missing value (`null`) is a gap, never bridged. A normal range (`band`) is a flat band of `line` behind the marks.

**Its size.** Its height is the line height of the text it sits beside (`1lh`), and it sits in that line. Its width is `5em` unless you give one.

**Colour does one job.** By default it's `ink-muted`: context for the number beside it. `tone="data"` makes it `data-1`, when the sparkline *is* the series. `positive`, `caution` or `critical` only when the series means good or bad, and then the text beside it says so too ("Rising"), because colour never travels alone.

**Accessibility.** It's `role="img"` with a generated label that says the trend in words: "Up 17% over 30 days, from 1.2K to 1.4K. Low 1.2K, high 1.5K." With `x` naming daily dates it says "days"; otherwise "values". With a `band` it counts the values outside it. An `aria-label` you pass goes first ("Signups, last 30 days. Up 17%…"); `summary` replaces the generated text. When the row already says it, pass `decorative` and it's hidden from assistive technology. It's never focusable. Under forced colours it's drawn in `CanvasText` and the band is a dashed outline; under `contrast="more"` the line is 2px.

**Loading.** Pass `data` as it is: `undefined` while it loads, or a promise, and it's an imprint one line high and its own width (`Await`), which lands within the attention budget. A value that changes in a live table gets the row's afterglow, not a sparkline animation.

**Props:** `data` (numbers, or records with `y`); `y`; `x` (a date key, for the label); `kind` (`'line'` or `'bar'`); `tone` (`'neutral'`, `'data'`, `'positive'`, `'caution'`, `'critical'`); `band` (`[low, high]`); `width`; `format` (for the label; default compact); `summary`; `decorative`; `locale`.

**You provide:** the values, oldest first; the number they explain, beside them; and either an `aria-label` naming the measure or `decorative` when the row already says it all.

```tsx
<Sparkline data={daily} x="day" y="signups" aria-label="Signups, last 30 days" />
<DataTable columns={[…, { key: 'trend', header: 'Last 30 days', cell: (r) => <Sparkline data={r.daily} decorative /> }]} rows={teams} />
```

- Do put the number it explains right beside it; a sparkline alone has no scale.
- Do use `kind="bar"` for discrete counts (deploys per day), and the line for measures.
- Do leave missing values as `null`.
- Don't give it axes, a tooltip or a legend; when someone needs to read values, that's a `LineChart`.
- Don't colour it with a status hue unless the series means good or bad, and say so in words beside it.
- Don't compare sparklines in different rows as if they shared a scale: each is scaled to its own values.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Sparkline` as first used in its preview:

```tsx
import { Sparkline } from 'altitude-design';

<Sparkline data={signups} x="day" y="signups" tone="data" width={120} aria-label="Signups, last 30 days" />
```

The full preview, as rendered in Storybook and checked in CI (`sp`, `row`, `big`, `note` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Badge, DataTable, Sparkline } from 'altitude-design';

const spDays = (vals) => vals.map((v, i) => ({ day: `2026-10-${String(i + 1).padStart(2, '0')}`, signups: v }));
const signups = spDays([1200, 1180, 1230, 1260, 1210, 1290, 1310, 1280, 1300, 1350, 1330, 1290, 1340, 1370, 1360, 1320, 1380, 1400, 1390, 1360, 1410, 1430, 1390, 1420, 1450, 1410, 1380, 1420, 1440, 1400]);
const teams = [
  { id: 'core', name: 'Core', builds: [12, 14, 13, 15, 16, 18, 17, 19, 21, 20, 22, 24, 23, 25], errors: [0.4, 0.5, 0.4, 0.6, 0.5, 0.7, 0.9, 1.1, 1.0, 1.3, 1.5, 1.4, 1.8, 2.1] },
  { id: 'web', name: 'Web', builds: [30, 28, 31, 27, 29, 26, 25, 27, 24, 23, 25, 22, 21, 20], errors: [1.2, 1.1, 1.3, 1.2, 1.1, 1.2, 1.0, 1.1, 1.2, 1.1, 1.0, 1.1, 1.2, 1.1] },
  { id: 'data', name: 'Data', builds: [8, 9, null, null, 11, 10, 12, 14, 13, 15, 14, 16, 18, 17], errors: [2.0, 1.8, null, null, 1.6, 1.5, 1.6, 1.4, 1.3, 1.2, 1.3, 1.1, 1.0, 0.9] },
];
const latency = [182, 176, 190, 240, 178, 184, 171, 169, 175, 260, 181, 177, 174, 172, 179, 185, 176, 173];
export default function App() {
  const [slow, setSlow] = React.useState(undefined);
  React.useEffect(() => { const t = setTimeout(() => setSlow([4, 6, 5, 8, 7, 9, 12, 11, 13, 12]), 2600); return () => clearTimeout(t); }, []);
  return (
    <div className="sp">
      <section>
        <h3>Beside a number</h3>
        <div className="row"><span className="big">1,400</span><Sparkline data={signups} x="day" y="signups" tone="data" width={120} aria-label="Signups, last 30 days" /></div>
        <p className="note">Signups, last 30 days. Up 17% from 1,200.</p>
      </section>
      <section>
        <h3>In running text</h3>
        <p>p95 latency <Sparkline data={latency} band={[160, 200]} format={(ms) => `${ms} ms`} aria-label="p95 latency, last 18 hours" /> spiked twice outside its normal range.</p>
        <p>Deploys this week <Sparkline data={[3, 5, 2, 6, 4, 0, 1]} kind="bar" aria-label="Deploys per day" /> peaked on Thursday.</p>
        <p className="note">Loading: <Sparkline data={slow} aria-label="Queue depth" /></p>
      </section>
      <section style={{ gridColumn: '1 / -1' }}>
        <h3 id="sp-teams">In a table</h3>
        <DataTable aria-labelledby="sp-teams" getRowId={(r) => r.id} rows={teams} columns={[
          { key: 'name', header: 'Team' },
          { key: 'builds', header: 'Builds per day', cell: (r) => <span className="row">{r.builds[r.builds.length - 1]}<Sparkline data={r.builds} decorative /></span> },
          { key: 'errors', header: 'Error rate, 14 days', cell: (r) => {
            const rising = r.errors[r.errors.length - 1] > r.errors[0] * 1.5;
            return <span className="row">{r.errors[r.errors.length - 1]}%<Sparkline data={r.errors} tone={rising ? 'critical' : 'neutral'} format={(v) => `${v}%`} aria-label={`${r.name} error rate`} />{rising && <Badge tone="critical">Rising</Badge>}</span>;
          } },
        ]} />
      </section>
    </div>
  );
}
```
<!-- /example -->
