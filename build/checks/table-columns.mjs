// DataTable columnsMenu: a "Columns" toolbar button opens a popover with the columns in order (the first can't be
// hidden) and a density switch; hiding a column removes its header and cells and is announced, and the button counts
// hidden columns; reordering moves the column; compact density keeps rows at least 24px tall. Run after a render of
// every preview (it opens test/p-Table-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
await page.goto(`file://${T}p-Table-daylight.html`);
await page.waitForTimeout(400);

const headers = () => page.evaluate(() => [...document.querySelectorAll('.alt-data-table thead th')].map((t) => t.textContent.trim()).filter((t) => t && !['Move', 'Details', 'Edit'].includes(t) && !t.startsWith('Select')));
const cells = () => page.evaluate(() => document.querySelector('.alt-data-table tbody tr').querySelectorAll('td').length);
expect((await headers()).join(',') === 'Project,Environment,Owner,Updated,Requests', `all columns at first (${await headers()})`);
const before = await cells();
await page.click('button:has-text("Columns")');
await page.waitForTimeout(400);
const menu = await page.evaluate(() => { const p = document.querySelector('.alt-table-columns'); return { boxes: [...p.querySelectorAll('.alt-check')].map((c) => c.textContent + ':' + c.querySelector('input').disabled), density: p.querySelector('[role="radiogroup"]')?.getAttribute('aria-label') }; });
expect(menu.boxes[0] === 'Project:true' && menu.boxes.slice(1).every((b) => b.endsWith(':false')), `the first column can't be hidden (${menu.boxes})`);
expect(menu.density === 'Row density', 'a density switch');

await page.click('.alt-table-columns .alt-check:has-text("Owner")');
await page.waitForTimeout(250);
expect(!(await headers()).includes('Owner') && (await cells()) === before - 1, 'hiding a column removes its header and cells');
expect((await page.textContent('button:has-text("Columns")')).includes('1 hidden'), 'the button counts hidden columns');
expect((await page.evaluate(() => document.querySelector('.alt-data-table > .alt-sr[aria-live]').textContent)).includes('Owner column hidden'), 'and it\'s announced');

// Reorder by keyboard: pick up "Requests" and move it up one.
await page.focus('.alt-table-columns .alt-sort-item:has-text("Requests")');
await page.keyboard.press('Space'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('Space');
await page.waitForTimeout(400);
const h = await headers();
expect(h.indexOf('Requests') < h.indexOf('Updated'), `reordering moves the column (${h})`);

const tall = () => page.evaluate(() => document.querySelector('.alt-data-table tbody tr').getBoundingClientRect().height);
const comfy = await tall();
await page.click('.alt-table-columns [role="radio"]:has-text("Compact")');
await page.waitForTimeout(250);
const compact = await tall();
expect(compact < comfy && compact >= 24, `compact rows are shorter and at least 24px (${comfy} → ${compact})`);

console.log(`Table columns: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
