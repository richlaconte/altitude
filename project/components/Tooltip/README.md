# Tooltip

Names an icon-only control or adds a short hint; it floats at level 3 above its anchor.

It opens after `delay` (450ms) on hover or immediately on keyboard focus, rising 4px from the anchor while its shadow grows from `elev-1` to `elev-3` (`dur-travel-3`). After one tooltip closes, neighbours open instantly for 400ms, so moving along a toolbar doesn't make you wait twice. Escape closes it.

**You provide:** `content` (a few words, optionally a shortcut), one focusable child, optionally `side="bottom"`.

- Do use `side="right"` for a rail of icons (a collapsed `Sidebar`), where a tooltip above would cover the next icon.
- Don't put anything interactive in a tooltip, and don't hide essential information in one.
