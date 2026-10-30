// Assistant conversation pattern (#285): in its preview, a send shows the person's message and streams the answer on
// a dashed rule; a double Enter sends once; Stop keeps the partial answer as "Stopped" with Retry; offline and rate
// limited failures keep the message in the composer and say what happened in words; context full offers a new
// conversation; reloading mid-answer shows it "Interrupted" with Retry, never complete; the context Meter speaks in
// words. Run after a render of every preview (it opens test/p-AssistantConversationPattern-daylight.html); exits
// non-zero on a failure.
import { chromium } from 'playwright-core';
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
await box.fill('What are the open risks?'); await box.press('Enter'); await box.press('Enter'); await page.waitForTimeout(600);
let a = await answer();
expect((await read()).user.length === 1 && a?.stream === 'streaming', `a send streams the answer, and a double Enter sends once (${JSON.stringify(a)})`);
await page.click('.alt-prompt button[aria-label*="Stop" i]'); await page.waitForTimeout(150);
a = await answer();
expect(a.stream === 'stopped' && a.text.length > 0 && /Stopped/.test(a.caption) && a.retry, `Stop keeps the partial answer as "Stopped" with Retry (${JSON.stringify(a)})`);
await page.click('.alt-msg[data-from="assistant"] button:has-text("Retry")'); await page.waitForTimeout(3200);
a = await answer();
expect(a.stream === 'complete' && a.text.includes('decision from legal by Friday'), `Retry completes the answer (${a.stream})`);
// Offline: the message stays in the composer, said in words.
await page.click('[role="radio"]:has-text("Offline"), button:has-text("Offline")'); await page.waitForTimeout(100);
await box.fill('Summarise it'); await box.press('Enter'); await page.waitForTimeout(700);
let r = await read();
expect(/We can't reach the assistant/.test(r.alert ?? '') && r.draft === 'Summarise it', `offline keeps the message and says so (${JSON.stringify({ alert: r.alert, draft: r.draft })})`);
await page.click('button:has-text("Rate limited")'); await page.waitForTimeout(100);
await box.press('Enter'); await page.waitForTimeout(700);
r = await read();
expect(/You've reached this hour's limit\. Try again at/.test(r.alert ?? '') && r.draft === 'Summarise it', `a rate limit says when (${r.alert})`);
await page.click('button:has-text("Context full")'); await page.waitForTimeout(100);
await box.press('Enter'); await page.waitForTimeout(700);
r = await read();
expect(/too long to continue/.test(r.alert ?? '') && await page.locator('.alt-alert button:has-text("Start a new conversation")').count() === 1, 'context full offers a new conversation');
const meter = await page.evaluate(() => document.querySelector('.ac-context [role="meter"], .ac-context[role="meter"]')?.getAttribute('aria-valuetext') ?? document.querySelector('.ac-context')?.textContent);
expect(/% of context used/.test(meter ?? ''), `the context meter speaks in words (${meter})`);
await page.click('button:has-text("Reload mid-answer")'); await page.waitForTimeout(300);
a = await answer();
expect(a.stream === 'error' && /Interrupted/.test(await page.evaluate(() => document.querySelector('.ac-note')?.textContent ?? '')) && a.retry, `after a reload, an unfinished answer is interrupted with Retry (${JSON.stringify(a)})`);
expect(!errors.length, `no page errors (${errors.join('; ')})`);
console.log(`Assistant conversation pattern: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
