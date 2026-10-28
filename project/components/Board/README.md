# Board

Columns of cards you move between, a kanban: columns are receptacles that open when you carry a card, and the card floats in your hand until it lands.

**Elevation: receptacles and a hand.** At rest a board is just its cards: the columns lie flush on the ground, with only their titles and counts to mark them, and the cards are raised (level 1), lifting to level 2 under the pointer. The moment a card is carried, every column opens into a well (things you put something into are openings), and the column under the card deepens to a trench with an accent rim, as a DropZone does when it's ready to receive. The carried card floats at level 3, tilted 1.2° and 1.5% larger, and follows the pointer; the cards around it glide aside (`ease-settle`), and the slot it will land in opens as a trench. Let go and it's carried into the slot with a slight overshoot (`ease-settle`) while its shadow sinks back to `elev-1`, and the columns close up. A move to the column it came from, or nowhere, travels back the same way.

- **A collapsed column is a Pile.** Its thickness (one, two or three sheets) and its count badge say how many cards it holds. It still takes drops: carried over it, it deepens and fans its sheets toward the card, and the card is added to the end.
- **Someone else's hand.** A card a collaborator is holding (`heldBy`) is lifted to level 3, outlined in their presence colour and wears their name; you can't pick it up meanwhile.
- **Afterglow.** `settle` makes a card arrive tinted and lifted, then settle: for cards moved by someone else.

**Editing in place.** On a board the column you add to is the context, so cards are added and edited where they are, not in a Dialog.

- **Add.** With `onCreate(title)` on a `BoardColumn`, the column ends in an add slot: a dashed well (an opening) named “Add a card to To do”, deepening to a trench under the pointer. Activating it raises it into a new card (static, level 1) holding a “Card title” field. Enter creates the card and leaves a fresh, empty field, so several can be added in a row; Escape, or Enter on an empty field, closes it and returns focus to the slot. A pending card hovers after `dur-grace`; a refused one drops to a trench with its title kept and Retry. Resolve `{ ok: true, value: { id } }` after the card is among the children, or `{ ok: false, error }`. A collapsed column shows no add slot. Announced: “Added Fix login to To do, position 4 of 4.”
- **Rename.** With `onRename(draft)` (InlineEdit's contract) and a `label`, F2 or the card's visible Rename button turns the title into a field, selected. Enter saves, Escape cancels, a refusal keeps the draft with its error, and focus returns to the card. While the field is open, Space and Enter type into it and don't pick the card up; Space and Enter on the card itself still pick it up, so renaming has F2 and a button rather than Enter.
- **Edit fields.** With `value`, `renderEditor(field)` and `onSave` (EditRegion's contract), the card's Edit button grows it into an `EditRegion` in place, and the cards below are pushed down. `onValueChange` publishes the saved record. A card being edited can't be picked up.

**Keyboard and screen readers.** Each column is a `section` named by its title (an `h3`), with its card count. Cards are focusable buttons with `aria-roledescription="draggable card"` and instructions attached. Space or Enter picks a card up (`aria-pressed`); ↑ and ↓ move it within its column, ← and → carry it to the next open column; Space drops it; Escape puts it back where it started. Every step is announced in an assertive live region ("Review, position 2 of 3"). A card held by a collaborator says so instead of lifting. Moving focus away puts a held card down where it is. Under reduced motion cards don't travel or tilt; their levels still change. Forced colours dash the open columns and outline the target in Highlight.

| Part | |
|---|---|
| `Board` | `onMove({ cardId, from, to })`, where `from` and `to` are `{ column, index }`; you update your data and the board carries the cards |
| `BoardColumn` | `id`, `title`, `collapsible`, `collapsed`/`defaultCollapsed`/`onCollapsedChange`, `onCreate`, `addLabel` |
| `BoardCard` | `id`, `label` (for announcements), `heldBy`, `settle`, `onRename`, `value`/`renderEditor`/`onSave`/`onValueChange`; anything inside it |

**You provide:** the data and an `onMove` that moves the card in it (splice it out of `from.column` at `from.index`, into `to.column` at `to.index`); card content (a title, then a `small` line of detail); short column titles.

- Do keep buttons and links inside cards: pressing them doesn't pick the card up.
- Do collapse finished columns rather than hiding them; the pile keeps their weight visible.
- Don't use a board for a single list you reorder; that's SortableList.
