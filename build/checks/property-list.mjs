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
    await page.waitForFunction(() => [...document.querySelectorAll('.alt-property .alt-inline-edit [role="status"]')].some(e => e.textContent === 'Status set to Done'));
    check(true, 'PL-06 the change is announced (“Status set to Done”)');
    await issue.getByRole('button', { name: 'Priority: Add priority. Change priority' }).click();
    await issue.locator('.alt-select-trigger').press('Enter'); await page.getByRole('option', { name: 'High' }).click();
    // #504: once the list has closed, the editor folds back to the chosen value, which hovers while the write runs.
    const priority = issue.locator('.alt-inline-edit[aria-label="Priority"]');
    await priority.and(page.locator('[data-folded]')).waitFor();
    check(await priority.locator('.alt-select').count() === 0 && await priority.getAttribute('data-state') === 'saving' &&
      await priority.locator('.alt-inline-edit-surface').getAttribute('data-status') === 'pending' && await focused(page) === 'Priority: High. Saving',
      'PL-07a while the write runs, the editor has closed onto the chosen value, which hovers as pending and keeps focus');
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
    // A shortcut given in capitals still opens on its key.
    await page.evaluate(() => {
      const R = window.React, A = window.Altitude, h = R.createElement;
      const host = document.createElement('div'); host.id = 'upper-shortcut'; document.body.prepend(host);
      window.ReactDOM.createRoot(host).render(h(A.AltitudeProvider, null, h(A.PropertyList, { 'aria-label': 'Upper', shortcuts: true },
        h(A.PropertyListItem, { label: 'Priority', value: 'Low', shortcut: 'P', onSave: v => ({ ok: true, value: v }) }))));
    });
    const upper = page.locator('#upper-shortcut');
    await upper.getByRole('button', { name: /^Priority/ }).waitFor();
    check(await upper.getByRole('button', { name: /^Priority/ }).getAttribute('aria-keyshortcuts') === 'p', 'PL-12 a capital shortcut is announced in lower case');
    await upper.locator('.alt-property-list').evaluate(el => el.setAttribute('tabindex', '-1'));
    await upper.locator('.alt-property-list').focus(); await page.keyboard.press('p');
    check(await upper.locator('.alt-inline-edit[aria-label="Priority"]').getAttribute('data-state') === 'editing', 'PL-13 shortcut="P" opens on the P key');
    await page.close(); }

  // #504: a rejected on-choose write opens the editor again, on the chosen value, with the error and focus in it.
  { const page = await open();
    await page.evaluate(() => {
      const R = window.React, A = window.Altitude, h = R.createElement;
      const host = document.createElement('div'); host.id = 'fold'; document.body.prepend(host);
      const items = [{ value: 'low', label: 'Low' }, { value: 'high', label: 'High' }];
      function Demo() {
        const [v, setV] = R.useState('low');
        return h(A.AltitudeProvider, null, h(A.PropertyList, { 'aria-label': 'Fold' }, h(A.PropertyListItem, { label: 'Priority', value: v, commit: 'on-choose',
          renderValue: x => items.find(i => i.value === x)?.label, onValueChange: setV, editor: c => h(A.Select, { ...c, items }),
          onSave: () => new Promise(resolve => { window.__settle = resolve; }) })));
      }
      window.ReactDOM.createRoot(host).render(h(Demo));
    });
    const fold = page.locator('#fold .alt-inline-edit');
    await page.locator('#fold').getByRole('button', { name: 'Priority: Low. Change priority' }).click();
    await page.locator('#fold .alt-select-trigger').press('Enter'); await page.getByRole('option', { name: 'High' }).click();
    await fold.and(page.locator('[data-folded]')).waitFor();
    await page.keyboard.press('Escape');
    check(await fold.getAttribute('data-state') === 'saving' && (await fold.getByRole('status').textContent()) === 'Saving changes. Wait for the result.',
      'PL-15 Escape on the folded value doesn\'t abandon the write, and says to wait');
    await page.evaluate(() => window.__settle({ ok: false, error: 'High needs a reason.' }));
    await fold.getByRole('alert').waitFor();
    check(await fold.locator('.alt-select-value').textContent() === 'High' && await fold.getAttribute('data-folded') === null &&
      await page.evaluate(() => !!document.activeElement?.closest('#fold .alt-select')),
      'PL-16 a rejected write opens the editor again on the chosen value, with the error, focus in it');
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

  for (const scheme of ['daylight', 'nightfall']) for (const width of [320, 960]) {
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
