// RemovalReceipt (#505): removing a webhook in the preview shows the receipt in its slot, holds it, lifts it off and
// glides the gap shut, with no frame where something reappears or snaps. Sampled every animation frame: the pending
// plate fades back to the ground when the write lands (never drops in one frame), the note and Undo have faded out before
// the slot starts to close, the slot only ever shrinks while closing, and the row is gone at the end. Run after a render
// of every preview (it opens test/p-RemovalReceipt-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`file://${T}p-RemovalReceipt-daylight.html`);
await page.waitForTimeout(400);

await page.click('[aria-label="Remove Billing events"]');
// Away from the list, so the hold isn't paused by a pointer resting on it.
await page.mouse.move(900, 880);
const log = await page.evaluate(() => new Promise((resolve) => {
  const slot = [...document.querySelectorAll('.alt-receipt')][1], out = [], t0 = performance.now();
  const frame = () => {
    const note = slot.querySelector('.alt-receipt-note'), act = slot.querySelector('.alt-receipt-action');
    const bg = getComputedStyle(slot).backgroundColor.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0];
    out.push({ t: performance.now() - t0, connected: slot.isConnected, h: slot.getBoundingClientRect().height, alpha: bg.length > 3 ? bg[3] : 1,
      note: note ? +getComputedStyle(note).opacity : 0, act: act ? +getComputedStyle(act).opacity : 0, leaving: slot.hasAttribute('data-leaving') });
    if (slot.isConnected && performance.now() - t0 < 8000) requestAnimationFrame(frame); else resolve(out);
  };
  requestAnimationFrame(frame);
}));

const live = log.filter((f) => f.connected);
let biggestDrop = 0;
for (let i = 1; i < live.length; i++) biggestDrop = Math.max(biggestDrop, live[i - 1].alpha - live[i].alpha);
expect(live.some((f) => f.alpha > 0.5), 'the pending receipt shows a plate once dur-grace has passed');
expect(biggestDrop < 0.5, `the pending plate fades back to the ground, not in one frame (largest drop ${biggestDrop.toFixed(2)})`);
const full = live.find((f) => !f.leaving)?.h ?? 0;
const closing = live.filter((f) => f.leaving && f.h < full - 0.5);
expect(closing.length > 0 && closing.every((f) => f.note < 0.02 && f.act < 0.02), 'the note and Undo have lifted off before the gap starts to close');
let grew = false;
for (let i = 1; i < closing.length; i++) if (closing[i].h > closing[i - 1].h + 0.5) grew = true;
expect(!grew, 'the gap only closes: the slot never grows back while closing');
expect(log.at(-1).connected === false, 'the row is gone once the gap has closed');
expect(!errors.length, `no page errors (${errors.join('; ')})`);

console.log(`RemovalReceipt: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
