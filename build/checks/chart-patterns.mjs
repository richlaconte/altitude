// Series told apart without colour (#72): the patterns prop, forced colours and print turn on each slot's hatch, dash
// and marker; contrast="more" thickens strokes and edges fills. Run after a render of every preview (it opens
// test/p-ChartPatterns-daylight.html and test/p-ChartContainer-daylight.html); writes test/print-ChartContainer.png;
// exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (name, media) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-${name}-daylight.html`);
  await page.waitForTimeout(600);
  return page;
};
const read = (page) => page.evaluate(() => [...document.querySelectorAll('.alt-chart-plot')].map((p) => ({
  patterns: p.hasAttribute('data-patterns'),
  fills: [...p.querySelectorAll('.alt-chart-marks rect')].map((r) => r.getAttribute('fill')),
  edges: [...p.querySelectorAll('.alt-chart-marks rect')].map((r) => r.getAttribute('stroke')),
  dashes: [...p.querySelectorAll('.alt-chart-marks polyline')].map((l) => l.getAttribute('stroke-dasharray')),
  widths: [...p.querySelectorAll('.alt-chart-marks polyline')].map((l) => l.getAttribute('stroke-width')),
  strokes: [...p.querySelectorAll('.alt-chart-marks polyline')].map((l) => l.getAttribute('stroke')),
  markers: p.querySelectorAll('.alt-chart-marks polyline ~ *').length,
  hatches: [...p.querySelectorAll('pattern')].map((x) => x.id),
})));

// The prop: six slots, five hatches (slot 1 is solid), a dash per slot after the first, markers on every point.
{
  const page = await open('ChartPatterns');
  const [bars, lines] = await read(page);
  const kinds = new Set(bars.fills.map((f) => f.startsWith('url(') ? f.replace(/.*-(data-\d)\)$/, '$1') : f));
  expect(bars.patterns && bars.hatches.length === 5, `patterns: five hatches defined (${bars.hatches.length})`);
  expect(kinds.size === 6 && kinds.has('var(--data-1)'), `six distinct fills, slot 1 solid: ${[...kinds].join(' ')}`);
  expect(lines.dashes[0] === null && new Set(lines.dashes.slice(1)).size === 3 && lines.dashes.slice(1).every(Boolean), `slot 1 is solid, the others each dashed: ${lines.dashes}`);
  expect(lines.markers === 20, `a marker on every point (${lines.markers})`);
  await page.close();
}

// Without the prop, in normal media, nothing changes: plain colours, solid lines, no defs.
{
  const page = await open('ChartContainer');
  const [line, bars] = await read(page);
  expect(!line.patterns && !bars.patterns && bars.hatches.length === 0, 'no patterns unless asked');
  expect(bars.fills.every((f) => /^var\(--data-\d\)$/.test(f)) && line.dashes.every((d) => d === null), 'plain fills and solid lines by default');
  expect(line.widths.every((w) => w === '2') && bars.edges.every((e) => e === null), 'strokes are 2px and fills have no edge by default');
  await page.close();
}

// Forced colours: patterns on, marks in CanvasText over Canvas, fills edged.
{
  const page = await open('ChartContainer', { forcedColors: 'active' });
  const [line, bars] = await read(page);
  expect(line.patterns && bars.patterns, 'forced colours turn patterns on');
  expect(line.strokes.every((s) => s === 'CanvasText') && line.dashes[1], `lines are CanvasText, the second dashed: ${line.strokes} ${line.dashes}`);
  expect(bars.fills.some((f) => f === 'CanvasText') && bars.fills.some((f) => f.startsWith('url(')), 'bars are solid CanvasText or a hatch');
  expect(bars.edges.every((e) => e === 'CanvasText'), 'filled marks get a CanvasText edge');
  const fg = await page.evaluate(() => [...document.querySelectorAll('pattern')].map((p) => p.querySelector('rect').getAttribute('fill') + '/' + p.lastElementChild.getAttribute('stroke')));
  expect(fg.length && fg.every((x) => x === 'Canvas/CanvasText'), 'hatches are CanvasText on Canvas: ' + fg);
  await page.close();
}

// Print: patterns on, and the page as it prints.
{
  const page = await open('ChartContainer', { media: 'print' });
  const [line, bars] = await read(page);
  expect(line.patterns && bars.patterns && line.dashes[1], 'print turns patterns on');
  await page.screenshot({ path: `${T}print-ChartContainer.png` });
  await page.close();
}

// contrast="more": 3px strokes, 3px gaps, an ink edge on fills.
{
  const page = await open('ChartContainer');
  await page.evaluate(() => document.querySelectorAll('.alt-root').forEach((r) => r.setAttribute('data-contrast', 'more')));
  // The container reads the attribute when it next renders: a resize is the least intrusive way to get there.
  await page.setViewportSize({ width: 961, height: 700 });
  await page.waitForTimeout(400);
  const [line, bars] = await read(page);
  expect(line.widths.every((w) => w === '3'), `strokes are 3px: ${line.widths}`);
  expect(bars.edges.every((e) => e === 'var(--ink)'), `fills are edged in ink: ${[...new Set(bars.edges)]}`);
  const gaps = await page.evaluate(() => { const r = [...document.querySelectorAll('.alt-chart-plot')[1].querySelectorAll('rect')]; return +r[1].getAttribute('x') - (+r[0].getAttribute('x') + +r[0].getAttribute('width')); });
  expect(Math.abs(gaps - 3) < 0.01, `adjacent bars are 3px apart: ${gaps}`);
  await page.close();
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
