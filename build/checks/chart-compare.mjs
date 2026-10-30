// Read against the record before (#189): BarChart and LineChart's compare. Bars carry a 2px ink tick at each earlier
// value, 4px past the bar each side; lines a 1.5px solid ink-muted trace under the series, named at its end. The
// difference is said in the readout, in point names, in two table columns and in the summary; earlier values join y;
// a stack compares its total; ticks glide with the data; forced colours draw them solid CanvasText. Run after a render
// of every preview (it opens test/p-BarChart-daylight.html and p-LineChart); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const colour = (page, v) => page.evaluate((v) => { const d = document.createElement('div'); d.style.color = v; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }, v);
const open = async (name, media) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 1400 } });
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-${name}-daylight.html`);
  await page.waitForTimeout(700);
  return page;
};
const card = (page, t) => page.evaluateHandle((t) => [...document.querySelectorAll('.alt-chart')].find((f) => (f.closest('.alt-card')?.textContent ?? '').includes(t)), t);

{
  const page = await open('BarChart');
  const ink = await colour(page, 'var(--ink)');
  const seats = await card(page, 'Seats by region');
  const r = await seats.evaluate((f) => ({
    ticks: [...f.querySelectorAll('.alt-bar-compare')].map((l) => ({ cat: l.dataset.category, x: +l.getAttribute('x1'), y1: +l.getAttribute('y1'), y2: +l.getAttribute('y2'), stroke: getComputedStyle(l).stroke, w: getComputedStyle(l).strokeWidth, dash: getComputedStyle(l).strokeDasharray })),
    bars: [...f.querySelectorAll('.alt-bar-mark')].map((b) => { const bb = b.getBBox(); return { cat: b.dataset.category, x0: bb.x, x1: bb.x + bb.width, y0: bb.y, y1: bb.y + bb.height }; }),
    summary: f.querySelector('figcaption').textContent,
  }));
  expect(r.ticks.length === 4 && r.ticks.every((t) => t.stroke === ink && t.w === '2px' && t.dash === 'none'), `a 2px solid ink tick per bar (${JSON.stringify(r.ticks[0])})`);
  const na = r.ticks.find((t) => t.cat === 'North America'), nab = r.bars.find((b) => b.cat === 'North America');
  expect(na && nab && Math.abs((na.y1 + 4) - nab.y0) < 1 && Math.abs((na.y2 - 4) - nab.y1) < 1, `the tick reaches 4px past the bar on each side (${JSON.stringify(na)} ${JSON.stringify(nab)})`);
  const emea = r.ticks.find((t) => t.cat.startsWith('Europe')), emeab = r.bars.find((b) => b.cat.startsWith('Europe'));
  expect(emea.x > emeab.x1, 'a value that fell shows its tick past the bar\'s end');
  expect(/Against Q2: 3 rose, 1 fell\./.test(r.summary), `the summary counts what rose and fell: "${r.summary.slice(-40)}"`);
  // The point name says the change.
  await seats.evaluate((f) => f.querySelector('.alt-chart-node').focus());
  await page.keyboard.press('Enter');
  await page.waitForTimeout(60);
  const name = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  expect(/North America, Seats, 1,240\. Up 11% from Q2\./.test(name), `each point names its change ("${name}")`);
  await page.close();
}

{
  const page = await open('LineChart');
  const muted = await colour(page, 'var(--ink-muted)');
  const sign = await card(page, 'Daily signups');
  const r = await sign.evaluate((f) => {
    const c = f.querySelector('.alt-line-compare'), kids = [...f.querySelector('.alt-lines').children];
    return { stroke: c && getComputedStyle(c).stroke, w: c && getComputedStyle(c).strokeWidth, dash: c && getComputedStyle(c).strokeDasharray,
      under: kids.indexOf(c) < kids.indexOf(f.querySelector('.alt-line')), label: [...f.querySelectorAll('.alt-line-label[data-compare]')].map((t) => ({ t: t.textContent, fill: getComputedStyle(t).fill })) };
  });
  expect(r.stroke === muted && r.w === '1.5px' && r.dash === 'none' && r.under, `the earlier period is a 1.5px solid ink-muted trace under the line (${JSON.stringify(r)})`);
  expect(r.label.length === 1 && r.label[0].t === '2 weeks before' && r.label[0].fill === muted, `named at its end in ink-muted (${JSON.stringify(r.label)})`);
  const box = await sign.evaluate((f) => { const b = f.querySelector('.alt-chart-plot').getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
  await page.mouse.move(box.x + 6, box.y + box.h / 2);
  await page.waitForTimeout(350);
  const rows = await sign.evaluate((f) => [...f.querySelectorAll('.alt-chart-readout-row')].map((x) => x.textContent));
  expect(rows.some((t) => /38 · \+11%2 weeks before/.test(t)), `the readout adds the earlier value and the change (${rows})`);
  await page.close();
}

// Our own charts: the table's columns, y's extent, a stack's total, and the tick gliding.
{
  const page = await open('BarChart');
  await page.evaluate(() => new Promise((done) => {
    const d = document.createElement('div'); d.id = 'cm'; d.style.cssText = 'width:480px;position:absolute;top:0;left:0;z-index:9;background:#fff'; document.body.prepend(d);
    const A = window.Altitude, h = React.createElement;
    const root = ReactDOM.createRoot(d);
    window.__draw = (k) => root.render(h('div', null,
      h(A.ChartContainer, { id: 'tb', views: 'table', config: { v: { label: 'V' } } }, h(A.BarChart, { data: [{ c: 'a', v: 10, was: 8 }, { c: 'b', v: 5, was: 40 }], x: 'c', compare: { key: 'was', label: 'May' } })),
      h(A.ChartContainer, { id: 'st', config: { p: { label: 'P' }, q: { label: 'Q' } } }, h(A.BarChart, { data: [{ c: 'a', p: 3 * k, q: 2 }, { c: 'b', p: 4, q: 1 }], x: 'c', stack: true, compare: { data: [{ p: 1, q: 1 }, { p: 9, q: 9 }], label: 'Before' } }))));
    window.__draw(1);
    setTimeout(done, 500);
  }));
  const tb = await page.evaluate(() => ({ heads: [...document.querySelectorAll('#tb thead th')].map((t) => t.textContent.trim()), cells: [...document.querySelectorAll('#tb tbody tr')].map((r) => [...r.children].map((c) => c.textContent.trim())) }));
  expect(tb.heads.join('|') === 'C|V|May|vs May' && tb.cells[0].join('|') === 'a|10|8|+25%' && tb.cells[1][3] === '−88%', `the table gains the earlier value and "vs May" (${JSON.stringify(tb)})`);
  const st = await page.evaluate(() => ({ ticks: [...document.querySelectorAll('#st .alt-bar-compare')].map((l) => +l.getAttribute('y1')), y: [...document.querySelectorAll('#st [data-axis="y"] text')].map((t) => t.textContent) }));
  expect(st.ticks.length === 2 && Number(st.y.at(-1)) >= 18, `a stack is compared by its total, and the earlier 18 joins y (${JSON.stringify(st)})`);
  const before = st.ticks[0];
  await page.evaluate(() => window.__draw(9));
  const ys = [];
  for (let i = 0; i < 10; i++) { ys.push(await page.evaluate(() => +document.querySelector('#st .alt-bar-compare').getAttribute('y1'))); await page.waitForTimeout(40); }
  expect(new Set(ys.map(Math.round)).size >= 3 && ys.at(-1) !== before, `ticks glide with the data, with the rescale (${before} → ${ys.map(Math.round)})`);
  await page.close();
}

// Forced colours: CanvasText, solid.
{
  const page = await open('BarChart', { forcedColors: 'active' });
  const t = await page.evaluate(() => { const l = document.querySelector('.alt-bar-compare'); return { stroke: getComputedStyle(l).stroke, dash: getComputedStyle(l).strokeDasharray }; });
  expect(t.stroke === 'rgb(0, 0, 0)' && t.dash === 'none', `forced colours: the tick is solid CanvasText (${JSON.stringify(t)})`);
  await page.close();
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
