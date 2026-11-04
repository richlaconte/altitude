// Book an appointment (examples/apps/booking, #403), built by scripts/build-examples.mjs and driven in a browser on its
// simulated clinic, at phone width first. Every step renders in both schemes with one h1, at most one primary and no
// page or console errors, and never scrolls the page sideways. Then the flow and the fixtures #403 names:
//   the flow completes by keyboard; Continue with nothing chosen shows a linked error summary (never a disabled button);
//   nothing that costs money starts chosen; Back keeps every answer; the held time says when it ends; a time taken while
//   you're on Details is caught at review, which sends you back to Time with the other answers kept and returns to the
//   review; a declined card keeps you on the review, saying nothing was charged; an expired code says so and a new one
//   works; a slow Book and pay is busy only while in flight; offline on Time fails the times and Try again recovers; a
//   lost response is reconciled without booking twice; the booking is cancelled from its outcome; Reset starts over.
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { buildExamples } from '../../scripts/build-examples.mjs';

let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const out = fileURLToPath(new URL('../test/examples/', import.meta.url));
await buildExamples(out, { only: ['booking'] });
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const wait = (page, ms) => page.waitForTimeout(ms);

const open = async (page) => { await page.goto(`file://${out}booking.html`); await wait(page, 900); };
const drawer = async (page) => { const t = page.locator('.ex-drawer .alt-acc-trigger'); if ((await t.getAttribute('aria-expanded')) !== 'true') await t.click(); await wait(page, 200); };
const mode = async (page, label) => { await drawer(page); await page.locator('.ex-drawer label.alt-radio').filter({ has: page.locator('.alt-check-label', { hasText: new RegExp(`^${label}$`) }) }).click(); await wait(page, 60); };
const event = async (page, label) => { await drawer(page); await page.locator('.ex-drawer button', { hasText: label }).click(); await wait(page, 900); };
const heading = (page) => page.locator('#bk-step-title, #bk-outcome-title').first().textContent();
const focused = (page) => page.evaluate(() => { const a = document.activeElement; return a ? (a.id || a.textContent?.trim().slice(0, 40) || a.tagName) : ''; });
const primaries = (page) => page.evaluate(() => [...document.querySelectorAll('.ex-app .alt-btn[data-variant="primary"]')].filter((b) => b.getClientRects().length && !b.closest('[role="dialog"]')).length);
const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
const cont = async (page) => { await page.locator('.bk-actions button[type="submit"]').click(); await wait(page, 900); };
const text = (page, sel) => page.locator(sel).allTextContents().then((t) => t.join(' '));
const firstFree = (page) => page.locator('#bk-time .alt-slot:not([aria-disabled="true"])').first();
const details = async (page) => {
  await page.fill('#bk-name', 'Aoife Byrne'); await page.fill('#bk-email', 'aoife@example.com'); await page.fill('#bk-phone', '087 123 4821');
};
const verify = async (page) => {
  await page.locator('button', { hasText: /^Text me a code$/ }).click(); await wait(page, 800);
  const code = await page.locator('.bk-message strong').textContent();
  await page.keyboard.type(code); await wait(page, 1000);
};
// Service, Time and Details by pointer, to reach the review quickly.
const toReview = async (page, treatment = 'Follow-up') => {
  await page.locator('#bk-service label.alt-radio', { hasText: treatment }).click(); await cont(page);
  await firstFree(page).click(); await cont(page);
  await details(page); await verify(page); await cont(page);
};
const book = async (page) => { await page.locator('.bk-actions button', { hasText: /^Book and pay/ }).click(); await wait(page, 1300); };

