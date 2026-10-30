// Auth pattern (project/framework/patterns/auth.md): sign in on a raised Card (level 1, never a Dialog), with SSO, a
// password, or an emailed link; sign up and verify the email; two-factor with a one-time code or a recovery code; reset. The copy never reveals
// whether an account exists, rate limits are said with the wait, nothing is submitted for the person, and the email
// is kept across steps. Demo: any email; the password is "altitude"; the code is 123456.
// The lines between the preview markers are its "AuthPattern" preview (scripts/pattern-previews.mjs copies them);
// build/checks/pattern-types.mjs type-checks this file against the public declarations and fails if the two differ.
import * as React from 'react';
import * as A from 'altitude-design';
// preview:start
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const RULES = [{ label: 'At least 12 characters', test: (v) => v.length >= 12 }, { label: 'Not just letters', test: (v) => /[^a-z]/i.test(v) }];
function App() {
  const [step, setStep] = React.useState('sign-in');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [recovery, setRecovery] = React.useState('');
  const [trust, setTrust] = React.useState(false);
  const [busy, setBusy] = React.useState('');
  const [errors, setErrors] = React.useState(/** @type {{ id: string, label: string, message: string }[]} */ ([]));
  const [tries, setTries] = React.useState(0);
  const [submits, setSubmits] = React.useState(0);
  const [resendIn, setResendIn] = React.useState(0);
  const heading = React.useRef(/** @type {HTMLHeadingElement | null} */ (null));
  React.useEffect(() => { if (resendIn <= 0) return; const t = setTimeout(() => setResendIn((s) => s - 1), 1000); return () => clearTimeout(t); }, [resendIn]);
  const go = (next) => { setStep(next); setErrors([]); setBusy(''); requestAnimationFrame(() => heading.current?.focus()); };
  const fail = (list) => { setErrors(list); setSubmits((n) => n + 1); };
  const signIn = async (e) => {
    e.preventDefault();
    const list = [];
    if (!isEmail(email)) list.push({ id: 'au-email', label: 'Email', message: 'Enter your email address, like name@example.com.' });
    if (!password) list.push({ id: 'au-password', label: 'Password', message: 'Enter your password.' });
    if (list.length) return fail(list);
    if (tries >= 3) return fail([{ id: 'au-password', label: 'Password', message: 'Too many attempts. Wait 5 minutes, then try again, or reset your password.' }]);
    setBusy('password'); await wait(800); setBusy('');
    if (password !== 'altitude') { setTries((n) => n + 1); setPassword(''); return fail([{ id: 'au-password', label: 'Password', message: 'That email and password don’t match. Try again or reset your password.' }]); }
    go('two-factor');
  };
  const sendLink = async (next) => {
    if (!isEmail(email)) return fail([{ id: 'au-email', label: 'Email', message: 'Enter your email address, like name@example.com.' }]);
    setBusy('link'); await wait(700); setResendIn(30); go(next);
  };
  const signUp = async (e) => {
    e.preventDefault();
    const list = [];
    if (!name.trim()) list.push({ id: 'au-name', label: 'Name', message: 'Enter your name.' });
    if (!isEmail(email)) list.push({ id: 'au-email', label: 'Email', message: 'Enter your email address, like name@example.com.' });
    if (!RULES.every((r) => r.test(password))) list.push({ id: 'au-password', label: 'Password', message: 'Choose a password that meets both requirements.' });
    if (list.length) return fail(list);
    setBusy('password'); await wait(800); setCode(''); setResendIn(30); go('verify');
  };
  const verify = async (value) => {
    setBusy('code'); await wait(700);
    if (value !== '123456') { setBusy(''); setCode(''); return fail([{ id: 'au-code', label: 'Code', message: 'That code didn’t work. Check your authenticator app and enter the newest code.' }]); }
    go('done');
  };
  const field = (id) => errors.find((x) => x.id === id)?.message;
  const resend = <p className="au-note">{resendIn > 0 ? `You can resend the email in ${resendIn} ${resendIn === 1 ? 'second' : 'seconds'}.` : <A.Button variant="ghost" size="sm" onClick={() => sendLink(step)}>Resend the email</A.Button>}</p>;
  return (
    <main className="au-page">
      <A.Card className="au-card">
        {step === 'sign-in' && <>
          <h2 ref={heading} tabIndex={-1} className="au-h">Sign in to Acme</h2>
          <A.Button className="au-wide" onClick={() => go('sso')}>Continue with single sign-on (SSO)</A.Button>
          <A.Separator label="or" />
          <form className="au-form" noValidate onSubmit={signIn} aria-labelledby="au-pw-h">
            <span id="au-pw-h" hidden>Sign in with a password</span>
            <A.ErrorSummary errors={errors} focusKey={submits} title="We couldn’t sign you in" />
            <A.Field label="Email" error={field('au-email')}><A.Input id="au-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></A.Field>
            <A.Field label="Password" error={field('au-password')}><A.PasswordInput id="au-password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></A.Field>
            <A.Button type="submit" variant="primary" className="au-wide" loading={busy === 'password'}>{busy === 'password' ? 'Signing in' : 'Sign in'}</A.Button>
          </form>
          <div className="au-links"><A.Button variant="ghost" size="sm" loading={busy === 'link'} onClick={() => sendLink('link-sent')}>Email me a sign-in link</A.Button><A.Button variant="ghost" size="sm" onClick={() => go('reset')}>Forgot your password?</A.Button></div>
          <p className="au-note">New to Acme? <A.Button variant="ghost" size="sm" onClick={() => { setPassword(''); go('sign-up'); }}>Create an account</A.Button></p>
        </>}
        {step === 'sign-up' && <>
          <h2 ref={heading} tabIndex={-1} className="au-h">Create your Acme account</h2>
          <form className="au-form" noValidate onSubmit={signUp} aria-label="Create an account">
            <A.ErrorSummary errors={errors} focusKey={submits} />
            <A.Field label="Name" error={field('au-name')}><A.Input id="au-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></A.Field>
            <A.Field label="Email" error={field('au-email')}><A.Input id="au-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></A.Field>
            <A.Field label="Password" error={field('au-password')}><A.PasswordInput id="au-password" autoComplete="new-password" requirements={RULES} value={password} onChange={(e) => setPassword(e.target.value)} /></A.Field>
            <A.Button type="submit" variant="primary" className="au-wide" loading={busy === 'password'}>{busy === 'password' ? 'Creating account' : 'Create account'}</A.Button>
          </form>
          <A.Button variant="ghost" size="sm" onClick={() => go('sign-in')}>I already have an account</A.Button>
        </>}
        {step === 'verify' && <>
          <h2 ref={heading} tabIndex={-1} className="au-h">Verify your email</h2>
          <p>We sent a 6-digit code to <strong>{email}</strong>. It works for 10 minutes.</p>
          <A.ErrorSummary errors={errors} focusKey={submits} title="We couldn’t verify that code" />
          <A.Field label="Verification code" error={field('au-code')}><A.InputOTP id="au-code" maxLength={6} value={code} onChange={setCode} verifying={busy === 'code'} autoComplete="one-time-code" /></A.Field>
          <A.Button variant="primary" className="au-wide" loading={busy === 'code'} disabled={code.length < 6} onClick={() => verify(code)}>{busy === 'code' ? 'Verifying' : 'Verify email'}</A.Button>
          {resend}
          <A.Button variant="ghost" size="sm" onClick={() => go('sign-up')}>Change email address</A.Button>
        </>}
        {step === 'link-sent' && <>
          <h2 ref={heading} tabIndex={-1} className="au-h">Check your email</h2>
          <p>If <strong>{email}</strong> has an Acme account, we’ve sent a sign-in link to it. The link works once, for 15 minutes.</p>
          {resend}
          <A.Button variant="ghost" size="sm" onClick={() => go('sign-in')}>Use a different email address</A.Button>
        </>}
        {step === 'sso' && <>
          <h2 ref={heading} tabIndex={-1} className="au-h">Sign in with SSO</h2>
          <A.Field label="Work email" hint="We’ll send you to your company’s sign-in page."><A.Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></A.Field>
          <A.Button variant="primary" className="au-wide" onClick={() => go('sign-in')}>Continue</A.Button>
          <A.Button variant="ghost" size="sm" onClick={() => go('sign-in')}>Back to sign in</A.Button>
        </>}
        {step === 'two-factor' && <>
          <h2 ref={heading} tabIndex={-1} className="au-h">Enter your code</h2>
          <p>Open your authenticator app and enter the 6-digit code for Acme.</p>
          <A.ErrorSummary errors={errors} focusKey={submits} title="We couldn’t verify that code" />
          <A.Field label="Authentication code" error={field('au-code')}>
            <A.InputOTP id="au-code" maxLength={6} value={code} onChange={setCode} verifying={busy === 'code'} autoComplete="one-time-code" />
          </A.Field>
          <A.Checkbox label="Trust this device for 30 days" checked={trust} onCheckedChange={setTrust} />
          <A.Button variant="primary" className="au-wide" loading={busy === 'code'} disabled={code.length < 6} onClick={() => verify(code)}>{busy === 'code' ? 'Verifying' : 'Verify'}</A.Button>
          <A.Button variant="ghost" size="sm" onClick={() => go('recovery')}>Use a recovery code instead</A.Button>
        </>}
        {step === 'recovery' && <>
          <h2 ref={heading} tabIndex={-1} className="au-h">Use a recovery code</h2>
          <A.Field label="Recovery code" hint="One of the codes you saved when you set up two-factor. Each works once."><A.Input autoComplete="off" value={recovery} onChange={(e) => setRecovery(e.target.value)} /></A.Field>
          <A.Button variant="primary" className="au-wide" onClick={() => go('done')}>Verify</A.Button>
          <A.Button variant="ghost" size="sm" onClick={() => go('two-factor')}>Use your authenticator app</A.Button>
        </>}
        {step === 'reset' && <>
          <h2 ref={heading} tabIndex={-1} className="au-h">Reset your password</h2>
          <A.ErrorSummary errors={errors} focusKey={submits} />
          <A.Field label="Email" error={field('au-email')}><A.Input id="au-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></A.Field>
          <A.Button variant="primary" className="au-wide" loading={busy === 'link'} onClick={() => sendLink('reset-sent')}>Send reset link</A.Button>
          <A.Button variant="ghost" size="sm" onClick={() => go('sign-in')}>Back to sign in</A.Button>
        </>}
        {step === 'reset-sent' && <>
          <h2 ref={heading} tabIndex={-1} className="au-h">Check your email</h2>
          <p>If <strong>{email}</strong> has an Acme account, we’ve sent a link to reset its password. The link works once, for 1 hour.</p>
          {resend}
          <A.Button variant="ghost" size="sm" onClick={() => go('sign-in')}>Back to sign in</A.Button>
        </>}
        {step === 'done' && <>
          <h2 ref={heading} tabIndex={-1} className="au-h">You’re signed in</h2>
          <p>{trust ? 'This device won’t ask for a code for 30 days.' : 'We’ll ask for a code next time you sign in on this device.'}</p>
          <A.Button variant="ghost" size="sm" onClick={() => { setPassword(''); setCode(''); setTries(0); go('sign-in'); }}>Sign out</A.Button>
        </>}
      </A.Card>
    </main>
  );
}
// preview:end
export default App;
