# DataGrid

A table whose cells you edit one by one, with spreadsheet keys: arrows to move, type to replace, Enter or F2 to edit, Enter and Tab to save and move on, Escape to back out, a block pasted from a spreadsheet. For bulk entry and correction (prices, stock, schedules, mappings), where opening a form per row is the slowest path.

**Use `DataTable` instead** when cells aren't edited one by one: its rows are records you select, sort, filter and open, and it's a table, not a grid. DataGrid changes the semantics (`role="grid"`, one Tab stop, roving cell focus), so it's a sibling, not a mode.

```tsx
<DataGrid<Product>
  aria-label="Inventory"
  rows={products}
  getRowId={(p) => p.id}
  getRowLabel={(p) => p.name}
  columns={[
    { key: 'name', header: 'Name', editable: true, validate: (v) => v.trim() ? undefined : 'Enter a name.' },
    { key: 'sku', header: 'SKU' },                                                   // read-only
    { key: 'stock', header: 'Stock', align: 'end', editable: true, parse: Number, validate: (n) => n >= 0 ? undefined : 'Use 0 or more.' },
    { key: 'status', header: 'Status', editable: true, cell: (p) => <Badge>{p.status}</Badge>,
      editor: (control) => <Select {...control} items={statuses} defaultOpen /> },
  ]}
  onCellSave={async ({ rowId, key, draft }) => { const r = await api.patch(rowId, { [key]: draft }); if (r.ok) setProducts(r.all); return r; }}
  onCellsSave={async (changes) => { const r = await api.batchPatch(changes); if (r.ok) setProducts(r.all); return r; }}
  onUndo={(last) => revert(last)}
/>
```

Writes follow the `InlineEdit` contract: resolve `{ ok: true }` after `rows` carries the canonical value, or `{ ok: false, error }`. `onCellsSave` takes a paste or a cleared range as one batch; without it, each cell goes through `onCellSave`. `onUndo` receives the last committed change (or batch); there's no client-side snapshot.

Data that arrived from elsewhere (an import, a sync) may already break a column's `validate`. `showInvalid` checks every cell at rest: an invalid value lies in a trench on critical-soft with an alert mark, and its problem is the cell's description, so the work left is visible at a glance and each cell says what's wrong. Fixing the value through `onCellSave` lifts it out.

## Elevation

- **Cells** are the record, flush in Table's rows. The **active cell** is a 2px `accent-ink` ring, not a height; a **range** is an `accent-soft` tint with `aria-selected`, because choosing a target isn't live content.
- **Editable columns** carry a pencil in the header and “editable” in its name. Cells don't lift on hover: a click selects; Enter, F2, typing or a double-click edits.
- **The cell being edited** opens into a well clipped to the cell, with the held rim. An **invalid** value deepens to a trench on `critical-soft`, with its message beside the cell (`role="alert"`, wired by `aria-describedby`).
- **Saving** shows a small raised plate in the cell after `dur-grace`, with `aria-busy`. A **failed** cell drops to a trench with a critical mark, keeps its old value, and reopening it restores the rejected draft. A **landed** value settles; a pasted range settles as one change.
- **A custom editor** (a Select) floats its list at level 3 from inside the cell, and commits on choosing.

Forced colours: the active cell Highlight outline, the range Highlight, the editing cell dashed (thicker when invalid), pending dotted, failed dashed. `contrast="more"`: the editing well gets the solid inner top edge.

## Keyboard

The APG grid, with spreadsheet editing:

| Mode | Key | |
|---|---|---|
| Navigation | arrows | one cell (mirrored in RTL); Shift extends a range |
| | Home / End, Ctrl+Home / Ctrl+End | row ends; grid corners |
| | PageUp / PageDown | ten rows |
| | Enter, F2, or a character | edit (a character replaces the value) |
| | Delete / Backspace | clear the cell or range, as one change that can be refused |
| | Ctrl/Cmd+C, Ctrl/Cmd+V | copy the range as tab-separated text; paste a block from the active cell |
| | Ctrl/Cmd+Z | `onUndo` with the last change |
| Editing | Enter / Shift+Enter | save and move down / up |
| | Tab / Shift+Tab | save and move right / left |
| | Escape | discard the draft |

