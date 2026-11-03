# SplitButton

One action with its alternatives: "Save changes ▾" (Save as draft, Save and close), "Merge ▾" (squash, rebase), "Deploy ▾" (to staging, to production).

**Elevation.** It's one pressable action, so it's one slab: **two faces sharing one wall**, parted by a 1px notch (`line-control`, or a mix of `on-accent` into the accent on a primary slab). Being one slab, it moves as one: pointing at either face lifts the whole slab, and pressing either presses it all, so the faces never stand at two heights with a step between them. Which face you're on, and so what a click does, is a tint on that face alone. Each face has its own focus ring around its face and wall. The menu floats at level 3 (`DropdownMenu`). Placing a `Button` and a `DropdownMenu` side by side reads as two slabs of different importance. A SplitButton reads as one action with options.

**Loading.** `loading` holds the action face pressed with its label kept, as a `Button` does. The chevron stays usable.

**Accessibility.** A [button](https://www.w3.org/WAI/ARIA/apg/patterns/button/) and a [menu button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) in a `role="group"` named by the action ("Save changes"). There are two tab stops. Enter or Space on the chevron, or Alt+Down on the action, opens the menu. Name the chevron for what it offers (`menuLabel="More save options"`). Under forced colours each face has a 1px border, and the notch is `CanvasText`.

**Props:** `label`; `variant` (`'primary' | 'secondary'`); `items` (`DropdownMenu` entries); `menuLabel` (default "More options"); `groupLabel` (when `label` isn't plain text); `onClick`, `loading`, `disabled`, `size` and the other `Button` props, which go to the action face.

**You provide:** the default action and its alternatives. The default is what most people want most of the time.

```tsx
<SplitButton variant="primary" label="Save changes" onClick={save} menuLabel="More save options"
  items={[
    { label: 'Save as draft', onSelect: saveDraft },
    { label: 'Save and close', onSelect: saveClose },
  ]} />
```

- Do put the common case on the face and the rest in the menu.
- Do mark a destructive alternative with `tone: 'critical'`.
- Don't hide the default inside the menu, or offer only one alternative (use two buttons).
- Don't nest a SplitButton in a `Toolbar`; its tools are ghosts.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`SplitButton` as first used in its preview:

```tsx
import { SplitButton } from 'altitude-design';

<SplitButton label="Save changes" menuLabel="More save options" onClick={() => setSaid('Saved.')}
  items={[{ label: 'Save as draft', onSelect: () => setSaid('Saved as a draft.') }, { label: 'Save and close', onSelect: () => setSaid('Saved and closed.') }]} />
```

The full preview, as rendered in Storybook and checked in CI (`col`, `row`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { SplitButton } from 'altitude-design';

export default function App() {
  const [said, setSaid] = React.useState('');
  const [deploying, setDeploying] = React.useState(false);
  const deploy = (where) => { setSaid(`Deploying to ${where}…`); setDeploying(true); setTimeout(() => { setDeploying(false); setSaid(`Deployed to ${where}.`); }, 1600); };
  return (
    <div className="col">
      <div className="row">
        <SplitButton label="Save changes" menuLabel="More save options" onClick={() => setSaid('Saved.')}
          items={[{ label: 'Save as draft', onSelect: () => setSaid('Saved as a draft.') }, { label: 'Save and close', onSelect: () => setSaid('Saved and closed.') }]} />
        <SplitButton variant="secondary" label="Merge" menuLabel="More merge options" onClick={() => setSaid('Merged.')}
          items={[{ label: 'Squash and merge', onSelect: () => setSaid('Squashed and merged.') }, { label: 'Rebase and merge', onSelect: () => setSaid('Rebased and merged.') }]} />
        <SplitButton variant="secondary" label="Deploy" menuLabel="More deploy options" loading={deploying} onClick={() => deploy('staging')}
          items={[{ label: 'Deploy to staging', onSelect: () => deploy('staging') }, { label: 'Deploy to production', onSelect: () => deploy('production'), tone: 'critical' }]} />
      </div>
      <p className="cap" role="status">{said || 'Each face lifts on its own. Alt+Down on an action opens its menu. While Deploy is loading, its chevron still works.'}</p>
    </div>
  );
}
```
<!-- /example -->
