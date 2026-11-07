// DateRangePicker presets (#75): the field shows the chosen preset's name and dates; the panel leads with a listbox of
// presets (its own Tab stop before the calendar, ↑/↓ between rows, one highlight, the tick on the chosen row);
// choosing closes the panel and fills the field with an afterglow; relative presets re-resolve when today changes;
// typing or picking days clears the preset. Run after a render of every preview (it opens
// test/p-DatePicker-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

const open = async (width = 960) => {
  const page = await browser.newPage({ viewport: { width, height: 760 } });
  await page.goto(`file://${T}p-DatePicker-daylight.html`);
  await page.waitForTimeout(400);
  // The Due date calendar starts open; close it.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  return page;
};
const field = (page) => page.locator('.alt-field', { has: page.getByText('Reporting period', { exact: true }) });
const shown = (page) => field(page).locator('.alt-date-preset').evaluate((b) => b.textContent).catch(() => null);
const active = (page) => page.evaluate(() => { const l = document.activeElement; const id = l?.getAttribute('aria-activedescendant'); return id ? document.getElementById(id)?.textContent : null; });

{
  const page = await open();
  expect(await shown(page) === 'Last 30 days· 28 Sept – 27 Oct', `the field shows the preset's name and its dates (${await shown(page)})`);
  const name = await field(page).locator('.alt-date-preset').getAttribute('aria-label');
  expect(name === 'Last 30 days, 28 September 2026 to 27 October 2026. Type to enter dates.', `…and names them in full: "${name}"`);
  await field(page).getByRole('button', { name: 'Choose dates' }).click();
  await page.waitForTimeout(300);
  const list = await page.evaluate(() => { const l = document.activeElement; return { role: l.getAttribute('role'), label: l.getAttribute('aria-label'), options: [...l.querySelectorAll('[role="option"]')].map((o) => ({ t: o.textContent, sel: o.getAttribute('aria-selected'), tick: !!o.querySelector('.alt-select-tick') })) }; });
  expect(list.role === 'listbox' && list.label === 'Presets' && list.options.length === 7, `opening focuses the presets, a listbox of 7 (${list.role}, ${list.options.length})`);
  expect(list.options.filter((o) => o.sel === 'true').map((o) => o.t).join() === 'Last 30 days' && list.options.find((o) => o.sel === 'true').tick, 'the chosen preset is selected and wears the tick');
  expect(await active(page) === 'Last 30 days', 'the highlight starts on the chosen preset');
  const hl0 = await page.locator('.alt-date-presets .alt-menu-hl').evaluate((h) => h.style.transform);
  await page.keyboard.press('ArrowUp');
  const hl1 = await page.locator('.alt-date-presets .alt-menu-hl').evaluate((h) => h.style.transform);
  expect(await active(page) === 'Last 7 days' && hl0 !== hl1, `↑ moves the one highlight (${hl0} → ${hl1})`);
  // Its own Tab stop, before the calendar.
  await page.keyboard.press('Tab');
  const inGrid = await page.evaluate(() => !!document.activeElement.closest('.alt-date-custom'));
  await page.keyboard.press('Shift+Tab');
  const back = await page.evaluate(() => document.activeElement.getAttribute('role'));
  expect(inGrid && back === 'listbox', `Tab goes from the presets to the calendar, Shift+Tab back (${inGrid}, ${back})`);
  // Choose: the panel closes and the field fills with an afterglow.
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  expect(await page.getByRole('dialog', { name: 'Choose dates' }).count() === 0, 'choosing a preset closes the panel');
  expect(await shown(page) === 'Last 7 days· 21 Oct – 27 Oct', `the field shows the new preset (${await shown(page)})`);
  expect(!!(await field(page).locator('.alt-date-preset').getAttribute('data-glow')), 'and settles with an afterglow');
  // Relative presets stay relative.
  await page.getByRole('button', { name: 'Next day' }).click();
  await page.waitForTimeout(100);
  expect(await shown(page) === 'Last 7 days· 22 Oct – 28 Oct', `a relative preset re-resolves when today changes (${await shown(page)})`);
  // Typing clears the preset to custom dates.
  await field(page).locator('.alt-date-preset').focus();
  await page.keyboard.press('2');
  await page.waitForTimeout(50);
  const seg = await page.evaluate(() => document.activeElement.getAttribute('role'));
  expect(seg === 'spinbutton' && await field(page).locator('.alt-date-seg').count() === 6, `typing turns the name back into date segments (${seg})`);
  await page.keyboard.press('0');
  await page.waitForTimeout(50);
  expect(await field(page).locator('.alt-date-preset').count() === 0, 'and a typed date makes the range custom');
  await page.close();
}
{
  // Picking days clears the preset too.
  const page = await open();
  await field(page).getByRole('button', { name: 'Choose dates' }).click();
  await page.waitForTimeout(300);
  await page.locator('[data-date="2026-09-10"]').click(); await page.locator('[data-date="2026-09-12"]').click();
  await page.waitForTimeout(250);
  expect(await field(page).locator('.alt-date-preset').count() === 0 && await field(page).locator('.alt-date-seg').count() === 6, 'picking days in the calendar makes the range custom');
  await field(page).getByRole('button', { name: 'Choose dates' }).click();
  await page.waitForTimeout(300);
  expect(await page.locator('.alt-date-presets [aria-selected="true"]').count() === 0, 'and no preset is selected');
  await page.close();
}
{
  // Narrow: the presets sit above the calendar.
  const page = await open(360);
  await field(page).getByRole('button', { name: 'Choose dates' }).click();
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => { const p = document.querySelector('.alt-date-presets').getBoundingClientRect(), c = document.querySelector('.alt-date-custom').getBoundingClientRect(); return { above: p.bottom <= c.top + 1, fits: document.documentElement.scrollWidth <= 360 }; });
  expect(r.above, 'at 360px the presets sit above the calendar');
  await page.close();
}
{
  // Every preset disabled by `min` (#580): Home, End, ↑/↓, Enter and Space find nothing to move to or choose, and the
  // picker stays open and usable, with no page error.
  const page = await open();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.evaluate(() => {
    const A = window.Altitude, h = React.createElement, el = document.createElement('div'); el.id = 'all-off'; document.body.append(el);
    window.ReactDOM.createRoot(el).render(h(A.AltitudeProvider, null, h(A.Field, { label: 'All presets off' },
      h(A.DateRangePicker, { today: '2026-10-27', min: '2026-10-28', presets: [A.datePresets.today(), A.datePresets.lastDays(7), A.datePresets.thisMonth()] }))));
  });
  await page.waitForTimeout(300);
  const box = page.locator('#all-off');
  await box.getByRole('button', { name: 'Choose dates' }).click();
  await page.waitForTimeout(300);
  const list = page.locator('#all-off .alt-date-presets');
  expect(await list.locator('[role="option"][aria-disabled="true"]').count() === 3, 'with min after every preset, every preset row is disabled');
  await list.focus();
  for (const key of ['Home', 'Enter', 'End', ' ', 'ArrowDown', 'Enter', 'ArrowUp', ' ']) await page.keyboard.press(key);
  await page.waitForTimeout(250);
  expect(errors.length === 0, `Home, End, ↑/↓, Enter and Space throw nothing (${errors.join('; ')})`);
  expect(await page.locator('#all-off').getByRole('dialog', { name: 'Choose dates' }).count() === 1 && await box.locator('.alt-date-preset').count() === 0, 'the panel stays open and nothing is chosen');
  // The calendar opens on the real month, so pick its first two days that are on or after min.
  const days = page.locator('#all-off .alt-cal-day[data-date]:not([aria-disabled])');
  await days.nth(0).click(); await days.nth(1).click();
  await page.waitForTimeout(250);
  expect(errors.length === 0 && await box.locator('.alt-date-seg').count() === 6 && await page.locator('#all-off').getByRole('dialog').count() === 0, 'and the calendar still picks a range');
  await page.close();
}

await browser.close();
console.log(`date-presets: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
