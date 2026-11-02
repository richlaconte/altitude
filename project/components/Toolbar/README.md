# Toolbar

A row of small actions with one tab stop: a formatting bar, a table's tools, a comment composer, a canvas's tools.

**Elevation.** The bar is settled: it lies on the ground, with a `line` rim when `bordered`. Its tools are live: ghost buttons that lift one level when pointed at and press to the ground. Latched tools (bold, a quote block) are `Toggle`s, so on is a well with the accent poured in. Groups are parted by decorative `Separator`s.

**One tab stop.** Tab reaches the bar once, Left and Right (Up and Down when vertical) move between tools, Home and End jump, and returning to the bar lands on the tool you left. A `ToggleGroup` inside a Toolbar leaves the arrow keys to the bar, so a 12-tool bar costs one Tab, not twelve.

**Overflow.** `overflow="wrap"` (default) wraps tools onto another row. `overflow="menu"` hides the tools that don't fit, from the end, and offers them in a "More tools" menu (`DropdownMenu`, level 3). There, toggles keep their state as checkable items (`menuitemcheckbox`). A separator never ends the visible row. Tools moving into the menu don't animate.

**Accessibility.** The [toolbar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/): `role="toolbar"` with an `aria-label` (required) and `aria-orientation`. Icon-only tools need an `aria-label`: a development warning names any tool without one. Under forced colours a hovered or focused tool gets a 1px border and a latched one is dashed (the Toggle's fallback).

**Parts.**
- `Toolbar`: `aria-label`, `orientation` (`'horizontal' | 'vertical'`), `overflow` (`'wrap' | 'menu'`), `bordered`.
- `ToolbarGroup`: tools that belong together (`role="group"`; give it an `aria-label` if the group has a name).
- `ToolbarSeparator`: a decorative line between groups.
- `ToolbarButton`: a ghost `Button`.
- `ToolbarToggle`: a ghost `Toggle`.
- A `ToggleGroup` works inside it as it is.

**You provide:** a label for the bar and for every icon-only tool, and the actions.

```tsx
<Toolbar aria-label="Formatting" overflow="menu">
  <ToolbarGroup>
    <ToolbarToggle aria-label="Bold" pressed={b} onPressedChange={setB} square><Bold /></ToolbarToggle>
    <ToolbarToggle aria-label="Italic" pressed={i} onPressedChange={setI} square><Italic /></ToolbarToggle>
  </ToolbarGroup>
  <ToolbarSeparator />
  <ToolbarButton aria-label="Insert link" onClick={link} square><Link2 /></ToolbarButton>
</Toolbar>
```

- Do put the tools used most first: overflow takes them from the end.
- Do use a Toolbar for a set of small, related tools; a page's main actions are separate `Button`s.
- Don't put text fields inside a Toolbar: arrow keys would stop moving the caret.
- Don't give tools a raised (`secondary` or `primary`) variant; in a toolbar they're ghosts.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Toolbar` as first used in its preview:

```tsx
import { ToggleGroup, ToggleGroupItem, Toolbar, ToolbarButton, ToolbarGroup, ToolbarSeparator, ToolbarToggle } from 'altitude-design';

<Toolbar aria-label="Formatting" overflow="menu" bordered className={className}>
  <ToggleGroup type="multiple" value={marks} onValueChange={setMarks} aria-label="Text style">
    <ToggleGroupItem value="bold" aria-label="Bold" square><b>B</b></ToggleGroupItem>
    <ToggleGroupItem value="italic" aria-label="Italic" square><i>I</i></ToggleGroupItem>
    <ToggleGroupItem value="underline" aria-label="Underline" square><u>U</u></ToggleGroupItem>
  </ToggleGroup>
  <ToolbarSeparator />
  <ToolbarGroup aria-label="Blocks">
    <ToolbarButton aria-label="Bulleted list" square><I d={list} /></ToolbarButton>
    <ToolbarToggle aria-label="Quote" square pressed={quoted} onPressedChange={setQuoted}><I d={quote} /></ToolbarToggle>
    <ToolbarButton aria-label="Code" square><I d={code} /></ToolbarButton>
  </ToolbarGroup>
  <ToolbarSeparator />
  <ToolbarButton aria-label="Insert link" square><I d={link} /></ToolbarButton>
</Toolbar>
```

The full preview, as rendered in Storybook and checked in CI (`tb`, `narrow`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { ToggleGroup, ToggleGroupItem, Toolbar, ToolbarButton, ToolbarGroup, ToolbarSeparator, ToolbarToggle } from 'altitude-design';

const I = ({ d }) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const link = 'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1';
const list = 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01';
const quote = 'M7 7h4v6H5V9zM15 7h4v6h-6V9zM9 13l-2 4M17 13l-2 4';
const code = 'M8 8l-4 4 4 4M16 8l4 4-4 4';
function Bar({ className }) {
  const [marks, setMarks] = React.useState(['bold']);
  const [quoted, setQuoted] = React.useState(false);
  return (
    <Toolbar aria-label="Formatting" overflow="menu" bordered className={className}>
      <ToggleGroup type="multiple" value={marks} onValueChange={setMarks} aria-label="Text style">
        <ToggleGroupItem value="bold" aria-label="Bold" square><b>B</b></ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Italic" square><i>I</i></ToggleGroupItem>
        <ToggleGroupItem value="underline" aria-label="Underline" square><u>U</u></ToggleGroupItem>
      </ToggleGroup>
      <ToolbarSeparator />
      <ToolbarGroup aria-label="Blocks">
        <ToolbarButton aria-label="Bulleted list" square><I d={list} /></ToolbarButton>
        <ToolbarToggle aria-label="Quote" square pressed={quoted} onPressedChange={setQuoted}><I d={quote} /></ToolbarToggle>
        <ToolbarButton aria-label="Code" square><I d={code} /></ToolbarButton>
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarButton aria-label="Insert link" square><I d={link} /></ToolbarButton>
    </Toolbar>
  );
}
export default function App() {
  return (
    <div className="tb">
      <Bar />
      <Bar className="narrow" />
      <p className="cap">One tab stop for the whole bar; arrows move between tools. The narrow bar moves what doesn't fit into "More tools", where Quote stays a checkable item.</p>
    </div>
  );
}
```
<!-- /example -->