// ---- Both schemes at phone width: every step renders cleanly -------------------------------------------------------
for (const scheme of ['daylight', 'nightfall']) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, colorScheme: scheme === 'nightfall' ? 'dark' : 'light' });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await open(page);
  // #441: mounted in a phone column, the auto stepper goes down the page rather than wrapping its row.
  const stepper = await page.evaluate(() => { const s = document.querySelector('.alt-stepper'); const tops = [...s.querySelectorAll(':scope > li')].map((li) => li.offsetTop); return { o: s.dataset.orientation, rows: new Set(tops).size, n: tops.length }; });
  expect(stepper.o === 'vertical' && stepper.rows === stepper.n, `${scheme}: at phone width the stepper is vertical, one step per row (${JSON.stringify(stepper)})`);
  const steps = [];
  const look = async () => steps.push({ h: await heading(page), h1: await page.locator('.ex-app h1').count(), p: await primaries(page), s: await sideways(page) });
  await look();
  await page.locator('#bk-service label.alt-radio', { hasText: 'Initial assessment' }).click(); await cont(page); await look();
  await firstFree(page).click(); await cont(page); await look();
  await details(page); await verify(page); await cont(page); await look();
  await book(page); await look();
  expect(steps.map((s) => s.h).join('|') === 'Choose a treatment|Choose a time|Your details|Check and pay|You’re booked', `${scheme}: the steps arrive in order (${steps.map((s) => s.h).join('|')})`);
  expect(steps.every((s) => s.h1 === 1 && s.p <= 1 && !s.s), `${scheme}: every step has one h1, at most one primary and no sideways scroll (${JSON.stringify(steps)})`);
  expect(!errors.length, `${scheme}: no page or console errors (${errors.slice(0, 2).join('; ')})`);
  await ctx.close();
}

// ---- The flow and its fixtures, at phone width ------------------------------------------------------------------
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await open(page);

// Nothing that costs money starts chosen.
expect(await page.locator('#bk-service input:checked').count() === 0 && !(await page.locator('#bk-addon').isChecked()), 'no treatment and no add-on start chosen');

// Continue is never disabled: with nothing chosen it says what's missing, in a summary that takes focus and links to the field.
expect(!(await page.locator('.bk-actions button[type="submit"]').isDisabled()), 'Continue is enabled with nothing chosen');
await cont(page);
expect(await page.locator('.alt-error-summary').count() === 1 && /Treatment: Choose a treatment/.test(await text(page, '.alt-error-summary')), 'Continue with nothing chosen shows the error summary');
expect(await page.evaluate(() => document.activeElement?.classList.contains('alt-error-summary')), 'the error summary takes focus');
const described = await page.evaluate(() => (document.getElementById('bk-service')?.getAttribute('aria-describedby') || '').split(/\s+/).map((id) => document.getElementById(id)?.textContent).join(' '));
expect(await page.locator('#bk-service').getAttribute('aria-invalid') === 'true' && /Choose a treatment/.test(described), `the treatment choices carry the error in words (${described})`);
await page.locator('.alt-error-summary a').first().click(); await wait(page, 100);
const landed = await page.evaluate(() => { const a = document.activeElement; return a?.matches('#bk-service input[type="radio"]') ? a.value : a?.id || a?.tagName; });
expect(landed === 'assessment', `the summary's link moves focus to the first treatment, where the arrows work (${landed})`);

// By keyboard: arrows choose, Enter continues, focus lands on each step's heading.
await page.locator('#bk-service input[value="assessment"]').focus();
await page.keyboard.press('ArrowDown'); await wait(page, 100);
expect(await page.locator('#bk-service input[value="follow-up"]').isChecked() && await page.locator('.alt-error-summary').count() === 0, 'an arrow chooses Follow-up and the error clears');
await page.keyboard.press('Enter'); await wait(page, 900);
expect(await heading(page) === 'Choose a time' && await focused(page) === 'bk-step-title', `Enter continues and focus moves to the Time heading (${await focused(page)})`);
await page.locator('#bk-time .alt-slot:not([aria-disabled="true"])').first().focus();
await page.keyboard.press('Space'); await wait(page, 100);
const chosen = await page.locator('#bk-time .alt-slot[aria-checked="true"]').getAttribute('data-value');
await page.keyboard.press('Enter'); await wait(page, 1100);
expect(await heading(page) === 'Your details', 'Space chooses a time and Enter holds it');
expect(new RegExp(`We’re holding ${chosen} on .* for you until \\d\\d:\\d\\d`).test(await text(page, '.bk-hold')), `the held time says when the hold ends (${await text(page, '.bk-hold')})`);
await page.locator('#bk-name').focus(); await page.keyboard.type('Aoife Byrne');
await page.keyboard.press('Tab'); await page.keyboard.type('aoife@example.com');
await page.keyboard.press('Tab'); await page.keyboard.type('087 123 4821');
await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); await wait(page, 900);
expect(await focused(page) === 'bk-code', `Text me a code sends one and focuses the code (${await focused(page)})`);
const code = await page.locator('.bk-message strong').textContent();
await page.keyboard.type(code); await wait(page, 1100);
expect(/is verified/.test(await text(page, '.bk-verified')), 'typing the code verifies the number');

