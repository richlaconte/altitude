# DatePicker

Choose a date in a field, by typing it or by picking it from a month calendar. `DateRangePicker` chooses a span of two dates; `Calendar` is the month grid laid on the page on its own.

```tsx
<Field label="Due date">
  <DatePicker value={due} onValueChange={setDue} min={today} isUnavailable={(d) => holidays.has(d)} />
</Field>

<Field label="Trip"><DateRangePicker value={{ start, end }} onValueChange={setTrip} /></Field>
<DateRangePicker value={range} onValueChange={setRange} presets={[datePresets.today(), datePresets.lastDays(7), datePresets.lastDays(30), datePresets.thisQuarter()]} defaultPreset="last-30-days" />

<Calendar value={day} onValueChange={setDay} aria-label="Delivery day" />
<Calendar value={day} onValueChange={setDay} aria-label="Time logged"
  markers={(d) => logged[d] && { tone: logged[d].approved ? 'positive' : 'caution', label: `${logged[d].hours} hours, ${logged[d].approved ? 'approved' : 'submitted'}` }} />
```

Values are ISO calendar dates, `'YYYY-MM-DD'` strings: no time, no time zone, serialisable, and comparable with `<`. That keeps the bundle free of a date library and avoids `Date`'s time-zone traps (midnight UTC is the previous evening in the Americas). Convert at your edges.

## Elevation

- **The field** is an opening built like `Select`: day, month and year are typed segments in the locale's order. A partial date isn't a value (as a Combobox query isn't), so the floor stays a well; it rises flush only once the field holds a whole, real, allowed date. An impossible or disallowed date drops the field to trench depth with a message (“Enter a real date.”, “Enter a date on or after 26 Oct 2026.”).
- **The calendar** floats at level 3 (`surface-floating`, `elev-3`) and grows from the field's edge, as a `Popover`.
- **Days** are flush (ground). At this density a trench per day would be noise, so the RadioGroup's rule is kept by its other half: the chosen day carries the one raised accent mark (`accent` with the sheen, `elev-1`), and choosing another day in the same month carries the mark there (`ease-settle`, `dur-travel-2`). Hovering a day shows a faint ghost of the mark: feedforward.
- **Today** has an `accent-ink` dot and says “today” in its name. **Unavailable** days are `ink-faint` and say “unavailable”.
- **A span** (DateRangePicker) is the Slider's build: a sunk `accent-soft` track across the days, between two raised ends. While the end is being chosen, the track previews from the start to the day under the pointer or focus.
- **Presets** (DateRangePicker `presets`) are a column of rows beside the calendar in the same level-3 panel (above it on narrow screens), built like `Select`'s options: one gliding `accent-soft` highlight, and the chosen row wears the tick at its end. A chosen preset fills the field with its name in `ink` and its dates in `ink-muted` (“Last 30 days · 28 Sept – 27 Oct”), settling with the same brief afterglow as a Select value.
- **A month change** is lateral, not a change of level, so the grid cross-fades (`dur-travel-1`).
- **`Calendar`** lies on the page at level 0, with no panel.
- **Markers** (`markers`, on all three): settled information about a day, so up to three 4px flush dots under its number (`count`), never raising it: `ink-muted` for `neutral`, or `positive`, `caution`, `critical`. On the chosen day they turn `on-accent`. A marked today drops its own dot and shows its number in `accent-ink` instead, so the two dots can't be confused. Status is never colour alone: a status tone requires a `label` (a type-level rule), and the label joins the day's name ("Tuesday 20 October 2026, 7 hours 30 minutes, approved"); days without a marker say nothing extra. Forced colours: dots are `CanvasText` (`HighlightText` on the chosen day) and the label carries the tone. Not for "can't be chosen": that's `isUnavailable`.

Without height: segments are spinbuttons with values; chosen days are `aria-selected` with “start date”/“end date” in a range; the field is `aria-invalid` with its message wired by `aria-describedby`, along with the format (“Format: DD/MM/YYYY”). Forced colours: an empty field is dashed, the panel has a 2px border, the chosen day is Highlight, the span is dashed and today is underlined. `contrast="more"`: the chosen mark gets a 2px ink slab.

## Keyboard

The APG date picker dialog, with React Aria's segmented field:

- **Field**: Tab moves between segments; digits fill a segment and move on once no further digit could fit; ↑/↓ step it; Backspace clears it; ←/→ move between segments (mirrored in RTL); a separator key (`/`, `.`, `-`) moves on. Alt+↓ opens the calendar. The calendar button is “Choose date”.
- **Grid**: ←/→ a day (mirrored in RTL), ↑/↓ a week, Home/End the week's start and end (by the locale's first day), PageUp/PageDown a month, Shift+PageUp/PageDown a year; Enter or Space chooses, closes and returns focus to the calendar button; Escape closes without a change. Only one day is in the Tab sequence. The month heading is a polite live region.
- **Presets**: opening the panel focuses the preset list, its own Tab stop before the calendar; ↑/↓ move between rows, Home/End jump, Enter or Space chooses and closes. In the field a chosen preset is one button named in full (“Last 30 days, 28 September 2026 to 27 October 2026”); typing a digit, Backspace or F2 on it turns it back into the date segments to type a custom range. Typing dates or picking days makes the range custom, and the preset is cleared.
- **Range**: the first choice is the start, the second the end (they swap if the end is earlier); the panel says which it's asking for. A span can't cross an unavailable day.

