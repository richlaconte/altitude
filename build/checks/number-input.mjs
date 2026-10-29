// NumberInput and parseNumber: locale-aware parsing (de-DE separators, other digit sets, nonsense), a spinbutton with
// its range and unit in aria-valuetext, steps by arrow/Shift/PageUp/Home/End landing on the grid without float drift,
// clamping on commit (not while typing), steppers that aren't tab stops and lie flat at a limit, the well filling, and
// the wheel ignored unless asked. Run after a render of every preview (it opens test/p-NumberInput-daylight.html);
// exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-NumberInput-daylight.html`);
await page.waitForTimeout(400);

const p = await page.evaluate(() => {
  const f = window.Altitude.parseNumber;
  return [f('1.250,50', 'de-DE'), f('1,5', 'de-DE'), f('1,250.5', 'en-US'), f('١٢٣', 'en-US'), f('−4', 'en-US'), f('abc', 'en-US'), f('  ', 'en-US'), f('12 345,6', 'fr-FR')];
});
expect(p[0] === 1250.5 && p[1] === 1.5 && p[2] === 1250.5, `separators by locale (${p.slice(0, 3)})`);
expect(p[3] === 123 && p[4] === -4, `other digits and a typographic minus (${p[3]}, ${p[4]})`);
expect(Number.isNaN(p[5]) && p[6] === null && p[7] === 12345.6, `nonsense is NaN, nothing is null, French spaces group (${p[5]}, ${p[6]}, ${p[7]})`);

const box = (i) => page.locator('.alt-numfield input').nth(i);
const read = (i) => box(i).evaluate((el) => ({ value: el.value, role: el.getAttribute('role'), now: el.getAttribute('aria-valuenow'), min: el.getAttribute('aria-valuemin'), max: el.getAttribute('aria-valuemax'), text: el.getAttribute('aria-valuetext'),
  bg: getComputedStyle(el.closest('.alt-input')).backgroundColor, steps: [...el.closest('.alt-input').querySelectorAll('.alt-numfield-step')].map((s) => ({ label: s.getAttribute('aria-label'), tab: s.tabIndex, disabled: s.disabled, shadow: getComputedStyle(s).boxShadow })) }));

let seats = await read(0);
expect(seats.role === 'spinbutton' && seats.now === '12' && seats.min === '1' && seats.max === '500', `a spinbutton with its range (${seats.now} in ${seats.min}–${seats.max})`);
expect(seats.steps.every((s) => s.tab === -1) && seats.steps[0].label === 'Increase seats', 'steppers aren\'t tab stops and say what they change');
expect(seats.steps.every((s) => s.shadow.includes('0px 1px 0px 0px')), 'steppers are raised slabs with a 1px wall');
const days = await read(1);
expect(days.text === '30 days', `the unit is in aria-valuetext (${days.text})`);
const euro = await read(2);
expect(euro.value === '1.250,50' && euro.text.replace(/\s/g, ' ') === '1.250,50 €', `de-DE shows and speaks its own way (${euro.value}, ${euro.text})`);

await box(0).focus();
await page.keyboard.press('ArrowUp');
expect((await read(0)).now === '13', 'Up steps');
await page.keyboard.press('Shift+ArrowUp');
expect((await read(0)).now === '23', 'Shift+Up steps ten');
await page.keyboard.press('PageDown');
expect((await read(0)).now === '13', 'PageDown steps ten');
await page.keyboard.press('End');
await page.waitForTimeout(250);
seats = await read(0);
expect(seats.now === '500' && seats.steps[0].disabled && seats.steps[0].shadow === 'none', `End goes to max, and the increase stepper lies flat (${seats.now})`);
await page.keyboard.press('Home');
expect((await read(0)).now === '1', 'Home goes to min');

await box(0).fill('900');
expect((await read(0)).value === '900', 'typing past the limit isn\'t clamped while typing');
await page.keyboard.press('Tab');
expect((await read(0)).now === '500' && (await read(0)).value === '500', 'it\'s clamped when committed');
await box(0).fill('abc');
await box(0).blur();
expect((await read(0)).now === '500', 'nonsense keeps the last good value');

await box(2).fill('2.000,25');
await box(2).blur();
expect((await read(2)).now === '2000.25' && (await read(2)).value === '2.000,25', `de-DE parses what's typed (${(await read(2)).now})`);
await box(2).focus();
await page.keyboard.press('ArrowUp');
expect((await read(2)).now === '2000.5', `a step lands on the grid from min (${(await read(2)).now})`);

const empty = await read(3);
await box(3).focus();
for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowUp');
const rate = await read(3);
expect(rate.now === '0.3' && rate.value === '30', `steps of 0.05 don't drift; percent shows the fraction ×100 (${rate.now}, ${rate.value})`);
await box(3).blur();
await page.waitForTimeout(300);
expect(empty.bg !== (await read(3)).bg, 'filling the field raises its floor');

await page.click('.alt-numfield-step >> nth=1');
await page.waitForTimeout(100);
expect((await read(0)).now === '499', 'the decrease stepper steps');
const before = (await read(1)).now;
await page.hover('.alt-numfield >> nth=1');
await page.mouse.wheel(0, -100);
await page.waitForTimeout(100);
expect((await read(1)).now === before, 'the wheel doesn\'t change the value unless asked');

console.log(`NumberInput: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
