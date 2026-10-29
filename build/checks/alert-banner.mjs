// Alert placement="page": a region named by its title holding the alert (status, or alert when critical); edge to edge
// with no side rounding; raised when it asks for action, a flat sheet when it informs; a worded dismiss button that
// lifts it off and moves focus to main; the text wraps at 360px. Run after a render of every preview (it opens
// test/p-Alert-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (width) => {
  const page = await browser.newPage({ viewport: { width, height: 700 } });
  await page.goto(`file://${T}p-Alert-daylight.html`);
  await page.waitForTimeout(400);
  return page;
};
const read = (page) => page.evaluate(() => [...document.querySelectorAll('.alt-banner')].map((b) => {
  const a = b.querySelector('.alt-alert'), cs = getComputedStyle(a), frame = document.querySelector('.frame').getBoundingClientRect(), r = a.getBoundingClientRect();
  return { tag: b.tagName, label: b.getAttribute('aria-label'), role: a.getAttribute('role'), radius: cs.borderTopLeftRadius, variant: a.dataset.variant, shadow: cs.boxShadow,
    full: Math.abs(r.left - frame.left) < 2 && Math.abs(r.right - frame.right) < 2, close: a.querySelector('.alt-alert-close')?.textContent ?? null, h: r.height };
}));

const page = await open(960);
let [trial, delay] = await read(page);
expect(trial.tag === 'SECTION' && trial.label === 'Your trial ends in 3 days' && trial.role === 'status', 'a region named by its title, holding a status');
expect(trial.radius === '0px' && trial.full && delay.full, 'edge to edge, with no side rounding');
expect(trial.variant === 'raised' && delay.variant === 'flat' && trial.shadow !== delay.shadow, 'raised when it asks for action, flat when it informs');
expect(trial.close === 'Remind me tomorrow', 'the dismiss button can say what it does');
await page.click('text=Remind me tomorrow');
await page.waitForTimeout(600);
expect((await read(page)).length === 1, 'dismissing lifts it off');
expect(await page.evaluate(() => document.activeElement.tagName) === 'MAIN', 'and focus moves to main');
await page.close();

const phone = await open(360);
[trial] = await read(phone);
expect(trial.h > 70, `at 360px its text and actions wrap (${trial.h}px)`);
await phone.close();

console.log(`Alert banner: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
