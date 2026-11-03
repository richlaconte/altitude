# RadioGroup

Chooses exactly one option. A radio group is built like the Switch with more positions: **one switch, several positions, one thumb**.

Each option is a round trench, the same as the switch track. The group owns a single raised thumb; choosing an option slides it to that track on `ease-settle`, and the accent pours into the track from under the thumb as it arrives while the old one drains. Because there's only one thumb, the choice can't be in two places, and its movement shows where it came from. Hovering an unchosen option shows a faint ghost of the thumb where it would land (feedforward); hovering the chosen option lifts the thumb; pressing it stretches the thumb, like a switch. Arrow keys move the choice, as native radios do, and the thumb follows.

**You provide:** `Radio` children with `value`, `label` and optional `description`; `value`/`onValueChange` or `defaultValue`; an `aria-label` for the group if there's no visible heading; `orientation="horizontal"` for two or three short options.

## In a form

A required choice sits in a `Field`, like every other control: `<Field label="Treatment" required error={errors.service}><RadioGroup …></Field>`. Field names the group with `aria-labelledby` (a `<label for>` can't name a group), and sets `aria-required`, `aria-describedby` and `invalid` on it. Native `required` is never put on the radios, because the browser's own bubble would compete with Field's error and `ErrorSummary`.

Invalid, the tracks keep their trench depth and take the critical tint and rim, and the rim stays critical on hover. A chosen option the server refused ("That time was just booked") keeps its accent and gets a critical ring. An option that can't be chosen keeps its disabled reading. Under forced colours the tracks are dashed already, so the whole group is outlined.

The group takes the `id`, and focusing it passes focus to a radio, so an `ErrorSummary` link (or any `getElementById(id).focus()`) lands where the arrow keys work at once: on the checked radio, which a server's error is about, or else on the first enabled one. The group itself is never in the Tab order.

- Default to a sensible choice; a group with no thumb is rarely what you want.
- Don't use radios for more than about six options; use a menu.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`RadioGroup` as first used in its preview:

```tsx
import { Radio, RadioGroup } from 'altitude-design';

<RadioGroup defaultValue="team" aria-label="Plan">
  <Radio value="solo" label="Solo" description="One seat, unlimited projects." />
  <Radio value="team" label="Team" description="Up to 20 seats and shared libraries." />
  <Radio value="org" label="Organization" disabled description="Talk to us." />
</RadioGroup>
```

The full preview, as rendered in Storybook and checked in CI (`pair`, `col` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Field, Radio, RadioGroup } from 'altitude-design';

export default function App() {
  const [invoice, setInvoice] = React.useState('');
  return (
    <div className="pair">
      <RadioGroup defaultValue="team" aria-label="Plan">
        <Radio value="solo" label="Solo" description="One seat, unlimited projects." />
        <Radio value="team" label="Team" description="Up to 20 seats and shared libraries." />
        <Radio value="org" label="Organization" disabled description="Talk to us." />
      </RadioGroup>
      <div className="col">
        <RadioGroup defaultValue="m" orientation="horizontal" aria-label="Size">
          <Radio value="s" label="Small" /><Radio value="m" label="Medium" /><Radio value="l" label="Large" />
        </RadioGroup>
        <Field label="Send invoices by" required error={invoice ? null : 'Choose how invoices reach you.'}>
          <RadioGroup value={invoice} onValueChange={setInvoice} orientation="horizontal">
            <Radio value="email" label="Email" /><Radio value="post" label="Post" /><Radio value="fax" label="Fax" disabled />
          </RadioGroup>
        </Field>
      </div>
    </div>
  );
}
```
<!-- /example -->
