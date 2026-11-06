// By ear (#538): Play plays the series as pitch over time (asserted through an AudioContext stub), the playhead is the
// crosshair, a gap is silence, it's narrated in a polite live region (range, then extremes, then trend), Play becomes
// Stop and back, Space on the summary plays, Escape stops, an arrow while playing scrubs with a tone per point, and
// nothing plays on load. Run after a render of every preview (it opens test/p-ChartByEar-daylight.html); exits
// non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
// A stub that records what would be heard: each context, each oscillator's frequencies and each gain's levels.
await page.addInitScript(() => {
  const log = (window.__audio = { contexts: 0, oscillators: [], closed: 0 });
  const param = (into) => ({ setValueAtTime: (v, t) => into.push([v, t]), cancelScheduledValues() {} });
  class Ctx {
    constructor() { log.contexts++; this.currentTime = 0; this.destination = {}; }
    createOscillator() { const o = { type: 'sine', freqs: [], started: false, connect() {}, start() { o.started = true; }, stop() {} }; o.frequency = param(o.freqs); log.oscillators.push(o); return o; }
    createGain() { const g = { levels: [], connect() {} }; g.gain = param(g.levels); return g; }
    close() { log.closed++; return Promise.resolve(); }
  }
  window.AudioContext = Ctx;
});
await page.goto(`file://${T}p-ChartByEar-daylight.html`);
await page.waitForTimeout(700);
const said = () => page.evaluate(() => [...document.querySelectorAll('.alt-chart .alt-sr[aria-live="polite"]')].map((n) => n.textContent).join(' | '));
const audio = () => page.evaluate(() => ({ contexts: window.__audio.contexts, tones: window.__audio.oscillators.filter((o) => o.type === 'sine').map((o) => o.freqs.length), clicks: window.__audio.oscillators.filter((o) => o.type === 'square').length }));

expect((await audio()).contexts === 0, 'nothing plays on load');
const play = page.getByRole('button', { name: 'Play' });
expect(await play.count() === 1, 'a Play button in the frame');
await play.click();
await page.waitForTimeout(150);
let a = await audio();
expect(a.contexts === 1 && a.tones[0] === 45, `one tone per value, gaps silent (${a.tones[0]} of 48, 3 missing)`);
expect(a.clicks >= 2, `gridline crossings click (${a.clicks})`);
expect(await page.getByRole('button', { name: 'Stop' }).count() === 1, 'Play becomes Stop');
expect(/^Playing Error rate, 0\.\d% to 3\.0%, 48 points\./.test(await said()), `narrated first (${await said()})`);
const head = await page.evaluate(() => !!document.querySelector('.alt-chart-crosshair[data-play]'));
expect(head, 'the playhead is the crosshair');
await page.waitForTimeout(2200);
expect(/Highest, 3\.0%/.test(await said()) || /Lowest/.test(await said()), `the extremes as they pass (${await said()})`);
await page.waitForTimeout(1400);
expect(/Ended\. Error rate ends where it began, at 0\.4%\./.test(await said()), `the trend after (${await said()})`);
expect(await page.getByRole('button', { name: 'Play' }).count() === 1, 'Stop becomes Play again at the end');

// Space on the summary plays; Escape stops.
await page.locator('.alt-chart-node').first().focus();
await page.keyboard.press(' ');
await page.waitForTimeout(150);
expect((await audio()).contexts === 2 && await page.getByRole('button', { name: 'Stop' }).count() === 1, 'Space on the summary plays');
await page.keyboard.press('Escape');
await page.waitForTimeout(100);
expect(/Stopped\./.test(await said()) && await page.getByRole('button', { name: 'Play' }).count() === 1, 'Escape stops');
expect(!(await page.evaluate(() => !!document.querySelector('.alt-chart-crosshair[data-play]'))), 'the playhead goes when stopped');

// Into the points, play from there, then an arrow scrubs with a tone per step.
await page.keyboard.press('Enter');
await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
await page.getByRole('button', { name: 'Play' }).click();
await page.waitForTimeout(100);
a = await audio();
expect(a.tones[a.tones.length - 1] === 43, `playing starts from the focused point (${a.tones[a.tones.length - 1]} tones from point 3)`);
await page.locator('.alt-chart-node[data-current]').focus();
const before = (await audio()).contexts;
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(100);
expect(await page.getByRole('button', { name: 'Play' }).count() === 1, 'an arrow while playing stops');
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(100);
expect((await audio()).contexts >= before + 2, 'scrubbing: each step plays its tone');
expect(errors.length === 0, `no page errors (${errors.join(' | ')})`);
await browser.close();
console.log(`chart by ear: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
