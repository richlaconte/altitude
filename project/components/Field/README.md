# Field

Pairs one control with its label, an optional hint and an error message that emerges beneath it.

`Field` wires the `id`, `aria-describedby`, `required` and `invalid` props onto its single child, so the label, hint and error are announced with the control. When `error` is set, it replaces the hint, the control sinks to its invalid state, and the message emerges from under the field (`alt-emerge`, `dur-travel-2`) in `critical` with an icon.

**You provide:** `label`, optionally `hint`, `error` (a string or node; falsy when valid) and `required`, and exactly one control as the child.

- Do write the error as the fix: "Use at least 5 characters", not "Invalid input".
- Don't show an error before the person has finished with the field; validate on blur or submit.
