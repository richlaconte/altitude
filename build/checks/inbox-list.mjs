// InboxList (#468): a listbox with one tab stop; ↑/↓ move without opening, Enter opens, a letter jumps by title. Each
// row is named in a fixed order ("Unread. <title> from <from> <status> <time> <viewers>") with its preview as its
// description. A new row arrives with the afterglow and is announced politely, and the row you're on (focused, or under
// the pointer) keeps its place on screen. axe is clean. Opens the InboxList preview; run after a render of every preview.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';
import { fixturePath } from './fixture-path.mjs';
import { openFixtures } from './preview-fixtures.mjs';
const require = createRequire(import.meta.url);

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const errors = [];
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); passed++; };
const focusedTitle = (page) => page.evaluate(() => document.activeElement?.closest('[role="option"]')?.querySelector('.alt-inbox-title')?.textContent ?? document.activeElement?.tagName);
const top = (page, title) => page.evaluate((t) => [...document.querySelectorAll('[role="option"]')].find((o) => o.querySelector('.alt-inbox-title')?.textContent === t)?.getBoundingClientRect().top, title);
// The fixture button, pressed without moving focus out of the list (as a ticket arriving from the server would).
const deliver = (page) => page.evaluate(() => [...document.querySelectorAll('.preview-fixtures button')].find((b) => /Deliver a new ticket/.test(b.textContent)).click());

try {
  for (const scheme of ['daylight', 'nightfall']) {
    const page = await browser.newPage({ viewport: { width: 960, height: 760 } });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
    await page.goto(`file://${fixturePath('InboxList', scheme)}`);
    page.setDefaultTimeout(5000);
    await openFixtures(page);

    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const axe = await page.evaluate(() => window.axe.run(document.querySelector('.ibx'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    check(axe.violations.length === 0, `${scheme}: axe is clean (${axe.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`).join(', ')})`);

    const list = page.getByRole('listbox', { name: 'Tickets: Mine' });
    check(await list.getByRole('option', { name: 'Unread. Refund for order 4471 from Priya Natarajan Open 4 minutes ago Maya Chen is viewing.' }).count() === 1, `${scheme}: a row is named in order, unread first`);
    check(await list.getByRole('option', { name: 'Change the delivery address from Hana Kobayashi Pending 1 hour ago', selected: true }).count() === 1, `${scheme}: the open row is selected and named without "Unread"`);
    const desc = await page.evaluate(() => { const o = document.querySelector('[role="option"]'); return document.getElementById(o.getAttribute('aria-describedby'))?.textContent; });
    check(/cracked jug/.test(desc), `${scheme}: the preview is the row's description`);
    check(await page.locator('[role="option"][tabindex="0"]').count() === 1 && await page.locator('[role="option"][aria-selected="true"]').getAttribute('tabindex') === '0', `${scheme}: one tab stop, on the open row`);

    // Arrows move without opening; Enter opens; type-ahead.
    await page.locator('[role="option"][tabindex="0"]').focus();
    await page.keyboard.press('ArrowDown');
    check(await focusedTitle(page) === 'Invoice for March' && /Change the delivery address/.test(await page.locator('.ibx-detail h2').textContent()), `${scheme}: ↓ moves focus and doesn't open (${await focusedTitle(page)})`);
    await page.keyboard.press('Enter');
    check(/Invoice for March/.test(await page.locator('.ibx-detail h2').textContent()) && await page.locator('[role="option"][aria-selected="true"] .alt-inbox-title').textContent() === 'Invoice for March', `${scheme}: Enter opens`);
    await page.keyboard.press('Home');
    check(await focusedTitle(page) === 'Refund for order 4471', `${scheme}: Home goes to the first row`);
    await page.keyboard.press('w');
    check(await focusedTitle(page) === 'Wrong size sent', `${scheme}: a letter jumps to the next title starting with it (${await focusedTitle(page)})`);
    await page.keyboard.press('End');
    check(await focusedTitle(page) === 'Gift message missing', `${scheme}: End goes to the last row`);

    // An arrival while a row is focused: focus stays, the row stays where it was on screen, the new row glows and is said.
    await page.keyboard.press('ArrowUp');
    const before = await top(page, 'Wrong size sent');
    await deliver(page);
    await page.waitForFunction(() => document.querySelectorAll('[role="option"]').length === 7);
    const after = await top(page, 'Wrong size sent');
    check(await focusedTitle(page) === 'Wrong size sent' && Math.abs(after - before) <= 1, `${scheme}: an arrival leaves focus and the focused row in place (${before} → ${after})`);
    check(await page.locator('[role="option"]').first().getAttribute('data-settle') !== null, `${scheme}: the new row arrives with the afterglow`);
    await page.waitForTimeout(100);
    const said = await page.locator('.alt-inbox + .alt-sr[aria-live="polite"]').textContent();
    check(said === 'New: Discount code not working, from Aiyana Redcloud.', `${scheme}: the arrival is said politely (${said})`);

    // Under the pointer, with focus elsewhere: the hovered row stays put too.
    await page.evaluate(() => document.activeElement.blur());
    const row = page.locator('[role="option"]', { hasText: 'Invoice for March' });
    await row.hover();
    const hb = await top(page, 'Invoice for March');
    await deliver(page);
    await page.waitForFunction(() => document.querySelectorAll('[role="option"]').length === 8);
    { const ha = await top(page, 'Invoice for March'); check(Math.abs(ha - hb) <= 1, `${scheme}: an arrival doesn't move the row under the pointer (${hb} → ${ha})`); }

    // Forced colours: the open row has a border.
    await page.emulateMedia({ forcedColors: 'active' });
    const border = await page.locator('[role="option"][aria-selected="true"]').evaluate((el) => getComputedStyle(el).borderTopStyle);
    check(border === 'solid', `${scheme}: forced colours draw the open row's border`);
    await page.close();
  }
  check(errors.length === 0, `no page or console errors: ${errors.join('\n')}`);
  console.log(`InboxList: ${passed} passed, 0 failed`);
} finally { await browser.close(); }
