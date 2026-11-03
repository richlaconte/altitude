# RelativeTime

A moment shown as "3 minutes ago", for activity feeds, audit logs, comments and "last edited". `formatRelativeTime()` gives the same words as a string.

**Elevation.** A timestamp is part of the record, so it's plain text on the ground. **Ticking forward is not a change to the record:** "3 minutes ago" becoming "4 minutes ago" swaps the words with no transition and no afterglow. When the moment itself changes (the record was edited again), that is a change, and the time takes the same ground-level tint as a changed `FormattedNumber`, decaying over `dur-settle`.

**Refreshing.** Every RelativeTime on the page shares one timer (every 15 seconds). It stops while the page is hidden and catches up as soon as the page is visible again. Words come from `Intl.RelativeTimeFormat` with `numeric: "auto"`, so you get "now", "yesterday" and "last month", pluralised for the locale.

**Formats.** `relative` (default) always says how long ago or until. `auto` is relative within `threshold` (an ISO 8601 duration such as `"P7D"` or `"PT12H"`, or milliseconds; default 7 days), then a date ("Mar 4", or "Mar 4, 2025" in another year). `tense="past"` never says "in 2 minutes", even when a client's clock runs ahead, and `tense="future"` never says "ago".

**Accessibility.** It renders a `<time dateTime="…ISO…">`. With `tooltip` (on by default) it's focusable, and the exact date, time and zone ("Wednesday, October 29, 2026 at 3:04:12 PM EDT") is shown in a `Tooltip` on hover and focus and attached with `aria-describedby`. With `tooltip={false}` the exact time is its `title`. Ticking is never a live region. Under forced colours a new moment's tint is a `Highlight` outline.

**Props:** `date` (a `Date`, ISO string or epoch ms); `format` (`'relative' | 'auto'`); `threshold`; `tense` (`'auto' | 'past' | 'future'`); `locale`; `tooltip` (default true).

**You provide:** the moment, and whether old moments should become dates (`format="auto"`).

```tsx
<RelativeTime date={event.createdAt} />                    // "3 minutes ago"
<RelativeTime date={due} format="auto" threshold="P7D" />   // relative within 7 days, then "Mar 4"
<RelativeTime date={d} locale="fr" tense="past" />          // "il y a 3 minutes"
```

- Do use `format="auto"` in logs and feeds that reach back further than a week.
- Do keep the tooltip on wherever the exact time matters (audit logs, billing).
- Don't put a RelativeTime in a live region, or announce it ticking.
- Don't format times by hand with string concatenation.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`RelativeTime` as first used in its preview:

```tsx
import { RelativeTime } from 'altitude-design';

<RelativeTime date={when} format="auto" />
```

The full preview, as rendered in Storybook and checked in CI (`rt`, `col`, `row`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, RelativeTime } from 'altitude-design';

const ago = (ms) => new Date(Date.now() - ms);
const events = [
  ['Deploy #482 finished', ago(20_000)],
  ['Maya invited Theo', ago(3 * 60_000)],
  ['Invoice INV-0042 paid', ago(5 * 3_600_000)],
  ['API key rotated', ago(26 * 3_600_000)],
  ['Workspace created', ago(40 * 86_400_000)],
];
export default function App() {
  const [edited, setEdited] = React.useState(() => ago(12 * 60_000));
  return (
    <div className="rt">
      <ul aria-label="Activity">
        {events.map(([what, when]) => <li key={what}><span>{what}</span><RelativeTime date={when} format="auto" /></li>)}
      </ul>
      <Card>
        <CardHeader><CardTitle>Q3 board deck</CardTitle><CardDescription>Last edited <RelativeTime date={edited} /></CardDescription></CardHeader>
        <CardContent>
          <div className="col">
            <div className="row"><Button size="sm" onClick={() => setEdited(new Date())}>Edit again</Button></div>
            <p className="cap">Time passing changes the words with nothing else. A new moment (an edit) settles with a tint. Point at or tab to a time for its exact date, time and zone. Past a week, the feed shows a date.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```
<!-- /example -->
