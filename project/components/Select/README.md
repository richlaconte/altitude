# Select

Chooses one value from a list: an opening you fill by choosing, with the list rising from its edge at level 3.

**Why an opening.** In Altitude, things you press are raised and things you fill are sunk. Choosing a value fills a field, so a Select is built like `Input`, not like a button. While nothing is chosen it's a well with its back wall showing (`--alt-wall-in`) and its placeholder sitting on the floor; as the pointer approaches, the wall deepens. Once a value is chosen the floor rises flush (`surface-raised`, no wall), so a form's unanswered selects read as holes at a glance, exactly like its empty inputs. When it's invalid it drops to trench depth on `critical-soft`. A chevron says it opens.

**The list.** It rises from the field's edge to level 3 like Popover and DropdownMenu (6px from 96% scale, its shadow growing to `elev-3`), opening upward instead when there's more room above. One `accent-soft` highlight is carried between options on `ease-settle`. The chosen option wears the Checkbox family's tick (the same path and stroke, in `accent-ink`), drawn in as the list opens. Choosing sinks the list back, raises the floor flush and lets the new value settle in with a brief `accent-soft` afterglow (a fifth of `dur-settle`).

| State | Looks like |
|---|---|
| Empty | a well with its back wall showing; the placeholder in `ink-muted` |
| Chosen | flush with the page; the value in `ink` |
| Open or focused | the lit floor of a focused Input; reached by keyboard, also its 2px neutral rim (kept while the list has focus); an empty field holds its approached depth; the list at level 3 |
| Invalid | trench depth on `critical-soft` with a `critical` rim |
| Disabled | flat on the ground, `ink-faint` |

**Keyboard and screen readers.** The WAI-ARIA listbox pattern with a button trigger. The trigger is a `button` with `aria-haspopup="listbox"` and `aria-expanded`; ↓, ↑, Enter or Space open the list and focus moves into it, where `aria-activedescendant` names the highlighted option and `aria-selected` the chosen one. ↑ and ↓ move, Home and End jump to the ends, typing letters jumps to the next option that starts with them (also on the closed trigger, which opens at the match), Enter or Space chooses, and Escape closes without changing the value. Disabled options are skipped. The list is named by the field's label. In forced colours the highlighted option has a Highlight rim, empty fields a dashed rim and chosen ones a solid rim.

**As a sheet.** `presentation="auto"` (the default) opens the list as a sheet at the bottom edge on a narrow touch screen, titled by the field's label, with Close and 44px rows; a tap outside closes it too. `"anchored"` or `"sheet"` forces one.

**You provide:** options as `items` (`{ value, label, description?, icon?, disabled? }`) or `SelectItem` children; `value`/`onValueChange` or `defaultValue`; a `placeholder` that says what to choose ("Choose a region"); `name` to submit it with a form (a hidden native select carries the value and participates in constraint validation). Wrap it in `Field` for a label, hint and error: Field passes the id, the description and `invalid` through.

`required` rejects an empty value through native form validation, including without a `name`; invalid submission focuses the visible trigger, marks it invalid and associates a visible “Choose an option.” alert. Set `requiredMessage` to localize or clarify that instruction. A supplied `Field` error takes precedence so the same issue is not announced twice. Valid selection and form reset clear this native-validation feedback. Disabled selects are excluded from validation and form data. Form reset restores `defaultValue` for uncontrolled selects and calls `onValueChange` with that reset value. Controlled selects retain their application-owned value; reset that state in the form’s reset handler if desired. A cancelled form reset leaves the selection untouched.

- Do use a RadioGroup instead when there are five options or fewer: people can see and compare them without opening anything.
- Do give a non-string `label` a `textValue`, so typeahead can find it.
- Don't use it for actions; that's a DropdownMenu.
