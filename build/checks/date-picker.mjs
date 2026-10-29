// DatePicker, DateRangePicker and Calendar keyboard paths (APG date picker dialog). ALT_FIXTURE_ROOT selects React 19 fixtures.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { fixturePath } from './fixture-path.mjs';

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const errors = [];
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); passed++; };
const open = async ({ scheme = 'daylight', width = 960 } = {}) => {
  const page = await browser.newPage({ viewport: { width, height: 760 }, locale: 'en-GB' });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  await page.goto(`file://${fixturePath('DatePicker', scheme)}`);
  page.setDefaultTimeout(5000);
  await page.waitForTimeout(400);
  return page;
};
const field = (page, label) => page.locator('.alt-field', { has: page.getByText(label, { exact: true }) });
const segs = (page, label) => field(page, label).locator('.alt-date-seg');
const text = async (page, label) => (await segs(page, label).allTextContents()).join('/');
const focusedDate = page => page.evaluate(() => document.activeElement?.dataset?.date);
const inGrid = page => page.waitForFunction(() => !!document.activeElement?.dataset?.date);
const iso = (t) => t.toISOString().slice(0, 10);
const shift = (d, n) => { const [y, m, dd] = d.split('-').map(Number); return iso(new Date(Date.UTC(y, m - 1, dd + n))); };

