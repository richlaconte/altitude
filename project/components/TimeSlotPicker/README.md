# TimeSlotPicker

One open time from a day's slots: an appointment, a call, a table booking. The person sees which times are free and which are taken, and picks one, often with a thumb.

Use `RadioGroup` for a short row of options that aren't times, `TimeInput` to type a time with no availability behind it, `Calendar` or `DatePicker` for the day before this, and `Schedule` to create and move events on a day.

**Elevation: openings, one filled.**
- **A free time** is an opening you can put the booking in: a well (Sunk −1, `surface-well` / `well`) holding the time as text, with a `line` rim that becomes `line-control` under the pointer.
- **The chosen time** is filled: the accent pours in from the middle (`dur-travel-1`, `ease-rise`) and a raised check (`surface-raised`, `elev-1`) sits under the time, as a Checkbox's check does. Every slot has room for that second line (or "Booked"), so choosing moves nothing. The previous time drains on `ease-sink`. The mark doesn't slide between slots the way RadioGroup's thumb does, because slots wrap across rows and a diagonal glide reads badly.
- **A booked time** is part of the record, so it lies flush on the ground (`surface-ground`, `elev-0`), in `ink-muted`, struck through, with the word "Booked". It's never a disabled well.
- **Invalid** (Field's error): the free wells take the `critical-soft` tint and a `critical` rim at trench depth; booked and chosen slots keep their reading (Elevation, "Validity").
- **Loading** (`loading`): imprints at slot size (`Skeleton`), and `aria-busy` on the group.

**Accessibility.** The [radio group pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/), laid out as a grid with one tab stop. Tab comes to the chosen time, or the first free one. ← and → move between free times in reading order (mirrored in right-to-left), ↑ and ↓ to the free time in the row above or below nearest the same column, Home and End to the first and last. Space chooses, and so does a click or tap. Enter does what it does on a native radio: submits the form the picker is in (a booking step's Continue); outside a form it chooses. Arrows only move, so choosing is a deliberate act: an app that holds a slot as soon as it's chosen doesn't hold every time the person passes over. Booked times are skipped by the arrows; they're still in the reading order, named "11:30 AM, Booked" and `aria-disabled`. Each slot is a `role="radio"` button with `aria-checked`, so it's read as "9:30 AM, radio button, not checked, 2 of 15". Inside a `Field` the group is labelled by the field's label ("Times on Tuesday 10 November") and described by its error; focusing the group (an `ErrorSummary` link) moves on to its tab stop. Every slot is at least 56px tall, past the 44px touch target. Forced colours: free slots dashed, the chosen one a 2px `Highlight` border with its check outlined, booked ones in `GrayText`. `contrast="more"`: every free slot has a `line-control` rim. Under reduced motion the fill and the check appear at once.

**Labels.** A slot's `value` is "HH:MM" on a 24-hour clock. It's formatted for `locale` with `Intl.DateTimeFormat` ("9:30 AM" in `en-US`, "09:30" in `en-GB`), so the same data reads right in every locale. Pass `label` to show something else.

**Parts:** `TimeSlotPicker` (`value`, `defaultValue`, `onValueChange`, `locale`, `invalid`, `required`, `disabled`, `loading`, `loadingCount`, `id`, `aria-label` or `aria-labelledby` when not in a `Field`) and `TimeSlot` (`value`, `booked`, `label`).

**You provide:** the day's slots in time order and which are taken, from your availability service; the hold or booking when a time is chosen; and what to say when every time is booked (an `EmptyState` or a sentence, instead of a picker with nothing to choose). To hide booked times rather than show them, leave them out of the children.

- Do put it in a `Field` labelled with the day ("Times on Tuesday 10 November").
- Do refuse a time that went while the person looked when you try to hold it, and say so; the picker only shows what you last knew.
- Don't use it for durations, ranges of slots, or more than a day's times; that's `Schedule`.
- Don't group slots under Morning and Afternoon headings yet: one grid keeps the arrow keys predictable.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`TimeSlotPicker` as first used in its preview:

```tsx
import { TimeSlot, TimeSlotPicker } from 'altitude-design';

<TimeSlotPicker value={time} onValueChange={(t) => { setTime(t); setError(''); }} locale="en-US" loading={loading}>
  {TSP_SLOTS.map((s) => <TimeSlot key={s.time} value={s.time} booked={s.booked} />)}
</TimeSlotPicker>
```

The full preview, as rendered in Storybook and checked in CI (`col`, `tsp`, `tsp-actions`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Button, Field, TimeSlot, TimeSlotPicker } from 'altitude-design';

// Booked times, from the fictional diary.
const TSP_TAKEN = ['09:00', '10:30', '13:30', '14:00', '16:00'];
const TSP_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00']
  .map((time) => ({ time, booked: TSP_TAKEN.includes(time) }));
export default function App() {
  const [time, setTime] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [booked, setBooked] = React.useState('');
  const reload = () => { setLoading(true); setTimeout(() => setLoading(false), 900); };
  return (
    <div className="col tsp">
      <Field label="Times on Tuesday 10 November" error={error}>
        <TimeSlotPicker value={time} onValueChange={(t) => { setTime(t); setError(''); }} locale="en-US" loading={loading}>
          {TSP_SLOTS.map((s) => <TimeSlot key={s.time} value={s.time} booked={s.booked} />)}
        </TimeSlotPicker>
      </Field>
      <div className="tsp-actions">
        <Button variant="primary" onClick={() => { if (!time) { setError('Choose a time.'); return; } setBooked(time); }}>Hold this time</Button>
        <Button variant="ghost" onClick={reload}>Reload the day</Button>
      </div>
      <p className="cap">{booked ? `Holding ${booked}. ` : ''}Tab to the times, then arrows move between free ones (↑ and ↓ by row) and Space or Enter chooses. Booked times are struck through and skipped. Hold without choosing to see the error.</p>
    </div>
  );
}
```
<!-- /example -->
