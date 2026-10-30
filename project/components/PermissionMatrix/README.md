# PermissionMatrix

Roles against permissions: "Admins can manage billing, Members can invite, Viewers can only read". The same grid serves notification preferences (events against channels).

**Elevation.** The grid is settled: the record of who can do what, on the ground with `line` dividers.
- **An editable grant is a choice**, built like a `Checkbox`: an empty trench that the accent pours into when granted.
- **An inherited or fixed grant is already decided**, so it's a flush stamped check (or a dash when not granted), muted, like a done `Checklist` item. It's pressed into the record, not drawn as a disabled checkbox, because it isn't unavailable. A `locked` role (an owner) has every permission, stamped.
- **The active cell** is a 2px `accent-ink` ring, never a height, as in `DataGrid`.
- **Saving:** a toggled cell whose `onChange` returns a promise hovers as pending until it settles, then takes the afterglow. A rejection reverts it.

**Accessibility.** The [grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) with checkbox cells. Arrow keys move, Home and End go along the row, Ctrl+Home and Ctrl+End go to the corners, and Space or Enter toggles. Each cell reads "Manage billing, Admin, checked". A stamped cell is `aria-readonly` and says why ("Granted, inherited from Everyone", "Always granted to Owner"): it's reachable, and toggling it says it can't be changed here. Changes are announced ("Create projects granted to Viewer"). Group headings head their rows. Under forced colours the ring is `Highlight` and stamped cells keep their glyph. Under `contrast="more"` the ring is 3px.

**Props:** `roles` (`{ id, name, locked? }[]`); `permissions` (`{ id, name, group? }[]`); `value` (`{ [roleId]: { [permissionId]: boolean } }`); `inherited(roleId, permissionId)` (→ `{ granted, from }` or undefined); `onChange(roleId, permissionId, granted)` (may return a promise); `aria-label`.

**You provide:** the roles, the permissions, who has what, and where inherited grants come from.

```tsx
<PermissionMatrix aria-label="Role permissions"
  roles={[{ id: 'owner', name: 'Owner', locked: true }, { id: 'admin', name: 'Admin' }]}
  permissions={[{ id: 'billing.manage', name: 'Manage billing', group: 'Billing' }]}
  value={grants} inherited={(role, perm) => inheritFrom(role, perm)}
  onChange={(role, perm, granted) => saveGrant(role, perm, granted)} />
```

- Do say where an inherited grant comes from.
- Do return a promise from `onChange` so a cell shows it's saving.
- Don't draw inherited grants as disabled checkboxes.
- Don't lift the active cell; it's a ring.
