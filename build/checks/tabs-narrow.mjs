// Tabs at phone width (#259): a tab list that doesn't fit scrolls within itself, so the page doesn't scroll sideways;
// the edge with more tabs past it fades; choosing a tab off the edge brings it into view. Run after a render of every
// preview (it opens test/p-Tabs-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
await page.goto(`file://${T}p-Tabs-daylight.html`); await page.waitForTimeout(600);
const read = () => page.evaluate(() => { const l = document.querySelector('.alt-tabs-list'); const sel = l.querySelector('[aria-selected="true"]').getBoundingClientRect(), lr = l.getBoundingClientRect();
  return { page: document.documentElement.scrollWidth, list: [l.scrollWidth, l.clientWidth], start: l.hasAttribute('data-more-start'), end: l.hasAttribute('data-more-end'), selIn: sel.left >= lr.left - 1 && sel.right <= lr.right + 1 }; });
let r = await read();
expect(r.page <= 320 && r.list[0] > r.list[1], `the page doesn't scroll sideways; the list scrolls within itself (${JSON.stringify(r)})`);
expect(r.end && !r.start, 'the edge with more tabs fades');
await page.locator('.alt-tabs-list [aria-selected="true"]').first().focus();
await page.keyboard.press('End'); await page.waitForTimeout(300);
r = await read();
expect(r.selIn && r.start, `choosing the last tab scrolls it into view, and the start now fades (${JSON.stringify(r)})`);
console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
