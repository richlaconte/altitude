# Tooltip

Names an icon-only control or adds a short hint; it floats at level 3 above its anchor.

It opens after `delay` (450ms) on hover or immediately on keyboard focus, rising 4px from the anchor while its shadow grows from `elev-1` to `elev-3` (`dur-travel-3`). After one tooltip closes, neighbours open instantly for 400ms, so moving along a toolbar doesn't make you wait twice. Escape closes it.

**On a narrow screen.** It opens where its `side` and `align` put it, then shifts sideways to stay 8px inside the screen, and it's never wider than the screen less 16px.

**You provide:** `content` (a few words, optionally a shortcut), one focusable child, optionally `side="bottom"`.

- Do use `side="right"` for a rail of icons (a collapsed `Sidebar`), where a tooltip above would cover the next icon.
- Don't put anything interactive in a tooltip, and don't hide essential information in one.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Tooltip` as first used in its preview:

```tsx
import { Button, Tooltip } from 'altitude-design';

<Tooltip content="Bold  ⌘B" defaultOpen><Button square variant="ghost" aria-label="Bold"><b>B</b></Button></Tooltip>
```

The full preview, as rendered in Storybook and checked in CI (`row`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import { Button, Tooltip } from 'altitude-design';

export default function App() {
  return (
    <div className="row">
      <Tooltip content="Bold  ⌘B" defaultOpen><Button square variant="ghost" aria-label="Bold"><b>B</b></Button></Tooltip>
      <Tooltip content="Italic  ⌘I"><Button square variant="ghost" aria-label="Italic"><i style={{ fontFamily: 'serif', fontSize: 17 }}>I</i></Button></Tooltip>
      <Tooltip content="Underline  ⌘U"><Button square variant="ghost" aria-label="Underline"><u>U</u></Button></Tooltip>
      <span className="cap" style={{ marginLeft: 12 }}>Hover one, then slide to the next: no second delay.</span>
    </div>
  );
}
```
<!-- /example -->
