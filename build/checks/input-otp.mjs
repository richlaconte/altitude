// InputOTP: one input (inputmode numeric, autocomplete one-time-code, named by its Field and described with its
// length) driving aria-hidden slots; typing fills slots whose floors rise flush, the held slot carries the caret; a
// formatted paste is filtered and fills left to right; onComplete fires once and the row verifies; a wrong code drops
// every slot to a trench and keeps the code; Backspace empties a slot; alphanumeric drops other characters. Run after a
// render of every preview (it opens test/p-InputOTP-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-InputOTP-daylight.html`);
await page.waitForTimeout(400);

const otp = page.locator('.alt-otp-input').first();
const read = (i = 0) => page.evaluate((i) => {
  const root = document.querySelectorAll('.alt-otp')[i], input = root.querySelector('input');
  const slots = [...root.querySelectorAll('.alt-otp-slot')];
  return { value: input.value, mode: input.inputMode, auto: input.autocomplete, label: document.querySelector(`label[for="${input.id}"]`)?.textContent,
    desc: (input.getAttribute('aria-describedby') || '').split(' ').map((id) => document.getElementById(id)?.textContent).join(' | '),
    inputs: root.querySelectorAll('input').length, hidden: root.querySelector('.alt-otp-group').getAttribute('aria-hidden'), busy: root.getAttribute('aria-busy'),
    chars: slots.map((s) => s.textContent).join(''), filled: slots.map((s) => s.hasAttribute('data-filled')), active: slots.findIndex((s) => s.hasAttribute('data-active')),
    caret: slots.findIndex((s) => s.querySelector('.alt-otp-caret')), bgs: slots.map((s) => getComputedStyle(s).backgroundColor), invalid: slots.map((s) => s.hasAttribute('data-invalid')),
    wall: slots.map((s) => getComputedStyle(s).boxShadow.split(/,(?![^(]*\))/)[0]) };
}, i);

let r = await read();
expect(r.inputs === 1 && r.hidden === 'true', 'one input; the slots are hidden from assistive technology');
expect(r.mode === 'numeric' && r.auto === 'one-time-code', 'inputmode numeric, autocomplete one-time-code');
expect(r.label === 'Verification code' && r.desc.includes('6 digits'), `named by its Field and described with its length (${r.desc})`);
const emptyBg = r.bgs[1], emptyWall = r.wall[1];

await otp.focus();
await page.keyboard.type('12');
await page.waitForTimeout(300);
r = await read();
expect(r.chars === '12' && r.filled.slice(0, 3).join() === 'true,true,false', `typing fills slots in order (${r.chars})`);
expect(r.active === 2 && r.caret === 2, `the next slot is held and carries the caret (${r.active})`);
expect(r.bgs[0] !== emptyBg && r.wall[0] !== emptyWall && r.wall[5] === emptyWall, 'a filled slot\'s floor rises flush; empty ones keep their wall');
await page.keyboard.press('Backspace');
await page.waitForTimeout(100);
expect((await read()).chars === '1', 'Backspace empties the last slot');

// A formatted paste: filtered and filled left to right.
await otp.fill('');
await otp.evaluate((el) => { el.focus(); const dt = new DataTransfer(); dt.setData('text/plain', '99-88'); el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); });
await page.keyboard.insertText('99-88');
await page.waitForTimeout(50);
const burst = await page.evaluate(() => document.querySelector('.alt-otp').hasAttribute('data-burst'));
r = await read();
expect(r.chars === '9988', `a pasted "99-88" is filtered to its digits (${r.chars})`);
expect(burst, 'several characters at once fill staggered');

// A wrong code: verifying, then a trench on every slot, the code kept.
await page.keyboard.type('11');
await page.waitForTimeout(100);
r = await read();
expect(r.busy === 'true' && (await page.locator('.alt-field-hint').first().textContent()) === 'Checking code…', 'the last character starts verifying (aria-busy)');
await page.waitForTimeout(1100);
r = await read();
expect(r.invalid.every(Boolean) && r.chars === '998811', `a wrong code drops every slot to a trench and keeps the code (${r.chars})`);
expect(await page.locator('.alt-field-error').count() === 1, 'the Field says what went wrong');
await otp.fill('123456');
await page.waitForTimeout(1100);
expect((await page.locator('.alt-field-hint').first().textContent()) === 'Verified.', 'the right code verifies');

const backup = page.locator('.alt-otp-input').nth(1);
await backup.focus();
await page.keyboard.type('x!9');
r = await read(1);
expect(r.chars === 'K7Q2x9' && r.mode === 'text', `alphanumeric drops other characters (${r.chars})`);

console.log(`InputOTP: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
