# ItemGroup

A list of records shown as slats (media, title, description, actions), changed in the list itself: edit a slat in place, add one at the end, reorder by picking one up, remove one with real recovery. Settings lists (API keys, webhooks, team members), option lists (a form builder's choices) and “add another” sections. It's the Files recipe from [Actions in place](../../ActionsInPlace.md) as a component; the editor is [EditRegion](../EditRegion/README.md).

```tsx
<ItemGroup<Webhook>
  aria-label="Webhooks"
  items={webhooks}
  getKey={(w) => w.id}
  getLabel={(w) => w.name}
  renderItem={(w, { editProps, removeProps }) => (
    <Item>
      <ItemMedia><WebhookIcon /></ItemMedia>
      <ItemContent><ItemTitle>{w.name}</ItemTitle><ItemDescription>{w.url}</ItemDescription></ItemContent>
      <ItemActions>
        <Button size="sm" variant="ghost" {...editProps}>Edit</Button>
        <Button size="sm" variant="ghost" {...removeProps}>Remove</Button>
      </ItemActions>
    </Item>
  )}
  renderEditor={(field) => <>
    <Field label="Name" error={field.error('name')}><Input {...field('name')} /></Field>
    <Field label="Endpoint URL" error={field.error('url')}><Input type="url" {...field('url')} /></Field>
  </>}
  onSave={(draft, { previousValue }) => api.updateWebhook(draft, previousValue.revision)}  // EditRegion's contract
  onItemChange={(w) => setWebhooks((list) => list.map((x) => (x.id === w.id ? w : x)))}
  newItem={() => ({ id: '', name: '', url: 'https://' })}
  onCreate={(draft) => api.createWebhook(draft)}           // { ok: true, value } after items includes it
  addLabel="Add webhook"
  onReorder={(next) => api.reorder(next.map((w) => w.id))}  // shows grips
  onRemove={(w) => api.archiveWebhook(w.id)}
  removal={{ kind: 'recoverable', undo: (w) => api.restoreWebhook(w.id) }}
  empty={<EmptyState size="sm" title="No webhooks yet" />}
/>
```

`removal` has no default, on purpose: say whether removal is recoverable (it happens at once and a raised Alert offers Undo, which calls your real inverse operation and doesn't time out) or needs confirmation (`{ kind: 'confirm', title, description?, confirmLabel? }`: a stationary `Dialog` naming the record, Cancel focused). A danger button doesn't imply irreversibility.

## Elevation

- **Slats** are the record: flush on the ground with `line` dividers, as Table rows, in a plain `ul`. Actions are visible ghost buttons, not hover-only.
- **Editing**: one slat at a time lifts into its EditRegion, a static raised card holding the fields; its neighbours stay flush and readable. Opening another while one is open keeps the first and moves focus back to it.
- **The add slat** is an opening: a dashed well (an `EmptyState`-style button) that deepens to a trench under the pointer or focus. Activating it rises into an empty editor in the same place; once added, the new slat settles with an afterglow and a fresh add slat is ready below.
- **Reordering**: a slat picked up by its grip floats at level 3, tilted, shown where it will land; the slot it leaves opens as a well.
- **Pending** removals and reorders hover at level 2 after `dur-grace`; known failures are a critical Alert, and the list is unchanged.
- **Removed** (recoverable): the slat leaves and a raised Alert offers Undo until dismissed or replaced.

Forced colours: the add slat and slot dashed, the carried slat 2px, pending dotted. `contrast="more"`: the carried slat gets a 3px slab.

## Keyboard and focus

Tab reaches each slat's controls in order. Edit opens the editor and focuses its first field; Enter in a single-line field saves and Escape cancels (EditRegion's rules), and focus returns to that slat's Edit button. Add focuses the new editor; after it's added, focus goes to the fresh add slat, so several can be added in a row. Remove moves focus to the next slat's Remove, else the previous one's, else the add slat or the list. Grips follow SortableList: Space picks up, ↑/↓ move, Space drops, Escape cancels, with positions announced assertively (“Position 2 of 5”). One polite status announces saved, added, removed, restored and errors.

## Props

| Prop | |
|---|---|
| `items`, `getKey`, `getLabel`, `renderItem` | the slats; `renderItem` gets `edit`, `remove`, and `editProps`/`removeProps` to spread onto visible buttons (name, handler, focus repair) |
| `renderEditor`, `onSave`, `onItemChange` | the editor's fields; EditRegion's save contract; publish the canonical record |
| `newItem`, `onCreate`, `addLabel` | the add slat |
| `onReorder` | grips; resolve after `items` is in the new order |
| `onRemove`, `removal` | removal and its stated recovery policy |
| `empty`, `aria-label`, `aria-labelledby` | |

Parts: `Item`, `ItemMedia` (`variant` icon, image or avatar), `ItemContent`, `ItemTitle`, `ItemDescription`, `ItemActions`, `ItemSeparator`.

## You provide

The records, the writes and their concurrency guards, and the recovery policy and its inverse operation. Pointer reordering, multi-select and bulk actions aren't covered yet.

## Do and don't

- **Do** state the removal policy honestly; offer Undo only when you can really reverse it.
- **Do** keep the editor short; past about five fields, open the record in a `Sheet`.
- **Don't** hide Edit and Remove behind hover or a “…” menu when there are only one or two.

## Demo and verification

The `ItemGroup` section of `build/previews.txt` shows webhooks (edit, add, reorder, recoverable removal) and a form builder's answer options (empty state, confirmed removal). `node checks/item-group.mjs` (from `build/`; `ALT_FIXTURE_ROOT` selects React 19 fixtures) covers editing and focus return, one editor at a time, adding with field errors and several in a row, removal with focus repair and Undo, keyboard reordering with cancel, confirmed removal with Cancel focused, the empty state, and 320/960px layouts in four schemes under reduced motion, forced colours and `contrast="more"`.
