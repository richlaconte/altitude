// Toaster on touch (#253): a tap on the stack fans it out and pauses the timers until a tap outside folds it; lifting
// the finger doesn't collapse it; a horizontal swipe dismisses a toast; with a mouse, hover still fans it out. Run after
// a render of every preview (it opens test/p-Toaster-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const ctx = await browser.newContext({ viewport: { width: 400, height: 800 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.goto(`file://${T}p-Toaster-daylight.html`); await page.waitForTimeout(2200);
const cdp = await ctx.newCDPSession(page);
const touch = async (pts) => { for (const [type, x, y] of pts) { await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] }); await page.waitForTimeout(40); } };
const state = () => page.evaluate(() => { const s = document.querySelector('.alt-toaster'); return { h: s.getBoundingClientRect().height, n: s.querySelectorAll('.alt-toast:not([style*="opacity: 0"])').length, rect: (() => { const r = s.querySelector('.alt-toast').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })() }; });
// Short-lived toasts, to see whether the timers pause.
await page.evaluate(() => { for (let i = 0; i < 3; i++) window.Altitude.toast({ title: `Short ${i}`, duration: 1500 }); });
await page.waitForTimeout(500);
let s = await state();
const folded = s.h;
await touch([['touchStart', s.rect.x - 40, s.rect.y], ['touchEnd']]);
await page.waitForTimeout(400);
s = await state();
expect(s.h > folded + 40, `a tap fans the stack out, and lifting the finger doesn't fold it (${folded} → ${s.h})`);
await page.waitForTimeout(1800);
const kept = await page.evaluate(() => [...document.querySelectorAll('.alt-toast-title')].filter((t) => t.textContent.startsWith('Short')).length);
expect(kept === 3, `while it's open the timers pause (${kept} of 3 short toasts still there)`);
await touch([['touchStart', 50, 60], ['touchEnd']]);
await page.waitForTimeout(400);
expect((await state()).h < s.h - 40, 'a tap outside folds it');
// Swipe the front toast away, once the short ones (their timers running again) have gone.
await page.waitForTimeout(1600);
s = await state();
const count = () => page.evaluate(() => document.querySelectorAll('.alt-toast').length);
const before = await count();
await touch([['touchStart', s.rect.x, s.rect.y], ['touchMove', s.rect.x + 30, s.rect.y], ['touchMove', s.rect.x + 90, s.rect.y + 4], ['touchMove', s.rect.x + 140, s.rect.y + 6], ['touchEnd']]);
await page.waitForTimeout(700);
const after = await count();
expect(after === before - 1, `a horizontal swipe dismisses a toast (${before} → ${after})`);
// With a mouse, hover still fans it out.
const desk = await browser.newPage({ viewport: { width: 960, height: 800 } });
await desk.goto(`file://${T}p-Toaster-daylight.html`); await desk.waitForTimeout(2200);
const box = await desk.locator('.alt-toaster').boundingBox();
const h0 = box.height;
await desk.mouse.move(box.x + box.width / 2, box.y + box.height - 10); await desk.waitForTimeout(400);
expect((await desk.locator('.alt-toaster').boundingBox()).height > h0 + 40, 'with a mouse, hover fans it out');
console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
