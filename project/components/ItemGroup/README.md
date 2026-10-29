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

`removal` has no default, on purpose: say whether removal is recoverable (it happens at once, and Undo calls your real inverse operation) or needs confirmation (`{ kind: 'confirm', title, description?, confirmLabel? }`: a stationary `Dialog` naming the record, Cancel focused). A danger button doesn't imply irreversibility.

A recoverable removal leaves its result where the slat was, as a [RemovalReceipt](../RemovalReceipt/README.md): “Webhook is removed.” with Undo, at the slat's height, so nothing moves while it's read. After the hold the slot closes, and Undo moves to a toast that the group raises itself. Render a `Toaster` once in your app for it to appear. The toast is a supplement to Undo, not the only route back, so keep a durable recovery route of your own (Archived → Restore).

## Elevation

- **Slats** are the record: flush on the ground with `line` dividers, as Table rows, in a plain `ul`. Actions are visible ghost buttons, not hover-only.
- **Editing**: one slat at a time lifts into its EditRegion, a static raised card holding the fields; its neighbours stay flush and readable. Opening another while one is open keeps the first and moves focus back to it.
- **The add slat** is an opening: a dashed well (an `EmptyState`-style button) that deepens to a trench under the pointer or focus. Activating it rises into an empty editor in the same place; once added, the new slat settles with an afterglow and a fresh add slat is ready below.
- **Reordering**: a slat picked up by its grip floats at level 3, tilted, shown where it will land; the slot it leaves opens as a well.
- **Pending** removals and reorders hover at level 2 after `dur-grace`; known failures are a critical Alert, and the list is unchanged.
- **Removed** (recoverable): once `onRemove` resolves, the slat's contents cross-fade (`dur-travel-2`) to its receipt in the same slot: a check, “<label> is removed.” in `ink-muted` on the ground, and Undo.
  - **The hold.** The receipt holds for `dur-linger`, pausing while it's pointed at or focused and waiting while a mouse is still over the list. Then it lifts off and the gap glides shut (`dur-travel-3`, `ease-glide`). Removals due within 250ms of each other close together.
  - **Undo during the hold.** The slat cross-fades back and settles with an afterglow; nothing moves.
  - **Undo after the close** is in a toast (“<label> is removed.”, Undo). That Undo glides the slot open where it was, then the slat settles. The toast is withdrawn if the item comes back another way.
- **Removed** (confirmed): the slat glides shut where it was instead of vanishing. There's no receipt, because there's nothing to undo.

Forced colours: the add slat and slot dashed, the carried slat 2px, pending dotted, a receipt outlined in `CanvasText`. `contrast="more"`: the carried slat gets a 3px slab.

## Keyboard and focus

Tab reaches each slat's controls in order. Edit opens the editor and focuses its first field; Enter in a single-line field saves and Escape cancels (EditRegion's rules), and focus returns to that slat's Edit button. Add focuses the new editor; after it's added, focus goes to the fresh add slat, so several can be added in a row. Remove moves focus to the next slat's Remove, else the previous one's, else the add slat or the list. A receipt's Undo stays in the tab order while it's held (Shift+Tab reaches it), and the hold doesn't expire while focus is in it. After Undo, focus goes to the restored slat's Remove. Grips follow SortableList: Space picks up, ↑/↓ move, Space drops, Escape cancels, with positions announced assertively (“Position 2 of 5”). One polite status announces saved, added, removed (confirmed), restored and errors. A recoverable removal is announced by its receipt (“<label> is removed. Undo is available.”), not by the status as well, and the toast after the close isn't announced again. Under reduced motion the receipt still fades and holds, and the gap closes at once.

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

The `ItemGroup` section of `build/previews.txt` shows webhooks (edit, add, reorder, recoverable removal) and a form builder's answer options (empty state, confirmed removal). `node checks/item-group.mjs` (from `build/`; `ALT_FIXTURE_ROOT` selects React 19 fixtures) covers editing and focus return, one editor at a time, adding with field errors and several in a row, keyboard reordering with cancel, confirmed removal with Cancel focused, the empty state, and removal. For removal it checks:
- the receipt in place with focus repair and a single announcement, and Undo during the hold, with every frame sampled to show nothing below moves;
- the hold of `dur-linger`, then the gap gliding shut;
- the toast's unannounced Undo gliding the slot back open;
- the hold pausing on focus, several removals closing together, reduced motion, and a confirmed slat gliding shut.

It also renders and 320/960px layouts in four schemes under reduced motion, forced colours and `contrast="more"`.
