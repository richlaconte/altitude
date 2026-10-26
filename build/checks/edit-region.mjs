// EditRegion session contract, against the preview's people service. ALT_FIXTURE_ROOT selects React 19 fixtures.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { fixturePath } from './fixture-path.mjs';

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const errors = [];
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); passed++; };
const open = async (fixture, { scheme = 'daylight', width = 960 } = {}) => {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  await page.goto(`file://${fixturePath('EditRegion', scheme)}`);
  page.setDefaultTimeout(6000);
  if (fixture && fixture !== 'success') {
    await page.getByText('Choose the next fixture', { exact: true }).click();
    await page.getByLabel('Save fixture').selectOption(fixture);
    await page.getByRole('button', { name: 'Reset example', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Edit Mara Quist', exact: true }).waitFor();
  return page;
};
const log = page => page.evaluate(() => JSON.parse(document.querySelector('[data-er-log]').textContent));
const region = page => page.locator('.alt-edit-region').first();
const form = page => page.getByRole('form', { name: 'Edit mara quist' });
const name = page => form(page).getByRole('textbox', { name: 'Name' });
const email = page => form(page).getByRole('textbox', { name: 'Email' });
const edit = page => page.getByRole('button', { name: 'Edit Mara Quist', exact: true }).click();
const focused = (locator) => locator.evaluate(el => el === document.activeElement);
const status = page => region(page).locator('.alt-edit-region-status');

try {
  { const page = await open();
    await edit(page); await form(page).waitFor();
    check(await focused(name(page)), 'ER-01 Edit opens a form named “Edit <label>” and focuses the first field');
    check(await page.getByRole('button', { name: 'Edit Inés Ortega', exact: true }).isVisible(), 'ER-02 neighbouring records stay in view and editable');
    await name(page).press('Enter'); await page.getByRole('button', { name: 'Edit Mara Quist', exact: true }).waitFor();
    check((await log(page)).length === 0, 'ER-03 saving an unchanged draft closes without a write');
    check(await focused(page.getByRole('button', { name: 'Edit Mara Quist', exact: true })), 'ER-04 completion returns focus to Edit');
    await edit(page); await name(page).fill('Mara de Quist');
    await form(page).getByRole('button', { name: 'Role' }).click(); await page.getByRole('option', { name: 'Editor' }).click();
    await form(page).getByRole('button', { name: 'Save changes' }).click(); await form(page).getByRole('button', { name: 'Save changes' }).click({ force: true, trial: false }).catch(() => {});
    await page.getByRole('button', { name: 'Edit Mara Quist', exact: true }).or(page.getByRole('button', { name: 'Edit Mara de Quist', exact: true })).waitFor();
    const events = await log(page);
    check(events.filter(e => e.event === 'requested').length === 1, 'ER-05 Save dispatches one write however often it is pressed');
    check(JSON.stringify(events.find(e => e.event === 'committed').changed) === '["name","role"]', 'ER-06 changed lists only the fields that differ');
    check(await page.getByText('Mara de Quist', { exact: true }).isVisible() && (await status(page).textContent()) === 'Saved', 'ER-07 the canonical record is shown and “Saved” announced');
    await page.close(); }

  { const page = await open();
    await edit(page); await name(page).fill('  '); await email(page).fill('not an email');
    await email(page).press('Enter');
    await form(page).getByText('Enter a name.').waitFor();
    check(await focused(name(page)) && await name(page).getAttribute('aria-invalid') === 'true' && await email(page).getAttribute('aria-invalid') === 'true', 'ER-08 validation marks each field and focuses the first invalid one');
    check((await log(page)).length === 0, 'ER-09 invalid drafts are not written');
    await name(page).fill('Mara'); check(await name(page).getAttribute('aria-invalid') !== 'true', 'ER-10 typing clears that field’s error');
    // Escape with a Select open closes the list only; the next Escape cancels.
    await form(page).getByRole('button', { name: 'Role' }).click(); await page.getByRole('listbox').waitFor();
    await page.keyboard.press('Escape'); await page.getByRole('listbox').waitFor({ state: 'detached' });
    check(await form(page).isVisible(), 'ER-11 Escape in an open Select closes the list, not the editor');
    await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Edit Mara Quist', exact: true }).waitFor();
    check(await page.getByText('mara@northwind.example · Owner · Gets updates').isVisible(), 'ER-12 a second Escape cancels and discards the draft');
    // IME: Enter during composition does nothing.
    await edit(page); await name(page).fill('Mara Q');
    await name(page).evaluate(el => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: true })));
    await page.waitForTimeout(400);
    check(await form(page).isVisible() && (await log(page)).length === 0, 'ER-13 Enter during IME composition does not save');
    await page.close(); }

  { const page = await open('fail-once');
    await edit(page); await name(page).fill('Mara Failed'); await name(page).press('Enter');
    await form(page).getByRole('alert').filter({ hasText: 'people service' }).waitFor();
    check(await name(page).inputValue() === 'Mara Failed' && await region(page).getAttribute('data-state') === 'error', 'ER-14 a failed save keeps the draft and shows the error in the editor');
    check(await region(page).locator('.alt-surface[data-status="failed"], [data-status="failed"]').count() > 0, 'ER-15 a failed save drops to the failed treatment');
    await form(page).getByRole('button', { name: 'Save changes' }).click();
    await page.getByRole('button', { name: 'Edit Mara Quist', exact: true }).or(page.getByRole('button', { name: 'Edit Mara Failed', exact: true })).waitFor();
    check(await page.getByText('Mara Failed', { exact: true }).isVisible(), 'ER-16 retrying after a failure saves');
    await page.close(); }

  { const page = await open('slow');
    await edit(page); await email(page).fill('mara.q@northwind.example'); await email(page).press('Enter');
    await page.waitForTimeout(100);
    check(await form(page).getAttribute('aria-busy') === 'true' && await name(page).getAttribute('readonly') !== null, 'ER-17 saving marks the form busy and its fields read-only');
    await page.keyboard.press('Escape');
    check(await form(page).isVisible() && (await status(page).textContent()).includes('Wait for the result'), 'ER-18 Escape does not cancel a dispatched save');
    await page.getByRole('button', { name: 'Edit Mara Quist', exact: true }).waitFor();
    check((await log(page)).filter(e => e.event === 'committed').length === 1, 'ER-19 the slow save completes once');
    await page.close(); }

  { const page = await open();
    await edit(page); await name(page).fill('Mara Draft');
    await page.getByText('Fixture controls', { exact: true }).click();
    await page.getByRole('button', { name: 'Apply external update to Mara' }).click();
    await form(page).getByText('This record changed', { exact: true }).waitFor();
    check(await form(page).getByRole('button', { name: 'Save changes' }).isDisabled() && await name(page).inputValue() === 'Mara Draft', 'ER-20 an outside change during editing keeps the draft and blocks Save');
    await form(page).getByRole('button', { name: 'Use current values' }).click();
    check(await email(page).inputValue() === 'm.quist@northwind.example' && await focused(name(page)), 'ER-21 Use current values replaces the draft and refocuses the form');
    await name(page).fill('Mara Current'); await name(page).press('Enter');
    await page.getByRole('button', { name: 'Edit Mara Current', exact: true }).or(page.getByRole('button', { name: 'Edit Mara Quist', exact: true })).waitFor();
    check(await page.getByText('Mara Current', { exact: true }).isVisible(), 'ER-22 a save on the current values succeeds');
    await page.close(); }

  { const page = await open('conflict-during-save');
    await edit(page); await name(page).fill('Mara Racing'); await name(page).press('Enter');
    await form(page).getByText('This record changed while saving', { exact: false }).waitFor();
    check(await form(page).getByRole('button', { name: 'Save changes' }).isDisabled(), 'ER-23 an outside change during a save latches a conflict');
    check(!(await page.locator('.er-list').textContent()).includes('Mara Racing'), 'ER-24 the racing result is never published');
    await page.close(); }

  // A region rendered already open, under StrictMode (its simulated unmount and remount), still saves.
  { const page = await open();
    await page.evaluate(() => {
      const R = window.React, A = window.Altitude, h = R.createElement;
      const host = document.createElement('div'); host.id = 'er-strict'; document.body.prepend(host);
      window.erSaves = [];
      function Fixture() {
        const [value, setValue] = R.useState({ name: 'Ada' });
        return h(A.AltitudeProvider, null, h(A.EditRegion, { label: 'Person', value, defaultOpen: true, onValueChange: setValue,
          onSave: draft => { window.erSaves.push(draft.name); return { ok: true, value: draft }; } },
          h(A.EditRegionView, null, h('span', { id: 'er-strict-name' }, value.name)),
          h(A.EditRegionForm, null, field => h(A.Field, { label: 'Strict name' }, h(A.Input, field('name'))))));
      }
      window.ReactDOM.createRoot(host).render(h(R.StrictMode, null, h(Fixture)));
    });
    const input = page.getByRole('textbox', { name: 'Strict name' });
    await input.fill('Ada Lovelace'); await input.press('Enter');
    await page.locator('#er-strict-name').waitFor();
    check(await page.locator('#er-strict-name').textContent() === 'Ada Lovelace' && JSON.stringify(await page.evaluate(() => window.erSaves)) === '["Ada Lovelace"]', 'ER-25 a defaultOpen region saves once under StrictMode');
    await page.close(); }

  for (const scheme of ['daylight', 'nightfall', 'mesa', 'alpine']) for (const width of [320, 960]) {
    const page = await open(undefined, { scheme, width });
    for (const mode of ['standard', 'reduced-motion', 'forced-colors', 'increased-contrast']) {
      await page.emulateMedia({ reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference', forcedColors: mode === 'forced-colors' ? 'active' : 'none' });
      await page.locator('.alt-root').evaluate((root, more) => { root.dataset.contrast = more ? 'more' : 'system'; }, mode === 'increased-contrast');
      await edit(page); await form(page).waitFor();
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${scheme}/${width}/${mode}: the open editor fits without horizontal scrolling`);
      await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Edit Mara Quist', exact: true }).waitFor();
    }
    await page.close();
  }
  check(errors.length === 0, `no page or console errors: ${errors.join('\n')}`);
  console.log(`EditRegion: ${passed} passed, 0 failed (React ${process.env.ALT_FIXTURE_ROOT ? '19 fixtures' : '18 previews'})`);
} finally { await browser.close(); }
