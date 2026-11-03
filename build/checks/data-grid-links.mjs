// DataGrid cell links (#469): with `cellId`, each cell has a stable id built from its row's id and its column's key, so
// an ErrorSummary can link to it. Following the link focuses the cell and makes it the active one: it holds the grid's
// one tab stop, the next arrow key moves from it, and Tab out and back returns to it. Focusing a cell from code does the
// same. Opens the DataGrid preview; run after a render of every preview. Exits non-zero on a failure.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { fixturePath } from './fixture-path.mjs';

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const errors = [];
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); passed++; };
const at = (page) => page.evaluate(() => document.activeElement?.closest('[role="gridcell"]')?.dataset.cell ?? document.activeElement?.tagName);
const stop = (page) => page.evaluate(() => [...document.querySelectorAll('[role="grid"] [role="gridcell"][tabindex="0"]')].map((c) => c.dataset.cell));

try {
  for (const scheme of ['daylight', 'nightfall']) {
    const page = await browser.newPage({ viewport: { width: 960, height: 760 } });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
    await page.goto(`file://${fixturePath('DataGrid', scheme)}`);
    page.setDefaultTimeout(5000);

    const ids = await page.evaluate(() => [...document.querySelectorAll('[role="gridcell"]')].slice(0, 5).map((c) => c.id));
    check(ids.join() === 'inventory-p1-name,inventory-p1-sku,inventory-p1-price,inventory-p1-stock,inventory-p1-status', `${scheme}: cells take their ids from cellId (${ids.join()})`);
    check((await stop(page)).join() === '0:0', `${scheme}: before anything, the first cell holds the tab stop`);

    // Follow the summary's link: the Cable tray's Stock cell is focused and becomes the active cell.
    await page.getByRole('link', { name: 'Cable tray stock: add stock, or retire it' }).click();
    check(await at(page) === '2:3' && await page.evaluate(() => document.activeElement?.id) === 'inventory-p3-stock', `${scheme}: the link focuses its cell (${await at(page)})`);
    check((await stop(page)).join() === '2:3' && await page.locator('[data-cell="2:3"]').getAttribute('data-active') === '', `${scheme}: the linked cell becomes the active cell and the only tab stop`);

    // The next arrow key moves from it, not from the cell that was active before.
    await page.keyboard.press('ArrowDown');
    check(await at(page) === '3:3', `${scheme}: ↓ moves from the linked cell (${await at(page)})`);

    // Tab out of the grid and back: focus returns to where you were.
    await page.keyboard.press('Tab');
    check(await at(page) !== '3:3', `${scheme}: Tab leaves the grid`);
    await page.keyboard.press('Shift+Tab');
    check(await at(page) === '3:3', `${scheme}: Shift+Tab comes back to the cell you left (${await at(page)})`);

    // Focus from code does the same; following a link doesn't start an edit.
    await page.evaluate(() => document.getElementById('inventory-p5-price').focus());
    check(await at(page) === '4:2' && (await stop(page)).join() === '4:2', `${scheme}: focusing a cell from code makes it active`);
    check(await page.locator('[role="grid"] [data-editing]').count() === 0, `${scheme}: being sent to a cell doesn't edit it`);
    await page.keyboard.press('ArrowLeft');
    check(await at(page) === '4:1', `${scheme}: ← moves from there`);

    // Shift+arrows still select a range from the focused cell.
    await page.keyboard.press('Shift+ArrowUp');
    check(await page.locator('[role="grid"] [data-range]').count() === 2, `${scheme}: Shift+↑ still selects a range`);
    await page.close();
  }
  check(errors.length === 0, `no page or console errors: ${errors.join('\n')}`);
  console.log(`DataGrid links: ${passed} passed, 0 failed`);
} finally { await browser.close(); }
