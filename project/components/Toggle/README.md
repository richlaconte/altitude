# Toggle and ToggleGroup

Buttons that stay on: bold and italic in a formatting bar, a list/board/calendar view switch, "Show archived", thumbs up or down on an AI answer.

**Elevation: on is a choice, not a held press.** Pressing a button returns it to the ground, and loading holds it there, so an "on" button drawn at ground level would look like it's loading. A toggle that's on is a choice, so it's built like the Switch: its face is cut into a shallow well (`well`) with `accent-soft` poured in and its label in `accent-ink`. Off is the slab it started as: a ghost (ground) or `secondary` (level 1). Turning on sinks on `ease-sink`, and turning off rises on `ease-rise`. Pointing at an on toggle previews off (feedforward): the well lightens toward the raised face it would become. This is the one exception to "never style a button as sunk" (see [Elevation](../../Elevation.md), "Rules").

**ToggleGroup.**
- `type="single"` is one choice: segmented `Tabs` without panels, built with the same classes. The options sit in a well and one raised pill glides between them. It's a radio group, so arrow keys move and choose.
- `type="multiple"` is a row of Toggles, each with `aria-pressed`. Arrow keys move and Space toggles.

Either way the group is **one tab stop**, and returning to it lands on the item you left. Inside a `Toolbar`, a ToggleGroup leaves the arrow keys to the toolbar, so the whole bar is one tab stop.

**Accessibility.** A Toggle is a [toggle button](https://www.w3.org/WAI/ARIA/apg/patterns/button/): its state is `aria-pressed`, and **its name never changes with state** (no "Bold" → "Unbold"). Icon-only toggles need an `aria-label`. A single-choice group is a [radio group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) with `aria-checked`. Under forced colours an on toggle is a dashed border with a `Highlight` fill, and an off `secondary` toggle has a 1px border. Under `contrast="more"` the on well gets the well's hard inner edge. Under reduced motion nothing travels: the pill appears in place and the fill still changes.

**Props.** `Toggle`: `pressed`, `defaultPressed`, `onPressedChange`, `variant` (`'ghost' | 'secondary'`), and the `Button` props (`size`, `square`, `loading`, …). `ToggleGroup`: `type` (`'single' | 'multiple'`), `value`, `defaultValue`, `onValueChange`, `variant` and `size` (for `multiple`), `orientation`, `disabled`, `aria-label`. `ToggleGroupItem`: `value`.

**You provide:** a label that names the thing being toggled ("Bold", "Show archived"), not the action, and an `aria-label` on each group.

```tsx
<Toggle aria-label="Bold" pressed={bold} onPressedChange={setBold} square><BoldIcon /></Toggle>

<ToggleGroup type="single" value={view} onValueChange={setView} aria-label="View">
  <ToggleGroupItem value="list">List</ToggleGroupItem>
  <ToggleGroupItem value="board">Board</ToggleGroupItem>
</ToggleGroup>

<ToggleGroup type="multiple" value={marks} onValueChange={setMarks} aria-label="Text style" />
```

- Do use a Toggle for a tool or a view that stays on; use a `Switch` for a setting that's saved.
- Do use `type="single"` for mutually exclusive views; use `Tabs` when each option has its own panel.
- Don't change a toggle's label when it turns on.
- Don't use a Toggle for an action that happens once; that's a `Button`.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Toggle` as first used in its preview:

```tsx
import { Toggle } from 'altitude-design';

<Toggle variant="secondary" pressed={archived} onPressedChange={setArchived}>Show archived</Toggle>
```

The full preview, as rendered in Storybook and checked in CI (`tg`, `bar`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Toggle, ToggleGroup, ToggleGroupItem } from 'altitude-design';

const Thumb = ({ down }) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={down ? { transform: 'scaleY(-1)' } : undefined}><path d="M7 10v11H4V10zM7 10l4-7a2 2 0 0 1 3 2l-1 5h6a2 2 0 0 1 2 2.3l-1.5 7A2 2 0 0 1 17.5 21H7" /></svg>;
export default function App() {
  const [view, setView] = React.useState('board');
  const [marks, setMarks] = React.useState(['bold']);
  const [archived, setArchived] = React.useState(false);
  const [vote, setVote] = React.useState('');
  return (
    <div className="tg">
      <div className="bar">
        <ToggleGroup type="multiple" value={marks} onValueChange={setMarks} aria-label="Text style">
          <ToggleGroupItem value="bold" aria-label="Bold" square><b>B</b></ToggleGroupItem>
          <ToggleGroupItem value="italic" aria-label="Italic" square><i>I</i></ToggleGroupItem>
          <ToggleGroupItem value="underline" aria-label="Underline" square><u>U</u></ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup type="single" value={view} onValueChange={setView} aria-label="View">
          <ToggleGroupItem value="list">List</ToggleGroupItem>
          <ToggleGroupItem value="board">Board</ToggleGroupItem>
          <ToggleGroupItem value="calendar">Calendar</ToggleGroupItem>
        </ToggleGroup>
        <Toggle variant="secondary" pressed={archived} onPressedChange={setArchived}>Show archived</Toggle>
      </div>
      <div className="bar">
        <span className="cap">Was this answer helpful?</span>
        <ToggleGroup type="single" value={vote} onValueChange={setVote} aria-label="Rate this answer">
          <ToggleGroupItem value="up" aria-label="Helpful"><Thumb /></ToggleGroupItem>
          <ToggleGroupItem value="down" aria-label="Not helpful"><Thumb down /></ToggleGroupItem>
        </ToggleGroup>
      </div>
      <p className="cap">On is a choice, built like the Switch: the face sinks into a well with the accent poured in. Pointing at an on toggle previews off. One choice (View) is segmented Tabs without panels. Each group is one tab stop; arrows move inside it.</p>
    </div>
  );
}
```
<!-- /example -->
