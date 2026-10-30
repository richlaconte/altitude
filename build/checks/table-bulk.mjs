// DataTable bulk selection: the header checkbox selects the page and a flush row offers every matching record; "all
// matching" is a query selection said in words, unchecking adds exceptions; actions receive the query; with
// actionsPlacement="auto" the count and actions float at the bottom edge (level 3, a labelled region) once the toolbar
// has scrolled away; Clear empties it. Run after a render of every preview (it opens test/p-TableBulk-daylight.html);
// exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-TableBulk-daylight.html`);
await page.waitForTimeout(400);

const readNow = () => page.evaluate(() => {
  const t = document.querySelector('.alt-data-table'), bar = t.querySelector('.alt-table-floatbar'), tools = t.querySelector('.alt-table-tools .alt-table-selection');
  return { allrow: t.querySelector('.alt-table-allrow')?.textContent ?? null, allrowBg: t.querySelector('.alt-table-allrow td') && getComputedStyle(t.querySelector('.alt-table-allrow td')).boxShadow,
    tools: tools?.textContent ?? null, bar: bar ? { label: bar.getAttribute('aria-label'), text: bar.textContent, shadow: getComputedStyle(bar.firstElementChild).boxShadow } : null,
    checked: [...t.querySelectorAll('tbody input[type="checkbox"]')].filter((c) => c.checked).length, said: t.querySelector(':scope > .alt-sr[aria-live]').textContent.trim() };
});
// Under load (CI's parallel shards) the table can re-render a frame or two after a click: read once the state has
// held still for 200ms.
const read = async () => {
  let last = '', same = 0;
  for (let i = 0; i < 60; i++) {
    const now = JSON.stringify(await readNow());
    same = now === last ? same + 1 : 0; last = now;
    if (same >= 3) break;
    await page.waitForTimeout(50);
  }
  return JSON.parse(last);
};
let r = await read();
expect(r.allrow === null && r.tools === null, 'nothing selected: no offer, no count');
await page.click('[aria-label="Select all rows"]', { force: true });
r = await read();
expect(r.checked === 25 && r.allrow === 'All 25 on this page are selected. Select all 2,341 matching inactive users', `selecting the page offers every match (${r.allrow})`);
expect(r.allrowBg === 'none', 'the offer is flush');
await page.click('text=Select all 2,341 matching');
r = await read();
expect(r.tools?.includes('All 2,341 matching') && r.said.startsWith('All 2,341 matching'), `"all matching" is said in words (${r.tools})`);
await page.click('[aria-label="Select Ada Obi 3"]', { force: true });
// Under load the selection bar can take a frame or two to re-render after the click.
await page.waitForFunction(() => /except 1/.test(document.querySelector('.alt-data-table .alt-table-tools .alt-table-selection')?.textContent ?? ''), null, { timeout: 3000 }).catch(() => {});
r = await read();
expect(r.tools?.includes('All 2,341 matching, except 1') && r.tools.includes('2,340') && r.checked === 24, `unchecking a row makes an exception (${r.tools})`);

await page.evaluate(() => { document.querySelector('.tb2').scrollTop = 600; });
await page.waitForTimeout(500);
r = await read();
expect(r.bar?.label === 'Selection' && r.bar.text.includes('except 1') && r.bar.shadow !== 'none' && r.tools === null, `once the toolbar scrolls away, the bar floats (${r.bar?.text})`);
const bottom = await page.evaluate(() => { const b = document.querySelector('.alt-table-floatbar > *').getBoundingClientRect(), box = document.querySelector('.tb2').getBoundingClientRect(); return box.bottom - b.bottom; });
expect(bottom >= 0 && bottom < 40, `at the bottom edge (${bottom}px from it)`);
await page.click('.alt-table-floatbar button:has-text("Archive")');
await page.waitForTimeout(200);
expect(await page.textContent('[role="status"]') === 'Archiving 2340 users…', 'actions receive the query selection');
r = await read();
expect(r.bar === null && r.checked === 0, 'clearing the selection lowers the bar');

console.log(`Table bulk: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
