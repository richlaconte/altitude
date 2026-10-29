# InputOTP

A one-time code: two-factor sign-in, email verification, device approval. Four to eight characters, shown as a row of openings.

**Elevation.** Completeness, applied per character. Each slot is built like an `Input`: an empty slot is a hole with its back wall showing, and **its floor rises flush as its character lands**, so the code shows how far along it is. The slot the next character goes into is held: its floor is lit, it opens to the depth approach would preview, it shows a caret, and it gets the neutral rim when reached by keyboard. A pasted or autofilled code fills left to right, 35ms a slot. A rejected code drops the whole row to a trench on `critical-soft`, with the message from `Field`. While the code is being checked (`verifying`), nothing more can be typed.

**One field, not six.** A single real `<input inputmode="numeric" autocomplete="one-time-code">` lies invisible over the row and drives the slots. So SMS and email autofill, paste (into any slot) and screen readers all see one field. Characters that don't match `pattern` are dropped, so pasting "123-456" gives 123456.

**Accessibility.** One label (from `Field`), described as "6 digits", with errors through `Field`. There are no announcements per slot: the slots are `aria-hidden`, and the input is what's read. Typing, Backspace, Left and Right, Home and End work as they do in any text field. `mask` shows • and makes the input a password field. Under forced colours empty slots are dashed and filled ones solid. Under reduced motion the caret doesn't blink and floors change without travel.

**Parts.**
- `InputOTP`: `maxLength`, `value`, `defaultValue`, `onChange`, `onComplete`, `pattern` (`'digits' | 'alphanumeric' |` a RegExp for one character), `mask`, `invalid`, `verifying`, `disabled`.
- `InputOTPGroup`, `InputOTPSlot` (`index`) and `InputOTPSeparator` lay the slots out. Without children, it's one group of `maxLength` slots.

**You provide:** the length, what happens on `onComplete` (verify the code), and where the code was sent, in `Field`'s hint.

```tsx
<Field label="Verification code" hint="We sent it to j•••@acme.com." error={error}>
  <InputOTP maxLength={6} value={code} onChange={setCode} onComplete={verify}>
    <InputOTPGroup>{[0, 1, 2].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
    <InputOTPSeparator />
    <InputOTPGroup>{[3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
  </InputOTP>
</Field>
```

- Do verify on `onComplete`, without a separate Submit button.
- Do say where the code went and how to get a new one.
- Don't split the code into several inputs; autofill and paste break.
- Don't clear the code on a rejection without saying why; leave it so it can be corrected.
