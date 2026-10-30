// ChartContainer axis text (#193): tick labels are captions in weight 400, ink-muted, tabular; yLabels="inline" sets
// each y label just above its gridline at the plot's left on a halo, so the plot runs the full width, with the unit on
// the top label only, no label over a line, and the ground line unlabelled; the default gutter is unchanged; forced
// colours keep CanvasText on Canvas. Prints the plot width gained at 960 and 360. Run after a render of every preview
// (it opens test/p-LineChart-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

const read = (page) => page.evaluate(() => [...document.querySelectorAll('.alt-chart')].map((fig) => {
  const plot = fig.querySelector('.alt-chart-plot'), g = plot.querySelector('.alt-chart-svg > g');
  const ax = plot.querySelector('[data-axis="y"]'), t = ax?.querySelector('text');
  const cs = t && getComputedStyle(t);
  const pts = [...plot.querySelectorAll('.alt-line-stroke')].flatMap((path) => {
    const n = path.getTotalLength(), m = path.getScreenCTM(), out = [];
    for (let l = 0; l <= n; l += 2) { const p = path.getPointAtLength(l); out.push([m.a * p.x + m.c * p.y + m.e, m.b * p.x + m.d * p.y + m.f]); }
    return out;
  });
  const labels = [...(ax?.querySelectorAll('text') ?? [])].map((e) => ({ text: e.textContent, r: e.getBoundingClientRect() }));
  return {
    inline: ax?.hasAttribute('data-inline') ?? false,
    left: g ? +/translate\(([\d.]+)/.exec(g.getAttribute('transform'))[1] : null,
    plotW: plot.getBoundingClientRect().width,
    font: cs && { size: cs.fontSize, weight: cs.fontWeight, fill: cs.fill, nums: cs.fontVariantNumeric, stroke: cs.stroke, sw: cs.strokeWidth },
    labels: labels.map((l) => l.text),
    over: labels.filter(({ r }) => pts.some(([x, y]) => x > r.left && x < r.right && y > r.top && y < r.bottom)).map((l) => l.text),
  };
}));
const colour = (page, v) => page.evaluate((v) => { const d = document.createElement('div'); d.style.color = v; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }, v);

{
  const page = await browser.newPage({ viewport: { width: 960, height: 1000 } });
  await page.goto(`file://${T}p-LineChart-daylight.html`);
  await page.waitForTimeout(700);
  const [rt, rev, , seats] = await read(page);
  const muted = await colour(page, 'var(--ink-muted)'), raised = await colour(page, 'var(--surface-raised)');
  expect(rev.font.size === '13px' && rev.font.weight === '400' && rev.font.fill === muted && rev.font.nums.includes('tabular-nums'), `axis text is a 13px caption in weight 400, ink-muted, tabular (${JSON.stringify(rev.font)})`);
  expect(!rev.inline && rev.left > 30, `by default the y labels keep their gutter (left ${rev.left})`);
  // Inline: Response time, in a half-width card.
  expect(rt.inline && rt.left === 0, `yLabels="inline": the plot runs the full width (left ${rt.left})`);
  expect(rt.font.stroke === raised && rt.font.sw === '3px', `each label sits on a 3px halo of the plot's colour (${rt.font.stroke}, ${rt.font.sw})`);
  expect(rt.labels[0]?.endsWith(' ms') && rt.labels.slice(1).every((l) => /^\d+$/.test(l)), `the top label carries the unit, the rest the number (${rt.labels})`);
  expect(rt.over.length === 0, `no inline label sits on a line (${rt.over})`);
  // A chart whose foot is the ground line leaves it unlabelled.
  await page.evaluate(() => new Promise((done) => {
    const d = document.createElement('div'); d.style.cssText = 'width:420px;position:fixed;top:0;left:0;z-index:9;background:#fff'; d.id = 'g0'; document.body.prepend(d);
    const A = window.Altitude, h = React.createElement;
    ReactDOM.createRoot(d).render(h(A.ChartContainer, { yLabels: 'inline', config: { v: { label: 'V' } } }, h(A.BarChart, { data: [{ k: 'a', v: 30 }, { k: 'b', v: 50 }], x: 'k' })));
    setTimeout(() => done(true), 400);
  }));
  const ground = await page.evaluate(() => [...document.querySelectorAll('#g0 [data-axis="y"] text')].map((t) => t.textContent));
  expect(ground.length >= 2 && !ground.includes('0'), `the ground line is zero, so it goes unlabelled (${ground})`);
  void seats;
  await page.close();
}

// Width gained: the same chart, gutter against inline, in a card at 960 and 360.
for (const w of [960, 360]) {
  const page = await browser.newPage({ viewport: { width: w, height: 1000 } });
  await page.goto(`file://${T}p-LineChart-daylight.html`);
  await page.waitForTimeout(500);
  const gained = await page.evaluate(() => new Promise((done) => {
    const d = document.createElement('div'); d.className = 'alt-card'; d.style.cssText = `width:${Math.min(440, window.innerWidth - 32)}px;padding:20px`; document.body.prepend(d);
    const A = window.Altitude, h = React.createElement, rows = Array.from({ length: 12 }, (_, i) => ({ m: i, v: 80 + i * 9 }));
    const chart = (yLabels) => h(A.ChartContainer, { yLabels, xScale: 'linear', config: { v: { label: 'Latency', format: (n) => `${n} ms` } } }, h(A.LineChart, { data: rows, x: 'm' }));
    ReactDOM.createRoot(d).render(h('div', null, chart('gutter'), chart('inline')));
    setTimeout(() => {
      const [a, b] = [...d.querySelectorAll('.alt-chart-svg > g')].map((g) => +/translate\(([\d.]+)/.exec(g.getAttribute('transform'))[1]);
      const pw = d.querySelector('.alt-chart-plot').getBoundingClientRect().width;
      done({ px: a - b, share: (a - b) / (pw - a) });
    }, 400);
  }));
  console.log(`  at ${w}: inline gives the plot ${gained.px}px more width (${Math.round(gained.share * 100)}% of the gutter layout's plot)`);
  expect(gained.px > 30, `at ${w}, inline labels widen the plot (${gained.px}px)`);
  await page.close();
}

// Forced colours: CanvasText on a Canvas halo.
{
  const page = await browser.newPage({ viewport: { width: 960, height: 1000 } });
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto(`file://${T}p-LineChart-daylight.html`);
  await page.waitForTimeout(600);
  const [rt] = await read(page);
  expect(rt.font.fill === 'rgb(0, 0, 0)' && rt.font.stroke === 'rgb(255, 255, 255)', `forced colours: CanvasText on a Canvas halo (${rt.font.fill}, ${rt.font.stroke})`);
  await page.close();
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
