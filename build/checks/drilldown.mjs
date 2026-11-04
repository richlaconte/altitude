// Drilldown (#498): the default stack has no lateral travel; transition="slide" lays the child on from the inline end
// and moves the parent off toward the start going down, the reverse going back, mirrored in right-to-left, and only
// cross-fades under reduced motion. Focus still moves to each new view. Each animation is paused at its start to read
// where it travels from. Run after a render of every preview (it opens test/p-Drilldown-daylight.html); exits non-zero
// on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];

// The x offset each view's animation starts (in) or ends (out) at, for the nth Drilldown.
const offsets = (page, n) => page.evaluate((n) => {
  const drill = document.querySelectorAll('.alt-drill')[n];
  const read = (phase) => {
    const el = drill.querySelector(`.alt-drill-view[data-phase="${phase}"]`); if (!el) return null;
    const a = el.getAnimations()[0]; if (!a) return 0;
    a.pause(); a.currentTime = phase === 'in' ? 0 : a.effect.getComputedTiming().endTime - 1;
    const m = new DOMMatrix(getComputedStyle(el).transform);
    return Math.round(m.m41);
  };
  return { in: read('in'), out: read('out') };
}, n);
const open = async ({ rtl = false, reduced = false } = {}) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 800 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`file://${T}p-Drilldown-daylight.html`);
  if (rtl) await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
  await page.waitForTimeout(300);
  return page;
};
const down = (page, n) => page.locator('.alt-drill').nth(n).getByRole('button', { name: /Orchard/ }).click();
const up = (page, n) => page.locator('.alt-drill').nth(n).getByRole('button', { name: 'Workspace' }).click();

{ const page = await open();
  await down(page, 0);
  const stack = await offsets(page, 0);
  expect(stack.in === 0 && stack.out === 0, `the default stack doesn't travel sideways (${JSON.stringify(stack)})`);
  await down(page, 1);
  const d = await offsets(page, 1);
  expect(d.in > 20 && d.out < -20, `slide, going down: the child comes in from the end, the parent leaves toward the start (${JSON.stringify(d)})`);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => document.activeElement?.closest('.alt-drill-view')?.getAttribute('aria-label')) === 'Orchard', 'focus moves to the new view');
  await up(page, 1);
  const u = await offsets(page, 1);
  expect(u.in < -20 && u.out > 20, `slide, going back: the parent comes back from the start, the child leaves toward the end (${JSON.stringify(u)})`);
  await page.close(); }

{ const page = await open({ rtl: true });
  await down(page, 1);
  const d = await offsets(page, 1);
  expect(d.in < -20 && d.out > 20, `right-to-left mirrors it: the child comes in from the left (${JSON.stringify(d)})`);
  await page.close(); }

{ const page = await open({ reduced: true });
  await down(page, 1);
  const d = await offsets(page, 1);
  expect(d.in === 0 && d.out === 0, `under reduced motion it only cross-fades (${JSON.stringify(d)})`);
  await page.close(); }

expect(!errors.length, `no page errors (${errors.join('; ')})`);
console.log(`Drilldown: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
