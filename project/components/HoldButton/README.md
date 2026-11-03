# HoldButton

Commits a consequential action by pushing it through the ground: hold until it sinks into a trench.

At rest it's a level-2 button (danger by default). While held, it sinks steadily from its wall into a `trench` over `dur-hold`, while a fuse along its bottom edge burns across in the label colour. Let go early and it springs back on `ease-settle`. A live region says "Keep holding to confirm".

**When the hold completes, it's final.** `onConfirm` is called once, the button settles flat on the ground, shows `doneLabel` and can't be pressed again: the action is now part of the record. It stays focusable (it uses `aria-disabled`, not `disabled`) so keyboard focus isn't lost. For actions that can be repeated, set `repeatable` and the button re-arms after a moment.

**It never changes width.** Its label, `holdingLabel` and `doneLabel` are laid out in the same place and only the current one shows, so the button is as wide as the longest of them from the start and nothing beside it moves when it completes.

This is a design friction: a small, deliberate obstacle in front of an action that's hard to undo, cheaper than a confirmation dialog and harder to trigger by accident than a click.

**You provide:** the label ("Hold to delete"), `onConfirm`, optional `holdingLabel` and `doneLabel` (say what happened: "Project deleted"), `variant` (`danger` or `primary`), `duration` in ms, `repeatable`.

- Use it for destructive or irreversible actions where the person already knows what will happen.
- Don't use it when the consequence needs explaining; that's a `Dialog`.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`HoldButton` as first used in its preview:

```tsx
import { HoldButton } from 'altitude-design';

<HoldButton onConfirm={() => {}} holdingLabel="Keep holding…" doneLabel="Project deleted">Hold to delete</HoldButton>
```

The full preview, as rendered in Storybook and checked in CI (`col`, `row`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { HoldButton } from 'altitude-design';

export default function App() {
  const [n, setN] = React.useState(0);
  return (
    <div className="col">
      <div className="row">
        <HoldButton onConfirm={() => {}} holdingLabel="Keep holding…" doneLabel="Project deleted">Hold to delete</HoldButton>
        <HoldButton variant="primary" duration={700} repeatable onConfirm={() => setN(n + 1)} doneLabel="Published">Hold to publish</HoldButton>
      </div>
      <p className="cap">Press and hold (or hold Space). The button sinks below the ground as the fuse burns; let go early and it springs back. Once done it lies flat and can't be pressed again, unless it's <code>repeatable</code> (published {n}×).</p>
    </div>
  );
}
```
<!-- /example -->
