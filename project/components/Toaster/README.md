# Toaster

Confirms what just happened, in a depth stack: the newest toast floats in front at level 4 and older ones sink behind it.

Call `toast()` from anywhere; render `Toaster` once inside `AltitudeProvider`. A new toast rises 24px into the front while the others each step back: 10px up, 5% smaller, more transparent and one shadow level lower, with their text hidden. Hovering or focusing the stack fans it out to full height and pauses every timer. Dismissed toasts sink and fade. `critical` toasts use `role="alert"`.

**On touch.** A tap on the stack fans it out and pauses the timers until a tap outside folds it, as hover does for a mouse. A horizontal swipe dismisses a toast.

**You provide:** `toast({ title, description?, tone?, duration?, action?, announce? })` or just `toast('Changes saved')`. `duration` defaults to 5000ms; 0 keeps it until dismissed. Returns an id for `toast.dismiss(id)`. `announce: false` shows a toast without announcing it, for words a screen reader has already heard where they happened: `ItemGroup`'s Undo toast repeats what the receipt in the list already announced.

- Do write the title as the outcome in past tense: "Domain verified".
- Don't use toasts for errors the person must fix in place; show those in the form with Field.

While a modal owns the document, toasts retain their visual position above the scrim, but their controls are inert and expiry timers pause with their remaining lifetime intact. Notification text is routed to a noninteractive live region inside the active modal, and the external live region is suppressed to avoid duplicate announcements. Timers and controls resume after final release. Essential modal errors belong inside that modal.

When an item leaves a list, its result is shown first in the item's own slot ([RemovalReceipt](../RemovalReceipt/README.md)); once that slot has closed, a toast carries Undo, as in the [Actions in place recipe](../../ActionsInPlace.md). A timed toast may supplement recovery, but must never be its only route: keep a durable Archived/Restore path after a brief Undo opportunity expires. Withdraw a toast's Undo (`toast.dismiss(id)`) as soon as a newer revision makes it invalid.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Toaster` as first used in its preview:

```tsx
import { Toaster } from 'altitude-design';

<Toaster />
```

The full preview, as rendered in Storybook and checked in CI (`col`, `row`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Button, Toaster, toast } from 'altitude-design';

const msgs = [
  { title: 'Deployment queued', description: 'northwind-web · main@8dc01b2' },
  { title: 'Domain verified', description: 'acme.dev now points here.', tone: 'positive' },
  { title: 'Build failed', description: 'Missing DATABASE_URL.', tone: 'critical', action: { label: 'Retry', onClick: () => {} } },
];
export default function App() {
  React.useEffect(() => { msgs.forEach((m, i) => setTimeout(() => toast({ ...m, duration: 60000 }), 300 + i * 450)); }, []);
  return (
    <div className="col">
      <div className="row">
        <Button onClick={() => toast({ title: 'Changes saved', tone: 'positive' })}>Toast</Button>
        <Button variant="ghost" onClick={() => toast({ title: 'Running low on storage', description: '92% used', tone: 'caution' })}>Warning</Button>
      </div>
      <p className="cap" style={{ maxWidth: 300 }}>Hover or tap the stack to fan it out; timers pause while you read; swipe a toast away.</p>
      <Toaster />
    </div>
  );
}
```
<!-- /example -->
