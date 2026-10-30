// DotPlot (#192): values where zero isn't part of the story, as position on a flat plot with no ground line; dots at
// least 8px, ringed in the plot's colour, on 1px line row guides; a spread is a flat 16% band, said in names, readout
// and table; sort carries rows; a dumbbell joins a hollow "from" dot to a filled "to" dot with a 2px ink-muted link
// and says the change; the summary names the range and the widest spread; marks that act get a 2px ink outline;
// forced colours and contrast="more" keep it legible. Run after a render of every preview (it opens
// test/p-DotPlot-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (media) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 900 } });
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-DotPlot-daylight.html`);
  await page.waitForTimeout(700);
  return page;
};
const colour = (page, v) => page.evaluate((v) => { const d = document.createElement('div'); d.style.color = v; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }, v);
const read = (page) => page.evaluate(() => [...document.querySelectorAll('.alt-chart')].map((f) => ({
  dots: [...f.querySelectorAll('.alt-dot-mark')].map((m) => { const r = m.getBoundingClientRect(); return { w: r.width, from: m.hasAttribute('data-from'), fill: getComputedStyle(m).fill, stroke: getComputedStyle(m).stroke, sw: m.getAttribute('stroke-width') }; }),
  guides: [...f.querySelectorAll('.alt-dot-guide')].map((g) => getComputedStyle(g).stroke),
  ranges: [...f.querySelectorAll('.alt-dot-range')].map((r) => ({ op: getComputedStyle(r).fillOpacity, fill: r.getAttribute('fill') })),
  links: [...f.querySelectorAll('.alt-dot-link')].map((l) => ({ stroke: getComputedStyle(l).stroke, w: getComputedStyle(l).strokeWidth })),
  cats: [...f.querySelectorAll('.alt-dot-row')].map((r) => r.dataset.category),
  ground: !!f.querySelector('.alt-chart-ground'),
  ticks: [...f.querySelectorAll('[data-axis="y"] text')].map((t) => t.textContent),
  summary: f.querySelector('figcaption').textContent,
})));

{
  const page = await open();
  const [lat, bell] = await read(page);
  const line = await colour(page, 'var(--line)'), muted = await colour(page, 'var(--ink-muted)'), raised = await colour(page, 'var(--surface-raised)');
  expect(lat.dots.length === 8 && lat.dots.every((d) => d.w >= 8 - 0.01 && d.stroke === raised && d.sw === '4'), `a dot per record, at least 8px, ringed 2px in the plot's colour (${lat.dots[0]?.w}, ${lat.dots[0]?.stroke})`);
  expect(!lat.ground && lat.ticks[0] !== '0 ms', `zero isn't on the axis, so there's no ground line (${lat.ticks})`);
  expect(lat.guides.length === 8 && lat.guides.every((g) => g === line), 'each row has a 1px line guide');
  expect(lat.ranges.length === 8 && lat.ranges.every((r) => r.op === '0.16' && r.fill === 'var(--data-1)'), `the spread is a flat band of the series colour at 16% (${JSON.stringify(lat.ranges[0])})`);
  expect(lat.cats.join() === 'Billing,Media,Exports,Checkout,Accounts,Email,Search,Auth', `sort="desc" orders the rows (${lat.cats})`);
  expect(/^Dot plot of p95 for 8 categories, from 184 ms \(Auth\) to 236 ms \(Billing\)\. The widest 10th–90th percentile is Billing's, 190 ms to 320 ms\./.test(lat.summary), `the summary names the range and the widest spread ("${lat.summary.slice(0, 160)}")`);
  // Dumbbell.
  const froms = bell.dots.filter((d) => d.from), tos = bell.dots.filter((d) => !d.from);
  expect(froms.length === 5 && tos.length === 5 && froms.every((d) => d.fill === raised) && tos.every((d) => d.fill !== raised), 'a dumbbell\'s "from" dot is hollow, its "to" dot filled');
  expect(bell.links.length === 5 && bell.links.every((l) => l.stroke === muted && l.w === '2px'), `joined by a 2px ink-muted link (${JSON.stringify(bell.links[0])})`);
  expect(/Dumbbell plot/.test(bell.summary) && /Against Q2: 4 rose, 1 fell\./.test(bell.summary), `the summary says how many rose and fell ("${bell.summary.slice(-60)}")`);
  // Keyboard names.
  await page.locator('.alt-chart').first().locator('.alt-chart-node').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(60);
  let name = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  expect(/^Billing, p95, 236 ms\. 10th–90th percentile 190 ms to 320 ms\. 1 of 8\.$/.test(name), `each point says its value and spread ("${name}")`);
  const rows = await page.evaluate(() => [...document.querySelector('.alt-chart').querySelectorAll('.alt-chart-readout-row')].map((r) => r.textContent));
  expect(rows.length === 2 && rows.some((r) => /190 ms–320 ms10th–90th percentile/.test(r)), `the readout adds the spread (${rows})`);
  await page.locator('.alt-chart').nth(1).locator('.alt-chart-node').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(60);
  name = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  expect(/^Cedar, Q3, 86\. Up 7\.5% from Q2\. 1 of 5\.$/.test(name), `a dumbbell's later dot says the change ("${name}")`);
  // A table view and marks that act.
  await page.evaluate(() => new Promise((done) => {
    const d = document.createElement('div'); d.id = 'dp'; d.style.cssText = 'width:440px;position:absolute;top:0;left:0;z-index:9;background:#fff'; document.body.prepend(d);
    const A = window.Altitude, h = React.createElement, rows = [{ s: 'a', v: 210, lo: 200, hi: 230 }, { s: 'b', v: 190, lo: 185, hi: 199 }];
    ReactDOM.createRoot(d).render(h('div', null,
      h(A.ChartContainer, { id: 'tb', views: 'table', config: { v: { label: 'V' } } }, h(A.DotPlot, { data: rows, x: 's', range: ['lo', 'hi'], rangeLabel: 'Spread' })),
      h(A.ChartContainer, { id: 'act', config: { v: { label: 'V' } } }, h(A.DotPlot, { data: rows, x: 's', onSelect: () => {} }))));
    setTimeout(done, 450);
  }));
  const heads = await page.evaluate(() => [...document.querySelectorAll('#tb thead th')].map((t) => t.textContent.trim()));
  expect(heads.join('|') === 'S|V|Spread', `the table has the spread's column (${heads})`);
  const ab = await page.locator('#act .alt-chart-plot').boundingBox();
  await page.mouse.move(ab.x + ab.width / 2, ab.y + ab.height * 0.25);
  await page.waitForTimeout(250);
  const hov = await page.evaluate(() => { const r = document.querySelector('#act .alt-dot-hover'); return r && { stroke: getComputedStyle(r).stroke, w: getComputedStyle(r).strokeWidth }; });
  expect(hov && hov.w === '2px' && hov.stroke === (await colour(page, 'var(--ink)')), `a mark that acts gets a 2px ink outline under the pointer (${JSON.stringify(hov)})`);
  await page.close();
}

// Forced colours and contrast="more".
{
  const page = await open({ forcedColors: 'active' });
  const f = await page.evaluate(() => ({ link: getComputedStyle(document.querySelector('.alt-dot-link')).stroke, range: getComputedStyle(document.querySelector('.alt-dot-range')).fill, dot: document.querySelector('.alt-dot-mark').getAttribute('fill') }));
  expect(f.link === 'rgb(0, 0, 0)' && f.dot === 'CanvasText' && f.range !== 'rgb(0, 0, 0)', `forced colours: dots and links CanvasText, the band GrayText (${JSON.stringify(f)})`);
  await page.close();
}
{
  const page = await open();
  await page.evaluate(() => { document.documentElement.dataset.contrast = 'more'; });
  const lc = await colour(page, 'var(--line-control)');
  const g = await page.evaluate(() => getComputedStyle(document.querySelector('.alt-dot-guide')).stroke);
  expect(g === lc, `contrast more: row guides in line-control (${g})`);
  await page.close();
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
