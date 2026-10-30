// Changed since a snapshot (#191): ChartContainer's since matches records by x (or id); a changed bar carries a tick
// at its old value and a changed line point a hollow ink-muted ring; the frame says "3 changed since …" in a switch
// that recedes the rest to 35%; up to four changed marks get the afterglow on arrival, more and the caption takes it;
// point names, the readout, the table and the summary say what changed. Run after a render of every preview (it opens
// test/p-ChartSince-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 900 } });
await page.goto(`file://${T}p-ChartSince-daylight.html`);
await page.waitForTimeout(700);
const colour = (v) => page.evaluate((v) => { const d = document.createElement('div'); d.style.color = v; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }, v);

const read = () => page.evaluate(() => [...document.querySelectorAll('.alt-chart')].map((f) => ({
  ticks: [...f.querySelectorAll('.alt-bar-compare[data-since]')].map((l) => ({ cat: l.dataset.category, y: +l.getAttribute('y1') })),
  rings: [...f.querySelectorAll('.alt-line-since')].map((c) => ({ stroke: getComputedStyle(c).stroke, fill: getComputedStyle(c).fill, r: +c.getAttribute('r') })),
  glows: f.querySelectorAll('.alt-chart-glows > *').length,
  caption: f.querySelector('.alt-chart-since')?.textContent ?? null,
  captionTint: f.querySelector('.alt-chart-since')?.hasAttribute('data-settle') ?? false,
  summary: f.querySelector('figcaption').textContent,
  miss: [...f.querySelectorAll('.alt-chart-rel[data-miss]')].length,
})));

let [q, e] = await read();
const muted = await colour('var(--ink-muted)');
expect(q.ticks.map((t) => t.cat).sort().join() === 'Billing,Imports,Webhooks', `a tick at each changed bar's old value (${q.ticks.map((t) => t.cat)})`);
expect(e.rings.length === 6 && e.rings.every((r) => r.stroke === muted && r.r === 3.5), `a hollow ink-muted ring at each changed point's old place (${e.rings.length})`);
expect(q.caption === '3 changed since Tuesday 09:00' && e.caption === '6 changed since 11:00', `the frame says how many changed (${q.caption}; ${e.caption})`);
expect(q.glows > 0 && e.glows === 0 && e.captionTint, `four or fewer changed marks glow on arrival; more, and the caption does (${q.glows}, ${e.glows}, ${e.captionTint})`);
expect(/3 of 8 changed since Tuesday 09:00, most of all Webhooks, up 75%\./.test(q.summary), `the summary says what changed most ("${q.summary.slice(-70)}")`);

// The switch shows only what changed: the rest recede where they stand.
await page.locator('.alt-chart-since [role="switch"]').first().click();
await page.waitForTimeout(400);
[q] = await read();
const op = await page.evaluate(() => getComputedStyle(document.querySelector('.alt-chart .alt-chart-rel[data-miss]')).opacity);
expect(q.miss >= 5 && op === '0.35', `"only what changed" recedes the other bars to 35% (${q.miss}, ${op})`);
await page.locator('.alt-chart-since [role="switch"]').first().click();
await page.waitForTimeout(400);

// Point names, the readout and the table say the change.
await page.locator('.alt-chart').first().locator('.alt-chart-node').focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(60);
const name = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
expect(/^Billing, Jobs waiting, 42\. Up 40% since Tuesday 09:00\./.test(name), `a changed point names its change ("${name}")`);
await page.keyboard.press('ArrowRight');
const unchanged = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
expect(!/since/.test(unchanged), `an unchanged one doesn't ("${unchanged}")`);
const rows = await page.evaluate(() => [...document.querySelector('.alt-chart').querySelectorAll('.alt-chart-readout-row')].map((r) => r.textContent));
expect(rows.length === 1, `the readout on an unchanged bar has no since row (${rows})`);
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(80);
const rows2 = await page.evaluate(() => [...document.querySelector('.alt-chart').querySelectorAll('.alt-chart-readout-row')].map((r) => r.textContent));
expect(rows2.some((r) => /30 · \+40%Since Tuesday 09:00/.test(r)), `on a changed bar it adds the old value and the change (${rows2})`);

// Our own: a table view, a new record, and nothing changed.
await page.evaluate(() => new Promise((done) => {
  const d = document.createElement('div'); d.id = 'sn'; d.style.cssText = 'width:440px;position:absolute;top:0;left:0;z-index:9;background:#fff'; document.body.prepend(d);
  const A = window.Altitude, h = React.createElement;
  ReactDOM.createRoot(d).render(h('div', null,
    h(A.ChartContainer, { id: 'tb', views: 'table', config: { v: { label: 'V' } }, since: { data: [{ k: 'a', v: 4 }, { k: 'b', v: 5 }], label: 'since Monday' } }, h(A.BarChart, { data: [{ k: 'a', v: 6 }, { k: 'b', v: 5 }, { k: 'c', v: 2 }], x: 'k' })),
    h(A.ChartContainer, { id: 'same', config: { v: { label: 'V' } }, since: { data: [{ k: 'a', v: 4 }], label: 'since Monday' } }, h(A.BarChart, { data: [{ k: 'a', v: 4 }], x: 'k' }))));
  setTimeout(done, 450);
}));
const tb = await page.evaluate(() => ({ heads: [...document.querySelectorAll('#tb thead th')].map((t) => t.textContent.trim()), cells: [...document.querySelectorAll('#tb tbody tr')].map((r) => r.lastElementChild.textContent.trim()), cap: document.querySelector('#tb .alt-chart-since').textContent }));
expect(tb.heads.at(-1) === 'Since Monday' && tb.cells.join('|') === '+50%|No change|New' && tb.cap === '2 changed since Monday', `the table says each change, a new record counts (${JSON.stringify(tb)})`);
const same = await page.evaluate(() => ({ cap: document.querySelector('#same .alt-chart-since').textContent, sw: !!document.querySelector('#same .alt-chart-since [role="switch"]'), sum: document.querySelector('#same figcaption').textContent }));
expect(same.cap === 'Nothing changed since Monday' && !same.sw && /Nothing changed since Monday\./.test(same.sum), `with nothing changed it says so, with no switch (${JSON.stringify(same)})`);

// Forced colours: rings and ticks in CanvasText.
{
  const fp = await browser.newPage({ viewport: { width: 960, height: 900 } });
  await fp.emulateMedia({ forcedColors: 'active' });
  await fp.goto(`file://${T}p-ChartSince-daylight.html`);
  await fp.waitForTimeout(600);
  const f = await fp.evaluate(() => ({ ring: getComputedStyle(document.querySelector('.alt-line-since')).stroke, tick: getComputedStyle(document.querySelector('.alt-bar-compare')).stroke }));
  expect(f.ring === 'rgb(0, 0, 0)' && f.tick === 'rgb(0, 0, 0)', `forced colours: CanvasText (${JSON.stringify(f)})`);
  await fp.close();
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
