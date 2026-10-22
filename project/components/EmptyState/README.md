# EmptyState

What a list, board, search or page shows when it has nothing to show: a statement of what's empty, why, and one obvious next step.

**Why it's sunk.** An empty region isn't a problem (that's `Alert`) and it isn't a settled container (that's `Card`): it's a space waiting to receive, where the record hasn't landed yet. So it's an opening, a well cut into the page (`surface-well`, `well`) with a dashed `line-control` rim, the same below-ground signal as an empty field or an armed `DropZone`: sunken things want content. Its actions are ordinary raised buttons standing in it, the primary one at level 2. Pointing at or tabbing to the primary action deepens the well to a trench and darkens its rim to `ink-muted`, showing where the record it creates will land. When it appears it sinks in from flush (`dur-travel-1`, `ease-sink`), the inverse of new content arriving lifted; it never pulses or loops, because an empty state must never beg.

**Without height.** The rim is dashed while the region is empty, and the title says so in words; the icon is in `currentColor`. Under forced colours the rim is a dashed `CanvasText` border, like every sunk surface; with `contrast="more"` it turns solid.

**Accessibility.** It's a `section` named by its title (`aria-labelledby`, an `h3` by default; set `headingLevel` to fit the page's outline) and described by its description. Actions are real buttons or links in the normal tab order: nothing is focused for you and nothing traps focus. When an empty follows something the person did (a filter or a search that matched nothing), pass `announce` and it's said politely once it appears: `true` says the title, a string says that.

**You provide:** `title` (what's empty, as a statement), usually a `description` (why, or what will appear here), an `icon` (a Lucide line icon), and `action` (one primary `Button` whose label starts with a verb). Optionally `secondary` (a ghost `Button` or a link), `children` (extra content above the actions), `size="sm"` for a widget or a list, and `announce`.

- Do name what's empty and what to do: "No gift ideas yet" and **Add idea**, not "Nothing here" and **OK**.
- Do say which kind of empty it is in words: nothing yet, nothing matches, or you can't see it. Colour and height don't tell them apart.
- Do give it one primary action at most; a second one is `secondary`, quieter.
- Don't use it for an error that stopped content loading: that's a problem to fix, an `Alert`.
- Don't raise it into a card, or make it the only thing on a page that's still loading: show a `Skeleton` until you know it's empty.
