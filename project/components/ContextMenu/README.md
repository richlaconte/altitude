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

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`ContextMenu` as first used in its preview:

```tsx
import { Button, ContextMenu, DropdownMenu, Icons } from 'altitude-design';

<ContextMenu key={f} items={() => actions(f)}>
  <div className="file" role="listitem" tabIndex={0}>
    <span className="name">{f}</span><span className="meta">Edited 2 days ago</span>
    <DropdownMenu align="end" items={actions(f)} trigger={<Button variant="ghost" size="sm" square aria-label={`Actions for ${f}`}><Icons.More /></Button>} />
  </div>
</ContextMenu>
```

The full preview, as rendered in Storybook and checked in CI (`col`, `cm2`, `file`, `name`, `meta`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Button, ContextMenu, DropdownMenu, Icons } from 'altitude-design';

export default function App() {
  const [files, setFiles] = React.useState(['Q3 board deck.pdf', 'Invoices 2026.xlsx', 'Brand guidelines.fig']);
  const [said, setSaid] = React.useState('');
  const actions = (f) => [
    { label: 'Open', onSelect: () => setSaid(`Opened ${f}.`) },
    { label: 'Rename', onSelect: () => setSaid(`Renaming ${f}…`) },
    { label: 'Duplicate', onSelect: () => setSaid(`Duplicated ${f}.`) },
    { type: 'separator' },
    { label: 'Delete file', tone: 'critical', onSelect: () => { setFiles((xs) => xs.filter((x) => x !== f)); setSaid(`Deleted ${f}.`); } },
  ];
  return (
    <div className="col">
      <div className="cm2" role="list" aria-label="Files">
        {files.map((f) => (
          <ContextMenu key={f} items={() => actions(f)}>
            <div className="file" role="listitem" tabIndex={0}>
              <span className="name">{f}</span><span className="meta">Edited 2 days ago</span>
              <DropdownMenu align="end" items={actions(f)} trigger={<Button variant="ghost" size="sm" square aria-label={`Actions for ${f}`}><Icons.More /></Button>} />
            </div>
          </ContextMenu>
        ))}
      </div>
      <p className="cap" role="status">{said || 'Right-click a file (or long-press, or focus it and press Shift+F10). The same actions are behind each row\'s ⋯ button, because a context menu is never the only way.'}</p>
    </div>
  );
}
```
<!-- /example -->
