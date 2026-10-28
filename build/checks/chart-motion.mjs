// Chart motion, sampled frame by frame (as E5 did for levels): a rescale comes before the values and the two never move
// at once, re-sorted bands are carried, an interruption starts from where the marks are, reduced motion only
// cross-fades, and resizing never animates. Run after a render of every preview (it opens
// test/p-ChartMotion-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 900 } });
await page.goto(`file://${T}p-ChartMotion-daylight.html`);
await page.waitForTimeout(300);

// A chart under test control: window.__set(rows) changes its data; window.__motion(m) sets the provider's motion.
await page.evaluate(() => new Promise((done) => {
  const d = document.createElement('div'); d.id = 'probe'; d.style.width = '600px'; document.body.prepend(d);
  const A = window.Altitude, h = React.createElement;
  function Bars() {
    const { data, x, y, xKey, ground, alpha } = A.useChart();
    return data.map((r) => h('rect', { key: r[xKey], 'data-k': r[xKey], x: x(r[xKey]), y: Math.min(y(r.v), ground), width: x.bandwidth, height: Math.abs(y(r.v) - ground), opacity: alpha(r) }));
  }
  function Probe() {
    const [rows, setRows] = React.useState([{ k: 'A', v: 42 }, { k: 'B', v: 35 }, { k: 'C', v: 28 }]);
    const [motion, setMotion] = React.useState('full');
    window.__set = setRows; window.__motion = setMotion;
    return h(A.AltitudeProvider, { motion }, h(A.ChartContainer, { data: rows, x: 'k', aspect: 2, config: { v: { label: 'Value' } } }, h(Bars)));
  }
  ReactDOM.createRoot(d).render(h(Probe));
  setTimeout(done, 600);
}));

// Records every frame for ms: the stage, each layer's tick labels (value and y) and each bar's value read off them.
const sample = (rows, ms = 900, between) => page.evaluate(([rows, ms, between]) => new Promise((done) => {
  const out = [];
  const plot = document.querySelector('#probe .alt-chart-plot');
  const read = () => {
    const layers = [...plot.querySelectorAll('svg > g')].map((g) => {
      const ticks = [...g.querySelectorAll('[data-axis="y"] text')].map((t) => ({ v: Number(t.textContent), y: +t.getAttribute('y'), a: t.getAttribute('opacity') }));
      const ground = +g.querySelector('.alt-chart-ground').getAttribute('y1') - 0.5;
      const solid = ticks.filter((t) => t.a == null && t.v !== 0);
      const per = solid.length ? (ground - solid[0].y) / solid[0].v : NaN;
      const bars = Object.fromEntries([...g.querySelectorAll('rect')].map((r) => [r.dataset.k, { v: +r.getAttribute('height') / per, x: +r.getAttribute('x'), o: r.getAttribute('opacity') }]));
      return { ticks, bars, opacity: g.getAttribute('opacity') };
    });
    out.push({ t: performance.now(), stage: plot.dataset.stage, layers });
  };
  window.__set(rows);
  const start = performance.now();
  const tick = () => {
    read();
    if (between && !between.done && performance.now() - start > between.at) { between.done = true; window.__set(between.rows); }
    if (performance.now() - start < ms) requestAnimationFrame(tick); else done(out);
  };
  requestAnimationFrame(tick);
}), [rows, ms, between]);

const tickYs = (f) => f.layers[0].ticks.filter((t) => t.a == null).map((t) => `${t.v}@${t.y.toFixed(1)}`).join(' ');

// 1. A rescale (0–60 to 0–100), then the values: the axis moves first, then the marks; never both.
{
  const frames = await sample([{ k: 'A', v: 88 }, { k: 'B', v: 64 }, { k: 'C', v: 71 }]);
  const stages = frames.map((f) => f.stage ?? 'idle');
  const firstValues = stages.indexOf('values'), lastRescale = stages.lastIndexOf('rescale');
  expect(stages.includes('rescale') && firstValues > lastRescale, `the rescale comes before the values: ${[...new Set(stages)].join(' → ')}`);
  const during = frames.filter((f) => f.stage === 'rescale');
  // While the axis rescales the marks keep their old values (they move only with the scale)…
  const held = during.every((f) => ['A', 'B', 'C'].every((k) => Math.abs(f.layers[0].bars[k].v - { A: 42, B: 35, C: 28 }[k]) < 0.6));
  expect(during.length >= 3 && held, `marks keep their values while the axis rescales (${during.length} frames)`);
  // …and while the marks glide to their values, the axis stands still.
  const gliding = frames.filter((f) => f.stage === 'values');
  expect(gliding.length >= 3 && new Set(gliding.map(tickYs)).size === 1, `the axis stands still while the values glide (${gliding.length} frames)`);
  const mid = gliding[Math.floor(gliding.length / 2)].layers[0].bars.A.v;
  expect(mid > 43 && mid < 87, `values pass through the middle, not jump: A was ${mid.toFixed(1)} mid-glide`);
  const end = frames[frames.length - 1];
  expect(end.stage === undefined && Math.abs(end.layers[0].bars.A.v - 88) < 0.6, 'it settles at the new values with no stage');
  const ms = (gliding[gliding.length - 1].t - during[0].t);
  // About dur-travel-2 + dur-travel-3 (400ms); the upper bound leaves room for a busy machine dropping frames.
  expect(ms > 300 && ms < 900, `rescale then values take about dur-travel-2 + dur-travel-3 (${Math.round(ms)}ms)`);
}

