import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (name) => { const p = await browser.newPage({ viewport: { width: 960, height: 520 } }); await p.goto(`file://${T}p-${name}-daylight.html`); await p.waitForTimeout(500); return p; };
const st = (page, sel, i = 0) => page.evaluate(([s, i]) => { const el = document.querySelectorAll(s)[i]; const c = getComputedStyle(el);
  return { outline: c.outlineColor, border: c.borderTopColor, bg: c.backgroundColor, key: el.hasAttribute('data-key-focus') || !!el.closest('[data-key-focus]'), wall: parseFloat(c.boxShadow.split('px')[1]) }; }, [sel, i]);
const clear = 'rgba(0, 0, 0, 0)';

{ const page = await open('Input'); const fields = page.locator('.alt-input');
  const rest = await st(page, '.alt-input', 0);
  await page.locator('input').first().click(); await page.waitForTimeout(350);
  let s = await st(page, '.alt-input', 0);
  expect(s.outline === clear && !s.key, 'clicking into a field: no rim (' + s.outline + ')');
  expect(s.bg !== rest.bg, 'clicking into a field: the floor lights');
  await page.mouse.move(900, 500); await page.waitForTimeout(350); s = await st(page, '.alt-input', 0);
  expect(s.wall > rest.wall, 'clicked empty field holds its depth with the pointer away: ' + rest.wall + ' -> ' + s.wall);
  await page.keyboard.type('mara@'); await page.waitForTimeout(350); s = await st(page, '.alt-input', 0);
  expect(s.outline === clear, 'typing into a clicked field does not add the rim');
  await page.keyboard.press('Tab'); await page.waitForTimeout(350); s = await st(page, '.alt-input', 1);
  expect(s.outline !== clear && s.key, 'tabbing to the next field shows the rim (' + s.outline + ')');
  const w = await st(page, '.alt-input', 1); expect(w.border === w.outline, 'rim is border and outline together (2px)');
  await page.locator('input').nth(1).click(); await page.waitForTimeout(350); s = await st(page, '.alt-input', 1);
  expect(s.outline === clear, 'clicking a keyboard-focused field removes the rim');
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.waitForTimeout(350);
  const inv = await page.evaluate(() => { const el = document.querySelector('.alt-input[data-invalid]'); return { has: el.matches(':focus-within'), o: getComputedStyle(el).outlineColor }; });
  expect(inv.has && inv.o === 'rgb(181, 46, 22)', 'keyboard focus on an invalid field keeps a critical rim: ' + JSON.stringify(inv));
  await page.locator('.alt-input[data-invalid] input').click(); await page.waitForTimeout(350);
  const inv2 = await page.evaluate(() => getComputedStyle(document.querySelector('.alt-input[data-invalid]')).outlineColor);
  expect(inv2 === clear, 'clicking an invalid field: no extra rim, its own critical border stays');
  await page.close(); }

{ const page = await open('Select'); const trig = page.locator('.alt-select-trigger').first();
  await trig.click(); await page.waitForTimeout(400);
  let s = await st(page, '.alt-select[data-open] > .alt-input');
  expect(s.outline === clear, 'select opened by click: no rim');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.mouse.click(900, 500); await page.waitForTimeout(200);
  await page.keyboard.press('Tab'); await page.waitForTimeout(300);
  s = await st(page, '.alt-select > .alt-input');
  expect(s.outline !== clear, 'select reached by Tab: rim');
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(400);
  s = await st(page, '.alt-select[data-open] > .alt-input');
  expect(s.outline !== clear, 'select opened from the keyboard keeps the rim while the list has focus');
  await page.close(); }

{ const page = await open('Combobox'); const inp = page.locator('.alt-combobox input').first();
  await inp.click(); await page.waitForTimeout(350); let s = await st(page, '.alt-combobox > .alt-input');
  expect(s.outline === clear, 'combobox clicked: no rim');
  await page.mouse.click(900, 500); await page.waitForTimeout(200); await page.keyboard.press('Tab'); await page.waitForTimeout(350);
  s = await st(page, '.alt-combobox > .alt-input'); expect(s.outline !== clear, 'combobox tabbed: rim');
  await page.close(); }

{ const page = await open('CommandPalette'); await page.waitForTimeout(300);
  const f = await page.evaluate(() => { const el = document.querySelector('.alt-cmd-field'); return el ? { focus: el.matches(':focus-within'), o: getComputedStyle(el).outlineColor, key: el.hasAttribute('data-key-focus') } : null; });
  expect(f && f.focus && f.o === clear, 'palette field never wears the rim, even with keyboard focus: ' + JSON.stringify(f));
  await page.close(); }

{ const page = await open('Popover'); await page.locator('.alt-btn', { hasText: 'Share' }).click(); await page.waitForTimeout(200);
  await page.locator('.alt-btn', { hasText: 'Share' }).click(); await page.waitForTimeout(500);
  const f = await page.evaluate(() => { const el = document.querySelector('.alt-pop .alt-input'); return el ? { focus: el.matches(':focus-within'), o: getComputedStyle(el).outlineColor } : null; });
  expect(f && (!f.focus || f.o === clear), 'a field focused by a popover opened with a click: no rim ' + JSON.stringify(f));
  await page.close(); }
console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
