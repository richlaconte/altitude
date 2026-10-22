# Slider

Picks a number from a range by dragging a raised thumb along a trench.

The track is level −2 and the filled part is a raised `accent` bar inside it. The thumb is level 1 with an `accent` rim, level 2 on hover, and floats to level 3 (scaled 12%) while held, with its value floating above it in a bubble at the same height as a tooltip. Keyboard: arrows step, Page Up/Down jump a tenth, Home/End go to the ends.

**You provide:** `value`/`onValueChange` or `defaultValue`, `min`, `max`, `step`, an `aria-label`, and `format` for the bubble (`n => n + '%'`).

- Do show the current value in text near the slider when it matters precisely; the bubble only shows while dragging or focused.
