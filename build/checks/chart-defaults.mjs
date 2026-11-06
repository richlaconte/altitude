// AltitudeProvider charts (#539): chart defaults set once for an app. directLabels="auto" names grouped bars over their
// first group where each name clears the bars beside it (never on a mark), names a stack's last segments to its right,
// keeps every line's end label, and drops a legend that only labels once every series is named, while a legend you
// toggle stays; a chart's own prop wins; aspect="banked" banks line charts only; the readout takes the provider's
// indicator; a nested provider overrides key by key; without the setting nothing changes. Run after a render of every
// preview (it opens test/p-ChartDefaults-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 1400 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
await page.goto(`file://${T}p-ChartDefaults-daylight.html`);
await page.waitForTimeout(700);

const figs = await page.evaluate(() => [...document.querySelectorAll('.alt-chart')].map((f) => ({
  names: [...f.querySelectorAll('.alt-bar-name')].map((t) => t.textContent),
  ends: f.querySelectorAll('.alt-line-label, .alt-line-end-label, text.alt-line-name').length,
  legend: !!f.querySelector('.alt-chart-legend'),
  inline: f.querySelector('[data-axis="y"]')?.hasAttribute('data-inline') ?? false,
})));
expect(figs[0].names.join() === 'Web,iOS,Android' && !figs[0].legend, `grouped: the first group's bars named, the legend gone (${JSON.stringify(figs[0])})`);
expect(figs[1].names.join() === 'Web,iOS,Android' && !figs[1].legend, `stacked: the last stack named, the legend gone (${JSON.stringify(figs[1])})`);
expect(figs[2].legend, 'a legend you toggle stays');
expect(figs[0].inline && figs[1].inline && figs[2].inline, 'the provider\'s inline y labels reach every chart');
expect(figs[3].names.length === 0 && figs[3].legend && !figs[3].inline, `a chart's own props win (${JSON.stringify(figs[3])})`);

// Names never sit on a mark, nor on each other, and stay inside the plot.
const clash = await page.evaluate(() => {
  const out = [];
  for (const f of [...document.querySelectorAll('.alt-chart')].slice(0, 2)) {
    const plot = f.querySelector('.alt-chart-plot').getBoundingClientRect();
    const names = [...f.querySelectorAll('.alt-bar-name')].map((t) => ({ t: t.textContent, r: t.getBoundingClientRect() }));
    const bars = [...f.querySelectorAll('.alt-bar-mark')].map((b) => b.getBoundingClientRect());
    const hit = (a, b) => a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
    for (const n of names) {
      if (bars.some((b) => hit(n.r, b))) out.push(`${n.t} on a bar`);
      if (names.some((m) => m !== n && hit(n.r, m.r))) out.push(`${n.t} on a name`);
      if (n.r.left < plot.left || n.r.right > plot.right) out.push(`${n.t} outside the plot`);
    }
  }
  return out;
});
expect(clash.length === 0, `names never cover a bar or each other, and stay in the plot (${clash})`);
const ink = await page.evaluate(() => { const t = document.querySelector('.alt-bar-name'); const d = document.createElement('div'); d.style.color = 'var(--ink)'; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return [getComputedStyle(t).fill, c]; });
expect(ink[0] === ink[1], `names are ink, never a series colour (${ink})`);

// In-page: banking, the indicator, nesting, and nothing without the setting.
const more = await page.evaluate(() => new Promise((done) => {
  const A = window.Altitude, h = React.createElement, el = document.createElement('div');
  el.style.cssText = 'width:600px'; document.body.append(el);
  const days = Array.from({ length: 12 }, (_, i) => ({ d: `2026-01-${String(i + 1).padStart(2, '0')}`, a: 10 + (i % 3) * 30, b: 20 + i }));
  const cfg = { a: { label: 'A' }, b: { label: 'B' } };
  const line = (id, extra = {}) => h(A.ChartContainer, { title: id, 'data-id': id, config: cfg, ...extra }, h(A.LineChart, { data: days, x: 'd' }));
  const bars = (id) => h(A.ChartContainer, { title: id, 'data-id': id, config: cfg }, h(A.BarChart, { data: days.slice(0, 3), x: 'd' }, h(A.ChartLegend)));
  ReactDOM.createRoot(el).render(h('div', null,
    h(A.AltitudeProvider, { charts: { aspect: 'banked', indicator: 'dot', directLabels: 'auto' } },
      line('banked'), bars('bars-banked'), line('fixed', { aspect: 2 }),
      h(A.AltitudeProvider, { charts: { directLabels: false } }, bars('nested'))),
    bars('plain')));
  setTimeout(() => {
    const fig = (id) => el.querySelector(`[data-id="${id}"]`);
    const ratio = (id) => { const p = fig(id).querySelector('.alt-chart-plot'); return p.clientWidth / p.clientHeight; };
    const r = { banked: ratio('banked'), barsRatio: ratio('bars-banked'), fixed: ratio('fixed'),
      nested: fig('nested').querySelectorAll('.alt-bar-name').length, nestedLegend: !!fig('nested').querySelector('.alt-chart-legend'),
      plain: fig('plain').querySelectorAll('.alt-bar-name').length, plainLegend: !!fig('plain').querySelector('.alt-chart-legend') };
    // Point at the banked line to read the indicator.
    const plot = fig('banked').querySelector('.alt-chart-plot'), b = plot.getBoundingClientRect();
    plot.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: b.left + b.width / 2, clientY: b.top + b.height / 2, pointerType: 'mouse' }));
    setTimeout(() => { r.dot = !!fig('banked').querySelector('.alt-chart-readout .alt-chart-readout-key circle'); r.readout = fig('banked').querySelector('.alt-chart-readout')?.innerHTML.slice(0, 300); done(r); }, 300);
  }, 600);
}));
expect(Math.abs(more.banked - 2) > 0.05 && Math.abs(more.barsRatio - 2) < 0.05 && Math.abs(more.fixed - 2) < 0.05, `banked applies to line charts only, and a chart's aspect wins (${more.banked.toFixed(2)}, ${more.barsRatio.toFixed(2)}, ${more.fixed.toFixed(2)})`);
expect(more.nested === 0 && more.nestedLegend, `a nested provider overrides a key (${more.nested}, ${more.nestedLegend})`);
expect(more.plain === 0 && more.plainLegend, 'without the setting, nothing changes');
expect(more.dot, `the readout takes the provider's indicator (${more.readout})`);
expect(errors.length === 0, `no errors or warnings (${errors.join(' | ')})`);

// Forced colours: names are CanvasText.
{
  const p2 = await browser.newPage({ viewport: { width: 960, height: 1400 } });
  await p2.emulateMedia({ forcedColors: 'active' });
  await p2.goto(`file://${T}p-ChartDefaults-daylight.html`);
  await p2.waitForTimeout(500);
  const f = await p2.evaluate(() => { const t = document.querySelector('.alt-bar-name'); return t ? getComputedStyle(t).fill : null; });
  expect(f === 'rgb(0, 0, 0)' || f === 'rgb(255, 255, 255)', `under forced colours names are CanvasText (${f})`);
}
await browser.close();
console.log(`chart-defaults: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
