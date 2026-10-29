# Separator

A divider: between sections in a card, groups in a toolbar, items in a sidebar, or "or" between two ways to sign in.

**Elevation.** A divider is part of the page, so it lies on the ground: 1px of `line`, with no shadow and no wall. `line` is for decorative dividers. `line-control` is for the edges of controls, so a separator never uses it except under `contrast="more"`. Don't draw an `<hr>` with your own border colour: "never invent an in-between gray".

**Semantics.** By default it's `role="separator"` with `aria-orientation`, so a screen reader knows the content is parted. Set `decorative` when the layout already says it (a line between groups of toolbar buttons): it becomes `role="none"` and is skipped. A labelled separator (`label="or"`) is the word in `ink-muted` between two drawn lines, and it's read as plain text. `role="separator"` would make its children presentational and lose the word.

**Orientation.** `horizontal` fills its container's width. `vertical` stretches to the height of the row it's in (at least 1em), so put it in a flex row.

**Accessibility.** Under forced colours it's 1px of `CanvasText`. Under `contrast="more"` the lines are `line-control`.

**Props:** `orientation` (`'horizontal' | 'vertical'`, default horizontal); `decorative`; `label`.

**You provide:** where it goes, and whether it says something (leave `decorative` off) or only decorates.

```tsx
<Separator />
<Separator orientation="vertical" decorative />
<Separator label="or" />
```

- Do use it instead of a border on one side of a section.
- Do make a separator between groups of toolbar buttons `decorative`.
- Don't use it to fake a table's row lines; `Table` and `ItemGroup` draw their own (`ItemSeparator`).
- Don't give it a colour, a thickness or a shadow.
