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
