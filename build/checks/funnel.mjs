// Funnel (#536): steps in data order from one left edge, each drop-off said in a plate in the gutter, a bad drop
// marked with the icon and words, September as ticks, the summary's overall conversion and largest drop, ↑/↓ between
// steps with each step's name, count, share and drop, Enter selecting a step, the table, and forced colours at 360px.
// Run after a render of every preview (it opens test/p-Funnel-daylight.html); exits non-zero on a failure.
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
  await page.goto(`file://${T}p-Funnel-daylight.html`);
  await page.waitForTimeout(700);
  page.errors = errors;
  return page;
};
const active = (page) => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');

{
  const page = await open();
  const bars = await page.evaluate(() => [...document.querySelectorAll('.alt-chart')[0].querySelectorAll('.alt-funnel-bar')].map((r) => ({ x: +r.getAttribute('x'), y: +r.getAttribute('y'), w: +r.getAttribute('width') })));
  expect(bars.length === 5, `five steps (${bars.length})`);
  expect(new Set(bars.map((b) => b.x.toFixed(1))).size === 1, 'every step starts at one left edge');
  expect(bars.every((b, i) => i === 0 || b.y > bars[i - 1].y), 'steps run down the page in data order');
  const plates = await page.evaluate(() => [...document.querySelectorAll('.alt-chart')[0].querySelectorAll('.alt-funnel-drop')].map((g) => ({ text: g.textContent, bad: g.hasAttribute('data-bad') })));
  expect(plates.length === 4 && plates[0].text === '−36% · 1,136 left', `a drop-off plate between each pair (${plates.map((q) => q.text)})`);
  expect(plates.filter((q) => q.bad).length === 1 && /^Steep drop · −65%/.test(plates[3].text), 'the bad drop says so in words');
  const summary = await page.evaluate(() => document.querySelectorAll('.alt-chart')[0].querySelector('figcaption').textContent);
  expect(/Of 3,120 at Visited pricing, 418 reached Paid \(13%\)\. The largest drop is between Activated and Paid: 65%\./.test(summary), `the summary (${summary})`);
  const ticks = await page.evaluate(() => document.querySelectorAll('.alt-chart')[1].querySelectorAll('.alt-funnel-was').length);
  expect(ticks === 5, `September's counts as ticks (${ticks})`);

  // ↓ walks the steps; each says its count, share and drop.
  await page.locator('.alt-chart').first().locator('.alt-chart-node').first().focus();
  await page.keyboard.press('Enter');
  expect(/^Visited pricing: 3,120 people, 100% of Visited pricing\.$/.test(await active(page)), `the first step (${await active(page)})`);
  await page.keyboard.press('ArrowDown');
  expect(/^Started signup: 1,984 people, 64% of Visited pricing\. Down 36% from Visited pricing, 1,136 left\.$/.test(await active(page)), `↓ to the next (${await active(page)})`);
  await page.keyboard.press('End');
  expect(/^Paid: .* Steep drop\.$/.test(await active(page)), `End to the last (${await active(page)})`);
  await page.keyboard.press('ArrowUp');
  expect(/^Activated:/.test(await active(page)), `↑ back (${await active(page)})`);
  await page.keyboard.press('Escape');

  // Compare is said in each name.
  await page.locator('.alt-chart').nth(1).locator('.alt-chart-node').first().focus();
  await page.keyboard.press('Enter');
  expect(/September: 2,870, up 9%\.$/.test(await active(page)), `the period before in the name (${await active(page)})`);
  await page.keyboard.press('Escape');

  // Enter selects a step where steps act.
  await page.locator('.alt-chart').nth(2).locator('.alt-chart-node').first().focus();
  await page.keyboard.press('Enter'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  const desc = await page.evaluate(() => document.querySelectorAll('.alt-chart')[2].querySelector('.alt-chart-desc').textContent);
  expect(desc === 'Showing who left before Replied', `Enter selects a step (${desc})`);

  await page.getByRole('tab', { name: 'Table' }).click();
  await page.waitForTimeout(300);
  const t = await page.evaluate(() => { const tb = document.querySelector('.alt-chart-tablebox table'); return { heads: [...tb.querySelectorAll('th')].map((h) => h.textContent), rows: [...tb.querySelectorAll('tbody tr')].map((r) => r.cells[0].textContent) }; });
  expect(t.heads.includes('Share of Visited pricing') && t.heads.includes('From the step before') && t.rows[4] === 'Paid', `the table (${t.heads}; ${t.rows})`);
  expect(page.errors.length === 0, `no page errors (${page.errors.join(' | ')})`);
  await page.context().close();
}
{
  const page = await open({ viewport: { width: 360, height: 900 }, forcedColors: 'active' }, { reducedMotion: 'reduce', contrast: 'more' });
  const n = await page.evaluate(() => document.querySelectorAll('.alt-funnel-bar').length);
  expect(n === 13, `every step at 360px under forced colours (${n})`);
  expect(page.errors.length === 0, `no page errors at 360px (${page.errors.join(' | ')})`);
  await page.context().close();
}
await browser.close();
console.log(`funnel: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
