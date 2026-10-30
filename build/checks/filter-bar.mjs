// FilterBar: a toolbar of conditions, each part edited in its own picker. ALT_FIXTURE_ROOT selects React 19 fixtures.
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
  await page.goto(`file://${fixturePath('FilterBar', scheme)}`);
  page.setDefaultTimeout(5000);
  return page;
};
const named = page => page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
const tokens = page => page.locator('.alt-filter-token').evaluateAll(els => els.map(e => e.getAttribute('aria-label')));
const status = async page => { await page.waitForTimeout(60); return page.locator('.alt-filter-status').textContent(); };
const matches = page => page.locator('[data-relevance="match"], tr[data-relevance="match"]').count();

try {
  { const page = await open();
    const bar = page.getByRole('toolbar', { name: 'Filter issues' });
    check(await bar.locator('[tabindex="0"]').count() === 1, 'FB-01 the bar is one Tab stop');
    await page.keyboard.press('Tab');
    check(await named(page) === 'Field: Status. Change field', 'FB-02 Tab enters on the first segment');
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    check(await named(page) === 'Value: In review. Change value', 'FB-03 → moves between segments');
    await page.keyboard.press('End'); check(await named(page) === 'Add filter', 'FB-04 End goes to Add filter');
    await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    const picker = page.getByRole('dialog', { name: 'Status is' });
    check(await picker.isVisible() && await page.getByRole('button', { name: 'Value: In review. Change value' }).getAttribute('aria-expanded') === 'true', 'FB-05 Enter opens the segment’s picker');
    await page.keyboard.press('Escape');
    check(!(await picker.isVisible()) && await named(page) === 'Value: In review. Change value', 'FB-06 Escape closes it and leaves focus on the segment');
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    check(JSON.stringify(await tokens(page)) === '["Status is Done"]', 'FB-07 choosing a value changes just that part');
    check((await status(page)) === 'Status is Done. 1 result', 'FB-08 the new condition and the result count are announced');
    check(await page.locator('.alt-filter-token[data-stamp]').count() === 1, 'FB-09 the changed condition is re-stamped');
    await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Enter');
    await page.getByRole('option', { name: 'is not' }).click();
    check(JSON.stringify(await tokens(page)) === '["Status is not Done"]', 'FB-10 the condition segment changes the operator');
    // Add a text filter: the field list sinks, then the value picker rises.
    await page.getByRole('button', { name: 'Add filter' }).click();
    await page.getByRole('option', { name: 'Title' }).click();
    await page.getByRole('dialog', { name: 'Title contains' }).waitFor();
    check(JSON.stringify(await tokens(page)) === '["Status is not Done","Title contains …"]', 'FB-11 Add filter adds a condition waiting for its value');
    check(await page.getByRole('button', { name: 'Title: choose a value' }).getAttribute('data-empty') === '', 'FB-12 the missing value is an opening');
    await page.keyboard.type('search'); await page.keyboard.press('Enter');
    check(JSON.stringify(await tokens(page)) === '["Status is not Done","Title contains “search”"]' && (await status(page)).endsWith('2 results'), 'FB-13 typing a phrase and Enter applies it');
    check(await page.getByRole('button', { name: /^Match all filters/ }).isVisible(), 'FB-14 with two conditions, Match all/any appears');
    await page.getByRole('button', { name: /^Match all filters/ }).click();
    check((await status(page)) === 'Match any filters' && await page.getByRole('button', { name: /^Match any filters/ }).isVisible(), 'FB-15 Match toggles between all and any');
    // Dates: between takes two.
    await page.getByRole('button', { name: 'Add filter' }).click(); await page.getByRole('option', { name: 'Updated' }).click();
    await page.getByRole('dialog', { name: 'Updated before' }).waitFor(); await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Condition: before. Change condition' }).click(); await page.getByRole('option', { name: 'between' }).click();
    await page.getByRole('button', { name: 'Updated: choose a value' }).click();
    const range = page.getByRole('dialog', { name: 'Updated between' });
    check(await range.getByRole('button', { name: 'Apply' }).isDisabled(), 'FB-16 a range applies only once it has both ends');
    await range.getByLabel('From').fill('2026-10-01'); await range.getByLabel('To').fill('2026-10-20'); await range.getByRole('button', { name: 'Apply' }).click();
    check(/^Updated between \D*1\D*2026 and \D*20\D*2026$/.test((await tokens(page))[2]), 'FB-17 the range reads as a sentence');
    // Delete removes the whole condition; focus moves to the next one.
    await page.getByRole('button', { name: 'Condition: contains. Change condition' }).focus(); await page.keyboard.press('Delete');
    check(JSON.stringify((await tokens(page)).map(t => t.split(' ')[0])) === '["Status","Updated"]' && await named(page) === 'Field: Updated. Change field', 'FB-18 Delete removes the condition and focuses the next');
    await page.getByRole('button', { name: /^Remove filter: Updated/ }).click();
    check(await named(page) === 'Field: Status. Change field', 'FB-19 removing the last condition focuses the one before');
    await page.getByRole('button', { name: /^Remove filter: Status/ }).click();
    check(await named(page) === 'Add filter' && (await tokens(page)).length === 0, 'FB-20 removing the only condition focuses Add filter');
    await page.close(); }

  { const page = await open();
    const relevant = await page.evaluate(() => [...document.querySelectorAll('tbody tr')].map(r => r.getAttribute('data-row-relevance')));
    check(relevant.filter(r => r === 'match').length === 2 && relevant.filter(r => r === 'miss').length === 3, 'FB-21 the paired table filters in place: matches rise, misses sink');
    await page.close(); }

  for (const scheme of ['daylight', 'nightfall']) for (const width of [320, 960]) {
    const page = await open({ scheme, width });
    for (const mode of ['standard', 'reduced-motion', 'forced-colors', 'increased-contrast']) {
      await page.emulateMedia({ reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference', forcedColors: mode === 'forced-colors' ? 'active' : 'none' });
      await page.locator('.alt-root').evaluate((root, more) => { root.dataset.contrast = more ? 'more' : 'system'; }, mode === 'increased-contrast');
      await page.getByRole('button', { name: 'Add filter' }).click();
      check(await page.evaluate(() => document.querySelector('.alt-filter-bar').scrollWidth <= document.querySelector('.alt-filter-bar').clientWidth + 1 && [...document.querySelectorAll('.alt-filter-picker')].every(p => p.getBoundingClientRect().right <= innerWidth + 1)), `${scheme}/${width}/${mode}: the bar wraps and the picker fits`);
      await page.keyboard.press('Escape');
    }
    await page.close();
  }
  check(errors.length === 0, `no page or console errors: ${errors.join('\n')}`);
  console.log(`FilterBar: ${passed} passed, 0 failed`);
} finally { await browser.close(); }
