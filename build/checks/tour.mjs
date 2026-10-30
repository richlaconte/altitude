// Tour: a non-modal dialog at level 3 beside its target; the target is ringed and described by the step; nothing dims
// the page and the target stays usable; Next moves to the next step's target; Escape ends the tour and returns focus;
// Done finishes it. Run after a render of every preview (it opens test/p-Tour-daylight.html); exits non-zero on a
// failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-Tour-daylight.html`);
await page.waitForTimeout(400);

const read = () => page.evaluate(() => {
  const d = document.querySelector('.alt-tour'), t = document.querySelector('[data-tour-target]');
  if (!d) return null;
  const dr = d.getBoundingClientRect(), tr = t?.getBoundingClientRect();
  return { modal: d.getAttribute('aria-modal'), role: d.getAttribute('role'), title: d.querySelector('.alt-tour-title').textContent, count: d.querySelector('.alt-tour-count').textContent,
    focused: d.contains(document.activeElement), target: t?.id || t?.dataset.tour, described: t?.getAttribute('aria-describedby')?.includes(d.getAttribute('aria-describedby')), ring: t && getComputedStyle(t).outlineWidth,
    beside: tr && Math.abs(dr.top - tr.bottom - 12) < 2, scrims: [...document.querySelectorAll('.alt-scrim, [data-recede]')].length, recede: document.querySelector('[data-receded]') !== null };
});
await page.click('text=Take the tour');
await page.waitForTimeout(400);
let r = await read();
expect(r?.role === 'dialog' && r.modal === 'false' && r.focused, 'a non-modal dialog, focused');
expect(r.title === 'Projects moved here' && r.count === 'Step 1 of 3', 'the first step');
expect(r.target === 'tour-projects' && r.described && r.ring === '2px' && r.beside, `its target is ringed and described, the card beside it (${JSON.stringify(r)})`);
expect(r.scrims === 0 && !r.recede, 'nothing dims the page');
await page.click('.alt-tour button:has-text("Next")');
await page.waitForTimeout(400);
r = await read();
expect(r.target === 'owner' && r.count === 'Step 2 of 3', 'Next moves to the next target');
expect(await page.evaluate(() => document.querySelector('#tour-projects').hasAttribute('data-tour-target')) === false, 'the previous target loses its ring');
await page.fill('[data-tour="owner"]', 'Maya');
expect(await page.inputValue('[data-tour="owner"]') === 'Maya' && (await read()) !== null, 'the target stays usable');
await page.focus('text=Take the tour');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
expect((await read()) === null && await page.evaluate(() => document.querySelector('.cap').textContent) === 'Tour skipped.', 'Escape ends the tour');
expect(await page.evaluate(() => !document.querySelector('[data-tour-target]') && !document.querySelector('[data-tour="owner"]').hasAttribute('aria-describedby')), 'and cleans up its target');
await page.click('text=Take the tour');
await page.waitForTimeout(400);
for (let n = 0; n < 2; n++) { await page.click('.alt-tour button:has-text("Next")'); await page.waitForTimeout(300); }
expect((await read()).count === 'Step 3 of 3' && await page.locator('.alt-tour button:has-text("Done")').count() === 1, 'the last step says Done');
await page.click('.alt-tour button:has-text("Done")');
await page.waitForTimeout(300);
expect((await read()) === null && await page.evaluate(() => document.querySelector('.cap').textContent) === 'Tour finished.' && await page.evaluate(() => document.activeElement.textContent) === 'Take the tour', 'Done finishes it and returns focus');

console.log(`Tour: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
