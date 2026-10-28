# TagInput

Edit a set of short values in one field: labels on an issue, recipients, skills, keywords, allowed domains. Type and press Enter or comma to add; Backspace twice takes the last one back; each tag has a remove button; Enter, F2 or a double-click edits a tag in place. `Tag` is the same plate on its own, for showing a set outside a field.

```tsx
<Field label="Labels">
  <TagInput
    value={labels}
    onValueChange={setLabels}
    suggestions={allLabels}                          // optional; free entry is allowed unless `restrict`
    max={10}
    normalize={(tag) => tag.trim().toLowerCase()}    // duplicates are compared after this
    validate={(tag) => tag.length <= 24 ? undefined : 'Use 24 characters or fewer.'}
    noun={['label', 'labels']}
  />
</Field>
```

Without `onAdd` and `onRemove` it's a controlled form value. With them, each tag is persisted on its own: `onAdd(tag)` returns `{ ok: true, value }` with the canonical text or `{ ok: false, error }`, the result contract `InlineEdit` uses. The tag waits, pending, until the result. A rejected tag's text comes back to the input with the error so it can be corrected.

## Elevation

- **The field** is an opening, built like `Input`: an empty field shows its back wall (the well). Once it holds a tag its floor rises flush, so the field reads as filled. Invalid fields drop to trench depth on `critical-soft`.
- **A tag** is a label and part of the record, so it's a Badge plate (ground, level 0) stamped flush into the floor. A new tag is stamped in (down 3px, settling), as a Badge is when its label changes.
- **Armed** (the first Backspace on an empty input): the last tag lifts one level (`elev-1`) on a `critical-soft` tint, and the status says “Press Backspace again to remove <tag>”. The second Backspace lifts it off (up 8px, fading), and the gap closes. Typing anything disarms it.
- **Pending** (waiting on `onAdd` or `onRemove`): after `dur-grace` the tag hovers at level 2 (`surface-lifted`, `elev-2`), with `aria-busy`. **Rejected**: the tag drops to a trench with a critical rim; the message is shown and announced.
- **Being edited**: the plate becomes a small well with an input labelled “Edit <tag>”.
- **Suggestions** are the `Combobox` list at level 3, with its ranking and gliding highlight.

Without height: tags are text in a list named by their count; the armed tag is announced; pending tags are `aria-busy`; errors are text wired to the input's `aria-describedby`. Under forced colours tags are 1px outlined, the armed tag is outlined in Highlight, pending dotted, failed thick dashed, and an empty field dashed. Under `contrast="more"` the armed tag gets a 2px ink slab.

## Keyboard

- **In the input** (a `combobox`): Enter or a separator adds what's typed (Enter on an active suggestion adds it); ↓/↑ move through suggestions; Backspace on an empty input arms the last tag, and a second removes it; ← from the start moves to the last tag; Escape closes the list or disarms. Nothing acts during IME composition, and a separator typed as text (a soft keyboard's comma) adds too. A paste containing separators or newlines adds one tag per entry, up to `max`; what doesn't fit stays in the input.
- **On a tag**: the tags are one Tab stop (roving `tabindex`); ←/→ move between them and → from the last returns to the input; Home/End go to the ends. Delete or Backspace removes the tag and focuses the next tag, else the previous, else the input. Enter or F2 edits it in place (Enter saves, Escape cancels); editing is off when `onAdd` or `onRemove` persist tags, because a rename would be two writes.
- **At `max`** the input stays rendered, focused and read-only, and the description says “Limit reached (10).” Focus is never lost.

The remove buttons are for pointers (`tabIndex={-1}`, named “Remove <tag>”); the keyboard path is Delete on the focused tag. One polite status announces “Added design”, “Removed design”, “design is already added.” and errors. The input is described by the count and the separators (“3 labels. Press comma or Enter to add.”).

## Props

| Prop | |
|---|---|
| `value`, `defaultValue`, `onValueChange` | the tags, a `string[]` |
| `suggestions`, `restrict` | strings or `SelectOption`s offered as you type; with `restrict` only they can be added |
| `separators` | default `[',', 'Enter']`; single characters also split a paste |
| `max`, `validate`, `normalize` | a limit; a per-tag error; applied before validating and comparing (default trim) |
| `onAdd`, `onRemove` | persist one tag at a time (see above) |
| `renderTag`, `noun` | draw a tag's contents; words for the count (default `['tag', 'tags']`) |
| `placeholder`, `id`, `name`, `disabled`, `required`, `invalid`, `size` | as `Combobox`; `name` submits each tag through a hidden input |

`Tag`: `children`, optional `onRemove` (adds a remove button) and `label` (names it when the children aren't text).

## You provide

The set, its policy (what's allowed, the limit, normalizing), and any persistence. TagInput doesn't fetch suggestions; pass the current list.

## Do and don't

- **Do** use it for sets of short, free values. For one value from a list, use `Combobox`; for several from a short fixed list, use `Checkbox`es.
- **Do** normalize (case, spaces) so duplicates are caught.
- **Don't** put long text in tags; a tag is cut at 24 characters with an ellipsis.

## Demo and verification

The `TagInput` section of `build/previews.txt` shows labels (suggestions, a limit of 6, coloured dots), recipients persisted one at a time (a fictional invite service rejects other domains), a disabled set and standalone `Tag`s. `node checks/tag-input.mjs` (from `build/`; `ALT_FIXTURE_ROOT` selects React 19 fixtures) covers adding, suggestions, duplicates, double Backspace, focus after removal, editing, paste splitting, the limit, IME, pending and rejected adds, removal, and 320/960px layouts in four schemes under reduced motion, forced colours and `contrast="more"`.
