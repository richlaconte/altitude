# Dialog

Asks for a decision or a focused task at level 5, the summit: the page recedes and everything else waits.

Opening it pushes a layer onto `AltitudeProvider`: the app scales back 1.5% and desaturates, the `scrim` fades in with a 3px blur, and the dialog rises 16px from 96% scale while its shadow grows from `elev-1` to `elev-5` (`dur-travel-5`). It closes faster than it opened, sinking. Focus moves to the element marked `data-autofocus` (or the first field), Tab is trapped inside, and focus returns to the trigger on close.

**Where focus lands.** A form should start at its first field, which is the default. A read surface (a record's detail, a long confirmation) should start at its title, so a screen reader announces what's open before anything else and the keyboard starts from the top: pass `initialFocus="title"` (the WAI-ARIA dialog pattern's advice when the first control is far down). `focusSelector` changes what the default looks for; `initialFocus={false}` leaves focus alone, for a dialog that places it itself. Either way, focus goes back where it was on close.

**You provide:** `title` (a question or task: "Delete “Northwind”?"), `description` (the consequence), optional body as children, `footer` with buttons (cancel as ghost first, the action last), `open`/`onOpenChange` or a `trigger`, `size`. Set `dismissible={false}` only when the person must choose. `initialFocus="title"` for a read surface.

- Do name the action in the confirm button ("Delete project"), never "OK".
- Don't open a dialog from a dialog. One summit.
