// Assistant conversation pattern (#285): in its preview, a send shows the person's message and streams the answer on
// a dashed rule; a double Enter sends once; Stop keeps the partial answer as "Stopped" with Retry; offline and rate
// limited failures keep the message in the composer and say what happened in words; context full offers a new
// conversation; Try again after a failure sends the kept message again; reloading mid-answer shows it "Interrupted" with Retry, never complete; the context Meter speaks in
// words. Run after a render of every preview (it opens test/p-AssistantConversationPattern-daylight.html); exits
// non-zero on a failure.
import { chromium } from 'playwright-core';
import { openFixtures } from './preview-fixtures.mjs';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 900 } });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`file://${T}p-AssistantConversationPattern-daylight.html`); await page.waitForTimeout(400);
const box = page.locator('.alt-prompt textarea');
const read = () => page.evaluate(() => ({ user: [...document.querySelectorAll('.alt-msg[data-from="user"]')].map((m) => m.textContent), answer: document.querySelector('.alt-msg[data-from="assistant"]'), alert: document.querySelector('.alt-alert')?.textContent ?? null, draft: document.querySelector('.alt-prompt textarea').value }))
  .then((r) => r);
const answer = () => page.evaluate(() => { const m = document.querySelector('.alt-msg[data-from="assistant"]'); return m ? { stream: m.dataset.stream, text: m.querySelector('.alt-msg-content')?.textContent ?? '', caption: m.querySelector('.alt-msg-caption')?.textContent ?? '', retry: !!m.querySelector('button') } : null; });
const route = () => page.locator('.ac-route').evaluateAll((els) => els.map((el) => ({ provider: el.dataset.provider, model: el.dataset.model, text: el.textContent })));
const chooseProvider = async (label) => {
  await page.getByRole('button', { name: 'Provider', exact: true }).click();
  await page.getByRole('option', { name: label, exact: true }).click();
};
const chooseBeam = async () => {
  const model = page.getByRole('combobox', { name: 'Model', exact: true });
  await model.fill('Beam');
  await model.press('Enter');
};
const hasPicker = await page.getByRole('button', { name: 'Provider', exact: true }).count() === 1;
expect(hasPicker, 'the conversation composer exposes provider and model selection');
await box.fill('What are the open risks?'); await box.press('Enter'); await box.press('Enter'); await page.waitForTimeout(600);
let a = await answer();
expect((await read()).user.length === 1 && a?.stream === 'streaming', `a send streams the answer, and a double Enter sends once (${JSON.stringify(a)})`);
expect((await route()).some((r) => r.provider === 'direct' && r.model === 'beam' && /Direct.*Beam/.test(r.text)), 'the answer records the submitted provider and model');
if (hasPicker) {
  await chooseProvider('Gateway');
  expect(await page.locator('.alt-prompt button[aria-label*="Stop" i]').isEnabled(), 'an incomplete next selection does not disable Stop');
  await chooseBeam();
  expect((await route()).every((r) => r.provider === 'direct' && r.model === 'beam'), 'changing the next model during streaming leaves the active route unchanged');
}
await page.click('.alt-prompt button[aria-label*="Stop" i]'); await page.waitForTimeout(150);
a = await answer();
expect(a.stream === 'stopped' && a.text.length > 0 && /Stopped/.test(a.caption) && a.retry, `Stop keeps the partial answer as "Stopped" with Retry (${JSON.stringify(a)})`);
await page.click('.alt-msg[data-from="assistant"] button:has-text("Retry")'); await page.waitForTimeout(3200);
a = await answer();
expect(a.stream === 'complete' && a.text.includes('decision from legal by Friday'), `Retry completes the answer (${a.stream})`);
expect((await route()).some((r) => r.provider === 'direct' && r.model === 'beam'), 'Retry keeps the original pair after the picker changes');
expect(a.text.includes('Direct / Beam'), 'the scripted stream consumes the captured route rather than the current picker');
// Offline: the message stays in the composer, said in words.
await openFixtures(page);
await page.click('[role="radio"]:has-text("Offline"), button:has-text("Offline")'); await page.waitForTimeout(100);
await box.fill('Summarise it'); await box.press('Enter'); await page.waitForTimeout(700);
let r = await read();
expect(/We can't reach the assistant/.test(r.alert ?? '') && r.draft === 'Summarise it', `offline keeps the message and says so (${JSON.stringify({ alert: r.alert, draft: r.draft })})`);
if (hasPicker) { await chooseProvider('Direct'); await chooseBeam(); }
// Try again sends the kept input again, once, to the recovered service (#581): a new stream starts and the error clears.
await page.click('.alt-alert button:has-text("Try again")'); await page.waitForTimeout(600);
r = await read(); a = await answer();
expect(a?.stream === 'streaming' && r.alert === null && r.user.length === 1 && r.user[0].endsWith('Summarise it'), `Try again streams the kept message again and clears the error (${JSON.stringify({ stream: a?.stream, alert: r.alert, user: r.user })})`);
if (hasPicker) expect((await route()).some((r) => r.provider === 'gateway' && r.model === 'beam'), 'failure Retry uses its captured provider despite a changed next-message selection');
if (a?.stream === 'streaming') { await page.click('.alt-prompt button[aria-label*="Stop" i]'); await page.waitForTimeout(150); }
await page.click('button:has-text("Offline")'); await page.waitForTimeout(100);
await box.fill('Summarise it'); await box.press('Enter'); await page.waitForTimeout(700);
await page.click('button:has-text("Rate limited")'); await page.waitForTimeout(100);
await box.press('Enter'); await page.waitForTimeout(700);
r = await read();
expect(/You've reached this hour's limit\. Try again at/.test(r.alert ?? '') && r.draft === 'Summarise it', `a rate limit says when (${r.alert})`);
await page.click('button:has-text("Context full")'); await page.waitForTimeout(100);
await box.press('Enter'); await page.waitForTimeout(700);
r = await read();
expect(/too long to continue/.test(r.alert ?? '') && await page.locator('.alt-alert button:has-text("Start a new conversation")').count() === 1, 'context full offers a new conversation');
const meter = await page.evaluate(() => document.querySelector('.ac-context [role="meter"], .ac-context[role="meter"]')?.getAttribute('aria-valuetext') ?? document.querySelector('.ac-context')?.textContent);
expect(/^\d+% of 100%(, [a-z]+)?$/.test(meter ?? ''), `the context meter reads its value once, as a share of the window (${meter})`);
await page.click('button:has-text("Reload mid-answer")'); await page.waitForTimeout(300);
a = await answer();
expect(a.stream === 'error' && /Interrupted/.test(await page.evaluate(() => document.querySelector('.ac-note')?.textContent ?? '')) && a.retry, `after a reload, an unfinished answer is interrupted with Retry (${JSON.stringify(a)})`);
expect((await route()).some((r) => r.provider === 'gateway' && r.model === 'beam'), 'the interrupted record restores its provider and model');
if (hasPicker) expect((await page.getByRole('button', { name: 'Provider', exact: true }).textContent()).includes('Direct'), 'restored route is independent of the next-message default');
await page.click('.alt-msg[data-from="assistant"] button:has-text("Retry")'); await page.waitForTimeout(3600);
a = await answer();
expect(a.stream === 'complete' && a.text.includes('Gateway / Beam'), 'retrying an interrupted record dispatches the restored pair');
expect(!errors.length, `no page errors (${errors.join('; ')})`);
console.log(`Assistant conversation pattern: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
