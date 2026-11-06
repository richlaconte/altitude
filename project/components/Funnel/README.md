# Funnel

How many people reached each step of a process, and where they left: visited → signed up → activated → paid; opened → replied → booked. It's the most common chart in product analytics. Aligned adjacent bars are the arrangement people compare most accurately (Cleveland & McGill, 1984; Talbot, Setlur & Anand, 2014), so a step is a bar from one left edge. The drop-off between two steps is a number, so it's said in words. shadcn/ui has no equivalent.

**Why it's flat.** It borrows from `Stepper`, steps on one ground line turned to run down the page, and from the rule that amounts are never height. Each step is a flat `data-1` bar from the same left edge, its count and share of the first step at its end in `ink` ("1,204 · 39%"). Nothing is drawn in the gap between two bars. The drop-off lies there as a flush plate (a sunk-tinted face, a 1px hairline edge, `ink` text) with the down-right arrow in `ink-muted`: "−38% · 742 left". The period before is a 2px `ink` tick at each earlier count, as `compare` draws it. Nothing lifts.

**Without colour.** Every number is in words: each step's count and share at its bar, each drop in its plate. A drop the author calls bad (`bad`) wears a `critical` edge and icon and adds the words "Steep drop". Colour is never the only sign. Under forced colours bars are `CanvasText`, and plates keep their 1px edge and icon; with `contrast="more"` bars take a 1px `ink` edge.

**Order is the process's.** Steps are drawn in data order, never sorted. A step larger than the one before is drawn as it is and said in words ("+38 more than the step before"), because it happens (re-entries), and hiding it would misstate the record.

**Accessibility.** The container's keyboard path: ↑/↓ (or ←/→) move between steps, Home and End to the ends. Each step says its name, count, share and drop: "Activated: 1,204 people, 39% of Visited pricing. Down 38% from Signed up, 742 left." The period before follows ("September: 1,130, up 7%."). With `onSelect`, Enter or a click selects a step (the readout says "Select to filter"). The generated summary gives the overall conversion and the largest drop: "Of 3,120 at Visited pricing, 418 reached Paid (13%). The largest drop is between Activated and Paid: 65%." With `views`, the table has each step's count, share, drop and the earlier count.

**Props.** `data` (one record per step, in order), `step` (the key of its name), `value` (the key of its count, named and formatted by the container's `config`); `dropoff` (`'share'`, the default "−38%"; `'count'`, "742 left"; `'both'`); `bad` (gets a step's `name`, `count`, `share`, `drop` and `left`); `compare={{ data, label }}`; `relevance`; `selected` (a step's name) and `onSelect`; `empty`; `tooltip`. Give the container a `height`: steps share it.

```tsx
<ChartContainer config={{ users: { label: 'People', format: count } }} title="Signup funnel, October" height={300}
  takeaway="Two in three people who activate never pay: the last step loses 65%">
  <Funnel data={steps} step="name" value="users" dropoff="both" bad={(s) => s.drop > 0.5}
    compare={{ data: lastMonth, label: 'September' }} />
</ChartContainer>
```

- Do keep the steps in the process's order, and say in the takeaway which drop matters.
- Do mark a drop as `bad` only when it means something is wrong, and let the words say so.
- **Don't draw it as a tapering shape.** A funnel shape encodes counts as area and slope, which people misread for the same reason they misread pies (rule 1). Bars from one edge are the same data, read accurately.
- Don't use it for branching processes (a sankey, which Altitude doesn't draw), for the time between steps (a `Histogram` per step), or for cohorts over time (a `Heatmap`).

Not yet: a `ChartScope` selection across steps.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Funnel` as first used in its preview:

```tsx
import { Funnel } from 'altitude-design';

<Funnel data={fnOctober} step="name" value="people" dropoff="both" bad={(s) => s.drop > 0.5} />
```

The full preview, as rendered in Storybook and checked in CI (`fn`, `two` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Card, CardContent, ChartContainer, Funnel } from 'altitude-design';

const fnOctober = [
  { name: 'Visited pricing', people: 3120 },
  { name: 'Started signup', people: 1984 },
  { name: 'Signed up', people: 1946 },
  { name: 'Activated', people: 1204 },
  { name: 'Paid', people: 418 },
];
const fnSeptember = [
  { name: 'Visited pricing', people: 2870 },
  { name: 'Started signup', people: 1790 },
  { name: 'Signed up', people: 1702 },
  { name: 'Activated', people: 1130 },
  { name: 'Paid', people: 377 },
];
const fnInbox = [
  { name: 'Opened', people: 860 },
  { name: 'Replied', people: 312 },
  { name: 'Booked a call', people: 141 },
];
const fnCount = new Intl.NumberFormat('en-GB');
const fnConfig = { people: { label: 'People', format: (v) => fnCount.format(v) } };
export default function App() {
  const [picked, setPicked] = React.useState(null);
  return (
    <div className="fn">
      <Card>
        <CardContent>
          <ChartContainer config={fnConfig} title="Signup funnel, October" takeaway="Two in three people who activate never pay: the last step loses 65%" height={300} locale="en-GB" views>
            <Funnel data={fnOctober} step="name" value="people" dropoff="both" bad={(s) => s.drop > 0.5} />
          </ChartContainer>
        </CardContent>
      </Card>
      <div className="two">
        <Card>
          <CardContent>
            <ChartContainer config={fnConfig} title="Against September" description="The tick is September's count" height={300} locale="en-GB">
              <Funnel data={fnOctober} step="name" value="people" compare={{ data: fnSeptember, label: 'September' }} />
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <ChartContainer config={fnConfig} title="Outreach, this week" description={picked ? `Showing who left before ${picked}` : 'Choose a step to see who left before it'} height={200} locale="en-GB">
              <Funnel data={fnInbox} step="name" value="people" dropoff="count" selected={picked} onSelect={(d) => setPicked(d ? d.name : null)} />
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```
<!-- /example -->
