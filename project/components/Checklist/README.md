# Checklist

A list you write into, one line per item: to-dos, acceptance criteria, a packing list, a runbook's steps. Enter makes the next item, Backspace on an empty item removes it, Tab nests it, and each item has a checkbox. It's the keyboard-first counterpart to a list of structured records: here an item is its text, and the list is edited the way people write, with the outliner conventions of Workflowy, Logseq, Things, Notion and GitHub task lists.

```tsx
<Checklist<Task>
  aria-label="Launch tasks"
  items={tasks}                       // { id, text, done, children? }
  getKey={(t) => t.id}
  getText={(t) => t.text}
  isDone={(t) => t.done}
  getChildren={(t) => t.children}
  nested
  onChange={(op) => { setTasks((list) => apply(list, op)); return api.applyChecklistOp(op); }}
  onUndo={(op) => setTasks((list) => revert(list, op))}
/>
```

Each action reaches `onChange` as one op (`add`, `edit`, `toggle`, `remove`, `move`, `indent`, `outdent`), so persistence can be granular and collaborators' edits merge per item. Apply the op to `items` synchronously (the line you're writing in must not wait on the network), then return `{ ok: true }`, nothing, or `{ ok: false, error }`, synchronously or as a promise. A failure marks the item and offers Retry on the line; the text stays. New items get ids from `createId` (default a random UUID), so you can insert them at once.

## No Save button, on purpose

`InlineEdit` and `EditRegion` have an explicit Save, and blur does nothing. A checklist where every line needs Save isn't a checklist, so here **the line is the editor and it commits when you leave it**: Enter, ↑/↓, Tab, Escape, a click elsewhere. Scoped to this component, it's an explicit act on a single field, and a refused change keeps the text in place with Retry, so nothing is lost silently.

## Elevation

- **Items** are the record, flush on the ground. The line is a plain text input with a focus ring, not a raised editor.
- **The last line** (“Add an item”) is an opening: a well while it's focused or holds text, dashed in forced colours.
- **The checkbox** is `Checkbox`: an empty trench, then the accent pours in with a raised mark.
- **Done** is pressed into the record: the text goes `ink-muted` with a strike drawn left to right, and the item stays in place (or, with `sortDone`, goes after the open ones).
- **A new item** opens as a well under the line (`ease-sink`). **Pending** writes hover at level 2 after `dur-grace`; a **failed** one drops to a trench with a critical rim and Retry.
- **Removed**: the line glides shut where it was (`dur-travel-2`, `ease-glide`) while the caret is already on the line above. There's no receipt and no hold: removal only happens from the keyboard, on an empty line or by merging a line's text into the one above, so nothing was lost. Undo is Ctrl+Z (⌘Z on Apple platforms) through `onUndo`, and the polite announcement says so: “Empty item removed. Undo with Ctrl+Z.” Nothing is added after the list. Under reduced motion the line closes at once.

Without height: nested `ul`s carry the structure; each checkbox is named by its item; done items say “done”; the list's description lists the keys; a polite status announces indents, moves, removals and errors. `contrast="more"`: the open well gets a solid inner top edge.

## Keyboard (while writing a line)

| Key | |
|---|---|
| Enter | split at the caret: the text after it becomes the next item (at the end: a new empty item) |
| Backspace at the start | on an empty item: remove it and go to the end of the line above. Otherwise merge into the line above, caret at the join |
| Tab / Shift+Tab | indent under the item above / outdent (only with `nested`) |
| Escape | leave the line and focus the item; Tab then moves on, so the list never traps focus |
| ↑ / ↓ | the line above / below, keeping the caret's position |
| Alt+↑ / Alt+↓ | move the item among its siblings |
| Ctrl/Cmd+Enter | check or uncheck it |
| Ctrl/Cmd+Z | undo the last add, remove, move or indent, through `onUndo` |

Nothing acts during IME composition. Pasting several lines adds one item per line; GitHub task-list markers (`- [ ]`, `- [x]`) and, with `nested`, two-space indentation are read.

## Props

| Prop | |
|---|---|
| `items`, `getKey`, `getText`, `isDone`, `getChildren` | the nested data |
| `nested`, `sortDone` | allow Tab nesting (default false); show done items last (default false) |
| `onChange`, `onUndo`, `createId` | the ops, their reversal, and ids for new items |
| `placeholder`, `disabled`, `aria-label`, `aria-labelledby` | |

## You provide

The items, applying and persisting each op, and reversing ops for Undo.

## Do and don't

- **Do** use it when items are just text. When each item is a record with several fields, use a list of records with its own editor.
- **Don't** use it for long-form text; a line is one line.

## Demo and verification

