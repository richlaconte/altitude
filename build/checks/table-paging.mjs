// DataTable pagination: pages mode puts Pagination in the footer with its summary; while the next page loads the rows
// are at half strength, the table is aria-busy and the thumb is held pressed; the new page lands. "Load more" appends
// rows that take the afterglow, says the new range and hides the button when there's no more. Run after a render of
// every preview (it opens test/p-TablePaging-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
await page.goto(`file://${T}p-TablePaging-daylight.html`);
await page.waitForTimeout(400);

const pages = () => page.evaluate(() => {
  const t = document.querySelectorAll('.alt-data-table')[0], table = t.querySelector('table');
  return { first: t.querySelector('tbody td').textContent, busy: table.getAttribute('aria-busy'), opacity: getComputedStyle(t.querySelector('tbody')).opacity,
    summary: t.querySelector('.alt-pager-summary')?.textContent, held: t.querySelector('.alt-pager-thumb')?.hasAttribute('data-loading'), nav: t.querySelector('nav.alt-pager')?.getAttribute('aria-label') };
});
let r = await pages();
expect(r.nav === 'Invoices pages' && r.summary === '1–8 of 214 invoices' && r.first === 'INV-1000', `Pagination in the footer, with its summary (${r.summary})`);
await page.click('.alt-data-table >> nth=0 >> [aria-label="Page 2"]');
await page.waitForTimeout(300);
r = await pages();
expect(r.busy === 'true' && Number(r.opacity) < 0.6 && r.held, `while loading: aria-busy, rows at half strength, the thumb held (${r.opacity})`);
expect(r.first === 'INV-1000', 'the old rows stay while the next page loads');
await page.waitForTimeout(500);
r = await pages();
expect(r.busy === null && Number(r.opacity) === 1 && r.first === 'INV-1008' && r.summary === '9–16 of 214 invoices', `the new page lands (${r.first})`);

const more = () => page.evaluate(() => {
  const t = document.querySelectorAll('.alt-data-table')[1];
  return { rows: t.querySelectorAll('tbody tr').length, summary: t.querySelector('.alt-pager-summary')?.textContent, button: !!t.querySelector('.alt-table-foot .alt-btn'),
    glowing: t.querySelectorAll('tbody tr[data-row-settle]').length, said: t.querySelector(':scope > .alt-sr[aria-live]').textContent.trim() };
});
let m = await more();
expect(m.rows === 6 && m.summary === '6 of 46 events' && m.button, `Load more with "6 of 46 events" (${m.summary})`);
await page.click('.alt-data-table >> nth=1 >> button:has-text("Load more")');
await page.waitForTimeout(800);
m = await more();
expect(m.rows === 12 && m.summary === '12 of 46 events', `it appends the next rows (${m.rows})`);
expect(m.glowing === 6, `the appended rows take the afterglow, the old ones don't (${m.glowing})`);
expect(m.said.includes('6 more loaded, 12 of 46.'), `the new range is announced (${m.said})`);
for (let i = 0; i < 6; i++) { await page.click('.alt-data-table >> nth=1 >> button:has-text("Load more")'); await page.waitForTimeout(700); }
m = await more();
expect(m.rows === 46 && !m.button, `when there's no more, the button goes (${m.rows})`);

console.log(`Table paging: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
