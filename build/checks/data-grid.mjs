// DataGrid: the APG grid keys plus spreadsheet editing, ranges, copy/paste and undo. ALT_FIXTURE_ROOT selects React 19 fixtures.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { fixturePath } from './fixture-path.mjs';

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const errors = [];
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); passed++; };
const open = async ({ scheme = 'daylight', width = 960 } = {}) => {
  const page = await browser.newPage({ viewport: { width, height: 700 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  await page.goto(`file://${fixturePath('DataGrid', scheme)}`);
  page.setDefaultTimeout(5000);
  return page;
};
const cell = (page, r, c) => page.locator(`[data-cell="${r}:${c}"]`);
const at = page => page.evaluate(() => document.activeElement?.closest('[data-cell]')?.dataset.cell);
const text = (page, r, c) => cell(page, r, c).locator('.alt-grid-value').textContent();
const said = (page, t) => page.waitForFunction(t => [...document.querySelectorAll('.alt-data-grid .alt-grid-sr[aria-live]')].some(e => e.textContent.includes(t)), t);
const idle = page => page.waitForFunction(() => !document.querySelector('[data-status="pending"]'));

try {
  { const page = await open();
    const grid = page.getByRole('grid', { name: 'Inventory' });
    check(await grid.locator('[tabindex="0"]').count() === 1, 'DG-01 the grid is one Tab stop');
    check(await cell(page, 0, 1).getAttribute('aria-readonly') === 'true' && await cell(page, 0, 0).getAttribute('aria-readonly') === 'false', 'DG-02 read-only and editable cells say so');
    await cell(page, 0, 0).click();
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown'); check(await at(page) === '1:1', 'DG-03 arrows move one cell');
    await page.keyboard.press('End'); check(await at(page) === '1:4', 'DG-04 End goes to the row’s end');
    await page.keyboard.press('Control+Home'); check(await at(page) === '0:0', 'DG-05 Ctrl+Home goes to the first cell');
    await page.keyboard.press('Control+End'); check(await at(page) === '4:4', 'DG-06 Ctrl+End goes to the last cell');
    // Type to replace; Enter saves and moves down.
    await cell(page, 1, 3).click(); await page.keyboard.type('40');
    check(await page.getByRole('textbox', { name: 'Stock, Monitor arm' }).inputValue() === '40', 'DG-07 typing a character edits the cell, replacing its value; the field is named by column and row');
    await page.keyboard.press('Enter'); await idle(page);
    check(await text(page, 1, 3) === '40' && await at(page) === '2:3', 'DG-08 Enter saves and moves down');
    await said(page, 'Saved'); check(true, 'DG-09 the save is announced');
    // F2 keeps the value; Escape discards.
    await page.keyboard.press('F2'); const f = page.getByRole('textbox', { name: 'Stock, Cable tray' });
    check(await f.inputValue() === '0', 'DG-10 F2 edits with the current value');
    await page.keyboard.type('9'); await page.keyboard.press('Escape');
    check(await text(page, 2, 3) === '0' && await at(page) === '2:3', 'DG-11 Escape discards the draft');
    // Tab saves and moves right.
    await cell(page, 2, 0).click(); await page.keyboard.press('F2'); await page.keyboard.press('End'); await page.keyboard.type('s'); await page.keyboard.press('Tab'); await idle(page);
    check(await text(page, 2, 0) === 'Cable trays' && await at(page) === '2:1', 'DG-12 Tab saves and moves right');
    // Invalid values stay open with their message.
    await cell(page, 3, 2).click(); await page.keyboard.type('-1'); await page.keyboard.press('Enter');
    const bad = page.getByRole('textbox', { name: 'Price, Footrest' });
    check(await bad.getAttribute('aria-invalid') === 'true' && await page.getByRole('alert').filter({ hasText: 'Use a price of 0 or more.' }).isVisible(), 'DG-13 an invalid value keeps the cell open with its message');
    await page.keyboard.press('Escape');
    // IME: Enter during composition doesn't commit.
    await cell(page, 3, 0).click(); await page.keyboard.press('F2');
    await page.getByRole('textbox', { name: 'Name, Footrest' }).evaluate(el => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: true })));
    check(await page.getByRole('textbox', { name: 'Name, Footrest' }).isVisible(), 'DG-14 Enter during IME composition doesn’t commit');
    // Clicking another cell commits, as in a spreadsheet.
    await page.keyboard.type(' pro'); await cell(page, 4, 0).click(); await idle(page);
    check(await text(page, 3, 0) === 'Footrest pro' && await at(page) === '4:0', 'DG-15 clicking another cell commits and moves there');
    // A refused save: the cell fails and says so.
    await cell(page, 0, 2).click(); await page.keyboard.type('45'); await page.keyboard.press('Enter');
    await said(page, '1 cell couldn’t be saved: The Desk lamp price is locked during the sale.');
    check(await cell(page, 0, 2).getAttribute('data-status') === 'failed' && await cell(page, 0, 2).getAttribute('aria-invalid') === 'true' && await text(page, 0, 2) === '$49', 'DG-16 a refused cell fails, keeps its value and announces why');
    await cell(page, 0, 2).click(); await page.keyboard.press('Enter');
    check(await page.getByRole('textbox', { name: 'Price, Desk lamp' }).inputValue() === '45', 'DG-17 reopening a failed cell restores the rejected draft');
    await page.keyboard.press('Escape');
    // Read-only cells don't edit.
    await cell(page, 0, 1).click(); await page.keyboard.type('x');
    check(await page.locator('.alt-grid-input').count() === 0, 'DG-18 typing in a read-only cell does nothing');
    await page.close(); }

  { const page = await open();
    await cell(page, 0, 3).click(); await page.keyboard.press('Shift+ArrowDown'); await page.keyboard.press('Shift+ArrowDown');
    check(await page.locator('[aria-selected="true"]').count() === 3, 'DG-19 Shift+arrows select a range (aria-selected)');
    await said(page, '3 by 1 cells selected');
    const copied = await page.evaluate(() => { const d = new DataTransfer(); document.activeElement.dispatchEvent(new ClipboardEvent('copy', { clipboardData: d, bubbles: true, cancelable: true })); return d.getData('text/plain'); });
    check(copied === '120\n34\n0', 'DG-20 copy gives the range as tab-separated text');
    await page.keyboard.press('Delete'); await idle(page);
    check(await text(page, 0, 3) === '0' && await text(page, 1, 3) === '0', 'DG-21 Delete clears the range in one batch');
    await page.keyboard.press('Control+z');
    await page.waitForFunction(() => document.querySelector('[data-cell="0:3"] .alt-grid-value').textContent === '120');
    check(await text(page, 1, 3) === '34', 'DG-22 Ctrl+Z undoes the last batch');
    await cell(page, 1, 2).click();
    await page.evaluate(() => { const d = new DataTransfer(); d.setData('text/plain', '95\t60\n-3\t7\n'); document.activeElement.dispatchEvent(new ClipboardEvent('paste', { clipboardData: d, bubbles: true, cancelable: true })); });
    await said(page, '3 cells saved. 1 cell couldn’t be saved: Price, Cable tray: Use a price of 0 or more.');
    check(await text(page, 1, 2) === '$95' && await text(page, 1, 3) === '60' && await text(page, 2, 3) === '7' && await cell(page, 2, 2).getAttribute('data-status') === 'failed', 'DG-23 a paste saves the valid cells as one batch and marks the invalid one');
    // A custom editor (Select) commits on choosing.
    await cell(page, 4, 4).click(); await page.keyboard.press('Enter');
    await page.getByRole('option', { name: 'Active' }).click(); await idle(page);
    check((await cell(page, 4, 4).textContent()).includes('Active') && await at(page) === '4:4', 'DG-24 a Select column commits on choosing and returns to the cell');
    await page.close(); }

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
  console.log(`DataGrid: ${passed} passed, 0 failed`);
} finally { await browser.close(); }
