// Tooltip keeps its child's own description (#579): a control with aria-describedby keeps it while the tooltip is
// closed, gains the tip's id (once) while it's open, and gets back exactly its own list on Escape or blur. A child with
// no description of its own has none while closed and only the tip's while open. Run after a render of the Tooltip
// preview (it opens test/p-Tooltip-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-Tooltip-daylight.html`); await page.waitForTimeout(400);
await page.evaluate(() => new Promise((done) => {
  document.body.innerHTML = ''; const d = document.createElement('div'); document.body.append(d);
  const A = window.Altitude, h = React.createElement;
  ReactDOM.createRoot(d).render(h(A.AltitudeProvider, null,
    h('p', { id: 'account-help' }, 'Permanent account help'),
    h('p', { id: 'account-error' }, 'Account locked'),
    h('div', { style: { padding: 60, display: 'flex', gap: 24 } },
      h(A.Tooltip, { content: 'Extra detail' }, h(A.Button, { id: 'account-button', 'aria-describedby': 'account-help account-error' }, 'Read account')),
      h(A.Tooltip, { content: 'Plain hint' }, h(A.Button, { id: 'plain-button' }, 'Plain')))));
  setTimeout(done, 300);
}));
const attr = (sel) => page.evaluate((s) => document.querySelector(s).getAttribute('aria-describedby'), sel);
const tipId = () => page.evaluate(() => document.querySelector('.alt-tip')?.id ?? null);

let v = await attr('#account-button');
expect(v === 'account-help account-error', `closed: the child's own description stays (${v})`);
await page.focus('#account-button'); await page.waitForTimeout(250);
const id = await tipId();
v = await attr('#account-button');
expect(id && v === `account-help account-error ${id}`, `open: its own ids then the tip's (${v}, tip ${id})`);
expect(v && new Set(v.split(' ')).size === v.split(' ').length, `open: no id repeated (${v})`);
await page.keyboard.press('Escape'); await page.waitForTimeout(250);
v = await attr('#account-button');
expect(v === 'account-help account-error', `Escape: exactly its own list again (${v})`);
await page.focus('#plain-button'); await page.waitForTimeout(250);
v = await attr('#account-button');
expect(v === 'account-help account-error', `blur: exactly its own list again (${v})`);

v = await attr('#plain-button');
const pid = await tipId();
expect(pid && v === pid, `no description of its own: only the tip's while open (${v}, tip ${pid})`);
await page.focus('#account-button'); await page.waitForTimeout(250);
v = await attr('#plain-button');
expect(v === null, `no description of its own: none while closed (${v})`);

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
