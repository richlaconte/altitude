// Expense reports (examples/apps/expense-reports, #407), built by scripts/build-examples.mjs and driven in a browser on
// its simulated server. Renders in both schemes and at phone width with one h1, at most one primary, no sideways scroll
// and no page or console errors. Then the whole round, by keyboard where it matters:
//   import the sample (two bad rows: one fixed in the grid, one skipped, said before anything is imported);
//   edit a cell by keyboard; Submit with receipts missing lists them in an ErrorSummary whose links focus each Receipt
//   cell; attach receipts through the row's Sheet; Submit with its response lost is read back, one submit request;
//   the manager returning the report mid-edit: the edit is kept and saved, an Alert gives the reason, the plate says
//   Returned; as the manager, Return needs a reason and the outcome takes focus; resubmitted, Approve while slow is
//   busy only while in flight, and the outcome replaces the choice and takes focus.
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { buildExamples } from '../../scripts/build-examples.mjs';

let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const out = fileURLToPath(new URL('../test/examples/', import.meta.url));
await buildExamples(out, { only: ['expense-reports'] });
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const wait = (page, ms) => page.waitForTimeout(ms);

const fresh = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  await page.goto(`file://${out}expense-reports.html`); await wait(page, 900);
  return { ctx, page, errors };
};
const drawer = async (page) => { const t = page.locator('.ex-drawer .alt-acc-trigger'); if ((await t.getAttribute('aria-expanded')) !== 'true') await t.click(); await wait(page, 200); };
const mode = async (page, label) => { await drawer(page); await page.locator('.ex-drawer label.alt-radio').filter({ has: page.locator('.alt-check-label', { hasText: new RegExp(`^${label}$`) }) }).click(); await wait(page, 60); };
const event = async (page, label) => { await drawer(page); await page.locator('.ex-drawer button', { hasText: label }).click(); await wait(page, 900); };
const viewAs = async (page, who) => { await drawer(page); await page.locator('.ex-drawer [role="tab"]', { hasText: who }).click(); await wait(page, 400); };
const look = (page) => page.evaluate(() => ({
  h1: document.querySelectorAll('.ex-app h1').length,
  primaries: [...document.querySelectorAll('.ex-app .alt-btn[data-variant="primary"]')].filter((b) => b.getClientRects().length && !b.closest('[role="dialog"]')).length,
  sideways: document.documentElement.scrollWidth > window.innerWidth,
}));
const logCount = (page, op) => page.evaluate((op) => [...document.querySelectorAll('.ex-log-row')].filter((r) => r.querySelector('.ex-log-op')?.textContent === op).length, op);
const focusedId = (page) => page.evaluate(() => document.activeElement?.id || document.activeElement?.closest('[id]')?.id || '');
const cell = (page, rowId, key) => page.locator(`#er-${rowId}-${key}`);
const plate = (page) => page.locator('.er .alt-page-head .alt-badge, .er header .alt-badge').first().textContent().catch(() => '');
const primary = (page, name) => page.locator('.ex-app .alt-btn[data-variant="primary"]', { hasText: name });

// ---- Renders ------------------------------------------------------------------------------------------------------
for (const [scheme, width] of [['light', 1280], ['dark', 1280], ['light', 375]]) {
  const { ctx, page, errors } = await fresh({ colorScheme: scheme, viewport: { width, height: 900 }, ...(width < 500 ? { isMobile: true, hasTouch: true } : {}) });
  const steps = [await look(page)];
  await page.getByRole('button', { name: /Use the sample file/ }).click(); await wait(page, 300); steps.push(await look(page));
  await page.getByRole('button', { name: 'Continue' }).click(); await wait(page, 300); steps.push(await look(page));
  await page.getByRole('button', { name: 'Continue' }).click(); await wait(page, 300); steps.push(await look(page));
  await page.getByRole('button', { name: /^Import \d+ transactions$/ }).click(); await wait(page, 1200); steps.push(await look(page));
  expect(steps.every((s) => s.h1 === 1 && s.primaries <= 1 && !s.sideways), `${scheme} ${width}: every step has one h1, at most one primary, no sideways scroll (${JSON.stringify(steps)})`);
  await viewAs(page, 'Dana Kim'); const m = await look(page); await viewAs(page, 'Sam Okafor');
  expect(m.h1 === 1 && !m.sideways, `${scheme} ${width}: the manager's view renders (${JSON.stringify(m)})`);
  expect(!errors.length, `${scheme} ${width}: no page or console errors (${errors.slice(0, 2).join('; ')})`);
  await ctx.close();
}

