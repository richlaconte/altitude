# RemovalReceipt

The slot of an item that can leave its list: a file archived, a webhook removed, an invitation revoked. When the item goes, its result shows in its own slot, at the height it had, so nothing on the page moves while it's read. The slot holds, lifts its receipt off, and only then glides the gap closed. Use it instead of removing the row at once and adding an Alert below the list, which reshapes the page twice and puts the feedback away from where the person acted.

**Left in place, then closed.** With `removed`, the item's content cross-fades (`dur-travel-2`) to the receipt: a check (or, with `tone="critical"`, an alert icon), your `title`, and your `action`. While `pending`, the write isn't confirmed: the receipt shows a spinner in place of the check, the slot hovers as pending only after `dur-grace` (a fast write never flickers), and the hold hasn't started. Once confirmed, the receipt holds for `dur-linger` (2000ms), then lifts off as an Alert does (8px, in 70% of `dur-travel-3`, `ease-sink`), and the gap glides shut (`dur-travel-3`, `ease-glide`). The rows below are pushed by the height, not animated on their own. `onClosed` is called once the gap has closed: drop the item from your list there.

**The hold waits for the person.** It pauses while the receipt is pointed at or focused, and while a modal owns the document. When it's due and a mouse is still over the list (the slot's parent), it waits for the pointer to leave, up to `dur-settle`, so the next row doesn't slide under a pointer reaching for it. Touch has no hover, so on touch it closes when the hold ends. Receipts due within 250ms of each other close together, as one change.

**Why it's on the ground.** The receipt is a trace of what happened to the record, not a live surface, so it doesn't rise for attention: muted ink on the ground. Only its exit lifts off. Pending uses the shared pending signal (`surface-lifted`, `elev-2`, breathing over `dur-hover`). An item brought back from elsewhere (`arrive`) glides its slot open and settles with an afterglow; an item restored while its receipt is still held (`removed` back to false) returns in place with an afterglow.

**Accessibility.** The receipt's text is a polite live region (`role="status"`) present from the slot's first render, so the result is announced when it appears. Put Undo in `action` and name it fully (`aria-label="Undo archive of Brand guidelines.pdf"`). Before the slot closes, focus inside it moves to the first focusable control of the next slot, else the previous one, else `focusFallback()`. Under reduced motion the receipt still fades and holds, nothing travels, and the gap closes at once. Under forced colours the receipt is outlined in `CanvasText`.

**Props:** `removed`; `pending`; `title`; `action`; `tone` (`neutral` | `critical`); `icon`; `hold` (ms, default `dur-linger`); `onClosed`; `focusFallback`; `arrive`; `settle`; `as` (`div` | `li` | `section` | `article`, default `div`). Other props go to the slot's element, and the item's own content (`children`) keeps the slot's layout (its wrapper is `display: contents`).

**You provide:** the item, whether it's removed and whether that's confirmed, the words and the actions, and what happens next. Undo has to call your real inverse operation. After the slot closes, offer Undo in a `toast` if you like, but keep a durable recovery route (Archived → Restore), and withdraw a toast's Undo (`toast.dismiss(id)`) once a newer revision makes it invalid. See [Actions in place](../../ActionsInPlace.md) for the full recipe: pending, failure, conflict, late receipts and focus.

```tsx
<ul>
  {files.map((file) => (
    <RemovalReceipt as="li" key={file.id} removed={!!receipts[file.id]} pending={receipts[file.id]?.pending}
      title={`${file.name} archived.`}
      action={<Button size="sm" aria-label={`Undo archive of ${file.name}`} onClick={() => restore(file)}>Undo</Button>}
      onClosed={() => { dropReceipt(file.id); toast({ title: `${file.name} archived.`, action: { label: 'Undo', onClick: () => restore(file) } }); }}>
      <FileRow file={file} onArchive={() => archive(file)} />
    </RemovalReceipt>
  ))}
</ul>
```

- Do keep the item in its slot until its removal is confirmed; show a failure in the restored row, not somewhere else.
- Do put Undo where the removing action was, so a second click under the pointer reverses rather than navigates.
- Don't hold the receipt for longer to "make sure": the person can stop it by pointing at it or focusing it.
- Don't use it for a line removed while typing (an empty `Checklist` line); nothing was lost, and the hold would sit in the way.
- Don't use it for permanent deletion without saying so: a deletion's receipt has no Undo.
