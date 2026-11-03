# Pile

Shows a group of items as a stack. Its thickness says roughly how many; click it and the items fan out over the page.

**Closed.** The top card is raised (level 1). Beneath it sit 0–3 sheets: none for one item, one for 2–3, two for 4–9, three for 10 or more. Thickness is read in bins, so the count badge carries the number. On hover or focus the top lifts and the sheets beneath fan a little, a preview of what's underneath; nothing moves before the pointer is on it.

**Open.** Give the pile `items` and `renderItem` and its top card becomes a toggle. Clicking it (or Enter/Space) slides the items out from under the top card, one after another, into a column that **floats over the page below**: nothing on the page moves. Each item is its own card with its own shadow (`elev-2`, `elev-3` under the pointer); the scroll area itself has none, and its top and bottom edges fade out rather than cutting the shadows off. Click an item to choose it (`onSelect`). Click the top again, press Escape or click anywhere else and the items slide back under. Long piles scroll after `maxHeight`.

**You provide:** `items`, `renderItem(item, { index })`, `onSelect`, the top card's content as children, optionally `getKey`, `maxHeight` and `open`/`onOpenChange` (for example, to close it after a choice). For a pile that only shows quantity, pass `count` instead of `items`.

- Leave room below a pile, or near the bottom of the viewport the list may run off-screen.
- Use piles for collections people triage: review queues, inboxes, stacks of drafts.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Pile` as first used in its preview:

```tsx
import { Pile } from 'altitude-design';

<Pile count={1} className="p"><div className="face"><b>Drafts</b><span>1 document</span></div></Pile>
```

The full preview, as rendered in Storybook and checked in CI (`col`, `piles`, `p`, `face`, `wide`, `doc`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Pile } from 'altitude-design';

const docs = [
  ['Pricing page copy', 'Three tiers, annual toggle, FAQ.', 'Mara · 2h'], ['Onboarding emails', 'Five-step drip for new workspaces.', 'Jon · yesterday'],
  ['Q4 launch plan', 'Milestones, owners and risks.', 'Lena · Mon'], ['Release notes 2.4', 'Faster cold starts, new regions.', 'Sam · Mon'],
  ['Support macros', 'Twelve canned replies, reviewed.', 'Ivy · last week'], ['Brand voice', 'How we sound, with examples.', 'Ada · last week'],
  ['Security review', 'Findings from the October audit.', 'Theo · Oct 2'],
];
export default function App() {
  const [picked, setPicked] = React.useState(null);
  return (
    <div className="col">
      <div className="piles">
        <Pile count={1} className="p"><div className="face"><b>Drafts</b><span>1 document</span></div></Pile>
        <Pile count={3} interactive className="p"><div className="face"><b>Approved</b><span>3 documents</span></div></Pile>
        <Pile items={docs} className="p wide" onSelect={(d) => setPicked(d[0])} defaultOpen maxHeight={300}
          renderItem={([t, d, m]) => <div className="doc"><b>{t}</b><span>{d}</span><small>{m}</small></div>}>
          <div className="face"><b>In review</b><span>{docs.length} documents · click to fan out</span></div>
        </Pile>
      </div>
      <p className="cap">{picked ? `Opened “${picked}”.` : 'One sheet for 2–3 items, two for 4–9, three for 10+; the badge carries the number. Click a pile with items and they fan out over the page below it.'}</p>
    </div>
  );
}
```
<!-- /example -->
