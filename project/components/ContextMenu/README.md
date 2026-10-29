# ContextMenu

Actions on a thing (a file, a row, a board card, a tree node, a canvas object), opened where you right-click or long-press it, or at it with Shift+F10 or the Menu key.

**Elevation.** The menu is `DropdownMenu`'s own (both use one implementation): a floating surface at level 3, with the highlight that glides between items, `predicted` items first, and `critical` items in words. **The thing shows it's the subject with a 2px `accent-ink` outline**, a ring and never a height, so a flush table row doesn't lift out of its table.

**No submenus.** "Don't stack floating on floating": a menu inside a menu loses the reading of height. Put the choices in the menu (a few) or open a `Dialog` ("Move to…").

**Every action needs another way.** A right-click is invisible until you know it's there, and long-press is easy to miss. Put the same actions behind a visible button on the thing (a row's "⋯" `DropdownMenu`), as the preview does.

**Accessibility.** The [menu pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu/). The thing gets `aria-haspopup="menu"` and `aria-expanded`, and must be focusable (`tabIndex={0}`) so Shift+F10 and the Menu key can open the menu at it. That opens with the first item active. Arrows, Home, End and Enter work in the menu, and Escape (or choosing) returns focus to the thing. A long press on touch is 500ms without moving more than 10px. The menu stays inside the viewport, flipping left or up at an edge, and closes on scroll, resize or a click outside. Under forced colours the outline is `Highlight`.

**Props:** `items` (`DropdownMenu` entries, or a function called each time it opens); `children` (one element: the thing); `aria-label`; `onOpenChange`.

**You provide:** the thing (focusable), its actions, and another way to reach them.

```tsx
<ContextMenu items={() => [
  { label: 'Rename', onSelect: () => rename(file) },
  { type: 'separator' },
  { label: 'Delete file', tone: 'critical', onSelect: () => remove(file) },
]}>
  <div role="listitem" tabIndex={0}>{file.name} <RowActions file={file} /></div>
</ContextMenu>
```

- Do make the thing focusable, so the keyboard can open its menu.
- Do offer the same actions in a visible menu.
- Don't nest menus; open a `Dialog` for a long choice.
- Don't raise the thing while its menu is open; it's outlined.
