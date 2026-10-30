// Tables when narrow (#260): under 480px of the frame's width, columns keep at least 6rem (or their minWidth) and the
// table scrolls inside its frame instead of squeezing cells to "Des…"; the edge with more columns fades; a sticky
// column stays in view over a flush edge; checkbox and grip columns stay narrow; wide, nothing changes. Run after a
// render of every preview (it opens test/p-DataGrid-daylight.html and test/p-Table-daylight.html); exits non-zero
// on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const frame = (page) => page.evaluate(() => { const w = document.querySelector('.alt-table-wrap'), t = w.querySelector('table');
  return { client: w.clientWidth, scroll: w.scrollWidth, table: t.offsetWidth, cells: [...t.querySelectorAll('tbody tr:first-child td')].map((td) => td.offsetWidth), end: w.hasAttribute('data-more-end'), start: w.hasAttribute('data-more-start') }; });
for (const [width, narrow] of [[375, true], [960, false]]) {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  await page.goto(`file://${T}p-DataGrid-daylight.html`); await page.waitForTimeout(500);
  const f = await frame(page);
  if (narrow) {
    expect(f.cells.every((w) => w >= 96), `@375 every DataGrid column is at least 6rem (${f.cells})`);
    expect(f.scroll > f.client + 20 && f.end && !f.start, `@375 the grid scrolls in its frame, the end edge fading (${JSON.stringify(f)})`);
    await page.evaluate(() => { const w = document.querySelector('.alt-table-wrap'); w.scrollLeft = w.scrollWidth; }); await page.waitForTimeout(200);
    const g = await frame(page);
    expect(g.start && !g.end, `scrolled to the end, the start edge has more (${JSON.stringify(g)})`);
  } else expect(f.table === f.client && !f.end, `@960 the grid fills its frame as before (${JSON.stringify(f)})`);
  await page.close();
}
{
  const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
  await page.goto(`file://${T}p-Table-daylight.html`); await page.waitForTimeout(500);
  const small = await page.evaluate(() => [...document.querySelectorAll('.alt-td-check, .alt-td-grip')].slice(0, 2).map((td) => td.offsetWidth));
  expect(small.every((w) => w < 60), `checkbox and grip columns stay narrow (${small})`);
  // A sticky first column, mounted fresh.
  await page.evaluate(() => new Promise((done) => {
    document.body.innerHTML = ''; const d = document.createElement('div'); d.style.width = '340px'; document.body.append(d);
    const A = window.Altitude, h = React.createElement;
    const rows = [{ id: 1, name: 'Northwind', env: 'Production', owner: 'Mara Quinn', region: 'eu-west-1' }];
    ReactDOM.createRoot(d).render(h(A.AltitudeProvider, null, h(A.DataTable, { 'aria-label': 'Projects', getRowId: (r) => r.id, rows,
      columns: [{ key: 'name', header: 'Name', sticky: true, minWidth: 140 }, { key: 'env', header: 'Environment' }, { key: 'owner', header: 'Owner' }, { key: 'region', header: 'Region' }] })));
    setTimeout(done, 400);
  }));
  const before = await page.evaluate(() => { const td = document.querySelector('td[data-sticky]'); return { left: td.getBoundingClientRect().left, w: td.offsetWidth, edge: getComputedStyle(td).boxShadow, bg: getComputedStyle(td).backgroundColor }; });
  await page.evaluate(() => { const w = document.querySelector('.alt-table-wrap'); w.scrollLeft = 200; }); await page.waitForTimeout(200);
  const after = await page.evaluate(() => document.querySelector('td[data-sticky]').getBoundingClientRect().left);
  expect(before.w >= 140, `minWidth holds (${before.w})`);
  expect(Math.abs(after - before.left) < 1, `the sticky column stays put while the table scrolls (${before.left} → ${after})`);
  expect(/inset/.test(before.edge) && before.bg !== 'rgba(0, 0, 0, 0)', `the sticky column is opaque over a flush 1px edge (${before.edge})`);
  await page.close();
}
console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
