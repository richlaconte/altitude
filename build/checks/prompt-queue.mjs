// Queueing messages while the agent works (#276): with onQueue, Enter while streaming queues the message (the button
// stays Stop, the composer empties and keeps focus, "Message queued…" is announced); ConversationQueue lists them in
// order ("Queued · 1 of 2") in a list named "Queued messages", with Send now, Edit and Remove; the first is sent when
// the turn ends; without onQueue, Enter while streaming still does nothing. Run after a render of every preview (it
// drives the Conversation preview in test/p-Conversation-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 800 } });
await page.goto(`file://${T}p-Conversation-daylight.html`); await page.waitForTimeout(500);
const box = page.locator('.alt-prompt textarea');
const queue = () => page.evaluate(() => [...document.querySelectorAll('.alt-queued')].map((q) => q.querySelector('.alt-queued-text')?.textContent + ' | ' + q.querySelector('.alt-queued-state')?.textContent));
const users = () => page.evaluate(() => [...document.querySelectorAll('.alt-msg[data-from="user"] .alt-msg-content')].map((m) => m.textContent));
await box.fill('Summarise the risks'); await box.press('Enter'); await page.waitForTimeout(150);
await box.fill('Also update the changelog'); await box.press('Enter'); await page.waitForTimeout(150);
await box.fill('And email Maya'); await box.press('Enter'); await page.waitForTimeout(150);
const q = await queue();
expect(JSON.stringify(q) === JSON.stringify(['Also update the changelog | Queued · 1 of 2', 'And email Maya | Queued · 2 of 2']), `Enter while streaming queues, in order (${JSON.stringify(q)})`);
const state = await page.evaluate(() => ({ list: document.querySelector('.alt-convo-queue')?.getAttribute('aria-label'), box: document.querySelector('.alt-prompt textarea').value, focus: document.activeElement === document.querySelector('.alt-prompt textarea'), stop: !!document.querySelector('.alt-prompt button[aria-label*="Stop" i]'), said: document.querySelector('.alt-prompt [role="status"]').textContent }));
expect(state.list === 'Queued messages' && state.box === '' && state.focus, `a list named "Queued messages"; the composer empties and keeps focus (${JSON.stringify(state)})`);
expect(state.stop && /Message queued/.test(state.said), `the button stays Stop and queuing is announced (${state.said})`);
expect(JSON.stringify(await users()).includes('Summarise the risks') && !(await users()).includes('Also update the changelog'), 'queued messages are not in the log yet');
const look = await page.evaluate(() => { const s = getComputedStyle(document.querySelector('.alt-queued')); return { border: s.borderTopStyle, shadow: s.boxShadow }; });
expect(look.border === 'dashed' && look.shadow === 'none', `a queued message is flush with a dashed rim (${JSON.stringify(look)})`);
// Edit the second in place.
await page.locator('.alt-queued').nth(1).locator('button:has-text("Edit")').click(); await page.waitForTimeout(100);
await page.fill('.alt-queued .alt-msg-editor textarea', 'And email Maya the summary');
await page.locator('.alt-queued button:has-text("Save")').click(); await page.waitForTimeout(100);
expect((await queue())[1]?.startsWith('And email Maya the summary'), 'Edit changes a queued message in place');
// Remove the second: focus moves to the composer when it was the last.
await page.locator('button[aria-label="Remove queued message 2"]').click(); await page.waitForTimeout(150);
expect((await queue()).length === 1 && await page.evaluate(() => document.activeElement === document.querySelector('.alt-prompt textarea')), 'Remove takes it out, and focus goes on');
// When the turn ends, the first queued message is sent.
await page.waitForTimeout(4500);
const u = await users();
expect(u[u.length - 1] === 'Also update the changelog' && (await queue()).length === 0, `the first queued message is sent when the turn ends (${JSON.stringify(u)})`);
// Send now stops the turn and sends it.
await page.waitForTimeout(2500);
await box.fill('Another question'); await box.press('Enter'); await page.waitForTimeout(150);
await box.fill('Queued again'); await box.press('Enter'); await page.waitForTimeout(150);
await page.locator('.alt-queued button:has-text("Send now")').click(); await page.waitForTimeout(300);
const u2 = await users();
expect(u2[u2.length - 1] === 'Queued again' && (await page.evaluate(() => document.querySelectorAll('.alt-msg[data-stream="stopped"]').length)) >= 1, 'Send now stops the current answer and sends it');
// Without onQueue, Enter while streaming does nothing.
await page.evaluate(() => new Promise((done) => {
  document.body.innerHTML = '<div id="r"></div>'; window.__sent = [];
  const A = window.Altitude, h = React.createElement;
  ReactDOM.createRoot(document.getElementById('r')).render(h(A.AltitudeProvider, null, h(A.PromptInput, { status: 'streaming', onSubmit: (m) => window.__sent.push(m.text), onStop: () => {} }, h(A.PromptInputTextarea, { placeholder: 'x' }), h(A.PromptInputToolbar, null, h(A.PromptInputSubmit)))));
  setTimeout(done, 200);
}));
await box.fill('Not queued'); await box.press('Enter'); await page.waitForTimeout(100);
expect(await page.evaluate(() => window.__sent.length === 0 && document.querySelector('.alt-prompt textarea').value === 'Not queued'), 'without onQueue, Enter while streaming keeps the text and sends nothing');
console.log(`Prompt queue: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
