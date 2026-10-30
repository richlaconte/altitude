// Menus as sheets (#249): on a narrow touch screen DropdownMenu and Select open as a sheet at the bottom edge, with a
// title and Close, rows at least 44px, the menu or listbox role intact (Close sits outside it), and Close or a tap
// outside closes it; with a mouse, or with presentation="anchored", they open under the trigger; Combobox stays under
// its field unless asked. Run after a render of every preview (it opens test/p-Select-daylight.html); exits non-zero.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const mount = (page) => page.evaluate(() => new Promise((done) => {
  document.body.innerHTML = ''; const d = document.createElement('div'); d.style.padding = '16px'; document.body.append(d);
  const A = window.Altitude, h = React.createElement;
  const items = [{ label: 'Rename' }, { label: 'Duplicate', shortcut: '⌘D' }, { label: 'Delete', tone: 'critical' }];
  ReactDOM.createRoot(d).render(h(A.AltitudeProvider, null,
    h('div', { id: 'dm' }, h(A.DropdownMenu, { trigger: h(A.Button, null, 'Actions'), items })),
    h('div', { id: 'an' }, h(A.DropdownMenu, { trigger: h(A.Button, null, 'Pinned'), items, presentation: 'anchored' })),
    h('div', { id: 'se' }, h(A.Field, { label: 'Region' }, h(A.Select, { items: [{ value: 'eu', label: 'Europe' }, { value: 'us', label: 'United States' }] }))),
    h('div', { id: 'co' }, h(A.Field, { label: 'City' }, h(A.Combobox, { items: [{ value: 'a', label: 'Amsterdam' }, { value: 'b', label: 'Berlin' }] })))));
  setTimeout(done, 300);
}));
const read = (page, sel) => page.evaluate((sel) => {
  const root = document.querySelector(sel), sheet = root.querySelector('.alt-menu-sheet'), pop = root.querySelector('.alt-pop');
  if (!pop) return null;
  const r = pop.getBoundingClientRect(), list = root.querySelector('[role="menu"], [role="listbox"]');
  return { sheet: !!sheet, fixed: getComputedStyle(pop).position === 'fixed', bottom: Math.round(innerHeight - r.bottom), title: root.querySelector('.alt-menu-sheet-title')?.textContent,
    closeInList: !!list?.querySelector('.alt-menu-sheet-close'), rowH: Math.round(root.querySelector('.alt-menu-item, .alt-select-option')?.getBoundingClientRect().height ?? 0) };
}, sel);
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); await page.goto(`file://${T}p-Select-daylight.html`); await page.waitForTimeout(300);
  await mount(page);
  await page.locator('#dm button').first().tap(); await page.waitForTimeout(400);
  let s = await read(page, '#dm');
  expect(s?.sheet && s.fixed && s.bottom >= 7 && s.bottom <= 9, `on a narrow touch screen the menu is a sheet at the bottom edge (${JSON.stringify(s)})`);
  expect(s?.title === 'Actions' && !s.closeInList && s.rowH >= 44, `with its title, Close outside the menu role, and 44px rows (${JSON.stringify(s)})`);
  await page.locator('#dm .alt-menu-sheet-close').tap(); await page.waitForTimeout(400);
  expect(await read(page, '#dm') === null, 'Close closes it');
  await page.locator('#an button').first().tap(); await page.waitForTimeout(400);
  s = await read(page, '#an');
  expect(s && !s.sheet && !s.fixed, `presentation="anchored" keeps it under the trigger (${JSON.stringify(s)})`);
  await page.touchscreen.tap(380, 20); await page.waitForTimeout(400);
  await page.locator('#se .alt-select-trigger, #se button').first().tap(); await page.waitForTimeout(400);
  s = await read(page, '#se');
  expect(s?.sheet && s.title === 'Region' && s.rowH >= 44, `Select opens as a sheet titled by its label (${JSON.stringify(s)})`);
  await page.touchscreen.tap(380, 20); await page.waitForTimeout(400);
  expect(await read(page, '#se') === null, 'a tap outside closes it');
  await page.locator('#co input').tap(); await page.keyboard.type('a'); await page.waitForTimeout(400);
  s = await read(page, '#co');
  expect(s && !s.sheet, `Combobox keeps its list under the field you're typing in (${JSON.stringify(s)})`);
  await ctx.close();
}
{
  const page = await browser.newPage({ viewport: { width: 960, height: 800 } });
  await page.goto(`file://${T}p-Select-daylight.html`); await page.waitForTimeout(300);
  await mount(page);
  await page.locator('#dm button').first().click(); await page.waitForTimeout(400);
  const s = await read(page, '#dm');
  expect(s && !s.sheet && !s.fixed, `with a mouse it opens under the trigger (${JSON.stringify(s)})`);
  await page.close();
}
console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
