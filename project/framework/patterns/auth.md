# Auth

Help someone sign in, create an account, verify their email, pass two-factor, or reset a password, with states and copy that keep them moving without revealing anything to someone else. The layout is simple; the states and words are not.

## Inputs and ownership

Supply the sign-in methods the product offers (password, SSO, emailed link), adapters for each step that return a result without saying whether an account exists, the rate-limit state with its wait, link and code lifetimes, and where to go once signed in. The application owns authentication, session handling, rate limiting and lockout, link and code generation and expiry, bot protection, and account recovery. This contract covers the interface; it does not certify the security of the implementation.

## States and transitions

Put the form on **a raised `Card` at level 1, never a level-5 `Dialog`**: nothing is behind it to recede from, and the summit stays for moments that interrupt. Flows: **sign in** (SSO first when offered, then email and password, then "Email me a sign-in link" and "Forgot your password?"); **sign up** (name, email, a new password whose requirements `PasswordInput` stamps as met); **verify email** (`InputOTP` with the code's lifetime and a resend that counts down in words); **two-factor** (`InputOTP`, "Use a recovery code instead", "Trust this device for 30 days"); **reset** (email, then the same "check your email" screen); **expired or used link** (say which and offer a new one).

Submitting holds the button pressed with its words ("Signing in"). Failure keeps the email and clears only what must be re-entered. A step change moves focus to the new step's heading.

**Security copy rules.** Never reveal whether an account exists: "That email and password don't match", "If that address has an account, we've sent a link". State rate limits in words with the wait ("Too many attempts. Wait 5 minutes, then try again, or reset your password."). Never submit a password or code for the person: Verify stays a button even when the code is complete. Keep the email across steps and offer to change it on every "check your email" screen.

## Content, keyboard, focus and announcements

Every field has its `autocomplete` token (`username` or `email`, `current-password`, `new-password`, `one-time-code`, `name`) so password managers and autofill work; pasting is never blocked. An unsuccessful submit focuses the error summary, whose links go to the fields. Don't make a cognitive test the only path: no CAPTCHA without an alternative, no transcribing codes without paste. Enter submits the current form; Tab follows the visual order. The card fits at 320px; text wraps. Verify forced colors, zoom, RTL and screen readers announcing each step's heading.

## Recovery and working implementation

A wrong password, wrong code or expired link says what to do next. A rate limit says when to try again and offers reset. Losing access to the authenticator offers recovery codes. The working example in `build/fixtures/patterns/auth.jsx` (shipped as `references/build/fixtures/patterns/auth.jsx`) composes sign-in with SSO, password and emailed link, sign-up with email verification, two-factor with recovery codes, reset, rate limiting and the security copy. It is also the Storybook preview "Patterns/AuthPattern". [Metadata](auth.json) names the runtime and verification sources.

## Rules, verification and evidence

`ALT-AUTH-001` covers the security copy, autocomplete tokens and no auto-submission; `ALT-EDIT-002` covers errors linked to fields; `ALT-STATUS-001` covers announcements. WCAG 2.2's accessible authentication and input-purpose criteria apply. The OWASP authentication cheat sheet is the source for generic responses and rate limiting. `build/checks/auth-pattern.mjs` checks the example in a browser. See [rules](../rules.json) and [evidence](../evidence.json).

See [running examples and verification](../principles.md#run-the-examples-and-verification) for the installed example command, repository test command, and the limits of shipped test-reference snapshots.
