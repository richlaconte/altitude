// PlanPicker: a radio group of flush cards (no lift) with one mark on the chosen card; current and recommended are
// plates in the cards' names; each plan's name says its price and period; arrows move and choose, skipping an
// unavailable plan; the period switch changes the prices (cross-fading, not counting) and the spoken period. Run after
// a render of every preview (it opens test/p-PlanPicker-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-PlanPicker-daylight.html`);
await page.waitForTimeout(400);

const read = () => page.evaluate(() => {
  const g = document.querySelector('.alt-plans-grid'), mark = g.querySelector('.alt-plans-mark').getBoundingClientRect(), on = g.querySelector('[aria-checked="true"]'), r = on.getBoundingClientRect();
  return { role: g.getAttribute('role'), chosen: on.dataset.plan, names: [...g.querySelectorAll('[role="radio"]')].map((x) => x.getAttribute('aria-label')),
    lifts: [...g.querySelectorAll('.alt-plan')].map((c) => getComputedStyle(c).transform + '|' + getComputedStyle(c).boxShadow.includes('inset')),
    markInCorner: mark.left > r.right - 40 && mark.right < r.right + 2 && mark.top > r.top && mark.top < r.top + 40, button: document.querySelector('.alt-btn[data-variant="primary"]').textContent,
    proPrice: g.querySelector('[data-plan="pro"] .alt-plan-amount').textContent };
});
let r = await read();
expect(r.role === 'radiogroup' && r.chosen === 'free' && r.markInCorner, 'a radio group with one mark on the chosen card');
expect(r.lifts.every((l) => l.startsWith('none|true')), 'every card is flush: an inset rim, no lift');
expect(r.names[0].endsWith(', current plan') && r.names[1].includes(', recommended'), 'current and recommended are in the names, as words');
expect(r.names[1].startsWith('Pro, €20.00 per seat per month, billed annually'), `each plan says its price and period (${r.names[1]})`);
await page.focus('[data-plan="free"]');
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);
r = await read();
expect(r.chosen === 'pro' && r.markInCorner && r.button === 'Continue to Pro', `arrows move and choose; the mark follows (${r.chosen})`);
await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
expect((await read()).chosen === 'business', 'an unavailable plan is skipped');
await page.click('[role="radio"]:has-text("Monthly")');
await page.waitForTimeout(500);
r = await read();
expect(r.proPrice === '€24' && r.names[1].startsWith('Pro, €24.00 per seat per month') && !r.names[1].includes('billed annually'), `the period changes the prices (${r.proPrice})`);

console.log(`PlanPicker: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
