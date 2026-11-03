# BarList

Top pages, top referrers, top customers by spend: a ranked list where each row is its own bar, the label is readable at any length, and the exact value sits at the end. It sits between a `Table` (exact, no shape) and a horizontal `BarChart` (shape, but long labels squeeze the plot).

**Why it's flat.** Rows are the record, so they lie flush on the ground with `line` dividers, like a table's rows. Each row's bar is a flat tint of `data-1` behind its label, as long as the row's value against the largest (the top row's bar fills its row), and faint enough that `ink` holds 4.5:1 over it in every scheme. It has a `radius-xs` corner and no shadow, wall or gradient. A long label wraps; it's never cut. The value sits at the row's end in tabular figures, and with `share` its percentage of the total sits beyond the bar in `ink-muted`.

**Hover is a promise.** A row that does something (`href` makes it a link, `onSelect` a button) lifts one level when pointed at, exactly as `Table`'s interactive rows do, and drops back when pressed; its bar stays flat on it. A row that does nothing never moves.

**Other and Show all.** With `limit`, the rows past it fold into one "Other (14 pages)" row in `data-other`, and a ghost "Show all 21 pages" button lists them all (and "Show fewer" folds them back). `noun` names what the rows are.

**Filter in place.** `relevance` raises matches one level and sinks misses into a well, as `TableRow relevance` does; nothing is removed, and misses say "not matching" to screen readers. Under the list it says how many match: "2 of 5 pages match", using `noun`.

**Motion.** When values change, rows are carried to their new ranks (FLIP, `dur-travel-3`, `ease-glide`), all at once, because a re-rank is one change; bars glide to their new lengths. Under reduced motion both change in place. While `data` is undefined the list is imprinted rows, which land like `Await` content.

**Accessibility.** Plain HTML: an `ol` (rank is meaningful) of links, buttons or plain items, each reading "1. /pricing, 4,210, 23%". The bar is hidden from assistive technology; the value is text. Under forced colours bars are a light `Highlight` tint with a 1px `Highlight` border, matches are outlined and misses dashed. Under `contrast="more"` bars get a 1px `ink` edge.

**Props:** `data` (`{ name, value, key?, href? }[]`); `format`; `limit`; `share`; `sort` (`'desc'`, the default, or `false` to keep your order); `noun`; `onSelect`; `relevance`; `locale`; and any `ol` attribute (name it with `aria-labelledby` or `aria-label`).

**You provide:** the rows, a name for the list, and a `format` with the unit when it isn't a plain count.

```tsx
<BarList aria-labelledby="pages-title" data={pages} format={(n) => n.toLocaleString()} limit={8} share noun="pages" />
```

- Do use it for a ranked top-N with long labels; use a `BarChart` to compare a few categories across series.
- Do give rows an `href` when they open a report, so they're real links.
- Do fold a long tail into "Other" with `limit` rather than scrolling a hundred rows.
- Don't colour bars by status or give each row its own colour: colour is identity, and these rows are one series.
- Don't set the bars' lengths to share of total yourself; `share` says it in words, and the bars compare rows with each other.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`BarList` as first used in its preview:

```tsx
import { BarList } from 'altitude-design';

<BarList aria-labelledby="bl-pages" data={pages.map((p) => ({ ...p, href: '#' + p.name }))} limit={7} share noun="pages" />
```

The full preview, as rendered in Storybook and checked in CI (`bl`, `bl-tools` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { BarList, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from 'altitude-design';

const pages = [
  { name: '/pricing', value: 4210 }, { name: '/', value: 3880 }, { name: '/docs/getting-started', value: 2410 }, { name: '/blog/height-is-the-interface-why-we-stopped-using-shadows-for-everything', value: 1630 },
  { name: '/changelog', value: 1210 }, { name: '/docs/components/chart-container', value: 980 }, { name: '/careers', value: 610 },
  ...Array.from({ length: 14 }, (_, i) => ({ name: `/docs/page-${i + 1}`, value: 420 - i * 25 })),
];
const referrers0 = [{ name: 'google.com', value: 5120 }, { name: 'github.com', value: 2310 }, { name: 'news.ycombinator.com', value: 1980 }, { name: 'x.com', value: 760 }, { name: 'Direct', value: 3400 }];
const referrers1 = [{ name: 'google.com', value: 5240 }, { name: 'github.com', value: 2390 }, { name: 'news.ycombinator.com', value: 6120 }, { name: 'x.com', value: 1310 }, { name: 'Direct', value: 3460 }];
export default function App() {
  const [spike, setSpike] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [later, setLater] = React.useState(undefined);
  React.useEffect(() => { const t = setTimeout(() => setLater([{ name: 'Okafor & Lund', value: 48200 }, { name: 'Harrow Freight', value: 31900 }, { name: 'Dr. Ines Varga', value: 22750 }, { name: 'Bramble Bakery', value: 9400 }]), 2400); return () => clearTimeout(t); }, []);
  const usd = new Intl.NumberFormat('en', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  return (
    <div className="bl">
      <Card>
        <CardHeader><CardTitle id="bl-pages">Top pages</CardTitle><CardDescription>Last 7 days · views</CardDescription></CardHeader>
        <CardContent><BarList aria-labelledby="bl-pages" data={pages.map((p) => ({ ...p, href: '#' + p.name }))} limit={7} share noun="pages" /></CardContent>
      </Card>
      <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
        <Card>
          <CardHeader><CardTitle id="bl-ref">Top referrers</CardTitle><CardDescription>Static rows: nothing lifts</CardDescription></CardHeader>
          <CardContent>
            <div className="bl-tools">
              <Button size="sm" variant="secondary" onClick={() => setSpike((s) => !s)}>{spike ? 'Yesterday' : 'Today'}</Button>
              <Input size="sm" placeholder="Filter" aria-label="Filter referrers" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <BarList aria-labelledby="bl-ref" data={spike ? referrers1 : referrers0} relevance={q ? (d) => (d.name.includes(q) ? 'match' : 'miss') : undefined} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle id="bl-cust">Top customers</CardTitle><CardDescription>Spend this quarter</CardDescription></CardHeader>
          <CardContent><BarList aria-labelledby="bl-cust" data={later} format={usd.format} limit={4} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
```
<!-- /example -->
