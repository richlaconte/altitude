// Input and Textarea suggestions: the ghost is drawn but isn't the value (the empty well stays an opening, its
// placeholder hidden); the field is described by the suggestion; Tab accepts (value set, onChange heard, floor rises,
// afterglow, announced); typing past a prefix keeps the rest; Escape dismisses and then Tab moves focus; an appended
// suggestion follows the text. Run after a render of every preview (it opens test/p-InputSuggestion-daylight.html);
// exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-InputSuggestion-daylight.html`);
await page.waitForTimeout(400);

const field = (n) => page.evaluate((n) => {
  const w = document.querySelectorAll('.alt-input')[n], f = w.querySelector('input, textarea'), g = w.querySelector('.alt-input-ghost');
  return { value: f.value, ghost: g ? g.textContent.slice(w.querySelector('.alt-input-ghost-typed').textContent.length) : null, desc: f.getAttribute('aria-description'),
    placeholderShown: f.matches(':placeholder-shown'), bg: getComputedStyle(w).backgroundColor, settle: w.getAttribute('data-settle'), said: w.querySelector('.alt-sr')?.textContent, focused: document.activeElement === f };
}, n);
let r = await field(0);
expect(r.value === '' && r.ghost === 'Your refund for the annual plan', 'an empty field shows the whole suggestion as a ghost');
expect(r.placeholderShown && !(await page.locator('input >> nth=0').getAttribute('placeholder')).trim(), 'the ghost isn\'t the value: the field is still empty, its placeholder hidden');
expect(r.desc === 'Suggestion: Your refund for the annual plan. Press Tab to accept.', 'the field is described by the suggestion');
const emptyBg = r.bg;
await page.focus('input >> nth=0');
await page.keyboard.press('Tab');
await page.waitForTimeout(400);
r = await field(0);
expect(r.value === 'Your refund for the annual plan' && r.ghost === null && r.focused, 'Tab accepts and keeps focus');
expect(r.bg !== emptyBg && (r.settle === 'a' || r.settle === 'b') && r.said === 'Suggestion accepted.', 'the floor rises, one afterglow, announced');
r = await field(1);
expect(r.value === 'Bil' && r.ghost === 'ling', 'while what\'s typed matches its start, the rest is the ghost');
await page.focus('input >> nth=1');
await page.keyboard.press('End');
await page.keyboard.type('l');
expect((await field(1)).ghost === 'ing', 'typing carries on past it');
await page.keyboard.press('Escape');
r = await field(1);
expect(r.ghost === null && r.desc === null && r.said === 'Suggestion dismissed.', 'Escape dismisses');
await page.keyboard.press('Tab');
expect(await page.evaluate(() => document.activeElement.tagName) === 'TEXTAREA' && (await field(1)).value === 'Bill', 'with no ghost, Tab moves focus');
r = await field(2);
expect(r.ghost?.startsWith(' Your full refund of €240') && r.value.endsWith('refund.'), 'an appended suggestion follows the text');
await page.keyboard.press('End');
await page.keyboard.press('Tab');
await page.waitForTimeout(100);
r = await field(2);
expect(r.value.endsWith('within 5 working days.') && r.ghost === null, 'Tab appends it');

console.log(`InputSuggestion: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
