// The support inbox (examples/apps/support-inbox, #404), built by scripts/build-examples.mjs and driven in a browser on
// its simulated server. Renders in both schemes and at phone width with one h1, at most one primary outside a primary
// scope, no sideways scroll and no page or console errors. Then, by keyboard where it matters:
//   triage: Tab into the list, ↓ moves without opening, Enter opens and marks it read;
//   a new ticket arriving while a row is focused leaves focus and that row's position unchanged, and is said;
//   a teammate opening the ticket and replying shows on it; their reply arriving above your draft keeps the draft and
//   doesn't move the caret;
//   a failed send drops into a trench with Retry and the text kept, and Retry sends it;
//   offline, the reply says it's waiting and sends once on reconnect, even when that response is lost;
//   a teammate reassigning the ticket you're on is a raised Alert that keeps your draft;
//   at phone width the list and the ticket are separate screens, and Back returns focus to the row.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildExamples } from '../../scripts/build-examples.mjs';

let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const out = fileURLToPath(new URL('../test/examples/', import.meta.url));
await buildExamples(out, { only: ['support-inbox'] });
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const wait = (page, ms) => page.waitForTimeout(ms);

const fresh = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  await page.goto(`file://${out}support-inbox.html`); await wait(page, 900);
  return { ctx, page, errors };
};
const drawer = async (page) => { const t = page.locator('.ex-drawer .alt-acc-trigger'); if ((await t.getAttribute('aria-expanded')) !== 'true') await t.click(); await wait(page, 200); };
const mode = async (page, label) => { await drawer(page); await page.locator('.ex-drawer label.alt-radio').filter({ has: page.locator('.alt-check-label', { hasText: new RegExp(`^${label}$`) }) }).click(); await wait(page, 60); };
// Elsewhere events, pressed without moving focus (as the server would report them).
const event = async (page, label) => { await drawer(page); await page.evaluate((l) => [...document.querySelectorAll('.ex-drawer button')].find((b) => b.textContent.includes(l)).click(), label); await wait(page, 900); };
const look = (page) => page.evaluate(() => ({
  h1: document.querySelectorAll('.ex-app h1').length,
  primaries: [...document.querySelectorAll('.ex-app .alt-btn[data-variant="primary"]')].filter((b) => b.getClientRects().length && !b.closest('.alt-comments')).length,
  sideways: document.documentElement.scrollWidth > window.innerWidth,
}));
const focusedTitle = (page) => page.evaluate(() => document.activeElement?.closest('[role="option"]')?.querySelector('.alt-inbox-title')?.textContent ?? document.activeElement?.tagName);
const rowTop = (page, title) => page.evaluate((t) => [...document.querySelectorAll('[role="option"]')].find((o) => o.querySelector('.alt-inbox-title')?.textContent === t)?.getBoundingClientRect().top, title);
const openTicket = async (page, title) => { await page.locator('[role="option"]', { hasText: title }).click(); await wait(page, 300); };
const composer = (page) => page.getByLabel(/^Reply to /);
const thread = (page) => page.locator('section[aria-label^="Conversation with"]');
const replies = (page, op = 'tickets.reply') => page.evaluate((op) => [...document.querySelectorAll('.ex-log-row')].filter((r) => r.querySelector('.ex-log-op')?.textContent === op && /ok|lost/.test(r.dataset.status)).length, op);

