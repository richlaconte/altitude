// Safe areas (#252): every layer fixed to the screen's edge (Toaster, SaveBar, each side of Sheet, the Dialog root)
// adds env(safe-area-inset-*) to its offset, and without viewport-fit=cover (env() is 0) nothing moves. The mode frame
// stays at the physical edge. Reads bundle.css and the rendered Toaster and SaveBar previews; exits non-zero on a failure.
import { readFileSync } from 'fs';
import { chromium } from 'playwright-core';
const css = readFileSync(new URL('../../project/components/bundle.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const rule = (sel) => { const i = css.indexOf('\n' + sel + ' {'); return i < 0 ? '' : css.slice(i, css.indexOf('}', i)); };
for (const [sel, sides] of [['.alt-toaster', ['right', 'bottom']], ['.alt-sheet[data-side="right"]', ['right']], ['.alt-sheet[data-side="left"]', ['left']], ['.alt-sheet[data-side="bottom"]', ['bottom']], ['.alt-dialog-root', ['top', 'right', 'bottom', 'left']]]) {
  const r = rule(sel);
  expect(sides.every((s) => r.includes(`env(safe-area-inset-${s}`)), `${sel} clears the ${sides.join(', ')} safe area (${r.slice(0, 60)}…)`);
}
expect(/\.alt-savebar[^{]*\{[^}]*bottom: calc\(var\(--space-4\) \+ env\(safe-area-inset-bottom/.test(css), 'SaveBar clears the home indicator');
expect(!rule('.alt-mode-frame').includes('safe-area'), 'the mode frame stays at the physical edge');
// Without viewport-fit=cover, env() is 0: the Toaster still sits 24px from the corner.
const T = new URL('../test/', import.meta.url).pathname;
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
await page.goto(`file://${T}p-Toaster-daylight.html`); await page.waitForTimeout(500);
const off = await page.evaluate(() => { const t = document.querySelector('.alt-toaster'); if (!t) return null; const cs = getComputedStyle(t); return [cs.right, cs.bottom]; });
expect(off && off[0] === '24px' && off[1] === '24px', `with no safe area, nothing moves (${off})`);
await browser.close();
console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
