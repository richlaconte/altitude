# RadioGroup

Chooses exactly one option. A radio group is built like the Switch with more positions: **one switch, several positions, one thumb**.

Each option is a round trench, the same as the switch track. The group owns a single raised thumb; choosing an option slides it to that track on `ease-settle`, and the accent pours into the track from under the thumb as it arrives while the old one drains. Because there's only one thumb, the choice can't be in two places, and its movement shows where it came from. Hovering an unchosen option shows a faint ghost of the thumb where it would land (feedforward); hovering the chosen option lifts the thumb; pressing it stretches the thumb, like a switch. Arrow keys move the choice, as native radios do, and the thumb follows.

**You provide:** `Radio` children with `value`, `label` and optional `description`; `value`/`onValueChange` or `defaultValue`; an `aria-label` for the group if there's no visible heading; `orientation="horizontal"` for two or three short options.

- Default to a sensible choice; a group with no thumb is rarely what you want.
- Don't use radios for more than about six options; use a menu.
