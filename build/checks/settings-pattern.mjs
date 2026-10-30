// Settings pattern: every section is a region named by its heading; a row's label and description name and describe its
// control; an apply-now switch hovers while its write is pending, lands with "Saved", and a failed write drops into a
// trench, says so and puts the switch back; a read-only section disables its rows and says why; the danger zone is the
// same height as the other sections with a critical rim; general fields join one draft that the SaveBar saves; deleting
// needs the workspace's name typed into a stationary dialog. Run after a render of every preview (it opens
// test/p-SettingsPattern-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 900 } });
await page.goto(`file://${T}p-SettingsPattern-daylight.html`);
await page.waitForTimeout(400);

const regions = await page.evaluate(() => [...document.querySelectorAll('.alt-settings-section')].map((s) => document.getElementById(s.getAttribute('aria-labelledby')).textContent));
expect(regions.join() === 'General,Notifications,Billing,Danger zone', `each section is named by its heading (${regions})`);
const digest = page.getByRole('switch', { name: 'Weekly digest' });
expect(await digest.count() === 1, 'the row label names its switch');
expect(await digest.evaluate((b) => b.getAttribute('aria-describedby').split(' ').map((id) => document.getElementById(id).textContent).join()) === 'A summary of activity every Monday.', 'and the description describes it');

const row = (name) => page.evaluate((name) => { const r = [...document.querySelectorAll('.alt-settings-row')].find((r) => r.querySelector('.alt-settings-label').textContent === name);
  return { status: r.dataset.status, words: r.querySelector('.alt-settings-status').textContent, checked: r.querySelector('[role="switch"]')?.getAttribute('aria-checked') }; }, name);
await digest.click();
await page.waitForTimeout(450);
let r = await row('Weekly digest');
expect(r.status === 'pending' && r.words === 'Saving…' && r.checked === 'false', `an apply-now change hovers while it saves (${JSON.stringify(r)})`);
expect(await page.evaluate(() => getComputedStyle(document.querySelector('.alt-settings-row[data-status="pending"]')).animationName) === 'alt-hover', 'it hovers');
await page.waitForTimeout(800);
r = await row('Weekly digest');
expect(r.status === 'committed' && r.words === 'Saved' && r.checked === 'false', `then lands, saved (${JSON.stringify(r)})`);
await page.getByRole('switch', { name: 'Make the next change fail' }).click();
await page.getByRole('switch', { name: 'Mentions' }).click();
await page.waitForTimeout(1300);
r = await row('Mentions');
expect(r.status === 'failed' && /Couldn’t save/.test(r.words) && r.checked === 'true', `a failed write drops, says so and is put back (${JSON.stringify(r)})`);
await page.getByRole('switch', { name: 'Make the next change fail' }).click();

const billing = await page.evaluate(() => { const s = document.getElementById('st-billing'), f = s.querySelector('fieldset');
  return { disabled: s.querySelector('input').matches(':disabled'), reason: document.getElementById(f.getAttribute('aria-describedby')).textContent }; });
expect(billing.disabled && /Only workspace owners/.test(billing.reason), `a read-only section disables its rows and says why (${JSON.stringify(billing)})`);
const danger = await page.evaluate(() => { const d = document.getElementById('st-danger'), g = document.getElementById('st-general'), cs = getComputedStyle(d);
  return { tone: d.dataset.tone, inset: /inset/.test(cs.boxShadow), same: cs.transform === getComputedStyle(g).transform && cs.zIndex === getComputedStyle(g).zIndex }; });
expect(danger.tone === 'critical' && danger.inset && danger.same, `the danger zone has a critical rim at the same height (${JSON.stringify(danger)})`);

await page.fill('#ws-name', 'Acme Labs');
await page.waitForTimeout(900);
expect(await page.locator('.alt-savebar[data-state="open"], .alt-savebar:not([data-state="closed"])').count() === 1, 'a changed field opens the SaveBar');
await page.fill('#ws-url', 'Acme Labs');
await page.getByRole('button', { name: 'Save changes' }).click();
await page.waitForTimeout(300);
expect(await page.evaluate(() => document.activeElement.closest('.alt-error-summary') !== null), 'an invalid save focuses the error summary');
await page.fill('#ws-url', 'acme-labs');
await page.getByRole('button', { name: 'Save changes' }).click();
await page.waitForTimeout(1400);
expect(await page.inputValue('#ws-name') === 'Acme Labs' && await page.evaluate(() => !document.querySelector('.alt-savebar') || document.querySelector('.alt-savebar').dataset.state === 'closed'), 'saving lowers the bar and keeps the values');

await page.getByRole('button', { name: 'Delete workspace' }).click();
await page.waitForTimeout(500);
const dialog = page.getByRole('dialog', { name: 'Delete Acme workspace?' });
expect(await dialog.count() === 1, 'deleting asks in a dialog');
expect(await page.evaluate(() => !document.querySelector('[data-receded]')), 'the dialog is stationary: nothing behind it recedes');
const confirm = dialog.getByRole('button', { name: 'Delete workspace' });
expect(await confirm.isDisabled(), 'confirming waits for the name');
await dialog.getByLabel('Type Acme to confirm').fill('Acme');
expect(!(await confirm.isDisabled()), 'typing the name enables it');
await confirm.click();
await page.waitForTimeout(1300);
expect(await page.getByRole('heading', { name: 'Workspace deleted' }).count() === 1, 'and only a completed delete says so');

console.log(`Settings pattern: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
