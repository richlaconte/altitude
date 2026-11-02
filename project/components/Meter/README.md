# Meter

Where a reading sits in a known range: storage used of a quota, seats used of a plan, CPU, a score. It isn't a task's progress: a meter doesn't move toward done, and being near the top can be bad. With `segments` it shows parts of a whole (storage by type), the honest replacement for a donut chart.

**Why it's flush, not a trench.** `Progress` and `Meter` look alike and mean different things (see [Charts](../../Charts.md)). `Progress` is a task under way, which is live, so its fill rises out of a trench. A meter's reading is the record, so it lies on the ground: a flush track of `line` with the reading drawn across it as flat ink (`data-1`), with no shadow, wall or sheen.

**Thresholds.** `high` is where the reading is near its limit and `critical` where it's over (by default, anything above `max`). Each threshold inside the range is a 1px `ink-muted` notch standing at the track's rim. Past `high` the fill turns `caution`, and past the limit `critical`, and the meter says so in words ("Near limit", "Over limit") on a `Badge` whose lamp relights when the state changes. Thresholds assume that higher is worse, as for quotas and load. For a score where lower is worse, leave them off and say the state in your own words.

**Segments.** Each part is a flat `data-*` fill in config order (`data-1`, `data-2`, …), parted from the one before by a 2px cut in the surface's own colour, with a legend of each part's value beneath. The segments add up to the reading, and thresholds still apply to the total.

**Motion.** The fill glides to a new reading on `ease-glide` over `dur-travel-3`, as Progress does, and its colour cross-fades when it crosses a threshold. Under reduced motion it changes in place. While the reading loads (`value` undefined) the track is an imprint and lands like `Await` content.

**Accessibility.** The [APG meter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/meter/): `role="meter"` named by its label, with `aria-valuemin`, `aria-valuemax` and `aria-valuenow` (kept within the range when the reading is over it) and an `aria-valuetext` in words: "Storage, 62 GB of 100 GB", "11,800 of 10,000, over limit", "62 GB of 100 GB, Media 38 GB, Documents 14 GB…". Under forced colours the track is outlined, the fill is `Highlight`, the notches are `CanvasText`, and the state is in the words. Under `contrast="more"` the track gets a 1px `ink` edge and the notches are `ink`.

**Props:** `label`; `value`; `min` (default 0); `max` (default 100); `high`; `critical`; `segments` (`{ key, label, value, color? }[]`); `format`; `states` (`{ high, critical }` words); `hideValue`; `locale`.

**You provide:** the reading and its range, the thresholds that matter, and a `format` that names the unit.

```tsx
<Meter label="Storage" value={62} max={100} high={80} format={(n) => `${n} GB`} />
<Meter label="Storage by type" max={100} format={(n) => `${n} GB`}
  segments={[{ key: 'media', label: 'Media', value: 38 }, { key: 'docs', label: 'Documents', value: 14 }, { key: 'other', label: 'Other', value: 10 }]} />
```

- Do use `Progress` for a task moving toward done, and `Meter` for a reading.
- Do name the unit in `format` ("62 GB of 100 GB"), not only a percentage.
- Do use segments for parts of a whole instead of a pie or donut.
- Don't give it more than six segments; fold the rest into "Other".
- Don't colour a reading caution or critical yourself; set `high` and `critical`, so the words come with the colour.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Meter` as first used in its preview:

```tsx
import { Meter } from 'altitude-design';

<Meter label="Storage" value={used} max={100} high={80} format={gb} />
```

The full preview, as rendered in Storybook and checked in CI (`mt`, `stack`, `row` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Meter } from 'altitude-design';

const gb = (n) => `${n} GB`;
export default function App() {
  const [used, setUsed] = React.useState(62);
  const [cpu, setCpu] = React.useState(undefined);
  React.useEffect(() => { const t = setTimeout(() => setCpu(37), 2400); return () => clearTimeout(t); }, []);
  return (
    <div className="mt">
      <Card>
        <CardHeader><CardTitle>Plan usage</CardTitle><CardDescription>Thresholds at 80% and the limit</CardDescription></CardHeader>
        <CardContent className="stack">
          <Meter label="Storage" value={used} max={100} high={80} format={gb} />
          <Meter label="Seats" value={24} max={25} high={20} format={(n) => `${n}`} />
          <Meter label="API calls today" value={11800} max={10000} high={8000} format={(n) => n.toLocaleString('en')} />
          <Meter label="CPU" value={cpu} format={(n) => `${n}%`} />
          <div className="row">
            <Button size="sm" variant="secondary" onClick={() => setUsed((u) => Math.max(0, u - 15))}>Free 15 GB</Button>
            <Button size="sm" variant="secondary" onClick={() => setUsed((u) => u + 15)}>Use 15 GB</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Storage by type</CardTitle><CardDescription>Parts of a whole, instead of a donut</CardDescription></CardHeader>
        <CardContent className="stack">
          <Meter label="Storage" max={100} format={gb}
            segments={[{ key: 'media', label: 'Media', value: 38 }, { key: 'docs', label: 'Documents', value: 14 }, { key: 'mail', label: 'Mail', value: 6 }, { key: 'other', label: 'Other', value: 4 }]} />
          <Meter label="Team seats" max={50} high={45} format={(n) => `${n}`}
            segments={[{ key: 'admin', label: 'Admins', value: 4 }, { key: 'members', label: 'Members', value: 31 }, { key: 'guests', label: 'Guests', value: 12 }]} />
        </CardContent>
      </Card>
    </div>
  );
}
```
<!-- /example -->