// ---- Forced colours, reduced motion and more contrast --------------------------------------------------------------
{
  const { ctx, page, errors } = await fresh({ forcedColors: 'active', reducedMotion: 'reduce' });
  await drawer(page); await page.locator('.ex-drawer label', { hasText: 'More contrast' }).click(); await wait(page, 200);
  await page.getByRole('button', { name: /Use the sample file/ }).click(); await wait(page, 300);
  await page.getByRole('button', { name: 'Continue' }).click(); await wait(page, 400);
  expect(await page.locator('[data-contrast="more"]').count() > 0 && await page.locator('[role="gridcell"][aria-invalid="true"]').count() === 2, 'forced colours, reduced motion and more contrast render the Fix step');
  expect(!errors.length, `forced colours: no page or console errors (${errors.slice(0, 2).join('; ')})`);
  await ctx.close();
}

// ---- The whole round ------------------------------------------------------------------------------------------------
const { ctx, page, errors } = await fresh();

// Import: fix one bad row in the grid by keyboard; the other is skipped, and Review says so.
await page.getByRole('button', { name: /Use the sample file/ }).click(); await wait(page, 300);
expect(/Every field you need is mapped/.test(await page.locator('.er-step').textContent()), 'import: the columns are mapped from their headers');
await page.getByRole('button', { name: 'Continue' }).click(); await wait(page, 300);
expect(/2 rows have problems/.test(await page.locator('.er-step').textContent()), 'import: the two bad rows are found before anything is imported');
const amount = page.locator('[role="grid"] [role="gridcell"][aria-invalid="true"]').filter({ hasText: 'thirty-eight' });
await amount.click(); await page.keyboard.type('38.00'); await page.keyboard.press('Enter'); await wait(page, 300); // typing on a cell replaces it
expect(/1 row has a problem/.test(await page.locator('.er-step').textContent()), 'import: fixing a cell in place clears its problem');
await page.getByRole('button', { name: 'Continue' }).click(); await wait(page, 300);
const review = await page.locator('.er-lead').textContent();
expect(/^Import 11 transactions\. 1 row will be skipped: row 12 \(a date that isn’t a date\)\.$/.test(review), `import: the review names the outcome (${review})`);
await page.getByRole('button', { name: 'Import 11 transactions' }).click(); await wait(page, 1200);
{ const n = await page.locator('[role="gridcell"][id$="-receipt"]').count(); expect(n === 11, `import: the grid has the 11 transactions (${n} rows)`); }
expect(/Draft/.test(await plate(page)), `the report is a draft (${await plate(page)})`);

// Edit a cell by keyboard.
await cell(page, 't-r2', 'merchant').focus(); await page.keyboard.press('F2'); await page.keyboard.press('End'); await page.keyboard.type(' (team dinner)'); await page.keyboard.press('Enter'); await wait(page, 900);
expect(/Dishoom Shoreditch \(team dinner\)/.test(await cell(page, 't-r2', 'merchant').textContent()) && await logCount(page, 'transaction.update') === 1, 'grid: a cell edited by keyboard is saved');

// Submit with receipts missing: an ErrorSummary, whose links focus each Receipt cell and make it active.
await primary(page, 'Submit report').click(); await wait(page, 300);
const summary = page.getByRole('region', { name: 'Before you submit' });
expect(await summary.count() === 1 && await summary.getByRole('link').count() === 11 && await logCount(page, 'report.submit') === 0, 'submit: missing receipts are listed, and nothing is sent');
await summary.getByRole('link').nth(2).click(); await wait(page, 200);
expect(await focusedId(page) === 'er-t-r2-receipt', `submit: a summary link focuses its Receipt cell (${await focusedId(page)})`);

// Attach receipts through the Sheet: Enter on the Receipt cell.
const ids = await page.evaluate(() => [...document.querySelectorAll('[role="gridcell"][id$="-receipt"]')].map((c) => c.id.replace(/^er-/, '').replace(/-receipt$/, '')));
for (const id of ids) {
  await cell(page, id, 'receipt').focus(); await page.keyboard.press('Enter'); await wait(page, 350);
  const sheet = page.getByRole('dialog');
  if (!(await sheet.isVisible())) { expect(false, `receipt: Enter on ${id}'s Receipt cell opens the Sheet`); break; }
  await sheet.getByRole('button', { name: 'Use a sample photo' }).click(); await wait(page, 700);
}
const attached = await page.evaluate(() => [...document.querySelectorAll('[role="gridcell"][id$="-receipt"]')].every((c) => /receipt-.*\.jpg/.test(c.textContent)));
expect(attached && await page.getByRole('dialog').count() === 0, 'receipt: each was attached through its Sheet, and the Sheet closed');
expect(await focusedId(page) === `er-${ids[ids.length - 1]}-receipt`, `receipt: focus returns to the cell (${await focusedId(page)})`);

