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

**You provide:** `items`, a list of groups (`label`, `items`, optional `predicted`), each item with a `label` and usually an `icon`, `onSelect`, `shortcut` (display only: bind the key yourself), `keywords` and `description`; `open`/`onOpenChange` when you also open it from a button or a field; `query`/`onQueryChange` or `defaultQuery` when it should open on a query. Optionally `filter` (return 0 to hide, higher to rank nearer the top; `commandScore` is the default), `empty`, `placeholder`, and `shortcut` (another letter, or `false`).

- Do start actions with a verb ("Invite people") and name places plainly ("Northwind").
- Do mark items `predicted` only when you'd be right most of the time; a wrong prediction costs a moment.
- Don't render two palettes, and don't open a Sheet from one: one summit, and a level-4 sheet can't sit on it.
