// ColorPicker: named swatches in a radio group whose single raised mark sits on the chosen swatch and travels; arrows
// move and choose; the hex field takes a typed colour; the contrast check gives white and dark text their own verdicts;
// the full picker's area and hue are sliders with value text that change the colour by keyboard; forced colours keep
// the swatch colours. Run after a render of every preview (it opens test/p-ColorPicker-daylight.html); exits non-zero
// on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (media) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-ColorPicker-daylight.html`);
  await page.waitForTimeout(400);
  return page;
};
const page = await open();
const read = () => page.evaluate(() => {
  const g = document.querySelector('.alt-swatches'), mark = g.querySelector('.alt-swatch-mark').getBoundingClientRect(), on = g.querySelector('[aria-checked="true"]');
  const r = on?.getBoundingClientRect();
  return { role: g.getAttribute('role'), names: [...g.querySelectorAll('[role="radio"]')].map((b) => b.getAttribute('aria-label')).join(','), chosen: on?.getAttribute('aria-label'),
    markOn: r ? Math.hypot(mark.left + mark.width / 2 - (r.left + r.width / 2), mark.top + mark.height / 2 - (r.top + r.height / 2)) : NaN,
    hex: document.querySelector('.alt-color-hex input').value, checks: [...document.querySelectorAll('.alt-color-checks .alt-badge')].map((b) => b.textContent),
    stops: [...g.querySelectorAll('[role="radio"]')].filter((b) => b.tabIndex === 0).length, said: document.querySelector('.alt-color [aria-live]').textContent };
});

let r = await read();
expect(r.role === 'radiogroup' && r.names === 'Teal,Blue,Violet,Pink,Orange,Yellow', `named swatches in a radio group (${r.names})`);
expect(r.chosen === 'Teal' && r.markOn < 1 && r.stops === 1, `one mark, on the chosen swatch, one tab stop (${r.markOn})`);
expect(r.checks.join(' | ') === 'White text fails: 4.3:1 | Dark text passes: 4.8:1', `white and dark text each get a verdict (${r.checks.join(' | ')})`);
await page.focus('[aria-label="Teal"]');
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);
r = await read();
expect(r.chosen === 'Blue' && r.hex === '2563eb' && r.markOn < 1, `arrows move and choose; the mark follows (${r.chosen}, ${r.markOn})`);
expect(r.said === 'Blue, #2563eb', `the choice is announced by name (${r.said})`);
expect(r.checks[0].startsWith('White text passes'), `the check follows the colour (${r.checks[0]})`);

const hex = page.locator('.alt-color-hex input');
await hex.fill('7c3aed');
await page.waitForTimeout(400);
r = await read();
expect(r.chosen === 'Violet', `a typed hex chooses the matching swatch (${r.chosen})`);
await hex.fill('0f8');
await hex.blur();
await page.waitForTimeout(200);
expect((await read()).hex === '00ff88', `a short hex is read in full (${(await read()).hex})`);
await hex.fill('zz');
await hex.blur();
expect((await read()).hex === '00ff88', 'nonsense reverts to the last colour');

await page.click('text=Custom…');
await page.waitForTimeout(300);
const area = page.locator('.alt-color-area'), hue = page.locator('.alt-color-hue');
const vt = async (l) => l.getAttribute('aria-valuetext');
expect(await area.getAttribute('role') === 'slider' && /^Saturation \d+%, brightness \d+%$/.test(await vt(area)), `the area is a slider with value text (${await vt(area)})`);
const before = (await read()).hex;
await area.focus();
await page.keyboard.press('Shift+ArrowDown');
expect((await read()).hex !== before && /brightness 90%/.test(await vt(area)), `arrows move it (${await vt(area)})`);
await hue.focus();
await page.keyboard.press('Home');
expect(await vt(hue) === 'Hue 0°' && (await read()).hex.slice(0, 2) !== '00', `the hue strip is a slider too (${await vt(hue)}, ${(await read()).hex})`);
await page.close();

const forced = await open({ forcedColors: 'active' });
const fill = await forced.evaluate(() => getComputedStyle(document.querySelector('[aria-label="Teal"] .alt-swatch-fill')).backgroundColor);
expect(fill === 'rgb(15, 138, 107)', `forced colours keep a swatch's colour (${fill})`);
await forced.close();

console.log(`ColorPicker: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
