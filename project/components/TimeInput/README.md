# TimeInput

A time of day: when a scheduled report is sent, quiet hours, business hours, a maintenance window. It pairs with `DatePicker` when you need both.

**Elevation.** It's an opening, built like `DatePicker`'s typed field: the same segments in the same well. It follows the DatePicker rule for completeness: **it fills only when every segment holds a value**. A partial time ("09:––") is still a hole with its back wall showing, and the floor rises flush once the whole time is there. A time outside `min` and `max` (or `invalid`) drops it to a trench on `critical-soft`. A time zone's short name ("GMT+1") sits after the time in `ink-muted`.

**Typing.** Type digits and they move on by themselves once no further digit could fit ("9" in the hour moves to the minutes, while "1" waits for a second digit). Up and Down change a segment (minutes by `step`), Left and Right move between segments, Backspace clears, and ":" moves on. On a 12-hour clock, "a" or "p" sets AM or PM, and Up or Down flips it. The clock follows the locale unless `hourCycle` says otherwise.

**Value.** Always "HH:mm" on a 24-hour clock ("15:45"), whatever is shown, or null until the time is complete. `timeZone` only labels the time; it doesn't convert it.

**Accessibility.** Segmented [spinbuttons](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/) ("Hour", "Minute", "AM/PM", each with its value or "Empty") in a `role="group"`, as in `DatePicker`. The time zone describes each segment. Under forced colours it's dashed while empty or partial and solid when complete. Under `contrast="more"` it gets the well's hard inner edge.

**Props:** `value`, `defaultValue`, `onValueChange` (`"HH:mm" | null`); `step` (minutes, default 1); `hourCycle` (`'auto' | 'h12' | 'h23'`); `min`, `max` ("HH:mm"); `timeZone`; `locale`; `invalid`; `disabled`; `required`; `size`; `name` (submits the value with a form).

**You provide:** a label (with `Field`), the allowed range, and the time zone when people in several zones see it.

```tsx
<Field label="Send the report at">
  <TimeInput value="09:30" onValueChange={setTime} step={15} hourCycle="auto" timeZone="Europe/Berlin" />
</Field>
```

- Do show the time zone whenever the time isn't in the viewer's own.
- Do set `step` to the granularity you actually schedule at (15 minutes, not 1).
- Don't use `<input type="time">`; it looks different in every browser and ignores the scheme.
- Don't offer a long Select of times when people know the time they want.
