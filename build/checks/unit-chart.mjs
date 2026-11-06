// UnitChart (#537): 100 marks with 18 counted and the number said beside them; groups in their own slots with their
// counts and the rest in the legend; records as a grid that's one Tab stop, walked by row and column, each mark named
// with its tone in words, Enter choosing one; the summary; forced colours, contrast="more", reduced motion and 360px.
// Run after a render of every preview (it opens test/p-UnitChart-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (opts = {}, media) => {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 700 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-UnitChart-daylight.html`);
  await page.waitForTimeout(500);
  page.errors = errors;
  return page;
};
const active = (page) => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');

{
  const page = await open();
  const one = await page.evaluate(() => {
    const f = document.querySelectorAll('.alt-unit')[0];
    const ms = [...f.querySelectorAll('.alt-unit-mark')];
    return { n: ms.length, counted: ms.filter((m) => m.dataset.slot === 'data-1').length, value: f.querySelector('.alt-unit-value').textContent, img: f.querySelector('[role="img"]')?.getAttribute('aria-label'), sum: f.querySelector('figcaption').textContent };
  });
  expect(one.n === 100 && one.counted === 18, `100 marks, 18 counted (${one.n}, ${one.counted})`);
  expect(one.value === '18 of every 100 accounts', `the number beside the marks (${one.value})`);
  expect(one.sum === 'Trial accounts that convert: 18 of every 100 accounts. The rest: 82.' && one.img === one.sum, `the summary (${one.sum})`);
  const two = await page.evaluate(() => {
    const f = document.querySelectorAll('.alt-unit')[1];
    const ms = [...f.querySelectorAll('.alt-unit-mark')].map((m) => m.dataset.slot);
    const fill = (slot) => getComputedStyle(f.querySelector(`.alt-unit-mark[data-slot="${slot}"]`)).backgroundColor;
    return { a: ms.filter((x) => x === 'data-1').length, b: ms.filter((x) => x === 'data-2').length, rest: ms.filter((x) => x === 'data-context').length, legend: [...f.querySelectorAll('.alt-unit-legend li')].map((l) => l.textContent.replace(/\s+/g, ' ').trim()).join(' '), differ: fill('data-1') !== fill('data-2') };
  });
  expect(two.a === 31 && two.b === 6 && two.rest === 3 && two.differ, `groups in their own slots (${two.a}, ${two.b}, ${two.rest})`);
  expect(two.legend === 'Active 31 Invited 6 Unassigned 3', `each group and the rest labelled with its count (${two.legend})`);

  // Records: one Tab stop, walked by row and column, named with its tone.
  const stops = await page.evaluate(() => document.querySelectorAll('.alt-unit')[2].querySelectorAll('[tabindex="0"]').length);
  expect(stops === 1, `one Tab stop (${stops})`);
  await page.locator('.alt-unit').nth(2).locator('[tabindex="0"]').focus();
  expect(/^INV-1040, Harrow Freight\. 1 of 40\. Press Enter to open it\.$/.test(await active(page)), `the first record (${await active(page)})`);
  await page.keyboard.press('ArrowDown');
  expect(/^INV-1050, Harrow Freight\. 11 of 40\./.test(await active(page)), `↓ by a row (${await active(page)})`);
  await page.keyboard.press('ArrowUp'); for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
  expect(/^INV-1046, Tidewater Clinic, Paid late\. 7 of 40\./.test(await active(page)), `a late invoice says so in words (${await active(page)})`);
  await page.keyboard.press('Enter');
  const opened = await page.evaluate(() => document.querySelectorAll('.alt-unit')[2].nextElementSibling?.textContent);
  expect(opened === 'Opened INV-1046', `Enter chooses it (${opened})`);
  await page.keyboard.press('Control+End');
  expect(/40 of 40/.test(await active(page)), `Ctrl+End to the last (${await active(page)})`);
  const legend = await page.evaluate(() => [...document.querySelectorAll('.alt-unit')[2].querySelectorAll('.alt-unit-legend li')].map((l) => l.textContent.replace(/\s+/g, ' ').trim()).join(' '));
  expect(legend === 'Paid late 3', `the tone in words with its count (${legend})`);
  expect(page.errors.length === 0, `no page errors (${page.errors.join(' | ')})`);
  await page.context().close();
}
{
  const page = await open({ viewport: { width: 360, height: 1400 }, forcedColors: 'active' }, { reducedMotion: 'reduce', contrast: 'more' });
  const w = await page.evaluate(() => Math.max(...[...document.querySelectorAll('.alt-unit-grid')].map((g) => g.getBoundingClientRect().right)));
  expect(w <= 360, `the grids fit at 360px (${w})`);
  expect(page.errors.length === 0, `no page errors at 360px (${page.errors.join(' | ')})`);
  await page.context().close();
}
await browser.close();
console.log(`unit chart: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
