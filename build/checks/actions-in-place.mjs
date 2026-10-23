import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { chromium } from 'playwright-core';
import { fixturePath } from './fixture-path.mjs';
let pass = 0, fail = 0;
const checks = [];
const expect = (condition, name) => { checks.push({ name, pass: !!condition }); if (condition) pass++; else { fail++; console.error('FAIL', name); } };
const source = readFileSync(new URL('../previews.txt', import.meta.url), 'utf8').split('=== ActionsInPlace |')[1].split('--- jsx\n')[1].split('// END FILES SERVICE')[0];
const canonicalSection = readFileSync(new URL('../previews.txt', import.meta.url), 'utf8').split('=== ActionsInPlace |')[1].split('\n=== ')[0].split('--- jsx\n')[1];
const canonicalRecipe = canonicalSection.slice(canonicalSection.indexOf('const FILES_SEED'), canonicalSection.indexOf('\nfunction App()')).trim();
const guide = readFileSync(new URL('../../project/ActionsInPlace.md', import.meta.url), 'utf8');
const recipe = guide.split('<!-- recipe-source:start -->\n```jsx\n')[1]?.split('\n```\n<!-- recipe-source:end -->')[0];
expect(recipe === canonicalRecipe, 'REC-12/CON-10 copyable guide is generated from the canonical executable recipe');
const createService = vm.runInNewContext(source + '\ncreateFilesService', { setTimeout, Map, Object, Promise, Error });
const fast = ms => new Promise(resolve => setTimeout(resolve, ms / 30));
const request = (kind, id = 'file-brand', revision = 1, op = kind + '-1') => ({ kind, id, expectedRevision: revision, operationId: op });
{
  const service = createService('success-100', fast);
  const result = await service.mutate(request('archive'));
  expect(result.archived && result.revision === 2, 'REC-01 confirmed archive changes one versioned record');
  const restored = await service.mutate(request('restore', result.id, result.revision));
  expect(!restored.archived && restored.position === 0 && restored.revision === 3, 'REC-02 inverse uses confirmed revision and original position');
  expect(service.read('file-brand-draft').revision === 1, 'REC-02 reconciliation leaves unrelated records untouched');
}
{
  const service = createService('success-1200', fast), req = request('archive');
  await Promise.all([service.mutate(req), service.mutate(req)]);
  expect(service.accepted.length === 1, 'REC-04 operation ID deduplicates simultaneous requests');
}
{
  const service = createService('fail-once', fast);
  let error; try { await service.mutate(request('archive')); } catch (e) { error = e; }
  expect(error?.code === 'rejected' && !service.read('file-brand').archived && service.accepted.length === 0, 'REC-05 known rejection leaves authoritative record unchanged');
  const retried = await service.mutate(request('archive', 'file-brand', 1, 'retry'));
  expect(retried.archived && service.accepted.length === 1, 'REC-05 explicit safe retry succeeds once');
}
{
  const service = createService('interrupted-after-save', fast), req = request('archive');
  let error; try { await service.mutate(req); } catch (e) { error = e; }
  const confirmed = await service.reconcile(req.operationId);
  expect(error?.code === 'uncertain' && confirmed?.archived, 'REC-06 unknown outcome reconciles a committed archive');
  await service.mutate(req);
  expect(service.accepted.length === 1, 'REC-06 repeated uncertain operation cannot duplicate accepted mutation');
}
{
  const service = createService('success-100', fast);
  const record = await service.mutate(request('archive'));
  service.change(record.id, { name: 'Brand guidelines updated.pdf' });
  let error; try { await service.mutate(request('restore', record.id, record.revision)); } catch (e) { error = e; }
  expect(error?.code === 'conflict' && service.read(record.id).archived, 'REC-07 stale Undo cannot overwrite a changed record');
  const current = service.read(record.id); service.change(record.id, { deleted: true });
  try { await service.mutate(request('restore', current.id, current.revision, 'deleted-undo')); } catch (e) { error = e; }
  expect(error?.code === 'missing' && service.read(record.id).deleted, 'REC-07 deleted target never resurrects');
}
{
  const service = createService('success-100', fast);
  const a = await service.mutate(request('archive'));
  const deleted = await service.mutate(request('delete', a.id, a.revision));
  expect(deleted.deleted && !service.read('file-brand-draft').deleted, 'CON-03 deletion uses captured ID/revision only');
}
if (!process.env.ALT_MODEL_ONLY) {
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const open = async (fixture = 'success-100', options = {}) => {
    const page = await browser.newPage({ viewport: { width: 960, height: 1000 }, ...options });
    page.on('pageerror', error => expect(false, 'browser page error: ' + error.message));
    page.on('console', message => { if (message.type() === 'error') expect(false, 'browser console: ' + message.text()); });
    await page.goto('file://' + fixturePath('ActionsInPlace') + '?fixture=' + fixture + '#files');
    await page.locator('[data-action="archive"][data-id="file-brand"]').waitFor();
    if (process.env.ALT_FIXTURE_ROOT?.includes('react19')) expect((await page.locator('html').getAttribute('data-react-version'))?.startsWith('19.'), 'DEM-07 actual React 19 runtime');
    return page;
  };
  const action = (p, kind, id = 'file-brand') => p.locator(`[data-action="${kind}"][data-id="${id}"]`);
  const archive = async p => { await action(p, 'archive').click(); await p.getByRole('button', { name: 'Undo archive of Brand guidelines.pdf', exact: true }).waitFor(); };
  const archived = p => p.getByRole('button', { name: /^Archived \(/ }).click();
  const snapshot = p => p.evaluate(() => window.__filesDemo.snapshot());
  const confirm = p => p.getByRole('dialog').getByRole('button', { name: 'Delete permanently', exact: true });
  const run = async (name, test) => { if (process.env.ALT_ACTIONS_CASE && !name.includes(process.env.ALT_ACTIONS_CASE)) return; let p; try { p = await test(); } catch (error) { expect(false, name + ': ' + error.message); } finally { if (p) await p.close(); } };
  await run('REC-01/02/03/10 direct action and persistent recovery', async () => {
    const p = await open('success-1200');
    await action(p, 'archive').focus(); await p.keyboard.press('Enter');
    expect(await action(p, 'archive').count() === 0 && await p.getByRole('dialog').count() === 0, 'REC-01 immediate archive without confirmation');
    expect(await p.getByRole('button', { name: /^Undo archive/ }).count() === 0, 'REC-02 no Undo before confirmation');
    expect(await p.locator('[data-recovery]').innerText().then(t => t.includes('Archiving')), 'REC-01 truthful pending announcement');
    expect(await action(p, 'archive', 'file-brand-draft').evaluate(el => el === document.activeElement), 'REC-09 row removal focuses corresponding next action');
    await p.getByPlaceholder('Search files').fill('Launch');
    await p.getByRole('button', { name: 'Undo archive of Brand guidelines.pdf', exact: true }).waitFor();
    expect(await p.getByPlaceholder('Search files').evaluate(el => el === document.activeElement), 'REC-09 late response never steals focus');
    await p.getByPlaceholder('Search files').fill('');
    await p.getByRole('button', { name: 'Undo archive of Brand guidelines.pdf', exact: true }).click();
    await action(p, 'archive').waitFor(); await p.waitForTimeout(1250);
    expect((await snapshot(p)).records[0].revision === 3, 'REC-02 confirmed inverse restores stable record position');
    await archive(p); await p.locator('[data-recovery]').getByRole('button', { name: 'Dismiss', exact: true }).click(); await p.waitForTimeout(450);
    await archived(p); expect(await action(p, 'restore').count() === 1, 'REC-03/10 Archived remains after dismissal');
    await action(p, 'restore').click(); await p.waitForTimeout(1250);
    expect(!(await snapshot(p)).records[0].archived, 'REC-03 durable Restore performs real inverse');
    return p;
  });
  await run('REC-04/08/10 concurrency and delayed dismissal', async () => {
    const p = await open();
    await action(p, 'archive').evaluate(el => { el.click(); el.click(); });
    await p.waitForTimeout(180); expect((await snapshot(p)).accepted.length === 1, 'REC-04 duplicate activation suppressed synchronously');
    await p.locator('[data-recovery]').getByRole('button', { name: 'Dismiss', exact: true }).click();
    await action(p, 'archive', 'file-brand-draft').click(); await p.waitForTimeout(470);
    expect(await p.getByRole('button', { name: 'Undo archive of Brand guidelines draft.pdf', exact: true }).count() === 1, 'REC-10 dismissal of A cannot remove or hide B');
    await p.evaluate(() => window.__filesDemo.service.setFixture('success-1200'));
    await action(p, 'archive', 'file-launch').click();
    await archived(p);
    await p.evaluate(() => window.__filesDemo.service.setFixture('success-100'));
    await action(p, 'restore', 'file-brand-draft').click(); await p.waitForTimeout(1300);
    expect(await p.locator('[data-recovery]').innerText().then(t => t.includes('Brand guidelines draft.pdf is restored')), 'REC-08 older response never replaces more recent success');
    expect((await snapshot(p)).records.find(r => r.id === 'file-launch').archived, 'REC-08 independent slower record still reconciles');
    return p;
  });
  for (const fixture of ['fail-once', 'conflict', 'interrupted-after-save']) await run('REC fixture ' + fixture, async () => {
    const p = await open(fixture); await action(p, 'archive').click(); await p.waitForTimeout(1300);
    const state = await snapshot(p);
    if (fixture === 'fail-once') {
      expect(!state.records[0].archived && state.accepted.length === 0, 'REC-05 failed optimistic archive reconciles only target');
      expect(await p.getByRole('button', { name: 'Retry archive', exact: true }).count() === 1, 'REC-05 known rejection offers actionable retry');
      await p.getByRole('button', { name: 'Retry archive', exact: true }).click(); await p.waitForTimeout(180);
      expect((await snapshot(p)).accepted.length === 1, 'REC-05 safe explicit retry succeeds');
    } else if (fixture === 'conflict') {
      expect(state.records[0].revision === 2 && !state.records[0].archived && state.records[1].revision === 1, 'REC-07 conflict reconciles target and preserves unrelated data');
      expect(await p.getByRole('button', { name: /^Undo archive/ }).count() === 0, 'REC-07 conflicted archive never offers stale Undo');
    } else expect(state.records[0].archived && state.accepted.length === 1, 'REC-06 post-commit interruption reconciles without rollback or duplicate');
    return p;
  });
  await run('REC-05/08 older failure remains actionable beside newer recovery', async () => {
    const p = await open('fail-once'); await action(p, 'archive').click();
    await p.evaluate(() => window.__filesDemo.service.setFixture('success-100'));
    await action(p, 'archive', 'file-brand-draft').click(); await p.waitForTimeout(1300);
    expect(await p.getByRole('button', { name: 'Undo archive of Brand guidelines draft.pdf', exact: true }).count() === 1, 'REC-08 older error preserves newer recovery');
    expect(await p.locator('[data-file-id="file-brand"]').getByRole('button', { name: 'Retry archive', exact: true }).count() === 1, 'REC-05 older failure has an actionable row error');
    return p;
  });
  await run('REC-07 stale Undo', async () => {
    const p = await open(); await archive(p);
    await p.evaluate(() => window.__filesDemo.service.change('file-brand', { name: 'Brand guidelines updated.pdf' }));
    await p.getByRole('button', { name: 'Undo archive of Brand guidelines.pdf', exact: true }).click();
    expect(await p.getByRole('button', { name: /^Undo archive/ }).count() === 0, 'REC-07 invalid Undo removed with explanation');
    expect(await p.locator('[data-recovery]').innerText().then(t => t.includes('changed after it was archived')), 'REC-07 stale Undo gives current recovery route');
    return p;
  });
  await run('CON-01/02/03/04 captured target and cancellation', async () => {
    const p = await open(); await archive(p); await archived(p); await action(p, 'delete').click();
    const dialog = p.getByRole('dialog');
    expect(await dialog.innerText().then(t => t.includes('Brand guidelines.pdf') && t.includes('Brand') && t.includes('restore')), 'CON-01 exact identity and consequence visible');
    expect(await dialog.getByRole('button', { name: 'Cancel', exact: true }).evaluate(el => el === document.activeElement), 'CON-01 Cancel initially focused');
    expect(await p.locator('[data-product]').evaluate(el => !!el.closest('[inert]')), 'CON-04/REC-09 background recovery is inert');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    expect((await snapshot(p)).accepted.length === 1, 'CON-02 opening and Escape submit no deletion');
    await action(p, 'delete').click(); await confirm(p).evaluate(el => { el.click(); el.click(); }); await p.waitForTimeout(420);
    const state = await snapshot(p);
    expect(state.accepted.filter(r => r.kind === 'delete').length === 1 && !state.records[1].deleted, 'CON-03 one dispatch deletes captured ID only');
    expect(await p.locator('[data-list-heading]').evaluate(el => el === document.activeElement), 'CON-08 removed invoker returns to surviving heading');
    return p;
  });
  for (const mode of ['success-1200', 'fail-once', 'interrupted-after-save']) await run('CON-05/06/08 pending close ' + mode, async () => {
    const p = await open(); await archive(p); await action(p, 'archive', 'file-brand-draft').click(); await p.waitForTimeout(150); await archived(p);
    await p.evaluate(value => window.__filesDemo.service.setFixture(value), mode);
    await action(p, 'delete').click(); await confirm(p).click();
    expect(await p.getByRole('dialog').innerText().then(t => t.includes('Closing this dialog won’t cancel it')), 'CON-05 pending close states write continues');
    await p.getByRole('dialog').locator('[data-cancel]').click(); await p.waitForTimeout(300);
    await action(p, 'delete', 'file-brand-draft').click(); await p.waitForTimeout(1000);
    expect(await p.getByRole('dialog').innerText().then(t => t.includes('Brand guidelines draft.pdf') && !t.includes('could not')), 'CON-08 A completion/error cannot close or alter B session');
    expect((await snapshot(p)).accepted.filter(r => r.kind === 'delete').length === (mode === 'fail-once' ? 0 : 1), 'CON-06 pending outcome reconciles accurately');
    return p;
  });
  await run('CON-08 pending close repairs removed restored invoker', async () => {
    const p = await open(); await archive(p); await archived(p); await p.evaluate(() => window.__filesDemo.service.setFixture('success-1200'));
    await action(p, 'delete').click(); await confirm(p).click(); await p.keyboard.press('Escape'); await p.waitForTimeout(1350);
    expect(await p.locator('[data-list-heading]').evaluate(el => el === document.activeElement), 'CON-08 closed-pending success repairs focused removed Delete trigger');
    return p;
  });
  await run('CON-06/07 stale intent and retry', async () => {
    const p = await open(); await archive(p); await archived(p); await action(p, 'delete').click();
    await p.evaluate(() => window.__filesDemo.service.change('file-brand', { name: 'Brand guidelines updated.pdf' })); await confirm(p).click();
    expect((await snapshot(p)).accepted.length === 1, 'CON-07 changed target rejected before dispatch');
    expect(await p.getByRole('dialog').innerText().then(t => t.includes('Brand guidelines updated.pdf') && t.includes('Review')), 'CON-07 changed identity explained and fresh intent required');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    await p.evaluate(() => window.__filesDemo.service.setFixture('fail-once')); await action(p, 'delete').click(); await confirm(p).click(); await p.waitForTimeout(1250);
    expect(await p.getByRole('dialog').getByRole('button', { name: 'Retry deletion', exact: true }).count() === 1, 'CON-06 failure retained inside matching presentation');
    await p.getByRole('dialog').getByRole('button', { name: 'Retry deletion', exact: true }).click(); await p.waitForTimeout(350);
    expect((await snapshot(p)).records[0].deleted, 'CON-06 explicit deletion retry succeeds');
    return p;
  });
  for (const mode of ['fail-once', 'conflict', 'interrupted-after-save']) await run('REC restore fixture ' + mode, async () => {
    const p = await open(); await archive(p); await archived(p);
    await p.evaluate(value => window.__filesDemo.service.setFixture(value), mode);
    await action(p, 'restore').click(); await p.waitForTimeout(1300);
    const state = await snapshot(p);
    if (mode === 'fail-once') {
      expect(state.records[0].archived && state.accepted.length === 1, 'REC-05 rejected Restore leaves record archived');
      await p.getByRole('button', { name: 'Retry restore', exact: true }).click(); await p.waitForTimeout(180);
      expect(!(await snapshot(p)).records[0].archived, 'REC-05 restore retry performs one inverse');
    } else if (mode === 'conflict') {
      expect(state.records[0].archived && state.records[0].revision === 3, 'REC-07 restore conflict retains authoritative updated archive');
      expect(await p.getByRole('button', { name: 'Retry restore', exact: true }).count() === 0, 'REC-07 stale Restore cannot retry without current intent');
    } else expect(!state.records[0].archived && state.accepted.length === 2, 'REC-06 uncertain Restore reconciles without duplicate');
    return p;
  });
  await run('REC-07 externally deleted Undo', async () => {
    const p = await open(); await archive(p);
    await p.evaluate(() => window.__filesDemo.service.change('file-brand', { deleted: true }));
    await p.getByRole('button', { name: 'Undo archive of Brand guidelines.pdf', exact: true }).click();
    expect((await snapshot(p)).records[0].deleted && await p.getByRole('button', { name: /^Undo archive/ }).count() === 0, 'REC-07 deleted target is reconciled and Undo removed');
    return p;
  });
  await run('CON-07 conflict during dispatched deletion', async () => {
    const p = await open(); await archive(p); await archived(p);
    await p.evaluate(() => window.__filesDemo.service.setFixture('conflict'));
    await action(p, 'delete').click(); await confirm(p).click(); await p.waitForTimeout(1300);
    expect(!(await snapshot(p)).records[0].deleted && await confirm(p).isDisabled(), 'CON-07 server rejects stale pending deletion and disables old intent');
    return p;
  });
  await run('CON-08 pending-close does not steal moved focus', async () => {
    const p = await open(); await archive(p); await archived(p);
    await p.evaluate(() => window.__filesDemo.service.setFixture('success-1200'));
    await action(p, 'delete').click(); await confirm(p).click(); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    await p.getByPlaceholder('Search files').focus(); await p.waitForTimeout(1000);
    expect(await p.getByPlaceholder('Search files').evaluate(el => el === document.activeElement), 'CON-08 background deletion leaves later focus alone');
    return p;
  });
  for (const mode of ['success-100', 'success-1200', 'fail-once', 'conflict', 'interrupted-after-save']) await run('DEM-04 InlineEdit integration ' + mode, async () => {
    const p = await open(mode), row = p.locator('[data-file-id="file-brand"]');
    await row.getByRole('button', { name: 'Rename', exact: true }).click();
    await row.getByRole('textbox', { name: /^File name:/ }).fill('  Brand identity.pdf  ');
    await row.getByRole('button', { name: 'Save changes', exact: true }).click();
    await p.waitForTimeout(mode === 'success-100' ? 200 : 1300);
    const state = await snapshot(p);
    if (mode === 'fail-once') {
      expect(await row.getByRole('textbox', { name: /^File name:/ }).inputValue() === '  Brand identity.pdf  ', 'IE-04/D4 rejection retains exact input');
      await row.getByRole('button', { name: 'Save changes', exact: true }).click(); await p.waitForTimeout(180);
      expect((await snapshot(p)).records[0].name === 'Brand identity.pdf', 'IE-04/D4 retry publishes canonical name');
    } else if (mode === 'conflict') {
      expect(state.records[0].name === 'Brand guidelines updated.pdf' && state.records[1].revision === 1, 'IE-05/D4 conflict reconciles only target');
      expect(await row.getByRole('textbox', { name: /^File name:/ }).inputValue() === '  Brand identity.pdf  ', 'IE-05/D4 conflict retains attempted input');
    } else expect(state.records[0].name === 'Brand identity.pdf' && state.accepted.length === 1, 'IE-04/D4 canonical publication makes one write ' + mode);
    expect(await p.locator('[data-recovery]').count() === 0, 'DEM-04 rename has no duplicate recovery notification');
    return p;
  });
  await run('D4 keyboard rename focus', async () => {
    const p = await open(), row = p.locator('[data-file-id="file-brand"]');
    await row.getByRole('button', { name: 'Rename', exact: true }).focus(); await p.keyboard.press('Enter');
    await row.getByRole('textbox', { name: /^File name:/ }).fill('Keyboard name.pdf'); await p.keyboard.press('Enter');
    await row.getByRole('button', { name: 'Rename', exact: true }).waitFor();
    expect(await row.getByRole('button', { name: 'Rename', exact: true }).evaluate(el => el === document.activeElement), 'IE-07/D4 keyboard save returns focus to the same Rename action');
    expect((await snapshot(p)).records[0].name === 'Keyboard name.pdf' && (await snapshot(p)).accepted.length === 1, 'IE-04/D4 keyboard save publishes one committed write');
    return p;
  });
  await run('IE-06/D4 navigation during save reconciles application record', async () => {
    const p = await open('success-1200'), row = p.locator('[data-file-id="file-brand"]');
    await row.getByRole('button', { name: 'Rename', exact: true }).click();
    await row.getByRole('textbox', { name: /^File name:/ }).fill('Saved while away.pdf');
    await row.getByRole('button', { name: 'Save changes', exact: true }).click(); await archived(p); await p.waitForTimeout(1300);
    await p.getByRole('button', { name: /^Files \(/ }).click();
    expect((await snapshot(p)).records[0].name === 'Saved while away.pdf' && (await snapshot(p)).records[0].revision === 2, 'IE-06/D4 application reconciles successful save after editor unmount');
    expect(await p.getByRole('button', { name: /^Files \(/ }).evaluate(el => el === document.activeElement), 'IE-06/D4 late rename does not steal navigation focus');
    return p;
  });
  for (const patch of [{ name: 'Current brand.pdf' }, { deleted: true }]) await run('REC-07 immediate known Undo invalidation ' + JSON.stringify(patch), async () => {
    const p = await open(); await archive(p);
    await p.evaluate(change => { window.__filesDemo.service.change('file-brand', change); window.__filesDemo.sync('file-brand'); }, patch);
    expect(await p.getByRole('button', { name: /^Undo archive/ }).count() === 0, 'REC-07 known stale or deleted target immediately removes Undo');
    expect(await p.locator('[data-recovery]').innerText().then(text => patch.deleted ? text.includes('removed') : text.includes('changed after it was archived')), 'REC-07 invalidation explains current state without requiring stale activation');
    return p;
  });
  await run('REC-07/08 late receipt cannot revive known stale Undo', async () => {
    const p = await open('interrupted-after-save'); await action(p, 'archive').click(); await p.waitForTimeout(200);
    await p.evaluate(() => { window.__filesDemo.service.change('file-brand', { name: 'Current brand.pdf' }); window.__filesDemo.sync('file-brand'); });
    await p.waitForTimeout(1100);
    expect(await p.getByRole('button', { name: /^Undo archive/ }).count() === 0 && (await snapshot(p)).records[0].name === 'Current brand.pdf', 'REC-07/08 old confirmed archive does not re-advertise invalid Undo');
    return p;
  });
  await run('DEM-08 mobile touch-only actions', async () => {
    const p = await open('success-100', { viewport: { width: 320, height: 900 }, isMobile: true, hasTouch: true });
    await action(p, 'archive').tap(); await p.getByRole('button', { name: 'Undo archive of Brand guidelines.pdf', exact: true }).waitFor();
    await p.getByRole('button', { name: 'Undo archive of Brand guidelines.pdf', exact: true }).tap(); await p.waitForTimeout(180);
    await action(p, 'archive').tap(); await p.getByRole('button', { name: 'Undo archive of Brand guidelines.pdf', exact: true }).waitFor();
    await p.locator('[data-recovery]').getByRole('button', { name: 'Dismiss', exact: true }).tap(); await p.waitForTimeout(450);
    await p.getByRole('button', { name: /^Archived \(/ }).tap(); await action(p, 'restore').tap(); await p.waitForTimeout(180);
    await p.getByRole('button', { name: /^Files \(/ }).tap(); const row = p.locator('[data-file-id="file-brand"]');
    await row.getByRole('button', { name: 'Rename', exact: true }).tap(); await row.getByRole('textbox', { name: /^File name:/ }).fill('Touch name.pdf');
    await row.getByRole('button', { name: 'Save changes', exact: true }).tap(); await p.waitForTimeout(180);
    await row.getByRole('button', { name: 'Rename', exact: true }).tap(); await row.getByRole('textbox', { name: /^File name:/ }).fill('Discarded name.pdf');
    await row.getByRole('button', { name: 'Cancel', exact: true }).tap(); expect((await snapshot(p)).records[0].name === 'Touch name.pdf', 'DEM-08 touch Save and Cancel preserve intended name');
    await action(p, 'archive').tap(); await p.waitForTimeout(180); await p.getByRole('button', { name: /^Archived \(/ }).tap();
    await action(p, 'delete').tap(); await p.getByRole('dialog').locator('[data-cancel]').tap(); await p.waitForTimeout(300);
    expect(!(await snapshot(p)).records[0].deleted, 'DEM-08 touch deletion cancellation performs no write');
    await action(p, 'delete').tap(); await confirm(p).tap(); await p.waitForTimeout(350);
    expect((await snapshot(p)).records[0].deleted, 'DEM-08 touch archive/Undo/durableRestore/rename/delete complete');
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'DEM-08 touch flow has no horizontal overflow');
    return p;
  });
  for (const options of [{ reducedMotion: 'reduce' }, { contrast: 'more' }, { forcedColors: 'active' }, { viewport: { width: 320, height: 900 }, isMobile: true, hasTouch: true }]) await run('DEM-07/08 accessible mode ' + JSON.stringify(options), async () => {
    const p = await open('success-100', options); await archive(p); await archived(p); await action(p, 'delete').click();
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'DEM-07 no horizontal page overflow ' + JSON.stringify(options));
    expect(await confirm(p).isVisible(), 'CON-09 consequence actions visible ' + JSON.stringify(options));
    await p.keyboard.press('Escape'); return p;
  });
  await browser.close();
}
console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
