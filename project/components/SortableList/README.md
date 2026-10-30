# SortableList

Reorders a list by picking items up: the item you hold floats in your hand, the slot it will land in opens, and it lands.

Pressing and dragging an item lifts it to level 3 (floating surface, `elev-3`), scales it 1.5% and tilts it half a degree; the others glide aside on `ease-settle`, and a well opens where it will land. Releasing animates it into place (FLIP) while its shadow falls back to `elev-1`. Keyboard: focus an item, press Space to pick it up, arrow keys to move it, Space to drop, Escape to cancel; every move is announced.

**On touch.** A swipe on a row scrolls; a press-and-hold picks it up, and the grip picks it up at once. A mouse drag needs no hold.

**You provide:** `items`, `getKey`, `onReorder` (receives the new array), `renderItem` (the row content; the row itself and its grip are drawn for you), `getLabel` for announcements, `aria-label`.

- Do keep rows short and uniform; the slot is sized to the item being moved.
