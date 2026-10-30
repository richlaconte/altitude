// DataTable rows that expand (read-only detail) and edit in place (EditRegion in the row). ALT_FIXTURE_ROOT selects React 19 fixtures.
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
  await page.goto(`file://${fixturePath('TableEditing', scheme)}`);
  page.setDefaultTimeout(5000);
  return page;
};
const order = page => page.locator('tbody tr[data-row]').evaluateAll(rows => rows.map(r => r.dataset.row));
const focused = page => page.evaluate(() => document.activeElement?.getAttribute('aria-label'));

try {
  { const page = await open();
    const disclose = page.getByRole('button', { name: 'Details for Globex' });
    await disclose.click();
    const region = await disclose.getAttribute('aria-controls');
    check(await disclose.getAttribute('aria-expanded') === 'true' && (await page.locator(`[id="${region}"]`).textContent()).includes('it@globex.example'), 'TE-01 the disclosure opens a full-width detail row it controls');
    check(await page.locator('tr[data-row="globex"]').getAttribute('data-editing') === null, 'TE-02 read-only detail stays on the ground');
    await page.getByRole('button', { name: 'Details for Initech' }).click();
    check(await disclose.getAttribute('aria-expanded') === 'false', 'TE-03 one row open at a time (expandMode single)');
    await page.getByRole('button', { name: 'Edit Acme Corp' }).click();
    const form = page.getByRole('form', { name: 'Edit acme corp' });
    check(await form.getByRole('textbox', { name: 'Name' }).evaluate(el => el === document.activeElement), 'TE-04 Edit opens the editor in the row and focuses the first field');
    check(await page.locator('tr[data-row="acme"]').getAttribute('data-editing') === '' && await page.getByRole('button', { name: 'Edit Globex' }).isDisabled(), 'TE-05 the row rises with its editor; other rows wait');
    check(await page.locator('.alt-table-sort').count() === 0, 'TE-06 sorting is paused while a row is in edit');
    await form.getByRole('spinbutton', { name: 'Seats' }).fill('200');
    check(JSON.stringify(await order(page)) === '["globex","umbrella","acme","initech"]', 'TE-07 the row holds its place while edited');
    await form.getByRole('spinbutton', { name: 'Seats' }).press('Enter');
    await page.waitForFunction(() => document.querySelector('tr[data-row]')?.dataset.row === 'acme');
    check(JSON.stringify(await order(page)) === '["acme","globex","umbrella","initech"]', 'TE-08 once saved, the row is carried to its sorted place');
    check(await focused(page) === 'Edit Acme Corp', 'TE-09 focus returns to the row’s Edit button');
    // A refused save keeps the editor and the draft.
    await page.getByRole('button', { name: 'Edit Initech' }).click();
    const ini = page.getByRole('form', { name: 'Edit initech' });
    await ini.getByRole('spinbutton', { name: 'Seats' }).fill('20'); await ini.getByRole('spinbutton', { name: 'Seats' }).press('Enter');
    await ini.getByText('Starter plans have at most 10 seats', { exact: false }).waitFor();
    check(await ini.getByRole('spinbutton', { name: 'Seats' }).inputValue() === '20', 'TE-10 a refused save keeps the draft with the error');
    await page.keyboard.press('Escape');
    check(await focused(page) === 'Edit Initech' && await page.locator('.alt-table-editrow').count() === 0, 'TE-11 Escape cancels and returns to Edit');
    // Someone else changes the row while it's being edited.
    await page.getByRole('button', { name: 'Edit Globex' }).click();
    const glo = page.getByRole('form', { name: 'Edit globex' });
    await glo.getByRole('textbox', { name: 'Name' }).fill('Globex Ltd');
    await page.getByText('Fixture controls').click(); await page.getByRole('button', { name: 'Apply external update to Globex' }).click();
    await glo.getByText('This record changed', { exact: true }).waitFor();
    check(await glo.getByRole('button', { name: 'Save changes' }).isDisabled() && await glo.getByRole('textbox', { name: 'Name' }).inputValue() === 'Globex Ltd', 'TE-12 an outside change during an edit keeps the draft and blocks Save');
    await page.close(); }

  for (const scheme of ['daylight', 'nightfall']) for (const width of [320, 960]) {
    const page = await open({ scheme, width });
    for (const mode of ['standard', 'reduced-motion', 'forced-colors', 'increased-contrast']) {
      await page.emulateMedia({ reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference', forcedColors: mode === 'forced-colors' ? 'active' : 'none' });
      await page.locator('.alt-root').evaluate((root, more) => { root.dataset.contrast = more ? 'more' : 'system'; }, mode === 'increased-contrast');
      await page.getByRole('button', { name: 'Edit Umbrella' }).click();
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${scheme}/${width}/${mode}: the page doesn’t scroll sideways with a row in edit`);
      await page.keyboard.press('Escape');
    }
    await page.close();
  }
  check(errors.length === 0, `no page or console errors: ${errors.join('\n')}`);
  console.log(`Table editing: ${passed} passed, 0 failed`);
} finally { await browser.close(); }
