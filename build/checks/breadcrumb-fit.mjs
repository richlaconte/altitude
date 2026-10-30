// Breadcrumb fits its width (#263): with fit="collapse" (default) a trail that doesn't fit on one line moves steps from
// the second onward behind "…" until it does, always keeping the first step and the current page; given room again it
// shows every step; fit="wrap" wraps as before. Run after a render of every preview (it opens
// test/p-Breadcrumb-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-Breadcrumb-daylight.html`); await page.waitForTimeout(400);
await page.evaluate(() => new Promise((done) => {
  document.body.innerHTML = ''; const d = document.createElement('div'); document.body.append(d);
  const A = window.Altitude, h = React.createElement;
  const items = ['Workspace', 'Projects', 'Website refresh', 'Design', 'Reviews', 'Homepage hero'].map((label, i, a) => ({ label, href: i < a.length - 1 ? '#' : undefined }));
  ReactDOM.createRoot(d).render(h(A.AltitudeProvider, null,
    h('div', { id: 'c', style: { width: '320px' } }, h(A.Breadcrumb, { items })),
    h('div', { id: 'w', style: { width: '320px' } }, h(A.Breadcrumb, { items, fit: 'wrap' }))));
  setTimeout(done, 500);
}));
const read = (sel) => page.evaluate((sel) => { const lis = [...document.querySelectorAll(`${sel} nav > ol > li`)]; return { n: lis.length, lines: new Set(lis.map((l) => l.offsetTop)).size, text: lis.map((l) => l.textContent.trim()) }; }, sel);
let r = await read('#c');
expect(r.lines === 1 && r.text[0] === 'Workspace' && r.text.at(-1) === 'Homepage hero' && r.text.includes('…') && r.n < 6, `in 320px the trail collapses to one line, keeping the first step and the current page (${JSON.stringify(r)})`);
const w = await read('#w');
expect(w.n === 6 && w.lines > 1, `fit="wrap" wraps as before (${JSON.stringify(w)})`);
await page.evaluate(() => { document.querySelector('#c').style.width = '900px'; }); await page.waitForTimeout(400);
r = await read('#c');
expect(r.n === 6 && r.lines === 1, `with room again, every step is back (${JSON.stringify(r)})`);
console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
