# NumberInput

A number field: seats on a plan, rate limits, retention days, prices, quantities. `parseNumber()` reads text the same way.

**Elevation.** It's an opening, like `Input`: a well that shows its back wall while it's empty and whose floor rises flush once it holds a value. Invalid drops it to a trench on `critical-soft`. **The steppers are small raised slabs inside the well's end cap**, because you press them (push up, fill down). They're level 1 with a 1px wall, lift to 2 when pointed at, press flat, and lie flush in `ink-faint` at a limit. The unit ("days", "€", "%") sits beside the number in `ink-muted`. Editing isn't a change to the record, so nothing glows while you type or step.

**Parsing.** What you type is read in the locale's own way: in `de-DE`, "1.250,50" is 1250.5 and "1,5" is 1.5. Arabic-Indic, Persian, Devanagari, Bengali and full-width digits are read too. The value is committed on blur, on Enter and on every step, and it's clamped to `min` and `max` when committed, so it can't leave its range. Nonsense ("abc") keeps the last good value. Steps land on the grid that starts at `min` (or 0), without binary-fraction drift (0.1 + 0.2 is 0.3).

**Formats.** `format` takes `Intl.NumberFormat` options. `{ style: 'unit', unit: 'day' }` puts "days" beside the number. `{ style: 'currency', currency: 'EUR' }` puts the currency where the locale puts it. With `{ style: 'percent' }` the value is a fraction (0.1 is shown as "10 %").

**Accessibility.** The [spinbutton pattern](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/): `role="spinbutton"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and an `aria-valuetext` that includes the unit ("30 days"). Up and Down step, Shift+Up/Down and PageUp/PageDown move ten steps, and Home and End go to `min` and `max`. The steppers aren't tab stops (`tabIndex={-1}`, as the APG says), so name them for what they change (`incrementLabel="Increase seats"`). The scroll wheel never changes the value unless you set `wheel`, and then only while the field is focused. Under forced colours the steppers have a 1px border. Under `contrast="more"` their wall is `ink`.

**Props:** `value`, `defaultValue` (`number | null`), `onValueChange`; `min`, `max`, `step` (default 1); `format`; `locale`; `invalid`; `size`; `wheel`; `incrementLabel`, `decrementLabel`; and the input's own attributes.

**You provide:** the range, the step, the unit (in `format`) and a label (with `Field`).

```tsx
<Field label="Seats">
  <NumberInput value={seats} onValueChange={setSeats} min={1} max={500} incrementLabel="Increase seats" decrementLabel="Decrease seats" />
</Field>
<NumberInput value={days} onValueChange={setDays} format={{ style: 'unit', unit: 'day', unitDisplay: 'long' }} />
```

- Do give it `min` and `max` whenever the value has limits, and say them in the hint.
- Do put the unit in `format`, not in the label, so it's spoken with the value.
- Don't use it for identifiers that happen to be digits (a ZIP code, a card number); that's an `Input`.
- Don't use it to choose roughly within a range; that's a `Slider`.
