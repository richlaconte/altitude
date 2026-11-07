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
    const api = { calls: [], publications: [], validations: [], saves: [], checks: [], submits: 0, outsideClicks: 0, wrongClicks: 0 };
    window.inlineHarness = api;
    function Fixture() {
      const [value, setValue] = R.useState(options.value ?? 'Original name');
      const [disabled, setDisabled] = R.useState(false);
      const [show, setShow] = R.useState(true);
      Object.assign(api, { setValue, setDisabled, setShow });
      const props = {
        value, label: 'Record name', required: options.required ?? true, maxLength: options.maxLength,
        disabled, leave: options.leave, actions: options.actions, pending: options.pending, focusFallback: () => options.invalidFallback ? document.createElement('button') : document.getElementById('fallback'),
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
      if (options.editor === 'portal') props.editor = control => h(R.Fragment, null,
        h(A.Input, { value: control.value, id: control.id, readOnly: control.readOnly, disabled: control.disabled, invalid: control.invalid, autoFocus: true, 'aria-describedby': control['aria-describedby'], 'aria-controls': 'inline-owned-popup', onChange: e => control.onValueChange(e.target.value) }),
        h('button', { id: 'inline-toolbar', type: 'button' }, 'Editor toolbar'),
        window.ReactDOM.createPortal(h('div', { id: 'inline-owned-popup' },
          h('input', { id: 'inline-popup-input', 'aria-label': 'Picker value', value: control.value, readOnly: control.readOnly, onChange: e => control.onValueChange(e.target.value) }),
          h('button', { id: 'inline-popup-toolbar', type: 'button', 'aria-owns': 'inline-nested-popup' }, 'Picker toolbar')), document.body),
        window.ReactDOM.createPortal(h('div', { id: 'inline-nested-popup' }, h('button', { id: 'inline-nested-action', type: 'button' }, 'Nested choice')), document.body));
      if (options.validate) props.validate = draft => {
        api.validations.push(draft);
        if (options.validate === 'sync') return draft === 'Duplicate' ? 'Choose a different name.' : undefined;
        if (options.validate === 'throw') throw new Error('SECRET validation detail');
        const d = deferred(); api.checks.push(d); return d.promise;
      };
      return h(A.AltitudeProvider, null, h('form', { onSubmit: e => { e.preventDefault(); api.submits++; } },
        show ? h(A.InlineEdit, props) : h('p', null, 'Record removed'),
        h('button', { id: 'elsewhere', type: 'button', onClick: () => { api.outsideClicks++; if (options.removeOnOutside) setShow(false); } }, 'Other action'),
        h('button', { id: 'fallback', type: 'button', onClick: () => api.wrongClicks++ }, 'Fallback'),
        h('input', { id: 'next-field', 'aria-label': 'Next field' })));
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
const read = page => page.locator('#inline-contract .alt-inline-edit[data-state="read"]').waitFor();
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
    await page.evaluate(() => window.inlineHarness.setDisabled(true)); await page.waitForFunction(() => document.querySelector('#inline-contract input').disabled); await resolveCheck(page, undefined); await waitState(page, 'editing');
    check((await api(page, 'calls')).length === 0, 'disabling during validation prevents dispatch'); await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await read(page); await page.close(); }

  { const page = await open(); await mount(page, { invalidFallback: true }); await edit(page); await input(page).fill('Invalid fallback'); await save(page);
    await page.evaluate(() => window.inlineHarness.setDisabled(true)); await page.locator('#inline-contract .alt-inline-edit').evaluate(el => { el.tabIndex = -1; el.focus(); });
    await resolveSave(page, { ok: true, value: 'Invalid fallback' }); await read(page);
    check(await page.locator('#inline-contract .alt-inline-edit').evaluate(el => document.activeElement === el), 'detached fallback is ignored without moving focus'); await page.close(); }

  // leave="cancel" (#485): leaving cancels as Cancel does, never saves and never pulls focus back.
  { const page = await open(); await mount(page, { leave: 'cancel' }); await edit(page); await input(page).fill('Typed then left');
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    check(await input(page).count() === 1 && await page.getByRole('button', { name: 'Cancel', exact: true }).evaluate(el => document.activeElement === el), 'LV-01 moving focus within the group (to Save, then Cancel) keeps the session');
    await input(page).evaluate(el => el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null })));
    await page.waitForTimeout(30);
    check(await input(page).count() === 1, 'LV-02 focus going to no element (another window or tab) is not leaving');
    await page.locator('#elsewhere').click(); await read(page);
    check((await api(page, 'calls')).length === 0 && (await api(page, 'publications')).length === 0 && await page.locator('#inline-contract .alt-inline-edit-value').textContent() === 'Original name', 'LV-03 an outside press cancels without a write');
    check(await page.locator('#elsewhere').evaluate(el => document.activeElement === el), 'LV-04 cancelling on leave leaves focus where the person went');
    await edit(page); await input(page).fill('Tabbed away'); await input(page).focus();
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await read(page);
    check((await api(page, 'calls')).length === 0 && await page.locator('#elsewhere').evaluate(el => document.activeElement === el), 'LV-05 Tab out of the group cancels and focus stays on the next control');
    await edit(page); await input(page).fill('Body press'); await page.mouse.click(900, 700); await read(page);
    check((await api(page, 'calls')).length === 0, 'LV-06 a press on the page itself cancels');
    await page.close(); }

  { const page = await open(); await mount(page, { leave: 'cancel' }); await edit(page); await input(page).fill('Sent');
    await save(page); await waitState(page, 'saving'); await page.locator('#elsewhere').click();
    check(await page.locator('#inline-contract .alt-inline-edit').getAttribute('data-state') === 'saving', 'LV-07 leaving while saving does nothing');
    await resolveSave(page, { ok: false, error: 'The server declined this name.' }); await waitState(page, 'error');
    await page.locator('#elsewhere').click(); await page.waitForTimeout(30);
    check(await input(page).inputValue() === 'Sent' && await page.getByRole('alert').isVisible(), 'LV-08 after a failed save, leaving keeps the text and the message');
    await input(page).fill('Changed'); await page.evaluate(() => window.inlineHarness.setValue('External')); await waitState(page, 'conflict');
    await page.locator('#elsewhere').click(); await page.waitForTimeout(30);
    check(await input(page).inputValue() === 'Changed' && await page.getByRole('button', { name: 'Use current value' }).isVisible(), 'LV-09 during a conflict, leaving keeps the session');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await read(page); await page.close(); }

  { const page = await open(); await mount(page, { leave: 'cancel', validate: 'deferred' }); await edit(page); await input(page).fill('Checking');
    await save(page); await waitState(page, 'validating'); await page.locator('#elsewhere').click();
    check(await page.locator('#inline-contract .alt-inline-edit').getAttribute('data-state') === 'validating', 'LV-10 leaving while checking does nothing');
    await resolveCheck(page, undefined); await waitState(page, 'saving'); await resolveSave(page, { ok: true, value: 'Checking' }); await read(page);
    check(JSON.stringify(await api(page, 'publications')) === '["Checking"]', 'LV-11 the checked draft still saves once'); await page.close(); }

  { const page = await open(); await mount(page, { value: 'a', editor: 'select', save: 'sync', leave: 'cancel' }); await edit(page);
    const trigger = page.locator('#inline-contract .alt-select-trigger');
    await trigger.press('Enter'); await page.getByRole('option', { name: 'Bravo' }).click(); await read(page);
    check(JSON.stringify(await api(page, 'publications')) === '["b"]', 'LV-12 choosing from a custom editor\'s list is not leaving');
    await page.close(); }

  { const page = await open(); await mount(page); await edit(page); await input(page).fill('Kept by default');
    await page.locator('#elsewhere').click(); await input(page).focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    check(await input(page).inputValue() === 'Kept by default', 'LV-13 by default, an outside press and Tab out keep the session'); await page.close(); }

  // leave="save" (#615): complete-editor ownership, truthful persistence and activation before layout change.
  { const page = await open(); await mount(page, { leave: 'save' }); await edit(page); await input(page).fill('Tab save');
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    check((await api(page, 'calls')).length === 0, 'LS-01 actions remain inside the editor');
    await page.keyboard.press('Tab'); await waitState(page, 'saving');
    check((await api(page, 'calls')).length === 1 && (await api(page, 'publications')).length === 0, 'LS-02 Tab out dispatches once without publishing a draft');
    await page.locator('#next-field').fill('Continue here');
    await resolveSave(page, { ok: true, value: 'Canonical tab save' }); await read(page);
    check(await page.locator('#next-field').evaluate(el => document.activeElement === el) && JSON.stringify(await api(page, 'publications')) === '["Canonical tab save"]', 'LS-03 canonical success does not steal next-field focus');
    await page.close(); }

  for (const options of [{ save: 'sync' }, { validate: 'sync', save: 'sync' }, { required: true, value: '' }, { pending: 'value' }]) {
    const page = await open({ reducedMotion: 'reduce' }); await mount(page, { leave: 'save', ...options }); await edit(page);
    await input(page).fill(options.value === '' ? '' : 'Outside save');
    // Put the destination below the editor so immediate collapse or an inserted error could retarget the click.
    await page.addStyleTag({ content: '#inline-contract form > button { display:block; margin:0 }' });
    const target = await page.locator('#elsewhere').boundingBox();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2); await page.mouse.down();
    check((await api(page, 'calls')).length === 0, 'LS-04 pointerdown leaves the destination geometry intact');
    await page.waitForTimeout(30); await page.mouse.up();
    if (options.value === '') await read(page); else await page.waitForFunction(() => window.inlineHarness.calls.length === 1);
    check((await api(page, 'outsideClicks')) === 1 && (await api(page, 'wrongClicks')) === 0, 'LS-05 outside activation reaches its original destination');
    check(await page.locator('#elsewhere').evaluate(el => document.activeElement === el), 'LS-06 synchronous completion/validation/folding never returns focus');
    if (options.pending) { await resolveSave(page, { ok: false, error: 'Rejected beside the field.' }); await waitState(page, 'error');
      check(await page.locator('#elsewhere').evaluate(el => document.activeElement === el), 'LS-07 failed folded save reopens without focus theft'); }
    await page.close();
  }

  { const page = await open(); await mount(page, { leave: 'save', validate: 'deferred' }); await edit(page); await input(page).fill('Checked once');
    await page.locator('#elsewhere').click(); await waitState(page, 'validating');
    await input(page).focus(); await page.locator('#elsewhere').click(); await page.keyboard.press('Tab');
    check((await api(page, 'validations')).length === 1 && (await api(page, 'calls')).length === 0, 'LS-08 repeated leave does not duplicate validation or imply persistence');
    await resolveCheck(page, undefined); await waitState(page, 'saving'); await input(page).focus(); await page.locator('#elsewhere').click();
    check((await api(page, 'calls')).length === 1, 'LS-09 overlapping focus and pointer events cannot duplicate the write');
    await resolveSave(page, { ok: false, error: 'Use a different release label.' }); await waitState(page, 'error');
    await input(page).focus(); await page.locator('#elsewhere').click();
    check((await api(page, 'calls')).length === 1 && await input(page).inputValue() === 'Checked once', 'LS-10 rejected draft is retained and leaving does not retry');
    await page.getByRole('button', { name: 'Try again', exact: true }).click(); await resolveCheck(page, undefined, 1); await waitState(page, 'saving');
    check((await api(page, 'calls'))[1].context.previousValue === 'Original name', 'LS-11 explicit Retry retains the original baseline');
    await page.locator('#next-field').focus(); await resolveSave(page, { ok: true, value: 'Checked once' }, 1); await read(page);
    check(await page.locator('#next-field').evaluate(el => document.activeElement === el), 'LS-12 retry completion respects the current focus'); await page.close(); }

  { const page = await open(); await mount(page, { leave: 'save', required: true }); await edit(page); await input(page).fill('');
    await page.locator('#elsewhere').click(); await waitState(page, 'error');
    check((await api(page, 'calls')).length === 0 && await page.getByRole('alert').isVisible() && (await api(page, 'outsideClicks')) === 1, 'LS-13 synchronous validation keeps the draft and outside activation');
    await input(page).fill('Eligible changed draft'); await page.locator('#elsewhere').click(); await waitState(page, 'saving');
    check((await api(page, 'calls')).length === 1, 'LS-14 changed draft can save on a later leave'); await page.close(); }

  { const page = await open(); await mount(page, { leave: 'save', editor: 'portal' }); await edit(page); await input(page).fill('Portal draft');
    await page.locator('#inline-toolbar').click(); await page.locator('#inline-popup-input').focus(); await page.locator('#inline-popup-toolbar').click(); await page.locator('#inline-nested-action').click();
    check((await api(page, 'calls')).length === 0, 'LS-15 toolbar, portalled popup and nested owned popup belong to the complete editor');
    await page.locator('#elsewhere').focus(); await waitState(page, 'saving');
    check((await api(page, 'calls')).length === 1, 'LS-16 keyboard focus leaving a portalled editor saves once'); await page.close(); }

  { const page = await open(); await mount(page, { leave: 'save', value: 'a', editor: 'select', save: 'sync' }); await edit(page);
    await page.locator('#inline-contract .alt-select-trigger').press('Enter'); await page.getByRole('option', { name: 'Bravo' }).click(); await read(page);
    await page.locator('#elsewhere').click(); check((await api(page, 'calls')).length === 1, 'LS-17 on-choose and a subsequent departure publish only once'); await page.close(); }

  { const page = await open(); await mount(page, { leave: 'save' }); await edit(page); await page.locator('#elsewhere').click(); await read(page);
    check((await api(page, 'calls')).length === 0, 'LS-18 unchanged draft closes without a write');
    await edit(page); await input(page).fill('Cancel draft'); await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await read(page);
    await edit(page); await input(page).fill('Escape draft'); await input(page).press('Escape'); await read(page);
    check((await api(page, 'calls')).length === 0, 'LS-19 Cancel and Escape still discard undispatched drafts'); await page.close(); }

  for (const action of ['window', 'disabled', 'removed', 'unmount']) {
    const page = await open(); await mount(page, { leave: 'save' }); await edit(page); await input(page).fill('Do not dispatch');
    await page.evaluate(action => {
      const el = document.querySelector('#inline-contract input');
      if (action === 'window') { el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null })); window.dispatchEvent(new Event('blur')); }
      else if (action === 'disabled') window.inlineHarness.setDisabled(true);
      else if (action === 'removed') el.remove();
      else window.inlineHarness.setShow(false);
    }, action); await page.waitForTimeout(40);
    check((await api(page, 'calls')).length === 0, `LS-20 ${action} is not permission to save`); await page.close();
  }

  { const page = await open(); await mount(page, { leave: 'save', removeOnOutside: true }); await edit(page); await input(page).fill('Unmount on activation');
    await page.locator('#elsewhere').click(); await page.getByText('Record removed').waitFor(); await page.waitForTimeout(30);
    check((await api(page, 'calls')).length === 0 && (await api(page, 'outsideClicks')) === 1, 'LS-21 an outside action that unmounts cancels queued submission'); await page.close(); }

  { const page = await open(); await mount(page, { leave: 'save' }); await edit(page); await input(page).fill('Composing');
    await input(page).evaluate(el => el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })));
    await page.locator('#elsewhere').click(); check((await api(page, 'calls')).length === 0, 'LS-22 departure during IME does not write an intermediate composition');
    await input(page).evaluate(el => el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'Composing' }))); await page.waitForTimeout(30);
    check((await api(page, 'calls')).length === 0, 'LS-23 compositionend alone does not trigger a deferred save');
    await input(page).focus(); await page.locator('#elsewhere').click(); await waitState(page, 'saving');
    check((await api(page, 'calls')).length === 1, 'LS-24 a new intentional departure after composition saves'); await page.close(); }

  { const page = await open({ hasTouch: true, isMobile: true, viewport: { width: 320, height: 720 } }); await mount(page, { leave: 'save' }); await edit(page); await input(page).fill('Touch draft');
    await page.locator('#elsewhere').tap(); await waitState(page, 'saving');
    check((await api(page, 'calls')).length === 1 && (await api(page, 'outsideClicks')) === 1, 'LS-25 touch departure saves once and activates its destination'); await page.close(); }

  { const page = await open(); await mount(page, { leave: 'save', pending: 'value' }); await edit(page); await input(page).fill('Conflict draft');
    await page.locator('#elsewhere').click(); await waitState(page, 'saving'); await page.locator('#next-field').fill('Next task');
    await page.evaluate(() => window.inlineHarness.setValue('External update')); await resolveSave(page, { ok: true, value: 'Conflict draft' }); await waitState(page, 'conflict');
    check((await api(page, 'publications')).length === 0 && await input(page).inputValue() === 'Conflict draft' && await page.locator('#next-field').evaluate(el => document.activeElement === el), 'LS-26 conflict retains draft and outside focus without unconfirmed publication'); await page.close(); }

  { const page = await open(); await mount(page, { leave: 'save' }); await edit(page); await input(page).fill('Canceled touch');
    await page.locator('#elsewhere').evaluate(el => {
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, pointerType: 'touch', button: 0 }));
      el.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 7, pointerType: 'touch' }));
    }); await page.waitForTimeout(30);
    check((await api(page, 'calls')).length === 0, 'LS-27 canceled touch scroll does not dispatch'); await page.close(); }

  { const page = await open(); await mount(page, { leave: 'save', editor: 'portal' }); await edit(page); await input(page).fill('Rejected value');
    await page.locator('#elsewhere').click(); await waitState(page, 'saving'); await resolveSave(page, { ok: false, error: 'Rejected once.' }); await waitState(page, 'error');
    await input(page).fill('A different value'); await input(page).fill('Rejected value'); await page.locator('#elsewhere').click(); await page.waitForTimeout(30);
    check((await api(page, 'calls')).length === 1, 'LS-28 the same rejected value is not automatically retried after repeated custom-editor notifications');
    await input(page).fill('A corrected value'); await page.locator('#elsewhere').click(); await waitState(page, 'saving');
    check((await api(page, 'calls')).length === 2, 'LS-29 a corrected value can be submitted on departure'); await page.close(); }

  for (const scheme of ['daylight', 'nightfall']) for (const mode of ['standard', 'reduced-motion', 'forced-colors', 'increased-contrast']) {
    const page = await open({ viewport: { width: 320, height: 720 }, reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference', forcedColors: mode === 'forced-colors' ? 'active' : 'none' });
    await mount(page, { leave: 'save' });
    await page.evaluate(({ scheme, mode }) => { document.documentElement.dataset.theme = scheme; document.querySelector('#inline-contract .alt-root').dataset.contrast = mode === 'increased-contrast' ? 'more' : 'system'; }, { scheme, mode });
    await edit(page); await input(page).fill('A release label that remains readable');
    check(await input(page).evaluate(el => document.getElementById(el.getAttribute('aria-describedby'))?.textContent.includes('Saves when you leave')), `LS-30 ${scheme}/${mode}: visible instruction is associated with the field`);
    await page.locator('#elsewhere').click(); await waitState(page, 'saving');
    check(await page.locator('#inline-contract [role="status"]').textContent() === 'Saving changes' && await page.locator('#inline-contract [data-status="pending"]').getAttribute('aria-busy') === 'true', `LS-31 ${scheme}/${mode}: pending has status and busy semantics`);
    await resolveSave(page, { ok: false, error: 'The label was not saved. Try again beside this field.' }); await waitState(page, 'error');
    check(await page.getByRole('alert').isVisible() && await page.getByRole('button', { name: 'Try again', exact: true }).isVisible() && await page.locator('#elsewhere').evaluate(el => document.activeElement === el), `LS-32 ${scheme}/${mode}: error and retry stay local without moving focus`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `LS-33 ${scheme}/${mode}: error and recovery fit 320px`);
    await page.locator('#inline-contract .alt-inline-edit').evaluate(el => Promise.all(el.getAnimations({ subtree: true }).filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))));
    check(await page.getByRole('alert').evaluate(el => el.getBoundingClientRect().bottom <= el.closest('.alt-inline-edit-surface').getBoundingClientRect().bottom + 1 && getComputedStyle(el).opacity === '1'), `LS-36 ${scheme}/${mode}: the complete error is readable after existing motion settles`);
    await page.screenshot({ path: `${evidence}leave-save-${scheme}-${mode}-320.png`, fullPage: true }); await page.close();
  }

  { const page = await open(); await mount(page, { leave: 'save' }); await edit(page); await input(page).fill('Rejected then canceled');
    await page.locator('#elsewhere').click(); await waitState(page, 'saving'); await resolveSave(page, { ok: false, error: 'Try another label.' }); await waitState(page, 'error');
    await input(page).focus(); await input(page).press('Escape'); await read(page);
    check(await page.getByRole('button', { name: 'Edit Record name', exact: true }).evaluate(el => document.activeElement === el), 'LS-34 explicit Escape after an automatic failure restores focus normally'); await page.close(); }

  { const page = await open(); await mount(page, { leave: 'save' }); await edit(page); await input(page).fill('After a drag');
    await page.locator('#elsewhere').evaluate(el => {
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 8, button: 0 }));
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 8, button: 0 }));
    });
    await input(page).focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await waitState(page, 'saving');
    check((await api(page, 'calls')).length === 1, 'LS-35 a gesture without click does not suppress later keyboard departure'); await page.close(); }

  // actions="inline" (#486): Save and Cancel as icon buttons inside the field's trailing end.
  { const page = await open(); await mount(page, { actions: 'inline' }); await edit(page);
    const group = page.locator('#inline-contract .alt-inline-edit');
    const iconSave = group.locator('.alt-input').getByRole('button', { name: 'Save changes', exact: true });
    const iconCancel = group.locator('.alt-input').getByRole('button', { name: 'Cancel', exact: true });
    check(await iconSave.count() === 1 && await iconCancel.count() === 1 && await group.locator('.alt-inline-edit-actions').count() === 0, 'AC-01 Save and Cancel sit inside the field, with no button row');
    const sizes = await group.locator('.alt-inline-edit-icons .alt-btn').evaluateAll(bs => bs.map(b => { const r = b.getBoundingClientRect(); return Math.min(r.width, r.height); }));
    check(sizes.length === 2 && sizes.every(n => n >= 24), `AC-02 each icon button is at least 24px (${sizes})`);
    await input(page).focus(); await page.keyboard.press('Tab');
    check(await iconSave.evaluate(el => document.activeElement === el), 'AC-03 Tab goes from the input to Save');
    await page.keyboard.press('Tab'); check(await iconCancel.evaluate(el => document.activeElement === el), 'AC-04 then to Cancel');
    await page.keyboard.press('Tab'); check(await page.locator('#elsewhere').evaluate(el => document.activeElement === el), 'AC-05 then out of the group');
    await input(page).fill('Inline save'); await iconSave.click(); await waitState(page, 'saving');
    check(await iconSave.getAttribute('data-loading') !== null && await iconCancel.isDisabled(), 'AC-06 while saving, Save shows loading and Cancel is unavailable');
    await resolveSave(page, { ok: true, value: 'Inline save' }); await read(page);
    check(JSON.stringify(await api(page, 'publications')) === '["Inline save"]', 'AC-07 the check saves once through the same submit');
    await edit(page); await input(page).fill('Dropped'); await iconCancel.click(); await read(page);
    check((await api(page, 'calls')).length === 1 && await page.getByRole('button', { name: 'Edit Record name', exact: true }).evaluate(el => document.activeElement === el), 'AC-08 the cross cancels and returns focus to Edit');
    await edit(page); await input(page).fill('Mine'); await page.evaluate(() => window.inlineHarness.setValue('Theirs')); await waitState(page, 'conflict');
    check(await iconSave.isDisabled() && await page.getByRole('button', { name: 'Use current value' }).isVisible(), 'AC-09 a conflict disables the check and offers Use current value');
    await iconCancel.click(); await read(page); await page.close(); }

  { const page = await open(); await mount(page, { actions: 'inline', validate: 'deferred' }); await edit(page); await input(page).fill('Checking inline');
    await input(page).press('Enter'); await waitState(page, 'validating');
    check(await page.locator('#inline-contract .alt-input').getByRole('button', { name: 'Save changes', exact: true }).isDisabled(), 'AC-10 the check is unavailable while validating');
    await resolveCheck(page, 'Choose a different name.'); await page.getByRole('alert').waitFor();
    check(await input(page).inputValue() === 'Checking inline' && await page.locator('#inline-contract .alt-inline-edit-icons').count() === 1, 'AC-11 an error shows below the field and the icons stay'); await page.close(); }

  // #513: pending="value". The editor folds back to the value being written at once; it hovers, keeps focus and says to
  // wait on Escape; success settles; a rejection opens the editor again with the draft and the caret at its end.
  { const page = await open(); await mount(page, { pending: 'value' }); await edit(page);
    await input(page).fill('Folded draft'); await save(page); await waitState(page, 'saving');
    const group = page.locator('#inline-contract .alt-inline-edit');
    check(await group.getAttribute('data-folded') === '' && await group.locator('input').count() === 0 &&
      (await group.locator('.alt-inline-edit-value').textContent()) === 'Folded draft' && await group.locator('.alt-inline-edit-surface').getAttribute('data-status') === 'pending',
      'PV-01 while the write runs, the editor has folded back to the value being written, which hovers as pending');
    check(await page.evaluate(() => !!document.activeElement?.closest('#inline-contract')), 'PV-02 focus stays in the field (on its Edit button), not lost to the page');
    await page.keyboard.press('Escape');
    check(await group.getAttribute('data-state') === 'saving' && (await page.locator('#inline-contract [role="status"]').textContent()) === 'Saving changes. Wait for the result.', 'PV-03 Escape doesn\'t abandon the write and says to wait');
    await resolveSave(page, { ok: false, error: 'That name is taken.' }); await page.getByRole('alert').waitFor();
    const back = await page.evaluate(() => { const i = document.querySelector('#inline-contract input'); return i && { value: i.value, focused: document.activeElement === i, caret: i.selectionStart === i.value.length && i.selectionEnd === i.value.length, readonly: i.readOnly }; });
    check(back?.value === 'Folded draft' && back.focused && back.caret && !back.readonly, `PV-04 a rejection opens the editor again with the draft, the caret at its end (${JSON.stringify(back)})`);
    await save(page); await waitState(page, 'saving'); await resolveSave(page, { ok: true, value: 'Folded draft' }, 1); await read(page);
    check(JSON.stringify(await api(page, 'publications')) === '["Folded draft"]' && await group.getAttribute('data-folded') === null, 'PV-05 then success settles it and publishes once');
    await page.close(); }

  // #494: a single-line value that wraps at rest. It keeps the field's inset above its first line and below its last, the
  // pencil sits on the first line, the seam is under the text, and it opens in a field that wraps the same way (no line
  // moves) and still saves on Enter.
  { const page = await open();
    await page.evaluate(() => {
      const R = window.React, A = window.Altitude, h = R.createElement;
      document.getElementById('root').style.display = 'none';
      const host = document.createElement('div'); host.id = 'wrap'; document.body.append(host);
      function Wrap() { const [v, setV] = R.useState('A much longer title that will wrap across several lines at this width');
        return h(A.AltitudeProvider, null, h('div', { style: { width: '240px' } }, h(A.InlineEdit, { label: 'Title', trigger: 'pencil', hint: 'seam', value: v, onValueChange: setV, onSave: async d => ({ ok: true, value: d }) }))); }
      window.ReactDOM.createRoot(host).render(h(Wrap));
    });
    const plate = page.locator('#wrap .alt-inline-edit-slot-button'); await plate.waitFor();
    const rest = await plate.evaluate(b => { const r = b.getBoundingClientRect(), cs = getComputedStyle(b), v = b.querySelector('.alt-inline-edit-value').getBoundingClientRect(),
      p = b.querySelector('.alt-inline-edit-pencil').getBoundingClientRect(), line = (() => { const t = b.querySelector('.alt-inline-edit-value').firstChild, r = document.createRange(); r.setStart(t, 0); r.setEnd(t, 1); return r.getClientRects()[0].height; })(), seam = getComputedStyle(b, '::after');
      return { top: v.top - r.top, bottom: r.bottom - v.bottom, lines: Math.round(v.height / line), line, pencilMid: p.top + p.height / 2 - v.top, seamBottom: parseFloat(seam.bottom), padBottom: parseFloat(cs.paddingBottom) + parseFloat(cs.borderBottomWidth) }; });
    check(rest.lines >= 2 && Math.abs(rest.top - rest.bottom) < 1 && rest.top >= 8, `WR-01 a wrapped value keeps the same inset above its first line and below its last (${rest.lines} lines, ${rest.top}/${rest.bottom})`);
    check(Math.abs(rest.pencilMid - rest.line / 2) < 1.5, `WR-02 the pencil sits on the first line (${rest.pencilMid})`);
    check(rest.seamBottom < rest.padBottom, `WR-03 the seam is under the last line, not through it (${rest.seamBottom} < ${rest.padBottom})`);
    const linesAt = () => page.evaluate(() => { const el = document.querySelector('#wrap .alt-inline-edit-value') ?? document.querySelector('#wrap textarea');
      if (el.tagName !== 'TEXTAREA') { const r = document.createRange(), t = el.firstChild, out = []; let last = null;
        for (let i = 0; i < t.length; i++) { r.setStart(t, i); r.setEnd(t, i + 1); const y = Math.round(r.getBoundingClientRect().top); if (last !== null && y > last + 4) out.push(i); last = y; } return { kind: 'read', breaks: out }; }
      // In the textarea, mirror its text and box to find where its lines break.
      const m = document.createElement('div'), cs = getComputedStyle(el); Object.assign(m.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: cs.overflowWrap, width: el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) + 'px', font: cs.font, letterSpacing: cs.letterSpacing });
      m.textContent = el.value; document.body.append(m); const r = document.createRange(), t = m.firstChild, out = []; let last = null;
      for (let i = 0; i < t.length; i++) { r.setStart(t, i); r.setEnd(t, i + 1); const y = Math.round(r.getBoundingClientRect().top); if (last !== null && y > last + 4) out.push(i); last = y; }
      m.remove(); return { kind: el.tagName, breaks: out }; });
    const before = await linesAt();
    await plate.click();
    const field = page.getByRole('textbox', { name: 'Title' }); await field.waitFor();
    const after = await linesAt();
    check(after.kind === 'TEXTAREA' && JSON.stringify(after.breaks) === JSON.stringify(before.breaks), `WR-04 it opens in a field that wraps where the value did (${JSON.stringify(before.breaks)} → ${JSON.stringify(after.breaks)})`);
    check(await field.evaluate(el => el.selectionStart === 0 && el.selectionEnd === el.value.length), 'WR-05 the whole value is selected, as in the single-line field');
    await page.keyboard.press('End'); await page.keyboard.type(' today'); await page.keyboard.press('Enter');
    await plate.waitFor();
    check((await page.locator('#wrap .alt-inline-edit-value').textContent()).endsWith('width today'), 'WR-06 Enter saves it, with no line break');
    await page.close(); }

  { const page = await open(); await mount(page, { actions: 'inline', multiline: true, required: false }); await edit(page);
    check(await page.locator('#inline-contract .alt-inline-edit-icons').count() === 0 && await page.locator('#inline-contract .alt-inline-edit-actions').getByRole('button', { name: 'Save changes' }).count() === 1, 'AC-12 multiline ignores actions="inline"'); await page.close(); }

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

    const pencil = page.getByRole('button', { name: 'Project name: Spring catalogue launch. Edit Project name', exact: true });
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
    // Measure where hover will find it: hovering scrolls a field below the fold into view, which isn't the field moving.
    await field.scrollIntoViewIfNeeded(); const fieldAt = await field.boundingBox();
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

  for (const scheme of ['daylight', 'nightfall']) for (const width of [320, 960]) {
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
