# Timeline

Events in order: activity on a record ("Maya changed status to Done"), workspace activity, version history, webhook delivery attempts, an order's history, background agent runs.

**Elevation: the ground is the record, literally.** The events stand on a ground line turned upright, the same 1px `ink-muted` rule that `Stepper`, the `Drilldown` staircase and a chart's baseline stand on. Each event is a flush entry stamped onto it, with its icon on a flush plate on the line. Past events are never raised cards: a raised card claims to be live.
- **New events** arrive lifted and settle with the afterglow, at most four starting at once. "2 new events" is announced.
- **An event you caused** (`status="pending"`) hovers ("Sending…") until it lands and joins the record. A failed one drops to a trench with "Couldn't send" and Retry.
- **An event that links** (`href`) lifts when pointed at.
- **Detail** (a `DiffView`, a payload) opens behind a Details disclosure as a raised card, as an `Accordion` lid does.

With `groupBy="day"` (the default), each day starts with a heading ("Today", "Yesterday", "Monday", "March 4").

**Accessibility.** A `section` named by `aria-label`, holding an ordered list. Each event is one sentence with its `<time>` (a `RelativeTime` with its exact time in a tooltip). The line and markers are hidden from assistive technology, and day headings are real headings (`headingLevel`, default 3). Details is a disclosure button. Under forced colours the line is `CanvasText`, a pending event is dotted, and a failed one has a thick dash. Under `contrast="more"` the line is 2px.

**Props.** `Timeline`: `groupBy` (`'day' | 'none'`), `headingLevel`, `locale`, `aria-label`, and `TimelineItem` children (give each a key). `TimelineItem`: `time`, `icon`, `status` (`'pending' | 'committed' | 'failed'`), `onRetry`, `detail`, `href`, and the sentence as children.

**You provide:** the events, each as a sentence (who did what to what), with its time.

```tsx
<Timeline aria-label="Activity">
  {events.map((e) => (
    <TimelineItem key={e.id} time={e.at} icon={iconFor(e)} status={e.status} detail={e.diff && <DiffView … />}>
      <strong>{e.actor}</strong> changed status to <Badge>Done</Badge>
    </TimelineItem>
  ))}
</Timeline>
```

- Do write each event as a sentence a screen reader can read on its own.
- Do keep keys stable, so only new events glow.
- Don't raise past events into cards.
- Don't use it for steps still to come; that's a `Stepper`.
