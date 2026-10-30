# SaveBar

Unsaved changes on a settings page or a long record form, held above the page until they're saved or discarded. People scroll past a Save button, navigate away and lose work, or don't notice there's anything unsaved. Polaris's contextual save bar solves the same problem.

**Elevation: an unsaved draft at page scope is something in your hand.** "Editing is temporary local input; it isn't a pending write." So the bar floats at level 3, docked to the bottom edge. That's below a `Sheet` or `Dialog`, so it never competes with them.
- **It appears once a change has settled into the draft** (600ms without another), not on the first key: "spend rises carefully".
- **Save** turns it into a commitment: it hovers as a pending write ("Saving…"). Saved, it lowers away while the saved fields settle with the afterglow.
- **A failed save drops the bar to a trench** ("We couldn't save. Your changes are kept.") with Retry, and keeps the draft.
- **Invalid** says "2 fields need attention". Save stays enabled, so pressing it shows the errors.

**With useEditRecord.** `<SaveBar record={record} />` reads `dirty`, `phase`, `errors` and the changed field count from a `useEditRecord` result, and its buttons call `submit` and `reset`. Leaving while dirty uses `useEditRecord`'s own leave handling. Without a record, pass `dirty`, `saving`, `error`, `invalidCount`, `changedCount`, `onSave` and `onDiscard`.

**Accessibility.** A region labelled "Unsaved changes". It doesn't take focus when it appears, and "Unsaved changes" is announced once when the draft first becomes dirty, not on every key. ⌘S or Ctrl+S saves while it's shown. Outcomes ("Saved", or the failure) are announced politely. Under forced colours it has a 2px border, dotted while saving and a thick dash when failed. Under `contrast="more"` it gets a hard slab. Under reduced motion it fades in and out without travelling.

**Props:** `record`, or `dirty`, `saving`, `error`, `invalidCount`, `changedCount`, `onSave`, `onDiscard`; `delay` (default 600); `saveLabel`, `discardLabel`.

**You provide:** the record or its state, and the save.

```tsx
const record = useEditRecord({ initialValue: settings, validate, validationMode: 'submit', save: saveSettings });
<SaveBar record={record} />
```

- Do use it for pages that collect several changes before one save.
- Do keep the draft when a save fails.
- Don't use it beside an `EditRegion`, which has its own Save.
- Don't show it on the first keystroke.
