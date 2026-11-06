# ChartScope

One record, many views. Wrap the charts, stats and tables that show one slice of one record, and they behave as views of it: one pointer reads across them, one brush moves them, one selection filters them, one entity keeps one colour in all of them, and the slice is said once, in words. Coordinated views improved task performance by 30–80% in the earliest controlled work on them (North & Shneiderman, 2000); brushing, linking and shared navigation are what define a multi-view system (Roberts, 2007). Recharts' `syncId` shares only the tooltip.

**Why it adds no height.** A scope isn't a surface: it's a context with one flush caption. The record and its views stay on the ground, and the cards inside keep their own level 1. Everything the scope does is a signal charts already have, carried across charts: "Filtered in place" (misses recede to 35% where they stand, positions held) and "The crosshair" (a 1px `line-control` rule that doesn't move the marks).

**What it does.**

- **Pointer.** Pointing at a chart, or moving through it from the keyboard, marks the same x in every chart of the scope with the same kind of x: time with time, numbers with numbers, categories with the same category. The readout opens only in the chart under the pointer, so a page has one readout; siblings carry the rule alone. Entering a sibling's points from the keyboard starts at the record nearest that x, so a screen-reader user picks up the reading where the pointer left it.
- **Window.** One `ChartBrush` anywhere in the scope sets the window of every chart over time or numbers. The scope's `window` and `onWindowChange` are the one state; give a `DateRangePicker` the same state for a typed twin. A chart over categories isn't windowed: re-count it for the window yourself, as you'd re-query it.
- **Selection.** A chart whose records carry the scope's `by` key (`by="service"`) becomes selectable: choosing a mark selects that entity for the whole scope, choosing it again clears it. Every chart and `DataTable` whose records carry the key recedes the misses at 35% in place, and a chart whose *series* are entities (keys `checkout`, `search`) recedes the other series, cross-fading over `dur-travel-1`. Each chart's summary ends "Filtered to Checkout.", and no chart repeats it in its own frame: the scope's caption says it once.
- **Palette.** Each series key takes the next `data-*` slot the first time any chart in the scope draws it, and holds it for the scope's life, so "EU" is `data-2` in every card and no colour means two things on one page (Charts rule 5, made true across a page). A series' own `config.color` still pins; `palette={[…]}` fixes the order; `palette={false}` leaves each chart to its config order.
- **Words.** `slice` renders once as the caption, "Last 30 days · EU", in `ink-muted` at caption size; a selection appends "· Filtered to Checkout" in `ink` with a ghost Clear. More than three selected says "4 of 12 services" (`noun`).

**Accessibility.** The scope is a `section`: name it with `aria-label` or `aria-labelledby`. The caption is `aria-live="polite"` and atomic, so it's announced once per change of slice or selection and never per crosshair move. Each chart keeps its own keyboard path; Escape in any chart clears its own pins, then its own selection, then the scope's selection, before stepping up a level. A selectable mark is a pressed or unpressed button ("Press Enter to filter to it."). Under forced colours the shared rule is `CanvasText` and receded marks stay at 35%; under reduced motion receding changes in place.

**Props.**

- `slice`: the slice in words.
- `by`: the key that names an entity in a record. `noun`: what the entities are called (default "items").
- `selected` / `defaultSelected` / `onSelectedChange`: one value, several, or null. `onSelectedChange` gets the values now selected (empty for none).
- `window` / `defaultWindow` / `onWindowChange`: `{ start, end }` in the records' own x values.
- `palette`: true (default), an array of keys in slot order, or false.
- `caption`: false to place a `ChartScopeCaption` yourself (under a `FilterBar`, say); its children replace `slice`.

On a view: `ChartContainer` and `DataTable` take `scope={false}` to stand apart, or `scope={{ match, select }}` when a record's entity isn't at the `by` key: `match(d, selected)` returns true, false or undefined, and `select(d)` names the entity a chosen record stands for.

**You provide:** the slice (re-query or re-count every view for it, as you would for a `FilterBar`), the window state if anything else reads it, and the same key for the same entity in every chart. A stat doesn't recede: a headline number at 35% can't be read, so give it the slice's number instead.

```tsx
const [range, setRange] = React.useState({ start: from, end: to });
const [picked, setPicked] = React.useState<Array<string | number>>([]);

<ChartScope aria-label="Service health" slice="Last 24 hours · production" by="service" noun="services"
  window={range} onWindowChange={setRange} selected={picked} onSelectedChange={setPicked}>
  <StatGroup>…</StatGroup>
  <Card><ChartContainer config={errorsByService}><LineChart data={errors} x="t"><ChartBrush /></LineChart></ChartContainer></Card>
  <Card><ChartContainer config={latency}><LineChart data={latencyRows} x="t" /></ChartContainer></Card>
  <Card><ChartContainer config={rate}><BarChart data={byService} x="service" /></ChartContainer></Card>
  <DataTable rows={incidents} columns={columns} />
</ChartScope>
```

- Do scope the charts that show one slice of one record, and say the slice once.
- Do use the same series key for the same entity in every chart (`checkout`, not `checkout_errors` and `checkout_p99`).
- Don't scope charts of different slices or records side by side; a shared pointer between unrelated charts suggests a link the data never made.
- Don't add a second readout to siblings to "show the value there"; one readout per page, and the keyboard picks up the reading.
- Don't nest scopes. The nearest one wins, and two slices on one page should be two sections.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`ChartScope` as first used in its preview:

```tsx
import { BarChart, Card, CardContent, CardDescription, CardHeader, CardTitle, ChartBrush, ChartContainer, ChartScope, DataTable, LineChart, Stat, StatGroup } from 'altitude-design';

<ChartScope className="cs" aria-label="Service health" by="service" noun="services"
  slice={`${fmtRange(range)} UTC · production`} window={range} onWindowChange={setRange} selected={picked} onSelectedChange={setPicked}>
  <StatGroup>
    <Stat label="Mean error rate" value={byService.reduce((t, s) => t + s.rate, 0) / byService.length} format={csPct} />
    <Stat label="Peak p99 latency" value={Math.max(...csIn(csLatency, range).map((r) => r.p99))} format={csMs} />
    <Stat label="Incidents opened" value={incidents.length} />
  </StatGroup>
  <Card>
    <CardHeader><CardTitle id="cs1">Error rate by service</CardTitle><CardDescription>Point anywhere: every chart over the same hours marks the same hour. Drag the lens: every chart and stat follows.</CardDescription></CardHeader>
    <CardContent>
      <ChartContainer aria-labelledby="cs1" config={{ checkout: { label: 'Checkout', format: csPct }, search: { label: 'Search', format: csPct }, payments: { label: 'Payments', format: csPct } }} aspect={3.2} locale="en-GB" yFormat={csPct}>
        <LineChart data={csErrors} x="t"><ChartBrush /></LineChart>
      </ChartContainer>
    </CardContent>
  </Card>
  <div className="two">
    <Card>
      <CardHeader><CardTitle id="cs2">Latency, all services</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer aria-labelledby="cs2" config={{ p50: { label: 'p50 (median)', format: csMs }, p99: { label: 'p99', format: csMs } }} aspect={1.8} locale="en-GB" yFormat={csMs}>
          <LineChart data={csLatency} x="t" />
        </ChartContainer>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle id="cs3">Mean error rate by service</CardTitle><CardDescription>Choose a bar to filter every view to that service</CardDescription></CardHeader>
      <CardContent>
        <ChartContainer aria-labelledby="cs3" config={{ rate: { label: 'Mean error rate', format: csPct } }} aspect={1.8} locale="en-GB" xFormat={(v) => csNames[v] ?? String(v)}>
          <BarChart data={byService} x="service" />
        </ChartContainer>
      </CardContent>
    </Card>
  </div>
  <DataTable aria-label="Incidents" noun="incidents" rows={incidents} getRowId={(r) => r.id}
    columns={[
      { key: 'id', header: 'Incident' },
      { key: 'service', header: 'Service', cell: (r) => csNames[r.service] },
      { key: 'title', header: 'What happened' },
      { key: 'opened', header: 'Opened', cell: (r) => csWhen.format(new Date(r.opened)) },
      { key: 'minutes', header: 'Minutes', align: 'end' },
    ]} />
</ChartScope>
```

The full preview, as rendered in Storybook and checked in CI (`cs`, `two` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { BarChart, Card, CardContent, CardDescription, CardHeader, CardTitle, ChartBrush, ChartContainer, ChartScope, DataTable, LineChart, Stat, StatGroup } from 'altitude-design';

// Two days of a service-health dashboard, hourly: error rates per service, latency for the fleet, and incidents.
const csHours = Array.from({ length: 48 }, (_, i) => new Date(Date.UTC(2026, 10, 3, i)).toISOString());
const csWave = (i, k) => Math.max(0.05, 0.4 + 0.25 * Math.sin((i + k * 7) / 5));
const csErrors = csHours.map((t, i) => ({
  t,
  checkout: +(csWave(i, 0) + (i >= 30 && i <= 34 ? 2.6 - Math.abs(i - 32) * 0.5 : 0)).toFixed(2),
  search: +(csWave(i, 1) * 0.8).toFixed(2),
  payments: +(csWave(i, 2) * 1.1 + (i >= 31 && i <= 33 ? 0.9 : 0)).toFixed(2),
}));
const csLatency = csHours.map((t, i) => ({ t, p50: Math.round(118 + 12 * Math.sin(i / 4) + (i >= 30 && i <= 34 ? 40 : 0)), p99: Math.round(410 + 60 * Math.sin(i / 3) + (i >= 30 && i <= 34 ? 520 - Math.abs(i - 32) * 120 : 0)) }));
const csIncidents = [
  { id: 'INC-412', service: 'checkout', title: 'Card tokeniser timeouts', opened: csHours[30], minutes: 74 },
  { id: 'INC-413', service: 'payments', title: 'Ledger writes retrying', opened: csHours[31], minutes: 41 },
  { id: 'INC-409', service: 'search', title: 'Index lag after deploy', opened: csHours[9], minutes: 22 },
  { id: 'INC-414', service: 'checkout', title: 'Promo code lookups slow', opened: csHours[40], minutes: 12 },
];
const csNames = { checkout: 'Checkout', search: 'Search', payments: 'Payments' };
const csPct = (v) => `${v.toFixed(1)}%`;
const csMs = (v) => `${Math.round(v)} ms`;
const csWhen = new Intl.DateTimeFormat('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
function csIn(rows, w) {
  if (!w) return rows;
  const a = w.start ? Date.parse(w.start) : -Infinity, b = w.end ? Date.parse(w.end) : Infinity;
  return rows.filter((r) => { const t = Date.parse(r.t ?? r.opened); return t >= a && t <= b; });
}
export default function App() {
  const [range, setRange] = React.useState({ start: csHours[24], end: csHours[47] });
  const [picked, setPicked] = React.useState([]);
  const shown = csIn(csErrors, range);
  // The bars and the stats are the same slice: the app re-counts them for the window, as it would from its API.
  const byService = Object.keys(csNames).map((service) => ({ service, rate: +(shown.reduce((t, r) => t + r[service], 0) / Math.max(1, shown.length)).toFixed(2) }));
  const incidents = csIn(csIncidents, range);
  const fmtRange = (w) => `${csWhen.format(new Date(w.start))} – ${csWhen.format(new Date(w.end))}`;
  return (
    <ChartScope className="cs" aria-label="Service health" by="service" noun="services"
      slice={`${fmtRange(range)} UTC · production`} window={range} onWindowChange={setRange} selected={picked} onSelectedChange={setPicked}>
      <StatGroup>
        <Stat label="Mean error rate" value={byService.reduce((t, s) => t + s.rate, 0) / byService.length} format={csPct} />
        <Stat label="Peak p99 latency" value={Math.max(...csIn(csLatency, range).map((r) => r.p99))} format={csMs} />
        <Stat label="Incidents opened" value={incidents.length} />
      </StatGroup>
      <Card>
        <CardHeader><CardTitle id="cs1">Error rate by service</CardTitle><CardDescription>Point anywhere: every chart over the same hours marks the same hour. Drag the lens: every chart and stat follows.</CardDescription></CardHeader>
        <CardContent>
          <ChartContainer aria-labelledby="cs1" config={{ checkout: { label: 'Checkout', format: csPct }, search: { label: 'Search', format: csPct }, payments: { label: 'Payments', format: csPct } }} aspect={3.2} locale="en-GB" yFormat={csPct}>
            <LineChart data={csErrors} x="t"><ChartBrush /></LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <div className="two">
        <Card>
          <CardHeader><CardTitle id="cs2">Latency, all services</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer aria-labelledby="cs2" config={{ p50: { label: 'p50 (median)', format: csMs }, p99: { label: 'p99', format: csMs } }} aspect={1.8} locale="en-GB" yFormat={csMs}>
              <LineChart data={csLatency} x="t" />
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle id="cs3">Mean error rate by service</CardTitle><CardDescription>Choose a bar to filter every view to that service</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer aria-labelledby="cs3" config={{ rate: { label: 'Mean error rate', format: csPct } }} aspect={1.8} locale="en-GB" xFormat={(v) => csNames[v] ?? String(v)}>
              <BarChart data={byService} x="service" />
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      <DataTable aria-label="Incidents" noun="incidents" rows={incidents} getRowId={(r) => r.id}
        columns={[
          { key: 'id', header: 'Incident' },
          { key: 'service', header: 'Service', cell: (r) => csNames[r.service] },
          { key: 'title', header: 'What happened' },
          { key: 'opened', header: 'Opened', cell: (r) => csWhen.format(new Date(r.opened)) },
          { key: 'minutes', header: 'Minutes', align: 'end' },
        ]} />
    </ChartScope>
  );
}
```
<!-- /example -->
