# Popover

Shows rich, interactive content anchored to a trigger, floating at level 3.

It grows from the trigger's edge (`transform-origin` on that side), rising 6px from 96% scale while its shadow climbs to `elev-3`. Focus moves to the first control inside; Escape or a click outside closes it and returns focus to the trigger.

**On a narrow screen.** It opens where its `side` and `align` put it, then shifts sideways to stay 8px inside the screen, and it's never wider than the screen less 16px.

**You provide:** `trigger` (a Button), children (padding is `space-4`), `side`, `align`, an `aria-label`, and `open`/`onOpenChange` if you need control.

- Do use it for small forms and pickers that belong to one control.
- Don't use it for a decision that blocks the page; that's a Dialog.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Popover` as first used in its preview:

```tsx
import { Button, Field, Input, Popover } from 'altitude-design';

<Popover defaultOpen aria-label="Share" trigger={<Button>Share</Button>}>
  <div className="col" style={{ width: 280, gap: 12 }}>
    <b style={{ font: '600 14px/20px var(--font-sans)' }}>Invite to project</b>
    <Field label="Email address"><Input size="sm" type="email" placeholder="name@company.com" /></Field>
    <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}><Button size="sm" variant="primary">Send invite</Button></div>
  </div>
</Popover>
```

The full preview, as rendered in Storybook and checked in CI (`col`, `row` are the preview page's own layout classes, not Altitude's):

```tsx
import { Button, Field, Input, Popover } from 'altitude-design';

export default function App() {
  return (
    <Popover defaultOpen aria-label="Share" trigger={<Button>Share</Button>}>
      <div className="col" style={{ width: 280, gap: 12 }}>
        <b style={{ font: '600 14px/20px var(--font-sans)' }}>Invite to project</b>
        <Field label="Email address"><Input size="sm" type="email" placeholder="name@company.com" /></Field>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}><Button size="sm" variant="primary">Send invite</Button></div>
      </div>
    </Popover>
  );
}
```
<!-- /example -->
