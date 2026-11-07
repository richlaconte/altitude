# Schedule

A day or week of time whose events you handle directly: drag across empty time to create one, carry an event to move it, pull its bottom edge to change its length, rename it in place. Room bookings, shift rosters, content calendars. Every one of those has a keyboard path, so nothing needs a pointer (WCAG 2.2 SC 2.5.7, Dragging Movements).

```tsx
<Schedule<Booking>
  aria-label="Room bookings"
  view="week"                         // 'day' | 'week' | 'workweek'
  date={weekOf} onDateChange={setWeekOf}
  events={bookings}
  getKey={(b) => b.id} getLabel={(b) => b.title}
  getStart={(b) => b.start} getEnd={(b) => b.end}   // 'YYYY-MM-DDTHH:mm'
  step={15} dayStart="08:00" dayEnd="19:00"
  onCreate={async ({ start, end, title }) => { const r = await api.book({ start, end, title }); if (r.ok) setBookings(r.all); return r.ok ? { ok: true, value: r.booking } : r; }}
  onChange={async ({ id, start, end }, previous) => { const r = await api.reschedule(id, start, end, previous.revision); if (r.ok) setBookings(r.all); return r; }}
  onRename={…} onOpen={(b) => setSheetFor(b)} onRemove={…}
  heldBy={(b) => presence[b.id]}
  isLocked={(b) => b.approved} lockedLabel={() => 'Approved'}
  getCategory={(b) => b.roomId} categories={[{ id: 'a', label: 'Room A', color: 'data-1' }, { id: 'b', label: 'Room B', color: 'data-2' }]}
  isUnavailable={({ start, end }) => outsideOpeningHours(start, end)}
  renderDayHeader={(day, events) => <>{hoursOf(events)}{approved[day] && <Badge tone="positive">Approved</Badge>}</>}
  dayActions={(day) => submitted[day] ? [{ label: 'Approve time', icon: <Icons.Check />, onSelect: () => approve(day) }] : []}
  footer={(days, events) => <>Week total: {hoursOf(events)}</>}
/>
```

Times are local date-times, `'YYYY-MM-DDTHH:mm'` strings with no zone, matching `DatePicker`'s ISO dates. Convert to and from your zone at your edges (DST included). Writes follow the `InlineEdit` contract: resolve `{ ok: true }` (for a create, `{ ok: true, value }`) after `events` reflects the change, or `{ ok: false, error }`. One write runs at a time.

## Elevation

