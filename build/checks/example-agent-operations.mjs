// The assistant on the planning board (examples/apps/planning-board, #408), built by scripts/build-examples.mjs and
// driven in a browser on its simulated server. The assistant is a deterministic script, so every state is reachable:
//   off by default, then the scripted run streams (reasoning, a tool call, the answer) and its proposals appear on the
//   cards as proposed, with nothing sent; the count is announced; while proposals wait, Apply changes is the one primary;
//   proposals are accepted and rejected by keyboard on the card and in the panel; an accepted move and edit land, with
//   an AILabel on the card and an activity entry naming the approver; the question's answer adds a proposal; editing a
//   proposal changes what's applied; Apply changes applies the rest; a card someone else moved first makes its proposal
//   out of date (on the board and when sent); rate limited, refused and a full context each say so and change nothing;
//   a proposed value shows in the card's sheet and can be accepted there; at phone width the panel is a sheet.
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
const event = async (page, label) => { await drawer(page); await page.locator('.ex-drawer button', { hasText: label }).click(); await wait(page, 900); };
const column = (page, col) => page.evaluate((c) => [...document.querySelectorAll(`[data-board-col="${c}"] [data-board-card]`)].map((e) => e.getAttribute('data-board-card')), col);
// Each of a card's proposal slips (BoardCard proposals, #444) as its words plus its buttons' names, which carry the change
// in words ("Accept: move to Backlog for …"), since the slip itself shows it as current → proposed.
const onCard = (page, id) => page.evaluate((i) => [...document.querySelectorAll(`[data-board-card="${i}"] .alt-board-proposal`)]
  .map((e) => `${e.textContent.trim()} ${[...e.querySelectorAll('button')].map((b) => b.getAttribute('aria-label')).join(' ')}`), id);
const panel = (page) => page.locator('.pb-assistant');
const status = (page) => page.locator('.ex-app [role="status"]').allTextContents().then((t) => t.join(' '));
// Primaries that can act now: a Question's Answer before a choice and an empty composer's Send are disabled.
const primaries = (page) => page.evaluate(() => [...document.querySelectorAll('.ex-app .alt-btn[data-variant="primary"], .ex-app .alt-split[data-variant="primary"]')].filter((b) => b.getClientRects().length && !b.closest('[role="dialog"]') && !b.disabled && b.getAttribute('aria-disabled') !== 'true').map((b) => b.textContent.trim()));
const log = (page, op) => page.evaluate((o) => [...document.querySelectorAll('.ex-log-row .ex-log-op')].filter((e) => e.textContent === o).length, op);
const run = async (page, text = 'Rebalance Sprint 24') => {
  await panel(page).locator('button', { hasText: text }).first().click();
  await page.locator('.pb-assistant .alt-question').waitFor({ timeout: 10000 }); await wait(page, 600);
};
const press = async (page, locator) => { await locator.focus(); await page.keyboard.press('Enter'); await wait(page, 1100); };

