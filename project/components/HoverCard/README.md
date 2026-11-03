# HoverCard

A richer preview of what a link or a face points to: who someone is, what a project holds. It rises from its trigger after the pointer rests on it.

**Elevation.** Level 3, like Popover: `surface-floating`, `elev-3`, rising 6px from 96% scale out of its trigger. It's something you glance at, above the page and gone as soon as you move on, which is what level 3 means. Unlike a Tooltip it can hold more than a label (an avatar, a sentence, a few numbers), so it's a card with `radius-lg` and `space-4` padding.

**Timing is the design.** It opens only after the pointer has rested on the trigger for 400ms (hover intent), so passing over a paragraph of names doesn't set off a string of cards. It waits 250ms after the pointer leaves, and an invisible bridge spans the gap between trigger and card, so you can move into it. It shares Tooltip's warm-up: once a card or tooltip has shown, a neighbour opens at once instead of waiting again. Only one card is open at a time; moving to a neighbour hands over. Under reduced motion it fades without travelling.

**Keyboard and touch.** Keyboard focus on the trigger opens it after the same pause; Tab continues into any links inside it; Escape closes it and leaves focus on the trigger. On touch there's no hover, so it never opens: a tap just follows the link.

**Supplementary, always.** Nothing may live only in a HoverCard. The trigger must work on its own (the link goes to the profile; the profile has everything the card showed), because touch users never see the card and screen readers aren't told about it. In forced colours it has the floating tier's 2px border.

**On a narrow screen.** It opens where its `side` and `align` put it, then shifts sideways to stay 8px inside the screen, and it's never wider than the screen less 16px.

**You provide:** a `trigger` (a link or an avatar with its own job) and the card's content: a heading line, one or two sentences, perhaps a few numbers. Optionally `side`, `align`, `openDelay` and `closeDelay`.

- Do keep it to a glance: if people need to act on it, it's a Popover (click to open) or a page.
- Don't put the only copy of anything in it, and don't put a form in it.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`HoverCard` as first used in its preview:

```tsx
import { HoverCard } from 'altitude-design';

<HoverCard defaultOpen={true} trigger={<a href="#mara">Mara Quist</a>}>
  <Card p={people.mara} />
</HoverCard>
```

The full preview, as rendered in Storybook and checked in CI (`who`, `bio`, `stats`, `col`, `para`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import { Avatar, HoverCard } from 'altitude-design';

const people = {
  mara: { name: "Mara Quist", role: "Platform \xB7 Lisbon", bio: "Owns deploys and the edge runtime. Usually reviews within the hour.", s: [42, 6, 3] },
  jon: { name: "Jon Reyes", role: "Docs \xB7 Lima", bio: "Writes the release notes and keeps the changelog honest.", s: [18, 2, 5] }
};
const Card = ({ p }) => <>
  <div className="who">
    <Avatar name={p.name} size={40} status="active" />
    <div><b>{p.name}</b><span>{p.role}</span></div>
  </div>
  <p className="bio">{p.bio}</p>
  <div className="stats">
    <span><b>{p.s[0]}</b>{" merged"}</span>
    <span><b>{p.s[1]}</b>{" open"}</span>
    <span><b>{p.s[2]}</b>{" projects"}</span>
  </div>
</>;
export default function App() {
  return <div className="col" style={{ gap: 18 }}>
  <p className="para">
    {"Merged by "}
    <HoverCard defaultOpen={true} trigger={<a href="#mara">Mara Quist</a>}>
      <Card p={people.mara} />
    </HoverCard>
    {" two hours ago, after review from "}
    <HoverCard trigger={<a href="#jon">Jon Reyes</a>}><Card p={people.jon} /></HoverCard>
    .
  </p>
  <p className="cap" style={{ marginTop: 160 }}>
    Rest the pointer on a name; once one card has shown, the other opens at once. Focus a link with Tab to open it from the keyboard; Escape closes it.
  </p>
</div>;
}
```
<!-- /example -->
