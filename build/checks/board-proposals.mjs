// BoardCard's proposals (#444): a proposed change is a raised slip beside the card's face, and the card doesn't rise.
// Accept by keyboard never picks the card up, and Space on the face still does; a carried card's slip is inert;
// applying derives the card's pending, a refused accept derives its trench and offers Retry; stale offers Dismiss only;
// rejecting is said politely; forced colours give the raised slip a 1px border. Drives the Board preview's demo server
// and its Example fixtures, in both schemes. Run after a render of every preview; exits non-zero on a failure.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { fixturePath } from './fixture-path.mjs';
import { openFixtures } from './preview-fixtures.mjs';

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const errors = [];
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); passed++; };

const card = (page, id) => page.locator(`[data-board-card="${id}"]`);
const face = (page, id) => page.locator(`[data-board-card="${id}"] > .alt-board-card-face`);
const slip = (page, id) => page.locator(`[data-board-card="${id}"] .alt-board-proposal`);
const state = (page, id) => card(page, id).evaluate((el) => {
  const s = el.querySelector('.alt-board-proposal');
  const cs = s && getComputedStyle(s);
  return { card: el.dataset.status ?? null, busy: el.getAttribute('aria-busy'), column: el.closest('[data-board-col]')?.dataset.boardCol,
    slip: s?.dataset.status ?? null, shadow: cs?.boxShadow ?? null, border: cs ? `${cs.borderTopWidth} ${cs.borderTopStyle}` : null,
    buttons: s ? [...s.querySelectorAll('button')].map((b) => b.textContent) : [], text: s?.textContent ?? '',
    inert: el.querySelector('.alt-board-proposals')?.hasAttribute('inert') ?? null };
});
const token = (page, prop, value) => page.evaluate(([prop, value]) => {
  const probe = document.createElement('div'); probe.style[prop] = value;
  document.querySelector('.alt-root').appendChild(probe);
  const out = getComputedStyle(probe)[prop]; probe.remove(); return out;
}, [prop, value]);

try {
  for (const scheme of ['daylight', 'nightfall']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
    await page.goto(`file://${fixturePath('Board', scheme)}`);
    page.setDefaultTimeout(5000);
    await page.emulateMedia({ reducedMotion: 'reduce' }); // the slip's rise isn't under test here
    const elev1 = await token(page, 'boxShadow', 'var(--elev-1)');

    // Proposed: the slip is raised, the card isn't pending, and the face says there's a proposal after it.
    let s = await state(page, 'c3');
    check(s.slip === 'proposed' && s.card === null && s.column === 'todo', `${scheme}: a proposed move leaves the card at rest in its column (${JSON.stringify(s)})`);
    check(s.shadow !== 'none' && s.shadow.includes(elev1.slice(0, 12)), `${scheme}: the proposed slip is raised (${s.shadow} / elev-1 ${elev1})`);
    check(/Column\s*Current: To do\s*Proposed: In progress\s*Proposed by Assistant/.test(s.text), `${scheme}: the change reads current then proposed (${s.text})`);
    const described = await face(page, 'c3').evaluate((f) => (f.getAttribute('aria-describedby') || '').split(' ').map((id) => document.getElementById(id)?.textContent).join(' '));
    check(/1 proposed change/.test(described), `${scheme}: the face's description counts the proposals (${described})`);
    check(await page.locator('[data-board-card="c3"] .alt-board-proposals').getAttribute('aria-label') === '1 proposed change by Assistant', `${scheme}: the slips are a named group`);

    // Tab order: face, its tools, then Reject and Accept. Accept by keyboard doesn't pick the card up.
    await face(page, 'c3').focus();
    const order = [];
    for (let i = 0; i < 3; i++) { await page.keyboard.press('Tab'); order.push(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))); }
    check(order[1] === 'Reject: move to In progress for Plan Q1 roadmap' && order[2] === 'Accept: move to In progress for Plan Q1 roadmap', `${scheme}: Reject then Accept follow the card's tools (${order.join(' | ')})`);
    await page.keyboard.press('Space');
    await page.waitForTimeout(450); // past dur-grace, the write still in flight (700ms)
    s = await state(page, 'c3');
    const carrying = await page.locator('.alt-board').evaluate((b) => b.hasAttribute('data-carrying'));
    check(!carrying && s.slip === 'applying' && s.card === 'pending' && s.busy === 'true' && s.buttons.length === 0, `${scheme}: Accept by keyboard applies without picking the card up (${JSON.stringify(s)})`);
    await page.waitForFunction(() => document.querySelector('[data-board-col="doing"] [data-board-card="c3"]'));
    check(await slip(page, 'c3').count() === 0, `${scheme}: once applied the move lands and the slip is gone`);

    // Space on a face still picks the card up, and a carried card's slip is inert.
    await face(page, 'c5').focus();
    await page.keyboard.press('Space');
    check(await face(page, 'c5').getAttribute('aria-pressed') === 'true' && (await state(page, 'c5')).inert === true, `${scheme}: Space on the face picks up; the carried card's slip is inert`);
    await page.keyboard.press('Escape');
    check((await state(page, 'c5')).inert === false, `${scheme}: put down, the slip is live again`);

    // A refused accept: the card drops into its trench, the slip says why and offers Retry and Reject.
    const fixtures = await openFixtures(page);
    await fixtures.getByRole('switch', { name: 'Make the next accepted proposal fail' }).click();
    await page.getByRole('button', { name: 'Accept: assign to Lena for Support macros' }).click();
    await page.waitForFunction(() => document.querySelector('[data-board-card="c5"] .alt-board-proposal')?.dataset.status === 'failed');
    s = await state(page, 'c5');
    check(s.card === 'failed' && /Not applied: the server refused/.test(s.text) && s.buttons.join() === 'Reject,Retry', `${scheme}: a refused accept is the card's trench, with Retry (${JSON.stringify(s)})`);

    // Rejecting takes the slip away and says so politely.
    await page.getByRole('button', { name: 'Reject: assign to Lena for Support macros' }).click();
    await page.waitForFunction(() => !document.querySelector('[data-board-card="c5"] .alt-board-proposal'));
    const said = await page.locator('.alt-board > .alt-sr[aria-live="polite"]').textContent();
    check(said === 'Rejected: assign to Lena for Support macros.', `${scheme}: a rejection is said politely (${said})`);
    check((await state(page, 'c5')).card === null, `${scheme}: rejected, the card is back at rest`);

    // Stale: flush and muted, Dismiss only.
    s = await state(page, 'c6');
    check(s.slip === 'stale' && s.buttons.join() === 'Dismiss' && /Out of date: Ada changed this card/.test(s.text) && s.shadow === 'none', `${scheme}: a stale proposal is flush, with Dismiss only (${JSON.stringify(s)})`);

    // Forced colours: the raised slip keeps a 1px border; a flush one has none.
    await page.goto(`file://${fixturePath('Board', scheme)}`);
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    check((await state(page, 'c3')).border === '1px solid', `${scheme}: forced colours draw the raised slip's border`);
    await page.close();
  }
  check(errors.length === 0, `no page or console errors: ${errors.join('\n')}`);
  console.log(`Board proposals: ${passed} passed, 0 failed`);
} finally { await browser.close(); }