// ---- Recognition plan (#617): matching content, meaningful cues in each presentation -----------------------------
// Engineering observations only: these checks do not measure a person's recognition speed, comprehension or taste.
const recognitionShots = fileURLToPath(new URL('../test/recognition-cues/', import.meta.url));
mkdirSync(recognitionShots, { recursive: true });
for (const [scheme, width, forced] of [
  ['light', 1280, false], ['dark', 1280, false], ['light', 320, false], ['dark', 320, false],
  ['light', 1280, true], ['dark', 320, true],
]) {
  const { ctx, page, errors } = await fresh({ colorScheme: scheme, viewport: { width, height: 900 }, deviceScaleFactor: 2,
    ...(forced ? { forcedColors: 'active', reducedMotion: 'reduce' } : {}) });
  const condition = `${scheme}-${width}${forced ? '-forced-reduced' : ''}`;
  await page.getByRole('tab', { name: /^All/ }).click();
  // Inspect settled cues after the existing arrival animation, not its temporary emphasis.
  await page.evaluate(async () => {
    await Promise.all(document.querySelector('.si-list').getAnimations({ subtree: true })
      .filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {})));
  });
  const invoice = page.getByRole('option', { name: /Invoice for March from Oluwaseun Bello On hold/ });
  expect(await invoice.count() === 1 && await page.getByRole('option').count() === 5,
    `${condition}: the same five records expose invoice identity, requester and state together`);
  expect(await invoice.locator('.alt-inbox-status').innerText() === 'On hold', `${condition}: status is visible words, independent of color`);
  expect((await invoice.locator('.alt-inbox-from').innerText()).includes('Oluwaseun Bello'), `${condition}: requester identity has a readable name`);
  const description = await invoice.evaluate((el) => (el.getAttribute('aria-describedby') ?? '').split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' '));
  expect(description.includes('Our finance team needs the VAT number on the invoice before they can pay it.'), `${condition}: the full preview remains in the accessible description`);
  expect(await page.getByRole('option', { name: /^Unread\. Refund for order 4471/ }).count() === 1,
    `${condition}: the unread mark has a non-color named equivalent`);
  expect(!(await look(page)).sideways, `${condition}: the recognition queue fits without horizontal page overflow`);
  await page.locator('.si').screenshot({ path: `${recognitionShots}${condition}-queue.png` });
  await invoice.focus(); await page.keyboard.press('Enter'); await wait(page, 300);
  expect(await page.getByRole('heading', { name: 'Invoice for March', exact: true }).isVisible()
    && await page.locator('[data-inbox-key="T-4455"]').getAttribute('aria-selected') === 'true', `${condition}: keyboard opening pairs the same identity with selected semantics`);
  expect(await page.getByRole('heading', { name: 'Conversation with Oluwaseun Bello' }).isVisible()
    && await page.getByRole('heading', { name: 'Internal notes · not sent to the customer' }).isVisible(),
    `${condition}: public conversation and internal notes have distinct visible headings`);
  expect(!(await look(page)).sideways, `${condition}: open content fits without horizontal page overflow`);
  await page.locator('.si').screenshot({ path: `${recognitionShots}${condition}-detail.png` });
  if (width === 320) {
    await page.getByRole('button', { name: 'Back to tickets' }).click(); await wait(page, 250);
    expect(await focusedTitle(page) === 'Invoice for March', `${condition}: returning restores focus to the recognized source`);
  }
  expect(!errors.length, `${condition}: no page or console errors (${errors.slice(0, 2).join('; ')})`);
  await ctx.close();
}

// ---- Renders ------------------------------------------------------------------------------------------------------
for (const [scheme, width] of [['light', 1280], ['dark', 1280], ['light', 375]]) {
  const { ctx, page, errors } = await fresh({ colorScheme: scheme, viewport: { width, height: 900 }, ...(width < 500 ? { isMobile: true, hasTouch: true } : {}) });
  const a = await look(page);
  await openTicket(page, 'Refund for order 4471');
  const b = await look(page);
  expect([a, b].every((s) => s.h1 === 1 && s.primaries <= 1 && !s.sideways), `${scheme} ${width}: one h1, at most one primary outside a scope, no sideways scroll (${JSON.stringify([a, b])})`);
  if (width < 500) {
    expect(await page.locator('[role="listbox"]').isVisible() === false && await page.getByRole('heading', { name: 'Refund for order 4471' }).isVisible(), 'phone: the ticket replaces the list');
    await page.getByRole('button', { name: 'Back to tickets' }).click(); await wait(page, 400);
    expect(await focusedTitle(page) === 'Refund for order 4471', `phone: Back returns focus to the ticket's row (${await focusedTitle(page)})`);
  }
  expect(!errors.length, `${scheme} ${width}: no page or console errors (${errors.slice(0, 2).join('; ')})`);
  await ctx.close();
}

// ---- Forced colours, reduced motion, more contrast ------------------------------------------------------------------
{
  const { ctx, page, errors } = await fresh({ forcedColors: 'active', reducedMotion: 'reduce' });
  await drawer(page); await page.locator('.ex-drawer label', { hasText: 'More contrast' }).click(); await wait(page, 200);
  await page.getByRole('tab', { name: /^All/ }).click(); await wait(page, 200);
  await openTicket(page, 'Invoice for March');
  expect(await page.locator('[data-contrast="more"]').count() > 0 && /Internal notes · not sent to the customer/.test(await page.locator('.si-notes').textContent()), 'forced colours, reduced motion and more contrast render; notes are named in words');
  expect(!errors.length, `forced colours: no page or console errors (${errors.slice(0, 2).join('; ')})`);
  await ctx.close();
}

