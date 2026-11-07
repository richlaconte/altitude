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

// A schedule mounted directly in the fixture page, with locked events, onOpen and a way to change its events (#561).
const mountLocked = page => page.evaluate(() => new Promise((done) => {
  document.body.innerHTML = ''; const d = document.createElement('div'); document.body.append(d);
  const A = window.Altitude, h = React.createElement; window.__opened = [];
  const seed = [
    { id: 'a', title: 'Standup', start: '2026-10-26T09:00', end: '2026-10-26T09:30', room: 'Room A', locked: true },
    { id: 'b', title: 'Board report', start: '2026-10-26T14:00', end: '2026-10-26T15:00', room: 'Room B', locked: true },
    { id: 'c', title: 'Review', start: '2026-10-27T10:00', end: '2026-10-27T11:00', room: 'Room B' },
    { id: 'x', title: 'Sync', start: '2026-10-28T10:00', end: '2026-10-28T11:00', room: 'Room B' },
  ];
  function Host() {
    const [events, setEvents] = React.useState(seed); window.__setEvents = setEvents;
    return h(A.Schedule, { 'aria-label': 'Locked bookings', view: 'workweek', date: '2026-10-26', onDateChange: () => {}, now: '2026-10-27T08:30', dayStart: '08:00', dayEnd: '18:00',
      events, getKey: e => e.id, getStart: e => e.start, getEnd: e => e.end, getLabel: e => e.title,
      renderEvent: e => h(React.Fragment, null, h('strong', null, e.title), h('small', null, `${e.start.slice(11)}–${e.end.slice(11)} · ${e.room}`)),
      isLocked: e => !!e.locked, lockedLabel: () => 'Approved', onOpen: e => window.__opened.push(e.id), onChange: async () => ({ ok: true }) });
  }
  const scene = h(A.AltitudeProvider, null, h('div', { style: { width: '860px' } }, h(Host)));
  ReactDOM.createRoot(d).render(document.documentElement.dataset.fixtureStrict === 'true' ? h(React.StrictMode, null, scene) : scene);
  setTimeout(done, 400);
}));
// How far a locked event's text beside its lock label runs past the label's left (≤ 0: clear of it), and how far the label sits off centre.
const lockRoom = (page, id) => page.evaluate(id => {
  const b = document.querySelector(`[data-event="${id}"]`), box = b.getBoundingClientRect(), lock = b.querySelector('.alt-schedule-lock').getBoundingClientRect();
  const beside = [...b.children].filter(el => !el.classList.contains('alt-schedule-lock')).filter(el => { const r = el.getBoundingClientRect(); return r.top < lock.bottom && r.bottom > lock.top; });
  const ends = beside.map(el => el.getBoundingClientRect().right - parseFloat(getComputedStyle(el).paddingRight));
  return { over: Math.max(...ends) - lock.left, offCentre: Math.abs((lock.top + lock.bottom) / 2 - (box.top + box.bottom) / 2), short: b.hasAttribute('data-short') };
}, id);

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
    // Leaving the title by clicking away: empty discards it, a title adds it, and focus stays where the click put it.
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter'); await page.mouse.click(2, 2);
    await said(page, 'New event discarded');
    check(await title.count() === 0, 'SC-09b clicking away from an empty title discards the new event');
    await grid.locator('[tabindex="0"]').focus(); await page.keyboard.press('Enter'); await title.fill('Hiring sync'); await page.mouse.click(2, 2);
    await said(page, 'Added Hiring sync, Thursday 29 October, 09:15 to 10:15');
    check(await title.count() === 0 && !(await grid.evaluate(el => el.contains(document.activeElement))), 'SC-09c clicking away from a title adds the event and leaves focus where the click went');
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
    // Locked (#561): flush, says so, refuses every change.
    const lockedEv = page.locator('[data-event="e7"]');
    check((await lockedEv.getAttribute('aria-label')).endsWith(', approved, can’t be changed') && await lockedEv.getAttribute('aria-disabled') === null, 'SC-16b a locked event’s name says it can’t be changed, without aria-disabled');
    check(await lockedEv.evaluate(el => getComputedStyle(el).boxShadow.split('inset').length === 2 && !/rgba?\([^)]*\) 0px [1-9]/.test(getComputedStyle(el).boxShadow) && getComputedStyle(el).cursor === 'default'), 'SC-16c a locked event lies flush: no shadow, an edge only, no grab cursor');
    check(await lockedEv.locator('xpath=..').locator('.alt-schedule-handle').count() === 0 && (await lockedEv.textContent()).includes('Approved'), 'SC-16d a locked event shows its word and has no resize handle');
    await lockedEv.focus(); await page.keyboard.press('Space');
    await said(page, 'Board report is approved and can’t be changed');
    check(await lockedEv.getAttribute('aria-pressed') === null, 'SC-16e Space doesn’t pick up a locked event');
    for (const key of ['F2', 'Shift+ArrowDown', 'Delete']) { await page.locator('[data-event="e7"]').focus(); await page.keyboard.press(key); }
    check(await page.locator('[data-event="e7"]').count() === 1 && await page.getByRole('textbox').count() === 0 && await where(page, 'e7') === '2026-10-26T840'
      && (await page.locator('[data-event="e7"]').textContent()).includes('15:00'), 'SC-16f F2, Shift+↓ and Delete leave a locked event as it is');
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
    // #491: it stays where it was dropped while the write (300ms) runs, not back at its start.
    const during = [];
    for (let i = 0; i < 8; i++) { during.push(await where(page, 'e5')); await page.waitForTimeout(25); }
    check(during.every((c) => c === '2026-10-30T600'), `SC-21a a dropped event stays where it was let go while its write runs (${[...new Set(during)].join(', ')})`);
    await said(page, 'Moved Interview to Friday 30 October, 10:00 to 11:00');
    check(await where(page, 'e5') === '2026-10-30T600', 'SC-21 dropping moves it');
    // A refused write puts it back where it started (the demo refuses Wednesday mornings).
    const before = await where(page, 'e5');
    const box = await page.locator('[data-event="e5"]').boundingBox(), wed = await page.locator('[data-cell="2026-10-28T600"]').boundingBox();
    await page.mouse.move(box.x + 20, box.y + 8); await page.mouse.down(); await page.mouse.move(box.x + 30, box.y + 20, { steps: 3 });
    await page.mouse.move(wed.x + 20, wed.y + 8, { steps: 6 }); await page.mouse.up();
    check(await where(page, 'e5') === '2026-10-28T600', 'SC-21b while a write that will fail runs, the event is where it was dropped');
    await page.getByRole('alert').filter({ hasText: 'cleaned' }).waitFor();
    check(await where(page, 'e5') === before, 'SC-21c a refused write puts the event back where it started');
    await page.getByRole('button', { name: 'Dismiss' }).click();
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
    // Pointer: a locked event can't be carried.
    const lk = await page.locator('[data-event="e7"]').boundingBox(), tue = await page.locator('[data-cell="2026-10-27T840"]').boundingBox();
    await page.mouse.move(lk.x + 20, lk.y + 8); await page.mouse.down(); await page.mouse.move(lk.x + 30, lk.y + 20, { steps: 3 });
    check(await page.locator('.alt-schedule[data-carrying]').count() === 0, 'SC-25 dragging a locked event doesn’t carry it');
    await page.mouse.move(tue.x + 20, tue.y + 8, { steps: 6 }); await page.mouse.up();
    check(await where(page, 'e7') === '2026-10-26T840', 'SC-25b a locked event stays where it is');
    await page.close(); }

  { const page = await open(); await mountLocked(page);
    // #561 review: the title is cut short before the lock label, and on a short event the time and room are too.
    const tall = await lockRoom(page, 'b'), short = await lockRoom(page, 'a');
    check(!tall.short && tall.over <= 0, `SC-26 a locked event’s title stops before its lock label (${tall.over.toFixed(1)}px over)`);
    check(short.short && short.over <= 0, `SC-26b on a short locked event the title, time and room stop before the label (${short.over.toFixed(1)}px over)`);
    check(short.offCentre <= 1, `SC-26c on a short locked event the label is centred in the row (${short.offCentre.toFixed(1)}px off)`);
    // It still opens: Enter and double-click call onOpen.
    await page.locator('[data-event="b"]').focus(); await page.keyboard.press('Enter');
    await page.locator('[data-event="b"]').dblclick();
    check((await page.evaluate(() => window.__opened)).join() === 'b,b', 'SC-27 Enter and double-click open a locked event');
    // The settle: only an event that becomes locked while on screen, and it always ends.
    check(await page.locator('[data-lock-settle]').count() === 0, 'SC-28 events already locked when it mounts render flush, without the settle');
    await page.evaluate(() => window.__setEvents(l => l.map(e => e.id === 'c' ? { ...e, locked: true } : e)));
    await page.locator('[data-event="c"][data-lock-settle]').waitFor();
    await page.evaluate(() => window.__setEvents(l => [...l, { id: 'n', title: 'Audit', start: '2026-10-29T10:00', end: '2026-10-29T11:00', room: 'Room A', locked: true }]));
    await page.locator('[data-event="n"]').waitFor();
    check(await page.locator('[data-event="n"]').getAttribute('data-lock-settle') === null, 'SC-28b an event that arrives already locked renders flush, without the settle');
    await page.waitForTimeout(600);
    check(await page.locator('[data-lock-settle]').count() === 0, 'SC-28c the settle ends');
    await page.evaluate(() => window.__setEvents(l => l.map(e => e.id === 'x' ? { ...e, locked: true } : e)));
    await page.locator('[data-event="x"][data-lock-settle]').waitFor();
    await page.evaluate(() => window.__setEvents(l => l.map(e => e.id === 'a' ? { ...e, locked: false } : e)));
    await page.waitForTimeout(600);
    check(await page.locator('[data-lock-settle]').count() === 0, 'SC-28d the settle ends even when the locked set changes again while it plays');
    await page.close(); }

  { const ctx = await browser.newContext({ viewport: { width: 1000, height: 1400 }, locale: 'en-GB', isMobile: true, hasTouch: true });
    const page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto(`file://${fixturePath('Schedule')}`); await mountLocked(page);
    await page.locator('[data-event="b"]').tap(); await page.waitForTimeout(200);
    check((await page.evaluate(() => window.__opened)).join() === 'b', 'SC-27b a tap opens a locked event on touch');
    await ctx.close(); }

  for (const scheme of ['daylight', 'nightfall']) for (const width of [320, 960]) {
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