Clicking another cell saves the open one and moves there, as in a spreadsheet; moving focus out of the grid keeps the draft open and marks it “Not saved yet”, rather than saving or discarding it. Nothing acts during IME composition. Announcements are batched: “Saved”, “4 cells saved”, “1 cell couldn't be saved: Price must be at least 0”, “3 by 4 cells selected”.

## Props

| Prop | |
|---|---|
| `rows`, `getRowId`, `getRowLabel` | the data; the row label names each cell's editor (“Price, Desk lamp”) |
| `columns` | `{ key, header, label?, align?, editable?, parse?, format?, validate?, cell?, editor?, width? }` |
| `onCellSave`, `onCellsSave`, `onUndo` | the writes and their reversal |
| `maxHeight`, `aria-label`, `aria-labelledby` | |

## You provide

The rows, the writes and their concurrency guards, and undo. Virtualisation, a fill handle and row creation aren't covered yet.

## Do and don't

- **Do** validate in the column, so a bad value never leaves the cell.
- **Do** give every row a label people would say, for the cell names.
- **Don't** use it for records people mostly read, select or open: that's `DataTable`.

## Demo and verification

The `DataGrid` section of `build/previews.txt` is an inventory grid: the fictional service locks the Desk lamp's price, prices must be 0 or more, and Status uses a Select. `node checks/data-grid.mjs` (from `build/`; `ALT_FIXTURE_ROOT` selects React 19 fixtures) covers the grid keys, type-to-replace, Enter, Tab, F2, Escape, validation, IME Enter, click-to-commit, a refused save and its retry draft, read-only cells, ranges, copy, clearing a range, undo, a paste with one invalid cell, the Select column, and 320/960px layouts in both schemes under reduced motion, forced colours and `contrast="more"`.
**On a phone.** Under 480px of the frame's width, columns keep at least 6rem (or their `minWidth`) and the table scrolls inside its frame, fading the edge with more columns, instead of squeezing cells. `sticky: true` keeps a column in view over a flush 1px edge. Wide, nothing changes.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`DataGrid` as first used in its preview:

```tsx
import { Badge, DataGrid, Select } from 'altitude-design';

<DataGrid aria-label="Inventory" rows={rows} getRowId={r => r.id} getRowLabel={r => r.name}
  columns={[
    { key: 'name', header: 'Name', editable: true, validate: v => String(v).trim() ? undefined : 'Enter a name.' },
    { key: 'sku', header: 'SKU' },
    { key: 'price', header: 'Price', align: 'end', editable: true, parse: t => t.trim() === '' ? '' : Number(t), format: dgMoney,
      validate: v => v === '' || !Number.isFinite(v) || v < 0 ? 'Use a price of 0 or more.' : undefined, cell: r => `$${r.price}` },
    { key: 'stock', header: 'Stock', align: 'end', editable: true, parse: t => t.trim() === '' ? 0 : Number(t), format: dgMoney,
      validate: v => Number.isInteger(v) && v >= 0 ? undefined : 'Use a whole number, 0 or more.' },
    { key: 'status', header: 'Status', editable: true, format: v => DG_STATUS.find(s => s.value === v)?.label ?? '',
      cell: r => <Badge tone={r.status === 'active' ? 'positive' : r.status === 'paused' ? 'caution' : 'neutral'}>{DG_STATUS.find(s => s.value === r.status).label}</Badge>,
      editor: control => <Select {...control} items={DG_STATUS} size="sm" defaultOpen /> },
  ]}
  onCellSave={async change => {
    await dgWait(250);
    // The demo service locks the lamp's price during a sale.
    if (change.rowId === 'p1' && change.key === 'price') return { ok: false, error: 'The Desk lamp price is locked during the sale.' };
    apply([change]); return { ok: true };
  }}
  onCellsSave={async changes => { await dgWait(300); apply(changes); return { ok: true }; }}
  onUndo={last => apply(last.map(c => ({ ...c, draft: c.previousValue })))} />
```

