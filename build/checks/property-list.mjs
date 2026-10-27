// PropertyList: values edited where they sit, unset openings, shortcuts, read-only values and Edit all. ALT_FIXTURE_ROOT selects React 19 fixtures.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { fixturePath } from './fixture-path.mjs';

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const errors = [];
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); passed++; };
const open = async ({ scheme = 'daylight', width = 960 } = {}) => {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  await page.goto(`file://${fixturePath('PropertyList', scheme)}`);
  page.setDefaultTimeout(5000);
  return page;
};
const focused = page => page.evaluate(() => document.activeElement?.getAttribute('aria-label'));

try {
  { const page = await open();
    const issue = page.locator('section').first();
    check(await issue.locator('dl dt').count() === 5 && await issue.locator('dl dd').count() === 5, 'PL-01 a plain dl of dt/dd pairs');
    const status = issue.getByRole('button', { name: 'Status: In review. Change status' });
    check(await status.isVisible(), 'PL-02 an editable value is one button naming the label, the value and the verb');
    check(await issue.getByRole('button', { name: /^Created/ }).count() === 0, 'PL-03 a read-only value is text, not a button');
    check(await issue.getByRole('button', { name: 'Priority: Add priority. Change priority' }).getAttribute('data-empty') === '', 'PL-04 an unset value is an opening that names what to add');
    await status.click(); await issue.locator('.alt-select-trigger').press('Enter'); await page.getByRole('option', { name: 'Done' }).click();
    await issue.getByRole('button', { name: 'Status: Done. Change status' }).waitFor();
    check(await focused(page) === 'Status: Done. Change status', 'PL-05 choosing saves and focus returns to the value');
    await page.waitForFunction(() => [...document.querySelectorAll('.alt-property .alt-inline-edit-status')].some(e => e.textContent === 'Status set to Done'));
    check(true, 'PL-06 the change is announced (“Status set to Done”)');
    await issue.getByRole('button', { name: 'Priority: Add priority. Change priority' }).click();
    await issue.locator('.alt-select-trigger').press('Enter'); await page.getByRole('option', { name: 'High' }).click();
    await issue.getByRole('button', { name: 'Priority: High. Change priority' }).waitFor();
    check(await issue.getByRole('button', { name: 'Priority: High. Change priority' }).getAttribute('data-empty') === null, 'PL-07 setting an unset value fills it');
    await issue.getByRole('button', { name: /^Estimate/ }).click();
    const est = issue.getByRole('spinbutton', { name: 'Estimate' }); await est.fill('-2'); await est.press('Enter');
    await issue.getByRole('alert').waitFor();
    check((await issue.getByRole('alert').textContent()).includes('Use a whole number'), 'PL-08 an explicit editor validates and keeps the draft');
    await est.press('Escape');
    check(await focused(page) === 'Estimate: 3 points. Change estimate', 'PL-09 Escape cancels back to the value');
    // Shortcuts: a key opens its property while focus is in the list (and not in a field).
    check(await issue.getByRole('button', { name: /^Status/ }).getAttribute('aria-keyshortcuts') === 's', 'PL-10 a value announces its shortcut (aria-keyshortcuts)');
    await issue.getByRole('button', { name: /^Assignee/ }).focus(); await page.keyboard.press('s');
    check(await issue.locator('.alt-inline-edit[aria-label="Status"]').getAttribute('data-state') === 'editing', 'PL-11 the shortcut opened Status');
    await page.keyboard.press('Escape');
    await page.close(); }

  { const page = await open();
    const trip = page.locator('section').nth(1);
    await trip.getByRole('button', { name: 'Edit all trip details' }).click();
    const form = trip.getByRole('form', { name: 'Edit trip details' });
    check(await form.getByRole('textbox', { name: 'Name' }).evaluate(el => el === document.activeElement), 'PL-12 Edit all lifts the list into one editor, first field focused');
    await form.getByLabel('Last day').fill('2026-10-30'); await form.getByRole('button', { name: 'Save changes' }).click();
    await form.getByText('The last day must be on or after the first.').waitFor();
    check(await form.getByLabel('Last day').getAttribute('aria-invalid') === 'true', 'PL-13 cross-field validation marks the field');
    await form.getByLabel('Last day').fill('2026-11-08'); await form.getByRole('button', { name: 'Save changes' }).click();
    await trip.getByText('2026-11-02 to 2026-11-08').waitFor();
    await page.waitForTimeout(50);
    check((await page.evaluate(() => document.activeElement?.textContent)) === 'Edit all trip details', 'PL-14 saving returns to the list and to the Edit all button');
    await page.close(); }

  for (const scheme of ['daylight', 'nightfall', 'mesa', 'alpine']) for (const width of [320, 960]) {
    const page = await open({ scheme, width });
    for (const mode of ['standard', 'reduced-motion', 'forced-colors', 'increased-contrast']) {
      await page.emulateMedia({ reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference', forcedColors: mode === 'forced-colors' ? 'active' : 'none' });
      await page.locator('.alt-root').evaluate((root, more) => { root.dataset.contrast = more ? 'more' : 'system'; }, mode === 'increased-contrast');
      await page.getByRole('button', { name: /^Estimate/ }).click();
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${scheme}/${width}/${mode}: no horizontal scrolling with a value in edit`);
      await page.keyboard.press('Escape');
    }
    await page.close();
  }
  check(errors.length === 0, `no page or console errors: ${errors.join('\n')}`);
  console.log(`PropertyList: ${passed} passed, 0 failed`);
} finally { await browser.close(); }
