// Loading, refetch and nothing (#65): undefined or a pending promise shows the chart's imprint (frame, legend, no
// labels, aria-busy) after dur-grace; data lands by fading in place, never rising; a quick load shows no imprint; [] or
// null is an EmptyState in the plot; a refetch keeps the chart, dims it after dur-grace and says "Updating"; all-zero
// data is drawn on 0–1; a rejection reaches your error boundary; a RevealGroup lands charts together. Run after a render
// of every preview (it opens test/p-ChartLoading-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 900 } });
await page.goto(`file://${T}p-ChartLoading-daylight.html`);
await page.waitForTimeout(900);

// The preview's four states.
{
  const s = await page.evaluate(() => [...document.querySelectorAll('.alt-card')].map((c) => ({
    imprint: !!c.querySelector('.alt-chart-imprint'), busy: !!c.querySelector('[aria-busy="true"]'), loading: c.textContent.includes('Loading'),
    legend: [...c.querySelectorAll('.alt-legend-key')].map((k) => k.textContent).join(), ticks: c.querySelectorAll('.alt-chart-axis text').length,
    empty: c.querySelector('.alt-empty-title')?.textContent ?? null, action: c.querySelector('.alt-empty button')?.textContent ?? null, svg: !!c.querySelector('.alt-chart-svg'),
    refreshing: c.querySelector('.alt-chart-plot')?.hasAttribute('data-refreshing'), updating: c.querySelector('.alt-chart-plot')?.textContent.includes('Updating'),
    marks: c.querySelector('.alt-chart-marks') ? getComputedStyle(c.querySelector('.alt-chart-marks')).opacity : null,
    yTicks: [...c.querySelectorAll('[data-axis="y"] text')].map((t) => t.textContent).join(), ground: !!c.querySelector('.alt-chart-ground'),
  })));
  const [loading, empty, refresh, zeros] = s;
  expect(loading.imprint && loading.busy && loading.loading && loading.ticks === 0, `undefined: the imprint, aria-busy, "Loading", no labels (${JSON.stringify({ i: loading.imprint, b: loading.busy, t: loading.ticks })})`);
  expect(loading.legend === 'Deploys', `the imprint keeps the frame's legend: ${loading.legend}`);
  expect(empty.empty === 'No deploys match these filters' && empty.action === 'Clear filters' && !empty.svg, `[]: an EmptyState with its action, and no plot: ${empty.empty}`);
  expect(refresh.refreshing && refresh.busy && refresh.updating && Math.abs(+refresh.marks - 0.5) < 0.01, `refreshing: the chart stays, at half strength, busy and "Updating" (opacity ${refresh.marks})`);
  expect(zeros.yTicks === '0,0.5,1' && zeros.ground, `all-zero data is drawn on 0–1: ${zeros.yTicks}`);
}

// Mounts a chart (in a fixed layer) driven from the test: window.__data(v) sets its data.
await page.evaluate(() => {
  const A = window.Altitude, h = React.createElement;
  const d = document.createElement('div'); d.id = 'probe'; d.style.cssText = 'width:480px;position:fixed;top:0;left:0;z-index:9999;background:#fff'; document.body.prepend(d);
  class Boundary extends React.Component { constructor(p) { super(p); this.state = { error: null }; } static getDerivedStateFromError(error) { return { error }; } render() { return this.state.error ? h('p', { id: 'caught' }, 'Caught: ' + this.state.error.message) : this.props.children; } }
  function Probe() {
    const [data, setData] = React.useState(undefined);
    window.__data = setData;
    return h(A.AltitudeProvider, null, h(Boundary, null, h(A.ChartContainer, { id: 'pc', title: 'Probe', config: { v: { label: 'V' } } }, h(A.BarChart, { data, x: 'k' }))));
  }
  ReactDOM.createRoot(d).render(h(Probe));
});
const probe = () => page.evaluate(() => {
  const f = document.querySelector('#probe');
  const face = f.querySelector('.alt-chart-await');
  return {
    imprint: !!f.querySelector('.alt-chart-imprint'), imprintOpacity: f.querySelector('.alt-await-wait') ? getComputedStyle(f.querySelector('.alt-await-wait')).opacity : null,
    bars: f.querySelectorAll('.alt-bar path').length, phase: face?.dataset.phase ?? null,
    fromY: face?.querySelector('.alt-await-face') ? getComputedStyle(face.querySelector('.alt-await-face')).getPropertyValue('--alt-from-y').trim() : null,
    refreshing: f.querySelector('.alt-chart-plot')?.hasAttribute('data-refreshing') ?? false, caught: f.querySelector('#caught')?.textContent ?? null,
    title: f.querySelector('.alt-chart-title')?.textContent,
  };
});
await page.waitForTimeout(400);
let p = await probe();
expect(p.imprint && p.title === 'Probe', 'data={undefined}: the imprint, with the title in place');

