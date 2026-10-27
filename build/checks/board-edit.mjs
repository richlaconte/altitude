// Board, edited in place: add cards at a column's foot, rename with F2, a fuller editor, carrying unchanged. ALT_FIXTURE_ROOT selects React 19 fixtures.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { fixturePath } from './fixture-path.mjs';

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const errors = [];
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); passed++; };
const open = async ({ scheme = 'daylight', width = 960 } = {}) => {
  const page = await browser.newPage({ viewport: { width, height: 760 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  await page.goto(`file://${fixturePath('Board', scheme)}`);
  page.setDefaultTimeout(5000);
  return page;
};
const cards = (page, col) => page.locator(`[data-board-col="${col}"] .alt-board-list > [data-board-card]`).evaluateAll(els => els.map(e => e.dataset.label));
const focused = async page => { await page.waitForTimeout(50); return page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.dataset.boardCard); };
const said = (page, t) => page.waitForFunction(t => [...document.querySelectorAll('.alt-board .alt-sr')].some(e => e.textContent.includes(t)), t);

try {
  { const page = await open();
    const add = page.getByRole('button', { name: 'Add a card to To do' });
    check(await add.isVisible() && await page.locator('[data-board-col="done"] .alt-board-add').count() === 0, 'BE-01 open columns end in an add slot; a collapsed one has none');
    await add.focus(); await page.keyboard.press('Enter');
    const title = page.locator('[data-board-col="todo"]').getByRole('textbox', { name: 'Card title' });
    check(await title.evaluate(el => el === document.activeElement), 'BE-02 the slot rises into a new card with its title field focused');
    for (const t of ['Draft FAQ', 'Book venue', 'Order badges']) { await page.keyboard.type(t); await page.keyboard.press('Enter'); await said(page, `Added ${t} to To do`); }
    check(JSON.stringify((await cards(page, 'todo')).slice(-3)) === '["Draft FAQ","Book venue","Order badges"]' && await title.inputValue() === '' && await title.evaluate(el => el === document.activeElement), 'BE-03 Enter adds and leaves a fresh field, so several can be added in a row');
    await page.keyboard.type('Pricing TBD'); await page.keyboard.press('Enter');
    await page.locator('.alt-board-new[data-status="failed"]').waitFor();
    check(await title.inputValue() === 'Pricing TBD' && await page.getByRole('button', { name: 'Retry' }).isVisible(), 'BE-04 a refused card keeps its title and offers Retry');
    await title.fill(''); await page.keyboard.press('Enter');
    check(await focused(page) === 'Add a card to To do', 'BE-05 Enter on an empty title closes the slot and returns to it');
    await page.keyboard.press('Enter'); await page.keyboard.press('Escape');
    check(await focused(page) === 'Add a card to To do', 'BE-06 Escape closes it too');
    // Rename with F2.
    await page.locator('[data-board-card="c1"]').focus(); await page.keyboard.press('F2');
    const rename = page.getByRole('textbox', { name: 'Rename Write release notes' });
    check(await rename.evaluate(el => el === document.activeElement && el.selectionStart === 0 && el.selectionEnd === el.value.length), 'BE-07 F2 turns the title into a field, selected');
    await page.keyboard.press('End'); await page.keyboard.type(' now');
    check(await page.locator('[data-board-card="c1"]').getAttribute('aria-pressed') === null && (await rename.inputValue()).endsWith(' now'), 'BE-08 Space in the field types a space and doesn’t pick the card up');
    await page.keyboard.type(' TBD'); await page.keyboard.press('Enter');
    await page.locator('.alt-board-rename[data-status="failed"]').waitFor();
    check((await rename.inputValue()).endsWith('TBD') && await page.getByRole('alert').filter({ hasText: 'Write the task' }).isVisible(), 'BE-09 a refused rename keeps the draft with the error');
    await rename.fill('Write the release notes'); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('[data-board-card="c1"]')?.dataset.label === 'Write the release notes');
    check(await focused(page) === 'c1', 'BE-10 Enter saves and focus returns to the card');
    await page.keyboard.press('F2'); await page.keyboard.press('Escape');
    check(await focused(page) === 'c1' && (await cards(page, 'todo'))[0] === 'Write the release notes', 'BE-11 Escape cancels a rename');
    // Carrying is unchanged.
    await page.keyboard.press('Space');
    check(await page.locator('[data-board-card="c1"]').getAttribute('aria-pressed') === 'true', 'BE-12 Space on a card still picks it up');
    await page.keyboard.press('Escape');
    // A fuller editor in the card's place.
    await page.getByRole('button', { name: 'Edit Brand voice', exact: true }).click();
    const form = page.getByRole('form', { name: 'Edit brand voice' });
    await form.getByRole('textbox', { name: 'Details' }).fill('Design · Mara'); await form.getByRole('textbox', { name: 'Details' }).press('Enter');
    await page.waitForFunction(() => document.querySelector('[data-board-card="c6"] small')?.textContent === 'Design · Mara');
    check(await focused(page) === 'c6', 'BE-13 the card grows into an EditRegion, saves, and focus returns to the card');
    await page.close(); }

  for (const scheme of ['daylight', 'nightfall', 'mesa', 'alpine']) for (const width of [320, 960]) {
    const page = await open({ scheme, width });
    for (const mode of ['standard', 'reduced-motion', 'forced-colors', 'increased-contrast']) {
      await page.emulateMedia({ reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference', forcedColors: mode === 'forced-colors' ? 'active' : 'none' });
      await page.locator('.alt-root').evaluate((root, more) => { root.dataset.contrast = more ? 'more' : 'system'; }, mode === 'increased-contrast');
      await page.getByRole('button', { name: 'Add a card to To do' }).click();
      check(await page.locator('[data-board-col="todo"]').getByRole('textbox', { name: 'Card title' }).isVisible(), `${scheme}/${width}/${mode}: the add field opens`);
      await page.keyboard.press('Escape');
    }
    await page.close();
  }
  check(errors.length === 0, `no page or console errors: ${errors.join('\n')}`);
  console.log(`Board editing: ${passed} passed, 0 failed`);
} finally { await browser.close(); }