- **The grid** is ground, with `line` rules on the hour and hour labels.
- **Events** are live work items, raised one level like `BoardCard`s (`surface-raised`, `elev-1`, an accent edge on the left), lifting to `elev-2` on hover. Overlapping events share the day side by side, and their names say so.
- **Carrying** (Space, or a pointer drag): the event floats at level 3, tilted; the days open into wells, as Board columns do, and the slot under the event deepens to a trench with an accent rim, as long as the event (a critical rim where it can't go).
- **Drawing** a new event across empty time makes a well the length of the drag; releasing raises it into an event with a title field.
- **Pending** writes hover at level 2 after `dur-grace`. A moved or resized event stays where it was dropped while its write runs, and until `events` has the new times; a **failed** one drops to a trench, the event goes back to its old place, and a bar offers Retry.
- **Held by a collaborator** (`heldBy`): the event wears their `presence-*` outline and name and can't be picked up.
- **Locked** (`isLocked`): a settled event, part of the record, lies flush on the ground (`surface-ground`, no shadow, a 1px `line-control` edge in place of the accent) with a lock and its word (`lockedLabel`, default "Locked"), as `TimeSlotPicker`'s booked time says "Booked". Space, Shift+↑/↓, F2, Delete, a drag and the resize handle do nothing, and the assertive region says why ("Board report is approved and can't be changed"); Enter, double-click and a tap still call `onOpen`. It doesn't block a drop: that's `isUnavailable`. An event that becomes locked on screen settles 1→0 once (`dur-travel-1`, `ease-settle`). Not `heldBy`: nobody is holding it, and `presence-*` is for people.
- **Categories** (`getCategory`, `categories`): the category's colour replaces the accent in the 3px inset edge, in every state (rest, hover, carried, pending, `contrast="more"`). The face stays `surface-raised`: it's an edge, never a fill, so pending and failed still read. Colours come from `data-1`–`data-6` (a schedule coloured by project is a chart of a week, one job per colour: telling categories apart). Fixed ones are kept; the rest are given out in first-seen order; past six distinct colours a category keeps the accent and the legend says so. Colour never travels alone: each event's name carries its category's label, and a flush legend under the grid (`legend`, on by default when `categories` is given) names every colour.
- **Day headers** (`renderDayHeader`, `dayActions`): whatever you render sits under the day's name inside its `columnheader`, so it follows the column in every view and width (in the narrow one-day view it's that day's header). It stays ground: a total is words, status is a `Badge` with its word and lamp. Don't tint the column for status; that would read as an opening. Only a day's action rises, as any `Button`: one action is an icon button named "Approve time, Tuesday 4 November"; several are a More button opening a `DropdownMenu`; an empty array renders nothing. When a header grows, every day's header grows alike, so the hours still line up.
- **The footer** (`footer`) is a flush `ink-muted` line under the grid for the period, such as its total.
- **The now line** is `accent-ink`, not `critical`: it isn't status.
- **A new week** cross-fades; it isn't a change of level.

Without height: every event is a button named with its title, category, day, start and end, its overlaps, who holds it, and whether it's locked ("…, approved, can't be changed"; not `aria-disabled`, since it still opens); carrying is `aria-pressed`, and each step is announced in an assertive region (“Wednesday 28 October, 15:15 to 16:15”); writes and errors are announced politely. Forced colours: events 1px (locked ones solid 1px: they aren't openings), carried 2px, slots and drawn spans thick dashed, pending dotted, failed thick dashed, the now line Highlight. `contrast="more"`: events get the level-1 slab, the carried event a 3px slab; a locked event gets none, since it isn't raised.

## Keyboard

The grid (`role="grid"`) is one Tab stop: rows are time slots, columns are days. Day actions (`dayActions`) are buttons outside its roving focus: Tab reaches them before the grid, in day order, and the grid's keys don't act on them. A day header's text describes its column (`aria-describedby`), so moving between cells stays short; the footer describes the grid.

| Where | Key | |
|---|---|---|
| Grid | ↑ / ↓, ← / → | a slot, a day (mirrored in RTL); an event starting there takes focus |
| | Home / End, PageUp / PageDown | the day's first and last slot; the previous and next week (or day) |
| | Enter | a new event here, `defaultDuration` long: type a title, Enter adds it, Escape discards it; leaving the field adds it too, or discards it if the title is empty |
| Event | Enter | `onOpen` |
| | F2 | rename in place |
| | Space | pick up: ↑/↓ move by `step`, ←/→ by a day, Shift+↑/↓ change the end; Space or Enter drop; Escape cancel |
| | Shift+↑ / Shift+↓ | change the end by a step without picking up |
| | Delete | `onRemove` |

## Props

| Prop | |
|---|---|
| `view`, `date`, `onDateChange`, `weekStartsOn` | what's shown; `onDateChange` adds Previous, Today and Next |
| `events`, `getKey`, `getStart`, `getEnd`, `getLabel`, `renderEvent` | the events |
| `step`, `dayStart`, `dayEnd`, `hourHeight`, `defaultDuration` | 15 minutes, '08:00', '19:00', 48px, 60 minutes |
| `onCreate`, `onChange`, `onRename`, `onOpen`, `onRemove` | the writes and actions |
| `heldBy`, `isUnavailable`, `now`, `locale`, `aria-label` | collaborators' holds, refused spans, the now line's time |
| `renderDayHeader`, `dayActions`, `footer` | a day's total and status under its name, its actions (`MenuEntry[]`), and the period's line under the grid |
| `getCategory`, `categories`, `legend` | an edge colour per category, from `data-1`–`data-6`, and the legend that names them |
| `isLocked`, `lockedLabel` | settled events that can't be changed, and the word they say (default "Locked") |

## You provide

The events and their writes (with concurrency guards), time zones, and the details view (`onOpen`, in a `Sheet`). Month view and all-day events aren't covered.

## Do and don't

- **Do** show details beside the schedule (a `Sheet`), so the week stays in view.
- **Do** refuse impossible spans with `isUnavailable`, so people see a critical rim before they drop.
- **Don't** use it for a list of dated items with no durations; that's a table.

## Demo and verification

The `Schedule` section of `build/previews.txt` is a room-booking work week (26–30 Oct 2026): the service refuses Wednesday mornings, rooms close at 17:00 on Friday, and Ana holds the Retro, Monday's Board report is approved (locked), each room has its own edge colour, named in the legend, and each day's header shows its booked hours with Confirm rooms (a More menu on a day with overlaps), over the week's total. `node checks/schedule.mjs` (from `build/`; `ALT_FIXTURE_ROOT` selects React 19 fixtures) covers the grid keys and names, creating, carrying, resizing and cancelling without a pointer, a refused move with Retry, unavailable time, a collaborator's hold, a locked event refusing every change but still opening, day headers' descriptions, a day action and a More menu kept out of the grid's keys, the footer, rename, remove, the next week, pointer carry, drawing and the resize handle, and 320/960px layouts in both schemes under reduced motion, forced colours and `contrast="more"`.
**Narrow and on touch.** Under 480px of its own width the schedule shows one day at a time (`narrowView="day"`, the default; `false` keeps the week), paged by the header's previous and next. Under a coarse pointer an hour is 96px unless you set `hourHeight`, so a 15-minute slot is 24px tall, and a tap opens an event.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Schedule` as first used in its preview:

```tsx
import { Badge, Icons, Schedule } from 'altitude-design';

<Schedule aria-label="Room bookings" view="workweek" date={date} onDateChange={setDate} now="2026-10-27T10:20"
  events={events} getKey={e => e.id} getStart={e => e.start} getEnd={e => e.end} getLabel={e => e.title}
  dayStart="08:00" dayEnd="18:00"
  renderEvent={e => <><strong>{e.title}</strong><small className="sch-room">{e.start.slice(11)}–{e.end.slice(11)} · {e.room}</small></>}
  heldBy={e => e.id === 'e6' ? { name: 'Ana', presence: 2 } : null}
  // Approved bookings are part of the record: they lie flush and can't be changed.
  isLocked={e => !!e.approved} lockedLabel={() => 'Approved'}
  // Each room's edge colour; the legend under the grid names them.
  getCategory={e => e.room} categories={[{ id: 'Room A', label: 'Room A', color: 'data-1' }, { id: 'Room B', label: 'Room B', color: 'data-2' }]}
  // Each day's booked hours under its name, and the week's total under the grid.
  renderDayHeader={(day, list) => list.length ? <>{schHours(list)}{confirmed[day] && <Badge tone="positive">Confirmed</Badge>}</> : null}
  // One action is an icon button; several (a day with overlaps) open a menu.
  dayActions={(day, list) => !list.length ? [] : [{ label: 'Confirm rooms', icon: <Icons.Check size={14} />, onSelect: () => setConfirmed(c => ({ ...c, [day]: true })) },
    ...(list.length > 1 ? [{ label: 'Clear confirmation', onSelect: () => setConfirmed(c => ({ ...c, [day]: false })) }] : [])]}
  footer={(days, list) => <>Booked this week: {schHours(list)}</>}
  // Rooms close at 17:00 on Fridays.
  isUnavailable={({ start, end }) => start.slice(0, 10) === '2026-10-30' && end.slice(11) > '17:00'}
  onChange={async ({ id, start, end }) => {
    await schWait(300);
    // The demo service refuses Wednesday mornings: the rooms are being cleaned.
    if (start.slice(0, 10) === '2026-10-28' && start.slice(11) < '12:00') return { ok: false, error: 'Both rooms are being cleaned on Wednesday morning.' };
    setEvents(list => list.map(e => e.id === id ? { ...e, start, end } : e)); return { ok: true };
  }}
  onCreate={async ({ start, end, title }) => { await schWait(300); const event = { id: 'n' + ++seq.current, title, start, end, room: 'Room A' }; setEvents(list => [...list, event]); return { ok: true, value: event }; }}
  onRename={async (e, title) => { await schWait(200); setEvents(list => list.map(x => x.id === e.id ? { ...x, title } : x)); return { ok: true }; }}
  onRemove={e => setEvents(list => list.filter(x => x.id !== e.id))} />
```

The full preview, as rendered in Storybook and checked in CI (`sch-demo`, `sch-room` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Badge, Icons, Schedule } from 'altitude-design';

const SCH_SEED = [
  { id: 'e1', title: 'Standup', start: '2026-10-26T09:00', end: '2026-10-26T09:30', room: 'Room A' },
  { id: 'e2', title: 'Design review', start: '2026-10-27T10:00', end: '2026-10-27T11:00', room: 'Room B' },
  { id: 'e3', title: 'Customer call', start: '2026-10-27T10:30', end: '2026-10-27T11:15', room: 'Room A' },
  { id: 'e4', title: 'Planning', start: '2026-10-28T13:00', end: '2026-10-28T14:30', room: 'Room B' },
  { id: 'e5', title: 'Interview', start: '2026-10-29T15:00', end: '2026-10-29T16:00', room: 'Room A' },
  { id: 'e6', title: 'Retro', start: '2026-10-30T11:00', end: '2026-10-30T12:00', room: 'Room B' },
  { id: 'e7', title: 'Board report', start: '2026-10-26T14:00', end: '2026-10-26T15:00', room: 'Room B', approved: true },
];
const schWait = ms => new Promise(resolve => setTimeout(resolve, ms));
const schMinutes = t => Number(t.slice(11, 13)) * 60 + Number(t.slice(14, 16));
const schHours = list => { const m = list.reduce((sum, e) => sum + schMinutes(e.end) - schMinutes(e.start), 0); return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`; };
export default function App() {
  const [date, setDate] = React.useState('2026-10-26');
  const [events, setEvents] = React.useState(SCH_SEED);
  const seq = React.useRef(0);
  const [confirmed, setConfirmed] = React.useState({});
  return <div className="sch-demo">
    <Schedule aria-label="Room bookings" view="workweek" date={date} onDateChange={setDate} now="2026-10-27T10:20"
      events={events} getKey={e => e.id} getStart={e => e.start} getEnd={e => e.end} getLabel={e => e.title}
      dayStart="08:00" dayEnd="18:00"
      renderEvent={e => <><strong>{e.title}</strong><small className="sch-room">{e.start.slice(11)}–{e.end.slice(11)} · {e.room}</small></>}
      heldBy={e => e.id === 'e6' ? { name: 'Ana', presence: 2 } : null}
      // Approved bookings are part of the record: they lie flush and can't be changed.
      isLocked={e => !!e.approved} lockedLabel={() => 'Approved'}
      // Each room's edge colour; the legend under the grid names them.
      getCategory={e => e.room} categories={[{ id: 'Room A', label: 'Room A', color: 'data-1' }, { id: 'Room B', label: 'Room B', color: 'data-2' }]}
      // Each day's booked hours under its name, and the week's total under the grid.
      renderDayHeader={(day, list) => list.length ? <>{schHours(list)}{confirmed[day] && <Badge tone="positive">Confirmed</Badge>}</> : null}
      // One action is an icon button; several (a day with overlaps) open a menu.
      dayActions={(day, list) => !list.length ? [] : [{ label: 'Confirm rooms', icon: <Icons.Check size={14} />, onSelect: () => setConfirmed(c => ({ ...c, [day]: true })) },
        ...(list.length > 1 ? [{ label: 'Clear confirmation', onSelect: () => setConfirmed(c => ({ ...c, [day]: false })) }] : [])]}
      footer={(days, list) => <>Booked this week: {schHours(list)}</>}
      // Rooms close at 17:00 on Fridays.
      isUnavailable={({ start, end }) => start.slice(0, 10) === '2026-10-30' && end.slice(11) > '17:00'}
      onChange={async ({ id, start, end }) => {
        await schWait(300);
        // The demo service refuses Wednesday mornings: the rooms are being cleaned.
        if (start.slice(0, 10) === '2026-10-28' && start.slice(11) < '12:00') return { ok: false, error: 'Both rooms are being cleaned on Wednesday morning.' };
        setEvents(list => list.map(e => e.id === id ? { ...e, start, end } : e)); return { ok: true };
      }}
      onCreate={async ({ start, end, title }) => { await schWait(300); const event = { id: 'n' + ++seq.current, title, start, end, room: 'Room A' }; setEvents(list => [...list, event]); return { ok: true, value: event }; }}
      onRename={async (e, title) => { await schWait(200); setEvents(list => list.map(x => x.id === e.id ? { ...x, title } : x)); return { ok: true }; }}
      onRemove={e => setEvents(list => list.filter(x => x.id !== e.id))} />
  </div>;
}
```
<!-- /example -->
