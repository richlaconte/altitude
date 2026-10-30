# DiffView

What changed between two versions: version history, audit-log detail ("Plan: Pro → Business"), config changes before a deploy, and edits an AI proposes to a document or record.

**Elevation.** Both versions are the record, so it lies flush on the ground with a `line` rim, as `CodeBlock` does. It has no height of its own. **Never colour alone.**
- **Additions** are `positive-soft`, with a `+` sign and "Added" in their name (`<ins>`).
- **Removals** are `critical-soft`, struck through, with a `−` sign and "Removed" (`<del>`).
- **Words that changed** inside a line take a stronger tint. A removal and the addition that replaces it are paired in order, within a block of changed lines.
- **Long unchanged runs** fold behind a lid ("6 unchanged lines"), keeping `context` lines around each change. A single unchanged line is never folded.
- **In `mode="properties"`**, each changed field shows its old value struck through beside the new.

**Restoring a version is a consequential action**, not something the diff does: follow the consequential-action pattern (a confirmation, then a receipt).

**Accessibility.** A `figure` named by its caption, with a summary first ("3 additions, 2 removals", "2 properties changed"). Previous change and Next change move focus from change to change, and so do the `n` and `p` keys while focus is inside. Signs are hidden; "Added" and "Removed" are read. Under forced colours the tints are dropped, and the signs and strike-through carry the meaning. Under `contrast="more"` each changed line gets a 2px edge in its tone.

**Props:** `mode` (`'text' | 'properties'`); `before`, `after` (texts, or records); `fields` (`{ key, label, format? }[]`, for properties); `context` (default 3); `caption`; `hunks` (precomputed line operations for large inputs; `diffLines(before, after)` makes them).

**You provide:** the two versions and a caption that names them.

```tsx
<DiffView caption="Version 4 → 5" before={v4.body} after={v5.body} context={3} />
<DiffView mode="properties" caption="Subscription changed" before={prev} after={next} fields={[{ key: 'plan', label: 'Plan' }]} />
```

- Do say which versions are compared in the caption.
- Do keep a little context around changes, so they can be read.
- Don't show a diff in red and green alone.
- Don't restore from inside the diff without a confirmation.