// Back keeps every answer.
await page.locator('.bk-actions button', { hasText: /^Back$/ }).click(); await wait(page, 500);
expect(await page.locator(`#bk-time .alt-slot[data-value="${chosen}"]`).getAttribute('aria-checked') === 'true', 'Back to Time keeps the chosen time');
await page.locator('.alt-stepper [role="button"]', { hasText: 'Service' }).click(); await wait(page, 500);
expect(await page.locator('#bk-service input[value="follow-up"]').isChecked(), 'the stepper goes back to Service with the treatment kept');
await cont(page); await cont(page);
expect(await page.inputValue('#bk-name') === 'Aoife Byrne' && /is verified/.test(await text(page, '.bk-verified')), 'forward again, the details and the verification are kept');
await page.locator('.bk-actions button[type="submit"]').focus(); await page.keyboard.press('Enter'); await wait(page, 1000);
expect(await heading(page) === 'Check and pay' && await focused(page) === 'bk-step-title', 'Enter on Continue opens the review with its heading focused');
const review = await text(page, '.bk-review');
expect(/Follow-up, 30 minutes/.test(review) && /Not added/.test(review) && /€50\.00/.test(review) && /€1\.50/.test(review) && /Total, charged now\s*€51\.50/.test(review), 'the review shows each answer and the total with every charge');
expect(/Free to cancel until 24 hours before/.test(review) && await page.locator('.bk-terms').evaluate((e) => parseFloat(getComputedStyle(e).fontSize)) >= 15, 'the cancellation terms sit beside Book and pay at body size');
expect(await page.locator('.bk-change button[aria-label="Change day or time"]').count() === 1, 'each Change is named for its answer');

// Change returns to the review, at the answer that was changed.
await page.locator('button[aria-label="Change treatment"]').click(); await wait(page, 600);
expect(await heading(page) === 'Choose a treatment' && /Back to review/.test(await text(page, '.bk-actions')), 'Change opens the step, with Back to review');
await page.locator('#bk-service label.alt-radio', { hasText: 'Sports massage' }).click(); await cont(page);
expect(await heading(page) === 'Check and pay' && await focused(page) === 'bk-change-service' && /Sports massage/.test(await text(page, '.bk-review')), `Back to review returns focus to the changed answer (${await focused(page)})`);

// Slow: Book and pay is busy only while in flight.
await mode(page, 'Slow');
const pay = page.locator('.bk-actions button', { hasText: /^Book and pay/ });
expect(!(await pay.isDisabled()) && await pay.getAttribute('aria-busy') === null, 'Book and pay is ready before it’s pressed');
await pay.click(); await wait(page, 400);
expect(await pay.getAttribute('aria-busy') === 'true' && /Booking and paying/.test(await text(page, '.ex-app [role="status"]')), 'while in flight it’s busy, and that’s announced');
await page.locator('#bk-outcome-title').waitFor({ timeout: 8000 }); await wait(page, 300);
expect(await focused(page) === 'bk-outcome-title' && /Sports massage/.test(await text(page, '.bk-outcome')) && /KP-\d+/.test(await text(page, '.bk-outcome')), 'the outcome replaces the flow and takes focus');
await mode(page, 'Succeed');
const actions = await page.locator('.bk-outcome .bk-actions .alt-btn').evaluateAll((bs) => bs.map((b) => ({ t: b.textContent, h: b.getBoundingClientRect().height, v: b.getAttribute('data-variant') })));
expect(actions.length === 2 && actions.map((a) => a.t).join() === 'Add to calendar,Cancel booking' && actions[0].h === actions[1].h && actions[0].v === actions[1].v, `Add to calendar and Cancel booking sit side by side, alike (${JSON.stringify(actions)})`);

