// SplitButton: a role="group" named by the action, two faces whose inner corners are square and whose walls line up,
// a notch between them, each face lifting alone on hover, the chevron a menu button named for what it offers that
// opens with Enter or with Alt+Down on the action, and a loading action that leaves the chevron usable. Run after a
// render of every preview (it opens test/p-SplitButton-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-SplitButton-daylight.html`);
await page.waitForTimeout(400);

const read = (i) => page.evaluate((i) => {
  const g = document.querySelectorAll('.alt-split')[i], a = g.querySelector('.alt-split-action'), m = g.querySelector('.alt-split-menu');
  const ca = getComputedStyle(a), cm = getComputedStyle(m), ra = a.getBoundingClientRect(), rm = m.getBoundingClientRect();
  return { role: g.getAttribute('role'), name: g.getAttribute('aria-label'), menuName: m.getAttribute('aria-label'), popup: m.getAttribute('aria-haspopup'), expanded: m.getAttribute('aria-expanded'),
    aRight: ca.borderTopRightRadius, mLeft: cm.borderTopLeftRadius, gap: rm.left - ra.right, aTop: ra.top, mTop: rm.top, aShadow: ca.boxShadow, mShadow: cm.boxShadow,
    notch: getComputedStyle(m, '::before').width, busy: a.getAttribute('aria-busy'), mDisabled: m.disabled };
}, i);

const save = await read(0);
expect(save.role === 'group' && save.name === 'Save changes', `a group named by the action (${save.name})`);
expect(save.menuName === 'More save options' && save.popup === 'menu' && save.expanded === 'false', `the chevron is a menu button named for what it offers (${save.menuName})`);
expect(save.aRight === '0px' && save.mLeft === '0px' && Math.abs(save.gap) < 0.5, `one slab: square inner corners, no gap (${save.aRight}, ${save.mLeft}, ${save.gap})`);
expect(Math.abs(save.aTop - save.mTop) < 0.5 && save.aShadow === save.mShadow, 'the faces share one wall at rest');
expect(save.notch === '1px', 'a 1px notch parts them');

await page.hover('.alt-split-menu >> nth=0');
await page.waitForTimeout(300);
const hovered = await read(0);
expect(hovered.mTop < hovered.aTop - 0.5 && hovered.mShadow !== hovered.aShadow, `pointing at the chevron lifts only the chevron (${hovered.aTop} vs ${hovered.mTop})`);
await page.hover('.alt-split-action >> nth=0');
await page.waitForTimeout(300);
const hoveredA = await read(0);
expect(hoveredA.aTop < hoveredA.mTop - 0.5, 'pointing at the action lifts only the action');

await page.mouse.move(0, 0);
await page.focus('.alt-split-action >> nth=0');
await page.keyboard.press('Alt+ArrowDown');
await page.waitForTimeout(300);
expect((await read(0)).expanded === 'true' && await page.locator('.alt-menu').count() === 1, 'Alt+Down on the action opens the menu');
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
expect(await page.locator('[role="status"]').textContent() === 'Saved as a draft.', 'choosing an alternative runs it');
expect(await page.evaluate(() => document.activeElement.getAttribute('aria-label')) === 'More save options', 'focus returns to the chevron');
await page.focus('.alt-split-action >> nth=0');
await page.keyboard.press('Tab');
expect(await page.evaluate(() => document.activeElement.getAttribute('aria-label')) === 'More save options', 'two tab stops: action, then chevron');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
expect((await read(0)).expanded === 'true', 'Enter on the chevron opens the menu');
await page.keyboard.press('Escape');

await page.click('.alt-split-action >> nth=2');
await page.waitForTimeout(150);
const loading = await read(2);
expect(loading.busy === 'true' && !loading.mDisabled, 'a loading action is busy while its chevron stays usable');
await page.click('.alt-split-menu >> nth=2');
await page.waitForTimeout(300);
expect(await page.locator('.alt-menu').count() === 1, 'the chevron opens while the action loads');

console.log(`SplitButton: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