// ---- Off by default, then the scripted run ------------------------------------------------------------------------
for (const scheme of ['daylight', 'nightfall']) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: scheme === 'nightfall' ? 'dark' : 'light' });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await open(page);
  expect(await panel(page).count() === 0 && await page.locator('.alt-board-proposal').count() === 0, `${scheme}: the assistant is off by default`);
  await page.locator('button', { hasText: /^Assistant$/ }).click(); await wait(page, 300);
  expect(await page.locator('button', { hasText: /^Assistant$/ }).getAttribute('aria-pressed') === 'true' && await panel(page).count() === 1, `${scheme}: the Assistant toggle opens the panel beside the board`);
  await panel(page).locator('button', { hasText: 'Rebalance Sprint 24' }).click(); await wait(page, 900);
  const streaming = await page.evaluate(() => ({ msg: document.querySelector('.pb-assistant .alt-msg[data-from="assistant"], .pb-assistant [data-status="streaming"]') !== null, stop: !!document.querySelector('.pb-assistant button[aria-label="Stop"], .pb-assistant .alt-prompt [aria-label*="Stop"]') }));
  expect(streaming.msg, `${scheme}: the answer streams (${JSON.stringify(streaming)})`);
  await page.locator('.pb-assistant .alt-question').waitFor({ timeout: 10000 }); await wait(page, 600);
  expect(/read_board/.test(await panel(page).textContent()), `${scheme}: the trace shows the tool call`);
  expect((await onCard(page, 'c10')).some((t) => /Proposed by Assistant.*Accept: move to Backlog/.test(t)) && (await onCard(page, 'c8')).some((t) => /Proposed: 3 points.*Accept: estimate 3 points/.test(t)), `${scheme}: proposals show on the cards in words`);
  expect((await column(page, 'sprint')).includes('c10') && await log(page, 'cards.move') === 0, `${scheme}: a proposed move hasn't moved the card or sent anything`);
  expect((await primaries(page)).join() === 'Apply changes', `${scheme}: while proposals wait, Apply changes is the one primary (${(await primaries(page)).join()})`);
  expect(await page.locator('.pb-assistant .alt-ailabel, .pb-assistant [class*="ailabel"]').count() >= 1, `${scheme}: the plan carries an AILabel`);
  expect(!errors.length, `${scheme}: no page or console errors (${errors.slice(0, 2).join('; ')})`);
  if (scheme === 'nightfall') { await page.close(); continue; }

  expect(/4 changes proposed/.test(await status(page)), `the proposals are announced as a count (${await status(page)})`);

  // Accept on the card, by keyboard: the move lands and keeps its provenance.
  await press(page, page.locator('[data-board-card="c10"] button', { hasText: 'Accept' }));
  expect((await column(page, 'backlog')).includes('c10') && (await onCard(page, 'c10')).length === 0, 'Accept on the card moves it, and the proposal is gone');
  expect(await page.locator('[data-board-card="c10"] .pb-card-ai').count() === 1, 'the moved card wears an AILabel');
  expect(/Move “Billing emails in Spanish” from Sprint 24 to Backlog\. By the assistant, approved by you/.test(await page.locator('.pb-activity').textContent()), 'the activity names the assistant and the approver');

  // Reject in the panel, by keyboard.
  await press(page, panel(page).locator('button[aria-label^="Reject: Assign"]'));
  expect((await onCard(page, 'c6')).every((t) => !/assign/.test(t)) && /Rejected: Assign/.test(await panel(page).textContent()), 'Reject in the panel takes it off the card and records it as rejected');

  // Answer the question: another proposal.
  await panel(page).locator('.alt-question label', { hasText: 'Move it to the backlog' }).click();
  await panel(page).locator('.alt-question button', { hasText: 'Answer' }).click(); await wait(page, 2600);
  expect((await onCard(page, 'c9')).some((t) => /Accept: move to Backlog/.test(t)), 'the answer adds a proposal');

  // Edit a proposal before applying.
  await panel(page).locator('.alt-confirm button', { hasText: /^Edit/ }).first().click(); await wait(page, 300);
  await panel(page).locator('.pb-edit .alt-select-trigger, .pb-edit button').first().click(); await wait(page, 300);
  await page.locator('[role="option"]', { hasText: /^5 points$/ }).click(); await wait(page, 300);
  const done = panel(page).locator('.alt-confirm button', { hasText: /^(Done|Save|Done editing)$/ });
  if (await done.count()) { await done.first().click(); await wait(page, 300); }
  expect((await onCard(page, 'c8')).some((t) => /estimate 5 points \(edited\)/.test(t)), 'editing the proposal changes it on the card');

  // Apply changes applies the rest.
  const before = await log(page, 'cards.move') + await log(page, 'cards.update');
  await panel(page).locator('.alt-confirm button', { hasText: /^Apply changes$/ }).click(); await wait(page, 3000);
  expect((await column(page, 'sprint')).includes('c6') && (await column(page, 'backlog')).includes('c9'), 'Apply changes moves the remaining cards');
  expect(/5 pts/.test(await page.locator('[data-board-card="c8"] .pb-meta').textContent()), 'and applies the edited estimate');
  expect(await log(page, 'cards.move') + await log(page, 'cards.update') - before === 3, 'one request per remaining proposal');
  expect(/Applied/.test(await panel(page).locator('.alt-confirm', { hasText: 'to the board' }).textContent()) && (await primaries(page)).join() === 'Start sprint', `the confirmation is kept as applied and Start sprint is primary again (${(await primaries(page)).join()} | ${(await panel(page).locator('.alt-confirm', { hasText: 'to the board' }).textContent()).slice(0, 120)})`);
  expect(!errors.length, `daylight flow: no page or console errors (${errors.slice(0, 2).join('; ')})`);
  await page.close();
}

