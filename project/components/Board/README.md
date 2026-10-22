# Board

Columns of cards you move between, a kanban: columns are receptacles that open when you carry a card, and the card floats in your hand until it lands.

**Elevation: receptacles and a hand.** At rest a board is just its cards: the columns lie flush on the ground, with only their titles and counts to mark them, and the cards are raised (level 1), lifting to level 2 under the pointer. The moment a card is carried, every column opens into a well (things you put something into are openings), and the column under the card deepens to a trench with an accent rim, as a DropZone does when it's ready to receive. The carried card floats at level 3, tilted 1.2° and 1.5% larger, and follows the pointer; the cards around it glide aside (`ease-settle`), and the slot it will land in opens as a trench. Let go and it's carried into the slot with a slight overshoot (`ease-settle`) while its shadow sinks back to `elev-1`, and the columns close up. A move to the column it came from, or nowhere, travels back the same way.

- **A collapsed column is a Pile.** Its thickness (one, two or three sheets) and its count badge say how many cards it holds. It still takes drops: carried over it, it deepens and fans its sheets toward the card, and the card is added to the end.
- **Someone else's hand.** A card a collaborator is holding (`heldBy`) is lifted to level 3, outlined in their presence colour and wears their name; you can't pick it up meanwhile.
- **Afterglow.** `settle` makes a card arrive tinted and lifted, then settle: for cards moved by someone else.

**Keyboard and screen readers.** Each column is a `section` named by its title (an `h3`), with its card count. Cards are focusable buttons with `aria-roledescription="draggable card"` and instructions attached. Space or Enter picks a card up (`aria-pressed`); ↑ and ↓ move it within its column, ← and → carry it to the next open column; Space drops it; Escape puts it back where it started. Every step is announced in an assertive live region ("Review, position 2 of 3"). A card held by a collaborator says so instead of lifting. Moving focus away puts a held card down where it is. Under reduced motion cards don't travel or tilt; their levels still change. Forced colours dash the open columns and outline the target in Highlight.

| Part | |
|---|---|
| `Board` | `onMove({ cardId, from, to })`, where `from` and `to` are `{ column, index }`; you update your data and the board carries the cards |
| `BoardColumn` | `id`, `title`, `collapsible`, `collapsed`/`defaultCollapsed`/`onCollapsedChange` |
| `BoardCard` | `id`, `label` (for announcements), `heldBy`, `settle`; anything inside it |

**You provide:** the data and an `onMove` that moves the card in it (splice it out of `from.column` at `from.index`, into `to.column` at `to.index`); card content (a title, then a `small` line of detail); short column titles.

- Do keep buttons and links inside cards: pressing them doesn't pick the card up.
- Do collapse finished columns rather than hiding them; the pile keeps their weight visible.
- Don't use a board for a single list you reorder; that's SortableList.
