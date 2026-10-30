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

Only one node is in the Tab sequence. `TreeHandle.startCreate(parentId, index?)` and `startRename(id)` give pointer users the same actions from a toolbar.

## Props

| Prop | |
|---|---|
| `items`, `getKey`, `getLabel`, `getChildren`, `hasChildren`, `loadChildren` | the nested data; `hasChildren` shows a chevron before children are loaded; `loadChildren` is called on the first expand |
| `expanded`, `defaultExpanded`, `onExpandedChange` | open nodes, by key |
| `selectionMode`, `selected`, `defaultSelected`, `onSelectedChange` | `'single'` (default) or `'none'` |
| `onAction`, `renderItem` | Enter's action; draw a node's label |
| `onRename`, `onMove`, `canDrop`, `onCreate`, `onRemove` | the writes, as above. `TreeTarget.index` is the place among the children once the node has left its old one |

## You provide

The data, the writes and their concurrency guards, and the removal policy (recovery or confirmation, as in Actions in place). Multi-node carrying isn't supported.

## Do and don't

- **Do** give pointer users a visible “New” and “Rename” (through `TreeHandle`); the keyboard shortcuts aren't discoverable on their own.
- **Do** use `canDrop` to keep pages out of pages that can't hold them.
- **Don't** use a tree for a flat list, or for more than a few levels people need to see at once.

## Demo and verification

The `Tree` section of `build/previews.txt` is a page tree with a toolbar; the demo service rejects names over 40 characters and moves out of Archive. `node checks/tree.mjs` (from `build/`; `ALT_FIXTURE_ROOT` selects React 19 fixtures) covers the APG keys and RTL, rename (cancel, rejection, save), create (sibling and child), keyboard carry (up, down, indent, outdent, cancel, drop, a rejected move, `canDrop`), Alt+↓, Delete with focus repair, pointer carry into a closed node (spring-loaded) and onto a slot, and 320/960px layouts in four schemes under reduced motion, forced colours and `contrast="more"`.
**On touch.** With `onMove`, a swipe on a row scrolls; a press-and-hold picks it up, then a drag moves it.

