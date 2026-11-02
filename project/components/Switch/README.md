# Switch

Turns a setting on or off immediately: a raised thumb riding in a trench.

The track is level −2 (`surface-trench`, `trench`). Turning it on pours the `accent` into the track behind the thumb (a clip-path that follows it), and the thumb travels on `ease-settle`. Pressing stretches the thumb before it moves. Hover lifts the thumb from level 1 to 2.

**You provide:** `label` (or `aria-label`), and `checked`/`onCheckedChange` or `defaultChecked`. It renders `role="switch"`.

- Do use it only for changes that apply instantly. If the change needs a Save, use a Checkbox.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Switch` as first used in its preview:

```tsx
import { Switch } from 'altitude-design';

<Switch label="Sync across devices" defaultChecked />
```

The full preview, as rendered in Storybook and checked in CI (`col`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import { Switch } from 'altitude-design';

export default function App() {
  return (
    <div className="col">
      <Switch label="Sync across devices" defaultChecked />
      <Switch label="Email me when someone comments" />
      <Switch label="Disabled" disabled />
      <p className="cap">Hold the pointer down: the thumb stretches before it travels.</p>
    </div>
  );
}
```
<!-- /example -->
