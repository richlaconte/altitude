import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
async function open(name, motion) {
  const page = await browser.newPage({ viewport: { width: 960, height: 520 } });
  await page.goto(`file://${T}p-${name}-daylight.html`);
  if (motion) await page.evaluate((m) => document.documentElement.setAttribute('data-motion', m), motion);
  await page.waitForTimeout(500);
  return page;
}
const box = (page, sel, i = 0) => page.evaluate(([s, i]) => { const r = document.querySelectorAll(s)[i].getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 100) / 100); }, [sel, i]);
const cs = (page, sel, prop, i = 0) => page.evaluate(([s, p, i]) => getComputedStyle(document.querySelectorAll(s)[i]).getPropertyValue(p).trim(), [sel, prop, i]);

// Buttons: nothing moves as the pointer approaches or travels across the face; hover is one discrete 1px lift.
{ const page = await open('Button');
  const sel = '.alt-btn[data-variant="primary"]';
  const rest = await box(page, sel); const b = rest;
  await page.mouse.move(b[0] - 20, b[1] + b[3] / 2); await page.waitForTimeout(400);
  expect(JSON.stringify(await box(page, sel)) === JSON.stringify(rest), 'button does not move as the pointer approaches');
  expect(!(await page.locator(sel).first().getAttribute('data-approach')), 'button no longer subscribes to approach');
  await page.mouse.move(b[0] + 4, b[1] + 4); await page.waitForTimeout(450); const tl = await box(page, sel);
  await page.mouse.move(b[0] + b[2] - 4, b[1] + b[3] - 4); await page.waitForTimeout(450); const br = await box(page, sel);
  expect(JSON.stringify(tl) === JSON.stringify(br), 'moving across a hovered button does not shift it: ' + tl + ' vs ' + br);
  expect(Math.abs(tl[1] - (rest[1] - 1)) < 0.05 && tl[0] === rest[0], 'hover is a single 1px lift, no sideways movement: ' + rest + ' -> ' + tl);
  expect((await cs(page, sel, 'translate')) === 'none', 'no translate on buttons');
  await page.close(); }

// Interactive Card and Surface: same.
for (const [name, sel] of [['Card', '.alt-card.alt-lift'], ['Surface', '.alt-lift']]) {
  const page = await open(name); const rest = await box(page, sel); const b = rest;
  await page.mouse.move(b[0] + b[2] / 2, b[1] - 30); await page.waitForTimeout(450);
  expect(JSON.stringify(await box(page, sel)) === JSON.stringify(rest), name + ' does not move as the pointer approaches');
  await page.mouse.move(b[0] + 6, b[1] + 6); await page.waitForTimeout(450); const a1 = await box(page, sel);
  await page.mouse.move(b[0] + b[2] - 6, b[1] + b[3] - 6); await page.waitForTimeout(450); const a2 = await box(page, sel);
  expect(JSON.stringify(a1) === JSON.stringify(a2), name + ' does not lean toward the pointer');
  await page.close(); }

// Drilldown crumbs, Stepper steps, Board cards, Pile: nothing reacts before the pointer is on them.
{ const page = await open('Pile'); const sel = '.alt-pile-live .alt-pile-top'; const rest = await box(page, sel);
  const sheet = await cs(page, '.alt-pile-live .alt-pile-sheet', 'rotate');
  await page.mouse.move(rest[0] + rest[2] / 2, rest[1] - 25); await page.waitForTimeout(450);
  expect(JSON.stringify(await box(page, sel)) === JSON.stringify(rest), 'pile top does not climb on approach');
  expect((await cs(page, '.alt-pile-live .alt-pile-sheet', 'rotate')) === sheet, 'pile sheets do not fan on approach');
  await page.mouse.move(rest[0] + 20, rest[1] + 20); await page.waitForTimeout(450);
  expect((await cs(page, '.alt-pile-live .alt-pile-sheet', 'rotate')) !== sheet, 'pile sheets still fan on hover');
  await page.close(); }
for (const [name, sel] of [['Drilldown', '.alt-crumbs button'], ['Board', '.alt-board-card'], ['Table', '.alt-tr[data-interactive]']]) {
  const page = await open(name); const n = await page.locator(sel).count();
  if (!n) { console.log('skip', name, 'none present'); await page.close(); continue; }
  const rest = await box(page, sel); const bg = await page.evaluate((s) => getComputedStyle(document.querySelector(s)).getPropertyValue('--row-bg'), sel);
  await page.mouse.move(rest[0] + rest[2] / 2, rest[1] - 8); await page.waitForTimeout(450);
  expect(JSON.stringify(await box(page, sel)) === JSON.stringify(rest), name + ' does not move on approach');
  expect(await page.evaluate((s) => getComputedStyle(document.querySelector(s)).getPropertyValue('--row-bg'), sel) === bg, name + ' does not tint on approach');
  expect((await page.locator(`${sel}[data-approach]`).count()) === 0, name + ' no longer subscribes');
  await page.close(); }
{ const page = await open('Stepper'); expect((await page.locator('.alt-step[data-approach]').count()) === 0, 'stepper steps no longer subscribe'); await page.close(); }

