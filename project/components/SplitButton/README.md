# SplitButton

One action with its alternatives: "Save changes ▾" (Save as draft, Save and close), "Merge ▾" (squash, rebase), "Deploy ▾" (to staging, to production).

**Elevation.** It's one pressable action, so it's one slab: **two faces sharing one wall**, parted by a 1px notch (`line-control`, or a mix of `on-accent` into the accent on a primary slab). Each face lifts on its own when pointed at, because each does something different, and each has its own focus ring around its face and wall. The menu floats at level 3 (`DropdownMenu`). Placing a `Button` and a `DropdownMenu` side by side reads as two slabs of different importance. A SplitButton reads as one action with options.

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