The `Checklist` section of `build/previews.txt` shows nested launch tasks (a fictional service refuses “TBD”) and a flat packing list with `sortDone`. `node checks/checklist.mjs` (from `build/`; `ALT_FIXTURE_ROOT` selects React 19 fixtures) covers Enter, split and merge at the caret, Backspace on an empty line, Tab and Shift+Tab, Escape then Tab, ↑/↓, Alt+↑, Ctrl+Enter, IME Enter, a refused edit with Retry, remove and Ctrl+Z, the add line, task-list paste, `sortDone`, and 320/960px layouts in both schemes under reduced motion, forced colours and `contrast="more"`.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Checklist` as first used in its preview:

```tsx
import { Checklist } from 'altitude-design';

<Checklist aria-labelledby="cl-launch" nested {...props} {...launch} />
```

The full preview, as rendered in Storybook and checked in CI (`cl-demo` is the preview page's own layout class, not Altitude's):

```tsx
import * as React from 'react';
import { Checklist } from 'altitude-design';

// A tiny store that applies the Checklist's ops to nested items, and reverses them for Undo.
const clStrip = (list, id) => { let found = null; const out = list.filter(x => { if (x.id === id) { found = x; return false; } return true; }).map(x => { if (found || !x.children) return x; const [kids, hit] = clStrip(x.children, id); if (hit) found = hit; return hit ? { ...x, children: kids } : x; }); return [out, found]; };
const clInsert = (list, parentId, index, node) => parentId === null ? [...list.slice(0, index), node, ...list.slice(index)]
  : list.map(x => x.id === parentId ? { ...x, children: [...(x.children || []).slice(0, index), node, ...(x.children || []).slice(index)] } : x.children ? { ...x, children: clInsert(x.children, parentId, index, node) } : x);
const clUpdate = (list, id, patch) => list.map(x => x.id === id ? { ...x, ...patch } : x.children ? { ...x, children: clUpdate(x.children, id, patch) } : x);
const clApply = (list, op) => {
  if (op.type === 'add') return clInsert(list, op.parentId, op.index, { id: op.id, text: op.text, done: op.done });
  if (op.type === 'edit') return clUpdate(list, op.id, { text: op.text });
  if (op.type === 'toggle') return clUpdate(list, op.id, { done: op.done });
  const [rest, node] = clStrip(list, op.id);
  if (op.type === 'remove') return rest;
  return clInsert(rest, op.parentId, op.index, node);
};
function useChecklist(seed, refuse) {
  const [items, setItems] = React.useState(seed);
  const removedNodes = React.useRef(new Map());
  const onChange = op => {
    if (refuse && refuse(op)) return { ok: false, error: refuse(op) };
    if (op.type === 'remove') removedNodes.current.set(op.id, clStrip(items, op.id)[1]);
    setItems(list => clApply(list, op));
  };
  const onUndo = op => setItems(list => {
    if (op.type === 'add') return clStrip(list, op.id)[0];
    if (op.type === 'remove') return clInsert(list, op.parentId, op.index, removedNodes.current.get(op.id));
    const [rest, node] = clStrip(list, op.id); return clInsert(rest, op.from.parentId, op.from.index, node);
  });
  return { items, onChange, onUndo };
}
const CL_LAUNCH = [
  { id: 'venue', text: 'Book the venue', done: true },
  { id: 'invites', text: 'Send invitations', done: false, children: [
    { id: 'list', text: 'Confirm the guest list', done: true }, { id: 'design', text: 'Design the card', done: false } ] },
  { id: 'catering', text: 'Choose catering', done: false },
];
const CL_PACK = [{ id: 'p1', text: 'Passport', done: false }, { id: 'p2', text: 'Charger', done: true }, { id: 'p3', text: 'Rain jacket', done: false }];
export default function App() {
  const launch = useChecklist(CL_LAUNCH, op => op.type === 'edit' && /tbd/i.test(op.text) ? 'Write the task, not “TBD”.' : undefined);
  const pack = useChecklist(CL_PACK);
  const props = { getKey: t => t.id, getText: t => t.text, isDone: t => t.done, getChildren: t => t.children };
  return <div className="cl-demo">
    <section><h3 id="cl-launch">Launch tasks</h3><p>Nested: Tab and Shift+Tab indent and outdent. Backspace on an empty line removes it; Ctrl+Z (⌘Z) brings it back. Writing “TBD” is refused.</p>
      <Checklist aria-labelledby="cl-launch" nested {...props} {...launch} /></section>
    <section><h3 id="cl-pack">Packing</h3><p>Flat, done items last.</p>
      <Checklist aria-labelledby="cl-pack" sortDone {...props} {...pack} placeholder="Add something to pack" /></section>
  </div>;
}
```
<!-- /example -->
