// The visible viewport (#251): Dialog, Sheet and CommandPalette size to the part of the screen you can see, not the
// largest viewport, so with a phone's keyboard open (here, the viewport shrinking under an open modal) the panel stays
// inside it and its footer is reachable. Run after a render of every preview (it opens test/p-Dialog-daylight.html);
// exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const ctx = await browser.newContext({ viewport: { width: 375, height: 700 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.goto(`file://${T}p-Dialog-daylight.html`);
await page.waitForFunction(() => !!window.altitudeModalFixture);
const read = (sel) => page.evaluate((sel) => { const r = document.querySelector(sel); if (!r) return null; const b = r.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, h: b.height, vvh: getComputedStyle(r).getPropertyValue('--alt-vvh'), vv: visualViewport.height }; }, sel);
for (const [label, open, root, panel] of [['Dialog', (f) => f.setMode('title'), '.alt-dialog-root', '.alt-dialog'], ['CommandPalette', (f) => f.setPalette(true), '.alt-cmd-root', '.alt-cmd']]) {
  await page.evaluate((s) => { const f = window.altitudeModalFixture; f.setMode(''); f.setPalette(false); }, null);
  await page.setViewportSize({ width: 375, height: 700 }); await page.waitForTimeout(300);
  await page.evaluate(`(${open.toString()})(window.altitudeModalFixture)`); await page.waitForTimeout(400);
  const a = await read(root);
  expect(a && a.vvh === '700px' && Math.abs(a.h - 700) < 1, `${label}: its root covers the visible viewport (${JSON.stringify(a)})`);
  await page.setViewportSize({ width: 375, height: 380 }); await page.waitForTimeout(300);
  const b = await read(root), p = await read(panel);
  expect(b && b.vvh === '380px' && Math.abs(b.h - 380) < 1, `${label}: when the visible viewport shrinks (a keyboard), the root follows (${JSON.stringify(b)})`);
  expect(p && p.bottom <= 380 + 0.5 && p.top >= -0.5, `${label}: the panel stays inside what's visible (${JSON.stringify(p)})`);
}
console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
