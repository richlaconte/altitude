# Tree

A hierarchy you see all at once and change in place: rename a node (F2), add a sibling or a child, carry a node to a new place (Space, or drag), collapse and expand, remove. Page trees, file explorers, nested categories, outlines.

Use `Drilldown` instead when people work one level at a time and don't need the siblings of ancestors in view (settings, a mobile hierarchy); use `Accordion` for one level of disclosure.

```tsx
const tree = React.useRef<TreeHandle>(null);

<Tree<Page>
  ref={tree}
  aria-label="Pages"
  items={pages}
  getKey={(p) => p.id}
  getLabel={(p) => p.title}
  getChildren={(p) => p.children}
  hasChildren={(p) => p.kind === 'folder'}
  expanded={expanded} onExpandedChange={setExpanded}
  selected={selected} onSelectedChange={setSelected}
  renderItem={(p) => <><PageIcon />{p.title}</>}
  onRename={async (p, title) => { const r = await api.rename(p.id, title, p.revision); if (r.ok) setPages(r.pages); return r; }}
  onMove={async ({ id, to }) => { const r = await api.move(id, to.parentId, to.index); if (r.ok) setPages(r.pages); return r; }}
  canDrop={({ to }) => to.parentId === null || isFolder(to.parentId)}
  onCreate={async ({ parentId, index, name }) => { const r = await api.create(parentId, index, name); if (r.ok) setPages(r.pages); return r.ok ? { ok: true, value: r.page } : r; }}
  onRemove={(p) => archiveWithUndo(p)}
/>
<Button onClick={() => tree.current?.startCreate(null)}>New page</Button>
```

The tree is controlled by `items`. Each write follows the `InlineEdit` contract: return `{ ok: true }` (for a create, `{ ok: true, value }` with the new item) after `items` reflects the change, or `{ ok: false, error }` for a known failure. A throw or malformed result shows a generic retry message. One write runs at a time.

## Elevation

