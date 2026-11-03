# Checkbox

Toggles one independent option. A checkbox is built like the Switch and the RadioGroup, so the three read as one family.

- **Off:** an empty 22px trench (`surface-trench`, `trench` shadow, `line-control` rim), like the uncovered part of a switch track or an unchosen radio.
- **On:** the accent pours in from the centre (on `ease-settle`, as the switch fill follows its thumb), and since the fill covers the rim too, fill and outline are one shape. A **raised white check** is set on it: `on-accent` with a small drop shadow, the checkbox's equivalent of the switch thumb. It draws once the fill has landed. `indeterminate` sets a dash instead.
- **Hover** is feedforward: an empty box darkens its rim and shows a faint ghost of the check it would get; a checked box lifts its mark half a pixel. **Pressing** deepens the trench and squeezes the mark. **Disabled** matches a disabled switch: a flat track and a grey mark.

**You provide:** `label`, optional `description`, and `checked`/`onCheckedChange` (or `defaultChecked`). It's a real `<input type="checkbox">`, so it works in forms with `name` and `value`.

- Use a Switch when the change takes effect immediately; a Checkbox is for choices submitted together.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Checkbox` as first used in its preview:

```tsx
import { Checkbox } from 'altitude-design';

<Checkbox label="Select all" checked={a && b} indeterminate={a !== b} onCheckedChange={(c) => { setA(c); setB(c); }} />
```

The full preview, as rendered in Storybook and checked in CI (`col`, `family`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Checkbox, Switch } from 'altitude-design';

export default function App() {
  const [a, setA] = React.useState(true);
  const [b, setB] = React.useState(false);
  return (
    <div className="col">
      <Checkbox label="Select all" checked={a && b} indeterminate={a !== b} onCheckedChange={(c) => { setA(c); setB(c); }} />
      <div className="col" style={{ paddingLeft: 34 }}>
        <Checkbox label="Weekly digest" description="A summary every Monday morning." checked={a} onCheckedChange={setA} />
        <Checkbox label="Product updates" checked={b} onCheckedChange={setB} />
      </div>
      <Checkbox label="Disabled" disabled defaultChecked />
      <div className="family"><span className="cap">Same build as</span><Switch defaultChecked aria-label="Switch" /><Switch aria-label="Switch off" /></div>
    </div>
  );
}
```
<!-- /example -->
