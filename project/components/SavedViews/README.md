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
