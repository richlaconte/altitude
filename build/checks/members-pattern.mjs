// Members pattern: invalid addresses are refused with the reason; sending invites is a pending write, then each new
// invitation lands as a settled ground row with an "Invited" plate (never hovering) and the result is said per address;
// the only owner can't change their own role and the row says why instead of offering the control; a role change hovers
// while pending, lands as "Role changed", and a failed one drops, says so and restores the role; removing someone names
// what they lose and is said once done; revoking an invitation is said and focus goes to the heading. Run after a render
// of every preview (it opens test/p-MembersPattern-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 1000 } });
await page.goto(`file://${T}p-MembersPattern-daylight.html`);
await page.waitForTimeout(400);
const status = () => page.evaluate(() => [...document.querySelectorAll('.mb-page > [role="status"], .mb-page > .alt-workflow-status, .mb-page > * [role="status"]')].map((n) => n.textContent).join('|'));
const row = (name) => page.evaluate((name) => { const r = [...document.querySelectorAll('tbody tr')].find((r) => r.querySelector('.mb-name').textContent.startsWith(name));
  return r && { status: r.dataset.status || '', settle: r.dataset.settle || '', text: r.textContent, select: !!r.querySelector('[aria-label^="Role for"]'), remove: [...r.querySelectorAll('button')].some((b) => b.textContent === 'Remove'), badge: r.querySelector('.alt-badge')?.textContent }; }, name);

const input = page.getByLabel('Email addresses');
for (const t of ['ana@acme.dev', 'nope', 'theo@acme.dev']) {
  await input.fill(t); await input.press('Enter'); await page.waitForTimeout(150);
  if (t === 'nope') expect(await page.evaluate(() => document.querySelector('.mb-invite .alt-field-error')?.textContent === 'nope isn’t an email address.'), 'an invalid address is refused with the reason');
}
const send = page.getByRole('button', { name: 'Send 2 invites' });
expect(await send.count() === 1, 'the button says how many invites it sends');
await send.click();
await page.waitForTimeout(300);
expect(/Sending invites/.test(await status()), 'sending is said while it happens');
await page.waitForTimeout(900);
let r = await row('ana@acme.dev');
expect(r && r.badge === 'Invited' && r.status === '' && r.settle !== '', `a new invitation lands as a settled row with an Invited plate (${JSON.stringify(r)})`);
expect(await page.evaluate(() => { const r = [...document.querySelectorAll('tbody tr')].find((r) => r.textContent.includes('ana@acme.dev')); return getComputedStyle(r).animationName !== 'alt-hover'; }), 'an invitation awaiting acceptance never hovers');
expect(/1 invite sent, 1 address is already in the workspace\./.test(await status()), `the result is said per address (${await status()})`);

r = await row('Maya Chen');
expect(r && !r.select && !r.remove && /You’re the only owner/.test(r.text), 'the only owner gets the reason instead of a role control or Remove');

await page.getByRole('button', { name: 'Role for Theo Marsh' }).click();
await page.getByRole('option', { name: 'Member' }).click();
await page.waitForTimeout(400);
r = await row('Theo Marsh');
expect(r.status === 'pending' && /Changing role…/.test(r.text), `a role change hovers while it saves (${r.status})`);
await page.waitForTimeout(700);
r = await row('Theo Marsh');
expect(r.status === 'committed' && /Role changed/.test(r.text), 'and lands as changed');
await page.getByRole('switch', { name: 'Make the next role change fail' }).click();
await page.getByRole('button', { name: 'Role for Ines Duarte' }).click();
await page.getByRole('option', { name: 'Viewer' }).click();
await page.waitForTimeout(1100);
r = await row('Ines Duarte');
const shown = await page.getByRole('button', { name: 'Role for Ines Duarte' }).textContent();
expect(r.status === 'failed' && /Couldn’t change the role/.test(r.text) && /Member/.test(shown), `a failed change drops, says so and restores the role (${shown})`);
await page.getByRole('switch', { name: 'Make the next role change fail' }).click();

await page.evaluate(() => [...document.querySelectorAll('tbody tr')].find((r) => r.textContent.includes('Theo Marsh')).querySelector('button:last-of-type').scrollIntoView());
await page.locator('tbody tr', { hasText: 'Theo Marsh' }).getByRole('button', { name: 'Remove' }).click();
await page.waitForTimeout(500);
const dialog = page.getByRole('dialog', { name: 'Remove Theo Marsh?' });
expect(await dialog.count() === 1 && /loses access to 9 projects/.test(await dialog.textContent()), 'removing someone names what they lose');
await dialog.getByRole('button', { name: 'Remove Theo' }).click();
await page.waitForTimeout(1100);
expect(!(await row('Theo Marsh')) && /Theo Marsh was removed\./.test(await status()), 'and is said once they are removed');

await page.locator('tbody tr', { hasText: 'sam@acme.dev' }).getByRole('button', { name: 'Revoke' }).click();
await page.waitForTimeout(300);
expect(!(await row('sam@acme.dev')) && /Invitation to sam@acme.dev revoked\./.test(await status()), 'revoking an invitation is said');
expect(await page.evaluate(() => document.activeElement.id) === 'mb-heading', 'and focus goes to the heading, not the page');

console.log(`Members pattern: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
