# Alert

Tells the person something about the current context. An alert is **a sheet laid on the page**: it rests on the ground, you can see its paper edge and the contact shadow under it, and it never floats. When it asks the person to act it becomes a raised card.

- `variant="flat"` (default): a thin sheet in the tone's `-soft` colour (neutral is `surface-raised`), with a tone-tinted hairline, a 1px paper edge and a contact shadow. It informs.
- `variant="raised"`: a card at level 2 with the sheen of something you can act on, the icon in the tone colour. Use it when the alert has an `action` or blocks progress.
- `onDismiss`: adds a dismiss button. Dismissing **lifts the sheet off the page**: it rises 8px as its shadow spreads, fades, and then the gap closes; `onDismiss` is called once it's gone.
- `settle`: an afterglow when the alert first appears or changes.

`critical` renders `role="alert"`; the others use `role="status"`.

## AlertStack

Several alerts as a **stack of sheets**, the same language as `Pile`. The first alert lies on top; up to two more peek out beneath it, each tinted by its own tone, so you can see what kind of news is waiting without reading it. A floating "+N more" sits on the stack's edge. Opening it fans the alerts out into a column, one after another; "Show less" tucks them back. Dismiss the top alert and it lifts off while the next one comes up from under it.

**You provide:** for `Alert`, `tone`, `title`, optional body as children, optional `action` (a small Button), `variant`, `onDismiss`. For `AlertStack`, keyed `Alert` children in order of importance, and optionally `expanded`/`onExpandedChange`, `moreLabel`, `lessLabel`.

- Keep it to a title and one sentence.
- Don't use an Alert for something that just happened because of the person's action; that's a Toast.
