# PropertyList

One record's properties as label–value pairs, each editable where it sits: an issue's sidebar (status, assignee, priority, estimate), a customer's details, a settings summary, a “Check your answers” page. It's GOV.UK's summary list and Ant Design's Descriptions, with Linear-style editing: each editable value is an [InlineEdit](../InlineEdit/README.md) with any control, and “Edit all” is one [EditRegion](../EditRegion/README.md).

```tsx
<PropertyList aria-label="Issue details" shortcuts>
  <PropertyListItem label="Status" value={issue.status} shortcut="s"
    renderValue={(s) => <Badge tone={toneFor(s)}>{labelFor(s)}</Badge>}
    editor={(control) => <Select {...control} items={statuses} />} commit="on-choose"
    onSave={(draft) => api.patch(issue.id, { status: draft }, issue.revision)}
    onValueChange={(status) => setIssue({ ...issue, status })} />
  <PropertyListItem label="Priority" value={issue.priority} emptyLabel="Add priority" … />
  <PropertyListItem label="Created" value={formatDate(issue.createdAt)} />      {/* read-only: no onSave */}
</PropertyList>
```

`onSave` makes an item editable, with InlineEdit's whole contract (`editor`, `commit`, `validate`, `required`, `isEqual`, retained input on failure, conflict latching). Without it the value is read-only text.

## Elevation

- **Properties** are the record, on the ground: a `dl`, labels `ink-muted` above (`layout="stacked"`, a sidebar) or beside (`layout="inline"`, a summary, with `line` rules) their values.
- **An editable value** is one plate, the InlineEdit trigger, that lifts one level (`elev-1`) when pointed at, because clicking it opens its editor. Read-only values never lift, so editability shows without a pencil per row (hover is a promise).
- **An unset value** is a small opening: a dashed well, the empty field's treatment at plate size, naming what to add (“Add priority”), so a half-filled record reads at a glance. Setting it fills it.
- **Editing** is InlineEdit's static raised editor in the value's place; with `commit="on-choose"` the picker's list rises from it and there's no Save. Pending, failed and accepted are InlineEdit's.
- **Edit all** (`editAll`) lifts the whole list into one raised `EditRegion`, for records with cross-field rules (a last day on or after the first).

Each editable value is a button named by the label, the value and the verb (“Status: In review. Change status”), as GOV.UK's visually hidden “Change name” guidance asks, so it makes sense out of context. Each change is announced (“Status set to Done”). Forced colours: unset values dashed, the hover plate outlined. `contrast="more"`: the hover plate gets the level-1 ink slab.

## Keyboard

Tab moves through the editable values; Enter or Space opens one, and the editor behaves as InlineEdit (Escape cancels, focus returns to the value). With `shortcuts` on the list, an item's `shortcut` key opens it while focus is in the list and not in a field (`s` for status, as Linear does), and the value announces it with `aria-keyshortcuts`. Shortcuts are off by default: WCAG 2.1.4 asks that single-key shortcuts can be turned off or remapped, so offer a setting before turning them on.

## Props

| | |
|---|---|
| `PropertyList` | `layout` (`'stacked'` or `'inline'`), `shortcuts`, `editAll` (`{ value, onValueChange, onSave, validate?, renderEditor, label? }`), `aria-label`/`aria-labelledby` |
| `PropertyListItem` | `label`, `value`, `renderValue`, `emptyLabel`; editable with `onSave`, `onValueChange`, `editor`, `commit`, `validate`, `required`, `isEqual`, `shortcut` |

InlineEdit gains `trigger="value"` (read mode as one value plate), `emptyLabel` and `shortcut` for this; they're available on their own too.

## You provide

The record and each property's write, and for Edit all the whole-record write and its cross-field rules.

## Do and don't

- **Do** use `emptyLabel` to name what's missing (“Add due date”), not just “Not set”.
- **Do** keep Edit all for records with rules across fields; otherwise edit each property where it sits.
- **Don't** turn on shortcuts without a way to turn them off.

## Demo and verification

The `PropertyList` section of `build/previews.txt` shows an issue sidebar (status, assignee, priority unset, estimate, created) with shortcuts on, and a “Check your answers” summary with an unset phone number and Edit all. `node checks/property-list.mjs` (from `build/`; `ALT_FIXTURE_ROOT` selects React 19 fixtures) covers the `dl` structure, value buttons and their names, read-only text, unset openings, on-choose saves and announcements, filling an unset value, validation and Escape, shortcuts, Edit all with a cross-field rule and focus return, and 320/960px layouts in four schemes under reduced motion, forced colours and `contrast="more"`.
