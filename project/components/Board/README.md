# Board

Columns of cards you move between, a kanban: columns are receptacles that open when you carry a card, and the card floats in your hand until it lands.

**Elevation: receptacles and a hand.** At rest a board is just its cards: the columns lie flush on the ground, with only their titles and counts to mark them, and the cards are raised (level 1), lifting to level 2 under the pointer. The moment a card is carried, every column opens into a well (things you put something into are openings), and the column under the card deepens to a trench with an accent rim, as a DropZone does when it's ready to receive. The carried card floats at level 3, tilted 1.2° and 1.5% larger, and follows the pointer; the cards around it glide aside (`ease-settle`), and the slot it will land in opens as a trench. Let go and it's carried into the slot with a slight overshoot (`ease-settle`) while its shadow sinks back to `elev-1`, and the columns close up. A move to the column it came from, or nowhere, travels back the same way.

- **A collapsed column is a Pile.** Its thickness (one, two or three sheets) and its count badge say how many cards it holds. It still takes drops: carried over it, it deepens and fans its sheets toward the card, and the card is added to the end.
- **Someone else's hand.** A card a collaborator is holding (`heldBy`) is lifted to level 3, outlined in their presence colour and wears their name; you can't pick it up meanwhile.
- **Afterglow.** `settle` makes a card arrive tinted and lifted, then settle: for cards moved by someone else.
- **A move the server can refuse.** `status` on a `BoardCard` gives it Card's commitment readings. While a move is `pending` the card hovers (level 2 to 3) and is `aria-busy`. When it's `committed` it lands. When it's `failed` it drops into a trench (`critical-soft`, `trench`, a 1px `critical` outline), and stays there until you clear it, usually on its next move. The hover starts after `dur-grace`, so a card dropped as pending first settles from the carry and rises only if the write is still in flight; a fast write never flickers. That's intended, so don't work around it. Where a refused card goes is yours to decide (back where it came from is usual), and so are the words saying why: put them on the card and announce them. A pending card can still be picked up, so a second move while the first is waiting is yours to merge, queue or cancel. Forced colours: dotted while pending, dashed when failed.
- **A change someone proposed.** `proposals` on a `BoardCard` (an assistant's "move this to Backlog", "estimate it at 3 points") puts each proposal on a slip beside the card's face: the change as current struck through, then proposed ("Column ~~In progress~~ ↓ Backlog"), "Proposed by Assistant" (`proposedBy`), then Reject and Accept on their own row. The proposal is the raised thing, not the card: the slip is raised one level (`surface-raised`, `elev-1`, sheen, as PropertyList's proposal), and the card stays at rest in its column, because nothing has been sent. Raising the card would make it look hovered or pending. Accept and Reject are siblings of the face, so pressing them never picks the card up and they're reachable on their own, after the card's tools. While the card is carried the slip is inert. Each proposal's `status` is yours, because an accepted move remounts the card: `applying` lays the slip flush ("Applying…") and makes the card pending; `failed` lays it flush on the card's trench with your `note` after "Not applied:", and offers Retry; `stale` lays it flush and muted with "Out of date:" and your `note`, and offers Dismiss only. A `status` you pass on the card wins over these. Remove a proposal once it's applied, rejected or dismissed: rejected and dismissed ones are announced politely ("Rejected: assign to Lena for Support macros."); saying that an applied change landed is yours, as the words for `status` are. `summary` is the change in words for the buttons' names ("Accept: move to Backlog for Billing emails"). A proposed move doesn't place a ghost in its target column: the slip says where in words. Forced colours: the raised slip has a 1px border.

**Editing in place.** On a board the column you add to is the context, so cards are added and edited where they are, not in a Dialog.

- **Add.** With `onCreate(title)` on a `BoardColumn`, the column ends in an add slot: a dashed well (an opening) named “Add a card to To do”, deepening to a trench under the pointer. Activating it raises it into a new card (static, level 1) holding a “Card title” field. Enter creates the card and leaves a fresh, empty field, so several can be added in a row; Escape, or Enter on an empty field, closes it and returns focus to the slot. A pending card hovers after `dur-grace`; a refused one drops to a trench with its title kept and Retry. Resolve `{ ok: true, value: { id } }` after the card is among the children, or `{ ok: false, error }`. A collapsed column shows no add slot. Announced: “Added Fix login to To do, position 4 of 4.”
- **Rename.** With `onRename(draft)` (InlineEdit's contract) and a `label`, F2 or the card's visible Rename button turns the title into a field, selected. Enter saves, Escape cancels, a refusal keeps the draft with its error, and focus returns to the card. While the field is open, Space and Enter type into it and don't pick the card up; Space and Enter on the card itself still pick it up, so renaming has F2 and a button rather than Enter.
- **Edit fields.** With `value`, `renderEditor(field)` and `onSave` (EditRegion's contract), the card's Edit button grows it into an `EditRegion` in place, and the cards below are pushed down. `onValueChange` publishes the saved record. A card being edited can't be picked up.

**Keyboard and screen readers.** Each column is a `section` named by its title (an `h3`), with its card count. Each card is a `group` named by its `label`, and its first child is its face: a focusable button with `aria-roledescription="draggable card"`, named by the label alone and with instructions attached. What's written on the card and its buttons (Rename, Edit, your own) are the face's siblings, never its children, because a button's children are presentational: nested inside one, a button would fold into the card's name and some screen readers wouldn't reach it. The face lies under the card's content, so a press anywhere on the card picks it up or focuses it, and focusing the card element (`card.focus()`) lands on the face. Space or Enter picks a card up (`aria-pressed` on the face; read it there, as `[data-board-card="id"] > .alt-board-card-face[aria-pressed="true"]`, if your app needs to know a card is still in the hand); ↑ and ↓ move it within its column, ← and → carry it to the next open column; Space drops it; Escape puts it back where it started. Every step is announced in an assertive live region ("Review, position 2 of 3"). A card held by a collaborator says so instead of lifting. Moving focus away puts a held card down where it is. Under reduced motion cards don't travel or tilt; their levels still change. Forced colours dash the open columns and outline the target in Highlight.

| Part | |
|---|---|
| `Board` | `onMove({ cardId, from, to })`, where `from` and `to` are `{ column, index }`; you update your data and the board carries the cards |
| `BoardColumn` | `id`, `title`, `collapsible`, `collapsed`/`defaultCollapsed`/`onCollapsedChange`, `onCreate`, `addLabel` |
| `BoardCard` | `id`, `label` (its name, and for announcements; without one, its first line), `heldBy`, `settle`, `status` (`pending`, `committed`, `failed`), `onRename`, `value`/`renderEditor`/`onSave`/`onValueChange`, `proposals` (each `{ id, label, from?, to, summary?, status?, note?, onAccept, onReject }`), `proposedBy` (default "Assistant"); anything inside it |

**On touch.** A swipe scrolls the board; a press-and-hold picks a card up, then a drag moves it. The card tools are always shown where there's no hover.

**You provide:** the data and an `onMove` that moves the card in it (splice it out of `from.column` at `from.index`, into `to.column` at `to.index`); card content (a title, then a `small` line of detail); short column titles. For proposals: applying the change in `onAccept` (nothing is applied for you), each proposal's `status` while it's applied, and removing it afterwards.

- Do keep buttons and links inside cards: pressing them doesn't pick the card up, and they sit beside the card's face, not in it, so each is reachable and named on its own.
- Do collapse finished columns rather than hiding them; the pile keeps their weight visible.
- Don't use a board for a single list you reorder; that's SortableList.
- Don't move a card to the column a proposal names before it's accepted, and don't raise the card for a proposal: the slip carries it.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Board` as first used in its preview:

```tsx
import { Board, BoardCard, BoardColumn, Field, Input } from 'altitude-design';

<Board onMove={move} aria-label="Launch board">
  {Object.keys(titles).map(k => <BoardColumn key={k} id={k} title={titles[k]} collapsible={k === "done"} defaultCollapsed={k === "done"} onCreate={k === "done" ? undefined : create(k)}>
    {cols[k].map(c => <BoardCard key={c.id} id={c.id} label={c.t} heldBy={c.held} status={writes[c.id]?.status} onRename={rename(k, c.id)} proposals={proposalsFor(c.id)}
      {...(k === "review" ? { value: { title: c.t, meta: c.m }, onValueChange: update(k, c.id),
        renderEditor: field => <><Field label="Title"><Input {...field("title")} size="sm" /></Field><Field label="Details"><Input {...field("meta")} size="sm" /></Field></>,
        onSave: async draft => { await wait(200); return refuse(draft.title) || { ok: true, value: draft }; } } : {})}>
      {c.t}<small>{writes[c.id]?.note ?? c.m}</small>
    </BoardCard>)}
  </BoardColumn>)}
</Board>
```

The full preview, as rendered in Storybook and checked in CI (`col`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Board, BoardCard, BoardColumn, Field, Input, Switch } from 'altitude-design';

const start = {
  todo: [{ id: "c1", t: "Write release notes", m: "Docs \xB7 Jon" }, { id: "c2", t: "Fix cold-start regression", m: "Runtime \xB7 Lena" }, { id: "c3", t: "Plan Q1 roadmap", m: "Planning \xB7 Ada" }],
  doing: [{ id: "c4", t: "Pricing page copy", m: "Marketing \xB7 Mara", held: { name: "Mara", presence: 1 } }, { id: "c5", t: "Support macros", m: "Support \xB7 Ivy" }],
  review: [{ id: "c6", t: "Brand voice", m: "Design \xB7 Ada" }],
  done: Array.from({ length: 12 }, (_, i) => ({ id: "d" + i, t: "Shipped item " + (i + 1), m: "Done" }))
};
const titles = { todo: "To do", doing: "In progress", review: "Review", done: "Done" };
export default function App() {
  const [cols, setCols] = React.useState(start);
  const [last, setLast] = React.useState(null);
  const seq = React.useRef(0);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // Each move is a write the demo server can refuse: the card hovers while it's pending, lands when it's committed,
  // and goes back where it came from, in a trench with the reason, when it's refused.
  const [writes, setWrites] = React.useState({});
  const [failNext, setFailNext] = React.useState(false);
  const fail = React.useRef(false); fail.current = failNext;
  const place = (c, from, to) => {
    const next = Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v.slice()]));
    const [card] = next[from.column].splice(from.index, 1);
    next[to.column].splice(to.index, 0, card);
    return next;
  };
  const move = async ({ cardId, from, to }) => {
    const card = Object.values(cols).flat().find(x => x.id === cardId);
    setCols(c => place(c, from, to));
    setWrites(w => ({ ...w, [cardId]: { status: "pending" } }));
    await wait(700);
    if (fail.current) {
      setFailNext(false);
      setCols(c => place(c, to, from));
      const note = `Couldn’t move it: the server refused. It’s back in ${titles[from.column]}.`;
      setWrites(w => ({ ...w, [cardId]: { status: "failed", note } }));
      setLast(`${card.t}: ${note}`);
      return;
    }
    setWrites(w => ({ ...w, [cardId]: { status: "committed" } }));
    setLast(`Moved: ${card.t} → ${titles[to.column]}.`);
  };
  // The assistant's proposals (#444): raised slips on their cards. Nothing moves until a person accepts; accepting is a
  // write like any other, so it can be refused, and then the slip says so and offers Retry.
  const [proposals, setProposals] = React.useState([
    { id: "p1", card: "c3", label: "Column", from: "To do", to: "In progress", summary: "move to In progress" },
    { id: "p2", card: "c5", label: "Assignee", from: "Ivy", to: "Lena", summary: "assign to Lena" },
    { id: "p3", card: "c6", label: "Estimate", from: "No estimate", to: "3 points", summary: "estimate 3 points", status: "stale", note: "Ada changed this card after it was proposed. Nothing was applied." }
  ]);
  const [failProposal, setFailProposal] = React.useState(false);
  const failP = React.useRef(false); failP.current = failProposal;
  const patch = (id, v) => setProposals(ps => ps.map(x => x.id === id ? { ...x, ...v } : x));
  const accept = p => async () => {
    patch(p.id, { status: "applying", note: undefined });
    await wait(700);
    if (failP.current) { setFailProposal(false); patch(p.id, { status: "failed", note: "the server refused. Nothing was applied." }); return; }
    if (p.label === "Column") setCols(c => { const from = Object.keys(c).find(k => c[k].some(x => x.id === p.card)); return place(c, { column: from, index: c[from].findIndex(x => x.id === p.card) }, { column: "doing", index: c.doing.length }); });
    else setCols(c => ({ ...c, doing: c.doing.map(x => x.id === p.card ? { ...x, m: "Support \xB7 Lena" } : x) }));
    setProposals(ps => ps.filter(x => x.id !== p.id));
    setLast(`Applied: ${p.summary}.`);
  };
  const reject = p => () => { setProposals(ps => ps.filter(x => x.id !== p.id)); setLast(`Rejected: ${p.summary}.`); };
  const proposalsFor = id => proposals.filter(p => p.card === id).map(p => ({ ...p, onAccept: accept(p), onReject: reject(p) }));
  // The demo service refuses titles with “TBD” in them.
  const refuse = t => /tbd/i.test(t) ? { ok: false, error: "Write the task, not \u201cTBD\u201d." } : null;
  const create = k => async t => { await wait(250); const no = refuse(t); if (no) return no; const card = { id: "n" + ++seq.current, t, m: "New" }; setCols(c => ({ ...c, [k]: [...c[k], card] })); return { ok: true, value: { id: card.id } }; };
  const rename = (k, id) => async t => { await wait(200); const no = refuse(t); if (no) return no; setCols(c => ({ ...c, [k]: c[k].map(x => x.id === id ? { ...x, t } : x) })); return { ok: true, value: t }; };
  const update = (k, id) => v => setCols(c => ({ ...c, [k]: c[k].map(x => x.id === id ? { ...x, t: v.title, m: v.meta } : x) }));
  return <div className="col" style={{ gap: 4 }}>
    <Board onMove={move} aria-label="Launch board">
      {Object.keys(titles).map(k => <BoardColumn key={k} id={k} title={titles[k]} collapsible={k === "done"} defaultCollapsed={k === "done"} onCreate={k === "done" ? undefined : create(k)}>
        {cols[k].map(c => <BoardCard key={c.id} id={c.id} label={c.t} heldBy={c.held} status={writes[c.id]?.status} onRename={rename(k, c.id)} proposals={proposalsFor(c.id)}
          {...(k === "review" ? { value: { title: c.t, meta: c.m }, onValueChange: update(k, c.id),
            renderEditor: field => <><Field label="Title"><Input {...field("title")} size="sm" /></Field><Field label="Details"><Input {...field("meta")} size="sm" /></Field></>,
            onSave: async draft => { await wait(200); return refuse(draft.title) || { ok: true, value: draft }; } } : {})}>
          {c.t}<small>{writes[c.id]?.note ?? c.m}</small>
        </BoardCard>)}
      </BoardColumn>)}
    </Board>
    <p className="cap" role="status">{last ?? "Drag a card, or focus one and press Space, then the arrow keys. F2 renames a card; each column adds cards at its foot. Done is collapsed into a pile and still takes cards."}</p>
    <details className="preview-fixtures"><summary>Example fixtures</summary>
      <Switch label="Make the next move fail" checked={failNext} onCheckedChange={setFailNext} />
      <Switch label="Make the next accepted proposal fail" checked={failProposal} onCheckedChange={setFailProposal} />
    </details>
  </div>;
}
```
<!-- /example -->
