// Schedule's month view (#559): the grid, its names, keyboard paths for every pointer operation, and the narrow list.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { fixturePath } from './fixture-path.mjs';

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const errors = [];
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); passed++; };
const open = async ({ scheme = 'daylight', width = 960 } = {}) => {
  const page = await browser.newPage({ viewport: { width, height: 900 }, locale: 'en-GB' });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  await page.goto(`file://${fixturePath('Schedule', scheme)}`);
  page.setDefaultTimeout(5000);
  await page.getByRole('radio', { name: 'Month' }).click();
  await page.locator('.alt-schedule-month').waitFor();
  return page;
};
const focused = page => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');
const dayOf = (page, id) => page.evaluate(id => document.querySelector(`[data-event="${id}"]`)?.closest('[data-mday]')?.dataset.mday, id);
const said = async (page, text) => {
  try { await page.waitForFunction(t => [...document.querySelectorAll('.alt-schedule-sr[aria-live]')].some(e => e.textContent.includes(t)), text); }
  catch { throw new Error(`Expected to hear “${text}”, heard: ${await page.evaluate(() => [...document.querySelectorAll('.alt-schedule-sr[aria-live]')].map(e => e.textContent).join(' | '))}`); }
  return true;
};

try {
  { const page = await open();
    const grid = page.getByRole('grid', { name: 'Room bookings' });
    check(await page.locator('.alt-schedule-period').textContent() === 'October 2026', 'SM-01 the month is the period');
    check(await grid.locator('[role="gridcell"]').count() === 35 && await grid.locator('[role="columnheader"]').count() === 7, 'SM-02 five weeks of seven days, each day a gridcell under its weekday');
    check(await grid.locator('[tabindex="0"]').count() === 1, 'SM-03 the grid is one Tab stop');
    const wed14 = page.locator('[data-mday="2026-10-14"]');
    check(await wed14.getAttribute('aria-label') === 'Wednesday 14 October, 4 events', 'SM-04 a day is named by its date and how many events it has');
    check(await page.evaluate(() => document.getElementById(document.querySelector('[data-mday="2026-10-14"]').getAttribute('aria-describedby')).textContent) === '4 h 30 min', 'SM-05 monthCell describes the day');
    check(await page.locator('[data-mday="2026-10-27"]').getAttribute('aria-current') === 'date', 'SM-06 today is aria-current="date"');
    check(await page.locator('[data-mday="2026-09-28"]').evaluate(el => el.hasAttribute('data-outside') && el.textContent.includes('Sep')), 'SM-07 a day outside the month says its month');
    check(await wed14.locator('[data-event]').count() === 3, 'SM-08 maxPerDay chips, in start order');
    check((await wed14.locator('[data-event]').allTextContents()).map(t => t.split(/\d/)[0]).join('|') === 'Onboarding|Vendor demo|Team lunch', 'SM-08b chips run in start order');
    check((await page.locator('[data-event="e1"]').getAttribute('aria-label')).startsWith('Standup, Room A, Monday 26 October, 09:00 to 09:30'), 'SM-09 a chip is named as a week event is');
    // Keyboard: days and weeks.
    await grid.locator('[tabindex="0"]').focus();
    check((await focused(page)).startsWith('Monday 26 October'), 'SM-10 focus starts on the day shown');
    await page.keyboard.press('ArrowRight'); check((await focused(page)).startsWith('Tuesday 27 October'), 'SM-11 → moves a day');
    await page.keyboard.press('ArrowUp'); check((await focused(page)).startsWith('Tuesday 20 October'), 'SM-12 ↑ moves a week');
    await page.keyboard.press('End'); check((await focused(page)).startsWith('Sunday 25 October'), 'SM-13 End goes to the row’s last day');
    await page.keyboard.press('Home'); check((await focused(page)).startsWith('Monday 19 October'), 'SM-14 Home goes to the row’s first day');
    await page.keyboard.press('PageDown'); await page.waitForFunction(() => document.querySelector('.alt-schedule-period').textContent === 'November 2026');
    check((await focused(page)).startsWith('Thursday 19 November'), 'SM-15 PageDown shows the next month, on the same date');
    await page.keyboard.press('PageUp'); await page.waitForFunction(() => document.querySelector('.alt-schedule-period').textContent === 'October 2026');
    check((await focused(page)).startsWith('Monday 19 October'), 'SM-16 PageUp comes back');
    // Into a day's chips and out again.
    await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    check((await focused(page)).startsWith('Wednesday 14 October'), 'SM-17 arrows reach a busy day');
    await page.keyboard.press('Enter'); check((await focused(page)).startsWith('Onboarding'), 'SM-18 Enter on a day with events goes to its first chip');
    await page.keyboard.press('ArrowDown'); check((await focused(page)).startsWith('Vendor demo'), 'SM-19 ↓ steps through the chips');
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
    check(await focused(page) === '1 more event on Wednesday 14 October', 'SM-20 "+N more" is a button named with the count and the day');
    await page.keyboard.press('Escape'); check((await focused(page)).startsWith('Wednesday 14 October'), 'SM-21 Escape goes back to the day');
    check(await grid.locator('[tabindex="0"]').count() === 1, 'SM-22 still one Tab stop');
    // Create on an empty day.
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
    const title = page.getByRole('textbox', { name: 'Event title' });
    await title.fill('Offsite'); await title.press('Enter');
    await said(page, 'Added Offsite, Thursday 15 October, 08:00 to 09:00');
    check(await page.locator('[data-mday="2026-10-15"] [data-event]').count() === 1, 'SM-23 Enter on an empty day makes an event from dayStart, defaultDuration long');
    // Carry by keyboard: by day and week, the time kept.
    await page.locator('[data-event="e5"]').focus(); await page.keyboard.press('Space');
    check(await page.locator('[data-event="e5"]').getAttribute('aria-pressed') === 'true', 'SM-24 Space picks a chip up');
    await page.keyboard.press('ArrowUp'); await said(page, 'Thursday 22 October, 15:00 to 16:00');
    check(await page.locator('[data-mday="2026-10-22"]').getAttribute('data-target') === '', 'SM-25 the target day sinks');
    await page.keyboard.press('Escape'); await said(page, 'Move cancelled');
    check(await dayOf(page, 'e5') === '2026-10-29', 'SM-26 Escape puts it back');
    await page.locator('[data-event="e5"]').focus(); await page.keyboard.press('Space'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Space');
    await said(page, 'Moved Interview to Wednesday 28 October, 15:00 to 16:00');
    check(await dayOf(page, 'e5') === '2026-10-28', 'SM-27 Space drops it on another day, at the same time');
    check((await focused(page)).startsWith('Interview'), 'SM-28 focus stays with the moved chip');
    // Locked and held.
    await page.locator('[data-event="e12"]').focus(); await page.keyboard.press('Space');
    await said(page, 'Quarterly plan is approved and can’t be changed');
    check(await page.locator('[data-event="e12"]').getAttribute('aria-pressed') === null, 'SM-29 a locked chip can’t be picked up');
    // Open and remove.
    await page.locator('[data-event="e9"]').focus(); await page.keyboard.press('Delete');
    check(await page.locator('[data-event="e9"]').count() === 0 && await page.locator('[data-event="e10"]').count() === 1, 'SM-30 Delete removes; the next chip comes into view');
    await page.close(); }

  { const page = await open();
    // Pointer: carry a chip to another day.
    const chip = await page.locator('[data-event="e1"]').boundingBox(), target = await page.locator('[data-mday="2026-10-20"]').boundingBox();
    await page.mouse.move(chip.x + 20, chip.y + 8); await page.mouse.down(); await page.mouse.move(chip.x + 30, chip.y + 20, { steps: 3 });
    await page.mouse.move(target.x + 40, target.y + 60, { steps: 6 });
    check(await page.locator('.alt-schedule[data-carrying]').count() === 1 && await page.locator('[data-mday="2026-10-20"][data-target]').count() === 1, 'SM-31 dragging a chip opens the days and sinks the one under it');
    await page.mouse.up();
    await said(page, 'Moved Standup to Tuesday 20 October, 09:00 to 09:30');
    check(await dayOf(page, 'e1') === '2026-10-20', 'SM-32 dropping moves it, keeping its time');
    // A locked chip can't be dragged.
    const lk = await page.locator('[data-event="e7"]').boundingBox();
    await page.mouse.move(lk.x + 20, lk.y + 8); await page.mouse.down(); await page.mouse.move(target.x + 40, target.y + 60, { steps: 6 });
    check(await page.locator('.alt-schedule[data-carrying]').count() === 0, 'SM-33 a locked chip doesn’t carry'); await page.mouse.up();
    // Double-click on an empty day makes an event.
    await page.locator('[data-mday="2026-10-21"]').dblclick({ position: { x: 60, y: 70 } });
    check(await page.getByRole('textbox', { name: 'Event title' }).evaluate(el => el === document.activeElement), 'SM-34 double-clicking a day starts a new event there');
    await page.keyboard.press('Escape');
    // "+N more" opens the day.
    await page.getByRole('button', { name: '1 more event on Wednesday 14 October' }).click();
    await page.waitForFunction(() => document.querySelector('.alt-schedule-period').textContent === 'Wednesday 14 October');
    check(true, 'SM-35 "+N more" calls onOpenDay');
    await page.close(); }

  // Paging and the row edges keep focus, and one Tab stop, inside the grid.
  { const page = await open();
    const grid = page.getByRole('grid', { name: 'Room bookings' });
    const period = t => page.waitForFunction(t => document.querySelector('.alt-schedule-period').textContent === t, t);
    const inGrid = () => page.evaluate(() => !!document.activeElement?.closest('.alt-schedule-month'));
    await page.locator('[data-mday="2026-09-28"]').focus(); await page.keyboard.press('PageUp'); await period('September 2026');
    check(await grid.locator('[tabindex="0"]').count() === 1 && await inGrid(), 'SM-36 PageUp from a day of the previous month keeps focus and one Tab stop in the grid');
    check((await focused(page)).startsWith('Tuesday 1 September'), 'SM-37 …on the new month’s first day');
    await page.keyboard.press('PageDown'); await period('October 2026');
    await page.locator('[data-mday="2026-10-28"]').focus(); await page.keyboard.press('ArrowDown'); await period('November 2026');
    check((await focused(page)).startsWith('Wednesday 4 November') && await grid.locator('[tabindex="0"]').count() === 1, 'SM-38 ↓ on the last row goes on into the next month, on the same weekday');
    await page.keyboard.press('ArrowUp'); check((await focused(page)).startsWith('Wednesday 28 October'), 'SM-39 ↑ moves a week within the grid');
    await page.keyboard.press('ArrowUp'); await period('October 2026');
    check((await focused(page)).startsWith('Wednesday 21 October') && await inGrid(), 'SM-40 ↑ on the first row goes back into the previous month, on the same weekday');
    await page.getByRole('button', { name: 'Next month' }).click(); await period('November 2026');
    await page.getByRole('button', { name: 'Next month' }).click(); await period('December 2026');
    await page.getByRole('button', { name: 'Today' }).click(); await period('October 2026');
    check(await grid.locator('[tabindex="0"]').count() === 1 && await grid.locator('[tabindex="0"]').getAttribute('data-mday') === '2026-10-27', 'SM-41 Today from another month leaves one Tab stop, on the date shown');
    await page.close(); }

  // Narrow: a list of days; every scheme and mode without sideways scroll.
  for (const scheme of ['daylight', 'nightfall']) for (const width of [320, 960]) {
    const page = await open({ scheme, width });
    if (width === 320) {
      check(await page.locator('.alt-schedule-month').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length === 1), `${scheme}/320: the narrow month is a list of days`);
      await page.locator('[data-mday="2026-10-26"]').focus(); await page.keyboard.press('ArrowDown');
      check((await focused(page)).startsWith('Tuesday 27 October'), `${scheme}/320: in the list ↓ moves a day`);
    }
    for (const mode of ['standard', 'reduced-motion', 'forced-colors', 'increased-contrast']) {
      await page.emulateMedia({ reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference', forcedColors: mode === 'forced-colors' ? 'active' : 'none' });
      await page.locator('.alt-root').evaluate((root, more) => { root.dataset.contrast = more ? 'more' : 'system'; }, mode === 'increased-contrast');
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${scheme}/${width}/${mode}: the page doesn’t scroll sideways`);
      if (mode === 'forced-colors') {
        await page.locator('[data-mday="2026-10-26"]').focus(); await page.keyboard.press('ArrowRight');
        check(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle === 'solid'), `${scheme}/${width}: under forced colours the focused day has an outline, not just a shadow`);
      }
    }
    await page.close();
  }
  check(errors.length === 0, `no page or console errors: ${errors.join('\n')}`);
  console.log(`Schedule month: ${passed} passed, 0 failed`);
} finally { await browser.close(); }