- **Nodes** are the record: flush rows on the ground, indented `space-4` per level, like `Table` rows. A node lifts one level on hover; the **selected** node is tinted `accent-soft` and raised one level.
- **Expanding** is disclosure of existing records, so it's a chevron turn (`ease-settle`), not a rise. A node whose children are loading shows an imprint row (`loadChildren`).
- **Renaming** sinks the label into a well (InlineEdit's field); an invalid or rejected name drops to a trench on `critical-soft`. A **pending** write hovers at level 2 after `dur-grace`; a **failed** one drops to a trench with a critical rim.
- **Carried** (keyboard): the node floats at level 3, tilted, and is shown where it will land. **Carried** (pointer): a floating copy follows the pointer with the count of what it carries; the top or bottom quarter of a row shows a **slot**, a thin well at the target's depth; the middle of a row opens that node into a **trench with an accent rim** (a critical rim when `canDrop` refuses it). Hovering a closed node for 600ms opens it (spring-loaded).
- **A new node** is named in a well at its insertion point; once added it settles with an afterglow.

Without height: `aria-level`, `aria-setsize`, `aria-posinset`, `aria-expanded`, `aria-selected` and `aria-busy` on every node (a carried node is announced through the live region, since `aria-pressed` isn't allowed on a tree item); moves are announced with their depth (“Moved Logo into Brand, position 1 of 3”). Forced colours: selected 1px Highlight, carried 2px, slots dashed, drop-into 3px dashed, pending dotted, failed thick dashed. `contrast="more"`: the carried node gets a 3px slab.

## Keyboard

The APG tree view, plus editing:

| Key | |
|---|---|
| ↑ / ↓ | previous / next visible node |
| → / ← | expand, or go to the first child / collapse, or go to the parent (mirrored in RTL) |
| Home / End | first / last visible node |
| letters | type-ahead by label |
| `*` | expand every sibling |
| Enter | `onAction`, or select |
| F2 | rename (Enter saves, Escape cancels; IME composition is left alone) |
| Ctrl/Cmd+Enter, Ctrl/Cmd+Shift+Enter | add a sibling after / a child inside |
| Space | pick up (announced): ↑/↓ move between slots, → into the node above, ← out of the parent, Space or Enter drop, Escape cancel. Without `onMove`, Space selects |
| Alt+↑ / Alt+↓ | move one step without picking up |
| Delete | `onRemove`; focus moves to the next node, else the previous |
| Shift+F10, the Menu key | with `rowMenu`: the focused node's actions, first one active; Escape or choosing returns focus to the node |

Only one node is in the Tab sequence. `TreeHandle.startCreate(parentId, index?)` and `startRename(id)` give pointer users the same actions from a toolbar.

## Props

| Prop | |
|---|---|
| `items`, `getKey`, `getLabel`, `getChildren`, `hasChildren`, `loadChildren` | the nested data; `hasChildren` shows a chevron before children are loaded; `loadChildren` is called on the first expand |
| `expanded`, `defaultExpanded`, `onExpandedChange` | open nodes, by key |
| `selectionMode`, `selected`, `defaultSelected`, `onSelectedChange` | `'single'` (default) or `'none'` |
| `onAction`, `renderItem` | Enter's action; draw a node's label |
| `onRename`, `onMove`, `canDrop`, `onCreate`, `onRemove` | the writes, as above. `TreeTarget.index` is the place among the children once the node has left its old one |
| `rowMenu` | `(item) => MenuEntry[]`: a node's actions, opened by right-click, long-press, Shift+F10 or the Menu key. It's `ContextMenu`'s menu (Floating, level 3); the node it belongs to is outlined 2px in `accent-ink`, never lifted, and announces `aria-haspopup="menu"`. On touch with `onMove`, a press-and-hold let go where it began is the long-press (the menu); held and moved, it carries the node. Put only actions that are reachable another way here (F2, Delete, the toolbar) |

## You provide

The data, the writes and their concurrency guards, and the removal policy (recovery or confirmation, as in Actions in place). Multi-node carrying isn't supported.

## Do and don't

- **Do** give pointer users a visible “New” and “Rename” (through `TreeHandle`); the keyboard shortcuts aren't discoverable on their own.
- **Do** use `canDrop` to keep pages out of pages that can't hold them.
- **Don't** use a tree for a flat list, or for more than a few levels people need to see at once.

## Demo and verification

The `Tree` section of `build/previews.txt` is a page tree with a toolbar; the demo service rejects names over 40 characters and moves out of Archive. `node checks/tree.mjs` (from `build/`; `ALT_FIXTURE_ROOT` selects React 19 fixtures) covers the APG keys and RTL, rename (cancel, rejection, save), create (sibling and child), keyboard carry (up, down, indent, outdent, cancel, drop, a rejected move, `canDrop`), Alt+↓, Delete with focus repair, pointer carry into a closed node (spring-loaded) and onto a slot, the row menu (right-click, Shift+F10, the Menu key, a touch long-press, focus return), and 320/960px layouts in both schemes under reduced motion, forced colours and `contrast="more"`.
**On touch.** With `onMove`, a swipe on a row scrolls; a press-and-hold picks it up, then a drag moves it.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Tree` as first used in its preview:

```tsx
import { Tree } from 'altitude-design';

<Tree ref={tree} aria-label="Pages" items={pages} getKey={p => p.id} getLabel={p => p.title} getChildren={p => p.children} hasChildren={p => !!p.children}
  expanded={expanded} onExpandedChange={setExpanded} selected={selected} onSelectedChange={setSelected}
  renderItem={p => <><span className="tree-demo-icon" aria-hidden="true">{p.children ? <FolderIcon /> : <PageIcon />}</span>{p.title}</>}
  onRename={async (page, title) => { await treeWait(250); if (title.length > 40) return { ok: false, error: 'Use 40 characters or fewer.' }; setPages(list => treeRename(list, page.id, title.trim())); return { ok: true }; }}
  canDrop={({ to }) => to.parentId === null || !!treeFind(pages, to.parentId).page.children}
  onMove={async ({ id, to }) => {
    await treeWait(250);
    // The demo service refuses to move anything out of Archive.
    if (treeFind(pages, id).parent === 'archive' && to.parentId !== 'archive') return { ok: false, error: 'Archived pages can’t be moved out of Archive.' };
    setPages(list => { const page = treeFind(list, id).page; return treeInsert(treeRemove(list, id), to.parentId, to.index, page); });
    return { ok: true };
  }}
  onCreate={async ({ parentId, index, name }) => { await treeWait(250); const page = { id: 'new-' + ++seq.current, title: name }; setPages(list => treeInsert(list, parentId, index, page)); return { ok: true, value: page }; }}
  onRemove={page => setPages(list => treeRemove(list, page.id))}
  rowMenu={page => {
    const at = treeFind(pages, page.id);
    return [
      { label: 'Rename', shortcut: 'F2', onSelect: () => tree.current.startRename(page.id) },
      { label: page.children ? 'New page inside' : 'New page after', shortcut: page.children ? 'Ctrl+Shift+Enter' : 'Ctrl+Enter',
        onSelect: () => page.children ? tree.current.startCreate(page.id) : tree.current.startCreate(at.parent, at.index + 1) },
      { type: 'separator' },
      { label: 'Delete', shortcut: 'Delete', tone: 'critical', onSelect: () => setPages(list => treeRemove(list, page.id)) },
    ];
  }} />
```

The full preview, as rendered in Storybook and checked in CI (`tree-demo`, `tree-demo-tools`, `tree-demo-icon`, `tree-demo-panel` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Button, Tree } from 'altitude-design';

const TREE_SEED = [
  { id: 'brand', title: 'Brand', children: [
    { id: 'logo', title: 'Logo usage' }, { id: 'colour', title: 'Colour' }, { id: 'type', title: 'Typography' } ] },
  { id: 'product', title: 'Product', children: [
    { id: 'roadmap', title: 'Roadmap' },
    { id: 'specs', title: 'Specs', children: [{ id: 'search', title: 'Search' }, { id: 'billing', title: 'Billing' }] } ] },
  { id: 'archive', title: 'Archive', children: [] },
  { id: 'handbook', title: 'Team handbook' },
];
const treeWait = ms => new Promise(resolve => setTimeout(resolve, ms));
// Pure helpers over the nested pages: find, remove, insert.
const treeFind = (list, id, parent = null) => { for (const [i, p] of list.entries()) { if (p.id === id) return { page: p, parent, index: i }; const hit = p.children && treeFind(p.children, id, p.id); if (hit) return hit; } return null; };
const treeRemove = (list, id) => list.filter(p => p.id !== id).map(p => p.children ? { ...p, children: treeRemove(p.children, id) } : p);
const treeInsert = (list, parentId, index, page) => parentId === null ? [...list.slice(0, index), page, ...list.slice(index)]
  : list.map(p => p.id === parentId ? { ...p, children: [...(p.children || []).slice(0, index), page, ...(p.children || []).slice(index)] } : p.children ? { ...p, children: treeInsert(p.children, parentId, index, page) } : p);
const treeRename = (list, id, title) => list.map(p => p.id === id ? { ...p, title } : p.children ? { ...p, children: treeRename(p.children, id, title) } : p);
const FolderIcon = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 4.5h4l1.5 1.5H14v6.5H2z" /></svg>;
const PageIcon = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M4 2h5l3 3v9H4z" /><path d="M9 2v3h3" /></svg>;

export default function App() {
  const [pages, setPages] = React.useState(TREE_SEED);
  const [expanded, setExpanded] = React.useState(['brand', 'product']);
  const [selected, setSelected] = React.useState('roadmap');
  const tree = React.useRef(null);
  const seq = React.useRef(0);
  const current = selected && treeFind(pages, selected);
  return <div className="tree-demo">
    <div>
      <div className="tree-demo-tools">
        <Button size="sm" variant="ghost" onClick={() => tree.current.startCreate(current && current.page.children ? current.page.id : current ? current.parent : null)}>New page</Button>
        <Button size="sm" variant="ghost" disabled={!current} onClick={() => tree.current.startRename(selected)}>Rename</Button>
      </div>
      <Tree ref={tree} aria-label="Pages" items={pages} getKey={p => p.id} getLabel={p => p.title} getChildren={p => p.children} hasChildren={p => !!p.children}
        expanded={expanded} onExpandedChange={setExpanded} selected={selected} onSelectedChange={setSelected}
        renderItem={p => <><span className="tree-demo-icon" aria-hidden="true">{p.children ? <FolderIcon /> : <PageIcon />}</span>{p.title}</>}
        onRename={async (page, title) => { await treeWait(250); if (title.length > 40) return { ok: false, error: 'Use 40 characters or fewer.' }; setPages(list => treeRename(list, page.id, title.trim())); return { ok: true }; }}
        canDrop={({ to }) => to.parentId === null || !!treeFind(pages, to.parentId).page.children}
        onMove={async ({ id, to }) => {
          await treeWait(250);
          // The demo service refuses to move anything out of Archive.
          if (treeFind(pages, id).parent === 'archive' && to.parentId !== 'archive') return { ok: false, error: 'Archived pages can’t be moved out of Archive.' };
          setPages(list => { const page = treeFind(list, id).page; return treeInsert(treeRemove(list, id), to.parentId, to.index, page); });
          return { ok: true };
        }}
        onCreate={async ({ parentId, index, name }) => { await treeWait(250); const page = { id: 'new-' + ++seq.current, title: name }; setPages(list => treeInsert(list, parentId, index, page)); return { ok: true, value: page }; }}
        onRemove={page => setPages(list => treeRemove(list, page.id))}
        rowMenu={page => {
          const at = treeFind(pages, page.id);
          return [
            { label: 'Rename', shortcut: 'F2', onSelect: () => tree.current.startRename(page.id) },
            { label: page.children ? 'New page inside' : 'New page after', shortcut: page.children ? 'Ctrl+Shift+Enter' : 'Ctrl+Enter',
              onSelect: () => page.children ? tree.current.startCreate(page.id) : tree.current.startCreate(at.parent, at.index + 1) },
            { type: 'separator' },
            { label: 'Delete', shortcut: 'Delete', tone: 'critical', onSelect: () => setPages(list => treeRemove(list, page.id)) },
          ];
        }} />
    </div>
    <div className="tree-demo-panel" aria-live="polite">
      <h3>{current ? current.page.title : 'No page selected'}</h3>
      <p>F2 renames. Ctrl+Enter adds a page after, Ctrl+Shift+Enter one inside. Space picks a page up: arrows move it, → puts it inside the page above, Space drops. Or drag it onto a folder. Right-click a page, long-press it, or press Shift+F10 for its actions.</p>
    </div>
  </div>;
}
```
<!-- /example -->
