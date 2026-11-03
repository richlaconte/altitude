# AgentLanes

Where each agent's time went, one lane per agent on a shared clock: working, waiting on you, waiting on another agent, failed. Its takeaway leads with how long agents have waited on you, the bottleneck a fleet of agents hides: once several run, the person is usually the slowest part.

**Elevation: a chart, so nothing has height** (see [Charts](../../Charts.md)).
- **Stretches** are equal-height flat bars lying on each lane's ground line: working is `data-1`; waiting on you is `caution` hatched at 45°; waiting on another agent is a 1px dashed outline; failed is `critical`. A gap is time the agent wasn't running.
- **Every fill is named** in the key, in words, and each bar's title says its agent, state and span.
- **"Now"** is a 1px `line-control` rule at the end of the record; the axis says "31 min ago", "15 min ago", "Now".
- **The selected lane** is its name in `accent-ink` and 650, with `aria-pressed`; lanes never lift.
- **Forced colours**: working solid, waiting hatched, blocked dashed, failed cross-hatched with a thick border.

**Accessibility.** A `figure` captioned by its takeaway. The lane names are buttons when `onSelect` is set; the bars and axis are hidden from assistive technology and a table gives the same data (agent; time working, waiting on you, waiting on another agent, failed).

**Props:** `lanes` (`{ id, name, segments: { from, to?, state }[] }[]`; a segment without `to` runs to now), `start` (default the earliest segment), `now`, `takeaway` (default "Agents have waited on you for 15 min in all; the longest wait was Pricing page, 5 min."), `aria-label`, `selected`, `onSelect`. Time spent failed counts as waiting on you in the takeaway, since a failed agent waits for a retry.

```tsx
<AgentLanes start={job.startedAt} lanes={agents.map((a) => ({ id: a.id, name: a.name, segments: a.history }))} selected={open} onSelect={setOpen} />
```

- Do keep it below the roster: it explains the past, the roster and requests are for now.
- Don't draw dependencies as arrows between lanes; say them on the waiting agent ("Waiting on Billing API").

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`AgentLanes` as first used in its preview:

```tsx
import { AgentLanes } from 'altitude-design';

<AgentLanes lanes={lanes} start={t0} now={m(31)} selected={sel} onSelect={setSel} />
```

The full preview, as rendered in Storybook and checked in CI (`al` is the preview page's own layout class, not Altitude's):

```tsx
import * as React from 'react';
import { AgentLanes } from 'altitude-design';

const t0 = Date.UTC(2026, 9, 31, 14, 0), m = (n) => t0 + n * 60000;
const lanes = [
  { id: 'pricing', name: 'Pricing page', segments: [{ from: m(3), to: m(20), state: 'working' }, { from: m(20), to: m(25), state: 'waiting' }] },
  { id: 'api', name: 'Billing API', segments: [{ from: m(3), to: m(7), state: 'working' }, { from: m(7), to: m(10), state: 'waiting' }, { from: m(10), to: m(19), state: 'working' }] },
  { id: 'emails', name: 'Renewal emails', segments: [{ from: m(3), to: m(8), state: 'working' }, { from: m(8), to: m(13), state: 'waiting' }, { from: m(13), to: m(25), state: 'working' }] },
  { id: 'qa', name: 'QA', segments: [{ from: m(3), to: m(19), state: 'blocked' }, { from: m(19), to: m(21), state: 'working' }, { from: m(21), to: m(23), state: 'failed' }, { from: m(23), to: m(29), state: 'working' }] },
  { id: 'changelog', name: 'Changelog', segments: [{ from: m(27), to: m(30), state: 'working' }] },
];
export default function App() {
  const [sel, setSel] = React.useState('qa');
  return <div className="al"><AgentLanes lanes={lanes} start={t0} now={m(31)} selected={sel} onSelect={setSel} /></div>;
}
```
<!-- /example -->
