// ChartContainer takeaway (#187): the one thing a chart says, as its heading in text-heading ink, with the title over
// it as a caption-sized ink-muted label; the figure is named by the title and described by the takeaway, then the
// summary; a changed takeaway cross-fades; without one, nothing changes. Run after a render of every preview (it opens
// test/p-BarChart-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 900 } });
await page.goto(`file://${T}p-BarChart-daylight.html`);
await page.waitForTimeout(600);

const read = (sel) => page.evaluate((sel) => {
  const fig = document.querySelector(sel);
  const font = (e) => { if (!e) return null; const c = getComputedStyle(e); return { size: c.fontSize, weight: c.fontWeight, color: c.color, line: c.lineHeight }; };
  const colour = (v) => { const d = document.createElement('div'); d.style.color = v; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; };
  const text = (ids) => (ids ?? '').split(' ').filter(Boolean).map((id) => document.getElementById(id)?.textContent.trim());
  const head = fig.querySelector('.alt-chart-head');
  return {
    order: head ? [...head.children].map((e) => e.className) : [],
    title: font(fig.querySelector('.alt-chart-title')), takeaway: font(fig.querySelector('.alt-chart-takeaway')),
    name: text(fig.getAttribute('aria-labelledby')), described: text(fig.getAttribute('aria-describedby')),
    ink: colour('var(--ink)'), muted: colour('var(--ink-muted)'),
  };
}, sel);

// The preview's first chart leads with a takeaway.
const lead = await read('.alt-chart');
expect(lead.order.join() === 'alt-chart-title,alt-chart-takeaway,alt-chart-desc', `the head is title, takeaway, description (${lead.order})`);
expect(lead.takeaway?.size === '19px' && lead.takeaway.weight === '600' && lead.takeaway.color === lead.ink, `the takeaway is the heading: text-heading in ink (${JSON.stringify(lead.takeaway)})`);
expect(lead.title?.size === '12.5px' && lead.title.weight === '500' && lead.title.color === lead.muted, `the title over it is a caption label in ink-muted (${JSON.stringify(lead.title)})`);
expect(lead.name.join() === 'Deploys by team', `the figure is still named by its title (${lead.name})`);
expect(lead.described[0] === 'Cedar deployed nearly three times as often as Delta' && /^Cedar deployed most/.test(lead.described.at(-1) ?? ''), `it's described by the takeaway first, then the summary (${JSON.stringify(lead.described)})`);

// A changed takeaway cross-fades: old and new words share the spot, the old one aria-hidden, then only the new.
await page.evaluate(() => new Promise((done) => {
  const d = document.createElement('div'); d.id = 'mount'; d.style.cssText = 'width:420px'; document.body.prepend(d);
  const A = window.Altitude, h = React.createElement, rows = [{ k: 'a', v: 3 }, { k: 'b', v: 5 }];
  const root = ReactDOM.createRoot(d);
  const draw = (takeaway) => root.render(h(A.ChartContainer, { id: 'tk', title: 'Plain', takeaway, config: { v: { label: 'V' } } }, h(A.BarChart, { data: rows, x: 'k' })));
  window.__draw = draw; draw('B leads A'); setTimeout(() => done(true), 400);
}));
await page.evaluate(() => window.__draw('A catches up'));
await page.waitForTimeout(60);
const mid = await page.evaluate(() => [...document.querySelectorAll('#tk .alt-chart-takeaway-text')].map((e) => ({ t: e.textContent, out: e.hasAttribute('data-out'), hidden: e.getAttribute('aria-hidden'), anim: getComputedStyle(e).animationName })));
expect(mid.length === 2 && mid.some((m) => m.t === 'A catches up' && !m.out && m.anim === 'alt-stat-in') && mid.some((m) => m.t === 'B leads A' && m.out && m.hidden === 'true'), `a changed takeaway cross-fades (${JSON.stringify(mid)})`);
await page.waitForTimeout(500);
const after = await page.evaluate(() => [...document.querySelectorAll('#tk .alt-chart-takeaway-text')].map((e) => e.textContent));
expect(after.join() === 'A catches up', `then only the new words remain (${after})`);

// Without a takeaway, nothing changes: the title is the 15px heading and describedby skips it.
await page.evaluate(() => { document.getElementById('mount').remove(); });
await page.evaluate(() => new Promise((done) => {
  const d = document.createElement('div'); d.id = 'mount2'; d.style.cssText = 'width:420px'; document.body.prepend(d);
  const A = window.Altitude, h = React.createElement;
  ReactDOM.createRoot(d).render(h(A.ChartContainer, { id: 'pl', title: 'Plain', config: { v: { label: 'V' } } }, h(A.BarChart, { data: [{ k: 'a', v: 3 }], x: 'k' })));
  setTimeout(() => done(true), 300);
}));
const bare = await read('#pl');
expect(bare.title?.size === '15px' && bare.title.weight === '600' && bare.title.color === bare.ink && bare.described.length === 1, `without one the title is the heading, as before (${JSON.stringify(bare.title)}, ${bare.described.length})`);

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
