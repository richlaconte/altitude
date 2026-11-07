// The harness chooses a route for the next message; submitted and queued records retain their route.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let checks = 0;
const check = (value, text) => { assert.ok(value, text); checks++; };
try {
  for (const scheme of ['daylight', 'nightfall']) {
    const page = await browser.newPage({ viewport: { width: 1180, height: 1000 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`file://${T}p-AgentHarness-${scheme}.html`);
    await page.waitForSelector('.ah-main');
    check(await page.locator('.ah-main').getByRole('button', { name: 'Provider', exact: true }).count() === 1, 'scripted harness exposes provider selection');
    const scope = page.locator('.ah-main');
    const provider = scope.getByRole('button', { name: 'Provider', exact: true });
    const model = scope.getByRole('combobox', { name: 'Model', exact: true });
    const draft = scope.getByRole('textbox', { name: 'Message', exact: true });
    await draft.fill('Keep the active route');
    await provider.click(); await page.getByRole('option', { name: 'Gateway', exact: true }).click();
    check(await model.inputValue() === '', 'provider change clears the old model');
    await draft.press('Enter');
    check(await draft.inputValue() === 'Keep the active route', 'incomplete route preserves queued draft');
    await model.fill('Beam'); await model.press('ArrowDown'); await model.press('Enter');
    check((await scope.locator('.ah-model-record').first().textContent()).includes('Direct · Beam'), 'changing next choice leaves current scripted run attribution intact');
    await draft.press('Enter');
    check((await scope.locator('.alt-queued').last().textContent()).includes('Gateway · Beam'), 'queue captures full provider/model identity');
    await page.getByRole('button', { name: 'Asked', exact: true }).click();
    check((await scope.locator('.alt-queued').last().textContent()).includes('Gateway · Beam'), 'seeking to the start does not dispatch the queue');
    await provider.click(); await page.getByRole('option', { name: 'Direct', exact: true }).click();
    await model.fill('Arc'); await model.press('ArrowDown'); await model.press('Enter');
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('.ah-main .alt-queued'));
    check((await scope.locator('.ah-model-record').last().textContent()).includes('Gateway · Beam'), 'draining queue uses captured route, not current picker');
    await draft.fill('Send the next route'); await draft.press('Enter');
    check((await scope.locator('.ah-model-record').last().textContent()).includes('Direct · Arc'), 'new send records next route');
    await page.locator('.ah-views .alt-tabs').getByRole('tab', { name: 'Coding session' }).click();
    const coding = page.locator('.cs');
    check(await coding.getByRole('button', { name: 'Provider', exact: true }).count() === 1, 'coding session also exposes provider and model');
    await coding.locator('textarea').fill('Use this connection');
    await coding.locator('textarea').press('Enter');
    check((await coding.locator('.ah-model-record').last().textContent()).includes('Direct · Beam'), 'coding composer records submitted route');
    await coding.locator('textarea').fill('/review');
    await coding.locator('textarea').press('ArrowDown'); await coding.locator('textarea').press('Enter');
    await coding.locator('textarea').press('Enter');
    check((await coding.locator('.alt-msg[data-from="user"]').last().textContent()).includes('/review'), 'recorded commands retain their name');
    check(errors.length === 0, `${scheme}: no page errors: ${errors.join('; ')}`);
    await page.close();
  }
  console.log(`Agent model selection: ${checks} passed`);
} finally { await browser.close(); }
