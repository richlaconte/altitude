# Popover

Shows rich, interactive content anchored to a trigger, floating at level 3.

It grows from the trigger's edge (`transform-origin` on that side), rising 6px from 96% scale while its shadow climbs to `elev-3`. Focus moves to the first control inside; Escape or a click outside closes it and returns focus to the trigger.

**You provide:** `trigger` (a Button), children (padding is `space-4`), `side`, `align`, an `aria-label`, and `open`/`onOpenChange` if you need control.

- Do use it for small forms and pickers that belong to one control.
- Don't use it for a decision that blocks the page; that's a Dialog.