try {
  { const page = await open();
    const today = await page.evaluate(() => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; });
    const due = shift(today, 3);
    // The preview opens the Due date calendar: focus is on the chosen day, which wears the mark.
    check(await page.getByRole('dialog', { name: 'Choose date' }).isVisible() && await focusedDate(page) === due, 'DP-01 the open calendar focuses the chosen day');
    const grid = page.getByRole('grid');
    check(await grid.locator('button[tabindex="0"]').count() === 1, 'DP-02 only one day is in the Tab sequence');
    const mark = await page.evaluate(() => { const m = document.querySelector('.alt-cal-mark'), d = document.querySelector('.alt-cal-day[data-chosen]'); const a = m.getBoundingClientRect(), b = d.getBoundingClientRect(); return Math.abs(a.left - b.left) < 2 && Math.abs(a.top - b.top) < 2 && getComputedStyle(m).opacity === '1'; });
    check(mark, 'DP-03 the raised mark sits on the chosen day');
    // Near a month's end the chosen day (today + 3) opens the next month, so read today's name from a second page turned back one month.
    let name;
    if (await page.locator(`[data-date="${today}"]`).count()) name = await page.locator(`[data-date="${today}"]`).getAttribute('aria-label');
    else { const back = await open(); await back.keyboard.press('PageUp'); name = await back.locator(`[data-date="${today}"]`).getAttribute('aria-label'); await back.close(); }
    check(/, today/.test(name) && /\d{4}/.test(name), `DP-04 a day's name is the full date and says today (${name})`);
    await page.keyboard.press('ArrowRight'); check(await focusedDate(page) === shift(due, 1), 'DP-05 → moves one day');
    await page.keyboard.press('ArrowDown'); check(await focusedDate(page) === shift(due, 8), 'DP-06 ↓ moves one week');
    await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowLeft'); check(await focusedDate(page) === due, 'DP-07 ↑ and ← move back');
    await page.keyboard.press('Home'); const home = await focusedDate(page);
    // The preview's min is today, so a week start before today clamps to today.
    const monday = shift(due, -((new Date(due + 'T00:00:00Z').getUTCDay() + 6) % 7));
    check(home === (monday < today ? today : monday), `DP-08 Home goes to the week start (Monday, en-GB), or to min (${home})`);
    await page.keyboard.press('End'); check(new Date((await focusedDate(page)) + 'T00:00:00Z').getUTCDay() === 0, 'DP-09 End goes to the week end');
    await page.keyboard.press('PageDown'); const next = await focusedDate(page);
    check(next.slice(5, 7) !== home.slice(5, 7) || next.slice(0, 4) !== home.slice(0, 4), 'DP-10 PageDown moves a month');
    const heading = await page.locator('.alt-cal-title').textContent();
    await page.keyboard.press('Shift+PageDown'); check(Number((await focusedDate(page)).slice(0, 4)) === Number(next.slice(0, 4)) + 1 && await page.locator('.alt-cal-title').getAttribute('aria-live') === 'polite' && heading !== await page.locator('.alt-cal-title').textContent(), 'DP-11 Shift+PageDown moves a year and the heading (a live region) follows');
    // Find a weekday next year and a weekend day: weekends are unavailable here.
    let target = await focusedDate(page);
    while ([0, 6].includes(new Date(target + 'T00:00:00Z').getUTCDay())) { await page.keyboard.press('ArrowRight'); target = await focusedDate(page); }
    await page.keyboard.press('Enter');
    await page.getByRole('dialog', { name: 'Choose date' }).waitFor({ state: 'detached' });
    const [y, m, d] = target.split('-');
    check(await text(page, 'Due date') === `${d}/${m}/${y}`, 'DP-12 Enter chooses the day and fills the field');
    check(await page.getByRole('button', { name: 'Choose date' }).first().evaluate(el => el === document.activeElement), 'DP-13 choosing returns focus to the field’s calendar button');
    check(await field(page, 'Due date').locator('.alt-input[data-filled]').count() === 1, 'DP-14 a held date fills the field');
    await page.keyboard.press('Enter'); await page.getByRole('dialog', { name: 'Choose date' }).waitFor(); await inGrid(page);
    check(await focusedDate(page) === target, 'DP-15 reopening focuses the chosen day');
    let weekend = target; for (let i = 0; i < 7 && ![0, 6].includes(new Date(weekend + 'T00:00:00Z').getUTCDay()); i++) { await page.keyboard.press('ArrowRight'); weekend = await focusedDate(page); }
    check(await page.locator(`[data-date="${weekend}"]`).getAttribute('aria-disabled') === 'true' && /unavailable/.test(await page.locator(`[data-date="${weekend}"]`).getAttribute('aria-label')), 'DP-16 unavailable days say so');
    await page.keyboard.press('Enter'); check(await page.getByRole('dialog', { name: 'Choose date' }).isVisible(), 'DP-17 an unavailable day can’t be chosen');
    await page.keyboard.press('Escape'); await page.getByRole('dialog', { name: 'Choose date' }).waitFor({ state: 'detached' });
    check(await text(page, 'Due date') === `${d}/${m}/${y}` && await page.getByRole('button', { name: 'Choose date' }).first().evaluate(el => el === document.activeElement), 'DP-18 Escape closes without a change and returns focus');
    // RTL: arrows mirror.
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
    await page.keyboard.press('Enter'); await page.getByRole('dialog', { name: 'Choose date' }).waitFor(); await inGrid(page);
    await page.keyboard.press('ArrowLeft'); check(await focusedDate(page) === shift(target, 1), 'DP-19 in RTL, ← moves to the next day');
    await page.keyboard.press('Escape'); await page.evaluate(() => { document.documentElement.dir = 'ltr'; });
    await page.close(); }

  { const page = await open(); await inGrid(page); await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'detached' });
    const us = segs(page, 'Start date (US format)');
    check(JSON.stringify(await us.evaluateAll(els => els.map(e => e.getAttribute('aria-label')))) === '["Month","Day","Year"]', 'DP-20 the segments follow the locale (en-US: month, day, year)');
    check(await us.first().getAttribute('role') === 'spinbutton' && await us.first().getAttribute('aria-valuetext') === 'Empty', 'DP-21 segments are spinbuttons, empty until typed');
    await us.first().focus(); await page.keyboard.type('2252026');
    check(await text(page, 'Start date (US format)') === '02/25/2026', 'DP-22 typing digits fills and advances the segments');
    check(await field(page, 'Start date (US format)').locator('.alt-input[data-filled]').count() === 1, 'DP-23 a complete date fills the field');
    await us.nth(1).focus(); await page.keyboard.press('ArrowUp');
    check(await text(page, 'Start date (US format)') === '02/26/2026', 'DP-24 ↑ steps a segment');
    await page.keyboard.type('31');
    check(await field(page, 'Start date (US format)').locator('.alt-date-error').textContent() === 'Enter a real date.' && await field(page, 'Start date (US format)').locator('.alt-input[data-filled]').count() === 0, 'DP-25 an impossible date (31 Feb) is an error, not a value');
    await us.nth(1).focus(); await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace');
    check((await us.nth(1).textContent()) === 'DD', 'DP-26 Backspace clears a segment');
    await us.first().focus(); await page.keyboard.press('Alt+ArrowDown');
    check(await page.getByRole('dialog', { name: 'Choose date' }).isVisible(), 'DP-27 Alt+↓ on the field opens the calendar');
    await page.keyboard.press('Escape');
    await page.close(); }

  { const page = await open(); await inGrid(page); await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'detached' });
    await field(page, 'Trip').getByRole('button', { name: 'Choose dates' }).click();
    const dialog = page.getByRole('dialog', { name: 'Choose dates' }); await dialog.waitFor(); await inGrid(page);
    check(await dialog.locator('[aria-selected="true"]').count() >= 2, 'DP-28 the range is selected across its days');
    const start = await focusedDate(page);
    await page.keyboard.press('Enter');
    check(await dialog.getByText('Choose the end date').isVisible(), 'DP-29 after the start, the panel asks for the end');
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    check(await page.locator('.alt-cal-day[data-span]').count() === 3, 'DP-30 moving previews the span (feedforward)');
    await page.keyboard.press('Enter'); await dialog.waitFor({ state: 'detached' });
    const [, sm, sd] = start.split('-'); const end = shift(start, 2); const [, em, ed] = end.split('-');
    const segsText = (await segs(page, 'Trip').allTextContents());
    check(segsText[0] === sd && segsText[1] === sm && segsText[3] === ed && segsText[4] === em, 'DP-31 two choices fill the start and end');
    await page.close(); }

  for (const scheme of ['daylight', 'nightfall', 'mesa', 'alpine']) for (const width of [320, 960]) {
    const page = await open({ scheme, width });
    for (const mode of ['standard', 'reduced-motion', 'forced-colors', 'increased-contrast']) {
      await page.emulateMedia({ reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference', forcedColors: mode === 'forced-colors' ? 'active' : 'none' });
      await page.locator('.alt-root').evaluate((root, more) => { root.dataset.contrast = more ? 'more' : 'system'; }, mode === 'increased-contrast');
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${scheme}/${width}/${mode}: no horizontal scrolling with the calendar open`);
    }
    await page.close();
  }
  check(errors.length === 0, `no page or console errors: ${errors.join('\n')}`);
  console.log(`DatePicker: ${passed} passed, 0 failed`);
} finally { await browser.close(); }
