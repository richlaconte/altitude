// Developer settings pattern: a new key is shown once in a dialog that Escape can't close until it's saved; the list
// shows keys masked, never in full, with when each was last used; rolling says the old key's overlap in words; revoking
// says what breaks behind a danger button; a webhook retry hovers as a pending write with its attempt, then lands
// delivered; a test event shows its payload; an integration's OAuth handoff is pending until it's connected, and
// disconnecting says what stops. Run after a render of every preview (it opens
// test/p-DeveloperSettingsPattern-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 1000 } });
await page.goto(`file://${T}p-DeveloperSettingsPattern-daylight.html`);
await page.waitForTimeout(400);
const status = () => page.evaluate(() => document.querySelector('.dv-page > [role="status"]').textContent);

await page.getByRole('button', { name: 'Create key' }).click();
await page.waitForTimeout(400);
await page.getByLabel('Key name').fill('Billing service');
await page.getByRole('dialog').getByRole('button', { name: 'Create key' }).click();
await page.waitForTimeout(800);
const save = page.getByRole('dialog', { name: 'Save your new key' });
const shown = await save.evaluate((d) => d.textContent + [...d.querySelectorAll('input')].map((i) => i.value).join(' '));
expect(/You won’t see this key again/.test(shown) && /ak_live_EXAMPLE_7Hq2Xv9LmR3p/.test(shown), 'a new key is shown in full, once, with the warning');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
expect(await save.count() === 1 && await save.getByRole('button', { name: 'Done' }).isDisabled(), 'the dialog can’t close until the key is saved');
await save.getByText("I've saved this key").click();
await page.waitForTimeout(200);
await save.getByRole('button', { name: 'Done' }).click();
await page.waitForTimeout(400);
const list = await page.evaluate(() => document.querySelector('[aria-labelledby="dv-keys-h"] tbody').textContent);
expect(/Billing service/.test(list) && !/EXAMPLE_7Hq2/.test(list) && /ak_live_••••/.test(list) && /Never used/.test(list), 'the list shows keys masked, with when each was last used');

await page.getByRole('button', { name: 'Roll Production key' }).click();
await page.waitForTimeout(400);
let d = page.getByRole('dialog', { name: 'Roll the Production key?' });
expect(/keeps working for 24 hours/.test(await d.textContent()), 'rolling says the old key’s overlap in words');
await d.getByRole('button', { name: 'Roll key' }).click();
await page.waitForTimeout(900);
expect(/rolled\. The old key keeps working for 24 hours\./.test(await status()), 'and says so once rolled');
await page.getByRole('button', { name: 'Revoke CI pipeline key' }).click();
await page.waitForTimeout(400);
d = page.getByRole('dialog', { name: 'Revoke the CI pipeline key?' });
expect(/Requests that use it fail immediately/.test(await d.textContent()) && await d.getByRole('button', { name: 'Revoke key' }).getAttribute('data-variant') === 'danger', 'revoking says what breaks behind a danger button');
await d.getByRole('button', { name: 'Revoke key' }).click();
await page.waitForTimeout(900);
expect(!/CI pipeline/.test(await page.evaluate(() => document.querySelector('[aria-labelledby="dv-keys-h"] tbody').textContent)) && /revoked/.test(await status()), 'a revoked key leaves the list, and it’s said');

await page.getByRole('button', { name: 'Retry' }).click();
await page.waitForTimeout(400);
let item = await page.evaluate(() => { const i = [...document.querySelectorAll('.alt-timeline-item')].find((n) => n.textContent.includes('customer.updated')); return { status: i.dataset.status, text: i.textContent }; });
expect(item.status === 'pending' && /Retrying \(attempt 4 of 5\)/.test(item.text), `a retry hovers as a pending write with its attempt (${item.status})`);
await page.waitForTimeout(900);
item = await page.evaluate(() => { const i = [...document.querySelectorAll('.alt-timeline-item')].find((n) => n.textContent.includes('customer.updated')); return { status: i.dataset.status, text: i.textContent }; });
expect(item.status === 'committed' && /Delivered/.test(item.text), 'then lands, delivered');
await page.getByRole('button', { name: 'Send test event' }).click();
await page.waitForTimeout(300);
expect(/"type": "invoice.paid"/.test(await page.evaluate(() => document.querySelector('.alt-code')?.textContent || '')), 'a test event shows its payload');

await page.getByRole('button', { name: 'Connect Calendar sync' }).click();
await page.waitForTimeout(500);
const card = () => page.evaluate(() => { const c = [...document.querySelectorAll('.dv-app')].find((n) => n.textContent.includes('Calendar sync')); return { status: c.dataset.status || '', text: c.textContent }; });
let c = await card();
expect(c.status === 'pending' && /Waiting for authorization/.test(c.text), 'the OAuth handoff is pending');
await page.waitForTimeout(1000);
c = await card();
expect(c.status !== 'pending' && /Connected/.test(c.text), 'then the integration is connected');
await page.locator('.dv-app', { hasText: 'Team chat' }).getByRole('button', { name: 'Disconnect' }).click();
await page.waitForTimeout(400);
d = page.getByRole('dialog', { name: 'Disconnect Team chat?' });
expect(/stops receiving updates/.test(await d.textContent()), 'disconnecting says what stops');

console.log(`Developer settings pattern: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
