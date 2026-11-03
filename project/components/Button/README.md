# Button

Triggers an action. A button is a slab standing on the page: its height is drawn as a visible wall under the face, and that height is its importance.

| Variant | Height | Use |
|---|---|---|
| `primary` | level 2, `wall-2` (4px), `accent` | The one thing this view is for. At most one per view. |
| `secondary` | level 1, `wall-1` (2px), `surface-raised` | Everything else. The default. |
| `ghost` | level 0, flush, no wall | Low-emphasis actions in toolbars, a dialog's cancel, table rows. On hover it rises out of the page with a 2px wall. |
| `danger` | level 2, `wall-2`, `critical` | Irreversible actions, usually confirmed in a Dialog or a HoldButton. |

The wall is the face colour darkened, so it reads in every scheme and with any custom accent. A button stays exactly where it is until the pointer is on it: it doesn't react to an approaching pointer or follow it across its face, because a control that moves on its own reads as something going wrong. Hover raises the face 1px while the wall grows to keep its foot on the ground. Pressing pushes the face all the way down: the wall disappears, the sheen flattens, and on release it settles back up on `ease-settle`. `loading` holds it down with a spinner and ignores clicks. `disabled` has no height at all: flush, on `surface-well`, in `ink-faint`. In high-contrast mode the wall becomes solid ink. The keyboard focus ring wraps the whole slab, face and wall, 4px out, in `accent-ink`.

**You provide:** a label (verb first, sentence case: "Publish changes"), `variant`, `size` (`sm` 30px, `md` 36px, `lg` 44px), optional `leading`/`trailing` icons at 16px. Icon-only buttons take `square` and an `aria-label`.

- Don't put two primary buttons in one view. Promote one, demote the other to secondary.
- Leave room below a row of buttons: the wall extends up to 5px under the face.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Button` as first used in its preview:

```tsx
import { Button } from 'altitude-design';

<Button variant="primary">Publish changes</Button>
```

The full preview, as rendered in Storybook and checked in CI (`col`, `row`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Button, Icons } from 'altitude-design';

export default function App() {
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="col">
      <div className="row">
        <Button variant="primary">Publish changes</Button>
        <Button>Preview</Button>
        <Button variant="ghost">Cancel</Button>
        <Button variant="danger">Delete project</Button>
      </div>
      <div className="row">
        <Button variant="primary" size="sm">Small</Button>
        <Button variant="primary" size="lg">Large</Button>
        <Button square aria-label="Close"><Icons.X /></Button>
        <Button variant="primary" loading={busy} onClick={() => { setBusy(true); setTimeout(() => setBusy(false), 1600); }}>Save</Button>
        <Button disabled>Disabled</Button>
      </div>
      <p className="cap">Primary rests at level 2, secondary at 1, ghost at 0. Hover climbs one level; pressing returns to the ground. Click Save: a loading button stays pressed.</p>
    </div>
  );
}
```
<!-- /example -->