The full preview, as rendered in Storybook and checked in CI (`dg-demo` is the preview page's own layout class, not Altitude's):

```tsx
import * as React from 'react';
import { Badge, DataGrid, Select } from 'altitude-design';

const DG_STATUS = [{ value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }, { value: 'retired', label: 'Retired' }];
const DG_SEED = [
  { id: 'p1', name: 'Desk lamp', sku: 'LMP-204', price: 49, stock: 120, status: 'active' },
  { id: 'p2', name: 'Monitor arm', sku: 'ARM-310', price: 89, stock: 34, status: 'active' },
  { id: 'p3', name: 'Cable tray', sku: 'TRY-118', price: 24, stock: 0, status: 'paused' },
  { id: 'p4', name: 'Footrest', sku: 'FTR-052', price: 39, stock: 58, status: 'active' },
  { id: 'p5', name: 'Laptop stand', sku: 'STD-077', price: 59, stock: 12, status: 'retired' },
];
const dgWait = ms => new Promise(resolve => setTimeout(resolve, ms));
const dgMoney = v => v === '' || v === null || v === undefined ? '' : String(v);
export default function App() {
  const [rows, setRows] = React.useState(DG_SEED);
  const apply = changes => setRows(list => list.map(row => changes.reduce((r, c) => c.rowId === r.id ? { ...r, [c.key]: c.draft } : r, row)));
  return <div className="dg-demo">
    <DataGrid aria-label="Inventory" rows={rows} getRowId={r => r.id} getRowLabel={r => r.name}
      columns={[
        { key: 'name', header: 'Name', editable: true, validate: v => String(v).trim() ? undefined : 'Enter a name.' },
        { key: 'sku', header: 'SKU' },
        { key: 'price', header: 'Price', align: 'end', editable: true, parse: t => t.trim() === '' ? '' : Number(t), format: dgMoney,
          validate: v => v === '' || !Number.isFinite(v) || v < 0 ? 'Use a price of 0 or more.' : undefined, cell: r => `$${r.price}` },
        { key: 'stock', header: 'Stock', align: 'end', editable: true, parse: t => t.trim() === '' ? 0 : Number(t), format: dgMoney,
          validate: v => Number.isInteger(v) && v >= 0 ? undefined : 'Use a whole number, 0 or more.' },
        { key: 'status', header: 'Status', editable: true, format: v => DG_STATUS.find(s => s.value === v)?.label ?? '',
          cell: r => <Badge tone={r.status === 'active' ? 'positive' : r.status === 'paused' ? 'caution' : 'neutral'}>{DG_STATUS.find(s => s.value === r.status).label}</Badge>,
          editor: control => <Select {...control} items={DG_STATUS} size="sm" defaultOpen /> },
      ]}
      onCellSave={async change => {
        await dgWait(250);
        // The demo service locks the lamp's price during a sale.
        if (change.rowId === 'p1' && change.key === 'price') return { ok: false, error: 'The Desk lamp price is locked during the sale.' };
        apply([change]); return { ok: true };
      }}
      onCellsSave={async changes => { await dgWait(300); apply(changes); return { ok: true }; }}
      onUndo={last => apply(last.map(c => ({ ...c, draft: c.previousValue })))} />
    <p>Arrows move, type to replace, Enter or F2 to edit, Tab and Enter save and move. Shift+arrows select; copy and paste a block from a spreadsheet. Ctrl+Z undoes.</p>
  </div>;
}
```
<!-- /example -->
