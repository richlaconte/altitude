// Chart focus (#188): a chart type's focus keeps the focused series (or records) in their slot colours and draws the
// rest in data-context, a neutral at 3:1; context labels and legend keys recede to ink-muted; "Highlighted: …" leads
// the generated summary and focused legend keys say "highlighted"; the readout and the keyboard path list focused
// series first; a filter's misses still recede to 35%; a change of focus cross-fades; forced colours draw context in
// GrayText. Run after a render of every preview (it opens test/p-LineChart-daylight.html); exits non-zero on a failure.
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
const fig = (page, title) => page.evaluateHandle((t) => [...document.querySelectorAll('.alt-chart')].find((f) => (f.closest('.alt-card')?.textContent ?? '').includes(t)), title);

{
  const page = await open('LineChart');
  const seats = await fig(page, 'Seats by plan');
  const ctx = await colour(page, 'var(--data-context)'), muted = await colour(page, 'var(--ink-muted)'), ink = await colour(page, 'var(--ink)');
  const r = await seats.evaluate((f) => ({
    strokes: Object.fromEntries([...f.querySelectorAll('.alt-line')].map((g) => [g.dataset.series ?? g.querySelector('.alt-line-stroke')?.closest('[data-series]')?.dataset.series, getComputedStyle(g.querySelector('.alt-line-stroke')).stroke])),
    all: [...f.querySelectorAll('.alt-line-stroke:not([data-pending])')].map((p) => getComputedStyle(p).stroke),
    labels: [...f.querySelectorAll('.alt-line-label')].map((t) => ({ text: t.textContent, fill: getComputedStyle(t).fill })),
    summary: f.querySelector('figcaption').textContent,
  }));
  const team = r.labels.find((l) => l.text === 'Team'), rest = r.labels.filter((l) => l.text !== 'Team');
  expect(r.all.filter((s) => s === ctx).length === 3 && r.all.some((s) => s !== ctx), `focus={['team']}: three lines in data-context, Team in its slot (${r.all})`);
  expect(team?.fill === ink && rest.every((l) => l.fill === muted), `context end labels recede to ink-muted, Team's stays ink (${JSON.stringify(r.labels)})`);
  expect(r.summary.startsWith('Highlighted: Team.'), `the generated summary starts with what's highlighted: "${r.summary.slice(0, 60)}"`);
  // The readout lists Team first.
  const box = await seats.evaluate((f) => { const r = f.querySelector('.alt-chart-plot').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await page.mouse.move(box.x + box.w * 0.5, box.y + box.h * 0.5);
  await page.waitForTimeout(350);
  const rows = await seats.evaluate((f) => [...f.querySelectorAll('.alt-chart-readout-row')].map((x) => x.textContent));
  expect(/Team$/.test(rows[0] ?? ''), `the readout lists the focused series first (${rows})`);
  await page.mouse.move(box.x - 40, box.y - 40);
  // The keyboard's series level starts at Team.
  await seats.evaluate((f) => f.querySelector('.alt-chart-node').focus());
  await page.keyboard.press('Enter');
  await page.waitForTimeout(80);
  const first = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');
  expect(/^Team/.test(first) && / 1 of 4\.$/.test(first), `the keyboard path reaches the focused series first ("${first.slice(0, 40)}…")`);
  await page.close();
}

{
  const page = await open('BarChart');
  const ctx = await colour(page, 'var(--data-context)'), d1 = await colour(page, 'var(--data-1)');
  const deploys = await fig(page, 'Deploys by team');
  const bars = await deploys.evaluate((f) => [...f.querySelectorAll('.alt-bar-mark')].map((b) => ({ cat: b.dataset.category, fill: getComputedStyle(b).fill })));
  const keep = bars.filter((b) => b.cat === 'Cedar' || b.cat === 'Delta'), other = bars.filter((b) => b.cat !== 'Cedar' && b.cat !== 'Delta');
  expect(keep.every((b) => b.fill === d1) && other.length === 3 && other.every((b) => b.fill === ctx), `a record focus keeps Cedar and Delta in data-1, the rest data-context (${JSON.stringify(bars)})`);
  const said = await deploys.evaluate((f) => f.querySelector('figcaption').textContent + ' | ' + (f.querySelector('.alt-chart-node')?.getAttribute('aria-label') ?? ''));
  expect(/Highlighted: Cedar and Delta\./.test(said), `a written summary is followed by what's highlighted, for screen readers (${said.slice(0, 120)})`);
  const stacked = await fig(page, 'Requests, all services');
  const segs = await stacked.evaluate((f) => [...f.querySelectorAll('.alt-bar-mark')].map((b) => ({ s: b.dataset.series, fill: getComputedStyle(b).fill })));
  expect(segs.filter((x) => x.s === 'web').every((x) => x.fill !== ctx) && segs.filter((x) => x.s !== 'web').every((x) => x.fill === ctx), 'stacked: Web keeps its slot, API and Jobs take data-context');
  await page.close();
}

// Legend words, a filter on top of focus, and a change of focus cross-fading: a chart of our own.
{
  const page = await open('LineChart');
  await page.evaluate(() => new Promise((done) => {
    const d = document.createElement('div'); d.id = 'fx'; d.style.cssText = 'width:480px;position:absolute;top:0;left:0;z-index:9;background:#fff'; document.body.prepend(d);
    const A = window.Altitude, h = React.createElement, rows = ['a', 'b', 'c'].map((k, i) => ({ k, x: 3 + i, y: 5 - i, z: 2 + i }));
    const root = ReactDOM.createRoot(d);
    window.__draw = (focus, relevance) => root.render(h(A.ChartContainer, { config: { x: { label: 'X' }, y: { label: 'Y' }, z: { label: 'Z' } } },
      h(A.BarChart, { data: rows, x: 'k', focus, relevance }, h(A.ChartLegend, { content: h(A.ChartLegendContent, { toggle: true }) }))));
    window.__draw(['y'], (r) => (r.k === 'c' ? 'miss' : 'match'));
    setTimeout(done, 450);
  }));
  const muted = await colour(page, 'var(--ink-muted)'), ctx = await colour(page, 'var(--data-context)');
  const legend = await page.evaluate(() => [...document.querySelectorAll('#fx .alt-legend-key')].map((k) => ({ text: k.textContent, color: getComputedStyle(k).color, ctx: k.hasAttribute('data-context') })));
  expect(legend.find((k) => k.text.startsWith('Y'))?.text === 'Y, highlighted' && legend.filter((k) => k.ctx).length === 2 && legend.filter((k) => k.ctx).every((k) => k.color === muted), `legend: the focused key says "highlighted", context keys in ink-muted (${JSON.stringify(legend)})`);
  const miss = await page.evaluate(() => [...document.querySelectorAll('#fx .alt-chart-rel[data-miss] .alt-bar-mark')].map((b) => ({ fill: getComputedStyle(b).fill, op: getComputedStyle(b.closest('.alt-chart-rel')).opacity })));
  expect(miss.length === 3 && miss.some((m) => m.fill === ctx) && miss.every((m) => m.op === '0.35'), `a context mark that misses a filter recedes to 35% of data-context (${JSON.stringify(miss)})`);
  const tr = await page.evaluate(() => getComputedStyle(document.querySelector('#fx .alt-bar-mark')).transitionProperty);
  expect(/\bfill\b/.test(tr), `a change of focus cross-fades the fill (${tr})`);
  await page.evaluate(() => window.__draw(undefined));
  await page.waitForTimeout(450);
  const none = await page.evaluate(() => [...document.querySelectorAll('#fx .alt-bar-mark')].map((b) => getComputedStyle(b).fill));
  expect(!none.includes(ctx) && !(await page.evaluate(() => document.querySelector('#fx figcaption').textContent)).includes('Highlighted'), 'without focus nothing is context and nothing is highlighted');
  await page.close();
}

// Forced colours: focused CanvasText, context GrayText.
{
  const page = await open('LineChart', { forcedColors: 'active' });
  const seats = await fig(page, 'Seats by plan');
  const strokes = await seats.evaluate((f) => [...f.querySelectorAll('.alt-line-stroke:not([data-pending])')].map((p) => p.getAttribute('stroke')));
  expect(strokes.filter((s) => s === 'GrayText').length === 3 && strokes.filter((s) => s === 'CanvasText').length === 1, `forced colours: context lines GrayText, Team CanvasText (${strokes})`);
  await page.close();
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
