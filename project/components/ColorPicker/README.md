# ColorPicker and ColorSwatchPicker

A brand colour for a white-label portal, a label or tag colour, a calendar colour. `AltitudeProvider accent` already takes any colour and derives a scheme from it. This is the settings control that chooses one.

**Elevation: choices are switches.** Swatches are built like `RadioGroup`. Each swatch is a trench (with a `line-control` rim) that its colour pours into. **The chosen one carries the raised white mark**, one mark that travels between swatches on `ease-glide`, as the radio thumb does. Pointing at another swatch shows a ghost of the mark where it would land (feedforward).

**Any colour.** With `allowCustom`:
- **The hex field** is an `Input` with a chip of the colour. It fills only when it holds a whole colour; a partial one ("0f8") is still an opening when you leave it.
- **"Custom…"** opens a `Popover` (level 3) with a saturation/brightness area and a hue strip. Both are wells, and their handles are raised.

**Contrast.** `accent` is the product's one hue, and text sits on it, so `checkContrast` says in words, for white text and for dark text, whether each reaches 4.5:1 on the colour ("White text fails: 4.3:1", "Dark text passes: 4.8:1"), as `Badge` plates. Some text nearly always passes, so it says which.

**Accessibility.** Swatches are a [radio group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/): one tab stop, and arrows move and choose. **Every swatch has a name** ("Teal"), so colour is never the only way to tell them apart, and the chosen colour's name and hex are announced. The area is a [slider](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) for saturation and brightness: Left and Right change saturation, Up and Down brightness, and Shift moves 10%. Its value text is "Saturation 80%, brightness 54%". The hue strip is a slider from 0 to 360°. Under forced colours swatches keep their real colour (`forced-color-adjust: none`) with a 1px `CanvasText` border, or 2px for the chosen one. Under `contrast="more"` the chosen swatch gets a hard ring. Under reduced motion the mark appears in place.

**Props.**
- `ColorPicker`: `label`, `value`, `defaultValue`, `onValueChange` (a lower-case `#rrggbb`), `swatches` (`{ value, name }[]`), `allowCustom`, `checkContrast`.
- `ColorSwatchPicker` (the swatches alone): `swatches`, `value`, `defaultValue`, `onValueChange`, `aria-label`.

**You provide:** a named palette (six to eight swatches), and whether any colour is allowed.

```tsx
<ColorPicker label="Brand colour" value={brand} onValueChange={setBrand}
  swatches={[{ value: '#0f8a6b', name: 'Teal' }, { value: '#2f5fd0', name: 'Blue' }]}
  allowCustom checkContrast />
```

- Do name every swatch.
- Do turn on `checkContrast` wherever the colour will carry text (an accent, a button).
- Don't offer a free colour where a palette will do; custom colours make labels hard to tell apart.
- Don't use the `data-*` chart palette as label colours; it means series.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`ColorPicker` as first used in its preview:

```tsx
import { ColorPicker } from 'altitude-design';

<ColorPicker label="Brand colour" value={color} onValueChange={setColor} swatches={brand} allowCustom checkContrast />
```

The full preview, as rendered in Storybook and checked in CI (`cpk`, `col`, `demo`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { AltitudeProvider, Button, ColorPicker } from 'altitude-design';

const brand = [
  { value: '#0f8a6b', name: 'Teal' }, { value: '#2f5fd0', name: 'Blue' }, { value: '#7d3c6f', name: 'Plum' },
  { value: '#c23a6b', name: 'Rose' }, { value: '#c8571f', name: 'Ember' }, { value: '#d9a521', name: 'Ochre' },
];
const labels = [{ value: '#66738a', name: 'Slate' }, { value: '#2f8f4e', name: 'Green' }, { value: '#c9372c', name: 'Red' }, { value: '#16869e', name: 'Cyan' }];
export default function App() {
  const [color, setColor] = React.useState('#0f8a6b');
  const [tag, setTag] = React.useState('#2f8f4e');
  return (
    <div className="cpk">
      <ColorPicker label="Brand colour" value={color} onValueChange={setColor} swatches={brand} allowCustom checkContrast />
      <div className="col">
        <ColorPicker label="Label colour" value={tag} onValueChange={setTag} swatches={labels} />
        <div className="demo"><span className="cap">Preview:</span><AltitudeProvider accent={color}><Button variant="primary">Upgrade plan</Button></AltitudeProvider></div>
        <p className="cap">The check says, for white text and for dark text, whether it reaches 4.5:1 on the colour. Arrow keys move the mark between swatches; Custom… opens a full picker.</p>
      </div>
    </div>
  );
}
```
<!-- /example -->
