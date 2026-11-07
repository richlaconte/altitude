// Provider/model identity, controlled catalog changes and composer dispatch against real public components.
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
const root = fileURLToPath(new URL('../../', import.meta.url));
const temp = await mkdtemp(join(tmpdir(), 'altitude-model-selector-'));
const bundle = await build({ stdin: { contents: `import * as React from 'react'; import {createRoot} from 'react-dom/client'; import * as A from './project/components/src/index.tsx'; window.React=React;window.createRoot=createRoot;window.A=A;`, resolveDir: root, loader: 'tsx' }, bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"development"' } });
await writeFile(join(temp, 'bundle.js'), bundle.outputFiles[0].contents);
await writeFile(join(temp, 'style.css'), await readFile(join(root, 'project/components/bundle.css')));
await writeFile(join(temp, 'index.html'), '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Model selection contracts</title><link rel="stylesheet" href="style.css"><style>body{margin:0;padding:12px}#root{max-width:640px}*{box-sizing:border-box}</style><div id="root"></div><script src="bundle.js"></script></html>');
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const page = await browser.newPage({ viewport: { width: 760, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
const mount = async (modelPicker = true) => {
  await page.goto(`file://${join(temp, 'index.html')}`);
  check(await page.evaluate(() => typeof A.ModelSelector === 'function' && typeof A.PromptInputModelSelector === 'function' && typeof A.getModelSelectionError === 'function'), 'public provider/model selection API exists');
  await page.evaluate(enabled => {
    const h = React.createElement;
    const providers = [
      { id: 'direct', label: 'Direct connection', models: [{ id: 'shared/model', label: 'Shared model' }, { id: 'small', label: 'Small model' }, { id: 'denied', label: 'Restricted model', disabled: true, disabledReason: 'Your workspace does not allow this model.' }] },
      { id: 'gateway', label: 'Gateway connection', models: [{ id: 'shared/model', label: 'Shared model' }] },
      { id: 'offline', label: 'Disconnected provider', disabled: true, disabledReason: 'Connect this provider in Settings.', models: [] },
    ];
    const api = { sent: [], queued: [], stops: 0, changes: [], providers }; window.harness = api;
    function Fixture() {
      const [config, setConfig] = React.useState({ providers, value: null });
      const [status, setStatus] = React.useState('ready');
      const [reject, setReject] = React.useState(false);
      api.patch = patch => setConfig(c => ({ ...c, ...patch })); api.status = setStatus; api.reject = setReject; api.config = config;
      const modelPicker = { ...config, onValueChange: value => { api.changes.push(value); setConfig(c => ({ ...c, value })); } };
      return h(A.PromptInput, {
        ...(enabled ? { modelPicker } : {}), status, accept: 'text/*',
        onSubmit: message => { if (reject) return false; api.sent.push(message); },
        onQueue: message => { if (reject) return false; api.queued.push(message); },
        onStop: () => { api.stops++; setStatus('ready'); },
      }, h(A.PromptInputAttachments), h(A.PromptInputTextarea),
      h(A.PromptInputToolbar, null, ...(enabled ? [h(A.PromptInputModelSelector, { key: 'models' })] : []), h(A.PromptInputSubmit)));
    }
    window.fixtureRoot = createRoot(document.getElementById('root'));
    fixtureRoot.render(h(React.StrictMode, null, h(A.AltitudeProvider, null, h(Fixture))));
  }, modelPicker);
  await page.getByRole('textbox', { name: 'Message', exact: true }).waitFor();
};
const patch = async value => { await page.evaluate(value => harness.patch(value), value); await page.waitForTimeout(40); };
const input = () => page.getByRole('textbox', { name: 'Message', exact: true });
const model = () => page.getByRole('combobox', { name: 'Model', exact: true });
try {
  await mount();
  await input().fill('Keep this draft');
  await page.setInputFiles('input[type=file]', { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('notes') });
  await page.getByRole('button', { name: 'Send message', exact: true }).click({ force: true });
  await input().press('Enter');
  check(await page.evaluate(() => harness.sent.length === 0), 'missing selection blocks click and Enter');
  check(await input().inputValue() === 'Keep this draft' && await page.getByRole('button', { name: 'Remove notes.txt' }).count() === 1, 'blocked send preserves text and files');
  check(await page.getByRole('button', { name: 'Send message' }).getAttribute('aria-describedby'), 'blocked Send has an associated reason');
  await patch({ value: { providerId: 'direct', modelId: 'shared/model' } });
  await page.getByRole('button', { name: 'Provider', exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction(() => document.activeElement?.getAttribute('role') === 'listbox');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  check(await page.evaluate(() => harness.config.value.providerId === 'gateway' && harness.config.value.modelId === ''), 'provider change explicitly clears model even when both providers share an ID');
  check(await input().inputValue() === 'Keep this draft', 'provider changes preserve the draft');
  await model().fill('Shared'); await model().press('Enter');
  check(await page.evaluate(() => harness.config.value.providerId === 'gateway' && harness.config.value.modelId === 'shared/model'), 'search chooses model within selected provider');
  check(await model().evaluate(el => el === document.activeElement), 'choosing a model keeps focus in the model field');
  await model().press('Enter');
  check(await page.evaluate(() => harness.sent.length === 0), 'Enter in a closed model field never submits the prompt');
  await model().fill('no matching model'); await model().press('Enter');
  check(await page.evaluate(() => harness.sent.length === 0), 'Enter with no model matches never submits the prompt');
  await model().fill('Shared');
  await model().evaluate(el => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, isComposing: true, bubbles: true, cancelable: true })));
  check(await model().getAttribute('aria-expanded') === 'true' && await page.evaluate(() => harness.sent.length === 0), 'IME Enter does not choose a model or submit the prompt');
  await model().fill('different query'); await model().press('Escape');
  check(await model().inputValue() === 'Shared model', 'Escape restores selected model without changing route');
  await input().press('Enter');
  check(await page.evaluate(() => harness.sent.length === 1 && harness.sent[0].model.providerId === 'gateway' && harness.sent[0].model.modelId === 'shared/model' && harness.sent[0].files.length === 1), 'sent message includes complete route and attachment');
  check(await page.evaluate(() => harness.sent[0].model !== harness.config.value), 'sent route is detached from controlled selection');
  await page.evaluate(() => { harness.config.value.providerId = 'mutated'; });
  check(await page.evaluate(() => harness.sent[0].model.providerId === 'gateway'), 'mutating selected object cannot rewrite sent route');
  await patch({ value: { providerId: 'direct', modelId: 'shared/model' } });
  await page.evaluate(() => harness.status('streaming'));
  await input().fill('Next message'); await input().press('Enter');
  check(await page.evaluate(() => harness.queued.length === 1 && harness.queued[0].model.providerId === 'direct' && harness.queued[0].model !== harness.config.value), 'queued message snapshots provider/model');
  await patch({ value: { providerId: 'gateway', modelId: '' } });
  await input().fill('Hold queued draft'); await input().press('Enter');
  check(await page.evaluate(() => harness.queued.length === 1) && await input().inputValue() === 'Hold queued draft', 'invalid route blocks queue without losing text');
  await page.getByRole('button', { name: 'Stop generating' }).click();
  check(await page.evaluate(() => harness.stops === 1), 'Stop remains usable when next-message model is invalid');
  for (const [config, reason] of [
    [{ value: { providerId: 'missing', modelId: 'shared/model' } }, 'no longer available'],
    [{ value: { providerId: 'direct', modelId: 'missing' } }, 'no longer available'],
    [{ value: { providerId: 'offline', modelId: 'shared/model' } }, 'Connect this provider'],
    [{ value: { providerId: 'direct', modelId: 'denied' } }, 'does not allow'],
    [{ value: { providerId: 'direct', modelId: 'shared/model' }, loading: true }, 'Loading'],
    [{ loading: false, error: 'Catalog connection failed. Try again.' }, 'Catalog connection failed'],
    [{ error: undefined, providers: [] }, 'No providers'],
  ]) {
    await patch(config); await input().press('Enter');
    check(await page.evaluate(() => harness.sent.length === 1), `unavailable state blocks dispatch: ${reason}`);
    check((await page.locator('.alt-prompt-model-feedback').textContent()).includes(reason), `reason is visible: ${reason}`);
  }
  await page.evaluate(() => harness.patch({ providers: harness.providers, value: { providerId: 'direct', modelId: 'shared/model' } }));
  await page.waitForTimeout(40);
  await page.evaluate(() => harness.patch({ providers: harness.providers.map(p => p.id === 'direct' ? { ...p, models: p.models.filter(m => m.id !== 'shared/model') } : p) }));
  await page.waitForTimeout(40);
  check((await model().inputValue()).includes('shared/model'), 'removed selection remains identifiable instead of showing another model');
  await input().press('Enter');
  check(await page.evaluate(() => harness.sent.length === 1), 'catalog removal blocks old selection');
  await page.evaluate(() => harness.patch({ providers: harness.providers, value: { providerId: 'direct', modelId: 'small' } }));
  await patch({ disabled: true });
  check(await page.evaluate(() => A.getModelSelectionError(harness.config) === null), 'locking the controls does not invalidate an available route');
  check(await model().isDisabled(), 'disabled locks model control');
  await page.evaluate(() => harness.reject(true));
  await input().press('Enter');
  check(await input().inputValue() === 'Hold queued draft', 'false submit result preserves draft');
  await page.evaluate(() => harness.status('streaming')); await input().press('Enter');
  check(await input().inputValue() === 'Hold queued draft', 'false queue result preserves draft');
  await page.evaluate(() => harness.status('ready'));
  await page.setViewportSize({ width: 320, height: 812 });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= 320), 'selector and composer fit a 320px viewport');
  await mount(false); await input().fill('Legacy composer'); await input().press('Enter');
  check(await page.evaluate(() => harness.sent.length === 1 && !('model' in harness.sent[0])), 'composer without modelPicker keeps existing payload');
  check(errors.length === 0, `no page errors: ${errors.join('; ')}`);
  console.log(`Model selector: ${checks} passed`);
} finally {
  await browser.close(); await rm(temp, { recursive: true, force: true });
}
