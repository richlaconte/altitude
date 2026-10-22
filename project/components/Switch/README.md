# Switch

Turns a setting on or off immediately: a raised thumb riding in a trench.

The track is level −2 (`surface-trench`, `trench`). Turning it on pours the `accent` into the track behind the thumb (a clip-path that follows it), and the thumb travels on `ease-settle`. Pressing stretches the thumb before it moves. Hover lifts the thumb from level 1 to 2.

**You provide:** `label` (or `aria-label`), and `checked`/`onCheckedChange` or `defaultChecked`. It renders `role="switch"`.

- Do use it only for changes that apply instantly. If the change needs a Save, use a Checkbox.
