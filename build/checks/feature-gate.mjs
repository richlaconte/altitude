// FeatureGate: the locked control keeps its ink, isn't disabled or aria-disabled, is reachable, names its requirement,
// lifts when pointed at, carries a lock and a plan plate, and opens a popover explaining the plan with an upgrade (or
// "Ask an admin"); Escape closes it and returns focus. Run after a render of every preview (it opens
// test/p-FeatureGate-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-FeatureGate-daylight.html`);
await page.waitForTimeout(400);

const gate = page.locator('.alt-gate-trigger').first();
const read = () => gate.evaluate((b) => ({ name: b.getAttribute('aria-label'), disabled: b.disabled, ariaDisabled: b.getAttribute('aria-disabled'), popup: b.getAttribute('aria-haspopup'), color: getComputedStyle(b).color,
  lock: !!b.querySelector('.alt-gate-lock'), plate: b.querySelector('.alt-gate-plan')?.textContent, transform: getComputedStyle(b).transform, tab: b.tabIndex }));
const plain = await page.evaluate(() => getComputedStyle(document.querySelector('.alt-btn')).color);
let r = await read();
expect(r.name === 'Export to CSV, requires Business plan', `the name includes the requirement (${r.name})`);
expect(!r.disabled && r.ariaDisabled === null && r.tab === 0, 'it isn\'t disabled and is reachable');
expect(r.color === plain, `it keeps its normal ink (${r.color})`);
expect(r.lock && r.plate === 'Business' && r.popup === 'dialog', 'a lock, a plan plate, and it opens a dialog');
await gate.hover();
await page.waitForTimeout(250);
expect((await read()).transform !== 'none', 'it lifts when pointed at');
await gate.focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
const pop = await page.evaluate(() => { const p = document.querySelector('.alt-gate-pop'); return p && { title: p.querySelector('.alt-gate-title').textContent, cta: p.querySelector('.alt-btn')?.textContent, link: p.querySelector('.alt-link')?.textContent }; });
expect(pop?.title === 'Available on Business' && pop.cta === 'Upgrade to Business' && pop.link === 'Compare plans', `the popover explains and offers the upgrade (${JSON.stringify(pop)})`);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
expect(await page.locator('.alt-gate-pop').count() === 0 && await page.evaluate(() => document.activeElement.classList.contains('alt-gate-trigger')), 'Escape closes it and returns focus');
await page.click('.alt-gate-trigger >> nth=1');
await page.waitForTimeout(400);
expect(await page.evaluate(() => document.querySelector('.alt-gate-pop .alt-gate-admin')?.textContent) === 'Ask an admin to upgrade to Enterprise.' && await page.locator('.alt-gate-pop .alt-btn').count() === 0, 'without permission, it says to ask an admin');

console.log(`FeatureGate: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
