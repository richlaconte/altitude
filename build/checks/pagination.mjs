// Pagination and pageRange: the page list (ends, siblings, gaps, a single skipped page shown); a nav with buttons in
// plain Tab order, aria-current on the current page and a raised thumb under it that travels and is held pressed while
// loading; the summary in a polite live region; disabled ends; cursor mode. Run after a render of every preview (it
// opens test/p-Pagination-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-Pagination-daylight.html`);
await page.waitForTimeout(400);

const ranges = await page.evaluate(() => { const r = window.Altitude.pageRange; return [r(3, 11), r(1, 11), r(6, 11), r(1, 1), r(2, 5)].map((x) => x.join(' ')); });
expect(ranges[0] === '1 2 3 4 5 gap 11', `around page 3 of 11 (${ranges[0]})`);
expect(ranges[1] === '1 2 3 4 5 gap 11' && ranges[2] === '1 gap 5 6 7 gap 11', `ends and siblings (${ranges[1]}; ${ranges[2]})`);
expect(ranges[3] === '1' && ranges[4] === '1 2 3 4 5', `one page; every page when they fit (${ranges[3]}; ${ranges[4]})`);
// #499: the same number of slots on every page, and a gap never hides a single page.
const steady = await page.evaluate(() => { const r = window.Altitude.pageRange, out = [];
  for (const [n, s] of [[20, 1], [11, 1], [40, 2], [8, 1]]) for (let p = 1; p <= n; p++) { const x = r(p, n, s);
    const gapOfOne = x.some((v, i) => v === 'gap' && x[i + 1] - x[i - 1] === 2);
    out.push({ n, s, p, len: x.length, ok: x.includes(p) && !gapOfOne }); }
  return out; });
expect(steady.every((x) => x.ok), `the current page is always shown and no gap stands for one page`);
expect([20, 11, 40, 8].every((n) => new Set(steady.filter((x) => x.n === n).map((x) => x.len)).size === 1), 'pageRange has one length per page count');

const read = () => page.evaluate(() => {
  const nav = document.querySelector('.alt-pager'), cur = nav.querySelector('[aria-current="page"]'), thumb = nav.querySelector('.alt-pager-thumb');
  const a = cur.getBoundingClientRect(), b = thumb.getBoundingClientRect();
  return { label: nav.getAttribute('aria-label'), current: cur.textContent, name: cur.getAttribute('aria-label'), off: Math.abs(a.left - b.left) + Math.abs(a.width - b.width),
    thumbShadow: getComputedStyle(thumb).boxShadow, summary: nav.querySelector('.alt-pager-summary').textContent, live: nav.querySelector('.alt-pager-summary').getAttribute('aria-live'),
    tabbable: [...nav.querySelectorAll('button')].every((x) => x.tabIndex === 0), prev: nav.querySelector('[data-dir="prev"]').getAttribute('aria-disabled'), next: nav.querySelector('[data-dir="next"]').getAttribute('aria-disabled'),
    trackW: nav.querySelector('.alt-pager-track').getBoundingClientRect().width, nextX: nav.querySelector('[data-dir="next"]').getBoundingClientRect().left };
});
let r = await read();
const at3 = r;
expect(r.label === 'Pagination' && r.current === '3' && r.name === 'Page 3', 'a nav; the current page is "Page 3" with aria-current');
expect(r.off < 1 && r.thumbShadow !== 'none', 'a raised thumb sits under the current page');
expect(r.summary === '41–60 of 214 invoices' && r.live === 'polite', `the summary, in a polite live region (${r.summary})`);
expect(r.tabbable, 'every page is in plain Tab order (no roving focus)');

await page.click('[aria-label="Page 4"]');
await page.waitForTimeout(60);
const loading = await page.evaluate(() => [document.querySelector('.alt-pager').getAttribute('aria-busy'), document.querySelector('.alt-pager-thumb').hasAttribute('data-loading')]);
expect(loading[0] === 'true' && loading[1], 'while the next page loads, the thumb is held pressed');
await page.waitForTimeout(700);
r = await read();
expect(r.current === '4' && r.off < 1 && r.summary === '61–80 of 214 invoices', `the thumb travels to the new page (${r.current})`);
const at4 = r;
await page.click('[aria-label="Page 11"]');
await page.waitForTimeout(700);
r = await read();
expect(r.next === 'true' && r.prev === null && r.summary === '201–214 of 214 invoices', 'at the end, Next is disabled and the summary stops at the total');
expect([at4, r].every((x) => Math.abs(x.trackW - at3.trackW) < 0.5 && Math.abs(x.nextX - at3.nextX) < 0.5), `the control keeps its width from page to page, so Next doesn't move (${[at3, at4, r].map((x) => x.trackW.toFixed(1)).join(', ')})`);
await page.focus('[aria-label="Page 10"]');
await page.keyboard.press('ArrowLeft');
expect(await page.evaluate(() => document.activeElement.getAttribute('aria-label')) === 'Page 10', 'arrow keys don\'t move between pages');

const cursor = () => page.evaluate(() => { const n = document.querySelectorAll('.alt-pager')[1]; return { text: n.querySelector('.alt-pager-summary').textContent, track: !!n.querySelector('.alt-pager-track'), prev: n.querySelector('[data-dir="prev"]').getAttribute('aria-disabled'), next: n.querySelector('[data-dir="next"]').getAttribute('aria-disabled') }; });
let c = await cursor();
expect(!c.track && c.text === 'Page 1' && c.prev === 'true', 'cursor mode: Previous and Next and "Page 1"');
for (let i = 0; i < 3; i++) await page.click('.alt-pager >> nth=1 >> [data-dir="next"]');
c = await cursor();
expect(c.text === 'Page 4' && c.next === 'true', `Next stops when there's no next page (${c.text})`);

console.log(`Pagination: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
