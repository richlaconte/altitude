// Sprint 24 planning (examples/apps/planning-board, #402), built by scripts/build-examples.mjs and driven in a browser on
// its simulated server. Every view renders in both schemes with one h1, at most one primary and no page or console
// errors. Then the fixtures #402 names, and the paths around them:
//   a keyboard carry sends one move when it's dropped, and a cancelled carry sends none; a pointer drag moves a card;
//   In progress refuses a fourth card and the card goes back, saying why; a slow move hovers, then lands; a conflict
//   and an offline move go back and say so; a lost response is reconciled; a card a teammate holds can't be picked up;
//   a teammate's card arrives without moving focus; a card's sheet edits its estimate and returns focus on close; the
//   table's saved views filter the same record; Start sprint is refused while a planned card has no estimate, then
//   starts and shows the first day on the schedule; a meeting can be booked by keyboard and can't overlap another;
//   the epics drill down to a card. Reset starts over, and on a phone the page never scrolls sideways.
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { buildExamples } from '../../scripts/build-examples.mjs';

let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const out = fileURLToPath(new URL('../test/examples/', import.meta.url));
await buildExamples(out, { only: ['planning-board'] });
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const wait = (page, ms) => page.waitForTimeout(ms);

const open = async (page) => {
  await page.goto(`file://${out}planning-board.html`);
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.reload(); await wait(page, 1000);
};
const drawer = async (page) => { const t = page.locator('.ex-drawer .alt-acc-trigger'); if ((await t.getAttribute('aria-expanded')) !== 'true') await t.click(); await wait(page, 200); };
const mode = async (page, label) => { await drawer(page); await page.locator('.ex-drawer label.alt-radio').filter({ has: page.locator('.alt-check-label', { hasText: new RegExp(`^${label}$`) }) }).click(); await wait(page, 60); };
const event = async (page, label) => { await drawer(page); await page.locator('.ex-drawer button', { hasText: label }).click(); await wait(page, 800); };
const tab = async (page, name) => { await page.locator('.ex-app [role="tab"]', { hasText: name }).first().click(); await wait(page, 600); };
const column = (page, col) => page.evaluate((c) => [...document.querySelectorAll(`[data-board-col="${c}"] [data-board-card]`)].map((e) => e.getAttribute('data-board-card')), col);
const card = (page, id) => page.evaluate((i) => { const e = document.querySelector(`[data-board-card="${i}"]`); return e ? { status: e.getAttribute('data-status'), note: e.querySelector('.pb-note')?.textContent ?? '', col: e.closest('[data-board-col]')?.getAttribute('data-board-col') } : null; }, id);
const moves = (page) => page.evaluate(() => [...document.querySelectorAll('.ex-log-row .ex-log-op')].filter((e) => e.textContent === 'cards.move').length);
const primaries = (page) => page.evaluate(() => [...document.querySelectorAll('.ex-app .alt-btn[data-variant="primary"]')].filter((b) => b.getClientRects().length && !b.closest('[role="dialog"]')).length);
const carry = async (page, id, keys) => {
  await page.locator(`[data-board-card="${id}"]`).focus();
  await page.keyboard.press('Space');
  for (const k of keys) { await page.keyboard.press(k); await wait(page, 120); }
};

