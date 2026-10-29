// SyncIndicator: a flush Badge plate (no lift at rest) saying the state in words with a lamp; saving pulses and isn't
// announced; "Saved" is announced but not again within announceEvery; offline counts waiting changes, is announced at
// once, and the plate opens a queue of pending (hovering) items and lifts on hover; failed offers Retry; conflict
// offers Resolve. Run after a render of every preview (it opens test/p-SyncIndicator-daylight.html); exits non-zero on
// a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-SyncIndicator-daylight.html`);
await page.waitForTimeout(400);

const read = () => page.evaluate(() => {
  const s = document.querySelector('.alt-sync'), plate = s.querySelector('.alt-sync-plate');
  return { state: s.dataset.state, text: plate.textContent, tone: plate.getAttribute('data-tone'), pulse: plate.querySelector('.alt-badge-lamp')?.hasAttribute('data-pulse'), shadow: getComputedStyle(plate).boxShadow,
    said: s.querySelector('[role="status"]').textContent, buttons: [...s.querySelectorAll(':scope > .alt-btn')].map((b) => b.textContent), opener: !!s.querySelector('.alt-sync-button') };
});
let r = await read();
expect(r.state === 'saved' && r.text.startsWith('Saved · ') && r.tone === 'positive' && !r.opener, `saved: words, time, a positive lamp (${r.text})`);
await page.fill('textarea', 'A change');
await page.waitForTimeout(100);
r = await read();
expect(r.state === 'saving' && r.text === 'Saving…' && r.pulse, 'saving pulses its lamp');
expect(r.said === 'Saved' || r.said === '', `saving isn't announced (${r.said})`);
await page.waitForTimeout(900);
r = await read();
expect(r.state === 'saved' && r.said === 'Saved', `saved is announced (${r.said})`);
await page.evaluate(() => { document.querySelector('.alt-sync [role="status"]').textContent = ''; });
await page.fill('textarea', 'Another change');
await page.waitForTimeout(1000);
expect((await read()).said === '', 'and not again within announceEvery');

await page.click('.alt-switch');
await page.fill('textarea', 'Offline 1');
await page.fill('textarea', 'Offline 2');
await page.waitForTimeout(150);
r = await read();
expect(r.state === 'offline' && r.text === 'Offline · 2 changes waiting' && r.tone === 'caution' && r.said.startsWith('Offline'), `offline counts waiting changes and says so at once, without repeating each new count (${r.text})`);
const btn = page.locator('.alt-sync-button');
expect(await btn.getAttribute('aria-label') === 'Offline · 2 changes waiting. Show changes', 'the plate opens the queue and says so');
await btn.hover();
await page.waitForTimeout(250);
expect(await btn.evaluate((b) => getComputedStyle(b).boxShadow) !== 'none', 'it lifts when pointed at, because it acts');
await btn.click();
await page.waitForTimeout(400);
const queue = await page.evaluate(() => [...document.querySelectorAll('.alt-sync-queue [data-status]')].map((x) => x.getAttribute('data-status')));
expect(queue.length === 2 && queue.every((s) => s === 'pending'), `the queue's items hover as pending (${queue})`);
await page.keyboard.press('Escape');
await page.click('.alt-switch');
await page.waitForTimeout(900);

await page.click('button:has-text("Make a save fail")');
await page.waitForTimeout(100);
r = await read();
expect(r.text === "Couldn't sync" && r.tone === 'critical' && r.buttons.includes('Retry'), 'failed: a critical lamp and Retry');
await page.click('.alt-sync >> button:has-text("Retry")');
await page.waitForTimeout(900);
expect((await read()).state === 'saved', 'Retry saves');
await page.click('button:has-text("Cause a conflict")');
await page.waitForTimeout(100);
r = await read();
expect(r.text === '1 conflict to resolve' && r.buttons.includes('Resolve'), 'conflict: in words, with Resolve');

console.log(`SyncIndicator: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
