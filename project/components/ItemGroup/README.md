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
- **Reordering**: a slat picked up by its grip floats at level 3, tilted, shown where it will land; the slot it leaves opens as a well. By keyboard: Space picks it up, ↑/↓ carry it, Space drops, Escape puts it back. By pointer (mouse, pen or touch): drag the grip; the slat follows the pointer while the others glide aside, a well opens where its middle would land, and letting go drops it through the same `onReorder`.
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

The records, the writes and their concurrency guards, and the recovery policy and its inverse operation. Multi-select and bulk actions aren't covered yet.

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

It also renders and 320/960px layouts in both schemes under reduced motion, forced colours and `contrast="more"`.
**Narrow.** When the group is under 480px wide, `ItemActions` moves to its own row under the content, so the title keeps its width; `narrow="inline"` keeps the actions beside it. `ItemDescription truncate` (or a number of lines) clamps a long description.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`ItemGroup` as first used in its preview:

```tsx
import { Button, Field, Input, Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from 'altitude-design';

<ItemGroup aria-labelledby="ig-hooks" items={hooks} getKey={h => h.id} getLabel={h => h.name}
  renderItem={(h, { editProps, removeProps }) => <Item>
    <ItemMedia><HookIcon /></ItemMedia>
    <ItemContent><ItemTitle>{h.name}</ItemTitle><ItemDescription className="ig-url">{h.url}</ItemDescription></ItemContent>
    <ItemActions><Button size="sm" variant="ghost" {...editProps}>Edit</Button><Button size="sm" variant="ghost" {...removeProps}>Remove</Button></ItemActions>
  </Item>}
  renderEditor={field => <>
    <Field label="Name" required error={field.error('name')}><Input {...field('name')} /></Field>
    <Field label="Endpoint URL" required error={field.error('url')}><Input {...field('url')} type="url" /></Field>
  </>}
  onSave={async (draft, { previousValue }) => {
    const errors = validate(draft); if (Object.keys(errors).length) return { ok: false, error: 'Check the highlighted fields.', fieldErrors: errors };
    await igWait(300); return { ok: true, value: { ...draft, name: draft.name.trim(), revision: previousValue.revision + 1 } };
  }}
  onItemChange={h => setHooks(list => list.map(x => x.id === h.id ? h : x))}
  newItem={() => ({ id: '', name: '', url: 'https://', revision: 0 })}
  onCreate={async draft => {
    const errors = validate(draft); if (Object.keys(errors).length) return { ok: false, error: 'Check the highlighted fields.', fieldErrors: errors };
    await igWait(300); const hook = { ...draft, id: 'n' + ++seq.current, name: draft.name.trim(), revision: 1 }; setHooks(list => [...list, hook]); return { ok: true, value: hook };
  }}
  addLabel="Add webhook"
  onReorder={async next => { await igWait(200); setHooks(next); }}
  onRemove={async h => { await igWait(200); trash.current.set(h.id, hooks.indexOf(h)); setHooks(list => list.filter(x => x.id !== h.id)); }}
  removal={{ kind: 'recoverable', undo: h => setHooks(list => { const next = [...list]; next.splice(trash.current.get(h.id) ?? next.length, 0, h); return next; }) }} />
```

The full preview, as rendered in Storybook and checked in CI (`ig-demo`, `ig-url` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Button, EmptyState, Field, Input, Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle, Toaster } from 'altitude-design';

