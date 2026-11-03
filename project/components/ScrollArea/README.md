# ScrollArea

A scrolling region whose edges show where content continues, so it never looks finished when it isn't.

When content continues above or below, that edge gets an inner lip (`lip-top`, `lip-bottom`), as if the content curves away under the rim. With a `header`, the header sits flush at the top and rises to `elev-2` as soon as content scrolls beneath it, then settles back when you return to the top. Both counter the illusion of completeness: people stop scrolling when a region looks complete.

**You provide:** children, `maxHeight` (px or any CSS length), an optional `header`, and an `aria-label` (the body is keyboard-focusable so it can be scrolled with arrow keys).

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`ScrollArea` as first used in its preview:

```tsx
import { ScrollArea } from 'altitude-design';

<ScrollArea maxHeight={240} aria-label="Invoices">{rows.map(([a, b]) => <div className="item" key={a}>{a}<span>{b}</span></div>)}</ScrollArea>
```

The full preview, as rendered in Storybook and checked in CI (`pair`, `item`, `head` are the preview page's own layout classes, not Altitude's):

```tsx
import { ScrollArea } from 'altitude-design';

const rows = Array.from({ length: 18 }, (_, i) => ['Invoice #' + (2041 + i), '$' + (120 + i * 37) + '.00']);
export default function App() {
  return (
    <div className="pair">
      <ScrollArea maxHeight={240} aria-label="Invoices">{rows.map(([a, b]) => <div className="item" key={a}>{a}<span>{b}</span></div>)}</ScrollArea>
      <ScrollArea maxHeight={196} header={<div className="head">Invoices · October</div>} aria-label="Invoices with header">{rows.map(([a, b]) => <div className="item" key={a}>{a}<span>{b}</span></div>)}</ScrollArea>
    </div>
  );
}
```
<!-- /example -->
