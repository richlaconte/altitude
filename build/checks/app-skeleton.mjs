// App skeleton: the shell is on the ground; every view has exactly one primary action; the sidebar is reachable and
// usable by keyboard; the list filters, pages and selects; a row opens its record in a Sheet whose PropertyList edits it,
// and Escape returns focus to the row; settings changes raise the SaveBar; nothing logs a page error. Run after a render
// of every preview (it opens test/p-AppSkeleton-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 760 } });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`file://${T}p-AppSkeleton-daylight.html`);
await page.waitForTimeout(500);
const primaries = () => page.evaluate(() => [...document.querySelectorAll('.alt-btn[data-variant="primary"]')].filter((b) => b.getClientRects().length && !b.closest('[role="dialog"], .alt-savebar')).map((b) => b.textContent));

expect(await page.evaluate(() => { const s = getComputedStyle(document.querySelector('.alt-sidebar')); return s.boxShadow === 'none' && s.backgroundColor === getComputedStyle(document.querySelector('.alt-sidebar').closest('.alt-app-shell') || document.body).backgroundColor; }), 'the shell is on the ground: no shadow, the ground colour');
expect((await primaries()).join() === 'Add customer', `the customers view has one primary (${await primaries()})`);
const names = () => page.locator('[aria-label="Customers"] tbody tr td:nth-child(2)').allTextContents();
const first = await names();
await page.getByRole('button', { name: 'Next page' }).click();
await page.waitForTimeout(300);
expect((await names())[0] !== first[0], 'the list pages');
await page.getByRole('button', { name: 'Previous page' }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Add filter' }).click();
await page.getByRole('option', { name: 'Plan' }).click();
await page.getByRole('dialog', { name: 'Plan is' }).waitFor();
await page.getByRole('option', { name: 'Business' }).click();
await page.waitForTimeout(300);
const rows = await page.locator('[aria-label="Customers"] tbody tr').allTextContents();
expect(rows.length === 4 && rows.every((r) => r.includes('Business')), `the filter narrows the list (${rows.length})`);
await page.locator('[aria-label="Customers"] tbody tr').first().getByRole('checkbox').check({ force: true });
await page.waitForTimeout(200);
expect(await page.getByRole('button', { name: 'Email 1' }).count() === 1, 'selecting a row offers its action with a count');

const row = page.getByRole('button', { name: 'Alan Turing' });
await row.click();
await page.waitForTimeout(600);
const sheet = page.getByRole('dialog', { name: 'Alan Turing' });
expect(await sheet.count() === 1 && await sheet.locator('.alt-property-list .alt-property').count() === 3, 'a row opens its record in a Sheet with its properties');
await page.keyboard.press('Escape');
await page.waitForTimeout(600);
expect(await page.evaluate(() => document.activeElement.textContent) === 'Alan Turing', 'closing the sheet returns focus to the row');

await page.getByRole('link', { name: 'Settings' }).focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
expect(await page.getByRole('heading', { name: 'Settings', exact: true }).count() === 1 && await page.getByRole('link', { name: 'Settings' }).getAttribute('aria-current') === 'page', 'the sidebar navigates by keyboard');
expect((await primaries()).length <= 1, `the settings view has at most one primary (${await primaries()})`);
await page.getByLabel('Workspace name').fill('Acme Labs');
await page.waitForTimeout(900);
expect(await page.evaluate(() => { const b = document.querySelector('.alt-savebar'); return !!b && b.dataset.state !== 'closed'; }), 'a settings change raises the SaveBar');
expect(errors.length === 0, `no page errors (${errors.join('; ')})`);

console.log(`App skeleton: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
