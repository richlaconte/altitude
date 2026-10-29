// SecretField: a new secret is a sunk well (back wall) holding the full secret in a read-only input, described by the
// warning, with Copy beside it; Done waits for "I've saved this key"; acknowledging fills the floor, masks to prefix and
// tail, never reads bullets ("ending in 4f2a") and moves focus to the note; a stored secret is flush and masked, reveals
// through onReveal with a constant-named toggle, rotates, and revokes only when held. Run after a render of every
// preview (it opens test/p-SecretField-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-SecretField-daylight.html`);
await page.waitForTimeout(400);

const read = (i) => page.evaluate((i) => {
  const root = document.querySelectorAll('.alt-secret')[i], field = root.querySelector('.alt-secret-field'), input = root.querySelector('input.alt-secret-value');
  return { name: document.getElementById(root.getAttribute('aria-labelledby'))?.textContent, open: field.hasAttribute('data-open'),
    wall: getComputedStyle(field).boxShadow.split(/,(?![^(]*\))/)[0], bg: getComputedStyle(field).backgroundColor,
    input: input ? { value: input.value, ro: input.readOnly && input.getAttribute('aria-readonly') === 'true', desc: document.getElementById(input.getAttribute('aria-describedby') || '')?.textContent } : null,
    masked: root.querySelector('[data-masked] [aria-hidden]')?.textContent ?? null, spoken: root.querySelector('[data-masked] .alt-sr')?.textContent ?? null,
    copy: root.querySelector('.alt-copy')?.getAttribute('aria-label') ?? root.querySelector('.alt-copy')?.textContent ?? null, checkbox: !!root.querySelector('input[type="checkbox"]') };
}, i);

let n = await read(0);
expect(n.name === 'Secret key' && n.open && n.checkbox, 'a new secret is an open, named group with a confirmation');
expect(n.input?.value === 'ak_live_EXAMPLE0000demo4f2a' && n.input.ro, 'it shows the full secret, read-only');
expect(n.input?.desc?.startsWith("You won't see this key again"), `described by the warning (${n.input?.desc})`);
expect(/[1-9]px/.test(n.wall) && n.wall.includes('inset'), `a sunk well: its back wall shows although it holds text (${n.wall})`);
expect(await page.locator('.alt-card-footer .alt-btn').first().isDisabled(), 'Done waits for the confirmation');

await page.click("text=I've saved this key");
await page.waitForTimeout(300);
n = await read(0);
expect(!n.open && n.input === null && n.masked === 'ak_live_••••4f2a', `confirmed: it masks, keeping its prefix (${n.masked})`);
expect(n.spoken === 'Secret key, ending in 4f2a', `bullets are never read (${n.spoken})`);
expect(/0px 0px 0px 0px inset$/.test(n.wall.trim()), `its floor rises flush (${n.wall})`);
expect(await page.evaluate(() => document.activeElement.classList.contains('alt-secret-saved')), 'focus moves to the note that replaces the checkbox');
expect(!(await page.locator('.alt-card-footer .alt-btn').first().isDisabled()), 'Done is ready');

let s = await read(1);
expect(s.masked === 'whk_••••9d1c' && s.input === null && !s.open, 'a stored secret is flush and masked');
const toggle = page.locator('[aria-label="Show secret"]');
await toggle.click();
await page.waitForTimeout(600);
s = await read(1);
expect(s.input?.value === 'whk_EXAMPLE0000demo9d1c' && await toggle.getAttribute('aria-pressed') === 'true', 'reveal fetches and shows it; the toggle keeps its name');
expect(s.copy === 'Copy secret', 'a shown secret can be copied');
await toggle.click();
expect((await read(1)).masked === 'whk_••••9d1c', 'and masks again');
await page.click('text=Rotate secret');
expect((await page.locator('.alt-card [role="status"]').last().textContent()).startsWith('A new secret'), 'Rotate runs onRotate');
await page.click('text=Hold to revoke secret');
await page.waitForTimeout(200);
expect(await page.locator('.alt-card [role="status"]').last().textContent() !== 'Secret revoked.', 'a click doesn\'t revoke');
const hold = page.locator('.alt-hold');
await hold.focus();
await page.keyboard.down('Space'); await page.waitForTimeout(1200); await page.keyboard.up('Space');
expect(await page.locator('.alt-card [role="status"]').last().textContent() === 'Secret revoked.', 'holding revokes');

console.log(`SecretField: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
