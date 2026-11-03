// BoardCard's status (#438): a move the server can refuse. Pending hovers (aria-busy), committed lands, failed drops into
// a trench and stays there, with focus still visible and no hover lift; forced colours dot and dash it; reduced motion
// keeps the shadow and drops the travel. Drives the Board preview's demo server and its Example fixtures switch, in both
// schemes. ALT_FIXTURE_ROOT selects React 19 fixtures. Run after a render of every preview; exits non-zero on a failure.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { fixturePath } from './fixture-path.mjs';
import { openFixtures } from './preview-fixtures.mjs';

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const errors = [];
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); passed++; };

// Drag a card by mouse into another column, as a person would.
const drag = async (page, id, column) => {
  const from = await page.locator(`[data-board-card="${id}"]`).boundingBox();
  const to = await page.locator(`[data-board-col="${column}"]`).boundingBox();
  const x0 = from.x + 40, y0 = from.y + 20, x1 = to.x + to.width / 2, y1 = to.y + 60;
  await page.mouse.move(x0, y0); await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(x0 + (x1 - x0) * i / 12, y0 + (y1 - y0) * i / 12);
  await page.mouse.up();
};
const card = (page, id) => page.locator(`[data-board-card="${id}"]`);
const style = (page, id) => card(page, id).evaluate((el) => {
  const s = getComputedStyle(el);
  return { status: el.dataset.status ?? null, busy: el.getAttribute('aria-busy'), land: el.dataset.land ?? null, shadow: s.boxShadow, background: s.backgroundColor,
    animation: s.animationName, border: s.borderTopStyle, outline: `${s.outlineWidth} ${s.outlineStyle}`, column: el.closest('[data-board-col]')?.dataset.boardCol };
});
// What a token computes to on this page, through a probe inside the provider.
const token = (page, prop, value) => page.evaluate(([prop, value]) => {
  const probe = document.createElement('div'); probe.style[prop] = value;
  document.querySelector('.alt-root').appendChild(probe);
  const out = getComputedStyle(probe)[prop]; probe.remove(); return out;
}, [prop, value]);

try {
  for (const scheme of ['daylight', 'nightfall']) {
    const page = await browser.newPage({ viewport: { width: 960, height: 760 } });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
    await page.goto(`file://${fixturePath('Board', scheme)}`);
    page.setDefaultTimeout(5000);
    const trench = await token(page, 'boxShadow', 'var(--trench)');
    const soft = await token(page, 'backgroundColor', 'var(--critical-soft)');
    const elev2 = await token(page, 'boxShadow', 'var(--elev-2)');

    // Committed: a move into another column hovers while it's in flight, then lands.
    await drag(page, 'c1', 'review');
    await page.waitForFunction(() => document.querySelector('[data-board-col="review"] [data-board-card="c1"]'));
    await page.waitForTimeout(450); // past dur-grace (300ms), still in flight (700ms)
    let s = await style(page, 'c1');
    check(s.status === 'pending' && s.busy === 'true' && s.animation === 'alt-hover', `${scheme}: a move in flight hovers and is busy (${JSON.stringify(s)})`);
    await page.waitForFunction(() => document.querySelector('[data-board-card="c1"]')?.dataset.status === 'committed');
    s = await style(page, 'c1');
    check(s.busy === null && s.land !== null && s.column === 'review', `${scheme}: committed, it lands in the new column (${JSON.stringify(s)})`);

    // Failed: the next move is refused; the card goes home and drops into a trench, and says why.
    const fixtures = await openFixtures(page);
    await fixtures.getByRole('switch', { name: 'Make the next move fail' }).click();
    await drag(page, 'c2', 'review');
    await page.waitForFunction(() => document.querySelector('[data-board-card="c2"]')?.dataset.status === 'failed');
    await page.waitForTimeout(400); // past the drop
    s = await style(page, 'c2');
    check(s.column === 'todo', `${scheme}: a refused move goes back where it came from (${s.column})`);
    check(s.shadow === trench && s.background === soft, `${scheme}: a refused card is in a trench (${s.shadow} / ${s.background})`);
    check(/Couldn’t move it/.test(await card(page, 'c2').textContent()) && /Couldn’t move it/.test(await page.locator('.cap[role="status"]').textContent()),
      `${scheme}: the reason is on the card and announced`);
    await card(page, 'c2').hover();
    check((await style(page, 'c2')).shadow === trench, `${scheme}: hovering a refused card doesn't lift it`);
    await page.keyboard.press('Shift');
    await card(page, 'c2').evaluate((el) => el.focus());
    const focus = await card(page, 'c2').evaluate((el) => el.matches(':focus-visible'));
    check(!focus || (await style(page, 'c2')).outline === '2px solid', `${scheme}: focus stays visible on a refused card`);

    // Forced colours: dashed when refused.
    await page.emulateMedia({ forcedColors: 'active' });
    check((await style(page, 'c2')).border === 'dashed', `${scheme}: forced colours dash a refused card`);
    await page.emulateMedia({ forcedColors: 'none' });

    // Reduced motion: pending is a shadow, without the hover's travel.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await drag(page, 'c3', 'review');
    await page.waitForFunction(() => document.querySelector('[data-board-col="review"] [data-board-card="c3"]'));
    await page.waitForTimeout(550); // past dur-grace and the shadow's transition, still in flight
    s = await style(page, 'c3');
    check(s.status === 'pending' && s.animation === 'none' && s.shadow === elev2, `${scheme}: under reduced motion a pending card rises by shadow only (${JSON.stringify(s)})`);
    await page.close();
  }
  check(errors.length === 0, `no page or console errors: ${errors.join('\n')}`);
  console.log(`Board status: ${passed} passed, 0 failed`);
} finally { await browser.close(); }
