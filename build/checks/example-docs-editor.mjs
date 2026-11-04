// The travel policy editor (examples/apps/docs-editor, #405), built by scripts/build-examples.mjs and driven in a browser
// on its simulated server. It renders in both schemes and at phone width with one h1, at most one primary, no sideways
// scroll and no page or console errors. Then each fixture #405 names, checking that no typed text is lost, no section is
// written twice (the request log), and "Saved" is never shown while a write is unacknowledged:
//   slow: the section hovers while its save is in flight, and the indicator says Saving, then Saved;
//   offline and back: the edit waits, the indicator says Offline, and it's sent once when the connection returns;
//   conflict: someone else saved the same section; both versions show, Keep both keeps both, focus returns to the heading;
//   session ended mid-save: the write waits, a sign-in dialog opens, and the queue replays once after signing in;
//   lost response on a section: read back, landed once, never retried into a duplicate;
//   the review round: Request review, a comment, a suggested change decided hunk by hunk, approval, then Publish with its
//   response lost: read back and published once. Details save through EditRegion.
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { buildExamples } from '../../scripts/build-examples.mjs';

let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const out = fileURLToPath(new URL('../test/examples/', import.meta.url));
await buildExamples(out, { only: ['docs-editor'] });
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const wait = (page, ms) => page.waitForTimeout(ms);

const fresh = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  await page.goto(`file://${out}docs-editor.html`); await wait(page, 1000);
  return { ctx, page, errors };
};
const drawer = async (page) => { const t = page.locator('.ex-drawer .alt-acc-trigger'); if ((await t.getAttribute('aria-expanded')) !== 'true') await t.click(); await wait(page, 200); };
const mode = async (page, label) => { await drawer(page); await page.locator('.ex-drawer label.alt-radio').filter({ has: page.locator('.alt-check-label', { hasText: new RegExp(`^${label}$`) }) }).click(); await wait(page, 60); };
const event = async (page, label) => { await drawer(page); await page.locator('.ex-drawer button', { hasText: label }).click(); await wait(page, 900); };
const area = (page, id) => page.locator(`section[aria-labelledby="de-h-${id}"] textarea`);
const sec = (page, id) => page.locator(`section[aria-labelledby="de-h-${id}"] .de-sec`);
const sync = (page) => page.locator('.de .alt-sync, .de [class*="sync"]').first().textContent().then((t) => t.trim()).catch(() => '');
const saves = (page) => page.evaluate(() => [...document.querySelectorAll('.ex-log-row')].filter((r) => r.querySelector('.ex-log-op')?.textContent === 'section.save' && /ok|lost/.test(r.dataset.status)).length);
// Focus, not click: a pending section hovers, so it never holds still for a click.
const typeAt = async (page, id, text) => { await area(page, id).focus(); await area(page, id).evaluate((t) => t.setSelectionRange(t.value.length, t.value.length)); await page.keyboard.type(text); };
const blur = (page, id) => area(page, id).focus();
const value = (page, id) => area(page, id).inputValue();
// Sample the indicator while a write is in flight: it must never say Saved then.
const watchSaved = (page) => page.evaluate(() => {
  window.__savedWhileBusy = 0;
  const tick = () => {
    const busy = document.querySelector('.de [aria-busy="true"], .de [data-status="pending"]');
    const t = [...document.querySelectorAll('.de .alt-badge')].map((b) => b.textContent).join(' ');
    if (busy && /\bSaved\b/.test(t)) window.__savedWhileBusy++;
    window.__watch = requestAnimationFrame(tick);
  };
  tick();
});
const savedWhileBusy = (page) => page.evaluate(() => { cancelAnimationFrame(window.__watch); return window.__savedWhileBusy; });

// ---- Renders: both schemes, and a phone --------------------------------------------------------------------------
for (const [scheme, width] of [['light', 1280], ['dark', 1280], ['light', 375]]) {
  const { ctx, page, errors } = await fresh({ colorScheme: scheme, viewport: { width, height: 900 }, ...(width < 500 ? { isMobile: true, hasTouch: true } : {}) });
  const s = await page.evaluate(() => ({
    h1: document.querySelectorAll('.ex-app h1').length,
    primaries: [...document.querySelectorAll('.ex-app .alt-btn[data-variant="primary"]')].filter((b) => b.getClientRects().length && !b.closest('[role="dialog"]')).length,
    sideways: document.documentElement.scrollWidth > window.innerWidth,
    sections: document.querySelectorAll('.de-section').length,
    detailsBelow: (() => { const d = document.querySelector('.de-doc'), a = document.querySelector('.de-side'); return a.getBoundingClientRect().top >= d.getBoundingClientRect().bottom - 1; })(),
  }));
  expect(s.h1 === 1 && s.primaries === 1 && !s.sideways && s.sections === 4, `${scheme} ${width}: one h1, one primary, no sideways scroll, four sections (${JSON.stringify(s)})`);
  if (width < 500) expect(s.detailsBelow, `phone: the details move under the document`);
  expect(!errors.length, `${scheme} ${width}: no page or console errors (${errors.slice(0, 2).join('; ')})`);
  await ctx.close();
}

