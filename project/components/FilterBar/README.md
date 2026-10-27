# FilterBar

Build and change a query as a row of conditions, each edited in place: “Status is In review”, “Assignee is Mara Quist”, “Updated between 1 Oct and 20 Oct”. Click a condition's field, operator or value to change just that part; add one with Add filter; remove one with its ×. Pair it with `DataTable`'s `relevance` so the results filter in place: matches rise, misses sink, and nothing reshuffles.

```tsx
const fields: FilterField[] = [
  { key: 'status', label: 'Status', type: 'enum', options: statuses },
  { key: 'assignee', label: 'Assignee', type: 'enum', options: people, searchable: true },
  { key: 'updated', label: 'Updated', type: 'date' },          // before, after, between
  { key: 'title', label: 'Title', type: 'text' },              // contains, does not contain
];

<FilterBar fields={fields} value={filters} onValueChange={setFilters} match={match} onMatchChange={setMatch} resultCount={visible.length} />
<DataTable rows={rows} relevance={(r) => filters.length ? (matches(r, filters) ? 'match' : 'miss') : undefined} … />
```

The value is local query state, `{ id, field, operator, value }[]`, so there's no pending state: the application decides what each condition means (`matches` above). Dates are ISO `'YYYY-MM-DD'` strings; `between` takes `{ start, end }`.

## Elevation

- **The bar and its conditions** are part of what you're looking at, so they're on the ground: each condition is a plate stamped flush like a Badge, split into segments (field · condition · value · ×).
- **A segment** opens a picker, so it lifts one level when pointed at or open (hover is a promise). Pickers float at level 3, as `Select`'s list does.
- **A condition waiting for its value** keeps that segment as an opening: a small dashed well reading “Choose a value”. **Add filter** is an opening too, a dashed well that deepens to a trench under the pointer.
- **A changed condition** is re-stamped (down 3px, settling), as a Badge whose label changes.
- **Adding** a condition: the field list sinks, then the new condition's value picker rises. The two never move at once.

Without height: the bar is a toolbar named “Filters” (or your `aria-label`); each condition is a group named by its sentence; each segment says what it is and what it does (“Value: In review. Change value”); the remove button names the condition; changes announce the new sentence and, with `resultCount`, the count (“Status is Done. 12 results”). Forced colours: conditions 1px, openings dashed, pickers 2px. `contrast="more"`: a hovered segment gets a 2px slab.

## Keyboard

The bar is one Tab stop (the toolbar pattern): ←/→ move between segments (mirrored in RTL), Home/End go to the ends. Enter, Space or ↓ opens a segment's picker; in a list, ↑/↓, Home/End and Enter choose; Escape closes it and leaves focus on the segment. Delete or Backspace on any segment removes its whole condition; focus moves to the next condition, else the previous, else Add filter. Text and number pickers apply on Enter; a date range applies once it has both ends.

## Props

| Prop | |
|---|---|
| `fields` | `{ key, label, type, options?, searchable?, operators? }`; operators default by type |
| `value`, `onValueChange` | the conditions |
| `match`, `onMatchChange` | `'all'` or `'any'`, shown as a segment once there are two conditions |
| `resultCount` | announced after each change |
| `createId`, `aria-label`, `className` | |

`filterValueText(field, value)` gives a value as words, for your own summaries.

## You provide

What each condition means for your rows, and the results. Saved views and nested groups (A and (B or C)) aren't covered.

## Do and don't

- **Do** pair it with `relevance` so the result set changes in place.
- **Do** keep fields to the handful people actually filter by; a long field list gets a search field automatically past eight.
- **Don't** use it for a one-off search box: that's an `Input` in the table's toolbar.

## Demo and verification

The `FilterBar` section of `build/previews.txt` filters an issue table in place. `node checks/filter-bar.mjs` (from `build/`; `ALT_FIXTURE_ROOT` selects React 19 fixtures) covers the one Tab stop and arrow keys, opening and closing pickers, changing a value and an operator, the announcement with its count, re-stamping, Add filter with its field-then-value sequence and the empty value opening, text and date-range values, Match all/any, removal with focus repair, the paired table's relevance, and 320/960px layouts in four schemes under reduced motion, forced colours and `contrast="more"`.