// ---- Out of date, refused, rate limited, full context, the sheet --------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await open(page);
  await page.locator('button', { hasText: /^Assistant$/ }).click(); await wait(page, 300);
  await run(page);
  await event(page, 'Lena moves a card the assistant proposed to move');
  expect((await onCard(page, 'c10')).some((t) => /Out of date/.test(t)) && await page.locator('[data-board-card="c10"] button', { hasText: 'Accept' }).count() === 0, 'a card moved by someone else makes its proposal out of date, with nothing to accept');
  expect((await column(page, 'doing')).includes('c10'), 'and Lena’s move stands');

  // A proposed value in the card's sheet, accepted there.
  await page.locator('[data-board-card="c8"] button', { hasText: 'Details' }).click(); await wait(page, 700);
  const sheet = page.locator('[role="dialog"]');
  expect(/3 points/.test(await sheet.textContent()) && await sheet.locator('button', { hasText: /^Accept/ }).count() >= 1, 'the sheet shows the proposed estimate with Accept');
  await sheet.locator('button', { hasText: /^Accept/ }).first().click(); await wait(page, 1200);
  await page.keyboard.press('Escape'); await wait(page, 500);
  expect(/3 pts/.test(await page.locator('[data-board-card="c8"] .pb-meta').textContent()) && /Estimate “Lazy-load the sidebar” at 3 points/.test(await page.locator('.pb-activity').textContent()), 'accepting in the sheet saves it and records it');

  // Conflict when sent: the card changed on the server after the proposal, and the board hasn't heard yet.
  await mode(page, 'Conflict');
  await press(page, page.locator('[data-board-card="c6"] button', { hasText: 'Accept' }).first());
  expect((await onCard(page, 'c6')).some((t) => /Out of date/.test(t)), 'a proposal refused as a conflict says it’s out of date');
  await mode(page, 'Succeed');

  // Refused.
  await event(page, 'The assistant’s model refuses the next request');
  await panel(page).locator('textarea').fill('Delete the backlog'); await page.keyboard.press('Enter'); await wait(page, 1500);
  expect(/I can’t help with that request/.test(await panel(page).textContent()) && /Nothing on the board changed/.test(await panel(page).textContent()), 'a refusal says so and changes nothing');

  // Rate limited.
  await mode(page, 'Rate limited');
  const moves = await log(page, 'cards.move');
  await panel(page).locator('textarea').fill('Try again'); await page.keyboard.press('Enter'); await wait(page, 1200);
  expect(/rate limited/i.test(await panel(page).textContent()) && await log(page, 'cards.move') === moves, 'rate limited says so and changes nothing');
  await mode(page, 'Succeed');

  // A full context.
  await event(page, 'The conversation fills the model’s context');
  await panel(page).locator('textarea').fill('And again'); await page.keyboard.press('Enter'); await wait(page, 1200);
  expect(/The conversation is full/.test(await panel(page).textContent()) && await panel(page).locator('button', { hasText: 'Start a new conversation' }).count() === 1, 'a full context says so and offers a new conversation');
  await panel(page).locator('button', { hasText: 'Start a new conversation' }).click();
  await page.locator('.pb-assistant .alt-question').waitFor({ timeout: 10000 }).catch(() => {}); await wait(page, 800);
  expect(!/The conversation is full/.test(await panel(page).textContent()) && /points/.test(await panel(page).textContent()), 'a new conversation runs again');
  expect(!errors.length, `fixtures: no page or console errors (${errors.slice(0, 2).join('; ')})`);
  await page.close();
}
{ // phone: the panel is a sheet, and the page never scrolls sideways
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await open(page);
  await page.locator('button', { hasText: /^Assistant$/ }).click(); await wait(page, 700);
  expect(await page.locator('[role="dialog"] .pb-assistant').count() === 1, 'phone: the assistant opens as a sheet');
  await run(page);
  const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(w[0] <= w[1], `phone: no sideways scroll (${w.join(' > ')})`);
  await page.keyboard.press('Escape'); await wait(page, 600);
  expect((await onCard(page, 'c10')).some((t) => /Proposed/.test(t)), 'phone: closing the sheet leaves the proposals on the cards');
  await ctx.close();
}
await browser.close();
console.log(`Agent operations example: ${pass} passed, ${fail} failed.`);
process.exit(fail ? 1 : 0);
