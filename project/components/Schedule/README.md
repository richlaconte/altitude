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
  isUnavailable={({ start, end }) => outsideOpeningHours(start, end)}
/>
```

Times are local date-times, `'YYYY-MM-DDTHH:mm'` strings with no zone, matching `DatePicker`'s ISO dates. Convert to and from your zone at your edges (DST included). Writes follow the `InlineEdit` contract: resolve `{ ok: true }` (for a create, `{ ok: true, value }`) after `events` reflects the change, or `{ ok: false, error }`. One write runs at a time.

## Elevation

- **The grid** is ground, with `line` rules on the hour and hour labels.
- **Events** are live work items, raised one level like `BoardCard`s (`surface-raised`, `elev-1`, an accent edge on the left), lifting to `elev-2` on hover. Overlapping events share the day side by side, and their names say so.
- **Carrying** (Space, or a pointer drag): the event floats at level 3, tilted; the days open into wells, as Board columns do, and the slot under the event deepens to a trench with an accent rim, as long as the event (a critical rim where it can't go).
- **Drawing** a new event across empty time makes a well the length of the drag; releasing raises it into an event with a title field.
- **Pending** writes hover at level 2 after `dur-grace`; a **failed** one drops to a trench, the event goes back to its old place, and a bar offers Retry.
- **Held by a collaborator** (`heldBy`): the event wears their `presence-*` outline and name and can't be picked up.
- **The now line** is `accent-ink`, not `critical`: it isn't status.
- **A new week** cross-fades; it isn't a change of level.

Without height: every event is a button named with its title, day, start and end, its overlaps and who holds it; carrying is `aria-pressed`, and each step is announced in an assertive region (“Wednesday 28 October, 15:15 to 16:15”); writes and errors are announced politely. Forced colours: events 1px, carried 2px, slots and drawn spans thick dashed, pending dotted, failed thick dashed, the now line Highlight. `contrast="more"`: events get the level-1 slab, the carried event a 3px slab.

## Keyboard

The grid (`role="grid"`) is one Tab stop: rows are time slots, columns are days.

| Where | Key | |
|---|---|---|
| Grid | ↑ / ↓, ← / → | a slot, a day (mirrored in RTL); an event starting there takes focus |
| | Home / End, PageUp / PageDown | the day's first and last slot; the previous and next week (or day) |
| | Enter | a new event here, `defaultDuration` long: type a title, Enter adds it, Escape discards it |
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

## You provide

The events and their writes (with concurrency guards), time zones, and the details view (`onOpen`, in a `Sheet`). Month view and all-day events aren't covered.

## Do and don't

- **Do** show details beside the schedule (a `Sheet`), so the week stays in view.
- **Do** refuse impossible spans with `isUnavailable`, so people see a critical rim before they drop.
- **Don't** use it for a list of dated items with no durations; that's a table.

## Demo and verification

The `Schedule` section of `build/previews.txt` is a room-booking work week (26–30 Oct 2026): the service refuses Wednesday mornings, rooms close at 17:00 on Friday, and Ana holds the Retro. `node checks/schedule.mjs` (from `build/`; `ALT_FIXTURE_ROOT` selects React 19 fixtures) covers the grid keys and names, creating, carrying, resizing and cancelling without a pointer, a refused move with Retry, unavailable time, a collaborator's hold, rename, remove, the next week, pointer carry, drawing and the resize handle, and 320/960px layouts in both schemes under reduced motion, forced colours and `contrast="more"`.
