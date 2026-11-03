# PasswordInput

A password field: signing in, signing up, a reset, "change password" in settings.

**Elevation.** It's an `Input`, so it's an opening that fills. In its end cap sits a reveal `Toggle`. While the password shows, the toggle is on: sunk and filled, as every Toggle is. Its name ("Show password") never changes; `aria-pressed` says whether it's on.

**Strength is a reading.** When you pass `strength`, the score (0–4, from your scoring: zxcvbn or your own rules) is shown as a `Meter`: a flush track with flat ink, never `Progress`'s raised fill, because a password's strength is a reading, not a task moving toward done (see [Charts](../../Charts.md)). The word ("Weak", "Good", "Strong") sits beside the label and carries the meaning. The fill stays the meter's own colour: Meter's thresholds mean "higher is worse", which is backwards for strength.

**Requirements** are stamped as they're met, like a done `Checklist` item: muted, with a check pressed into a small well. Unmet ones keep an empty ring.

**Caps Lock.** While the field is focused and Caps Lock is on, a caption with an icon says "Caps Lock is on".

**Accessibility.** A plain `<input type="password">`, with `autocomplete="new-password"` when there's a strength meter or requirements, and `"current-password"` otherwise (pass `autoComplete` to say otherwise). The reveal toggle is a separate tab stop after the field, and revealing doesn't move focus. Strength, requirements and the caps-lock notice describe the field (`aria-describedby`). Strength and unmet requirements are announced politely once typing pauses (0.9s), not on every key. The meter's value text is the word. Under forced colours the requirement stamps and the caps-lock icon are `CanvasText`.

**Props:** `strength` (`(value) => 0–4`); `strengthLabels`; `requirements` (`{ label, test }[]`); `revealLabel` (default "Show password"); and every `Input` prop except `type` and `trailing`.

**You provide:** the scoring and the rules, when people are creating a password. For signing in, nothing more than a label.

```tsx
<Field label="New password">
  <PasswordInput
    strength={(v) => zxcvbn(v).score}
    requirements={[
      { label: 'At least 12 characters', test: (v) => v.length >= 12 },
      { label: 'Not a common password', test: notCommon },
    ]}
  />
</Field>
```

- Do let people reveal what they typed; masking alone causes errors.
- Do say your rules before someone breaks them, as requirements.
- Don't draw strength as a progress bar.
- Don't show a strength meter when signing in; it's for creating a password.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`PasswordInput` as first used in its preview:

```tsx
import { PasswordInput } from 'altitude-design';

<PasswordInput defaultValue="correct horse" />
```

The full preview, as rendered in Storybook and checked in CI (`pw` is the preview page's own layout class, not Altitude's):

```tsx
import { Field, PasswordInput } from 'altitude-design';

// A stand-in score: in an app this would be zxcvbn or your own rules.
const score = (v) => Math.min(4, [v.length >= 8, v.length >= 12, /[A-Z]/.test(v) && /[a-z]/.test(v), /\d/.test(v), /[^\w\s]/.test(v)].filter(Boolean).length - (v.length < 8 ? 1 : 0));
const common = ['password', 'password1', '12345678', 'qwerty123'];
export default function App() {
  return (
    <div className="pw">
      <Field label="Password"><PasswordInput defaultValue="correct horse" /></Field>
      <Field label="New password">
        <PasswordInput defaultValue="Glacier7" strength={score}
          requirements={[
            { label: 'At least 12 characters', test: (v) => v.length >= 12 },
            { label: 'Not a common password', test: (v) => v.length > 0 && !common.includes(v.toLowerCase()) },
          ]} />
      </Field>
    </div>
  );
}
```
<!-- /example -->
