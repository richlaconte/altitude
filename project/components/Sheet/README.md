# Sheet

A large panel laid over the page at level 4, anchored to an edge, for a task that needs more room than a popover and less commitment than a page.

**Why level 4.** A sheet is a whole working surface above the page: higher than menus and popovers (level 3), because it holds a task rather than one choice, and below the summit (level 5), because it doesn't demand an answer. It's drawn with `surface-overlay` and `elev-4`, the toasts' tier.

**Risen at its edge, not slid in.** Nothing in Altitude slides in from the side. A sheet appears where it's anchored: it travels 16px out of its edge as it fades in, while its shadow grows from `elev-1` to `elev-4` (`dur-travel-4`, `ease-rise`). It stands 8px clear of the edge with `radius-xl` corners, so its own edges, and the shadow it casts below them, read as height. A modal sheet recedes the page behind it, as a dialog does. Closing lifts it off: it rises 8px and grows 1% as its shadow spreads and it fades, in 70% of the time it took to arrive.

**Inside.** The sheet scrolls as one column. `SheetHeader` stays at the top and rises to `elev-2` once content passes under it; `SheetFooter` stays at the bottom, and while there's more below, its top edge curves away (`lip-bottom`), as in ScrollArea.

**Bottom sheets** have a finger pull at the top: a small recess, because everything you put something into is an opening in Altitude, and this is where your finger goes. It deepens as the pointer approaches. Drag it and the sheet follows; past a third of its height, or with a flick, it goes; otherwise it springs back. The pull is a convenience: Escape, the close button and the scrim still close it.

**Modal or not.** By default a sheet is modal (the WAI-ARIA dialog pattern): the scrim blocks the page, Tab is trapped, Escape closes it and focus returns to what opened it. `modal={false}` makes a side panel that leaves the page usable: no scrim, no receding page, no trap; focus still moves into it, and Escape closes it from inside.

| Prop | Default | |
|---|---|---|
| `side` | `right` | `right`, `left` or `bottom` |
| `size` | `md` | width: `sm` 360, `md` 440, `lg` 560px; a bottom sheet 480, 720, 960px |
| `modal` | `true` | `false`: a non-blocking panel |
| `dismissible` | `true` | `false`: only your own buttons close it |

**You provide:** `open`/`onOpenChange` or a `trigger`, and the content: `SheetHeader` with `SheetTitle` (it names the sheet) and `SheetDescription`, the body, and `SheetFooter` with the actions (cancel as ghost first, the action last).

- Do use a sheet to edit an item without leaving the list it's in, and for filters, details and settings.
- Don't open a sheet from a Dialog or the CommandPalette. A level-4 surface can't sit on the summit: if it's opened under one, it paints beneath it and leaves focus where it is. A Dialog may open from a sheet, to confirm something.
- Don't stack a sheet on a sheet; replace its content instead.
