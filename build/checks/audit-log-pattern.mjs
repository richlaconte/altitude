// Audit log pattern: entries are the record, flush rows that read as one sentence and never lift; an entry expands to
// show what changed; the server pages the log, holding the rows while the next page loads; filtering narrows it and
// returns to the first page; exporting runs as a task (Progress with its percentage), then a toast offers the download
// and the export is logged; a record's activity is a Timeline whose times have their exact value. Run after a render of
// every preview (it opens test/p-AuditLogPattern-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 1000 } });
await page.goto(`file://${T}p-AuditLogPattern-daylight.html`);
await page.waitForTimeout(500);
const table = page.getByRole('table', { name: 'Audit log events' });
const events = () => table.locator('tbody tr:not(.alt-dt-detail-row) td:nth-child(2)').allTextContents();

let first = await events();
expect(first.length === 5 && /^Maya Chen changed Ines Duarte’s role from Member to Admin$/.test(first[0]), `each entry reads as one sentence (${first[0]})`);
await table.locator('tbody tr').nth(1).hover();
await page.waitForTimeout(250);
const flush = await table.locator('tbody tr').nth(1).evaluate((r) => ({ t: getComputedStyle(r).transform, button: r.querySelector('[role="button"], a') !== null }));
expect(flush.t === 'none' && !flush.button, `entries are flush and don’t lift (${JSON.stringify(flush)})`);

await table.getByRole('button', { name: /Maya Chen changed Ines Duarte’s role/ }).first().click();
await page.waitForTimeout(400);
const diff = await page.evaluate(() => document.querySelector('.alt-diff')?.textContent || '');
expect(/Member/.test(diff) && /Admin/.test(diff), 'an entry expands to show what changed');

await page.getByRole('button', { name: 'Next page' }).click();
await page.waitForTimeout(150);
expect(await page.evaluate(() => !!document.querySelector('[aria-busy="true"], [data-loading]')), 'the next page loads with the rows held');
await page.waitForTimeout(500);
const second = await events();
expect(second.length === 5 && second[0] !== first[0], 'the server pages the log');

await page.getByRole('button', { name: 'Export CSV' }).click();
await page.waitForTimeout(600);
const job = await page.evaluate(() => ({ bar: !!document.querySelector('.al-export [role="progressbar"]'), words: document.querySelector('.al-export [role="status"]')?.textContent }));
expect(job.bar && /^Preparing export, \d+%$/.test(job.words || ''), `exporting is a task with its percentage (${JSON.stringify(job)})`);
await page.waitForTimeout(1400);
expect(await page.getByRole('button', { name: 'Download' }).count() === 1, 'a toast offers the download');
await page.getByRole('button', { name: 'Page 1' }).click().catch(() => {});
await page.waitForTimeout(600);
expect((await events())[0] === 'Maya Chen exported 22 audit log events as CSV', 'and the export is itself logged');

await page.getByRole('button', { name: 'Next page' }).click();
await page.waitForTimeout(600);
expect(await page.locator('[aria-current="page"]').first().textContent() === '2', 'on page 2 before filtering');
await page.getByRole('button', { name: 'Add filter' }).click();
await page.getByRole('option', { name: 'Actor' }).click();
await page.getByRole('dialog', { name: 'Actor is' }).waitFor();
await page.getByRole('option', { name: 'Theo Marsh' }).click();
await page.waitForTimeout(300);
const theo = await events();
expect(theo.length > 0 && theo.every((e) => e.startsWith('Theo Marsh')), `filtering narrows the log (${theo.length} rows)`);
expect(await page.locator('[aria-current="page"]').first().textContent() === '1', 'and returns to the first page');

const times = await page.evaluate(() => [...document.querySelectorAll('.al-record time')].map((t) => t.getAttribute('datetime')));
expect(times.length === 3 && times.every(Boolean), 'record activity is a Timeline whose times carry their exact value');

console.log(`Audit log pattern: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
