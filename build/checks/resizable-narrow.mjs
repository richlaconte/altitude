// ResizablePanelGroup when narrow (#265): under 480px of its own width, narrow="stack" (default) shows one panel at a
// time (narrowPanel) with the handles hidden, narrow="vertical" stacks the panes with a horizontal grip, narrow={false}
// keeps them side by side; onNarrowChange says when it switches; given room again, the panes and handles return. Run
// after a render of every preview (it opens test/p-Resizable-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
await page.goto(`file://${T}p-Resizable-daylight.html`); await page.waitForTimeout(400);
await page.evaluate(() => new Promise((done) => {
  document.body.innerHTML = ''; const d = document.createElement('div'); document.body.append(d);
  const A = window.Altitude, h = React.createElement; window.__narrow = [];
  const group = (id, props) => h('div', { id, style: { width: '320px', height: '160px' } }, h(A.ResizablePanelGroup, props,
    h(A.ResizablePanel, { 'aria-label': 'List' }, 'List'), h(A.ResizableHandle, null), h(A.ResizablePanel, { 'aria-label': 'Detail' }, 'Detail')));
  function Switch() { const [p, setP] = React.useState(0); window.__show = setP; return group('s', { narrowPanel: p, onNarrowChange: (n) => window.__narrow.push(n) }); }
  ReactDOM.createRoot(d).render(h(A.AltitudeProvider, null, h(Switch), group('v', { narrow: 'vertical' }), group('f', { narrow: false })));
  setTimeout(done, 500);
}));
const read = (sel) => page.evaluate((sel) => { const g = document.querySelector(`${sel} .alt-resizable`); return { dir: g.dataset.direction, shown: [...g.querySelectorAll('.alt-resizable-panel')].filter((p) => !p.hidden).map((p) => p.textContent), handles: g.querySelectorAll('.alt-resizable-handle').length }; }, sel);
let s = await read('#s');
expect(s.shown.join() === 'List' && s.handles === 0, `stack: one panel at a time, no handle (${JSON.stringify(s)})`);
await page.evaluate(() => window.__show(1)); await page.waitForTimeout(200);
s = await read('#s');
expect(s.shown.join() === 'Detail', `narrowPanel moves to the detail (${JSON.stringify(s)})`);
const v = await read('#v'), f = await read('#f');
expect(v.dir === 'vertical' && v.shown.length === 2 && v.handles === 1, `vertical: the panes stack with a grip (${JSON.stringify(v)})`);
expect(f.dir === 'horizontal' && f.shown.length === 2 && f.handles === 1, `narrow={false}: side by side as before (${JSON.stringify(f)})`);
await page.evaluate(() => { document.querySelector('#s').style.width = '800px'; }); await page.waitForTimeout(300);
s = await read('#s');
const said = await page.evaluate(() => window.__narrow);
expect(s.shown.length === 2 && s.handles === 1, `with room again, both panes and the handle return (${JSON.stringify(s)})`);
expect(JSON.stringify(said) === '[true,false]', `onNarrowChange says when it switches (${JSON.stringify(said)})`);
console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
