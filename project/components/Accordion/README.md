# Accordion

Reveals sections one at a time. Closed items are **lids** lying flush on the page; opening one lifts its lid into a raised card and opens the **compartment** underneath, where the content sits.

Closed rows sit on the ground divided by `line` hairlines. Hovering one raises a ghost of its lid (a faint raised tint with a hairline), so you can see what will open. Opening raises the item to level 2 (`surface-raised`, `elev-2`), opens a gap around it and hides the neighbouring dividers. Inside, the content sits in a compartment: an opening sunk into the lid (`surface-well`) with its back wall showing just below the rim, the same camera as an empty `Input`. The panel grows on `ease-glide`, the content emerges 60ms later, and the chevron turns on `ease-settle`. Closed panels are inert to keyboard and assistive tech.

**You provide:** `items` (`value`, `title`, `content`), `type` (`single` closes the others; `multiple` doesn't), `defaultValue` as an array of open values, or `value` and `onValueChange` to control which are open. An accordion inside an open one keeps its own state: only its own lid opens it.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Accordion` as first used in its preview:

```tsx
import { Accordion } from 'altitude-design';

<Accordion items={items} defaultValue={['b']} />
```

The full preview, as rendered in Storybook and checked in CI (`wrap` is the preview page's own layout class, not Altitude's):

```tsx
import { Accordion } from 'altitude-design';

const items = [
  { value: 'a', title: 'What does elevation mean here?', content: 'Height says how much something matters right now and what you can do with it: raised things are pushed, sunk things are filled.' },
  { value: 'b', title: 'Can I bring my own colour?', content: 'Pass any hex as accent to AltitudeProvider. The accent text and soft tints are derived to stay legible on every surface.' },
  { value: 'c', title: 'Does it respect reduced motion?', content: 'Yes. Surfaces still change level, tint and shadow, but nothing travels or scales.' },
];
export default function App() { return <div className="wrap"><Accordion items={items} defaultValue={['b']} /></div>; }
```
<!-- /example -->
