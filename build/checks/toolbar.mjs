// Toolbar: role="toolbar" with one tab stop over every tool (a ToggleGroup inside adds none), arrows, Home/End and a
// remembered position; ghost tools on a ground bar; overflow="menu" hides tools from the end (never ending on a
// separator) and offers them in "More tools", where a toggle is a checkable item that still toggles; tools come back
// when there's room. Run after a render of every preview (it opens test/p-Toolbar-daylight.html); exits non-zero on a
// failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
const warnings = [];
page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });
await page.goto(`file://${T}p-Toolbar-daylight.html`);
await page.waitForTimeout(400);

const wide = '.alt-toolbar:not(.narrow)', narrow = '.alt-toolbar.narrow';
const state = (sel) => page.evaluate((sel) => {
  const bar = document.querySelector(sel);
  const visible = [...bar.querySelectorAll('[data-roving-item]')].filter((el) => el.offsetParent).map((el) => el.getAttribute('aria-label'));
  const stops = [...bar.querySelectorAll('[data-roving-item]')].filter((el) => el.tabIndex === 0).length;
  const last = [...bar.children].filter((el) => !el.hasAttribute('data-overflowed') && !el.hidden).at(-2);
  return { role: bar.getAttribute('role'), label: bar.getAttribute('aria-label'), visible, stops, lastIsSep: !!last?.matches('.alt-sep'), more: !bar.querySelector('.alt-toolbar-more').hidden };
}, sel);

let w = await state(wide);
expect(w.role === 'toolbar' && w.label === 'Formatting', 'role="toolbar" with its label');
expect(w.visible.length === 7 && !w.more, `with room, every tool shows and there's no menu (${w.visible.length})`);
expect(w.stops === 1, `one tab stop for seven tools, ToggleGroup included (${w.stops})`);
expect(warnings.length === 0, `named tools raise no warning (${warnings.join(' | ')})`);
const shadow = await page.evaluate((sel) => { const b = document.querySelector(sel); return [getComputedStyle(b).boxShadow, getComputedStyle(b.querySelector('[aria-label="Code"]')).backgroundColor]; }, wide);
expect(shadow[0] === 'none' && shadow[1] === 'rgba(0, 0, 0, 0)', `the bar lies on the ground, tools are ghosts (${shadow})`);

await page.focus(`${wide} [aria-label="Bold"]`);
const path = [];
for (let i = 0; i < 4; i++) { await page.keyboard.press('ArrowRight'); path.push(await page.evaluate(() => document.activeElement.getAttribute('aria-label'))); }
expect(path.join(',') === 'Italic,Underline,Bulleted list,Quote', `arrows walk across groups and the ToggleGroup (${path})`);
await page.keyboard.press('End');
expect(await page.evaluate(() => document.activeElement.getAttribute('aria-label')) === 'Insert link', 'End jumps to the last tool');
await page.keyboard.press('Home');
await page.keyboard.press('ArrowRight');
await page.keyboard.press('Tab');
await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
expect(await page.evaluate(() => document.activeElement.getAttribute('aria-label')) === 'Italic', 'returning to the bar lands on the tool you left');

const n = await state(narrow);
expect(n.more && n.visible.length === 4 && n.visible.at(-1) === 'More tools', `squeezed: tools hide from the end, "More tools" shows (${n.visible})`);
expect(!n.lastIsSep, 'the visible row never ends on a separator');
expect(n.stops === 1, 'still one tab stop');
await page.click(`${narrow} [aria-label="More tools"]`);
await page.waitForTimeout(300);
const menu = await page.evaluate(() => [...document.querySelectorAll('.alt-menu [role^="menuitem"]')].map((el) => `${el.getAttribute('role')}:${el.textContent}:${el.getAttribute('aria-checked')}`));
expect(menu.join('|') === 'menuitem:Bulleted list:null|menuitemcheckbox:Quote:false|menuitem:Code:null|menuitem:Insert link:null', `the menu offers the hidden tools in order, a toggle as a checkbox (${menu.join(' | ')})`);
expect(await page.locator('.alt-menu .alt-menu-sep').count() === 1, 'a hidden separator becomes a menu separator');
await page.click('.alt-menu [role="menuitemcheckbox"]');
await page.waitForTimeout(200);
expect(await page.evaluate((sel) => document.querySelector(`${sel} [aria-label="Quote"]`).getAttribute('aria-pressed'), narrow) === 'true', 'choosing the item toggles the hidden tool');
await page.click(`${narrow} [aria-label="More tools"]`);
await page.waitForTimeout(300);
expect(await page.evaluate(() => document.querySelector('.alt-menu [role="menuitemcheckbox"]').getAttribute('aria-checked')) === 'true', 'and the menu shows it checked');
await page.keyboard.press('Escape');

await page.evaluate((sel) => { document.querySelector(sel).style.width = '600px'; }, narrow);
await page.waitForTimeout(200);
const back = await state(narrow);
expect(back.visible.length === 7 && !back.more, `given room, the tools come back (${back.visible.length})`);

console.log(`Toolbar: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
