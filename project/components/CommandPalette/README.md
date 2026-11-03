# CommandPalette

Finds and runs anything in the product from one field: the summit, at level 5, opened with ⌘K or Ctrl+K.

**Why the summit.** A command palette takes over the screen for a moment: whatever you were doing waits until you've chosen. That is what level 5 means (focus of the moment), so it sits where Dialog sits and uses the same machinery: the page recedes 1.5% and desaturates, the `scrim` veils it, and the palette rises 16px from 96% scale while its shadow grows from `elev-1` to `elev-5` (`dur-travel-5`). It's anchored 12vh from the top rather than centred, so the field stays put while the results below it grow and shrink. There is one summit: ⌘K does nothing while a Dialog is open, and choosing an item closes the palette before its action runs, so an action may open a Dialog.

**The field is an opening.** It's a real `Input`. An empty query is a hole in the palette with its back wall showing (focus never leaves it, so it never needs the rim a field you tab to gets); the first character raises its floor flush with the palette. Here that floor is `surface-modal`, the surface it sits on, rather than Input's usual `surface-raised`, which in dark schemes is darker than level 5 and would leave a filled query looking sunk.

**Results.** Groups with labels; each row has an icon, a label, an optional description and its shortcut as `Kbd` keys. The letters that matched are drawn in `accent-ink`. One `accent-soft` highlight (`critical-soft` on a destructive item) is carried to the active row on `ease-settle`, as in DropdownMenu.

- **Best match on top.** Items rank by score within their group and groups rank by their best item, so the best match is always the first row and is already active: Enter runs it.
- **Carried, not reshuffled.** When the results change, rows that stay travel to their new places (FLIP, `dur-travel-2`, `ease-glide`) instead of blinking, and the list's height glides to fit. New rows rise 4px into place, but rises spend attention: only rows near the top rise, at most four begin together (the rest follow 90ms apart), and everything further down cross-fades.
- **Predicted first.** On opening, items marked `predicted` (or a whole group, such as Recent) are there at once while the rest fade in over `dur-onset` (500ms): ephemeral adaptation, as in DropdownMenu. Once you type, everything shows at once.

