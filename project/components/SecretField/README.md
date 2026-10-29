# SecretField

A key or token: an API key, a webhook signing secret, a personal access token. It follows the flow Stripe, GitHub and Vercel share: the full secret is shown **once**, with copy and a warning, and afterwards only a masked tail (`sk_live_••••4f2a`) with reveal (if allowed), rotate and revoke.

**Elevation: two readings.**
- **A new secret is an opening**, something you must take away. It's a sunk well in mono, which still shows its back wall although it holds text, with a raised "Copy key" beside it and a `caution` warning ("You won't see this key again."). It stays open until the person checks "I've saved this key". Then its floor rises flush, the secret masks to its prefix and tail, and focus moves to the words that replace the checkbox.
- **A stored secret is settled.** It's flush, masked, and part of the record. A reveal `Toggle` shows it again if your app allows that (`onReveal`). "Rotate key" is a secondary button. Revoking is a `HoldButton`: consequence, pushed through the ground.

**Accessibility.** The field is a `role="group"` named by `label`. A shown secret is a read-only input (`aria-readonly`) that selects itself on focus, described by the warning. **A masked secret never reads its bullets**: it's announced as "Secret key, ending in 4f2a". The reveal toggle keeps its name ("Show key") with `aria-pressed`. The acknowledgement is a `Checkbox`, and you gate closing on `onAcknowledge`. Under forced colours the new secret's well is dashed and the stored one solid.

**Props:** `label`; `noun` (default "key"); for a new secret, `value`, `once`, `onAcknowledge`, `acknowledgeLabel`, `warning`; for a stored one, `prefix`, `maskedTail`, `onReveal` (returns the secret, or a promise of it), `onRotate`, `onRevoke`.

**You provide:** the secret (once) or its tail, and what rotate and revoke do. You also keep the dialog open until `onAcknowledge`.

```tsx
// Just created
<SecretField label="Secret key" value={created.secret} once onAcknowledge={() => setSaved(true)} />
<Button variant="primary" disabled={!saved} onClick={close}>Done</Button>

// Stored
<SecretField label="Secret key" prefix="sk_live_" maskedTail="4f2a"
  onReveal={canReveal ? fetchSecret : undefined} onRotate={rotate} onRevoke={revoke} />
```

- Do keep a new secret's dialog open until it's acknowledged.
- Do leave out `onReveal` for secrets you don't store in a retrievable form.
- Don't show a stored secret in full by default.
- Don't put revoke one click away; it's held.
