// ItemGroup: edit in place, add several in a row, reorder by keyboard, remove with recovery or confirmation. ALT_FIXTURE_ROOT selects React 19 fixtures.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { fixturePath } from './fixture-path.mjs';

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const errors = [];
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); passed++; };
const open = async ({ scheme = 'daylight', width = 960 } = {}) => {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  await page.goto(`file://${fixturePath('ItemGroup', scheme)}`);
  page.setDefaultTimeout(5000);
  return page;
};
const hooks = page => page.locator('section').first();
const titles = (page, n = 0) => page.locator('section').nth(n).locator('.alt-item-title').allTextContents();
const focusedName = page => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent);
const said = (page, t) => page.waitForFunction(t => [...document.querySelectorAll('.alt-item-sr')].some(e => e.textContent.includes(t)), t);

try {
  { const page = await open();
    check(await hooks(page).locator('ul > li').count() === 3, 'IG-01 a plain list of slats');
    await page.getByRole('button', { name: 'Edit Staging' }).click();
    const form = page.getByRole('form', { name: 'Edit staging' });
    check(await form.getByRole('textbox', { name: 'Name' }).evaluate(el => el === document.activeElement), 'IG-02 Edit lifts the slat into its editor and focuses the first field');
    check(await page.getByRole('button', { name: 'Edit Production' }).isVisible(), 'IG-03 the neighbours stay readable');
    await page.getByRole('button', { name: 'Edit Production' }).click();
    check(await form.isVisible() && (await focusedName(page)) !== 'Edit Production', 'IG-04 opening another while one is open keeps the first');
    await form.getByRole('textbox', { name: 'Name' }).fill('Staging EU'); await form.getByRole('textbox', { name: 'Name' }).press('Enter');
    await page.getByRole('button', { name: 'Edit Staging EU' }).waitFor();
    check(await focusedName(page) === 'Edit Staging EU', 'IG-05 saving returns focus to that slat’s Edit button');
    await said(page, 'Saved');
    await page.getByRole('button', { name: 'Edit Staging EU' }).click(); await page.getByRole('button', { name: 'Cancel' }).click();
    check(await focusedName(page) === 'Edit Staging EU', 'IG-06 Cancel returns focus too');
    // Add, and add again.
    await page.getByRole('button', { name: 'Add webhook' }).click();
    const fresh = page.getByRole('form', { name: 'Edit new webhook' });
    await fresh.getByRole('textbox', { name: 'Name' }).fill('Audit log'); await fresh.getByRole('button', { name: 'Add webhook' }).click();
    await fresh.getByText('Enter a name.').or(fresh.getByText('Use an https:// address.')).first().waitFor();
    check(await fresh.getByRole('textbox', { name: 'Endpoint URL' }).getAttribute('aria-invalid') === 'true', 'IG-07 a refused new item keeps the editor with field errors');
    await fresh.getByRole('textbox', { name: 'Endpoint URL' }).fill('https://audit.northwind.example/in'); await fresh.getByRole('button', { name: 'Add webhook' }).click();
    await said(page, 'Added Audit log');
    check((await titles(page)).at(-1) === 'Audit log' && (await focusedName(page)).endsWith('Add webhook'), 'IG-08 the new slat lands and focus goes to a fresh add slat, ready for the next');
    // Remove with Undo.
    await page.getByRole('button', { name: 'Remove Staging EU' }).click();
    await page.locator('.alt-item-undo').getByText('Staging EU is removed.').waitFor();
    check(!(await titles(page)).includes('Staging EU') && await focusedName(page) === 'Remove Billing events', 'IG-09 removing moves focus to the next slat’s Remove and offers Undo');
    await page.getByRole('button', { name: 'Undo' }).click();
    await said(page, 'Staging EU restored');
    check(JSON.stringify(await titles(page)) === '["Production","Staging EU","Billing events","Audit log"]', 'IG-10 Undo puts it back where it was');
    // Reorder by keyboard.
    await page.getByRole('button', { name: 'Move Audit log', exact: true }).focus(); await page.keyboard.press('Space');
    check(await page.getByRole('button', { name: 'Move Audit log', exact: true }).getAttribute('aria-pressed') === 'true', 'IG-11 Space picks a slat up');
    await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp');
    check(JSON.stringify(await titles(page)) === '["Production","Audit log","Staging EU","Billing events"]', 'IG-12 arrows carry it, showing where it will land');
    await page.keyboard.press('Escape');
    check((await titles(page)).at(-1) === 'Audit log', 'IG-13 Escape puts it back');
    await page.keyboard.press('Space'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('Space');
    await page.waitForFunction(() => document.querySelector('.alt-item-sr[aria-live="assertive"]').textContent.includes('dropped. Position 1 of 4'));
    check((await titles(page))[0] === 'Audit log' && await focusedName(page) === 'Move Audit log', 'IG-14 Space drops it, keeping focus on its grip');
    await page.close(); }

  { const page = await open();
    const options = page.locator('section').nth(1);
    check(await options.getByText('No options yet').isVisible(), 'IG-15 an empty group shows its EmptyState');
    for (const label of ['Yes', 'No']) { await page.getByRole('button', { name: 'Add option' }).click(); await page.getByRole('form', { name: 'Edit new option' }).getByRole('textbox').fill(label); await page.keyboard.press('Enter'); await said(page, `Added ${label}`); }
    check(JSON.stringify(await titles(page, 1)) === '["Yes","No"]', 'IG-16 several can be added in a row with Enter');
    await page.getByRole('button', { name: 'Remove Yes' }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete “Yes” permanently?' });
    await dialog.waitFor();
    check(await dialog.getByRole('button', { name: 'Cancel' }).evaluate(el => el === document.activeElement), 'IG-17 confirmed removal asks in a dialog naming the record, with Cancel focused');
    await dialog.getByRole('button', { name: 'Cancel' }).click(); await dialog.waitFor({ state: 'detached' });
    check((await titles(page, 1)).includes('Yes') && await focusedName(page) === 'Remove Yes', 'IG-18 Cancel keeps it and returns focus');
    await page.getByRole('button', { name: 'Remove Yes' }).click(); await dialog.getByRole('button', { name: 'Delete option' }).click();
    await said(page, 'Yes removed.');
    check(JSON.stringify(await titles(page, 1)) === '["No"]' && await page.getByRole('button', { name: 'Undo' }).count() === 0, 'IG-19 confirming removes it, with no Undo offered');
    await page.close(); }

  for (const scheme of ['daylight', 'nightfall', 'mesa', 'alpine']) for (const width of [320, 960]) {
    const page = await open({ scheme, width });
    for (const mode of ['standard', 'reduced-motion', 'forced-colors', 'increased-contrast']) {
      await page.emulateMedia({ reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference', forcedColors: mode === 'forced-colors' ? 'active' : 'none' });
      await page.locator('.alt-root').evaluate((root, more) => { root.dataset.contrast = more ? 'more' : 'system'; }, mode === 'increased-contrast');
      await page.getByRole('button', { name: 'Edit Production' }).click();
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${scheme}/${width}/${mode}: no horizontal scrolling with a slat in edit`);
      await page.keyboard.press('Escape');
    }
    await page.close();
  }
  // newItem() that returns a fresh id each call, with the parent re-rendering while the add editor is open: the draft
  // must be made once, not read as an outside change.
  { const page = await open();
    await page.evaluate(() => {
      const R = window.React, A = window.Altitude, h = R.createElement;
      const host = document.createElement('div'); host.id = 'fresh-item'; document.body.prepend(host);
      function Fixture() {
        const [items, setItems] = R.useState([{ id: 'one', name: 'One' }]);
        const [tick, setTick] = R.useState(0);
        window.freshTick = () => setTick(t => t + 1);
        return h(A.AltitudeProvider, null, h('div', { 'data-tick': tick }, h(A.ItemGroup, {
          'aria-label': 'Fresh items', items, getKey: x => x.id, getLabel: x => x.name || 'Untitled',
          renderItem: x => h('span', { className: 'alt-item-title' }, x.name),
          renderEditor: field => h(A.Field, { label: 'Item name' }, h(A.Input, field('name'))),
          newItem: () => ({ id: 'new-' + Math.random().toString(36).slice(2), name: '' }),
          onCreate: draft => { const value = { ...draft, id: 'saved-' + draft.id }; setItems(list => [...list, value]); return { ok: true, value }; },
        })));
      }
      window.ReactDOM.createRoot(host).render(h(Fixture));
    });
    const scope = page.locator('#fresh-item');
    await scope.getByRole('button', { name: 'Add item' }).click();
    const name = scope.getByRole('textbox', { name: 'Item name' });
    await name.fill('Two');
    await page.evaluate(() => { window.freshTick(); window.freshTick(); });
    await page.waitForTimeout(100);
    check(await scope.getByText('This record changed').count() === 0 && await name.inputValue() === 'Two', 'IG-NEW-01 a newItem() with a fresh id each call survives parent re-renders: no false conflict');
    await name.press('Enter');
    await scope.locator('.alt-item-title', { hasText: 'Two' }).waitFor();
    check(true, 'IG-NEW-02 the new item still saves');
    await page.close(); }
  check(errors.length === 0, `no page or console errors: ${errors.join('\n')}`);
  console.log(`ItemGroup: ${passed} passed, 0 failed`);
} finally { await browser.close(); }
