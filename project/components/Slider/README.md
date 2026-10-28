# Slider

Picks a number from a range by dragging a raised thumb along a trench.

The track is level −2 and the filled part is a raised `accent` bar inside it. The thumb is level 1 with an `accent` rim, level 2 on hover, and floats to level 3 (scaled 12%) while held, with its value floating above it in a bubble at the same height as a tooltip. Keyboard: arrows step, Page Up/Down jump a tenth, Home/End go to the ends.

**You provide:** `value`/`onValueChange` or `defaultValue`, `min`, `max`, `step`, an `aria-label`, and `format` for the bubble (`n => n + '%'`).

## A range

Pass `value` (or `defaultValue`) as `[low, high]` and the Slider has two thumbs, with the raised `accent` fill running between them in the same trench: a price filter, a latency window.

```tsx
<Slider value={[lo, hi]} onValueChange={([a, b]) => setRange([a, b])} min={0} max={500} step={5}
        minStepsBetween={2} aria-label={['Minimum price', 'Maximum price']} format={(n) => `$${n}`} />
```

- **Thumbs can't cross.** A thumb pushed against the other stops there, with no overshoot; `minStepsBetween` keeps them that many steps apart. Two thumbs that meet (with no gap) part in the direction of the first drag.
- **Drag the fill** to move both thumbs together; the window keeps its width and stops at the ends. The fill lifts to level 2 on hover and shows a grab cursor, because dragging it does something.
- **Press the track** outside the thumbs and the nearer one moves there and takes focus. Pressing the fill moves neither.
- **Only the thumb in hand floats** to level 3 with its bubble; the other stays at rest. Panning holds both.
- **Keyboard**, after the [APG multi-thumb slider](https://www.w3.org/WAI/ARIA/apg/patterns/slider-multithumb/): each thumb is its own Tab stop and `role="slider"`, with `aria-valuemin` and `aria-valuemax` bounded by the other thumb (less the gap). Arrows step, Page Up/Down jump a tenth, Home/End go to that thumb's own bounds. When `format` returns text, it's each thumb's `aria-valuetext` too.
- **Names.** Give each thumb its own name (`['Minimum price', 'Maximum price']`), or one name for the pair: the thumbs are then "Price, minimum" and "Price, maximum", in a `role="group"` named "Price".

- Do show the current value in text near the slider when it matters precisely; the bubble only shows while dragging or focused.