// 2. A re-sort is carried: a band passes through the positions between its old place and its new one.
{
  const frames = await sample([{ k: 'A', v: 88 }, { k: 'C', v: 71 }, { k: 'B', v: 64 }]);
  const xs = frames.map((f) => f.layers[0].bars.C.x);
  const [x0, x1] = [xs[0], xs[xs.length - 1]];
  const between = xs.filter((x) => (x - x0) * (x - x1) < 0 && Math.abs(x - x0) > 2 && Math.abs(x - x1) > 2);
  expect(x1 < x0 && between.length >= 3, `a re-sorted band is carried, not swapped (${between.length} frames between)`);
  expect(!frames.some((f) => f.stage === 'rescale'), 'a re-sort without a new domain has no rescale');
}

// 3. Entering and leaving bands fade; the leaving one is gone sooner than the entering one arrives.
{
  const frames = await sample([{ k: 'A', v: 88 }, { k: 'C', v: 71 }, { k: 'D', v: 50 }]);
  const op = (f, k) => { const b = f.layers[0].bars[k]; return b ? (b.o == null ? 1 : +b.o) : 0; };
  const goneAt = frames.findIndex((f) => op(f, 'B') === 0), fullAt = frames.findIndex((f) => op(f, 'D') === 1);
  expect(frames.some((f) => op(f, 'D') > 0.05 && op(f, 'D') < 0.95), 'an entering band fades in');
  expect(goneAt > 0 && fullAt > 0 && goneAt < fullAt, `exits are shorter than entries (gone at frame ${goneAt}, in at ${fullAt})`);
}

// 4. An interruption starts from where the marks are: no frame jumps.
{
  const frames = await sample([{ k: 'A', v: 20 }, { k: 'C', v: 71 }, { k: 'D', v: 50 }], 1000, { at: 260, rows: [{ k: 'A', v: 95 }, { k: 'C', v: 71 }, { k: 'D', v: 50 }] });
  const vs = frames.map((f) => f.layers[f.layers.length - 1].bars.A?.v).filter((v) => isFinite(v));
  const jumps = vs.slice(1).map((v, i) => Math.abs(v - vs[i]));
  expect(Math.max(...jumps) < 12, `an interruption retargets without a jump (largest step ${Math.max(...jumps).toFixed(1)})`);
  expect(Math.abs(vs[vs.length - 1] - 95) < 0.6, 'and lands on the newest values');
}

// 5. Reduced motion: values change in place, as a cross-fade between the old chart and the new one.
{
  await page.evaluate(() => window.__motion('reduced'));
  await page.waitForTimeout(100);
  const frames = await sample([{ k: 'A', v: 40 }, { k: 'C', v: 30 }, { k: 'D', v: 20 }], 500);
  const fading = frames.filter((f) => f.stage === 'fade');
  expect(fading.length >= 2 && !frames.some((f) => f.stage === 'rescale' || f.stage === 'values'), 'reduced motion only cross-fades');
  const inPlace = fading.every((f) => f.layers.every((l) => [95, 40].some((v) => Math.abs((l.bars.A?.v ?? v) - v) < 0.6)));
  expect(inPlace, 'under reduced motion no mark passes through an in-between value');
  await page.evaluate(() => window.__motion('full'));
}

// 6. Resizing re-lays out at once.
{
  await page.waitForTimeout(300);
  const stages = await page.evaluate(() => new Promise((done) => {
    const plot = document.querySelector('#probe .alt-chart-plot'), seen = [];
    document.getElementById('probe').style.width = '420px';
    const start = performance.now();
    const tick = () => { seen.push(plot.dataset.stage ?? 'idle'); if (performance.now() - start < 400) requestAnimationFrame(tick); else done(seen); };
    requestAnimationFrame(tick);
  }));
  expect(stages.every((s) => s === 'idle'), 'a resize never animates: ' + [...new Set(stages)].join(','));
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
