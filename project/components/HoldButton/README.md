# HoldButton

Commits a consequential action by pushing it through the ground: hold until it sinks into a trench.

At rest it's a level-2 button (danger by default). While held, it sinks steadily from its wall into a `trench` over `dur-hold`, while a fuse along its bottom edge burns across in the label colour. Let go early and it springs back on `ease-settle`. A live region says "Keep holding to confirm".

**When the hold completes, it's final.** `onConfirm` is called once, the button settles flat on the ground, shows `doneLabel` and can't be pressed again: the action is now part of the record. It stays focusable (it uses `aria-disabled`, not `disabled`) so keyboard focus isn't lost. For actions that can be repeated, set `repeatable` and the button re-arms after a moment.

This is a design friction: a small, deliberate obstacle in front of an action that's hard to undo, cheaper than a confirmation dialog and harder to trigger by accident than a click.

**You provide:** the label ("Hold to delete"), `onConfirm`, optional `holdingLabel` and `doneLabel` (say what happened: "Project deleted"), `variant` (`danger` or `primary`), `duration` in ms, `repeatable`.

- Use it for destructive or irreversible actions where the person already knows what will happen.
- Don't use it when the consequence needs explaining; that's a `Dialog`.
