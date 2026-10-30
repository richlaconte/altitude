# Table

Rows and columns of records: the rows sit on the ground with `line` dividers, and only the ones that are selected, matching, in hand or under your pointer rise.

**Elevation: the record.** A table is the plainest thing in Altitude: its rows are what has been settled, so they lie flush on the ground. Height is spent only on rows that mean something right now:

- **Selected** rows are tinted `accent-soft` and raised one level (`elev-1`), with a checked Checkbox; the toolbar counts them with a count Badge, the one badge that floats, because the count wants your attention.
- **Interactive** rows (ones that open something) lift one level on hover, a ghost lift; pressing drops them back to the ground. Rows that do nothing don't move at all.
- **Filtering in place** raises matches one level and sinks misses into a well (`ink-muted`), so the rows keep their places and you can still see what didn't match (Signals: relevance).
- **Carried** rows: when the order changes (a sort, a move), each row travels to its new place (`dur-travel-3`, `ease-glide`) instead of the table being reshuffled, so you can follow a row you were looking at.
- **In hand**: a row picked up to reorder floats at level 3, slightly tilted, over a slot that opens as a well where it will land; its neighbours glide aside, as in SortableList.

The header stays flush until rows scroll under it, then rises to `elev-2` (as in ScrollArea); where rows continue below, the bottom edge curves away (`lip-bottom`). Cells can't share one shadow, so each row's height is drawn as a single slab by its first cell, as wide as the table.

**Semantics.** A plain `<table>` with `<th scope="col">`: it's a table, not a grid, because its cells aren't edited or navigated one by one. Sortable headers are buttons, and the `th` carries `aria-sort`. Selection lives in the row's Checkbox (no `aria-selected` on rows of a plain table). An interactive row's first cell is a real button, so the keyboard reaches it; clicking anywhere else on the row does the same. Move handles are buttons: Space picks a row up, ↑ and ↓ move it, Space drops it, Escape puts it back; each step is announced. Selection counts and sort changes are announced too. Forced colours rule raised rows solid and sunk rows dashed.

**Two ways to build one.** The primitives mirror shadcn/ui: `Table` (with `maxHeight` for a scrolling body), `TableHeader`, `TableBody`, `TableFooter`, `TableRow` (`rowId`, `selected`, `interactive`, `relevance`, `settle`, `held`), `TableHead` (`align`, `sort`, `onSort`), `TableCell` (`align`) and `TableCaption`. `DataTable` builds the whole thing from data:

| Prop | |
|---|---|
| `columns` | `{ key, header, cell?, sortValue?, align?, width? }[]`; `sortValue` makes a column sortable (ascending, descending, none) |
| `rows`, `getRowId`, `getRowLabel` | the records, a stable id, and a name for screen readers |
| `selectable`, `selected`/`onSelectedChange`, `actions` | a checkbox column; actions appear beside the count while rows are selected |
| `onRowClick` | interactive rows |
| `relevance` | `(row) => 'match' \| 'miss' \| undefined` for filtering in place |
| `onReorder` | move handles; hidden while a sort is active |
| `renderExpanded`, `expanded`/`defaultExpanded`/`onExpandedChange`, `expandMode` | a disclosure button per row opening a full-width detail row (`'single'` by default: one open at a time) |
| `renderEditor`, `onSave`, `onRowChange` | an Edit button per row that opens the row's fields as an `EditRegion` in a full-width row beneath it (EditRegion's save contract; `onRowChange` publishes the canonical row) |
| `toolbar`, `maxHeight`, `empty` | a filter field or button at the toolbar's end (at narrow widths the toolbar wraps onto more lines and a field in it shrinks, so nothing scrolls sideways); scroll height; text for no rows |

**Loading.** While `DataTable`'s `rows` is undefined (your query hasn't returned) or a promise, the table keeps its real header over `skeleton.lines` rows of imprinted cells (default 5), so columns don't jump (see `Await`). An empty array is an empty table.

**Opening a row.** Read-only detail (`renderExpanded`) is a reveal of the record, so it stays on the ground: a full-width row under the record, inset, with the disclosure chevron turned and `aria-expanded`/`aria-controls` on its button. Editing (`renderEditor` + `onSave`) is live, so it rises: the row and its region become one raised slab (`elev-1`) holding a static `EditRegion`, with the row's cells still visible above it so the record stays identified. The first field takes focus; Enter in a single-line field saves and Escape cancels, and focus returns to the row's Edit button. While a row is in edit, the other rows' Edit buttons, sorting and reordering wait, so the edited row isn't carried away mid-edit; once saved it settles with an afterglow and, if its sort position changed, is carried to its new place. It stays a table, not a grid: the region is one `td` spanning the row. Above about eight fields, open the record in a `Sheet` beside the table instead (`onRowClick`).

**You provide:** the data or the rows, short column headers in sentence case, numbers right-aligned (`align="end"`), and a `getRowLabel` that names each row the way people refer to it.

- Do filter in place with `relevance` when position matters (a ranked list, a schedule); remove rows instead when it doesn't.
- Don't make rows interactive unless clicking one does something; a lift that leads nowhere is a broken promise.
- Don't nest tables or put a table inside a raised card's padding without a reason; the table is already the record.

## Columns and density

Wide record tables need a way to choose what shows. `columnsMenu` adds a **Columns** button to the toolbar (it says "· 3 hidden" when some are). It opens a `Popover` (level 3) holding a `SortableList` of `Checkbox`es (drag a column, or pick it up with Space and the arrows, to reorder it) and a density switch (a single-choice `ToggleGroup`: Comfortable or Compact). The first column in order can't be hidden: it names the row.

- `columnVisibility`, `onColumnVisibilityChange`: `{ [key]: false }` hides a column.
- `columnOrder`, `onColumnOrderChange`: keys in order; keys left out keep their place after the ones given.
- `density`, `onDensityChange`: `'comfortable'` (default) or `'compact'`. Compact rows keep every target at least 24px tall ([WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)).

Each has an uncontrolled `default…` form. Showing, hiding or reordering a column doesn't animate the table: it's a change of layout, not of the record. Each change is announced ("Owner column hidden", "Compact rows").

