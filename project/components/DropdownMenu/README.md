# DropdownMenu

Lists actions for a trigger; one highlight glides between items, which arrive in quick sequence.

The menu rises like a Popover. Items stagger in at 16ms each. A single `accent-soft` highlight (`critical-soft` on a destructive item) follows the pointer or arrow keys on `ease-settle` instead of each row blinking on and off. Arrow keys, Home and End move; Enter selects; Escape and Tab close and return focus.

**On touch.** An item's `shortcut` is shown only where there's likely a keyboard: on a touch-only device it's hidden until a key is pressed in the session. The shortcut still works.

**On a narrow screen.** It opens where its `side` and `align` put it, then shifts sideways to stay 8px inside the screen, and it's never wider than the screen less 16px.

**As a sheet.** `presentation="auto"` (the default) opens the menu as a sheet at the bottom edge on a narrow touch screen (under 640px, with a coarse pointer), where the thumb is: full width less 8px, clear of the safe areas, a head with its `title` (default: the trigger's label) and Close, and 44px rows. It's still the menu, at level 3, with the same keyboard and roles. `"anchored"` or `"sheet"` forces one.

**You provide:** `trigger` (usually a Button with a `ChevronDown` trailing icon) and `items`: actions (`label`, optional `icon`, `shortcut`, `onSelect`, `tone: 'critical'`, `disabled`), `{ type: 'separator' }` and `{ type: 'label', label }`.

**Predicted items.** Mark items you expect the person to want with `predicted: true`. They appear at once; the others fade in over `dur-onset` (500ms). Nothing moves, so the menu stays learnable. In Findlater et al.'s studies this made selection faster than a static menu and than highlighting, but only when predictions were right about four times in five; misses cost a little time. Leave it off unless your predictions are that good.

- Do use `ContextMenu` for the same menu opened where something is right-clicked; the two share one implementation.
- Do use `checked` for an item that turns something on or off: it becomes a `menuitemcheckbox` with a check, and every item keeps a slot for the check so labels line up.
- Do put destructive actions last, after a separator, in `critical`.
