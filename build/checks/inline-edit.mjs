// Deterministic contract checks. ALT_FIXTURE_ROOT selects the React 19/StrictMode source fixtures.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { fixturePath } from './fixture-path.mjs';

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const browserErrors = [];
const evidence = fileURLToPath(new URL('../test/alt-05/', import.meta.url));
mkdirSync(evidence, { recursive: true });
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const open = async (options = {}) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 760 }, deviceScaleFactor: 2, ...options });
  page.on('pageerror', e => browserErrors.push(e.message));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) browserErrors.push(m.text()); });
  await page.goto(`file://${fixturePath('InlineEdit')}`);
  await page.waitForFunction(() => window.Altitude && window.React);
  const runtime = await page.evaluate(() => window.React.version);
  const expected = process.env.ALT_FIXTURE_ROOT ? '19.' : '18.';
  assert.ok(runtime.startsWith(expected), `Expected React ${expected} runtime, received ${runtime}`);
  page.setDefaultTimeout(6000);
  return page;
};
const mount = async (page, options = {}) => {
  await page.evaluate(options => {
    const R = window.React, A = window.Altitude, h = R.createElement;
    document.getElementById('root').style.display = 'none';
    const host = document.createElement('div'); host.id = 'inline-contract'; document.body.append(host);
    const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
    const api = { calls: [], publications: [], validations: [], saves: [], checks: [], submits: 0 };
    window.inlineHarness = api;
    function Fixture() {
      const [value, setValue] = R.useState(options.value ?? 'Original name');
      const [disabled, setDisabled] = R.useState(false);
      const [show, setShow] = R.useState(true);
      Object.assign(api, { setValue, setDisabled, setShow });
      const props = {
        value, label: 'Record name', required: options.required ?? true, maxLength: options.maxLength,
        disabled, focusFallback: () => options.invalidFallback ? document.createElement('button') : document.getElementById('fallback'),
        onValueChange: value => { api.publications.push(value); setValue(value); if (options.removeOnPublish) setShow(false); },
        onSave: (draft, context) => {
          api.calls.push({ draft, context });
          if (options.reentrant) document.querySelector('#inline-contract input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          if (options.save === 'sync') return { ok: true, value: typeof draft === 'string' && !options.editor ? draft.trim() : draft };
          if (options.save === 'throw') throw new Error('SECRET server detail');
          if (options.save === 'malformed') return { ok: true, value: 42 };
          const d = deferred(); api.saves.push(d); return d.promise;
        },
      };
      if (options.multiline) Object.assign(props, { multiline: true, rows: 3, maxRows: 5 });
      if (options.editor === 'select') Object.assign(props, {
        commit: 'on-choose', renderValue: v => ({ a: 'Alpha', b: 'Bravo' })[v] ?? 'Not set',
        editor: control => h(A.Select, { ...control, items: [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Bravo' }] }),
      });
      if (options.validate) props.validate = draft => {
        api.validations.push(draft);
        if (options.validate === 'sync') return draft === 'Duplicate' ? 'Choose a different name.' : undefined;
        if (options.validate === 'throw') throw new Error('SECRET validation detail');
        const d = deferred(); api.checks.push(d); return d.promise;
      };
      return h(A.AltitudeProvider, null, h('form', { onSubmit: e => { e.preventDefault(); api.submits++; } },
        show ? h(A.InlineEdit, props) : h('p', null, 'Record removed'),
        h('button', { id: 'elsewhere', type: 'button' }, 'Other action'),
        h('button', { id: 'fallback', type: 'button' }, 'Fallback')));
    }
    window.inlineRoot = window.ReactDOM.createRoot(host);
    window.inlineRoot.render(h(R.StrictMode, null, h(Fixture)));
  }, options);
  await page.getByRole('button', { name: 'Edit Record name', exact: true }).waitFor();
};
const edit = page => page.getByRole('button', { name: 'Edit Record name', exact: true }).click();
const input = page => page.getByRole('textbox', { name: 'Record name' });
const save = page => page.getByRole('button', { name: 'Save changes', exact: true }).click();
const api = (page, key) => page.evaluate(key => window.inlineHarness[key], key);
const resolveSave = (page, result, index = 0) => page.evaluate(({ result, index }) => window.inlineHarness.saves[index].resolve(result), { result, index });
const resolveCheck = (page, result, index = 0) => page.evaluate(({ result, index }) => window.inlineHarness.checks[index].resolve(result), { result, index });
const read = page => page.getByRole('button', { name: 'Edit Record name', exact: true }).waitFor();
const waitState = (page, state) => page.locator(`#inline-contract .alt-inline-edit[data-state="${state}"]`).waitFor();

try {
  { const page = await open(); await mount(page); await edit(page);
    await input(page).waitFor();
    check(await input(page).evaluate(el => document.activeElement === el && el.selectionStart === 0 && el.selectionEnd === el.value.length), 'opening focuses and selects the value');
    await input(page).fill('  Local text  '); await page.locator('#elsewhere').click();
    check(await input(page).inputValue() === '  Local text  ' && (await api(page, 'calls')).length === 0, 'outside interaction retains untouched draft without write');
    await input(page).focus(); await page.keyboard.press('Escape'); await read(page);
    check(await page.getByRole('button', { name: 'Edit Record name' }).evaluate(el => el === document.activeElement), 'Escape returns focus to Edit');
    await edit(page); await save(page); await read(page);
    check((await api(page, 'calls')).length === 0 && (await api(page, 'publications')).length === 0, 'no-change save closes without callbacks');
    await page.close(); }

  { const page = await open(); await mount(page, { validate: 'sync' }); await edit(page);
    await input(page).fill(''); await save(page);
    check((await api(page, 'calls')).length === 0 && await input(page).getAttribute('aria-invalid') === 'true', 'required validation blocks empty writes');
    check(await input(page).evaluate(el => document.getElementById(el.getAttribute('aria-describedby'))?.getAttribute('role') === 'alert'), 'Field associates a single alert with the input');
    await input(page).fill('Duplicate'); await save(page); await page.getByRole('alert').filter({ hasText: 'Choose a different name.' }).waitFor();
    check((await api(page, 'calls')).length === 0 && await input(page).inputValue() === 'Duplicate', 'application validation retains rejected text');
    await input(page).fill('  Valid name  '); check(await page.getByRole('alert').count() === 0, 'typing clears ordinary errors');
    await save(page); await waitState(page, 'saving');
    await resolveSave(page, { ok: true, value: 'Valid name' }); await read(page);
    check(JSON.stringify(await api(page, 'publications')) === '["Valid name"]', 'canonical result publishes exactly once');
    check(await page.locator('#inline-contract .alt-inline-edit-value').textContent() === 'Valid name', 'read mode shows the controlled canonical value');
    check(await page.locator('#inline-contract [role="status"]').textContent() === 'Changes saved', 'accepted success announces outside the busy subtree');
    check(await page.locator('#inline-contract .alt-inline-edit-slot').evaluate(el => el.hasAttribute('data-settle') && getComputedStyle(el, '::before').animationDuration === '5s'), 'a saved value’s afterglow fades over the 5s settleDuration default');
    await page.close(); }

  { const page = await open(); await mount(page, { required: false }); await edit(page); await input(page).fill(''); await save(page);
    check((await api(page, 'calls'))[0].draft === '', 'optional empty string reaches persistence');
    await resolveSave(page, { ok: true, value: '' }); await read(page);
    check(await page.locator('#inline-contract .alt-inline-edit-value').textContent() === 'Not set', 'empty committed value reads Not set'); await page.close(); }

  { const page = await open(); await mount(page, { validate: 'deferred' }); await edit(page); await input(page).fill('First'); await save(page);
    await waitState(page, 'validating');
    check(await input(page).getAttribute('readonly') !== null && await page.locator('#inline-contract [data-status="pending"]').count() === 0, 'validation is read-only but is not a pending write');
    await input(page).focus(); await page.keyboard.press('Escape'); await read(page);
    await edit(page); await input(page).fill('Second'); await save(page); await resolveCheck(page, 'Stale error', 0);
    check(await page.getByRole('alert').count() === 0 && (await api(page, 'calls')).length === 0, 'cancelled validation cannot affect a newer session');
    await resolveCheck(page, undefined, 1); await waitState(page, 'saving');
    check((await api(page, 'calls')).length === 1 && (await api(page, 'calls'))[0].draft === 'Second', 'only current validated draft dispatches'); await page.close(); }

  { const page = await open(); await mount(page, { reentrant: true }); await edit(page); await input(page).fill('Pending');
    await input(page).press('Enter'); await input(page).press('Enter'); await save(page);
    check((await api(page, 'calls')).length === 1, 'synchronous guard blocks repeated and reentrant submission');
    check(await page.getByRole('button', { name: 'Cancel', exact: true }).isDisabled(), 'Cancel is unavailable during a write');
    await input(page).press('Escape');
    check(await page.locator('#inline-contract [role="status"]').textContent() === 'Saving changes. Wait for the result.', 'pending Escape consumes the key and explains waiting');
    check((await api(page, 'submits')) === 0, 'Enter never submits an ancestor form');
    await resolveSave(page, { ok: false, error: 'The server declined this name. Try another.' }); await waitState(page, 'error');
    check(await input(page).inputValue() === 'Pending' && await input(page).getAttribute('readonly') === null, 'known failure retains editable input');
    await save(page); await resolveSave(page, { ok: true, value: 'Pending' }, 1); await read(page);
    check((await api(page, 'calls')).every(call => call.context.previousValue === 'Original name'), 'retry keeps the captured baseline'); await page.close(); }

  for (const failure of ['throw', 'malformed', 'reject']) {
    const page = await open(); await mount(page, { save: failure }); await edit(page); await input(page).fill('Retained'); await save(page);
    if (failure === 'reject') await page.evaluate(() => window.inlineHarness.saves[0].reject(new Error('SECRET rejected transport detail')));
    await waitState(page, 'error');
    check((await page.getByRole('alert').textContent()).includes('We couldn’t save this change. Try again.') && !(await page.locator('body').innerText()).includes('SECRET'), `${failure} uses a safe generic error`);
    check(await input(page).inputValue() === 'Retained', `${failure} retains input`); await page.close();
  }

  { const page = await open(); await mount(page); await edit(page); await input(page).fill('My attempt');
    await page.evaluate(() => window.inlineHarness.setValue('New record')); await waitState(page, 'conflict');
    check(await input(page).inputValue() === 'My attempt' && await page.getByRole('button', { name: 'Save changes', exact: true }).isDisabled(), 'external update preserves draft and blocks Save');
    await page.getByRole('button', { name: 'Use current value' }).click();
    check(await input(page).inputValue() === 'New record' && await input(page).evaluate(el => document.activeElement === el), 'explicit conflict recovery adopts current value and focuses input');
    await input(page).fill('Fresh edit'); await save(page);
    check((await api(page, 'calls'))[0].context.previousValue === 'New record', 'conflict recovery captures the new baseline'); await page.close(); }

  { const page = await open(); await mount(page, { validate: 'deferred' }); await edit(page); await input(page).fill('Draft'); await save(page);
    await page.evaluate(() => window.inlineHarness.setValue('External')); await waitState(page, 'conflict'); await resolveCheck(page, undefined);
    check((await api(page, 'calls')).length === 0, 'external updates invalidate pending validation'); await page.close(); }

  { const page = await open(); await mount(page); await edit(page); await input(page).fill('My save'); await save(page);
    await page.evaluate(() => window.inlineHarness.setValue('External')); await page.waitForTimeout(30);
    await page.evaluate(() => window.inlineHarness.setValue('Original name')); await page.waitForTimeout(30);
    await resolveSave(page, { ok: true, value: 'My save' }); await waitState(page, 'conflict');
    check((await api(page, 'publications')).length === 0 && await input(page).inputValue() === 'My save', 'saving conflict latches even when the controlled value returns to the baseline');
    check((await page.getByRole('alert').textContent()).includes('Your save may have completed'), 'saving conflict reports uncertainty honestly');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await read(page);
    check(await page.locator('#inline-contract .alt-inline-edit-value').textContent() === 'Original name', 'Cancel reads the latest controlled value'); await page.close(); }

  for (const pending of ['save', 'validation']) {
    const page = await open(); await mount(page, pending === 'validation' ? { validate: 'deferred' } : {}); await edit(page); await input(page).fill('Unmounted'); await save(page);
    await page.evaluate(() => window.inlineHarness.setShow(false)); await page.getByText('Record removed').waitFor(); await page.locator('#elsewhere').focus();
    if (pending === 'validation') await resolveCheck(page, undefined); else await resolveSave(page, { ok: true, value: 'Unmounted' });
    await page.waitForTimeout(40);
    check((await api(page, 'publications')).length === 0 && (pending !== 'validation' || (await api(page, 'calls')).length === 0), `unmount suppresses late ${pending} callbacks`);
    check(await page.locator('#elsewhere').evaluate(el => el === document.activeElement), `unmount never steals focus after ${pending}`); await page.close();
  }

  { const page = await open(); await mount(page); await edit(page); await input(page).fill('No steal'); await save(page); await page.locator('#elsewhere').focus();
    await resolveSave(page, { ok: true, value: 'No steal' }); await read(page);
    check(await page.locator('#elsewhere').evaluate(el => document.activeElement === el), 'async completion leaves outside focus alone'); await page.close(); }

  { const page = await open(); await mount(page); await edit(page); await input(page).fill('Disabled later'); await save(page);
    await page.evaluate(() => window.inlineHarness.setDisabled(true));
    await page.locator('#inline-contract .alt-inline-edit').evaluate(el => { el.tabIndex = -1; el.focus(); });
    await resolveSave(page, { ok: true, value: 'Disabled later' }); await read(page);
    check(await page.locator('#fallback').evaluate(el => document.activeElement === el), 'unavailable trigger uses connected focus fallback');
    check(await page.getByRole('button', { name: 'Edit Record name' }).isDisabled(), 'disabled prevents new editing'); await page.close(); }

  { const page = await open(); await mount(page); await edit(page); await input(page).fill('Disabled draft'); await page.evaluate(() => window.inlineHarness.setDisabled(true));
    await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await read(page);
    check((await api(page, 'calls')).length === 0, 'becoming disabled still permits cancellation'); await page.close(); }

  { const page = await open(); await mount(page, { save: 'sync' }); await edit(page); await input(page).fill('Composition');
    await input(page).evaluate(el => { for (const key of ['Enter', 'Escape']) el.dispatchEvent(new KeyboardEvent('keydown', { key, isComposing: true, bubbles: true })); for (const key of ['Enter', 'Escape']) el.dispatchEvent(new KeyboardEvent('keydown', { key, keyCode: 229, bubbles: true })); });
    check((await api(page, 'calls')).length === 0 && await input(page).count() === 1, 'composition Enter and Escape including legacy 229 do not submit or cancel');
    await input(page).focus(); await page.keyboard.press('Tab');
    check(await page.getByRole('button', { name: 'Save changes', exact: true }).evaluate(el => document.activeElement === el), 'Tab reaches Save');
    await page.keyboard.press('Tab'); check(await page.getByRole('button', { name: 'Cancel', exact: true }).evaluate(el => document.activeElement === el), 'Tab reaches Cancel');
    await page.keyboard.press('Tab'); check(await page.locator('#elsewhere').evaluate(el => document.activeElement === el), 'local group does not trap Tab');
    await input(page).press('Enter'); await read(page);
    check((await api(page, 'calls')).length === 1 && (await api(page, 'publications')).length === 1, 'synchronous save succeeds once'); await page.close(); }

  { const page = await open(); await mount(page, { validate: 'deferred' }); await edit(page); await save(page); await read(page);
    check((await api(page, 'validations')).length === 0, 'exact no-change save bypasses optional validation'); await page.close(); }

  { const page = await open(); await mount(page, { validate: 'throw' }); await edit(page); await input(page).fill('Still here'); await save(page); await waitState(page, 'error');
    check((await api(page, 'calls')).length === 0 && await input(page).inputValue() === 'Still here', 'validation exceptions preserve input without persistence');
    check((await page.getByRole('alert').textContent()).includes('We couldn’t save this change. Try again.'), 'validation exceptions do not expose diagnostics'); await page.close(); }

  { const page = await open(); await mount(page, { maxLength: 3 }); await edit(page);
    await input(page).evaluate(el => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '😀😀'); el.dispatchEvent(new Event('input', { bubbles: true })); });
    await save(page); await waitState(page, 'error');
    check((await api(page, 'calls')).length === 0 && await input(page).inputValue() === '😀😀', 'maxLength checks UTF-16 length even for programmatically supplied text'); await page.close(); }

  { const page = await open(); await mount(page, { validate: 'deferred' }); await edit(page); await input(page).fill('Wait'); await save(page);
    await page.evaluate(() => window.inlineHarness.setDisabled(true)); await resolveCheck(page, undefined); await waitState(page, 'editing');
    check((await api(page, 'calls')).length === 0, 'disabling during validation prevents dispatch'); await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await read(page); await page.close(); }

  { const page = await open(); await mount(page, { invalidFallback: true }); await edit(page); await input(page).fill('Invalid fallback'); await save(page);
    await page.evaluate(() => window.inlineHarness.setDisabled(true)); await page.locator('#inline-contract .alt-inline-edit').evaluate(el => { el.tabIndex = -1; el.focus(); });
    await resolveSave(page, { ok: true, value: 'Invalid fallback' }); await read(page);
    check(await page.locator('#inline-contract .alt-inline-edit').evaluate(el => document.activeElement === el), 'detached fallback is ignored without moving focus'); await page.close(); }

  const fixture = async (page, name, slow = false) => {
    await page.getByText('Choose the next fixture', { exact: true }).click();
    await page.getByLabel('Rename fixture').selectOption(name);
    if (slow) await page.getByLabel('Delay validation by 1,200 ms').check();
    await page.getByRole('button', { name: 'Reset example', exact: true }).click();
    await page.getByText('Choose the next fixture', { exact: true }).click();
  };
  const log = page => page.locator('[data-inline-log]').evaluate(el => JSON.parse(el.textContent));
  const fileInput = page => page.getByRole('textbox', { name: 'File name', exact: true });
  const rename = async (page, value = '  Brand launch.pdf  ') => {
    await page.getByRole('button', { name: 'Rename file', exact: true }).click();
    await fileInput(page).fill(value); await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  };
  { const page = await open();
    check(await page.getByText('Prepare launch checklist', { exact: true }).isVisible() && await page.getByText('Brand guidelines.pdf', { exact: true }).isVisible(), 'D1 displays independent task and filename consumers');
    await page.getByRole('button', { name: 'Edit task title', exact: true }).click(); await page.getByRole('textbox', { name: 'Task title' }).fill('Prepare a launch'); await save(page);
    await page.getByRole('button', { name: 'Edit task title', exact: true }).waitFor();
    check(await page.getByText('Brand guidelines.pdf', { exact: true }).isVisible(), 'editing the task leaves the filename unchanged');
    await rename(page, 'Brand guidelines draft.pdf'); await page.getByRole('alert').waitFor();
    check((await log(page)).filter(event => event.id === 'file-brand').length === 0 && await fileInput(page).inputValue() === 'Brand guidelines draft.pdf', 'D1 duplicate validation preserves text without any file write');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await page.close(); }

  for (const name of ['success-100', 'success-1200', 'fail-once', 'conflict', 'interrupted-after-save']) {
    const page = await open(); await fixture(page, name); await rename(page);
    if (name !== 'success-100') {
      await fileInput(page).press('Enter');
      check((await log(page)).filter(event => event.event === 'requested').length === 1, `D1 ${name} submits once while pending`);
    }
    if (name === 'conflict') {
      await page.getByRole('button', { name: 'Use current value', exact: true }).waitFor();
      check(await fileInput(page).inputValue() === '  Brand launch.pdf  ' && (await log(page)).filter(event => event.event === 'published').length === 0, 'D1 revision conflict retains input and publishes no stale value');
      check((await log(page)).filter(event => event.event === 'rejected-stale').length === 1, 'D1 adapter rejects stale revision');
    } else {
      if (name === 'fail-once') {
        await page.getByRole('alert').waitFor();
        check(await fileInput(page).inputValue() === '  Brand launch.pdf  ', 'D1 retryable failure retains the exact draft');
        await save(page);
      }
      await page.getByRole('button', { name: 'Rename file', exact: true }).waitFor();
      const events = await log(page);
      check(events.filter(event => event.event === 'committed').length === 1 && events.filter(event => event.event === 'published').length === 1, `D1 ${name} commits and publishes once`);
      check(await page.getByText('Brand launch.pdf', { exact: true }).isVisible(), `D1 ${name} displays canonical trimming`);
      if (name === 'interrupted-after-save') {
        const commit = events.find(event => event.event === 'committed'), reconciliation = events.find(event => event.event === 'reconciled');
        check(commit.operationId === reconciliation.operationId && reconciliation.revision === 2, 'lost acknowledgement reconciles the same operation at the single committed revision');
      }
    }
    await page.close();
  }

  { const page = await open(); await fixture(page, 'success-1200'); await rename(page, 'Removed editor.pdf');
    await page.getByText('Comparison and fixture controls', { exact: true }).click();
    await page.getByRole('button', { name: 'Remove filename editor', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(document.querySelector('[data-inline-log]').textContent).some(event => event.event === 'committed'));
    check((await log(page)).filter(event => event.event === 'published').length === 0, 'D1 removal does not publish after the library unmounts');
    check(await page.getByRole('button', { name: 'Show filename editor', exact: true }).evaluate(el => el === document.activeElement), 'D1 pending removal preserves the outside focus target');
    await page.getByRole('button', { name: 'Show filename editor', exact: true }).click();
    check(await page.getByText('Removed editor.pdf', { exact: true }).isVisible(), 'D1 remount reconciles the application record after navigation'); await page.close(); }

  { const page = await open(); await fixture(page, 'success-100', true); await rename(page);
    check(await page.locator('.alt-inline-edit[data-state="validating"]').count() === 1, 'D1 delayed-validation fixture exposes Checking value');
    await page.getByText('Comparison and fixture controls', { exact: true }).click(); await page.getByRole('button', { name: 'Apply external filename update', exact: true }).click();
    await page.getByRole('button', { name: 'Use current value', exact: true }).waitFor(); await page.waitForTimeout(1250);
    check((await log(page)).filter(event => event.event === 'requested').length === 0, 'D1 external update invalidates delayed validation'); await page.close(); }

  { const page = await open(); await page.getByText('Comparison and fixture controls', { exact: true }).click(); await page.getByRole('button', { name: 'Open dialog rename baseline', exact: true }).click();
    const dialog = page.getByRole('dialog'); await dialog.waitFor(); await dialog.getByRole('textbox', { name: 'File name' }).fill('  Baseline rename.pdf  ');
    await dialog.getByRole('button', { name: 'Save changes', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
    check(await page.getByText('Baseline rename.pdf', { exact: true }).isVisible() && (await log(page)).filter(event => event.event === 'committed').length === 1, 'dialog comparison uses the same target and canonical save adapter'); await page.close(); }

  { const page = await open(); await mount(page, { validate: 'sync' }); await edit(page); await save(page); await read(page);
    check((await api(page, 'validations')).length === 0 && (await api(page, 'calls')).length === 0 && (await api(page, 'publications')).length === 0,
      'IE-01 no-change Save skips validation, persistence and publication'); await page.close(); }

  { const page = await open({ viewport: { width: 320, height: 800 }, isMobile: true, hasTouch: true });
    await page.getByRole('button', { name: 'Edit task title', exact: true }).tap();
    await page.getByRole('textbox', { name: 'Task title' }).fill('Touch launch checklist');
    await page.getByRole('button', { name: 'Save changes', exact: true }).tap();
    await page.getByRole('button', { name: 'Edit task title', exact: true }).waitFor();
    check(await page.getByText('Touch launch checklist', { exact: true }).isVisible(), 'DEM-08 touch emulation saves task title');
    await page.getByRole('button', { name: 'Rename file', exact: true }).tap();
    await fileInput(page).fill('Cancelled touch name.pdf');
    await page.getByRole('button', { name: 'Cancel', exact: true }).tap();
    check(await page.getByText('Brand guidelines.pdf', { exact: true }).isVisible(), 'DEM-08 touch cancellation preserves filename');
    await page.getByText('Comparison and fixture controls', { exact: true }).tap();
    await page.getByRole('button', { name: 'Open dialog rename baseline', exact: true }).tap();
    const dialog = page.getByRole('dialog'); await dialog.waitFor();
    await dialog.getByRole('textbox', { name: 'File name' }).fill('Touch baseline.pdf');
    await dialog.getByRole('button', { name: 'Save changes', exact: true }).tap();
    await dialog.waitFor({ state: 'hidden' });
    check(await page.getByText('Touch baseline.pdf', { exact: true }).isVisible(), 'DEM-08 baseline works using tap controls');
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'DEM-08 touch scene stays within 320 CSS pixels');
    await page.close(); }

  // Generic value and custom editors (#13).
  { const page = await open(); await mount(page, { value: 'a', editor: 'select', save: 'sync' }); await edit(page);
    const trigger = page.locator('#inline-contract .alt-select-trigger');
    check(await trigger.evaluate(el => document.activeElement === el), 'GEN-01 opening a custom editor focuses its control');
    check(await page.getByRole('button', { name: 'Save changes', exact: true }).count() === 0 && await page.getByText('Choose to save', { exact: true }).isVisible(), 'GEN-02 on-choose hides Save and shows the hint');
    check(await trigger.evaluate(el => (el.getAttribute('aria-describedby') || '').split(' ').some(id => document.getElementById(id)?.textContent === 'Choose to save')), 'GEN-03 the hint describes the control');
    await trigger.press('Enter'); await page.getByRole('option', { name: 'Alpha' }).waitFor();
    await page.keyboard.press('Escape'); await page.getByRole('listbox').waitFor({ state: 'detached' });
    check(await page.locator('#inline-contract .alt-inline-edit').getAttribute('data-state') === 'editing', 'GEN-04 Escape in an open list closes the list only');
    await page.keyboard.press('Escape'); await read(page);
    check(await page.getByRole('button', { name: 'Edit Record name', exact: true }).evaluate(el => document.activeElement === el), 'GEN-05 a second Escape cancels and returns focus to Edit');
    await edit(page); await trigger.press('Enter'); await page.getByRole('option', { name: 'Alpha' }).click(); await read(page);
    check((await api(page, 'calls')).length === 0, 'GEN-06 choosing the current value closes without a write');
    await edit(page); await trigger.press('Enter'); await page.getByRole('option', { name: 'Bravo' }).click(); await read(page);
    check(JSON.stringify(await api(page, 'calls')) === JSON.stringify([{ draft: 'b', context: { previousValue: 'a' } }]) && JSON.stringify(await api(page, 'publications')) === '["b"]', 'GEN-07 choosing dispatches one save and publishes the canonical value');
    await page.locator('#inline-contract [role="status"]').filter({ hasText: 'Record name set to Bravo' }).waitFor();
    check(true, 'GEN-08 on-choose announces the label and the rendered value');
    await page.close(); }

  { const page = await open();
    const status = page.locator('[data-inline-scene] .alt-inline-edit[aria-label="Status"]');
    await page.getByRole('button', { name: 'Edit Status', exact: true }).click();
    await status.locator('.alt-select-trigger').press('Enter'); await page.getByRole('option', { name: 'Blocked' }).click();
    await status.getByRole('alert').waitFor();
    check(await status.getAttribute('data-state') === 'error' && (await status.locator('.alt-select-value').textContent()) === 'Blocked', 'GEN-09 a rejected on-choose save keeps the editor open on the chosen value');
    check(await status.getByRole('button', { name: 'Try again', exact: true }).isVisible() && await status.getByRole('button', { name: 'Cancel', exact: true }).isVisible(), 'GEN-10 a rejected on-choose save offers Try again and Cancel');
    await status.locator('.alt-select-trigger').click(); await page.getByRole('option', { name: 'In review' }).click();
    await page.getByRole('button', { name: 'Edit Status', exact: true }).waitFor();
    check(await status.locator('.alt-badge').textContent() === 'In review', 'GEN-11 choosing again saves and renderValue shows the canonical value');
    const assignee = page.locator('[data-inline-scene] .alt-inline-edit[aria-label="Assignee"]');
    await page.getByRole('button', { name: 'Edit Assignee', exact: true }).click();
    const box = assignee.getByRole('combobox'); check(await box.evaluate(el => document.activeElement === el), 'GEN-12 a Combobox editor takes focus');
    await box.fill('Tob'); await box.press('ArrowDown'); await box.press('Enter');
    await page.getByRole('button', { name: 'Edit Assignee', exact: true }).waitFor();
    check((await assignee.locator('.alt-inline-edit-value').textContent()) === 'Tobi Adeyemi', 'GEN-13 choosing from a Combobox saves the person');
    const estimate = page.locator('[data-inline-scene] .alt-inline-edit[aria-label="Estimate"]');
    await page.getByRole('button', { name: 'Edit Estimate', exact: true }).click();
    const number = estimate.getByRole('spinbutton', { name: 'Estimate' });
    check(await number.evaluate(el => document.activeElement === el), 'GEN-14 a numeric editor takes focus');
    await number.fill('41'); await number.press('Enter'); await estimate.getByRole('alert').waitFor();
    check((await estimate.getByRole('alert').textContent()).includes('Use a whole number from 0 to 40.') && await number.getAttribute('aria-invalid') === 'true', 'GEN-15 Enter in a numeric editor validates the parsed number');
    await number.fill('5'); await number.press('Enter'); await page.getByRole('button', { name: 'Edit Estimate', exact: true }).waitFor();
    check((await estimate.locator('.alt-inline-edit-value').textContent()) === '5 points', 'GEN-16 Enter saves the number and read mode renders it');
    await page.close(); }

  // Escape the moment the Select's list commits as open, before its "focus the list" effect runs: the list
  // closes, focus stays on the trigger rather than falling to the body, and the next Escape still cancels the session.
  { const page = await open(); await mount(page, { value: 'a', editor: 'select', save: 'sync' }); await edit(page);
    const raced = await page.evaluate(() => new Promise(done => {
      const trigger = document.querySelector('#inline-contract .alt-select-trigger');
      const watch = new MutationObserver(() => {
        if (!document.querySelector('#inline-contract .alt-select-list[data-state="open"]')) return;
        watch.disconnect();
        document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        setTimeout(() => done({ list: !!document.querySelector('#inline-contract .alt-select-list'), onTrigger: document.activeElement === trigger, focus: document.activeElement.tagName }), 400);
      });
      watch.observe(document.getElementById('inline-contract'), { subtree: true, attributes: true, attributeFilter: ['data-state'], childList: true });
      trigger.focus(); trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    }));
    check(raced.onTrigger, `GEN-17 Escape as the list finishes opening keeps focus on the trigger (${JSON.stringify(raced)})`);
    if (raced.list) { await page.keyboard.press('Escape'); await page.getByRole('listbox').waitFor({ state: 'detached' }); }
    await page.keyboard.press('Escape'); await read(page);
    check(true, 'GEN-18 after that race, Escape still cancels the session');
    await page.close(); }

  // Multiline (#14).
  { const page = await open(); await mount(page, { multiline: true, save: 'sync', required: false, value: 'First line\nSecond line' });
    check(await page.locator('#inline-contract .alt-inline-edit-value').evaluate(el => getComputedStyle(el).whiteSpace === 'pre-wrap'), 'ML-01 read mode preserves line breaks');
    await edit(page); const area = page.getByRole('textbox', { name: 'Record name' });
    check(await area.evaluate(el => el.tagName === 'TEXTAREA' && document.activeElement === el && el.selectionStart === el.value.length && el.selectionEnd === el.value.length), 'ML-02 opening focuses the textarea with the caret at the end');
    check(await area.evaluate(el => (el.getAttribute('aria-describedby') || '').split(' ').map(id => document.getElementById(id)?.textContent).join(' ').includes('Enter to save')), 'ML-03 the key hint describes the textarea');
    const before = await area.evaluate(el => el.offsetHeight);
    await area.press('Enter'); await area.type('Third line');
    check((await area.inputValue()) === 'First line\nSecond line\nThird line' && (await api(page, 'calls')).length === 0, 'ML-04 Enter inserts a newline and does not save');
    await area.evaluate(el => { const ev = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true, isComposing: true }); el.dispatchEvent(ev); });
    check((await api(page, 'calls')).length === 0, 'ML-05 Ctrl+Enter during IME composition does not save');
    await area.press('Escape'); await read(page);
    check((await api(page, 'calls')).length === 0 && (await page.locator('#inline-contract .alt-inline-edit-value').textContent()) === 'First line\nSecond line', 'ML-06 Escape cancels the paragraph');
    await edit(page); await area.press('Enter'); await area.type('3\n4\n5\n6\n7\n8');
    const grown = await area.evaluate(el => ({ h: el.offsetHeight, scroll: getComputedStyle(el).overflowY }));
    check(grown.h > before && grown.h <= 5 * 21 + 40 && grown.scroll === 'auto', `ML-07 the textarea grows with content up to maxRows, then scrolls (${before} → ${grown.h})`);
    await area.press('Control+Enter'); await read(page);
    check((await api(page, 'calls')).length === 1 && (await api(page, 'publications'))[0] === 'First line\nSecond line\n3\n4\n5\n6\n7\n8', 'ML-08 Ctrl+Enter saves the paragraph');
    await edit(page); await area.fill(''); await area.press('Meta+Enter'); await read(page);
    check((await api(page, 'calls')).length === 2 && (await page.locator('#inline-contract .alt-inline-edit-value').textContent()) === 'Not set', 'ML-09 Cmd+Enter saves, and an empty paragraph reads Not set');
    await page.close(); }

  // In place (E52): the value's text doesn't move when its control opens, and the ways to open move nothing either.
  { const page = await open();
    const textAt = locator => locator.evaluate(el => {
      if (el instanceof HTMLInputElement) { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top + r.height / 2) }; }
      const range = document.createRange(); range.selectNodeContents(el); const r = range.getClientRects()[0]; return { x: Math.round(r.left), y: Math.round(r.top + r.height / 2) };
    });
    const settled = () => page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity && Number(a.effect?.getTiming().duration) < 2000).map(a => a.finished.catch(() => {}))));
    const task = page.locator('.inline-demo-task > .alt-inline-edit');
    const before = await textAt(task.locator('.alt-inline-edit-value'));
    await page.getByRole('button', { name: 'Edit task title', exact: true }).click(); await settled();
    const after = await textAt(task.getByRole('textbox', { name: 'Task title' }));
    check(after.x === before.x && Math.abs(after.y - before.y) <= 1, `IP-01 opening leaves the value's text where it was (${JSON.stringify(before)} → ${JSON.stringify(after)})`);
    check(await task.getByRole('textbox', { name: 'Task title' }).evaluate(el => getComputedStyle(el).fontSize === '19px'), 'IP-02 the control takes the value’s own font');
    check(await task.locator('.alt-inline-edit-line .alt-inline-edit-actions').getByRole('button', { name: 'Save changes' }).isVisible(), 'IP-03 Save and Cancel take Edit’s place on the same line');
    check(await task.locator('.alt-field-label').count() === 0, 'IP-04 no visible label is added above the value');
    await page.keyboard.press('Escape'); await settled();

    const pencil = page.getByRole('button', { name: 'Project name: Northwind launch. Edit Project name', exact: true });
    const pencilAt = await pencil.boundingBox();
    check(await pencil.locator('.alt-inline-edit-pencil').evaluate(el => getComputedStyle(el).opacity === '0'), 'IP-05 the pencil is hidden at rest');
    await pencil.hover(); await settled();
    const hovered = await pencil.boundingBox();
    check(await pencil.locator('.alt-inline-edit-pencil').evaluate(el => getComputedStyle(el).opacity === '1') && hovered.x === pencilAt.x && hovered.width === pencilAt.width, 'IP-06 hovering shows the pencil in reserved space, moving nothing');
    check(await pencil.evaluate(el => getComputedStyle(el, '::after').content !== 'none' && getComputedStyle(el, '::after').height === '1px'), 'IP-07 hint="seam" scores a groove under the value at rest');
    const pencilText = await textAt(pencil.locator('.alt-inline-edit-value'));
    await pencil.click(); await settled();
    const projectInput = page.getByRole('textbox', { name: 'Project name' });
    const pencilOpen = await textAt(projectInput);
    check(pencilOpen.x === pencilText.x && Math.abs(pencilOpen.y - pencilText.y) <= 1 && await projectInput.evaluate(el => el.selectionStart === 0 && el.selectionEnd === el.value.length), 'IP-08 the pencil opens the field in place with the value selected');
    await page.keyboard.press('Escape'); await settled();
    check(await pencil.evaluate(el => document.activeElement === el), 'IP-09 Escape returns focus to the value');

    const field = page.getByRole('button', { name: 'Meeting title: Quarterly planning review. Edit Meeting title', exact: true });
    const fieldAt = await field.boundingBox();
    await field.hover(); await settled();
    check(await field.evaluate(el => getComputedStyle(el).borderTopColor !== 'rgba(0, 0, 0, 0)' && getComputedStyle(el, '::after').opacity === '0') && JSON.stringify(await field.boundingBox()) === JSON.stringify(fieldAt), 'IP-10 hovering draws the field around the value, replacing the seam, moving nothing');
    const valueBox = await field.locator('.alt-inline-edit-value').boundingBox();
    await page.mouse.click(valueBox.x + valueBox.width / 2, valueBox.y + valueBox.height / 2); await settled();
    const meeting = page.getByRole('textbox', { name: 'Meeting title' });
    const caret = await meeting.evaluate(el => [el.selectionStart, el.selectionEnd, el.value.length]);
    check(caret[0] === caret[1] && caret[0] > 0 && caret[0] < caret[2], `IP-11 a click puts the caret where it landed (${caret})`);
    await meeting.fill('Quarterly planning review 2'); await meeting.press('Enter');
    await page.getByRole('button', { name: /^Meeting title: Quarterly planning review 2/ }).waitFor();
    const announced = page.locator('[data-inline-scene] .alt-inline-edit[data-trigger="field"] [role="status"]').first();
    check(await announced.textContent() === 'Changes saved' && await announced.evaluate(el => el.getBoundingClientRect().width <= 1), 'IP-12 the save is announced, never shown');
    await page.waitForTimeout(2300);
    check(await announced.textContent() === '', 'IP-13 the announcement clears itself after dur-linger');
    await page.close(); }

  for (const scheme of ['daylight', 'nightfall', 'mesa', 'alpine']) for (const width of [320, 960]) {
    const page = await open(); await page.setViewportSize({ width, height: 1000 });
    await page.goto(`file://${fixturePath('InlineEdit', scheme)}`);
    for (const mode of ['standard', 'reduced-motion', 'forced-colors', 'increased-contrast']) {
      await page.emulateMedia({ reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference', forcedColors: mode === 'forced-colors' ? 'active' : 'none' });
      // Pinned Playwright 1.48 does not forward prefers-contrast emulation. Exercise the public provider mode.
      await page.locator('.alt-root').evaluate((root, more) => { root.dataset.contrast = more ? 'more' : 'system'; }, mode === 'increased-contrast');
      if (mode === 'increased-contrast') check(await page.locator('.alt-root').evaluate(root => getComputedStyle(root).getPropertyValue('--alt-sheen').trim() === 'none'), `${scheme}/${width}: increased-contrast styles are actually active`);
      await page.getByRole('button', { name: 'Rename file', exact: true }).click(); await fileInput(page).fill('A long fictional filename that must stay editable and readable.pdf');
      const boxes = await page.locator('[data-inline-scene] .alt-inline-edit[data-state="editing"] button').evaluateAll(buttons => buttons.map(button => { const r = button.getBoundingClientRect(); return { x: r.x, right: r.right, width: r.width }; }));
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && boxes.every(box => box.x >= 0 && box.right <= width + 1 && box.width > 0), `${scheme}/${width}/${mode}: page does not scroll horizontally and actions fit`);
      await page.screenshot({ path: `${evidence}D1-success-100-${scheme}-${mode}-${width}.png`, fullPage: true });
      await fileInput(page).press('Escape');
      await rename(page, `Brand ${scheme} ${mode}.pdf`);
      await page.getByRole('button', { name: 'Rename file', exact: true }).waitFor();
      check(await page.getByText(`Brand ${scheme} ${mode}.pdf`, { exact: true }).isVisible(), `${scheme}/${width}/${mode}: canonical Save completes at this layout`);
    }
    await page.close();
  }

  check(browserErrors.length === 0, `no page/console errors: ${browserErrors.join('\n')}`);
  console.log(`Chromium ${browser.version()}; expected React ${process.env.ALT_FIXTURE_ROOT ? '19' : '18'}. InlineEdit: ${checks} assertions passed (${process.env.ALT_FIXTURE_ROOT ? 'source fixture runtime' : 'React 18 generated previews'}).`);
} finally { await browser.close(); }