// ---- Forced colours, reduced motion and more contrast: still renders, with no errors ---------------------------------
{
  const { ctx, page, errors } = await fresh({ forcedColors: 'active', reducedMotion: 'reduce' });
  await drawer(page); await page.locator('.ex-drawer label', { hasText: 'More contrast' }).click(); await wait(page, 300);
  await event(page, 'Jane Park edits “Expenses”');
  expect(await page.locator('[data-contrast="more"]').count() > 0 && await page.locator('.de-section').count() === 4, 'forced colours, reduced motion and more contrast render');
  expect(!errors.length, `forced colours: no page or console errors (${errors.slice(0, 2).join('; ')})`);
  await ctx.close();
}

// ---- Slow: hovers while in flight, then lands; Saved never shows early ----------------------------------------------
{
  const { ctx, page } = await fresh();
  expect(/Saved/.test(await sync(page)), `at rest the indicator says Saved (${await sync(page)})`);
  await mode(page, 'Slow');
  await watchSaved(page);
  await typeAt(page, 'scope', ' Interns are included.');
  await wait(page, 1300); // debounce (800) and dur-grace, the slow write still in flight
  expect(await sec(page, 'scope').getAttribute('data-status') === 'pending' && /Saving/.test(await sync(page)), `slow: the section hovers and the indicator says Saving (${await sync(page)})`);
  await page.waitForFunction(() => document.querySelector('section[aria-labelledby="de-h-scope"] .de-sec')?.dataset.status === 'committed', null, { timeout: 8000 });
  await wait(page, 200);
  expect(/Saved/.test(await sync(page)) && await saves(page) === 1, `slow: it lands once and the indicator says Saved (${await saves(page)} saves)`);
  expect(await savedWhileBusy(page) === 0, 'slow: "Saved" never showed while a write was in flight');
  await page.reload(); await wait(page, 1000);
  expect((await value(page, 'scope')).endsWith('Interns are included.'), 'slow: after a reload the saved text is there');
  await ctx.close();
}

// ---- Offline and back ---------------------------------------------------------------------------------------------
{
  const { ctx, page } = await fresh();
  await mode(page, 'Offline');
  await typeAt(page, 'booking', ' Book rail through the same desk.');
  await blur(page, 'safety'); // blur saves at once
  await wait(page, 600);
  const words = await page.locator('section[aria-labelledby="de-h-booking"] .de-st').textContent();
  expect(/Offline/.test(await sync(page)) && /Waiting to sync/.test(words) && await sec(page, 'booking').getAttribute('data-status') === 'pending', `offline: the edit waits and says so (${await sync(page)} / ${words})`);
  await typeAt(page, 'booking', ' Include taxis.');
  await wait(page, 1200);
  await mode(page, 'Succeed');
  await page.waitForFunction(() => document.querySelector('section[aria-labelledby="de-h-booking"] .de-sec')?.dataset.status === 'committed', null, { timeout: 6000 });
  await wait(page, 300);
  expect((await value(page, 'booking')).endsWith('Book rail through the same desk. Include taxis.') && await saves(page) === 1, `offline: back online, everything typed is sent once (${await saves(page)} saves)`);
  await ctx.close();
}

// ---- Conflict: Jane saved Expenses first ----------------------------------------------------------------------------
{
  const { ctx, page } = await fresh();
  await typeAt(page, 'expenses', '\nTips are covered up to 10%.');
  await event(page, 'Jane Park edits “Expenses”');
  await blur(page, 'scope'); // blur: the save goes against the older revision
  await page.waitForSelector('#de-conflict-expenses', { timeout: 5000 });
  const both = await page.locator('section[aria-labelledby="de-h-expenses"] .de-versions').textContent();
  expect(/Tips are covered/.test(both) && /€50/.test(both) && /Jane Park/.test(both), 'conflict: both versions show, theirs named');
  expect(/conflict|Conflict|resolve/i.test(await sync(page)), `conflict: the indicator says so (${await sync(page)})`);
  await page.locator('section[aria-labelledby="de-h-expenses"] button', { hasText: 'Keep both' }).click();
  await wait(page, 150);
  expect(await page.evaluate(() => document.activeElement?.id) === 'de-h-expenses', 'conflict: focus returns to the section heading');
  await page.waitForFunction(() => document.querySelector('section[aria-labelledby="de-h-expenses"] .de-sec')?.dataset.status === 'committed', null, { timeout: 5000 });
  const v = await value(page, 'expenses');
  expect(/Tips are covered up to 10%/.test(v) && /€50/.test(v) && await saves(page) === 1, `conflict: Keep both keeps both and saves once (${await saves(page)} saves)`);
  await ctx.close();
}