// Submit with its response lost: read back, landed as submitted, one submit request.
await mode(page, 'Lose the response');
await primary(page, 'Submit report').click();
await page.waitForFunction(() => /Submitted|wasn’t submitted|couldn’t check/.test(document.querySelector('.er')?.textContent ?? ''), null, { timeout: 10000 }).catch(() => undefined);
expect(/Submitted/.test(await plate(page)) && await logCount(page, 'report.submit') === 1, `submit: a lost response is read back and submitted once (${await plate(page)}, ${await logCount(page, 'report.submit')} requests)`);
await mode(page, 'Succeed');

// Returned while the employee is still editing: the edit is kept and saved, and the reason is shown.
await event(page, 'Dana Kim returns the report');
await cell(page, 't-r0', 'merchant').focus(); await page.keyboard.press('F2'); await page.keyboard.press('End'); await page.keyboard.type(' (return)'); await page.keyboard.press('Enter'); await wait(page, 1500);
expect(/Aer Lingus DUB-LHR \(return\)/.test(await cell(page, 't-r0', 'merchant').textContent()), 'returned mid-edit: the edit is kept and saved');
const alert = await page.locator('.er .alt-alert').first().textContent().catch(() => '');
expect(/Dana Kim returned this report/.test(alert) && /itemised receipt/.test(alert) && /Your edits are kept/.test(alert), `returned mid-edit: an Alert gives her reason (${alert})`);
expect(/Returned/.test(await plate(page)), `returned mid-edit: the plate says Returned (${await plate(page)})`);

// Resubmit, then as the manager: Return needs a reason; the outcome takes focus.
await primary(page, 'Submit report').click(); await wait(page, 900);
await viewAs(page, 'Dana Kim');
expect(/Approve Sam Okafor’s October 2026 expenses/.test(await page.locator('.ex-app h1').textContent()), 'manager: the question is the title');
await page.getByRole('button', { name: 'Return to Sam' }).click(); await wait(page, 200);
expect(await focusedId(page) === 'er-reason', 'manager: Return asks its reason in place, focused');
await primary(page, 'Return to Sam').click(); await wait(page, 300);
expect(/Say why/.test(await page.locator('.er-choice').textContent()) && await logCount(page, 'report.decide') === 0, 'manager: returning without a reason says why, and sends nothing');
await page.keyboard.type('Please split the Clayton bill into room and meals.');
await primary(page, 'Return to Sam').click(); await wait(page, 900);
{ const t = await page.locator('.er-choice').textContent(); const f = await page.evaluate(() => document.activeElement?.className + '|' + document.activeElement?.tagName); expect(/Returned to Sam by Dana Kim/.test(t) && /er-choice/.test(f), `manager: the outcome replaces the choice and takes focus (${t.slice(0, 80)} / ${f})`); }

// Back to Sam: resubmit; Dana approves while slow.
await viewAs(page, 'Sam Okafor');
expect(/Please split the Clayton bill/.test(await page.locator('.er').textContent()), 'employee: the reason is on the returned report');
await primary(page, 'Submit report').click(); await wait(page, 900);
await viewAs(page, 'Dana Kim');
await mode(page, 'Slow');
await primary(page, 'Approve').click(); await wait(page, 500);
expect(await primary(page, 'Approve').getAttribute('aria-busy') === 'true' || await primary(page, 'Approve').getAttribute('data-loading') !== null, 'manager: Approve is busy while slow');
await page.waitForFunction(() => /Approved by Dana Kim/.test(document.querySelector('.er-choice')?.textContent ?? ''), null, { timeout: 8000 });
expect(await page.evaluate(() => document.activeElement?.classList.contains('er-choice')) && await logCount(page, 'report.decide') === 2, 'manager: approved, the outcome takes focus, two decisions in all');
await mode(page, 'Succeed');
await viewAs(page, 'Sam Okafor');
expect(/Approved/.test(await plate(page)) && /Approved by Dana Kim/.test(await page.locator('.er-stamp').textContent()) && await page.locator('[role="gridcell"][aria-readonly="false"]').count() === 0, 'employee: approved, stamped, and nothing can be edited');
expect(!errors.length, `no page or console errors (${errors.slice(0, 2).join('; ')})`);
await ctx.close();

await browser.close();
console.log(`Expense reports example: ${pass} passed, ${fail} failed.`);
if (fail) process.exit(1);
