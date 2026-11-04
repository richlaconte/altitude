# SpanWaterfall

Where one request spent its time: each span (a call to a database, another service, a cache) as a bar placed at when it started and sized by how long it ran, on one clock that starts at 0, indented under the span that called it. It's how an on-call engineer finds the slow dependency, and sees whether calls ran in sequence or in parallel.

Use `BarList` to rank amounts (it can't show when anything happened), `Trace` for the steps an agent takes, and `Schedule` or `Timeline` for events in time rather than nested durations.

**Elevation: the record, in rows, with flat marks.**
- **Bars** are flat ink on the ground, never lifted and never shadowed (Charts rules 1 and 4). The axis starts at 0, the root's start. Its zero rule is the ground line (1px `ink-muted`), and each row has a 1px `line` track, so a bar's offset reads against a ground and waiting shows as a gap.
- **Colour does one job:** with `criticalPath`, focus. The spans the request waited on keep `data-1`, every other span takes `data-context` with its name in `ink-muted`, and the summary says "Highlighted: the critical path". Without it, every bar is `data-1`.
- **A failed span** keeps its colour and adds a 45° hatch, a status icon after the bar, and "Failed" in words. It's never a second hue.
- **Rows** are Table rows in a treegrid. They lift one level when pointed at, and the selected row is tinted `accent-soft` and raised one level (`aria-selected`). Its bar takes a 2px `ink` outline and stays on the ground.
- **A span's detail** (`renderDetail`) opens flush beneath its row, across the columns: a row can't lift into a card without breaking the columns (Elevation, Disclosure).

**Accessibility.** A [treegrid](https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/) with row focus and one tab stop. ↑ and ↓ move between spans. → expands a collapsed caller, or moves to its first child. ← collapses an open caller, or moves to its parent. Home and End go to the first and last spans. Enter opens the detail, and Space selects. Name, start and duration are real columns, so the chart is its own table view: there's no tooltip, because every readout is already in the row. Each row is described with its timings: "started at 98 ms, took 2.29 s, failed, on the critical path". A collapsed caller says "3 spans inside". A span that starts before its caller or ends after it says so in words ("started 3 ms before its caller"), and is drawn where its times say, never clamped. The summary above is the grid's description. Forced colours: bars keep a 1px `CanvasText` outline, and failed ones a pattern. `contrast="more"`: a 1px `ink` edge on each bar.

**Narrow.** Under 640px of its own width (a container query, so it works inside a `Sheet`), each row stacks: the name, start and duration, then the bar across the full width. Indentation stops at 4 levels; deeper rows say "level 6".

**Parts:** `SpanWaterfall` (`spans`: `{ id, parent?, name, start, duration, status? }[]` in ms from the request's start; `format`; `summary`; `criticalPath` (`true` or span ids); `renderDetail`; `expanded`/`onExpandedChange`/`defaultExpandedDepth` (default 2); `selected`/`onSelectedChange`; `aria-label` or `aria-labelledby`). Helpers: `criticalPathOf(spans)`, the walk-back definition trace viewers such as Jaeger use; and `formatMs(ms)`, giving "84 ms" or "2.41 s".

**You provide:** the spans you already have, with starts relative to the request's start (no tracing or OpenTelemetry integration); a summary written from the data, when you have a point to make (Charts rule 9); and the detail for a span, usually a `PropertyList` or `CodeBlock` of its attributes. About 500 spans render as they are; collapse or page beyond that.

```tsx
<SpanWaterfall
  aria-label="Spans of the slowest checkout request"
  spans={[
    { id: 'root', name: 'POST /checkout/confirm', start: 0, duration: 2410 },
    { id: 'pay', parent: 'root', name: 'payments.authorise', start: 98, duration: 2290, status: 'failed' },
    { id: 'db', parent: 'root', name: 'db: load basket', start: 12, duration: 84 },
  ]}
  criticalPath
  summary="2.41 s in all; payments.authorise took 95% of it."
  renderDetail={(span) => <PropertyList items={attributesOf(span)} />}
/>
```

- Do write the summary from the data, as a point ("payments.authorise took 95% of it"), when there is one.
- Do keep starts on one clock from the request's start.
- Don't lift, shadow or recolour a bar for hover, selection or failure.
- Don't use it to rank amounts; that's `BarList`.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`SpanWaterfall` as first used in its preview:

```tsx
import { SpanWaterfall } from 'altitude-design';

<SpanWaterfall aria-label="Spans of the slowest checkout request" spans={SW_SPANS} criticalPath={path}
  summary="2.41 s in all; payments.authorise took 95% of it, two of its three attempts timing out."
  renderDetail={(s) => <dl className="sw-detail">{(SW_ATTRS[s.id] ?? [["span.id", s.id]]).map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl>} />
```

The full preview, as rendered in Storybook and checked in CI (`sw`, `sw-detail`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { SpanWaterfall, Switch } from 'altitude-design';

const SW_SPANS = [
  { id: "root", name: "POST /checkout/confirm", start: 0, duration: 2410 },
  { id: "auth", parent: "root", name: "auth.session", start: 2, duration: 9 },
  { id: "db", parent: "root", name: "db: load basket", start: 12, duration: 84 },
  { id: "inv", parent: "root", name: "inventory.reserve", start: 14, duration: 61 },
  { id: "pay", parent: "root", name: "payments.authorise", start: 98, duration: 2290, status: "failed" },
  { id: "a1", parent: "pay", name: "attempt 1", start: 100, duration: 800, status: "failed" },
  { id: "a2", parent: "pay", name: "attempt 2", start: 920, duration: 800, status: "failed" },
  { id: "a3", parent: "pay", name: "attempt 3", start: 1740, duration: 640 },
  { id: "card", parent: "a3", name: "card-network.charge", start: 1760, duration: 590 },
  { id: "render", parent: "root", name: "render confirmation", start: 2388, duration: 20 }
];
const SW_ATTRS = { pay: [["http.status", "409"], ["error", "duplicate idempotency key"], ["retries", "2"]], a1: [["error", "timeout after 800 ms"]], a2: [["error", "timeout after 800 ms"]] };
export default function App() {
  const [path, setPath] = React.useState(true);
  return <div className="sw">
    <Switch label="Highlight the critical path" checked={path} onCheckedChange={setPath} />
    <SpanWaterfall aria-label="Spans of the slowest checkout request" spans={SW_SPANS} criticalPath={path}
      summary="2.41 s in all; payments.authorise took 95% of it, two of its three attempts timing out."
      renderDetail={(s) => <dl className="sw-detail">{(SW_ATTRS[s.id] ?? [["span.id", s.id]]).map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl>} />
    <p className="cap">↑ and ↓ move between spans, → and ← open and close a caller, Enter opens a span’s attributes.</p>
  </div>;
}
```
<!-- /example -->