// ---- Session ends mid-save --------------------------------------------------------------------------------------------
{
  const { ctx, page } = await fresh();
  await drawer(page); await page.locator('.ex-drawer button', { hasText: 'End the session' }).click();
  await typeAt(page, 'safety', ' Keep your phone charged.');
  await blur(page, 'scope');
  const dialog = page.getByRole('dialog', { name: 'Sign in to keep saving' });
  await dialog.waitFor({ timeout: 5000 });
  expect(await sec(page, 'safety').getAttribute('data-status') === 'pending' && /Waiting for you to sign in/.test(await page.locator('section[aria-labelledby="de-h-safety"] .de-st').textContent()), 'session: the write waits (pending, not failed) and says why');
  await page.keyboard.press('Escape'); await wait(page, 200);
  expect(await dialog.isVisible(), 'session: Escape doesn’t dismiss the sign-in dialog');
  await dialog.getByRole('button', { name: 'Sign in again' }).click();
  await page.waitForFunction(() => document.querySelector('section[aria-labelledby="de-h-safety"] .de-sec')?.dataset.status === 'committed', null, { timeout: 5000 });
  expect((await value(page, 'safety')).endsWith('Keep your phone charged.') && await saves(page) === 1, `session: after signing in the queue replays once (${await saves(page)} saves)`);
  // The warning before expiry, from the drawer.
  await event(page, 'The session is about to end');
  const warn = page.getByRole('dialog', { name: 'Your session ends in 2 minutes' });
  expect(await warn.isVisible(), 'session: the warning dialog says how long is left');
  await warn.getByRole('button', { name: 'Stay signed in' }).click(); await wait(page, 300);
  expect(!(await warn.isVisible()), 'session: Stay signed in closes it');
  await ctx.close();
}

// ---- Lost response on a section, then the review round and a lost Publish -----------------------------------------
{
  const { ctx, page, errors } = await fresh();
  await mode(page, 'Lose the response');
  await typeAt(page, 'scope', ' Volunteers are not.');
  await blur(page, 'booking');
  await page.waitForFunction(() => document.querySelector('section[aria-labelledby="de-h-scope"] .de-sec')?.dataset.status === 'committed', null, { timeout: 5000 });
  expect(await saves(page) === 1, `lost response: read back and landed once (${await saves(page)} saves)`);
  await mode(page, 'Succeed');

  // Details, through EditRegion's explicit Save.
  await page.getByRole('button', { name: 'Edit details' }).click();
  await page.getByLabel('Audience').fill('All staff and contractors');
  await page.getByRole('button', { name: 'Save' }).click(); await wait(page, 900);
  expect(/All staff and contractors/.test(await page.locator('.de-dl').textContent()), 'details: saved through EditRegion');

  await page.getByRole('button', { name: 'Request review' }).click(); await wait(page, 900);
  expect(/In review · Maya Chen/.test(await page.locator('.de').textContent()) && await page.locator('.ex-app .alt-btn[data-variant="primary"]').count() === 0, 'review: requested, the plate replaces the primary');
  await event(page, 'Maya Chen comments on “Booking travel”');
  expect(/door to door/.test(await page.locator('section[aria-labelledby="de-h-booking"]').textContent()), 'review: the comment arrives under its section');
  await event(page, 'Maya Chen suggests changes to “Expenses”');
  const diff = page.locator('section[aria-labelledby="de-h-expenses"] .de-suggestion');
  expect(await diff.count() === 1, 'review: the suggestion arrives as a DiffView to review');
  const n = await diff.getByRole('button', { name: /^Accept change/ }).count();
  // Accept the first change, reject the second, by keyboard.
  await diff.getByRole('button', { name: 'Accept change 1' }).focus(); await page.keyboard.press('Enter'); await wait(page, 150);
  await diff.getByRole('button', { name: 'Reject change 2' }).focus(); await page.keyboard.press('Enter'); await wait(page, 150);
  await diff.getByRole('button', { name: 'Apply decisions' }).click(); await wait(page, 1500);
  const ex = await value(page, 'expenses');
  expect(/€60 in London/.test(ex) && !/client dinners/.test(ex) && n === 2, `review: accepted changes applied, rejected ones not (${n} hunks; ${ex.replace(/\n/g, ' / ')})`);
  await event(page, 'Maya Chen approves');
  expect(await page.getByRole('button', { name: 'Publish' }).count() === 1, 'review: approved, Publish is the primary');
  await mode(page, 'Lose the response');
  await page.getByRole('button', { name: 'Publish' }).click();
  await page.waitForFunction(() => /Published · version|didn’t go through/.test(document.querySelector('.de')?.textContent ?? ''), null, { timeout: 10000 }).catch(() => undefined);
  const publishes = await page.evaluate(() => [...document.querySelectorAll('.ex-log-row')].filter((r) => r.querySelector('.ex-log-op')?.textContent === 'doc.publish').length);
  const after = await page.locator('.de').textContent();
  expect(/Published · version/.test(after) && publishes === 1, `publish: a lost response is read back and published once (${publishes} publish requests; ${after.slice(0, 300)})`);
  expect(!errors.length, `no page or console errors (${errors.slice(0, 2).join('; ')})`);
  await ctx.close();
}

await browser.close();
console.log(`Docs editor example: ${pass} passed, ${fail} failed.`);
if (fail) process.exit(1);
