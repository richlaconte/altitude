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

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Timeline` as first used in its preview:

```tsx
import { Timeline, TimelineItem } from 'altitude-design';

<Timeline aria-label="Activity">
  {events.map((e) => <TimelineItem key={e.id} time={e.at} icon={<I d={icons[e.icon]} />} status={e.status} href={e.href} detail={e.detail}
    onRetry={() => setEvents((xs) => xs.map((x) => (x.id === e.id ? { ...x, status: 'committed' } : x)))}>{e.text}</TimelineItem>)}
</Timeline>
```

The full preview, as rendered in Storybook and checked in CI (`tl`, `col`, `row`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Badge, Button, Input, Timeline, TimelineItem } from 'altitude-design';

// Anchored to the calendar day, so "Today" and "Yesterday" hold at any hour (just after midnight too).
const ago = (m) => { const start = new Date(); start.setHours(0, 0, 0, 0); return new Date(Math.max(Date.now() - m * 60000, start.getTime() + 1000)); };
const yesterdayAt = (h) => { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(h, 0, 0, 0); return d; };
const I = ({ d }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
const icons = { status: 'M5 12.5l4.5 4.5L19 7.5', comment: 'M4 5h16v11H8l-4 4z', assign: 'M16 19v-1a4 4 0 0 0-8 0v1M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6' };
export default function App() {
  const [events, setEvents] = React.useState([
    { id: 'e3', at: ago(14), icon: 'status', text: <><strong>Maya</strong> changed status to <Badge tone="positive">Done</Badge></> },
    { id: 'e2', at: ago(95), icon: 'assign', text: <><strong>Theo</strong> assigned this to <strong>Maya</strong></>, href: '#/people/maya' },
    { id: 'e1', at: yesterdayAt(12), icon: 'comment', text: <><strong>Ada</strong> commented</>, detail: <p style={{ margin: 0 }}>“Can we ship this before the release freeze on Friday?”</p> },
  ]);
  const [text, setText] = React.useState('');
  const send = (fail) => {
    const id = 'n' + Date.now();
    setEvents((xs) => [{ id, at: new Date(), icon: 'comment', status: 'pending', text: <><strong>You</strong> commented “{text || 'Looks good'}”</> }, ...xs]);
    setText('');
    setTimeout(() => setEvents((xs) => xs.map((x) => (x.id === id ? { ...x, status: fail ? 'failed' : 'committed' } : x))), 1200);
  };
  return (
    <div className="tl">
      <Timeline aria-label="Activity">
        {events.map((e) => <TimelineItem key={e.id} time={e.at} icon={<I d={icons[e.icon]} />} status={e.status} href={e.href} detail={e.detail}
          onRetry={() => setEvents((xs) => xs.map((x) => (x.id === e.id ? { ...x, status: 'committed' } : x)))}>{e.text}</TimelineItem>)}
      </Timeline>
      <div className="col">
        <Input value={text} onChange={(ev) => setText(ev.target.value)} placeholder="Add a comment" aria-label="Comment" />
        <div className="row"><Button variant="primary" onClick={() => send(false)}>Comment</Button><Button onClick={() => send(true)}>Comment (fails)</Button></div>
        <p className="cap">Your comment hovers until it lands, then settles into the record; one that fails drops to a trench with Retry.</p>
      </div>
    </div>
  );
}
```
<!-- /example -->