## Props

| Prop | |
|---|---|
| `value`, `defaultValue`, `onValueChange` | `ISODate \| null` (DatePicker), `{ start, end }` (DateRangePicker). `onValueChange` gets a complete, real, allowed date, or `null` when the field is cleared or holds one that isn't allowed |
| `min`, `max`, `isUnavailable` | limits for choosing and typing |
| `markers` | `(date) => CalendarMarker \| null`, or a map from `'YYYY-MM-DD'`: `{ tone?, label?, count? }`, with `label` required for `positive`, `caution` and `critical`. Passed through to the calendar |
| `locale`, `weekStartsOn` | segment order and names (default: the browser's); first day of the week, 0 Sunday … 6 Saturday (default: the locale's, from `Intl.Locale` week info) |
| `presets` | DateRangePicker: named spans offered beside the calendar. Build them with `datePresets` (`today()`, `yesterday()`, `lastDays(n)` with today included, `thisMonth()`, `lastMonth()`, `thisQuarter()`, `lastQuarter()`, `thisYear()`), or pass `{ key?, label, range }` where `range` is `{ start, end }` or a function of today. A preset whose span falls outside `min`/`max` is disabled |
| `preset`, `defaultPreset`, `onPresetChange` | the chosen preset's key (`null` when custom), controlled or not. Without a `defaultValue`, `defaultPreset` sets the starting range |
| `today` | an `ISODate`; relative presets resolve against it, and a chosen one re-resolves when it changes (“Last 7 days” moves with the date). Default: the local date |
| `id`, `name`, `disabled`, `required`, `invalid`, `size`, `defaultOpen` | as `Select`; `name` submits through a hidden input (`name-start` and `name-end` for a range) |
| `required`, `requiredMessage` | as `Select`: an empty value (either end of a range) fails native form validation, with or without a `name`. Invalid submission focuses the first empty segment, marks the field invalid and links a visible alert, “Enter a date.” (“Enter a start and end date.” for a range) unless `requiredMessage` says otherwise. A typed-date problem or a `Field` error takes precedence; a complete value clears it |

`Calendar`: `value`, `defaultValue`, `onValueChange`, `min`, `max`, `isUnavailable`, `locale`, `weekStartsOn`, `markers`, `aria-label`.

## You provide

The value and the rules (limits, unavailable days). Time of day isn't covered (that's a separate `DateTimePicker`).

## Do and don't

- **Do** let people type: a birthday or a date years away is faster typed than paged to.
- **Do** give a dashboard's range presets: hardly anyone wants to page a calendar for “the last 30 days”. Lead with the few your readers use.
- **Do** say why a day is unavailable in the field's hint when it isn't obvious.
- **Don't** convert to `Date` at midnight local time and back; keep ISO dates until you need a moment in time.

## Demo and verification

