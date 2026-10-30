# Combobox

An editable Select: type to narrow a long list, then choose. What you type is a query, not yet a value.

**Elevation.** The field is the same opening as `Select` and `Input`. The difference is what counts as filled: typing doesn't fill a Combobox, choosing does. So while you type, the field keeps its back wall showing under your text (lit and rimmed in accent, because it has focus); only when an option is chosen does its floor rise flush. A form shows which comboboxes still hold a mere query. Invalid drops it to trench depth.

**The list** rises from the field's edge at level 3 with one gliding highlight, as in Select, and narrows as you type: options are ranked by the CommandPalette's matching (exact, then prefix, word start, substring, letters in order), the best match is first and highlighted, and the letters that matched are drawn in `accent-ink`. The chosen option wears the Checkbox family's tick. A new value settles in with a brief afterglow.

**Keyboard and screen readers.** The WAI-ARIA combobox pattern with a listbox popup: the text field has `role="combobox"`, `aria-expanded`, `aria-autocomplete="list"` and `aria-activedescendant`, so focus stays in the field. Typing opens and filters; ↓ and ↑ move (↓ also opens it, Alt+↓ without moving); Enter chooses; Escape closes and puts back the previous value. Home and End stay with the text. Leaving the field, by Tab or by clicking away, commits what's typed: an exact name chooses that option, an empty field clears the value, anything else goes back to the value it had. The chevron opens the list for pointer users.

**On a phone.** The list stays under the field you're typing in by default (`presentation="auto"` or `"anchored"`), so the on-screen keyboard hides neither. `presentation="sheet"` opens it at the bottom edge instead.

**You provide:** `items` (`{ value, label, textValue?, description?, disabled? }`), `value`/`onValueChange` or `defaultValue`, a `placeholder` that invites typing ("Search people"), optionally `filter` (return 0 or false to hide, higher to rank first), `empty` (default "No matches") and `name` for forms. Wrap it in `Field`.

- Do use it when the list is long enough that scrolling is slower than typing (people, countries, repositories).
- Don't use it for free text that may not be in the list; it only accepts listed values.
