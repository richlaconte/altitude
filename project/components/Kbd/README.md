# Kbd

Shows a keyboard key as a keycap: a tiny slab with a 2px wall that presses down when the person presses that key.

Keys sit at level 1 in the mono family with `wall-1` under them. With `listen`, the cap drops to the ground (wall gone) while the matching key (a `KeyboardEvent.key`, case-insensitive) is held: a small confirmation that a shortcut registered.

**On touch.** `hideOnTouch` hides a key cap on a touch-only device (no hover, a coarse pointer) until a key is pressed in the session, for a hint that only makes sense with a keyboard. It's off by default, because an app may be documenting its shortcuts on purpose; Altitude's own hints (menu shortcuts, CommandPalette's keys, InlineEdit's save hint) already do this. `useKeyboardLikely()` gives the same answer to your own components.

**You provide:** the key's glyph as children (one `Kbd` per key: `<Kbd>⌘</Kbd><Kbd>K</Kbd>`), and `listen` when the shortcut is live on this page.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Kbd` as first used in its preview:

```tsx
import { Kbd } from 'altitude-design';

<Kbd listen="Meta">⌘</Kbd>
```

The full preview, as rendered in Storybook and checked in CI (`col`, `row`, `body`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import { Kbd } from 'altitude-design';

export default function App() {
  return (
    <div className="col">
      <div className="row"><span className="body">Open the command menu</span><span><Kbd listen="Meta">⌘</Kbd><Kbd listen="k">K</Kbd></span></div>
      <p className="cap">Click into this card and press ⌘K, or hold K.</p>
    </div>
  );
}
```
<!-- /example -->