// Cancel the booking from its outcome.
await page.locator('.bk-outcome button', { hasText: /^Cancel booking$/ }).click(); await wait(page, 600);
// The first free time may be within 24 hours of now (the clinic's calendar is the real one), so either term can apply.
const terms = await text(page, '[role="dialog"]');
const refund = /all €61\.50 comes back/.test(terms) ? '61.50' : /less than 24 hours away.*refund €31\.50/.test(terms) ? '31.50' : '';
expect(!!refund, `the cancel dialog says what comes back under the terms (${terms.slice(0, 160)})`);
await page.locator('[role="dialog"] button', { hasText: /^Cancel booking$/ }).click(); await wait(page, 1000);
expect(await heading(page) === 'Booking cancelled' && new RegExp(`€${refund.replace('.', '\\.')} is on its way back`).test(await text(page, '.bk-outcome')), 'the booking is cancelled and the refund named');

// ---- A time taken while you're on Details --------------------------------------------------------------------------
await page.locator('button', { hasText: 'Book another appointment' }).click(); await wait(page, 800);
expect(await heading(page) === 'Choose a treatment' && await page.locator('#bk-service input:checked').count() === 0, 'Book another starts a fresh flow');
await page.locator('#bk-service label.alt-radio', { hasText: 'Initial assessment' }).click(); await cont(page);
await firstFree(page).click(); await cont(page);
const held = (await text(page, '.bk-hold')).match(/holding (\d\d:\d\d)/)?.[1];
await details(page); await verify(page);
await event(page, 'Someone else books your held time');
expect(/is no longer held for you/.test(await text(page, '.bk-hold')), `Details stops saying the time is held (${await text(page, '.bk-hold')})`);
await cont(page);
expect(new RegExp(`${held} is no longer available`).test(await text(page, '.bk-review')) && await page.locator('.bk-actions button', { hasText: /^Book and pay/ }).count() === 0, 'the review says the time went and offers no Book and pay');
expect(await primaries(page) === 1 && await page.locator('.bk-actions button', { hasText: 'Choose another time' }).count() === 1, 'Choose another time is the one primary');
await page.locator('.bk-actions button', { hasText: 'Choose another time' }).click(); await wait(page, 900);
expect(await heading(page) === 'Choose a time' && await page.locator('#bk-time .alt-slot[aria-checked="true"]').count() === 0, 'it goes back to Time with the time cleared');
expect(await page.locator(`#bk-time .alt-slot[data-value="${held}"]`).getAttribute('aria-disabled') === 'true', 'the taken time now shows as booked');
await firstFree(page).click(); await cont(page);
expect(await heading(page) === 'Check and pay' && await focused(page) === 'bk-change-time' && /Aoife Byrne/.test(await text(page, '.bk-review')), 'Back to review keeps the details and returns to the time');

// ---- A declined card -----------------------------------------------------------------------------------------------
await event(page, 'The bank declines the next charge');
await book(page);
expect(await heading(page) === 'Check and pay' && /declined the Visa ending 4242\. Nothing was charged/.test(await text(page, '.bk-review')), 'a declined card keeps you on the review and says nothing was charged');
expect(await page.evaluate(() => !!document.activeElement?.querySelector('.alt-alert, [role="alert"]')), 'the refusal takes focus');
await book(page);
expect(await heading(page) === 'You’re booked', 'the next try books');

