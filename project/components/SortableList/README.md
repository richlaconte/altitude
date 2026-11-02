# SortableList

Reorders a list by picking items up: the item you hold floats in your hand, the slot it will land in opens, and it lands.

Pressing and dragging an item lifts it to level 3 (floating surface, `elev-3`), scales it 1.5% and tilts it half a degree; the others glide aside on `ease-settle`, and a well opens where it will land. Releasing animates it into place (FLIP) while its shadow falls back to `elev-1`. Keyboard: focus an item, press Space to pick it up, arrow keys to move it, Space to drop, Escape to cancel; every move is announced.

**On touch.** A swipe on a row scrolls; a press-and-hold picks it up, and the grip picks it up at once. A mouse drag needs no hold.

**You provide:** `items`, `getKey`, `onReorder` (receives the new array), `renderItem` (the row content; the row itself and its grip are drawn for you), `getLabel` for announcements, `aria-label`.

- Do keep rows short and uniform; the slot is sized to the item being moved.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`SortableList` as first used in its preview:

```tsx
import { Badge, SortableList } from 'altitude-design';

<SortableList aria-label="Priorities" items={items} getKey={(i) => i.id} getLabel={(i) => i.t} onReorder={setItems}
  renderItem={(i) => <div className="it">{i.t}<Badge tone={i.p === 'High' ? 'critical' : i.p === 'Med' ? 'caution' : 'neutral'}>{i.p}</Badge></div>} />
```

The full preview, as rendered in Storybook and checked in CI (`col`, `wrap`, `it`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Badge, SortableList } from 'altitude-design';

export default function App() {
  const [items, setItems] = React.useState([
    { id: 'a', t: 'Write release notes', p: 'High' }, { id: 'b', t: 'Review pricing copy', p: 'Med' },
    { id: 'c', t: 'Fix cold-start regression', p: 'High' }, { id: 'd', t: 'Update onboarding emails', p: 'Low' }, { id: 'e', t: 'Plan Q1 roadmap', p: 'Med' },
  ]);
  return (
    <div className="col wrap">
      <SortableList aria-label="Priorities" items={items} getKey={(i) => i.id} getLabel={(i) => i.t} onReorder={setItems}
        renderItem={(i) => <div className="it">{i.t}<Badge tone={i.p === 'High' ? 'critical' : i.p === 'Med' ? 'caution' : 'neutral'}>{i.p}</Badge></div>} />
      <p className="cap">Drag, or focus a row and press Space, then the arrow keys.</p>
    </div>
  );
}
```
<!-- /example -->
