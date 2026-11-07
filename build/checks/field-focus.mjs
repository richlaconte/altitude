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

// Form reset (#573): an uncontrolled Combobox returns to defaultValue (text, value and form data); a cancelled reset and
// a controlled value stay where they are.
{ const page = await open('Combobox');
  await page.evaluate(() => new Promise((done) => {
    document.body.innerHTML = ''; const d = document.createElement('div'); document.body.append(d);
    const A = window.Altitude, h = React.createElement, items = [{ value: 'alice', label: 'Alice' }, { value: 'bob', label: 'Bob' }];
    const Controlled = () => { const [v, set] = React.useState('alice'); return h(A.Combobox, { name: 'owner', value: v, onValueChange: set, items, 'aria-label': 'Owner' }); };
    ReactDOM.createRoot(d).render(h(A.AltitudeProvider, null, h('form', { id: 'f' },
      h(A.Combobox, { name: 'assignee', defaultValue: '', items, 'aria-label': 'Assignee' }), h(Controlled),
      h('button', { type: 'reset', id: 'reset' }, 'Reset form'))));
    setTimeout(done, 300);
  }));
  const box = page.getByRole('combobox', { name: 'Assignee' }), owner = page.getByRole('combobox', { name: 'Owner' });
  const data = (n) => page.locator('#f').evaluate((f, n) => new FormData(f).get(n), n);
  await box.click(); await page.keyboard.type('Bob'); await page.keyboard.press('Tab'); await page.waitForTimeout(200);
  await owner.fill('Bob'); await page.keyboard.press('Tab'); await page.waitForTimeout(200);
  expect(await box.inputValue() === 'Bob' && await data('assignee') === 'bob' && await data('owner') === 'bob', 'combobox: typing an exact name and Tab commits it');
  await page.locator('#f').evaluate((f) => f.addEventListener('reset', (e) => e.preventDefault(), { once: true }));
  await page.locator('#reset').click(); await page.waitForTimeout(100);
  expect(await box.inputValue() === 'Bob' && await data('assignee') === 'bob', 'combobox: a cancelled form reset keeps the value');
  await page.locator('#reset').click(); await page.waitForTimeout(100);
  expect(await box.inputValue() === '' && await data('assignee') === '', 'combobox: form reset returns an uncontrolled value and its text to defaultValue');
  await box.fill('Al'); await page.waitForTimeout(200);
  await page.locator('#f').evaluate((f) => HTMLFormElement.prototype.reset.call(f)); await page.waitForTimeout(100);
  expect(await box.inputValue() === '' && await data('assignee') === '' && await box.getAttribute('aria-expanded') === 'false', 'combobox: form reset drops a pending query and closes the list');
  expect(await owner.inputValue() === 'Bob' && await data('owner') === 'bob', 'combobox: form reset leaves a controlled value with its owner');
  await page.close(); }

// Form reset after a failed required submission (#571 with #573) withdraws the required message, as Select's does.
{ const page = await open('Combobox');
  await page.evaluate(() => new Promise((done) => {
    document.body.innerHTML = ''; const d = document.createElement('div'); document.body.append(d);
    const A = window.Altitude, h = React.createElement, items = [{ value: 'alice', label: 'Alice' }, { value: 'bob', label: 'Bob' }];
    ReactDOM.createRoot(d).render(h(A.AltitudeProvider, null, h('form', { id: 'rf', onSubmit: (e) => e.preventDefault() },
      h(A.Combobox, { name: 'who', required: true, items, 'aria-label': 'Who' }))));
    setTimeout(done, 300);
  }));
  const box = page.getByRole('combobox', { name: 'Who' });
  await page.locator('#rf').evaluate((f) => f.requestSubmit()); await page.waitForTimeout(150);
  expect(await box.getAttribute('aria-invalid') === 'true' && await page.locator('#rf [role="alert"]').count() === 1, 'combobox: an empty required submission shows the required message');
  await page.locator('#rf').evaluate((f) => f.reset()); await page.waitForTimeout(150);
  expect(await box.getAttribute('aria-invalid') === null && await page.locator('#rf [role="alert"]').count() === 0, 'combobox: form reset withdraws the required message');
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
