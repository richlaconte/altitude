// ContextMenu: right-click opens DropdownMenu's menu at the pointer (in the viewport), outlines the thing (2px
// accent-ink, no lift) and sets aria-expanded; choosing runs the action and returns focus; Escape closes; Shift+F10 on
// the focused thing opens it at the thing with the first item active; a click outside closes it; a menu near the
// right edge flips left. Run after a render of every preview (it opens test/p-ContextMenu-daylight.html); exits
// non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-ContextMenu-daylight.html`);
await page.waitForTimeout(400);

const file = (i) => page.locator('.file').nth(i);
const menu = () => page.evaluate(() => { const m = document.querySelector('.alt-context-menu'); if (!m) return null; const r = m.getBoundingClientRect();
  return { role: m.getAttribute('role'), items: [...m.querySelectorAll('[role="menuitem"]')].map((x) => x.textContent), x: r.left, y: r.top, right: r.right, active: m.getAttribute('aria-activedescendant') }; });
const target = (i) => page.evaluate((i) => { const f = document.querySelectorAll('.file')[i], cs = getComputedStyle(f); return { popup: f.getAttribute('aria-haspopup'), expanded: f.getAttribute('aria-expanded'), outline: `${cs.outlineStyle} ${cs.outlineWidth}`, shadow: cs.boxShadow, transform: cs.transform }; }, i);

expect((await target(1)).popup === 'menu' && (await target(1)).expanded === 'false', 'the thing says it has a menu');
const box = await file(1).boundingBox();
await file(1).click({ button: 'right', position: { x: 120, y: 18 } });
await page.waitForTimeout(300);
let m = await menu();
expect(m?.role === 'menu' && m.items.join('|') === 'Open|Rename|Duplicate|Delete file', `right-click opens the menu (${m?.items})`);
expect(Math.abs(m.x - (box.x + 120)) < 2 && Math.abs(m.y - (box.y + 18)) < 2, `at the pointer (${m.x},${m.y})`);
let t = await target(1);
expect(t.expanded === 'true' && t.outline === 'solid 2px' && t.shadow === 'none' && t.transform === 'none', `the thing is outlined, not lifted (${t.outline})`);
await page.click('.alt-context-menu [role="menuitem"] >> text=Duplicate');
await page.waitForTimeout(250);
expect(await page.locator('[role="status"]').textContent() === 'Duplicated Invoices 2026.xlsx.' && await menu() === null, 'choosing runs the action and closes the menu');
expect(await page.evaluate(() => document.activeElement.classList.contains('file') && document.activeElement.textContent.startsWith('Invoices')), 'focus returns to the thing');

await page.keyboard.press('Shift+F10');
await page.waitForTimeout(300);
m = await menu();
expect(m && m.active?.endsWith('-0'), `Shift+F10 opens it at the thing, first item active (${m?.active})`);
await page.keyboard.press('Escape');
await page.waitForTimeout(250);
expect(await menu() === null && (await target(1)).expanded === 'false', 'Escape closes it');

await file(0).click({ button: 'right', position: { x: 60, y: 18 } });
await page.waitForTimeout(250);
await page.mouse.click(800, 500);
await page.waitForTimeout(250);
expect(await menu() === null, 'a click outside closes it');

await page.setViewportSize({ width: 600, height: 600 });
const b2 = await file(2).boundingBox();
await file(2).click({ button: 'right', position: { x: b2.width - 20, y: 18 } });
await page.waitForTimeout(300);
m = await menu();
expect(m && m.right <= 600 - 7, `near the right edge it flips left, inside the viewport (${m?.right})`);

console.log(`ContextMenu: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
