// Auth pattern: the form is on a raised Card, never a dialog; every field has its autocomplete token; an empty submit
// focuses the error summary; a wrong password never says whether the account exists, clears only the password and keeps
// the email; repeated failures are rate limited with the wait in words; an emailed link says "if that address has an
// account", counts down before a resend in words, and keeps the email when you go back; two-factor isn't submitted for
// you, a wrong code says so, and the right one signs in; sign-up shows the password rules and asks for a new password.
// Run after a render of every preview (it opens test/p-AuthPattern-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 800 } });
await page.goto(`file://${T}p-AuthPattern-daylight.html`);
await page.waitForTimeout(400);
const focused = () => page.evaluate(() => document.activeElement.textContent || document.activeElement.className);
const text = () => page.evaluate(() => document.querySelector('.au-card').textContent);
const signIn = async (email, password) => {
  await page.fill('#au-email', email); await page.fill('#au-password', password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await page.waitForTimeout(1000);
};

expect(await page.locator('[role="dialog"]').count() === 0 && await page.locator('.au-card.alt-card').count() === 1, 'sign-in is on a raised card, not a dialog');
expect(await page.getAttribute('#au-email', 'autocomplete') === 'username' && await page.getAttribute('#au-password', 'autocomplete') === 'current-password', 'fields carry autocomplete tokens');
await page.getByRole('button', { name: 'Sign in', exact: true }).click();
await page.waitForTimeout(300);
expect(await page.evaluate(() => !!document.activeElement.closest('.alt-error-summary')), 'an empty submit focuses the error summary');
await signIn('maya@acme.dev', 'wrong');
let t = await text();
expect(/That email and password don’t match/.test(t) && !/no account|not found|doesn’t exist/i.test(t), 'a wrong password never says whether the account exists');
expect(await page.inputValue('#au-email') === 'maya@acme.dev' && await page.inputValue('#au-password') === '', 'it keeps the email and clears only the password');
await signIn('maya@acme.dev', 'altitude');
expect(await focused() === 'Enter your code', 'the right password moves to two-factor, focusing its heading');
expect(await page.getAttribute('#au-code', 'autocomplete') === 'one-time-code', 'the code field asks for a one-time code');
const verify = page.getByRole('button', { name: 'Verify', exact: true });
await page.locator('#au-code').pressSequentially('000000');
await page.waitForTimeout(300);
expect(await page.getByRole('heading', { name: 'You’re signed in' }).count() === 0 && !(await verify.isDisabled()), 'a complete code isn’t submitted for you');
await verify.click();
await page.waitForTimeout(1000);
expect(/That code didn’t work/.test(await text()), 'a wrong code says so');
await page.locator('#au-code').pressSequentially('123456');
await verify.click();
await page.waitForTimeout(1000);
expect(await page.getByRole('heading', { name: 'You’re signed in' }).count() === 1, 'the right code signs in');
await page.getByRole('button', { name: 'Sign out' }).click();
await page.waitForTimeout(200);

for (let i = 0; i < 3; i++) await signIn('maya@acme.dev', 'nope');
await signIn('maya@acme.dev', 'nope');
expect(/Too many attempts\. Wait 5 minutes/.test(await text()), 'repeated failures are rate limited, with the wait in words');

await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
await page.waitForTimeout(1000);
t = await text();
expect(await focused() === 'Check your email' && /If maya@acme\.dev has an Acme account, we’ve sent a sign-in link/.test(t), 'the link screen never says whether the account exists');
expect(/You can resend the email in (30|29) seconds\./.test(t), 'a resend waits, with the time in words');
await page.getByRole('button', { name: 'Use a different email address' }).click();
await page.waitForTimeout(200);
expect(await page.inputValue('#au-email') === 'maya@acme.dev', 'going back keeps the email');

await page.getByRole('button', { name: 'Create an account' }).click();
await page.waitForTimeout(200);
expect(await page.getAttribute('#au-password', 'autocomplete') === 'new-password' && /At least 12 characters/.test(await text()), 'sign-up asks for a new password and shows its rules');

console.log(`Auth pattern: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
