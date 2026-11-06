# UnitChart

A frequency, said so it's felt as a count: "18 of every 100 trial accounts convert", "3 of 40 seats are unassigned", "3 invoices this month were paid late". A stacked bar or a segmented `Meter` gives a share as a length, which is right for comparing shares and wrong for grasping a rate or a risk. Icon arrays raised accuracy for low- and high-numeracy readers alike (Galesic, Garcia-Retamero & Gigerenzer, 2009) and removed denominator neglect (Garcia-Retamero, Galesic & Gigerenzer, 2010). The same work found risks shown as icons read as less serious than the number alone, so the number is always said beside the marks. It's sometimes called a waffle chart; shadcn/ui has no equivalent.

**Why it's flat.** A count is that many marks on the ground. Each mark is a flat square at `radius-xs`, parted by 2px as a `Heatmap`'s cells are. The counted ones are `data-1` (or a group's slot), the rest `data-context`. A fraction of a unit fills its mark from the left. Nothing lifts. A mark that acts takes the 2px `ink` outline on hover and the keyboard's 2px `accent-ink` ring.

**Colour does one job.** Identity for the counted part, `data-context` for the rest. Status (`tone`) only when a record means good or bad, and then the legend says the word with its icon ("Paid late 3"), and each mark's name says it too. Under forced colours counted marks are `CanvasText`, the rest a 1px `CanvasText` outline, and even-numbered groups hatched, so groups stay apart without colour. With `contrast="more"` marks take a 1px `ink` edge.

**Three uses.**

- **A rate:** `total` (default 100, said "of every 100") and `value`.
- **Groups:** `groups={[{ key, label, value }, …]}`, each in its own slot with a direct label and its count; the rest are listed too ("Unassigned 3", from `restLabel`).
- **Records:** `units` makes each mark a record, said "of 40". `getLabel` names it, `tone` marks status, and `onSelect` opens it. The grid is then one Tab stop, walked by row and column (arrows, Home/End along a row, Ctrl+Home/End to the ends), and Enter or Space chooses a mark.

`total` is limited to 400: past that, the number is said instead, and `devChecks` warns. A count that large isn't counted by eye. Ten marks a row by default, 20 above 200 marks; each mark is between 10px and 18px (E42).

**Accessibility.** One `figure`, named by `label`. With a rate or groups, the grid is an `img` named by the summary: "Trial accounts that convert: 18 of every 100 accounts. The rest: 82." With records it's a `grid`, and each mark says its name, its tone and its place ("INV-1046, Tidewater Clinic, Paid late. 7 of 40. Press Enter to open it."). A count change recolours the marks at once over `dur-travel-3`, as one change with no stagger; under reduced motion, in place.

```tsx
<UnitChart label="Trial accounts that convert" total={100} value={18} noun="accounts" />

<UnitChart label="Seats on the Team plan" total={40} restLabel="unassigned"
  groups={[{ key: 'active', label: 'Active', value: 31 }, { key: 'invited', label: 'Invited', value: 6 }]} />

<UnitChart label="Invoices this month" units={invoices} getKey={(i) => i.id} getLabel={(i) => i.id}
  tone={(i) => (i.late ? 'critical' : undefined)} toneLabels={{ critical: 'Paid late' }} onSelect={(i) => open(i.id)} />
```

- Do use it for a rate or a risk people should feel ("1 in 5"), and say the number.
- Do keep `total` to a countable size: 100 for a rate, the real count for records.
- Don't use pictograms (people shapes): a figure is decoration on a count. Don't use it to compare shares across categories, which a stacked `BarChart` does better, or for thousands of units (say the number).

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`UnitChart` as first used in its preview:

```tsx
import { UnitChart } from 'altitude-design';

<UnitChart label="Trial accounts that convert" total={100} value={18} noun="accounts" />
```

The full preview, as rendered in Storybook and checked in CI (`uc` is the preview page's own layout class, not Altitude's):

```tsx
import * as React from 'react';
import { Card, CardContent, UnitChart } from 'altitude-design';

// Forty invoices this month, three of them paid late.
const ucInvoices = Array.from({ length: 40 }, (_, i) => ({ id: `INV-${1040 + i}`, customer: ['Harrow Freight', 'Tidewater Clinic', 'Kestrel Dental', 'Larkspur Bakery', 'Fenwick Tools'][i % 5], late: [6, 19, 33].includes(i) }));
export default function App() {
  const [open, setOpen] = React.useState(null);
  return (
    <div className="uc">
      <Card>
        <CardContent>
          <UnitChart label="Trial accounts that convert" total={100} value={18} noun="accounts" />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <UnitChart label="Seats on the Team plan" total={40} columns={10} noun="seats" restLabel="unassigned"
            groups={[{ key: 'active', label: 'Active', value: 31 }, { key: 'invited', label: 'Invited', value: 6 }]} />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <UnitChart label="Invoices this month" units={ucInvoices} getKey={(i) => i.id} getLabel={(i) => `${i.id}, ${i.customer}`} noun="invoices"
            tone={(i) => (i.late ? 'critical' : undefined)} toneLabels={{ critical: 'Paid late' }} onSelect={(i) => setOpen(i.id)} />
          <p style={{ margin: '8px 0 0', font: '400 13px/19px var(--font-sans)', color: 'var(--ink-muted)' }}>{open ? `Opened ${open}` : 'Choose an invoice to open it'}</p>
        </CardContent>
      </Card>
    </div>
  );
}
```
<!-- /example -->