**Carrying a query in.** By default the field is empty each time the palette opens. Pass `defaultQuery` to open it on a query (the page's current filter, a deep link), or control it with `query` and `onQueryChange` when something else already holds the text: a persistent search field on the page can open the palette on its first keystroke and hand over what was typed, and a controlled query isn't cleared on opening. Either way the caret lands after the carried text, so typing continues it and the results filter as usual. Focus moves to the palette's field as it rises; keep the outer field controlled by the same state so nothing typed in between is lost. An IME composition in progress can't move between fields, so it ends in the field where it started.

**Keyboard and screen readers.** The field is a `combobox` that controls a `listbox` through `aria-activedescendant` (the WAI-ARIA combobox pattern), so focus stays in the field. ↑ and ↓ move and wrap, Enter chooses, Escape closes, and ⌘K / Ctrl+K toggles. Groups are named by their labels, the active option is `aria-selected`, disabled items are skipped, and the number of results is announced once typing pauses. Focus goes back where it was when the palette closes. Under reduced motion nothing travels; rows fade.

**On touch.** `hints="auto"` (the default) shows the footer, the item shortcuts and the field's esc where there's likely a keyboard, and hides them on a touch-only device until a key is pressed, so a phone's palette isn't crowded with keys it can't press. `true` or `false` forces them. The shortcuts still work either way.

**You provide:** `items`, a list of groups (`label`, `items`, optional `predicted`), each item with a `label` and usually an `icon`, `onSelect`, `shortcut` (display only: bind the key yourself), `keywords` and `description`; `open`/`onOpenChange` when you also open it from a button or a field; `query`/`onQueryChange` or `defaultQuery` when it should open on a query. Optionally `filter` (return 0 to hide, higher to rank nearer the top; `commandScore` is the default), `empty`, `placeholder`, and `shortcut` (another letter, or `false`).

- Do start actions with a verb ("Invite people") and name places plainly ("Orchard").
- Do mark items `predicted` only when you'd be right most of the time; a wrong prediction costs a moment.
- Don't render two palettes, and don't open a Sheet from one: one summit, and a level-4 sheet can't sit on it.

The palette and Dialog share one summit per document, including across providers. Its shortcut cannot take an occupied summit. A simultaneous controlled request is rejected with a development warning; set it to `false` before trying again. Rejected requests do not queue. A selected command can close the palette and open a Dialog synchronously: callback ordering is unchanged, the exiting palette retires, and scroll/isolation ownership transfers without unlocking the page. Only the active modal has `aria-modal`; composition Enter and Escape remain with the input method.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`CommandPalette` as first used in its preview:

```tsx
import { CommandPalette } from 'altitude-design';

<CommandPalette
  open={open}
  onOpenChange={onOpenChange}
  query={text}
  onQueryChange={setText}
  items={groups}
  onSelect={(item) => setLast(item.label)}
/>
```

The full preview, as rendered in Storybook and checked in CI (`app`, `bar`, `find`, `grid`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Badge, Card, CommandPalette, Input, Kbd } from 'altitude-design';

const I = {
  up: <svg
  width="16"
  height="16"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.75"
  strokeLinecap="round"
  strokeLinejoin="round"
>
  <path d="M7 17L17 7M9 7h8v8" />
</svg>,
  folder: <svg
  width="16"
  height="16"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.75"
  strokeLinejoin="round"
>
  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
</svg>,
  plus: <svg
  width="16"
  height="16"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.75"
  strokeLinecap="round"
>
  <path d="M12 5v14M5 12h14" />
</svg>,
  user: <svg
  width="16"
  height="16"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.75"
  strokeLinecap="round"
>
  <circle cx="12" cy="8" r="4" />
  <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
</svg>,
  key: <svg
  width="16"
  height="16"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.75"
  strokeLinecap="round"
  strokeLinejoin="round"
>
  <circle cx="8" cy="15" r="4" />
  <path d="M11 12l9-9M17 6l3 3" />
</svg>,
  trash: <svg
  width="16"
  height="16"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.75"
  strokeLinecap="round"
  strokeLinejoin="round"
>
  <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
</svg>
};
const groups = [
  { label: "Recent", predicted: true, items: [
    { label: "Deploy to production", icon: I.up, shortcut: ["\u2318", "D"], keywords: ["ship", "release"] },
    { label: "Open Orchard", icon: I.folder, description: "Marketing site" }
  ] },
  { label: "Actions", items: [
    { label: "New project", icon: I.plus, shortcut: ["\u2318", "N"] },
    { label: "Invite people", icon: I.user, keywords: ["team", "member"] },
    { label: "Deploy preview", icon: I.up, description: "main@8dc01b2" },
    { label: "Delete project\u2026", icon: I.trash, tone: "critical" }
  ] },
  { label: "Projects", items: [
    { label: "Orchard", icon: I.folder, description: "orchard.example" },
    { label: "Beacon", icon: I.folder, description: "Internal dashboard" },
    { label: "Cinder", icon: I.folder, description: "API gateway" }
  ] },
  { label: "Settings", items: [
    { label: "Environment variables", icon: I.key, keywords: ["env", "secrets", "dependencies"] },
    { label: "Billing", icon: I.key, disabled: true }
  ] }
];
const searchIcon = <svg
  width="16"
  height="16"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.75"
  strokeLinecap="round"
  aria-hidden="true"
>
  <circle cx="11" cy="11" r="7" />
  <path d="M20 20l-3.5-3.5" />
</svg>;
export default function App() {
  const [open, setOpen] = React.useState(true);
  const [text, setText] = React.useState("");
  const [last, setLast] = React.useState(null);
  const onOpenChange = (v) => {
    setOpen(v);
    if (!v) setText("");
  };
  return <div className="app">
  <div className="bar">
    <b>Orchard</b>
    <Badge tone="positive">Operational</Badge>
    <Input
      className="find"
      aria-label="Search or run a command"
      placeholder="Search or run a command"
      value={text}
      leading={searchIcon}
      trailing={<span aria-hidden="true"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>}
      onChange={(e) => {
    setText(e.target.value);
    if (e.target.value) setOpen(true);
  }}
    />
  </div>
  <div className="grid" data-tells-ignore="LA4 placeholder page behind the overlay">
    <Card />
    <Card />
    <Card />
  </div>
  <p className="cap">
    {last ? `Chose \u201C${last}\u201D.` : "Type \u201Cdep\u201D: the best match moves to the top and the rows that stay travel there. Close it and type in the search field: the palette opens with what you typed."}
  </p>
  <CommandPalette
    open={open}
    onOpenChange={onOpenChange}
    query={text}
    onQueryChange={setText}
    items={groups}
    onSelect={(item) => setLast(item.label)}
  />
</div>;
}
```
<!-- /example -->
