# Surface

The primitive every component is built from: a box placed on one rung of the elevation ladder.

`level` picks the tint and shadow together (`surface-raised` + `elev-1` at level 1, `surface-well` + `well` at −1, and so on), so the two can never drift apart. `interactive` makes it climb one level on hover and focus and drop to ground while pressed.

**You provide:** `level`, children, and padding and radius through `className`/`style` (the default radius is `radius-lg`). With `interactive` and `onClick` on a `div`, it becomes focusable; add `role="button"` or render `as="button"` for a real control.

**Depth signals** (also on `Card`, and available to your own components through `useDepth`):

| Prop | What it shows |
|---|---|
| `settle` | Afterglow. Pass any value; when it changes, the surface tints with `accent-soft`, lifts to `elev-2` and settles back over `dur-settle` (full for 1s, noticeable for ~4s). `true` settles once on mount, for newly added items. |
| `status` | Commitment. `pending` hovers above the ground after `dur-grace` (so fast saves never flicker) and sets `aria-busy`; changing to `committed` lands with a settle; `failed` drops into a trench on `critical-soft`. Pair it with visible text ("Saving…", "Couldn't save"). |
| `heldBy` | Possession. `{ name, presence: 1–3 }` lifts it to level 3, outlines it in that `presence-*` colour and shows the name. Use for collaborators editing or dragging it. |
| `relevance` | Focus+context. `match` rises one level, `miss` sinks into a well in `ink-muted`. Use for filtering in place instead of removing items. |

- Do use Surface for one-off panels, sidebars and app chrome so they share the ladder with the components.
- Don't set `interactive` on something that doesn't act when clicked: a lift is a promise.
- Don't stack more than three levels in one region; if you need a fourth, the layout probably wants a dialog or a page.
