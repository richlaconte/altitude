// Histogram (#535): bins touch on a continuous axis and stand on the ground line; each bin is named by its range,
// count and share; the median and p95 are named lines; the summary says the count, the median, the 10th–90th spread and
// the tail; the keyboard walks the bins; the table has a row per bin; dots and cumulative read the same values; forced
// colours, contrast="more", reduced motion and 360px render without errors. Run after a render of every preview (it
// opens test/p-Histogram-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (opts = {}, media) => {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 900 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-Histogram-daylight.html`);
  await page.waitForTimeout(700);
  page.errors = errors;
  return page;
};

{
  const page = await open();
  const bars = await page.evaluate(() => [...document.querySelectorAll('.alt-chart')[0].querySelectorAll('.alt-hist-bar')].map((r) => ({ x: +r.getAttribute('x'), w: +r.getAttribute('width'), y: +r.getAttribute('y'), h: +r.getAttribute('height') })));
  expect(bars.length > 10, `bins drawn (${bars.length})`);
  expect(bars.slice(1).every((b, i) => Math.abs(b.x - (bars[i].x + bars[i].w)) < 0.5), 'bins touch: no band gap');
  const foot = bars.map((b) => b.y + b.h);
  expect(new Set(foot.map((f) => f.toFixed(1))).size === 1, 'every bin stands on the ground line');
  const lines = await page.evaluate(() => [...document.querySelectorAll('.alt-chart')[0].querySelectorAll('.alt-hist-line text')].map((t) => t.textContent));
  expect(lines.length === 2 && /^Median \d+ ms$/.test(lines[0]) && /^p95 /.test(lines[1]), `median and p95 named (${lines})`);
  const summary = await page.evaluate(() => document.querySelectorAll('.alt-chart')[0].querySelector('figcaption').textContent);
  expect(/^Histogram of Latency, 1,200 requests\. Median \d+ ms; 10th to 90th percentile \d+ ms to \d+ ms\. Half of the requests fall between/.test(summary) && /long tail to 1\.\d s/.test(summary), `the summary (${summary})`);

  // The keyboard walks the bins, each named by its range, count and share.
  await page.locator('.alt-chart').first().locator('.alt-chart-node').first().focus();
  await page.keyboard.press('Enter');
  const first = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  expect(/^\d+–\d+ ms: \d+ requests? \(\d+(\.\d)?%\)\./.test(first), `a bin's name (${first})`);
  await page.keyboard.press('ArrowRight');
  const second = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  expect(second !== first && /ms: \d+ request/.test(second), `→ moves to the next bin (${second})`);
  await page.keyboard.press('End');
  const last = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  expect(/s: \d+ requests? /.test(last), `End reaches the last bin (${last})`);
  const readout = await page.evaluate(() => document.querySelector('.alt-chart-readout')?.textContent ?? '');
  expect(/\d+ \(\d+(\.\d)?%\)/.test(readout) && readout.includes('Requests'), `the readout says the count and share (${readout})`);
  await page.keyboard.press('Escape');

  // The table: a row per bin, with its range, count, share and running share.
  await page.getByRole('tab', { name: 'Table' }).click();
  await page.waitForTimeout(300);
  const t = await page.evaluate(() => { const tb = document.querySelector('.alt-chart-tablebox table'); return { heads: [...tb.querySelectorAll('th')].map((h) => h.textContent), rows: tb.querySelectorAll('tbody tr').length, last: [...tb.querySelectorAll('tbody tr')].pop().cells[3].textContent }; });
  expect(t.heads.join('|').includes('Latency') && t.heads.includes('Share') && t.heads.includes('At or below') && t.rows === bars.length, `the table (${t.heads}, ${t.rows} rows)`);
  expect(t.last === '100%', `the running share ends at 100% (${t.last})`);

  // Dots: 20 dots in all, 5% each; cumulative: a step line from 0% to 100%.
  const dots = await page.evaluate(() => document.querySelectorAll('.alt-chart')[1].querySelectorAll('.alt-hist-dot').length);
  expect(dots === 20, `20 quantile dots (${dots})`);
  const dsum = await page.evaluate(() => document.querySelectorAll('.alt-chart')[1].querySelector('figcaption').textContent);
  expect(/as 20 dots of 5% each/.test(dsum), 'the dot plot says what a dot is');
  const cum = await page.evaluate(() => { const f = document.querySelectorAll('.alt-chart')[2]; return { path: !!f.querySelector('.alt-hist-cum'), ticks: [...f.querySelectorAll('[data-axis="y"] text')].map((x) => x.textContent) }; });
  expect(cum.path && cum.ticks.includes('100%') && cum.ticks.includes('0%'), `cumulative reads 0–100% (${cum.ticks})`);
  expect(page.errors.length === 0, `no page errors (${page.errors.join(' | ')})`);
  await page.context().close();
}
{
  const page = await open({ viewport: { width: 360, height: 900 }, forcedColors: 'active' }, { reducedMotion: 'reduce', contrast: 'more' });
  const n = await page.evaluate(() => document.querySelectorAll('.alt-hist-bar').length);
  expect(n > 10, 'bins at 360px under forced colours and reduced motion');
  expect(page.errors.length === 0, `no page errors at 360px (${page.errors.join(' | ')})`);
  await page.context().close();
}
await browser.close();
console.log(`histogram: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
