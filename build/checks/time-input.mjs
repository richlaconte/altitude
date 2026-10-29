// TimeInput: a group of spinbuttons (hour, minute, AM/PM on a 12-hour clock); digits auto-advance and a bad second
// digit starts the segment again; "p" sets PM and the value is always 24-hour "HH:mm"; arrows step minutes by `step`
// and wrap hours; the value is null and the well open until the time is whole; a time outside min/max is invalid; the
// time zone describes the segments. Run after a render of every preview (it opens test/p-TimeInput-daylight.html);
// exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-TimeInput-daylight.html`);
await page.waitForTimeout(400);

const read = (i) => page.evaluate((i) => {
  const g = document.querySelectorAll('.alt-time')[i], segs = [...g.querySelectorAll('[role="spinbutton"]')];
  return { role: g.getAttribute('role'), filled: g.hasAttribute('data-filled'), invalid: g.hasAttribute('data-invalid'), bg: getComputedStyle(g).backgroundColor,
    labels: segs.map((s) => s.getAttribute('aria-label')), text: segs.map((s) => s.textContent).join(' '), now: segs.map((s) => s.getAttribute('aria-valuenow')),
    zone: (segs[0].getAttribute('aria-describedby') || '').split(' ').map((id) => document.getElementById(id)?.textContent).join('|'),
    hint: g.closest('.alt-field').querySelector('.alt-field-hint')?.textContent, error: g.closest('.alt-field').querySelector('.alt-field-error')?.textContent ?? null };
}, i);
const seg = (i, n) => page.locator('.alt-time').nth(i).locator('[role="spinbutton"]').nth(n);

let r = await read(0);
expect(r.role === 'group' && r.labels.join() === 'Hour,Minute,AM/PM', `a group of spinbuttons, AM/PM on a 12-hour clock (${r.labels})`);
expect(r.text === '09 30 AM' && r.filled, `shows the value on its clock, filled (${r.text})`);
expect(/GMT\+1|CET/.test(r.zone), `the time zone describes the segments (${r.zone})`);
await seg(0, 2).focus();
await page.keyboard.press('p');
r = await read(0);
expect(r.text === '09 30 PM' && r.hint === 'Stored as 21:30', `"p" sets PM; the value is 24-hour (${r.hint})`);
await seg(0, 1).focus();
await page.keyboard.press('ArrowUp');
expect((await read(0)).hint === 'Stored as 21:45', 'Up steps minutes by step (15)');
await page.keyboard.press('ArrowUp');
expect((await read(0)).hint === 'Stored as 21:00', 'minutes wrap past 59');

const empty = await read(1);
expect(!empty.filled && empty.hint === '24-hour clock' && empty.text === '–– ––', 'an empty field is open');
await seg(1, 0).focus();
await page.keyboard.type('2');
r = await read(1);
expect(r.now[0] === '2' && await page.evaluate(() => document.activeElement.getAttribute('aria-label')) === 'Hour', '"2" waits for a second hour digit');
await page.keyboard.type('7');
r = await read(1);
expect(r.now[0] === '7' && await page.evaluate(() => document.activeElement.getAttribute('aria-label')) === 'Minute', `a second digit that can't fit (27) starts the hour again, and 7 moves on (${r.now[0]})`);
expect(!r.filled, 'a partial time ("07:––") is still an opening');
await page.keyboard.type('5');
await page.keyboard.type('9');
await page.waitForTimeout(250);
r = await read(1);
expect(r.filled && r.text === '07 59' && r.bg !== empty.bg, `once whole, its floor rises flush (${r.text})`);
await page.keyboard.press('Backspace');
r = await read(1);
expect(!r.filled && r.text === '07 ––', `Backspace clears the segment and the field opens again, as in DatePicker (${r.text})`);
await seg(1, 0).focus();
await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
expect((await read(1)).now[0] === '23', 'hours wrap below 0');

r = await read(2);
expect(!r.invalid && r.error === null, 'inside its range it\'s valid');
await seg(2, 0).focus();
await page.keyboard.type('13');
await page.waitForTimeout(100);
r = await read(2);
expect(r.invalid && r.error === 'Choose a time between 06:00 and 12:00.', 'outside min and max it\'s invalid');

console.log(`TimeInput: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