The `DatePicker` section of `build/previews.txt` shows a due date (from today, weekends unavailable, en-GB, open), a trip range, an en-US date, a reporting period with presets, and a `Calendar` of time logged in October 2026 with markers for approved, submitted, unsubmitted and missing days (27 October, the critical one, is left unchosen so its dot shows). `node checks/date-picker.mjs` (from `build/`; `ALT_FIXTURE_ROOT` selects React 19 fixtures) covers the APG grid keys, RTL arrows, unavailable days, Escape, focus return, segment typing and stepping, impossible dates, Alt+↓, the range flow with its preview, markers (labels in names, counts, every tone, a marked today, on-accent when chosen, flush), and 320/960px layouts in both schemes under reduced motion, forced colours and `contrast="more"`.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`DatePicker` as first used in its preview:

```tsx
import { DatePicker } from 'altitude-design';

<DatePicker value={due} onValueChange={setDue} min={DP_TODAY} isUnavailable={weekend} locale="en-GB" defaultOpen />
```

The full preview, as rendered in Storybook and checked in CI (`dp-demo`, `dp-wide`, `dp-cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Button, Calendar, DatePicker, DateRangePicker, Field, datePresets } from 'altitude-design';

const DP_TODAY = (() => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; })();
const dpShift = (iso, days) => { const [y, m, d] = iso.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + days)); return t.toISOString().slice(0, 10); };
// Time logged in October 2026: approved, submitted, logged but not submitted, and one day still missing hours.
const DP_LOGGED = {
  '2026-10-19': { tone: 'positive', label: '8 hours, approved' }, '2026-10-20': { tone: 'positive', label: '7 hours 30 minutes, approved' },
  '2026-10-21': { tone: 'positive', label: '8 hours, approved' }, '2026-10-22': { tone: 'caution', label: '6 hours, submitted' },
  '2026-10-23': { tone: 'caution', label: '8 hours, submitted' }, '2026-10-26': { label: '4 hours, not submitted', count: 2 },
  '2026-10-27': { tone: 'critical', label: 'no time logged' },
};
export default function App() {
  const [due, setDue] = React.useState(dpShift(DP_TODAY, 3));
  const [trip, setTrip] = React.useState({ start: dpShift(DP_TODAY, 9), end: dpShift(DP_TODAY, 13) });
  const [start, setStart] = React.useState(null);
  const [dpToday, setDpToday] = React.useState('2026-10-27');
  const [period, setPeriod] = React.useState({ start: '2026-09-28', end: '2026-10-27' });
  const [preset, setPreset] = React.useState('last-30-days');
  const [week, setWeek] = React.useState('2026-10-28');
  const weekend = iso => { const [y, m, d] = iso.split('-').map(Number); const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return w === 0 || w === 6; };
  return <div className="dp-demo">
    <Field label="Due date" hint="Weekends aren’t available.">
      <DatePicker value={due} onValueChange={setDue} min={DP_TODAY} isUnavailable={weekend} locale="en-GB" defaultOpen />
    </Field>
    <div>
      <Field label="Trip"><DateRangePicker value={trip} onValueChange={setTrip} min={DP_TODAY} locale="en-GB" /></Field>
      <div style={{ height: 24 }} />
      <Field label="Start date (US format)"><DatePicker value={start} onValueChange={setStart} locale="en-US" /></Field>
    </div>
    <div className="dp-wide">
      <Field label="Reporting period" hint={`Presets resolve against today (${dpToday}); they stay relative when it changes.`}>
        <DateRangePicker value={period} onValueChange={setPeriod} preset={preset} onPresetChange={setPreset} today={dpToday} locale="en-GB"
          presets={[datePresets.today(), datePresets.lastDays(7), datePresets.lastDays(30), datePresets.thisMonth(), datePresets.thisQuarter(), datePresets.lastQuarter(),
            { key: 'launch', label: 'Since launch', range: { start: '2026-03-04', end: dpToday } }]} />
      </Field>
      <div style={{ marginTop: 8 }}><Button size="sm" variant="ghost" onClick={() => setDpToday((t) => dpShift(t, 1))}>Next day</Button></div>
    </div>
    <div>
      <p className="dp-cap">Time logged: dots mark approved, submitted, unsubmitted and missing days</p>
      <Calendar aria-label="Time logged" value={week} onValueChange={setWeek} locale="en-GB" markers={DP_LOGGED} />
    </div>
  </div>;
}
```
<!-- /example -->
