# Alert

Tells the person something about the current context. An alert is **a sheet laid on the page**: it rests on the ground, you can see its paper edge and the contact shadow under it, and it never floats. When it asks the person to act it becomes a raised card.

**Page banners.** `placement="page"` lays the alert edge to edge across the top of the app or page: "Your trial ends in 3 days", "Scheduled maintenance Sunday 02:00 UTC", "We're seeing delays in email delivery". It has no side rounding and no side edges, and its text wraps on narrow screens. The elevation rule is the same at page scope: one that informs is a flat sheet, and one that asks for action is raised. `sticky` keeps it at the top while the page scrolls. It sits in a `region` named by its title, so it can be found and skipped. `dismissLabel` gives the dismiss button words ("Remind me tomorrow"), and dismissing moves focus to the page's `main`. Several page banners go in `AlertStack placement="page"`, most severe first. Put a banner above `AppShell`, or at the top of the page.

- `variant="flat"` (default): a thin sheet in the tone's `-soft` colour (neutral is `surface-raised`), with a tone-tinted hairline, a 1px paper edge and a contact shadow. It informs.
- `variant="raised"`: a card at level 2 with the sheen of something you can act on, the icon in the tone colour. Use it when the alert has an `action` or blocks progress.
- `onDismiss`: adds a dismiss button. Dismissing **lifts the sheet off the page**: it rises 8px as its shadow spreads, fades, and then the gap closes; `onDismiss` is called once it's gone.
- `settle`: an afterglow when the alert first appears or changes.

`critical` renders `role="alert"`; the others use `role="status"`.

## AlertStack

Several alerts as a **stack of sheets**, the same language as `Pile`. The first alert lies on top; up to two more peek out beneath it, each tinted by its own tone, so you can see what kind of news is waiting without reading it. A floating "+N more" sits on the stack's edge. Opening it fans the alerts out into a column, one after another; "Show less" tucks them back. Dismiss the top alert and it lifts off while the next one comes up from under it.

**You provide:** for `Alert`, `tone`, `title`, optional body as children, optional `action` (a small Button), `variant`, `onDismiss`. For `AlertStack`, keyed `Alert` children in order of importance, and optionally `expanded`/`onExpandedChange`, `moreLabel`, `lessLabel`.

- Keep it to a title and one sentence.
- Generic action-completion messages belong in a Toast. When an action removes an item from a list (‘Brand guidelines.pdf archived’ with Undo), don't add an Alert below the list: show the result in the item's own slot with [RemovalReceipt](../RemovalReceipt/README.md), then hand Undo to a Toast. Keep a durable recovery destination such as Archived → Restore; a timed notification must not be the only recovery path. See [Actions in place](../../ActionsInPlace.md).
- An Alert still suits a failure or a changed record that can't be shown beside its item (it's outside the current view). Key it by its operation ID, and let its delayed `onDismiss` clear state only when that ID is still current. Dismissing an old Alert must not hide a newer action's feedback.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Alert` as first used in its preview:

```tsx
import { Alert, Button } from 'altitude-design';

<Alert placement="page" tone="caution" variant="raised" title="Your trial ends in 3 days" action={<Button variant="primary" size="sm">Choose a plan</Button>}
onDismiss={() => setTrial(false)} dismissLabel="Remind me tomorrow" />
```

The full preview, as rendered in Storybook and checked in CI (`col`, `frame`, `cap`, `wrap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Alert, AlertStack, Button } from 'altitude-design';

const queue = [
  { id: 'b', tone: 'critical', title: 'Build failed', body: 'Missing environment variable DATABASE_URL.' },
  { id: 'c', tone: 'caution', title: 'Certificate renews in 3 days', body: 'Renewal is automatic; nothing to do.' },
  { id: 'd', tone: 'accent', title: 'New region available', body: 'Frankfurt (eu-central-2) is now open.' },
];
export default function App() {
  const [items, setItems] = React.useState(queue);
  React.useEffect(() => { if (!items.length) { const t = setTimeout(() => setItems(queue), 900); return () => clearTimeout(t); } }, [items]);
  const [trial, setTrial] = React.useState(true);
  return (
    <div className="col">
      <div className="frame">
        {trial && <Alert placement="page" tone="caution" variant="raised" title="Your trial ends in 3 days" action={<Button variant="primary" size="sm">Choose a plan</Button>}
          onDismiss={() => setTrial(false)} dismissLabel="Remind me tomorrow" />}
        <Alert placement="page" title="We're seeing delays in email delivery">Messages may take up to 15 minutes to arrive.</Alert>
        <main tabIndex={-1}><p className="cap">Page banners lie edge to edge across the top. One that asks for action is raised; one that informs is a flat sheet.</p></main>
      </div>
    <div className="col wrap">
      <Alert title="Scheduled maintenance">The API will be read-only on Sunday from 02:00 to 02:30 UTC.</Alert>
      <Alert tone="positive" title="Domain verified">saltmarshbooks.example now points at this project.</Alert>
      <Alert tone="caution" variant="raised" title="You're at 90% of your plan" action={<Button size="sm" variant="primary">Upgrade</Button>} />
      <AlertStack>
        {items.map((a) => <Alert key={a.id} tone={a.tone} title={a.title} onDismiss={() => setItems((xs) => xs.filter((x) => x.id !== a.id))}>{a.body}</Alert>)}
      </AlertStack>
    </div>
    </div>
  );
}
```
<!-- /example -->
