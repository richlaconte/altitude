// Stepper orientation="auto" (#264): horizontal when every step fits on one line in its container, vertical when not,
// and back to horizontal when there's room again; 'horizontal' and 'vertical' are unchanged. Run after a render of
// every preview (it opens test/p-Stepper-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
await page.goto(`file://${T}p-Stepper-daylight.html`); await page.waitForTimeout(400);
await page.evaluate(() => new Promise((done) => {
  document.body.innerHTML = ''; const d = document.createElement('div'); document.body.append(d);
  const A = window.Altitude, h = React.createElement, steps = ['Account', 'Workspace', 'Invite team', 'Billing', 'Launch'].map((label) => ({ label }));
  ReactDOM.createRoot(d).render(h(A.AltitudeProvider, null,
    h('div', { id: 'a', style: { width: '900px' } }, h(A.Stepper, { steps, current: 2, orientation: 'auto' })),
    h('div', { id: 'h', style: { width: '320px' } }, h(A.Stepper, { steps, current: 2 }))));
  setTimeout(done, 500);
}));
const o = (sel) => page.evaluate((sel) => document.querySelector(`${sel} .alt-stepper`).dataset.orientation, sel);
expect(await o('#a') === 'horizontal', 'with room, auto lays the steps out in a row');
await page.evaluate(() => { document.querySelector('#a').style.width = '320px'; }); await page.waitForTimeout(400);
expect(await o('#a') === 'vertical', 'narrow, auto lays them out down the page');
await page.evaluate(() => { document.querySelector('#a').style.width = '900px'; }); await page.waitForTimeout(400);
expect(await o('#a') === 'horizontal', 'with room again, back to a row');
expect(await o('#h') === 'horizontal', "the default, 'horizontal', is unchanged");
console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
