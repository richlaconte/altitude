// Schedule: every pointer operation has a keyboard path (WCAG 2.5.7), plus the pointer paths. ALT_FIXTURE_ROOT selects React 19 fixtures.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { fixturePath } from './fixture-path.mjs';

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const errors = [];
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); passed++; };
const open = async ({ scheme = 'daylight', width = 960 } = {}) => {
  const page = await browser.newPage({ viewport: { width, height: 800 }, locale: 'en-GB' });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  await page.goto(`file://${fixturePath('Schedule', scheme)}`);
  page.setDefaultTimeout(5000);
  return page;
};
const focused = page => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');
const where = (page, id) => page.evaluate(id => document.querySelector(`[data-event="${id}"]`)?.closest('[data-cell]')?.dataset.cell, id);
const said = async (page, text) => {
  try { await page.waitForFunction(t => [...document.querySelectorAll('.alt-schedule-sr[aria-live]')].some(e => e.textContent.includes(t)), text); }
  catch (err) { throw new Error(`Expected to hear “${text}”, heard: ${await page.evaluate(() => [...document.querySelectorAll('.alt-schedule-sr[aria-live]')].map(e => e.textContent).join(' | '))}`); }
  return true;
};

try {
  { const page = await open();
    const grid = page.getByRole('grid', { name: 'Room bookings' });
    check(await grid.locator('[tabindex="0"]').count() === 1, 'SC-01 the grid is one Tab stop');
    await grid.locator('[tabindex="0"]').focus();
    check((await focused(page)).startsWith('Monday 26 October, 09:00') || (await focused(page)).startsWith('Standup'), 'SC-02 focus starts at 09:00 on the first day (an event there takes it)');
    check(/^Standup, Monday 26 October, 09:00 to 09:30/.test(await focused(page)), 'SC-03 an event’s name carries its title, day, start and end');
    await page.keyboard.press('ArrowDown'); check((await focused(page)).startsWith('Monday 26 October, 09:15'), 'SC-04 ↓ moves one slot');
    await page.keyboard.press('ArrowRight'); check((await focused(page)).startsWith('Tuesday 27 October, 09:15'), 'SC-05 → moves one day');
    const review = await page.locator('[data-event="e2"]').getAttribute('aria-label');
    check(review.includes('overlaps with Customer call'), 'SC-06 overlapping events say so');
    // Create without a pointer.
    await page.keyboard.press('Enter');
    const title = page.getByRole('textbox', { name: 'Event title' });
    check(await title.evaluate(el => el === document.activeElement), 'SC-07 Enter on empty time opens a new event, ready for its title');
    await title.press('Escape'); check(await title.count() === 0 && (await focused(page)).startsWith('Tuesday 27 October, 09:15'), 'SC-08 Escape discards it and returns to the slot');
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter'); await title.fill('Budget sync'); await title.press('Enter');
    await said(page, 'Added Budget sync, Wednesday 28 October, 09:15 to 10:15');
    check(true, 'SC-09 Enter adds it with the default duration and announces it');
    // Move without a pointer.
    await page.locator('[data-event="e5"]').focus(); await page.keyboard.press('Space');
    check(await page.locator('[data-event="e5"]').getAttribute('aria-pressed') === 'true', 'SC-10 Space picks an event up');
    await page.keyboard.press('ArrowDown'); await said(page, 'Thursday 29 October, 15:15 to 16:15');
    await page.keyboard.press('ArrowLeft'); await said(page, 'Wednesday 28 October, 15:15 to 16:15');
    await page.keyboard.press('Escape'); await said(page, 'Move cancelled');
    check(await where(page, 'e5') === '2026-10-29T900', 'SC-11 Escape puts it back');
    await page.locator('[data-event="e5"]').focus(); await page.keyboard.press('Space'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Space');
    await said(page, 'Moved Interview to Wednesday 28 October, 15:15 to 16:15');
    check(await where(page, 'e5') === '2026-10-28T915', 'SC-12 arrows carry it by step and day; Space drops');
    // Resize without a pointer.
    await page.locator('[data-event="e5"]').focus(); await page.keyboard.press('Shift+ArrowDown');
    await said(page, 'Changed Interview to Wednesday 28 October, 15:15 to 16:30');
    check(true, 'SC-13 Shift+↓ extends the end by a step');
    // A refused move: back in place, with Retry.
    await page.locator('[data-event="e3"]').focus(); await page.keyboard.press('Space'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Space');
    await page.locator('.alt-schedule-failure').waitFor();
    check(await where(page, 'e3') === '2026-10-27T630' && await page.getByRole('button', { name: 'Retry' }).isVisible(), 'SC-14 a refused move goes back and offers Retry');
    // Unavailable time can't be dropped onto.
    await page.locator('[data-event="e4"]').focus(); await page.keyboard.press('Space');
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowDown');
    await said(page, 'Not available'); await page.keyboard.press('Space'); await said(page, 'That time isn’t available');
    check(await where(page, 'e4') === '2026-10-28T780', 'SC-15 unavailable time refuses the drop');
    // Held by a collaborator.
    await page.locator('[data-event="e6"]').focus(); await page.keyboard.press('Space');
    await said(page, 'Ana is moving Retro'); check((await page.locator('[data-event="e6"]').getAttribute('aria-label')).includes('Ana is moving this event'), 'SC-16 an event someone else holds can’t be picked up, and says who');
    // Rename and remove.
    await page.locator('[data-event="e1"]').focus(); await page.keyboard.press('F2');
    const rename = page.getByRole('textbox', { name: 'Rename Standup' }); await rename.fill('Daily standup'); await rename.press('Enter');
    await page.waitForFunction(() => document.querySelector('[data-event="e1"]').getAttribute('aria-label').startsWith('Daily standup'));
    check(true, 'SC-17 F2 renames in place');
    await page.locator('[data-event="e1"]').focus(); await page.keyboard.press('Delete');
    check(await page.locator('[data-event="e1"]').count() === 0, 'SC-18 Delete asks to remove');
    await page.keyboard.press('PageDown');
    check(await page.locator('.alt-schedule-period').textContent() === '2 Nov – 6 Nov 2026', 'SC-19 PageDown shows the next week');
    await page.close(); }

  { const page = await open();
    // Pointer: carry an event to another day.
    const ev = await page.locator('[data-event="e5"]').boundingBox();
    const thu = await page.locator('[data-cell="2026-10-29T900"]').boundingBox(), fri = await page.locator('[data-cell="2026-10-30T600"]').boundingBox();
    await page.mouse.move(ev.x + 20, ev.y + 8); await page.mouse.down();
    await page.mouse.move(ev.x + 30, ev.y + 20, { steps: 3 });
    check(await page.locator('.alt-schedule[data-carrying]').count() === 1 && await page.locator('.alt-schedule-slot').count() === 1, 'SC-20 carrying opens the time and shows the slot');
    await page.mouse.move(fri.x + 20, fri.y + 8, { steps: 6 }); await page.mouse.up();
    await said(page, 'Moved Interview to Friday 30 October, 10:00 to 11:00');
    check(await where(page, 'e5') === '2026-10-30T600', 'SC-21 dropping moves it');
    // Pointer: draw a new event across empty time.
    const a = await page.locator('[data-cell="2026-10-29T780"]').boundingBox(), b = await page.locator('[data-cell="2026-10-29T870"]').boundingBox();
    await page.mouse.move(a.x + 30, a.y + 2); await page.mouse.down(); await page.mouse.move(b.x + 30, b.y + 4, { steps: 6 });
    check(await page.locator('.alt-schedule-drawn').count() === 1, 'SC-22 drawing shows a well the length of the drag');
    await page.mouse.up();
    const title = page.getByRole('textbox', { name: 'Event title' }); await title.fill('Workshop'); await title.press('Enter');
    await said(page, 'Added Workshop, Thursday 29 October, 13:00 to 14:45');
    check(true, 'SC-23 releasing rises into a new event to be named');
    // Pointer: pull the bottom edge.
    await page.locator('[data-event="e4"]').hover();
    const handle = await page.locator('[data-event="e4"]').locator('xpath=..').locator('.alt-schedule-handle').boundingBox();
    await page.mouse.move(handle.x + handle.width / 2, handle.y + 2); await page.mouse.down(); await page.mouse.move(handle.x + handle.width / 2, handle.y + 2 + 44, { steps: 6 }); await page.mouse.up();
    await said(page, 'Changed Planning to Wednesday 28 October, 13:00 to 15:30');
    check(true, 'SC-24 the bottom edge changes the end time');
    await page.close(); }

  for (const scheme of ['daylight', 'nightfall', 'mesa', 'alpine']) for (const width of [320, 960]) {
    const page = await open({ scheme, width });
    for (const mode of ['standard', 'reduced-motion', 'forced-colors', 'increased-contrast']) {
      await page.emulateMedia({ reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference', forcedColors: mode === 'forced-colors' ? 'active' : 'none' });
      await page.locator('.alt-root').evaluate((root, more) => { root.dataset.contrast = more ? 'more' : 'system'; }, mode === 'increased-contrast');
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${scheme}/${width}/${mode}: the page doesn’t scroll sideways (the grid scrolls within itself)`);
    }
    await page.close();
  }
  check(errors.length === 0, `no page or console errors: ${errors.join('\n')}`);
  console.log(`Schedule: ${passed} passed, 0 failed`);
} finally { await browser.close(); }
