# Dialog

Asks for a decision or a focused task at level 5, the summit. The page waits while the dialog is open and through its exit.

By default the app scales back 1.5% and desaturates, the scrim fades in with a 3px blur, and the dialog rises 16px from 96% scale while its shadow grows from `elev-1` to `elev-5` (`dur-travel-5`). It closes faster than it opened, sinking. `background="stationary"` keeps the background in place and removes backdrop blur, including a modal Sheet underneath. Dimming and the dialog's own elevation and motion stay the same. `AltitudeProvider recede={false}` suppresses stage recession for either mode; the default scrim still blurs.

**Where focus lands.** A form starts at its first eligible field by default. A readable structured surface can use `initialFocus="title"`; Tab then reaches the first control and Shift+Tab the last. `focusSelector` selects a different initial target. `initialFocus={false}` focuses the panel as a safe containment fallback until the application moves focus inside. Hidden, disabled, inert and negative-tabindex controls are excluded from Tab traversal. Composition Escape does not dismiss.

**Where focus returns.** Closing retains native background isolation, scroll locking and focus containment through the exit. The captured invoker receives focus afterward when it remains available. If an action removes it, supply a lazy `returnFocus={() => headingRef.current}`; the returned element must be connected, visible, non-inert and in the same document. A static heading needs `tabIndex={-1}`. The surviving provider stage is the final neutral fallback. An older close does not take focus from a newer modal or a valid application completion destination.

**On a phone.** It sizes to the visible viewport, not the largest one: with the on-screen keyboard open it shrinks to the part you can see, so its footer and the focused field stay in reach.

**You provide:** `title`, `description`, optional body, `footer`, `open`/`onOpenChange` or a `trigger`, and `size`. `dismissible={false}` disables Escape, scrim dismissal and the close affordance. `background` defaults to `'recede'`. `returnFocus` is optional for unchanged invokers.

```tsx
const listHeading = React.useRef<HTMLHeadingElement>(null);
<Dialog open={open} onOpenChange={setOpen} size="sm"
  background="stationary" title="Delete this file permanently?"
  description={`“${target.name}” will be removed. You won’t be able to restore it.`}
  focusSelector="[data-cancel]" returnFocus={() => listHeading.current}
  footer={<><Button data-cancel variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
    <Button variant="danger" onClick={confirmDelete}>Delete permanently</Button></>} />
```

This fragment shows presentation only. Use the executable [confirmation recipe](../../ActionsInPlace.md) for target/revision capture, duplicate suppression, retained errors, pending Close, uncertain outcomes and session-safe completion. The application owns dispatched work; closing a Dialog never implies that a write was cancelled.

- Name the action in the confirm button, such as “Delete permanently”. For irreversible actions, initially focus Cancel.
- Keep essential errors and progress inside the dialog. Background toast actions are temporarily inert; notification text is routed into its live region.
- Keep one summit. A Dialog may temporarily suspend a modal Sheet. Competing Dialog/CommandPalette requests are rejected, warn in development, and require `open=false` before a fresh attempt. They never queue. A palette command may close the palette and open a Dialog in the same callback.