// A promise that lands after 700ms: the imprint, then the data fading in place (from-y 0, never rising).
await page.evaluate(() => window.__data(new Promise((r) => setTimeout(() => r([{ k: 'a', v: 3 }, { k: 'b', v: 5 }]), 700))));
await page.waitForTimeout(250);
p = await probe();
expect(p.imprint && p.bars === 0, 'a pending promise keeps the imprint');
await page.waitForTimeout(600);
p = await probe();
expect(p.bars === 2 && p.phase === 'reveal' && p.fromY === '0px', `the data lands by fading in place, not rising (phase ${p.phase}, from-y ${p.fromY})`);

// A refetch: a new promise while data shows keeps the chart, then dims it after dur-grace, then shows the new data.
await page.waitForTimeout(500);
await page.evaluate(() => window.__data(new Promise((r) => setTimeout(() => r([{ k: 'a', v: 9 }, { k: 'b', v: 1 }, { k: 'c', v: 4 }]), 800))));
await page.waitForTimeout(100);
p = await probe();
expect(p.bars === 2 && !p.imprint && p.refreshing, `a refetch keeps the old chart, marked refreshing (bars ${p.bars}, imprint ${p.imprint})`);
await page.waitForTimeout(500);
const dim = await page.evaluate(() => getComputedStyle(document.querySelector('#probe .alt-chart-marks')).opacity);
expect(Math.abs(+dim - 0.5) < 0.05, `after dur-grace the old marks drop to half strength (${dim})`);
await page.waitForTimeout(700);
p = await probe();
expect(p.bars === 3 && !p.refreshing, `then the new data replaces it (bars ${p.bars})`);

// A quick load (under dur-grace) never shows the imprint.
await page.evaluate(() => window.__data(undefined));
await page.waitForTimeout(50);
await page.evaluate(() => window.__data(new Promise((r) => setTimeout(() => r([{ k: 'x', v: 1 }]), 120))));
let seen = 0;
for (let i = 0; i < 12; i++) { const o = await page.evaluate(() => { const w = document.querySelector('#probe .alt-await-wait'); return w ? +getComputedStyle(w).opacity : 0; }); seen = Math.max(seen, o); await page.waitForTimeout(25); }
expect(seen < 0.05, `a load quicker than dur-grace never shows its imprint (max opacity ${seen})`);

// null: the default EmptyState.
await page.waitForTimeout(300);
await page.evaluate(() => window.__data(null));
await page.waitForTimeout(200);
expect(await page.evaluate(() => document.querySelector('#probe .alt-empty-title')?.textContent) === 'No data to show', 'null shows the default EmptyState');

// A rejection goes to your error boundary.
await page.evaluate(() => window.__data(Promise.reject(new Error('Network down'))));
await page.waitForTimeout(400);
p = await probe();
expect(p.caught === 'Caught: Network down', `a rejected promise reaches the error boundary: ${p.caught}`);

// RevealGroup: two charts whose data lands 400ms apart appear together.
{
  const t = await page.evaluate(() => new Promise((done) => {
    const A = window.Altitude, h = React.createElement;
    const d = document.createElement('div'); d.style.cssText = 'width:480px;position:fixed;top:300px;left:0;z-index:9999;background:#fff'; document.body.prepend(d);
    const later = (ms) => new Promise((r) => setTimeout(() => r([{ k: 'a', v: 1 }]), ms));
    const chart = (id, ms) => h(A.ChartContainer, { id, config: { v: { label: 'V' } } }, h(A.BarChart, { data: later(ms), x: 'k' }));
    ReactDOM.createRoot(d).render(h(A.AltitudeProvider, null, h(A.RevealGroup, null, chart('g1', 500), chart('g2', 900))));
    const seen = {};
    const start = performance.now();
    const tick = () => {
      for (const id of ['g1', 'g2']) if (!seen[id] && d.querySelector(`#${id} .alt-bar path`) && getComputedStyle(d.querySelector(`#${id}`).closest('.alt-await')?.querySelector('.alt-await-face') ?? d.querySelector(`#${id}`)).visibility !== 'hidden') seen[id] = performance.now() - start;
      if (performance.now() - start < 1500) requestAnimationFrame(tick); else done(seen);
    };
    requestAnimationFrame(tick);
  }));
  expect(t.g1 && t.g2 && Math.abs(t.g1 - t.g2) < 60 && t.g1 > 850, `in a RevealGroup, the quicker chart waits for the slower (${Math.round(t.g1)}ms, ${Math.round(t.g2)}ms)`);
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
