# Pile

Shows a group of items as a stack. Its thickness says roughly how many; click it and the items fan out over the page.

**Closed.** The top card is raised (level 1). Beneath it sit 0–3 sheets: none for one item, one for 2–3, two for 4–9, three for 10 or more. Thickness is read in bins, so the count badge carries the number. On hover or focus the top lifts and the sheets beneath fan a little, a preview of what's underneath; nothing moves before the pointer is on it.

**Open.** Give the pile `items` and `renderItem` and its top card becomes a toggle. Clicking it (or Enter/Space) slides the items out from under the top card, one after another, into a column that **floats over the page below**: nothing on the page moves. Each item is its own card with its own shadow (`elev-2`, `elev-3` under the pointer); the scroll area itself has none, and its top and bottom edges fade out rather than cutting the shadows off. Click an item to choose it (`onSelect`). Click the top again, press Escape or click anywhere else and the items slide back under. Long piles scroll after `maxHeight`.

**You provide:** `items`, `renderItem(item, { index })`, `onSelect`, the top card's content as children, optionally `getKey`, `maxHeight` and `open`/`onOpenChange` (for example, to close it after a choice). For a pile that only shows quantity, pass `count` instead of `items`.

- Leave room below a pile, or near the bottom of the viewport the list may run off-screen.
- Use piles for collections people triage: review queues, inboxes, stacks of drafts.
