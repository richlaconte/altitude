// TimeSlotPicker (#489): a radio group laid out as a grid. One tab stop (the chosen or first free time); arrows move
// between free times, skipping booked ones, ↑/↓ by row, Home/End; arrows only move, Space/Enter or a click chooses;
// booked times are flush, struck through, named "Booked" and can't be chosen; Field labels it and its error tints the free
// wells; focusing the group moves to its tab stop; loading shows imprints with aria-busy; labels follow the locale; no
// sideways scroll at 320px. Run after a render of every preview (it opens test/p-TimeSlotPicker-<scheme>.html); exits
// non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const open = async (scheme = 'daylight', width = 960) => {
  const page = await browser.newPage({ viewport: { width, height: 760 } });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`file://${T}p-TimeSlotPicker-${scheme}.html`);
  await page.waitForTimeout(300);
  return page;
};
const focusedName = (page) => page.evaluate(() => document.activeElement?.textContent);
const checked = (page) => page.evaluate(() => [...document.querySelectorAll('.alt-slot[aria-checked="true"]')].map((b) => b.dataset.value));

{ const page = await open();
  const group = page.getByRole('radiogroup', { name: 'Times on Tuesday 10 November' });
  expect(await group.count() === 1, 'the group is labelled by its Field');
  expect(await page.locator('.alt-slot[tabindex="0"]').count() === 1 && await page.locator('.alt-slot[tabindex="0"]').getAttribute('data-value') === '09:30', 'one tab stop, on the first free time when none is chosen');
  const booked = page.locator('.alt-slot[data-value="09:00"]');
  const look = await booked.evaluate((b) => ({ shadow: getComputedStyle(b).boxShadow, line: getComputedStyle(b.querySelector('.alt-slot-time')).textDecorationLine, text: b.textContent, dis: b.getAttribute('aria-disabled') }));
  const free = await page.locator('.alt-slot[data-value="09:30"]').evaluate((b) => getComputedStyle(b).boxShadow);
  const well = await page.evaluate(() => { const p = document.createElement('span'); p.style.boxShadow = 'var(--well)'; document.body.append(p); const v = getComputedStyle(p).boxShadow; p.remove(); return v; });
  expect(look.line === 'line-through' && look.text.includes('Booked') && look.dis === 'true' && look.shadow !== well, `a booked time lies flush, struck through, says Booked and is aria-disabled (${JSON.stringify(look)})`);
  expect(free === well, 'a free time is a well');
  await page.locator('.alt-slot[data-value="09:30"]').focus();
  await page.keyboard.press('ArrowRight'); expect(await focusedName(page) === '10:00 AM', '→ moves to the next free time');
  await page.keyboard.press('ArrowRight'); expect(await focusedName(page) === '11:00 AM', '→ skips a booked time (10:30)');
  expect(JSON.stringify(await checked(page)) === '[]', 'arrows only move: nothing is chosen yet');
  await page.keyboard.press('ArrowDown');
  const below = await page.evaluate(() => { const a = document.activeElement.getBoundingClientRect(); return { name: document.activeElement.textContent, top: a.top }; });
  const fromTop = await page.locator('.alt-slot[data-value="11:00"]').evaluate((b) => b.getBoundingClientRect().top);
  expect(below.top > fromTop && !below.name.includes('Booked'), `↓ moves to a free time in the next row (${below.name})`);
  await page.keyboard.press('ArrowUp'); expect(await focusedName(page) === '11:00 AM', '↑ comes back up the column');
  await page.keyboard.press('End'); expect(await focusedName(page) === '5:00 PM', 'End goes to the last free time');
  await page.keyboard.press('Home'); expect(await focusedName(page) === '9:30 AM', 'Home goes to the first free time');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('Space');
  expect(JSON.stringify(await checked(page)) === '["10:00"]' && await page.locator('.alt-slot[data-value="10:00"]').getAttribute('tabindex') === '0', 'Space chooses, and the chosen time becomes the tab stop');
  const filled = await page.locator('.alt-slot[data-value="10:00"]').evaluate((b) => ({ fill: +getComputedStyle(b.querySelector('.alt-slot-fill')).opacity, mark: getComputedStyle(b.querySelector('.alt-slot-mark')).boxShadow }));
  await page.waitForTimeout(250);
  expect(filled.mark !== 'none', 'the chosen time is filled, with a raised check');
  await booked.click({ force: true });
  expect(JSON.stringify(await checked(page)) === '["10:00"]', 'a booked time can\'t be chosen');
  await page.locator('.alt-slot[data-value="16:30"]').click();
  expect(JSON.stringify(await checked(page)) === '["16:30"]', 'a click chooses another time');
  await page.close(); }

{ const page = await open();
  await page.getByRole('button', { name: 'Hold this time' }).click();
  const group = page.locator('.alt-slots');
  await page.getByText('Choose a time.').waitFor(); await page.waitForTimeout(250);
  const inv = await group.evaluate((g) => ({ invalid: g.getAttribute('aria-invalid'), desc: g.getAttribute('aria-describedby'), bg: getComputedStyle(g.querySelector('.alt-slot:not([data-booked])')).borderColor }));
  const critical = await page.evaluate(() => { const p = document.createElement('span'); p.style.color = 'var(--critical)'; document.querySelector('.alt-slots').append(p); const c = getComputedStyle(p).color; p.remove(); return c; });
  expect(inv.invalid === 'true' && !!inv.desc && inv.bg === critical, `the Field's error marks the group and gives the free wells a critical rim (${JSON.stringify(inv)})`);
  await page.evaluate(() => document.querySelector('.alt-slots').focus());
  expect(await focusedName(page) === '9:30 AM', 'focusing the group (an ErrorSummary link) moves on to its tab stop');
  await page.getByRole('button', { name: 'Reload the day' }).click();
  await page.waitForTimeout(80);
  expect(await page.locator('.alt-slots[aria-busy="true"] .alt-slot-imprint').count() === 12, 'loading shows imprints, aria-busy');
  await page.waitForTimeout(1000);
  expect(await page.locator('.alt-slot').count() === 15, 'then the times');
  await page.close(); }

// Labels follow the locale.
{ const page = await open();
  const labels = await page.evaluate(() => new Promise((resolve) => {
    const R = window.React, A = window.Altitude, h = R.createElement, host = document.createElement('div'); document.body.append(host);
    window.ReactDOM.createRoot(host).render(h(A.AltitudeProvider, null, h(A.TimeSlotPicker, { 'aria-label': 'GB', locale: 'en-GB' }, h(A.TimeSlot, { value: '09:30' }), h(A.TimeSlot, { value: '14:00', label: 'Afternoon' }))));
    setTimeout(() => resolve([...host.querySelectorAll('.alt-slot-time')].map((e) => e.textContent)), 100);
  }));
  expect(JSON.stringify(labels) === '["09:30","Afternoon"]', `a slot formats its time for the locale, or shows its label (${labels})`);
  await page.close(); }

for (const scheme of ['daylight', 'nightfall']) {
  const page = await open(scheme, 320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${scheme} at 320px: no sideways scroll`);
  const small = await page.evaluate(() => [...document.querySelectorAll('.alt-slot')].some((b) => b.getBoundingClientRect().height < 44));
  expect(!small, `${scheme}: every slot is at least 44px tall`);
  await page.close();
}

expect(!errors.length, `no page or console errors (${errors.join('; ')})`);
console.log(`TimeSlotPicker: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
