# SavedViews and useSavedViews

Named combinations of a filter, a sort and the columns, kept as tabs above a table: "My open deals", "Enterprise churn risk", "Unassigned this week".

**Elevation.** The views are folder `Tabs`: the active tab and the sheet beneath it, which holds the `FilterBar` and the `DataTable`, are one raised piece. **A view you've changed is a draft.** Its tab carries an `accent` dot and "modified" in its name, and Save view (secondary), Save as new view and Reset appear beside the tabs. That's the `SaveBar`'s reading, local to the tab. Switching views uses what's already there: the table's re-sort glide and the filter's relevance motion.

**The hook.** `useSavedViews({ views, defaultViewId, onSave, onCreate })` holds each view's draft (its filters, match, sort, column visibility and order). Switching away and back doesn't lose work. `modified` says when a draft differs from what's saved. Spread `filterBarProps` onto `FilterBar` and `tableProps` onto `DataTable`. `save()` hands `onSave` the view with its changes, `saveAsNew(name)` hands `onCreate` a new view, and `reset()` drops the draft. You store the views.

**Accessibility.** The tabs are `Tabs` (`aria-selected`). "Modified" is part of a changed tab's name, and announced once when the view first diverges. Save as new view asks for a name in a `Popover` with a labelled field. Below 640px the actions sit above the tabs. Under forced colours the dot is `CanvasText`.

**Props.** `useSavedViews(options)` returns `SavedViewsApi`. `SavedViews`: `views` (the API), `children` (the filters and table), `aria-label`. `SavedView` is `{ id, name, filters?, match?, sort?, columnVisibility?, columnOrder? }`.

```tsx
const views = useSavedViews({ views: saved, onSave, onCreate });
<SavedViews views={views} aria-label="Deal views">
  <FilterBar fields={fields} {...views.filterBarProps} />
  <DataTable columns={columns} rows={rows} getRowId={(r) => r.id} {...views.tableProps} />
</SavedViews>
```

- Do let people save a view under their own name.
- Do keep the default view ("All deals") unfiltered.
- Don't save a view on every change; a draft is saved when someone says so.
- Don't use segmented tabs; the views own the table beneath them, so they're folder tabs.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`SavedViews` as first used in its preview:

```tsx
import { DataTable, FilterBar, FormattedNumber, SavedViews } from 'altitude-design';

<SavedViews views={views} aria-label="Deal views">
  <FilterBar fields={fields} {...views.filterBarProps} aria-label="Filter deals" />
  <DataTable aria-label="Deals" rows={deals} getRowId={(r) => r.id} {...views.tableProps} columnsMenu density="compact"
    relevance={(r) => (value.some((f) => f.value !== undefined) ? (matches(r, value, match) ? 'match' : 'miss') : undefined)}
    columns={[{ key: 'name', header: 'Deal', sortValue: (r) => r.name }, { key: 'stage', header: 'Stage', sortValue: (r) => r.stage }, { key: 'owner', header: 'Owner', sortValue: (r) => r.owner },
      { key: 'value', header: 'Value', align: 'end', sortValue: (r) => r.value, cell: (r) => <FormattedNumber value={r.value} format="currency" currency="USD" minorUnits={false} maximumFractionDigits={0} /> }]} />
</SavedViews>
```

The full preview, as rendered in Storybook and checked in CI:

```tsx
import * as React from 'react';
import { DataTable, FilterBar, FormattedNumber, SavedViews, useSavedViews } from 'altitude-design';

const deals = [
  { id: 'd1', name: 'Northwind renewal', stage: 'Negotiation', owner: 'Maya', value: 48000 },
  { id: 'd2', name: 'Globex expansion', stage: 'Proposal', owner: 'Theo', value: 120000 },
  { id: 'd3', name: 'Initech pilot', stage: 'Discovery', owner: 'Maya', value: 9000 },
  { id: 'd4', name: 'Umbrella security', stage: 'Negotiation', owner: 'Ada', value: 76000 },
  { id: 'd5', name: 'Hooli seats', stage: 'Closed won', owner: 'Theo', value: 31000 },
];
const fields = [
  { key: 'stage', label: 'Stage', type: 'enum', options: ['Discovery', 'Proposal', 'Negotiation', 'Closed won'].map((x) => ({ value: x, label: x })) },
  { key: 'owner', label: 'Owner', type: 'enum', options: ['Maya', 'Theo', 'Ada'].map((x) => ({ value: x, label: x })) },
];
const matches = (r, filters, match) => { const t = filters.filter((f) => f.value !== undefined).map((f) => (f.operator === 'is' ? r[f.field] === f.value : r[f.field] !== f.value)); return !t.length || (match === 'any' ? t.some(Boolean) : t.every(Boolean)); };
export default function App() {
  const [saved, setSaved] = React.useState([
    { id: 'all', name: 'All deals', sort: { key: 'value', direction: 'descending' } },
    { id: 'mine', name: 'My open deals', filters: [{ id: 'f1', field: 'owner', operator: 'is', value: 'Maya' }, { id: 'f2', field: 'stage', operator: 'is not', value: 'Closed won' }] },
    { id: 'late', name: 'In negotiation', filters: [{ id: 'f3', field: 'stage', operator: 'is', value: 'Negotiation' }], columnVisibility: { owner: false } },
  ]);
  const views = useSavedViews({ views: saved,
    onSave: (v) => setSaved((xs) => xs.map((x) => (x.id === v.id ? v : x))),
    onCreate: (v) => setSaved((xs) => [...xs, { ...v, id: 'v' + xs.length }]) });
  const { value, match } = views.filterBarProps;
  return (
    <SavedViews views={views} aria-label="Deal views">
      <FilterBar fields={fields} {...views.filterBarProps} aria-label="Filter deals" />
      <DataTable aria-label="Deals" rows={deals} getRowId={(r) => r.id} {...views.tableProps} columnsMenu density="compact"
        relevance={(r) => (value.some((f) => f.value !== undefined) ? (matches(r, value, match) ? 'match' : 'miss') : undefined)}
        columns={[{ key: 'name', header: 'Deal', sortValue: (r) => r.name }, { key: 'stage', header: 'Stage', sortValue: (r) => r.stage }, { key: 'owner', header: 'Owner', sortValue: (r) => r.owner },
          { key: 'value', header: 'Value', align: 'end', sortValue: (r) => r.value, cell: (r) => <FormattedNumber value={r.value} format="currency" currency="USD" minorUnits={false} maximumFractionDigits={0} /> }]} />
    </SavedViews>
  );
}
```
<!-- /example -->