const IG_HOOKS = [
  { id: 'h1', name: 'Production', url: 'https://api.verityprint.example/hooks/prod', revision: 1 },
  { id: 'h2', name: 'Staging', url: 'https://staging.verityprint.example/hooks', revision: 1 },
  { id: 'h3', name: 'Billing events', url: 'https://billing.verityprint.example/in', revision: 1 },
];
const igWait = ms => new Promise(resolve => setTimeout(resolve, ms));
const HookIcon = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 4.5a2.5 2.5 0 1 1 3 2.4L7 11" /><path d="M4 12a2.5 2.5 0 1 1 2-4" /><path d="M12 12.5H8" /><circle cx="12" cy="12.5" r="1.5" /></svg>;
export default function App() {
  const [hooks, setHooks] = React.useState(IG_HOOKS);
  const [options, setOptions] = React.useState([]);
  const trash = React.useRef(new Map());
  const seq = React.useRef(0);
  const validate = draft => ({ ...(draft.name.trim() ? {} : { name: 'Enter a name.' }), ...(/^https:\/\/[^\s/]+\.[^\s]+$/.test(draft.url) ? {} : { url: 'Use an https:// address.' }) });
  return <div className="ig-demo">
    <section>
      <h3 id="ig-hooks">Webhooks</h3>
      <ItemGroup aria-labelledby="ig-hooks" items={hooks} getKey={h => h.id} getLabel={h => h.name}
        renderItem={(h, { editProps, removeProps }) => <Item>
          <ItemMedia><HookIcon /></ItemMedia>
          <ItemContent><ItemTitle>{h.name}</ItemTitle><ItemDescription className="ig-url">{h.url}</ItemDescription></ItemContent>
          <ItemActions><Button size="sm" variant="ghost" {...editProps}>Edit</Button><Button size="sm" variant="ghost" {...removeProps}>Remove</Button></ItemActions>
        </Item>}
        renderEditor={field => <>
          <Field label="Name" required error={field.error('name')}><Input {...field('name')} /></Field>
          <Field label="Endpoint URL" required error={field.error('url')}><Input {...field('url')} type="url" /></Field>
        </>}
        onSave={async (draft, { previousValue }) => {
          const errors = validate(draft); if (Object.keys(errors).length) return { ok: false, error: 'Check the highlighted fields.', fieldErrors: errors };
          await igWait(300); return { ok: true, value: { ...draft, name: draft.name.trim(), revision: previousValue.revision + 1 } };
        }}
        onItemChange={h => setHooks(list => list.map(x => x.id === h.id ? h : x))}
        newItem={() => ({ id: '', name: '', url: 'https://', revision: 0 })}
        onCreate={async draft => {
          const errors = validate(draft); if (Object.keys(errors).length) return { ok: false, error: 'Check the highlighted fields.', fieldErrors: errors };
          await igWait(300); const hook = { ...draft, id: 'n' + ++seq.current, name: draft.name.trim(), revision: 1 }; setHooks(list => [...list, hook]); return { ok: true, value: hook };
        }}
        addLabel="Add webhook"
        onReorder={async next => { await igWait(200); setHooks(next); }}
        onRemove={async h => { await igWait(200); trash.current.set(h.id, hooks.indexOf(h)); setHooks(list => list.filter(x => x.id !== h.id)); }}
        removal={{ kind: 'recoverable', undo: h => setHooks(list => { const next = [...list]; next.splice(trash.current.get(h.id) ?? next.length, 0, h); return next; }) }} />
      <Toaster />
    </section>
    <section>
      <h3 id="ig-options">Answer options</h3>
      <ItemGroup aria-labelledby="ig-options" items={options} getKey={o => o.id} getLabel={o => o.label}
        renderItem={(o, { editProps, removeProps }) => <Item><ItemContent><ItemTitle>{o.label}</ItemTitle></ItemContent>
          <ItemActions><Button size="sm" variant="ghost" {...editProps}>Edit</Button><Button size="sm" variant="ghost" {...removeProps}>Delete</Button></ItemActions></Item>}
        renderEditor={field => <Field label="Option" required error={field.error('label')}><Input {...field('label')} /></Field>}
        onItemChange={o => setOptions(list => list.map(x => x.id === o.id ? o : x))}
        newItem={() => ({ id: '', label: '' })}
        onCreate={draft => { if (!draft.label.trim()) return { ok: false, error: 'Enter an option.', fieldErrors: { label: 'Enter an option.' } }; const o = { id: 'o' + ++seq.current, label: draft.label.trim() }; setOptions(list => [...list, o]); return { ok: true, value: o }; }}
        addLabel="Add option" onReorder={setOptions}
        onRemove={o => setOptions(list => list.filter(x => x.id !== o.id))}
        removal={{ kind: 'confirm', title: o => `Delete “${o.label}” permanently?`, description: () => 'Responses that chose it keep their answer, but it can’t be chosen again.', confirmLabel: 'Delete option' }}
        empty={<EmptyState size="sm" title="No options yet" description="Add the answers people can choose from." />} />
    </section>
  </div>;
}
```
<!-- /example -->
