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
