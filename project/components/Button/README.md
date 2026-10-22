# Button

Triggers an action. A button is a slab standing on the page: its height is drawn as a visible wall under the face, and that height is its importance.

| Variant | Height | Use |
|---|---|---|
| `primary` | level 2, `wall-2` (4px), `accent` | The one thing this view is for. At most one per view. |
| `secondary` | level 1, `wall-1` (2px), `surface-raised` | Everything else. The default. |
| `ghost` | level 0, flush, no wall | Low-emphasis actions in toolbars, a dialog's cancel, table rows. On hover it rises out of the page with a 2px wall. |
| `danger` | level 2, `wall-2`, `critical` | Irreversible actions, usually confirmed in a Dialog or a HoldButton. |

The wall is the face colour darkened, so it reads in every scheme and with any custom accent. A button stays exactly where it is until the pointer is on it: it doesn't react to an approaching pointer or follow it across its face, because a control that moves on its own reads as something going wrong. Hover raises the face 1px while the wall grows to keep its foot on the ground. Pressing pushes the face all the way down: the wall disappears, the sheen flattens, and on release it settles back up on `ease-settle`. `loading` holds it down with a spinner and ignores clicks. `disabled` has no height at all: flush, on `surface-well`, in `ink-faint`. In high-contrast mode the wall becomes solid ink. The keyboard focus ring wraps the whole slab, face and wall, 4px out, in `accent-ink`.

**You provide:** a label (verb first, sentence case: "Publish changes"), `variant`, `size` (`sm` 30px, `md` 36px, `lg` 44px), optional `leading`/`trailing` icons at 16px. Icon-only buttons take `square` and an `aria-label`.

- Don't put two primary buttons in one view. Promote one, demote the other to secondary.
- Leave room below a row of buttons: the wall extends up to 5px under the face.
