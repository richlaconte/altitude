// Scroll chaining: a scrolling region in the page (ScrollArea, Table, CodeBlock, Conversation, Terminal, streaming
// reasoning) hands the wheel to the page once it reaches its edge, so it never traps you; layers above the page (the
// CommandPalette list, Sheet, a Select's list, a menu as a bottom sheet) still contain it. Checks the computed
// overscroll-behavior of every scroller, then wheels a real ScrollArea and Table past their ends in a page taller than
// the window and expects the page to move. Run after a render of every preview (it opens test/p-ScrollArea-daylight.html
// and test/p-Table-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
await page.goto(`file://${T}p-ScrollArea-daylight.html`); await page.waitForTimeout(300);
const chain = ['alt-code-scroll', 'alt-convo-scroll', 'alt-term-body', 'alt-scroll-body', 'alt-table-wrap'];
const contain = ['alt-cmd-viewport', 'alt-sheet-scroll', 'alt-select-list'];
const read = (classes) => page.evaluate((cs) => cs.map((c) => { const el = document.createElement('div'); el.className = c; document.body.appendChild(el);
  const v = getComputedStyle(el).overscrollBehaviorY; el.remove(); return [c, v]; }), classes);
for (const [c, v] of await read(chain)) expect(v === 'auto', `${c} chains to the page (overscroll-behavior-y: ${v})`);
for (const [c, v] of await read(contain)) expect(v === 'contain', `${c}, a layer above the page, contains its overscroll (${v})`);
const reasoning = await page.evaluate(() => { const t = document.createElement('div'); t.className = 'alt-trace-thought'; t.dataset.status = 'streaming';
  const r = document.createElement('div'); r.className = 'alt-trace-reasoning'; t.appendChild(r); document.body.appendChild(t); const v = getComputedStyle(r).overscrollBehaviorY; t.remove(); return v; });
expect(reasoning === 'auto', `streaming reasoning chains to the page (${reasoning})`);

// Wheel past the end of a real scroller in a page taller than the window: the page moves on.
async function wheelsThrough(name, selector) {
  await page.goto(`file://${T}p-${name}-daylight.html`); await page.waitForTimeout(400);
  await page.evaluate(() => { const pad = () => { const d = document.createElement('div'); d.style.height = '1500px'; return d; }; document.body.prepend(pad()); document.body.appendChild(pad()); window.scrollTo(0, 0); });
  const box = await page.evaluate((sel) => { const el = [...document.querySelectorAll(sel)].find((e) => e.scrollHeight > e.clientHeight + 4); if (!el) return null;
    el.scrollIntoView({ block: 'center' }); el.scrollTop = el.scrollHeight; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, top: window.scrollY }; }, selector);
  if (!box) { expect(false, `${name}: a ${selector} that scrolls`); return; }
  await page.mouse.move(box.x, box.y);
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(80); }
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => window.scrollY);
  expect(after > box.top + 100, `${name}: wheeling past the end of ${selector} scrolls the page (${box.top} → ${after})`);
  // And back up: at its top, the wheel carries on up the page.
  await page.evaluate((sel) => { const el = [...document.querySelectorAll(sel)].find((e) => e.scrollHeight > e.clientHeight + 4); el.scrollTop = 0; el.scrollIntoView({ block: 'center' }); }, selector);
  await page.waitForTimeout(100);
  const p = await page.evaluate((sel) => { const el = [...document.querySelectorAll(sel)].find((e) => e.scrollHeight > e.clientHeight + 4); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, top: window.scrollY }; }, selector);
  if (p.y < 0 || p.y > 700) return expect(false, `${name}: the scroller is on screen to wheel back up`);
  await page.mouse.move(p.x, p.y);
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, -200); await page.waitForTimeout(80); }
  await page.waitForTimeout(300);
  const up = await page.evaluate(() => window.scrollY);
  expect(up < p.top - 100, `${name}: wheeling up past its top scrolls the page up (${p.top} → ${up})`);
}
await wheelsThrough('ScrollArea', '.alt-scroll-body');
await wheelsThrough('Table', '.alt-table-wrap');
console.log(`Scroll chaining: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
