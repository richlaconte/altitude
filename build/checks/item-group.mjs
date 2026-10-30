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
// Samples a slat's top every animation frame until stop(): the evidence that something moved, or didn't.
const track = async (page, title, n = 0) => {
  await page.evaluate(([title, n]) => {
    const find = () => [...document.querySelectorAll('section')[n].querySelectorAll('.alt-item-title')].find(e => e.textContent === title)?.closest('li');
    window.__track = { ys: [], on: true };
    const tick = () => { if (!window.__track.on) return; const el = find(); if (el) window.__track.ys.push(Math.round(el.getBoundingClientRect().top * 10) / 10); requestAnimationFrame(tick); };
    tick();
  }, [title, n]);
  return { stop: () => page.evaluate(() => { window.__track.on = false; const ys = window.__track.ys; return { min: Math.min(...ys), max: Math.max(...ys), distinct: new Set(ys).size }; }) };
};
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
    // Remove with Undo: the receipt is left in the slat's place, and nothing moves while it holds.
    const watch = await track(page, 'Billing events');
    await page.getByRole('button', { name: 'Remove Staging EU' }).click();
    await page.mouse.move(0, 0);
    const slot = hooks(page).locator('li[data-item="h2"]');
    await slot.locator('.alt-receipt-note').getByText('Staging EU is removed.').waitFor();
    check(await slot.getAttribute('data-removed') === '' && await slot.getByRole('button', { name: 'Undo removal of Staging EU' }).isVisible() && await focusedName(page) === 'Remove Billing events',
      'IG-09 the removed slat shows its receipt with Undo in its own slot, and focus moves to the next slat’s Remove');
    check(await slot.locator('.alt-receipt-note').getAttribute('role') === 'status' && (await slot.locator('.alt-receipt-note').textContent()).includes('Undo is available.') && !(await page.locator('.alt-item-sr').allTextContents()).some(t => t.includes('is removed')),
      'IG-RR-01 the receipt announces "Staging EU is removed. Undo is available." once, not the group as well');
    await page.waitForTimeout(1200);
    check(await page.locator('.alt-item-undo').count() === 0 && await page.locator('.alt-alert').count() === 0, 'IG-RR-02 no Alert after the add slot');
    await slot.getByRole('button', { name: 'Undo removal of Staging EU' }).click();
    await said(page, 'Staging EU restored');
    const moved = await watch.stop();
    check(JSON.stringify(await titles(page)) === '["Production","Staging EU","Billing events","Audit log"]' && await focusedName(page) === 'Remove Staging EU', 'IG-10 Undo during the hold puts it back in place, focus on its Remove');
    check(moved.max - moved.min < 0.5, `IG-RR-03 nothing below moves from the click to the restore (${moved.min}–${moved.max})`);
    await page.waitForFunction(() => document.querySelector('li[data-item="h2"]')?.hasAttribute('data-settle'));
    check(true, 'IG-RR-04 the restored slat settles with an afterglow');

    // Left alone, the receipt holds for dur-linger, lifts off, and the gap glides shut; then Undo is in a toast.
    const glide = await track(page, 'Billing events');
    await page.getByRole('button', { name: 'Remove Staging EU' }).click();
    await page.mouse.move(0, 0);
    await slot.locator('.alt-receipt-note').getByText('Staging EU is removed.').waitFor();
    const heldAt = Date.now();
    await slot.waitFor({ state: 'detached', timeout: 6000 });
    const closedAfter = Date.now() - heldAt;
    const path = await glide.stop();
    check(closedAfter >= 1900 && JSON.stringify(await titles(page)) === '["Production","Billing events","Audit log"]', `IG-RR-05 the receipt holds for dur-linger, then the slot closes (${closedAfter}ms)`);
    check(path.distinct >= 4 && path.max - path.min > 40, `IG-RR-06 the gap glides shut: the slat below passes through ${path.distinct} positions over ${Math.round(path.max - path.min)}px`);
    const toastBox = page.locator('.alt-toast', { hasText: 'Staging EU is removed.' });
    await toastBox.waitFor();
    check(await toastBox.getAttribute('aria-live') === 'off' && await toastBox.getAttribute('role') === null, 'IG-RR-07 the toast offers Undo without announcing the removal a second time');
    const back = await track(page, 'Billing events');
    await toastBox.getByRole('button', { name: 'Undo' }).click();
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Remove Staging EU', null, { timeout: 2000 }).catch(() => {});
    await said(page, 'Staging EU restored');
    await page.waitForTimeout(400);
    const opened = await back.stop();
    check(JSON.stringify(await titles(page)) === '["Production","Staging EU","Billing events","Audit log"]' && await focusedName(page) === 'Remove Staging EU', 'IG-RR-08 Undo from the toast brings it back where it was, focus on its Remove');
    check(opened.distinct >= 3, `IG-RR-09 it glides its slot open (${opened.distinct} positions)`);
    await page.waitForTimeout(500);
    check(await page.locator('.alt-toast:not([style*="opacity: 0"])', { hasText: 'Staging EU is removed.' }).count() === 0, 'IG-RR-10 the toast is withdrawn once the item is back');

    // Hover or focus holds the receipt.
    await page.getByRole('button', { name: 'Remove Staging EU' }).click();
    await slot.getByRole('button', { name: 'Undo removal of Staging EU' }).focus();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(3000);
    check(await slot.getAttribute('data-removed') === '', 'IG-RR-11 the hold doesn’t expire while focus is in the receipt');
    await slot.getByRole('button', { name: 'Undo removal of Staging EU' }).click();
    await said(page, 'Staging EU restored');
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

  // Several removals at once close together, and reduced motion closes the gap at once.
  for (const reduce of [false, true]) {
    const page = await open();
    if (reduce) await page.emulateMedia({ reducedMotion: 'reduce' });
    // Both removals in the same task, so they really are due within the batch window (250ms) however slow the machine:
    // separate clicks with waits between them drifted past it on CI's loaded runners.
    await page.getByRole('button', { name: 'Remove Production' }).waitFor();
    await page.evaluate(() => { for (const name of ['Remove Production', 'Remove Billing events']) [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === name || b.textContent === name)?.click(); });
    await hooks(page).locator('li[data-item="h1"][data-removed]').waitFor();
    await hooks(page).locator('li[data-item="h3"][data-removed]').waitFor();
    await page.evaluate(() => document.activeElement?.blur());
    await page.mouse.move(0, 0);
    const times = await page.evaluate(() => new Promise(resolve => {
      const at = {}, start = performance.now();
      const tick = () => {
        for (const k of ['h1', 'h3']) if (!(k in at) && document.querySelector(`li[data-item="${k}"][data-leaving]`)) at[k] = performance.now();
        if (Object.keys(at).length === 2 || performance.now() - start > 6000) resolve(at); else requestAnimationFrame(tick);
      };
      tick();
    }));
    check(times.h1 && times.h3 && Math.abs(times.h1 - times.h3) < 300, `IG-RR-12${reduce ? 'r' : ''} two receipts due close together lift off together (${Math.round(Math.abs(times.h1 - times.h3))}ms apart)`);
    if (reduce) {
      const watch = await track(page, 'Staging');
      await hooks(page).locator('li[data-item="h1"]').waitFor({ state: 'detached' });
      await page.waitForTimeout(100);
      const path = await watch.stop();
      check(path.distinct <= 2, `IG-RR-13 reduced motion: the gap closes at once (${path.distinct} positions)`);
    }
    await page.waitForFunction(() => document.querySelectorAll('section:first-of-type li.alt-item-slat').length === 1);
    check(JSON.stringify(await titles(page)) === '["Staging"]', `IG-RR-14${reduce ? 'r' : ''} both slots close`);
    await page.close();
  }

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
    const shut = await track(page, 'No', 1);
    await page.getByRole('button', { name: 'Remove Yes' }).click(); await dialog.getByRole('button', { name: 'Delete option' }).click();
    await said(page, 'Yes removed.');
    check(await options.locator('li[data-closing]').count() <= 1 && await page.getByRole('button', { name: /^Undo/ }).count() === 0, 'IG-19 confirming removes it, with no Undo or receipt offered');
    await options.locator('li[data-closing]').waitFor({ state: 'detached' });
    const path = await shut.stop();
    check(JSON.stringify(await titles(page, 1)) === '["No"]' && path.distinct >= 3, `IG-RR-15 the confirmed slat glides shut instead of vanishing (${path.distinct} positions)`);
    check(await focusedName(page) === 'Remove No', 'IG-RR-16 focus moves to the next slat’s Remove');
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
