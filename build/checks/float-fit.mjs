// Floating panels on screen (#248): Tooltip, Popover, DropdownMenu and HoverCard, anchored at a 360px screen's right
// and left edges, open inside it with 8px to spare, shifted sideways on top of their own placement, and capped at the
// viewport's width. Run after a render of every preview (it opens test/p-Popover-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
await page.goto(`file://${T}p-Popover-daylight.html`); await page.waitForTimeout(400);
const out = await page.evaluate(() => new Promise((done) => {
  document.body.innerHTML = ''; const d = document.createElement('div'); document.body.append(d);
  const A = window.Altitude, h = React.createElement, btn = (t) => h(A.Button, { size: 'sm' }, t);
  const row = (justify, kids) => h('div', { style: { display: 'flex', justifyContent: justify, padding: '0 2px', margin: '0 0 220px' } }, kids);
  const items = [{ label: 'Rename everything in this project at once' }, { label: 'Duplicate' }];
  ReactDOM.createRoot(d).render(h(A.AltitudeProvider, null,
    row('flex-end', h(A.Popover, { trigger: btn('P'), defaultOpen: true, 'aria-label': 'Share' }, h('p', { style: { margin: 0 } }, 'A popover whose text is long enough to need the room it is given.'))),
    row('flex-end', h(A.DropdownMenu, { trigger: btn('M'), items, defaultOpen: true })),
    row('flex-end', h(A.HoverCard, { trigger: h('a', { href: '#' }, 'Card'), defaultOpen: true }, h('p', { style: { margin: 0, width: 280 } }, 'A hover card'))),
    row('flex-start', h(A.Tooltip, { content: 'A tooltip that says rather a lot about the button', defaultOpen: true }, btn('T'))),
    row('flex-start', h(A.Popover, { trigger: btn('C'), defaultOpen: true, align: 'center', 'aria-label': 'Centred' }, 'Centred on a button at the left edge'))));
  setTimeout(() => done([...document.querySelectorAll('.alt-pop, .alt-tip')].map((e) => { const r = e.getBoundingClientRect(); return { k: e.className.split(' ').slice(0, 2).join('.'), l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width) }; })), 700);
}));
expect(out.length === 5, `five panels open (${out.length})`);
for (const p of out) expect(p.l >= 7.5 && p.r <= 360 - 7.5 && p.w <= 344, `${p.k} stays 8px inside a 360px screen (${p.l}–${p.r})`);
console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
