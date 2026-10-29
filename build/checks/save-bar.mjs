// SaveBar: hidden while clean; appears (a labelled region at level 3, docked bottom) only after a change settles, says
// how many fields changed, and is announced once; ⌘/Ctrl+S saves; saving hovers as pending; saved lowers it away and is
// announced; a failed save drops it to a trench that keeps the draft and offers Retry; Discard resets. Run after a
// render of every preview (it opens test/p-SaveBar-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-SaveBar-daylight.html`);
await page.waitForTimeout(400);

const bar = () => page.evaluate(() => { const b = document.querySelector('.alt-savebar'); if (!b) return null; const r = b.getBoundingClientRect(), cs = getComputedStyle(b);
  return { label: b.getAttribute('aria-label'), text: b.querySelector('.alt-savebar-text').textContent, status: b.getAttribute('data-status'), busy: b.getAttribute('aria-busy'), state: b.dataset.state, shadow: cs.boxShadow, pos: cs.position, bottomGap: innerHeight - r.bottom }; });
const said = () => page.evaluate(() => [...document.querySelectorAll('[role="status"]')].map((s) => s.textContent).join('|'));

expect(await bar() === null, 'hidden while the form is clean');
await page.fill('input >> nth=0', 'Acme Corp');
await page.waitForTimeout(200);
expect(await bar() === null, 'not on the first key');
await page.waitForTimeout(700);
let b = await bar();
expect(b?.label === 'Unsaved changes' && b.text === 'Unsaved changes · 1 field' && b.pos === 'fixed' && b.bottomGap > 0 && b.bottomGap < 40, `once the change settles it rises at the bottom edge (${b?.text})`);
expect(b.shadow !== 'none' && (await said()).includes('Unsaved changes.'), 'it floats, and is announced once');
expect(await page.evaluate(() => document.activeElement.tagName) === 'INPUT', 'it doesn\'t take focus');
await page.keyboard.press(process.platform === 'darwin' ? 'Meta+s' : 'Control+s');
await page.waitForTimeout(450);
b = await bar();
expect(b?.status === 'pending' && b.busy === 'true' && b.text === 'Saving…', '⌘/Ctrl+S saves; saving hovers as pending');
await page.waitForTimeout(1000);
expect(await bar() === null && (await said()).includes('Saved.'), 'saved, it lowers away and says so');

await page.click('.alt-switch');
await page.fill('input >> nth=1', 'acme.io');
await page.waitForTimeout(800);
await page.click('.alt-savebar button:has-text("Save changes")');
await page.waitForTimeout(1300);
b = await bar();
expect(b?.status === 'failed' && b.text.includes('Your changes are kept') && await page.inputValue('input >> nth=1') === 'acme.io', `a failed save drops to a trench and keeps the draft (${b?.text})`);
expect(await page.locator('.alt-savebar button:has-text("Retry")').count() === 1, 'and offers Retry');
await page.click('.alt-savebar button:has-text("Discard")');
await page.waitForTimeout(400);
expect(await page.inputValue('input >> nth=1') === 'acme.dev' && await bar() === null, 'Discard resets the draft and the bar goes');

console.log(`SaveBar: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
