// PasswordInput: a password input with the right autocomplete, a reveal Toggle (constant name, aria-pressed, focus stays,
// type flips) as a separate tab stop; strength as a role="meter" whose value text is the word, never a progressbar;
// requirements stamped met/not met in their accessible text and tied to the field; Caps Lock said while it's on; a
// polite announcement only after typing pauses. Run after a render of every preview (it opens
// test/p-PasswordInput-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-PasswordInput-daylight.html`);
await page.waitForTimeout(400);

const read = (i) => page.evaluate((i) => {
  const root = document.querySelectorAll('.alt-pw')[i], input = root.querySelector('input'), toggle = root.querySelector('.alt-pw-reveal');
  const ids = (input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
  return { type: input.type, auto: input.autocomplete, toggle: toggle.getAttribute('aria-label'), pressed: toggle.getAttribute('aria-pressed'),
    meter: root.querySelector('[role="meter"]')?.getAttribute('aria-valuetext') ?? null, progress: root.querySelectorAll('[role="progressbar"]').length,
    reqs: [...root.querySelectorAll('.alt-pw-reqs li')].map((li) => li.textContent), described: ids.map((id) => document.getElementById(id)?.className),
    caps: !root.querySelector('.alt-pw-caps').hidden, live: root.querySelector('[aria-live="polite"]').textContent };
}, i);

let a = await read(0), b = await read(1);
expect(a.type === 'password' && a.auto === 'current-password', `signing in: a password input, current-password (${a.auto})`);
expect(b.auto === 'new-password', `creating: new-password (${b.auto})`);
expect(a.meter === null && b.meter === 'Good' && b.progress === 0, `strength is a meter whose value text is the word, never a progress bar (${b.meter})`);
expect(b.reqs.join('|') === 'At least 12 characters, not met|Not a common password, met', `requirements say met or not met (${b.reqs.join(' | ')})`);
expect(b.described.some((c) => c?.includes('alt-pw-strength')) && b.described.some((c) => c?.includes('alt-pw-reqs')), 'strength and requirements describe the field');

await page.click('.alt-pw-reveal >> nth=0');
a = await read(0);
expect(a.type === 'text' && a.pressed === 'true' && a.toggle === 'Show password', `reveal shows the text; the toggle's name stays (${a.toggle}, ${a.pressed})`);
expect(await page.evaluate(() => document.activeElement.classList.contains('alt-pw-reveal')), 'focus stays on the toggle');
await page.click('.alt-pw-reveal >> nth=0');
expect((await read(0)).type === 'password', 'and hides it again');
await page.focus('.alt-pw input >> nth=0');
await page.keyboard.press('Tab');
expect(await page.evaluate(() => document.activeElement.getAttribute('aria-label')) === 'Show password', 'the toggle is the next tab stop');

const field = page.locator('.alt-pw input').nth(1);
await field.fill('');
await field.focus();
await page.keyboard.type('Glacier7-Summit!');
b = await read(1);
expect(b.meter === 'Strong' && b.reqs[0].endsWith(', met'), `typing updates the reading and the stamps (${b.meter})`);
expect(b.live === '', 'nothing is announced while typing');
await page.waitForTimeout(1100);
expect((await read(1)).live === 'Strength: Strong. All requirements met.', `once typing pauses, it's announced (${(await read(1)).live})`);

// Headless keyboards don't carry the Caps Lock state, so the key events say it themselves.
const key = (caps) => field.evaluate((el, caps) => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true, modifierCapsLock: caps })), caps);
await key(true);
const capsOn = (await read(1)).caps;
await key(false);
expect(capsOn && !(await read(1)).caps, 'Caps Lock is said while it\'s on, and only then');

console.log(`PasswordInput: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
