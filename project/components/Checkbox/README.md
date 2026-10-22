# Checkbox

Toggles one independent option. A checkbox is built like the Switch and the RadioGroup, so the three read as one family.

- **Off:** an empty 22px trench (`surface-trench`, `trench` shadow, `line-control` rim), like the uncovered part of a switch track or an unchosen radio.
- **On:** the accent pours in from the centre (on `ease-settle`, as the switch fill follows its thumb), and since the fill covers the rim too, fill and outline are one shape. A **raised white check** is set on it: `on-accent` with a small drop shadow, the checkbox's equivalent of the switch thumb. It draws once the fill has landed. `indeterminate` sets a dash instead.
- **Hover** is feedforward: an empty box darkens its rim and shows a faint ghost of the check it would get; a checked box lifts its mark half a pixel. **Pressing** deepens the trench and squeezes the mark. **Disabled** matches a disabled switch: a flat track and a grey mark.

**You provide:** `label`, optional `description`, and `checked`/`onCheckedChange` (or `defaultChecked`). It's a real `<input type="checkbox">`, so it works in forms with `name` and `value`.

- Use a Switch when the change takes effect immediately; a Checkbox is for choices submitted together.
