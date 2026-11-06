# Stat

The tile at the top of a dashboard: a label, a big number, how it changed and against what ("Active users · 12,480 · Up 8% vs last month: 11,556"). It's often the most-read thing on the page, and sometimes the right answer isn't a chart at all.

**Why it's flush.** A number is the record. A stat has no level of its own: inside a `Card` it lies on the card, on its own it lies on the page. The label is `text-label` in `ink-muted`; the value is `text-title` in `ink`, weight 600, with tabular figures. `size="hero"` sets it in `text-display`, for the one number a view leads with (once per view, as the type scale says). A `trend` sits beside the value, usually a decorative [`Sparkline`](../Sparkline/README.md).

**Up isn't always good.** Without `good`, the change is neutral: `ink-muted` text with an arrow ("↘ Down 12 ms"). Say which direction is good (`good="up"` for users, `good="down"` for an error rate) and the change becomes a `Badge` plate whose lamp is `positive` or `critical`. The word says the direction, the arrow shows it, and the colour says whether it's good, so no cue stands alone. No change reads "No change" and stays neutral.

**Motion.** A changed value cross-fades (`dur-travel-2`) and the stat takes the afterglow (`settle`), within the attention budget. It never counts up: that delays the number for decoration. While the value loads (`undefined`, or a promise) it's an imprint of a number's width under a label already in place, and it lands like any `Await` content. In a `StatGroup` the values land together.

**Accessibility.** Plain HTML: a `section` named by its label, so it reads "Active users, 12,480, Up 8%, vs last month: 11,556". Direction is always a word; the arrow is decorative. With `live`, a changed value is announced politely: "Active users, 12,792, up 10.7% vs last month." Under forced colours the change plate gets a 1px border and the arrow carries direction; under `contrast="more"` it's drawn as `Badge` is.

**Props:** `label`; `value` (a number, a string, `null` for an em dash, `undefined` or a promise while it loads); `format`; `change` (`{ value, vs, previous, format }`: `value` is a fraction by default, so `0.08` reads "Up 8%"; with `format` it's in your units); `good` (`'up'` or `'down'`); `trend`; `help` (a caption of context); `size` (`'default'` or `'hero'`); `live`; `locale`; `source` (where the number came from and when, as on `ChartContainer`: a flush caption line under it, "Stale" with a `caution` icon past `staleAfter`). `StatGroup` lays a row of stats out to wrap (each at least 180px) and lands them together; give it one `source` (and `locale`) and the row says it once, in a line under it, rather than per stat.

**You provide:** the value and, if it changed, by how much and against what, in words. Put each stat in a `Card` on a dashboard; make the card `interactive` if the whole stat opens a report.

```tsx
<StatGroup aria-label="Last 30 days">
  <Card><CardContent>
    <Stat label="Active users" value={metrics?.active} good="up"
      change={{ value: 0.08, vs: 'last month', previous: 11556 }}
      trend={<Sparkline data={metrics?.daily} y="active" decorative />} />
  </CardContent></Card>
</StatGroup>
```

- Do say what the change is against ("vs last month"); a percentage alone has no anchor.
- Do set `good` only when a direction really is good or bad; otherwise leave the change neutral.
- Do lead a dashboard with stats, then the charts that explain them, then the table that is the record.
- Don't use `size="hero"` more than once in a view.
- Don't animate the number counting up, or colour the value itself: colour belongs to the change, and only with `good`.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Stat` as first used in its preview:

```tsx
import { Stat } from 'altitude-design';

<Stat label="Monthly recurring revenue" size="hero" value={mrr} format={usd.format} good="up"
  change={{ value: 0.042, vs: 'September', previous: 176800 }} help="Paid plans only, before refunds." />
```

The full preview, as rendered in Storybook and checked in CI (`st`, `st-bar` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Button, Card, CardContent, Sparkline, Stat, StatGroup } from 'altitude-design';

const stDays = (vals) => vals.map((v, i) => ({ day: `2026-10-${String(i + 1).padStart(2, '0')}`, v }));
const active = stDays([11.2, 11.4, 11.3, 11.6, 11.5, 11.8, 11.9, 12.0, 11.9, 12.1, 12.2, 12.4, 12.3, 12.48].map((k) => k * 1000));
const errors = stDays([0.8, 0.9, 0.8, 1.0, 1.1, 1.0, 1.2, 1.3, 1.2, 1.4, 1.5, 1.4, 1.6, 1.7]);
const usd = new Intl.NumberFormat('en', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
export default function App() {
  const [n, setN] = React.useState(0);
  const [mrr, setMrr] = React.useState(undefined);
  React.useEffect(() => { const t = setTimeout(() => setMrr(184200), 2400); return () => clearTimeout(t); }, []);
  const users = 12480 + n * 312;
  return (
    <div className="st">
      <Card>
        <CardContent>
          <Stat label="Monthly recurring revenue" size="hero" value={mrr} format={usd.format} good="up"
            change={{ value: 0.042, vs: 'September', previous: 176800 }} help="Paid plans only, before refunds." />
        </CardContent>
      </Card>
      <div className="st-bar">
        <h3>Last 30 days</h3>
        <Button variant="secondary" size="sm" onClick={() => setN((k) => k + 1)}>Refresh</Button>
      </div>
      <StatGroup aria-label="Last 30 days">
        <Card><CardContent>
          <Stat label="Active users" value={users} live good="up" change={{ value: users / 11556 - 1, vs: 'last month', previous: 11556 }}
            trend={<Sparkline data={active} x="day" y="v" decorative width={72} />} />
        </CardContent></Card>
        <Card><CardContent>
          <Stat label="Error rate" value={1.7 + n * 0.1} format={(v) => `${v.toFixed(1)}%`} good="down" change={{ value: 0.21 + n * 0.07, vs: 'last month' }}
            trend={<Sparkline data={errors} x="day" y="v" tone="critical" decorative width={72} />} />
        </CardContent></Card>
        <Card><CardContent>
          <Stat label="Median response" value={182 - n * 4} format={(v) => `${v} ms`} change={{ value: -12 - n * 4, vs: 'last week', format: (m) => `${m} ms` }} />
        </CardContent></Card>
        <Card><CardContent>
          <Stat label="Refunds" value={null} help="No refunds this period." />
        </CardContent></Card>
      </StatGroup>
    </div>
  );
}
```
<!-- /example -->