// ---- An expired code ---------------------------------------------------------------------------------------------
await page.locator('.bk-outcome button', { hasText: /^Cancel booking$/ }).click(); await wait(page, 500);
await page.locator('[role="dialog"] button', { hasText: /^Cancel booking$/ }).click(); await wait(page, 900);
await page.locator('button', { hasText: 'Book another appointment' }).click(); await wait(page, 700);
await page.locator('#bk-service label.alt-radio', { hasText: 'Follow-up' }).click(); await cont(page);
await firstFree(page).click(); await cont(page);
await details(page);
await page.locator('button', { hasText: /^Text me a code$/ }).click(); await wait(page, 800);
const stale = await page.locator('.bk-message strong').textContent();
await event(page, 'The text code expires');
await page.locator('#bk-code').focus(); await page.keyboard.type(stale); await wait(page, 1000);
expect(/That code has expired\. Send a new one/.test(await text(page, '.bk-code')) && await focused(page) === 'bk-code', 'an expired code says so and keeps focus in the code');
await page.locator('button', { hasText: 'Send a new code' }).click(); await wait(page, 800);
await page.keyboard.type(await page.locator('.bk-message strong').textContent()); await wait(page, 1000);
expect(/is verified/.test(await text(page, '.bk-verified')), 'a new code works');

// ---- Lost response on Book and pay: reconciled, booked once ---------------------------------------------------------
await cont(page);
const ops = (op) => page.evaluate((o) => [...document.querySelectorAll('.ex-log-row .ex-log-op')].filter((e) => e.textContent === o).length, op);
const before = { create: await ops('booking.create'), find: await ops('booking.find') };
await mode(page, 'Lose the response');
await book(page); await wait(page, 600);
expect(await heading(page) === 'You’re booked', 'a lost response is reconciled into the booking');
expect(await ops('booking.create') - before.create === 1 && await ops('booking.find') - before.find === 1, 'it was sent once, then looked up, not sent again');
await mode(page, 'Succeed');

// ---- Offline on Time --------------------------------------------------------------------------------------------
await page.locator('button', { hasText: 'Cancel booking' }).first().click(); await wait(page, 500);
await page.locator('[role="dialog"] button', { hasText: /^Cancel booking$/ }).click(); await wait(page, 900);
await page.locator('button', { hasText: 'Book another appointment' }).click(); await wait(page, 700);
await page.locator('#bk-service label.alt-radio', { hasText: 'Follow-up' }).click();
await mode(page, 'Offline');
await cont(page);
expect(/We couldn’t load the times/.test(await text(page, '.bk-step')), 'offline, the times fail to load and say so');
await cont(page);
expect(/Time: Choose a time/.test(await text(page, '.alt-error-summary')), 'Continue still says what’s missing');
await mode(page, 'Succeed');
await page.locator('.bk-step button', { hasText: 'Try again' }).click(); await wait(page, 900);
expect(await firstFree(page).count() === 1, 'Try again loads the times');

// ---- Reset -----------------------------------------------------------------------------------------------------
await drawer(page); await page.locator('.ex-drawer button', { hasText: 'Reset example data' }).click(); await wait(page, 1000);
expect(await heading(page) === 'Choose a treatment' && await page.locator('#bk-service input:checked').count() === 0, 'Reset starts over');
expect(!errors.length, `flow: no page or console errors (${errors.slice(0, 2).join('; ')})`);
await ctx.close();

{ // wide: the summary sits beside the step
  const p = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await open(p);
  await p.locator('#bk-service label.alt-radio', { hasText: 'Follow-up' }).click(); await wait(p, 200);
  const side = await p.evaluate(() => { const a = document.querySelector('.bk-summary'), f = document.querySelector('.bk-flow'); return a && f ? a.getBoundingClientRect().left > f.getBoundingClientRect().right - 1 : false; });
  expect(side && /Follow-up/.test(await p.locator('.bk-summary').textContent()) && /€51\.50/.test(await p.locator('.bk-summary').textContent()), 'wide: the summary sits beside the step with the running total');
  await p.close();
}
await browser.close();
console.log(`Booking example: ${pass} passed, ${fail} failed.`);
process.exit(fail ? 1 : 0);