// Inputs keep approach: the wall deepens as the pointer nears; focus holds it; filling or reduced motion removes it.
{ const page = await open('Input'); const sel = '.alt-input'; const b = await box(page, sel);
  const near = () => page.evaluate(() => getComputedStyle(document.querySelector('.alt-input')).getPropertyValue('--n').trim());
  const wall = () => page.evaluate(() => getComputedStyle(document.querySelector('.alt-input')).boxShadow.split('px')[1]);
  await page.mouse.move(b[0] + b[2] / 2, b[1] + b[3] + 120); await page.waitForTimeout(400); const far = await wall();
  await page.mouse.move(b[0] + b[2] / 2, b[1] + b[3] + 2); await page.waitForTimeout(500); const close = await wall();
  expect(parseFloat(close) > parseFloat(far), 'empty input deepens as the pointer nears: ' + far + ' -> ' + close);
  expect(JSON.stringify(await box(page, sel)) === JSON.stringify(b), 'the input itself does not move');
  await page.locator('input').first().focus(); await page.mouse.move(900, 500); await page.waitForTimeout(500);
  expect(parseFloat(await wall()) === parseFloat(close) || parseFloat(await wall()) >= 5.9, 'a focused empty field holds its depth when the pointer leaves: ' + (await wall()));
  const rim = await cs(page, sel, 'border-top-color'); const out = await cs(page, sel, 'outline-color');
  const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent-ink').trim());
  expect(rim === out && !rim.includes('42, 82, 200'), 'focus rim is neutral, not accent: ' + rim + ' / ' + accent);
  expect((await cs(page, sel, 'box-shadow')).split(', rgba(0, 0, 0, 0) 0px 0px 0px 0px').length === 2 || !(await cs(page, sel, 'box-shadow')).includes('0px 0px 0px 4px'), 'no halo');
  await page.keyboard.type('a'); await page.waitForTimeout(400);
  expect(parseFloat(await wall()) === 0, 'typing raises the floor flush: ' + (await wall()));
  await page.close(); }
{ const page = await open('Input', 'reduced'); const b = await box(page, '.alt-input');
  const wall = () => page.evaluate(() => getComputedStyle(document.querySelector('.alt-input')).boxShadow.split('px')[1]);
  await page.mouse.move(b[0] + b[2] / 2, b[1] + b[3] + 120); await page.waitForTimeout(300); const far = await wall();
  await page.mouse.move(b[0] + b[2] / 2, b[1] + b[3] + 2); await page.waitForTimeout(500);
  expect((await wall()) === far, 'reduced motion: no approach deepening');
  await page.locator('input').first().focus(); await page.waitForTimeout(400);
  expect((await wall()) === far, 'reduced motion: focus does not deepen either');
  await page.close(); }

// Select: open state and focus use the neutral rim.
{ const page = await open('Select'); const t = page.locator('.alt-select-trigger').first();
  await t.click(); await page.waitForTimeout(400);
  const rim = await page.evaluate(() => getComputedStyle(document.querySelector('.alt-select[data-open] > .alt-input')).borderTopColor);
  expect(!rim.includes('42, 82, 200') && !rim.includes('43, 86, 214'), 'open select has a neutral rim: ' + rim);
  await page.keyboard.press('Escape'); await page.close(); }

// Badges and avatar dots are flat: one solid colour, no gradient, no socket.
{ const page = await open('Badge');
  const lamps = await page.evaluate(() => [...document.querySelectorAll('.alt-badge-lamp')].map((l) => { const c = getComputedStyle(l); return [c.backgroundImage, c.backgroundColor, c.boxShadow, l.parentElement.dataset.tone]; }));
  expect(lamps.length >= 6 && lamps.every((l) => l[0] === 'none'), 'badge lamps have no gradient');
  const pos = lamps.find((l) => l[3] === 'positive'); const posTok = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--positive').trim());
  expect(pos && pos[1] === 'rgb(19, 115, 79)', 'positive lamp is the positive token itself: ' + pos?.[1] + ' / ' + posTok);
  const neu = lamps.find((l) => l[3] === 'neutral'); expect(neu && neu[1] === 'rgba(0, 0, 0, 0)' && neu[2].includes('inset'), 'neutral lamp is an empty ring');
  await page.close(); }
{ const page = await open('Avatar');
  const l = await page.evaluate(() => [...document.querySelectorAll('.alt-avatar-lamp')].map((x) => [getComputedStyle(x).backgroundImage, getComputedStyle(x).backgroundColor, x.closest('.alt-avatar').dataset.status, getComputedStyle(x).boxShadow]));
  expect(l.length >= 3 && l.every((x) => x[0] === 'none'), 'avatar lamps are flat');
  expect(l.find((x) => x[2] === 'active')?.[1] === 'rgb(19, 115, 79)', 'active is lit: the positive token itself');
  const idle = l.find((x) => x[2] === 'idle'); expect(idle && idle[1] === 'rgb(255, 255, 255)' && idle[3].includes('rgb(135, 84, 0)') && idle[3].includes('inset'), 'idle is an empty ring in the caution token: ' + idle?.[3]);
  await page.close(); }
console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
