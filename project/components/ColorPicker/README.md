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
