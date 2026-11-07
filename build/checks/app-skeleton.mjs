// App skeleton: the shell is on the ground; every view has exactly one primary action; the sidebar is reachable and
// usable by keyboard; the list filters, pages and selects; a row opens its record in a Sheet whose PropertyList edits it,
// and Escape returns focus to the row; settings changes raise the SaveBar; nothing logs a page error. Run after a render
// of every preview (it opens test/p-AppSkeleton-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 760 } });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`file://${T}p-AppSkeleton-daylight.html`);
await page.waitForTimeout(500);
const primaries = () => page.evaluate(() => [...document.querySelectorAll('.alt-btn[data-variant="primary"]')].filter((b) => b.getClientRects().length && !b.closest('[role="dialog"], .alt-savebar')).map((b) => b.textContent));

expect(await page.evaluate(() => { const s = getComputedStyle(document.querySelector('.alt-sidebar')); return s.boxShadow === 'none' && s.backgroundColor === getComputedStyle(document.querySelector('.alt-sidebar').closest('.alt-app-shell') || document.body).backgroundColor; }), 'the shell is on the ground: no shadow, the ground colour');
expect((await primaries()).join() === 'Add customer', `the customers view has one primary (${await primaries()})`);
const names = () => page.locator('[aria-label="Customers"] tbody tr td:nth-child(2)').allTextContents();
const first = await names();
await page.getByRole('button', { name: 'Next page' }).click();
await page.waitForTimeout(300);
expect((await names())[0] !== first[0], 'the list pages');
await page.getByRole('button', { name: 'Previous page' }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Add filter' }).click();
await page.getByRole('option', { name: 'Plan' }).click();
await page.getByRole('dialog', { name: 'Plan is' }).waitFor();
await page.getByRole('option', { name: 'Business' }).click();
await page.waitForTimeout(300);
const rows = await page.locator('[aria-label="Customers"] tbody tr').allTextContents();
expect(rows.length === 4 && rows.every((r) => r.includes('Business')), `the filter narrows the list (${rows.length})`);
await page.locator('[aria-label="Customers"] tbody tr').first().getByRole('checkbox').check({ force: true });
await page.waitForTimeout(200);
expect(await page.getByRole('button', { name: 'Email 1' }).count() === 1, 'selecting a row offers its action with a count');

const row = page.getByRole('button', { name: 'Alan Turing' });
await row.click();
await page.waitForTimeout(600);
const sheet = page.getByRole('dialog', { name: 'Alan Turing' });
expect(await sheet.count() === 1 && await sheet.locator('.alt-property-list .alt-property').count() === 3, 'a row opens its record in a Sheet with its properties');
await page.keyboard.press('Escape');
await page.waitForTimeout(600);
expect(await page.evaluate(() => document.activeElement.textContent) === 'Alan Turing', 'closing the sheet returns focus to the row');

// Adversarial DOM probe: the opener disappears while its detail is open. This isolates focus recovery,
// not a backend delete. The application must name a logical fallback after Sheet releases isolation.
await row.focus();
await page.keyboard.press('Enter');
await sheet.waitFor();
await row.evaluate((el) => el.remove());
await page.keyboard.press('Escape');
await page.waitForTimeout(600);
expect(await page.evaluate(() => document.activeElement.id) === 'sk-customers-title', 'a removed source returns focus to the Customers heading');

await page.getByRole('link', { name: 'Settings' }).focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
expect(await page.getByRole('heading', { name: 'Settings', exact: true }).count() === 1 && await page.getByRole('link', { name: 'Settings' }).getAttribute('aria-current') === 'page', 'the sidebar navigates by keyboard');
expect((await primaries()).length <= 1, `the settings view has at most one primary (${await primaries()})`);
await page.getByLabel('Workspace name').fill('Hollis Legal Group');
await page.waitForTimeout(900);
expect(await page.evaluate(() => { const b = document.querySelector('.alt-savebar'); return !!b && b.dataset.state !== 'closed'; }), 'a settings change raises the SaveBar');
expect(errors.length === 0, `no page errors (${errors.join('; ')})`);

// The same customer remains identified after a field change. Long/narrow cases are layout probes:
// injected history does not claim the bounded fixture has a history service or that a long Sheet is preferred.
for (const scheme of ['daylight', 'nightfall']) for (const width of [960, 320]) for (const reduced of [false, true]) {
  const probe = await browser.newPage({ viewport: { width, height: 760 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const probeErrors = []; probe.on('pageerror', e => probeErrors.push(e.message));
  await probe.goto(`file://${T}p-AppSkeleton-${scheme}.html`);
  const source = probe.getByRole('button', { name: 'Ada Lovelace', exact: true });
  await source.waitFor(); await source.focus();
  const layout = await probe.locator('[aria-label="Customers"]').evaluate(e => ({ width: e.clientWidth, height: e.clientHeight }));
  await probe.keyboard.press('Enter');
  const detail = probe.getByRole('dialog', { name: 'Ada Lovelace', exact: true });
  await detail.waitFor();
  expect(await detail.getAttribute('aria-modal') === 'true', `${scheme}/${width}/${reduced}: bounded edit keeps modal Sheet semantics`);
  expect(await detail.locator('.alt-sheet-desc').textContent() === 'Customer c0 · ada@example.com', `${scheme}/${width}/${reduced}: detail repeats stable customer identity`);
  const unchanged = await probe.locator('[aria-label="Customers"]').evaluate((e, before) => e.clientWidth === before.width && e.clientHeight === before.height, layout);
  expect(unchanged, `${scheme}/${width}/${reduced}: opening does not reflow the table`);
  const seats = detail.locator('.alt-property').filter({ hasText: 'Seats' });
  await seats.getByRole('button').first().click();
  await seats.getByRole('textbox').fill('41');
  await seats.getByRole('textbox').press('Enter');
  await probe.waitForTimeout(650);
  expect(await detail.locator('.alt-sheet-title').textContent() === 'Ada Lovelace' && /41/.test(await seats.textContent()), `${scheme}/${width}/${reduced}: changed property stays bound to the same named source`);
  await detail.locator('.alt-sheet-inner').evaluate(el => {
    const history = document.createElement('section'); history.setAttribute('aria-label', 'Long-content layout probe');
    for (let n = 1; n <= 24; n++) { const p = document.createElement('p'); p.textContent = `History entry ${n}: the account owner reviewed the plan and confirmed the current seat allocation.`; history.append(p); }
    el.append(history);
  });
  await detail.locator('.alt-sheet-scroll').evaluate(el => { el.scrollTop = el.scrollHeight; });
  await probe.waitForTimeout(100);
  const metrics = await detail.evaluate(el => { const scroll = el.querySelector('.alt-sheet-scroll'); const r = el.getBoundingClientRect(); return { scrollable: scroll.scrollHeight > scroll.clientHeight, atEnd: scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 2, width: el.scrollWidth <= el.clientWidth + 1, fits: r.left >= 0 && r.right <= innerWidth + 1 }; });
  expect(metrics.scrollable && metrics.atEnd && metrics.width && metrics.fits, `${scheme}/${width}/${reduced}: long detail scrolls vertically and fits (${JSON.stringify(metrics)})`);
  await detail.getByRole('button', { name: 'Close', exact: true }).focus();
  const closeVisible = await detail.getByRole('button', { name: 'Close', exact: true }).evaluate(el => { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return r.top >= 0 && r.bottom <= innerHeight && (hit === el || el.contains(hit)); });
  expect(closeVisible, `${scheme}/${width}/${reduced}: keyboard Close stays visible after scrolling long content`);
  if ((scheme === 'nightfall' && width === 320 && reduced) || (scheme === 'daylight' && width === 960 && !reduced)) await probe.screenshot({ path: `${T}detail-long-${scheme}-${width}.png`, fullPage: true });
  await probe.keyboard.press('Enter');
  // The record title unmounts at close-start, before Sheet releases its exit lock. Wait for the actual panel.
  await probe.locator('.alt-sheet').waitFor({ state: 'detached' });
  expect(await source.evaluate(el => el === document.activeElement), `${scheme}/${width}/${reduced}: close returns to the source after long content`);
  expect((await probe.locator('[data-row="c0"]').textContent()).includes('41'), `${scheme}/${width}/${reduced}: accepted update appears on the same source row`);
  expect(!probeErrors.length, `${scheme}/${width}/${reduced}: no page errors (${probeErrors.join('; ')})`);
  if (scheme === 'nightfall' && width === 320 && reduced) await probe.screenshot({ path: `${T}detail-source-narrow.png`, fullPage: true });
  await probe.close();
}

// A replaced DOM control can still represent the same stable source record.
await page.goto(`file://${T}p-AppSkeleton-daylight.html`);
const replaced = page.getByRole('button', { name: 'Ada Lovelace', exact: true });
await replaced.waitFor(); await replaced.focus(); await page.keyboard.press('Enter');
await page.getByRole('dialog', { name: 'Ada Lovelace' }).waitFor();
await replaced.evaluate(el => el.replaceWith(el.cloneNode(true)));
await page.keyboard.press('Escape');
await page.locator('.alt-sheet').waitFor({ state: 'detached' });
expect(await replaced.evaluate(el => el === document.activeElement), 'a replacement source control for the same customer ID receives focus');

// A newer meaningful focus destination wins over the missing-source fallback.
await page.goto(`file://${T}p-AppSkeleton-daylight.html`);
const removed = page.getByRole('button', { name: 'Ada Lovelace', exact: true });
await removed.waitFor(); await removed.focus(); await page.keyboard.press('Enter');
await page.getByRole('dialog', { name: 'Ada Lovelace' }).waitFor();
await removed.evaluate(el => el.remove());
await page.evaluate(() => {
  const target = [...document.querySelectorAll('a')].find(el => el.textContent === 'Settings');
  const next = new MutationObserver(() => { if (!target.closest('[inert]')) { target.focus(); next.disconnect(); } });
  next.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['inert'] });
});
await page.keyboard.press('Escape');
await page.waitForTimeout(600);
expect(await page.getByRole('link', { name: 'Settings', exact: true }).evaluate(el => el === document.activeElement), 'removed-source fallback preserves a newer meaningful focus destination');

console.log(`App skeleton: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
