<!--
title: DataTable, DataGrid: a narrow layout, so columns don't squeeze into ellipses
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`DataTable` and `DataGrid`, which must change together because they share the table frame (`.alt-table-wrap`, `.alt-table`, from the `Table` primitive) and a similar column model (`DataTableColumn`, `DataGridColumn`). `FilterBar` and `SavedViews` previews render their results in a `DataTable`. Part of the mobile work ({{01}}, constraints M1, M10).

## What you're trying to do

Read and act on rows on a phone. At 375 CSS px every column gets squeezed into the width instead of keeping a readable width and scrolling:

- `DataGrid`: "Des…", "Mon…", "LMP…"; the Status badges are cut to "Acti", "Pau".
- `DataTable` (the `Table` preview): the Owner column wraps names over two lines and is clipped at the right; `SavedViews` cuts a column off.
- `FilterBar` results: "2026-10-21" wraps over two lines; titles wrap over three.

`.alt-table-wrap` already has `overflow: auto`, so the frame can scroll; the columns just never ask for the width.

## Today

`.alt-table { width: 100%; … }` (`bundle.css:2271`). `DataTableColumn` has `width` (`collections.tsx:193`) but no minimum, no sticky column and no narrow form, and there's no way to say which columns matter most.

## Proposal

```tsx
<DataTable
  columns={[
    { key: 'name', header: 'Name', priority: 1, minWidth: 160, sticky: true },
    { key: 'status', header: 'Status', priority: 1 },
    { key: 'owner', header: 'Owner', priority: 2, minWidth: 120 },
    { key: 'updated', header: 'Updated', priority: 3 },
  ]}
  narrow="scroll"      // 'scroll' (default) | 'stack' | false
/>
```

- **`scroll`**: columns keep `minWidth` (default: their header's width plus padding, and never below the widest of a badge or a date), the table scrolls inside its frame, the `sticky` column stays put with a flush edge line (no shadow: a sticky column isn't live), and an edge fade shows there's more.
- **`stack`**: under `breakpoint-narrow` (480px, container query), each row becomes a stacked record: priority-1 cells as the title line, the others as label/value pairs beneath, row actions in a trailing menu. That's the form `PropertyList` already uses.
- `priority` lets `scroll` hide priority-3 columns first when a `Columns` menu exists.

**Additive?** yes. Columns without `minWidth` get a computed minimum; that changes desktop layouts only where columns were being squeezed already.

## Elevation impact

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| Sticky column | Ground | 0 | `surface-ground` · none | 1px `line` edge |
| Stacked row (narrow) | Ground (rows are the record) | 0 | as a table row | the row's title line; selection keeps its checkbox and `aria-selected` |
| Selected row | as today | as today | as today | as today |

## Motion and accessibility

No new motion. `scroll` keeps table semantics. `stack` keeps them too (`role="table"` with rows and cells, headers repeated as labels via `aria-labelledby`), so a screen reader hears the same thing in both. `DataGrid`'s cell navigation and editing must work in both forms.

## Done when

- [ ] `minWidth`, `sticky`, `priority` and `narrow` on `DataTable` and `DataGrid` columns and props
- [ ] `index.d.ts`, READMEs and 375px sections in `build/previews.txt`
- [ ] `tsc` clean; `shoot.mjs` clean in all four schemes at 960 and 375; `DataGrid` editing checked with `ACT` in both forms
- [ ] `node build.mjs && node previews.mjs` run and committed

Filed by an agent (Claude Opus 5.5) on behalf of @richlaconte. Found during a mobile design research pass over every preview at 375 CSS px.
