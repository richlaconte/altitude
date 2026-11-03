# Field

Pairs one control with its label, an optional hint and an error message that emerges beneath it.

`Field` wires the `id`, `aria-describedby`, `required` and `invalid` props onto its single child, so the label, hint and error are announced with the control. Existing child description IDs are preserved and deduplicated with the rendered hint and error IDs. Both hint and error stay available when an error is shown; the control sinks to its invalid state, and the message emerges from under the field (`alt-emerge`, `dur-travel-2`) in `critical` with an icon.

**You provide:** `label`, optionally `hint`, `error` (a string or node; falsy when valid) and `required`, and exactly one control as the child. A child’s `required` prop is preserved unless Field explicitly supplies one.

A `RadioGroup` child is a group, which a `<label for>` can't name: Field renders its label as a span and sets `aria-labelledby` on the group, merged with any the group already has. The group turns `required` into `aria-required`, and passes focus to a radio, so an `ErrorSummary` link to its `id` lands where the arrow keys work (see RadioGroup, "In a form").

- Do write the error as the fix: "Use at least 5 characters", not "Invalid input".
- Don't show an error before the person has finished with the field; validate on blur or submit.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Field` as first used in its preview:

```tsx
import { Field, Input } from 'altitude-design';

<Field label="Workspace name" hint="Shown to everyone you invite.">
  <Input defaultValue="Kestrel Dental" />
</Field>
```

The full preview, as rendered in Storybook and checked in CI (`grid` is the preview page's own layout class, not Altitude's):

```tsx
import * as React from 'react';
import { Field, Input } from 'altitude-design';

export default function App() {
  const [v, setV] = React.useState('kestrel-dental');
  const err = v.length < 5 ? 'Use at least 5 characters.' : null;
  return (
    <div className="grid">
      <Field label="Workspace name" hint="Shown to everyone you invite.">
        <Input defaultValue="Kestrel Dental" />
      </Field>
      <Field label="URL slug" required error={err}>
        <Input value={v} onChange={(e) => setV(e.target.value)} />
      </Field>
    </div>
  );
}
```
<!-- /example -->