// ---- Triage, arrival, presence, the teammate's reply --------------------------------------------------------------
{
  const { ctx, page, errors } = await fresh();
  await page.locator('[role="option"][tabindex="0"]').focus();
  expect(await focusedTitle(page) === 'Refund for order 4471', 'triage: the list is one tab stop, starting on the first ticket');
  await page.keyboard.press('ArrowDown');
  expect(await focusedTitle(page) === 'Can’t sign in after the update' && await page.locator('.si-empty').count() === 1, 'triage: ↓ moves without opening');
  await page.keyboard.press('Enter'); await wait(page, 300);
  expect(/Can’t sign in after the update/.test(await page.locator('#si-ticket-h').textContent()), 'triage: Enter opens the ticket');
  expect(await page.locator('[role="option"][aria-selected="true"] .alt-inbox-item[data-unread]').count() === 0, 'triage: opening marks it read');

  // A new ticket while a row is focused.
  await drawer(page); // opened first: its trigger takes focus and scrolls the page
  await page.locator('[role="option"]', { hasText: 'Change the delivery address' }).focus();
  const before = await rowTop(page, 'Change the delivery address');
  await event(page, 'A new ticket arrives');
  expect(await page.locator('[role="option"]').count() === 4 && await focusedTitle(page) === 'Change the delivery address' && Math.abs((await rowTop(page, 'Change the delivery address')) - before) <= 1,
    `arrival: focus and the focused row stay put (${before} → ${await rowTop(page, 'Change the delivery address')})`);
  const said = await page.locator('.alt-inbox + .alt-sr').textContent();
  expect(/^New: Discount code not working, from Aiyana Redcloud\.$/.test(said), `arrival: it's said politely (${said})`);

  // Presence, then the teammate's reply arriving above your draft.
  await openTicket(page, 'Refund for order 4471');
  await event(page, 'Maya Chen opens');
  expect(/Maya Chen is viewing/.test(await page.locator('.si-presence').textContent()), 'presence: a teammate on the ticket is named on it');
  await event(page, 'Maya Chen starts replying');
  expect(/Maya Chen is replying/.test(await page.locator('.si-presence').textContent()) && /Maya Chen/.test(await thread(page).locator('.alt-comments-typing').textContent()), 'presence: their replying shows on the ticket and in the thread');
  expect(await page.getByRole('option', { name: /Refund for order 4471.*Maya Chen is replying/ }).count() === 1,
    'recognition: the presence avatar has a named action in the row, not an ownership claim');
  await composer(page).fill('Hi Priya, sorry about the jug. I can refund it today.');
  await composer(page).focus(); await composer(page).evaluate((t) => t.setSelectionRange(9, 9));
  await event(page, 'Maya Chen replies first');
  const caret = await composer(page).evaluate((t) => ({ value: t.value, at: t.selectionStart, focused: document.activeElement === t }));
  expect(caret.value === 'Hi Priya, sorry about the jug. I can refund it today.' && caret.at === 9 && caret.focused, `their reply: your draft and caret are untouched (${JSON.stringify(caret)})`);
  expect(/I’ve started the refund/.test(await thread(page).textContent()), 'their reply arrives in the conversation');

  // A teammate reassigning the ticket you're on.
  await event(page, 'Maya Chen reassigns it to herself');
  const alert = await page.locator('.si-ticket .alt-alert').textContent().catch(() => '');
  expect(/Maya Chen reassigned this to herself\. Your draft is kept\./.test(alert) && await composer(page).inputValue() === caret.value, `reassigned: a raised Alert keeps your draft (${alert})`);
  expect(!errors.length, `no page or console errors (${errors.slice(0, 2).join('; ')})`);
  await ctx.close();
}

// ---- Sending: a failure, then offline with a lost response -----------------------------------------------------------
{
  const { ctx, page, errors } = await fresh();
  await openTicket(page, 'Can’t sign in after the update');
  await mode(page, 'Fail');
  await composer(page).fill('Could you try resetting your password from the sign-in screen?');
  await composer(page).press('Meta+Enter'); await wait(page, 900);
  const failed = thread(page).locator('[data-status="failed"]');
  expect(await failed.count() === 1 && /Could you try resetting/.test(await failed.textContent()) && await thread(page).getByRole('button', { name: /Retry/ }).count() === 1, 'send fails: the reply drops into a trench with Retry, its text kept');
  await mode(page, 'Succeed');
  await thread(page).getByRole('button', { name: /Retry/ }).click(); await wait(page, 900);
  expect(await thread(page).locator('[data-status="failed"]').count() === 0 && await replies(page) === 1, 'Retry sends it once');

  await mode(page, 'Offline');
  await composer(page).fill('Following up: did the reset work?');
  await page.getByRole('button', { name: 'Send reply' }).click(); await wait(page, 500);
  expect(/Offline/.test(await page.locator('.si-composer').textContent()) && await thread(page).locator('[data-status="pending"]').count() === 1, 'offline: the reply waits, and the composer says so');
  await mode(page, 'Lose the response'); // back online: the waiting reply goes, and its response is lost
  await page.waitForFunction(() => !document.querySelector('section[aria-label^="Conversation with"] [data-status="pending"]'), null, { timeout: 8000 }).catch(() => undefined);
  await mode(page, 'Succeed');
  const sent = await thread(page).textContent();
  expect((sent.match(/Following up: did the reset work\?/g) ?? []).length === 1 && await replies(page) === 2, `offline: back online it's sent once, even with the response lost (${await replies(page)} replies)`);
  expect(!errors.length, `no page or console errors (${errors.slice(0, 2).join('; ')})`);
  await ctx.close();
}

await browser.close();
console.log(`Support inbox example: ${pass} passed, ${fail} failed.`);
if (fail) process.exit(1);