for (const scheme of ['daylight', 'nightfall']) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: scheme === 'nightfall' ? 'dark' : 'light' });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await open(page);
  for (const t of ['Table', 'Schedule', 'Epics', 'Board']) {
    await tab(page, t);
    const v = await page.evaluate(() => ({ h1: document.querySelectorAll('.ex-app h1').length, panel: !!document.querySelector('.ex-app [role="tabpanel"]:not([hidden])') }));
    expect(v.h1 === 1 && v.panel && await primaries(page) <= 1, `${scheme}: the ${t} view renders with one h1 and at most one primary (${JSON.stringify(v)})`);
  }
  expect((await column(page, 'done')).length === 0 && /6/.test(await page.locator('[data-board-col="done"]').textContent()), `${scheme}: Done starts as a pile with its count`);
  expect(!errors.length, `${scheme}: no page or console errors (${errors.slice(0, 2).join('; ')})`);
  if (scheme === 'nightfall') { await page.close(); continue; }

  // ---- Keyboard: one request per carry, none for a cancelled one ------------------------------------------------
  await drawer(page);
  let before = await moves(page);
  await carry(page, 'c6', ['ArrowRight', 'Escape']); await wait(page, 900);
  expect((await column(page, 'backlog')).includes('c6') && await moves(page) === before, 'a cancelled keyboard carry puts the card back and sends nothing');
  await carry(page, 'c3', ['ArrowRight']); await wait(page, 900);
  expect(await moves(page) === before, 'nothing is sent while a card is still in the hand');
  await page.keyboard.press('Space'); await wait(page, 1200);
  expect((await column(page, 'sprint')).includes('c3') && await moves(page) === before + 1, `a dropped keyboard carry sends one move (${await moves(page) - before})`);

  // ---- In progress holds three -----------------------------------------------------------------------------------
  await carry(page, 'c1', ['ArrowRight', 'Space']); await wait(page, 1300);
  expect((await column(page, 'doing')).length === 3, 'a third card goes into In progress');
  await carry(page, 'c10', ['ArrowRight', 'Space']); await wait(page, 1300);
  const refused = await card(page, 'c10');
  expect(refused?.col === 'sprint' && refused.status === 'failed' && /In progress is full/.test(refused.note) && /back in Sprint 24/.test(refused.note), `a fourth is refused and goes back, saying why (${JSON.stringify(refused)})`);
  expect(/In progress is full/.test(await page.locator('.ex-app [role="status"], .ex-app .alt-sr').allTextContents().then((t) => t.join(' '))), 'the refusal is announced');
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('[data-board-card="c10"]')).boxShadow.includes('inset')), 'the refused card sits in a trench');

  // ---- Slow, conflict, offline, lost ----------------------------------------------------------------------------
  await mode(page, 'Slow');
  await carry(page, 'c9', ['ArrowLeft', 'Space']); await wait(page, 1100);
  expect((await card(page, 'c9'))?.status === 'pending', 'a slow move hovers while it’s on its way');
  await wait(page, 2600);
  expect((await card(page, 'c9'))?.col === 'backlog' && (await card(page, 'c9'))?.status !== 'failed', 'then it lands');
  await mode(page, 'Conflict');
  await carry(page, 'c5', ['ArrowRight', 'Space']); await wait(page, 1300);
  expect(/Someone else moved this card first/.test((await card(page, 'c5'))?.note ?? '') && (await card(page, 'c5'))?.col === 'backlog', 'a conflict adopts the server’s board and says so');
  await mode(page, 'Offline');
  await carry(page, 'c2', ['ArrowRight', 'Space']); await wait(page, 900);
  const off = await card(page, 'c2');
  expect(off?.col === 'backlog' && /can't reach the server/i.test(off.note), `an offline move goes back and says so (${JSON.stringify(off)})`);
  await mode(page, 'Lose the response');
  await carry(page, 'c2', ['ArrowRight', 'Space']); await wait(page, 2900);
  const lost = await card(page, 'c2');
  expect(lost?.col === 'sprint' && lost.status !== 'failed', `a lost response is reconciled: the move was saved (${JSON.stringify(lost)})`);
  await mode(page, 'Succeed');

  // ---- Teammates -----------------------------------------------------------------------------------------------
  await event(page, 'Mara picks up a card');
  await page.locator('[data-board-card="c4"]').focus(); await page.keyboard.press('Space'); await wait(page, 150);
  expect(await page.locator('[data-board-card="c4"]').getAttribute('aria-pressed') !== 'true' && /Mara/.test(await page.locator('[data-board-card="c4"]').textContent()), 'a card a teammate holds wears their name and can’t be picked up');
  await event(page, 'Mara puts it down');
  await page.locator('[data-board-card="c3"]').focus();
  await event(page, 'Theo adds a card to the sprint');
  await page.locator('[data-board-card="c3"]').focus();
  const arrival = await page.evaluate(() => ({ text: document.querySelector('[data-board-col="sprint"]')?.textContent, focus: document.activeElement?.getAttribute('data-board-card') }));
  expect(/Fix the plan picker on Safari/.test(arrival.text ?? '') && arrival.focus === 'c3', `a teammate’s card arrives in the sprint and focus stays put (${arrival.focus})`);

  // ---- The card's sheet ----------------------------------------------------------------------------------------
  const details = page.locator('[aria-label="Open Invoice PDF redesign"]');
  await details.click(); await wait(page, 500);
  expect(/Invoice PDF redesign/.test(await page.locator('[role="dialog"]').textContent()), 'Details opens the card in a sheet');
  const estimate = page.locator('[role="dialog"] .alt-property').filter({ hasText: 'Estimate' }).first();
  await estimate.locator('button').first().click(); await wait(page, 200);
  await page.locator('[role="dialog"] .alt-select-trigger').last().click(); await wait(page, 200);
  await page.locator('[role="listbox"] [role="option"]', { hasText: /^3 points$/ }).click(); await wait(page, 900);
  expect(/3 points/.test(await page.locator('[role="dialog"]').textContent()), 'the estimate saves in place');
  await page.keyboard.press('Escape'); await wait(page, 500);
  expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')) === 'Open Invoice PDF redesign', `closing the sheet returns focus to Details (${await page.evaluate(() => [document.activeElement?.outerHTML.slice(0, 120), document.querySelectorAll('[role="dialog"]').length, [...document.querySelectorAll('[data-board-card]')].map(e=>e.getAttribute('data-board-card')).join()])})`);
  expect(/3 pts/.test(await page.locator('[data-board-card="c3"]').textContent()), 'the board shows the new estimate');

  // ---- Table ---------------------------------------------------------------------------------------------------
  await tab(page, 'Table');
  await page.locator('.ex-app [role="tab"]', { hasText: 'Not estimated' }).click(); await wait(page, 400);
  const loose = await page.evaluate(() => [...document.querySelectorAll('.ex-app table tbody tr')].map((r) => r.querySelector('td, th')?.textContent));
  expect(loose.length === 1 && loose[0] === 'Lazy-load the sidebar', `the Not estimated view lists the one card left (${loose.join(', ')})`);

  // ---- Start sprint --------------------------------------------------------------------------------------------
  await tab(page, 'Board');
  await carry(page, 'c8', ['ArrowRight', 'Space']); await wait(page, 1300);
  expect((await column(page, 'sprint')).includes('c8'), 'an unestimated card goes into the sprint');
  await page.locator('.ex-app .alt-btn[data-variant="primary"]', { hasText: 'Start sprint' }).click(); await wait(page, 900);
  expect(/Lazy-load the sidebar” has no estimate/.test(await page.locator('#pb-start-error').textContent().catch(() => '')), 'Start sprint is refused while a planned card has no estimate, naming it');
  await page.locator('[aria-label="Open Lazy-load the sidebar"]').click(); await wait(page, 500);
  await page.locator('[role="dialog"] .alt-property').filter({ hasText: 'Estimate' }).first().locator('button').first().click(); await wait(page, 200);
  await page.locator('[role="dialog"] .alt-select-trigger').last().click(); await wait(page, 200);
  await page.locator('[role="listbox"] [role="option"]', { hasText: /^2 points$/ }).click(); await wait(page, 900);
  await page.keyboard.press('Escape'); await wait(page, 400);
  await page.locator('.ex-app .alt-btn[data-variant="primary"]', { hasText: 'Start sprint' }).click(); await wait(page, 900);
  const startedView = await page.evaluate(() => ({ tab: document.querySelector('.ex-app [role="tab"][aria-selected="true"]')?.textContent, said: document.querySelector('.pb-outcome')?.textContent, focus: document.activeElement?.classList.contains('pb-outcome'), primary: [...document.querySelectorAll('.ex-app .alt-btn[data-variant="primary"]')].some((b) => /Start sprint/.test(b.textContent)) }));
  expect(startedView.tab === 'Schedule' && /has started/.test(startedView.said ?? '') && startedView.focus && !startedView.primary, `starting shows the first day on the schedule and the outcome takes focus (${JSON.stringify(startedView)})`);

  // ---- Schedule ------------------------------------------------------------------------------------------------
  const grid = page.locator('.ex-app [role="grid"]');
  await grid.locator('[tabindex="0"]').focus();
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter'); await wait(page, 200);
  await page.getByRole('textbox', { name: 'Event title' }).fill('Backlog grooming'); await page.keyboard.press('Enter'); await wait(page, 1000);
  expect(/Backlog grooming/.test(await grid.textContent()), 'a meeting is booked by keyboard');
  await page.locator('[data-event="m2"]').focus(); await page.keyboard.press('Space');
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
  for (let i = 0; i < 16; i++) await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space'); await wait(page, 1000);
  const m2 = await page.evaluate(() => document.querySelector('[data-event="m2"]')?.getAttribute('aria-label') ?? '');
  expect(/Wednesday,? 11 November, 14:00/.test(m2), `a meeting moved onto another is refused and stays put (${m2})`);

  // ---- Epics ---------------------------------------------------------------------------------------------------
  await tab(page, 'Epics');
  await page.locator('.ex-app .alt-drill-row', { hasText: /^Billing/ }).click(); await wait(page, 800);
  const drilled = await page.evaluate(() => document.querySelector('.ex-app .alt-drill')?.textContent ?? '');
  expect(/Annual billing toggle/.test(drilled), `the epics drill down to their cards (${drilled.slice(0, 120)})`);

  // ---- Pointer (last: after a drop, Board swallows the next click on a card's button, #435) ---------------------
  await tab(page, 'Board');
  {
    const from = await page.locator('[data-board-card="c6"]').boundingBox();
    const to = await page.locator('[data-board-col="sprint"]').boundingBox();
    await page.mouse.move(from.x + 40, from.y + 20); await page.mouse.down();
    for (let i = 1; i <= 12; i++) { await page.mouse.move(from.x + 40 + (to.x + 60 - from.x - 40) * i / 12, from.y + 20 + (to.y + to.height - 80 - from.y - 20) * i / 12); await wait(page, 16); }
    await page.mouse.up(); await wait(page, 1300);
    expect((await column(page, 'sprint')).includes('c6'), 'a pointer drag moves a card');
  }

  // ---- Reset ---------------------------------------------------------------------------------------------------
  await drawer(page); await page.locator('.ex-drawer button', { hasText: 'Reset example data' }).click(); await wait(page, 1200);
  await tab(page, 'Board');
  expect((await column(page, 'sprint')).join() === 'c1,c10,c9' && await page.locator('.ex-app .alt-btn[data-variant="primary"]', { hasText: 'Start sprint' }).count() === 1, 'Reset starts over');
  expect(!errors.length, `daylight flow: no page or console errors (${errors.slice(0, 2).join('; ')})`);
  await page.close();
}
{ // phone
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await open(page);
  for (const t of ['Board', 'Table', 'Schedule']) {
    await tab(page, t);
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(w[0] <= w[1], `phone: ${t} doesn’t scroll the page sideways (${w.join(' > ')})`);
  }
  await ctx.close();
}
await browser.close();
console.log(`Planning board example: ${pass} passed, ${fail} failed.`);
process.exit(fail ? 1 : 0);
