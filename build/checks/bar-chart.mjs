// BarChart: bars stand on the ground line, flat, rounded only at the data end, parted by real gaps; zero is always on
// the axis; sort, stack, expand, negative values, horizontal layout and selective labels do what they say; hovering
// a bar on a static chart changes nothing. Run after a render of every preview (it opens test/p-BarChart-daylight.html);
// exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 900 } });
await page.goto(`file://${T}p-BarChart-daylight.html`);
await page.waitForTimeout(700);

// Each chart's bars (bounding boxes, path, series, category), its ground line and its value labels.
const charts = await page.evaluate(() => [...document.querySelectorAll('.alt-chart-plot')].map((p) => {
  const g = p.querySelector('.alt-chart-ground');
  return {
    ground: { x1: +g.getAttribute('x1'), x2: +g.getAttribute('x2'), y1: +g.getAttribute('y1'), y2: +g.getAttribute('y2') },
    bars: [...p.querySelectorAll('.alt-bar path')].map((b) => { const r = b.getBBox(); return { x: r.x, y: r.y, w: r.width, h: r.height, d: b.getAttribute('d'), s: b.dataset.series, c: b.dataset.category, shadow: getComputedStyle(b).filter }; }),
    labels: [...p.querySelectorAll('.alt-bar-label')].map((t) => t.textContent),
    yTicks: [...p.querySelectorAll('[data-axis="y"] text')].map((t) => t.textContent),
    xTicks: [...p.querySelectorAll('[data-axis="x"] text')].map((t) => t.textContent),
  };
}));
const [single, grouped, stacked, expand, negative, horizontal] = charts;
const groundY = (c) => c.ground.y1 - 0.5;

// One series, sorted descending, labelled at its max.
expect(single.bars.map((b) => b.c).join() === 'Cedar,Atlas,Birch,Ember,Delta', `sort="desc" orders by value: ${single.bars.map((b) => b.c)}`);
expect(single.xTicks.length === 5, `every category is labelled when the labels fit: ${single.xTicks}`);
expect(single.labels.join() === '51', `labels="max" labels only the largest bar: ${single.labels}`);
expect(single.yTicks[0] === '0', 'zero is on the axis');
expect(single.bars.every((b) => Math.abs(b.y + b.h - groundY(single)) < 0.6), 'every bar stands on the ground line');
// Rounded at the data end (a curve at the top), square at the ground (straight vertical edges into it).
expect(single.bars.every((b) => /^M[\d.]+,[\d.]+V[\d.]+Q/.test(b.d)), 'bars are square at the ground and rounded at the data end');
expect(single.bars.every((b) => b.shadow === 'none'), 'no bar has a shadow or filter');

// Grouped: neighbours in a group are parted by the gap.
const apr = grouped.bars.filter((b) => b.c === 'Apr').sort((a, b) => a.x - b.x);
expect(apr.length === 3 && apr.slice(1).every((b, i) => Math.abs(b.x - (apr[i].x + apr[i].w) - 2) < 0.6), 'grouped bars are 2px apart');

// Stacked: segments parted by the gap; only the outermost is rounded; the total is labelled on the last category.
const jan = stacked.bars.filter((b) => b.c === 'Jan').sort((a, b) => b.y - a.y);
expect(jan.length === 3 && jan.slice(1).every((b, i) => Math.abs(jan[i].y - (b.y + b.h) - 2) < 0.6), 'stacked segments are 2px apart');
expect(jan.slice(0, 2).every((b) => !b.d.includes('Q')) && jan[2].d.includes('Q'), 'only the outermost segment is rounded');
expect(stacked.labels.join() === '50', `labels="last" labels the last category's total: ${stacked.labels}`);

// Expand: every column reaches 100%.
const tops = [...new Set(expand.bars.map((b) => b.c))].map((c) => Math.min(...expand.bars.filter((b) => b.c === c).map((b) => b.y)));
expect(expand.yTicks.at(-1) === '100%' && tops.every((t) => Math.abs(t - tops[0]) < 0.6), `stack="expand" fills every column to 100%: ${expand.yTicks}`);

// Negative values hang below the ground line, rounded at their (lower) data end.
const below = negative.bars.filter((b) => b.y >= groundY(negative) - 0.6);
expect(below.length === 2 && below.every((b) => b.h > 4), `negative bars hang below the ground line (${below.length})`);
expect(negative.yTicks.some((t) => t.startsWith('-')) && negative.yTicks.includes('0'), `the axis runs through zero into the negatives: ${negative.yTicks}`);

// Horizontal: the ground line is vertical; bars grow rightward from it; long names are cut, not dropped.
expect(horizontal.ground.x1 === horizontal.ground.x2 && horizontal.ground.y1 !== horizontal.ground.y2, 'horizontal: the ground line is vertical');
expect(horizontal.bars.every((b) => Math.abs(b.x - (horizontal.ground.x1 - 0.5)) < 0.6), 'horizontal: bars start at the ground line');
expect(horizontal.xTicks.length === 4 && horizontal.xTicks.some((t) => t.endsWith('…')), `horizontal: every category labelled, long ones cut: ${horizontal.xTicks}`);
expect(horizontal.labels.join() === '1,240', `horizontal labels="max": ${horizontal.labels}`);

// Hover is a promise: on a static chart a hovered bar doesn't change at all.
{
  const bar = page.locator('.alt-chart-plot').first().locator('.alt-bar path').first();
  const before = await bar.evaluate((b) => [b.getAttribute('d'), getComputedStyle(b).opacity, getComputedStyle(b).outlineStyle, getComputedStyle(b).cursor].join('|'));
  await bar.hover();
  await page.waitForTimeout(300);
  const after = await bar.evaluate((b) => [b.getAttribute('d'), getComputedStyle(b).opacity, getComputedStyle(b).outlineStyle, getComputedStyle(b).cursor].join('|'));
  expect(before === after && !after.includes('pointer'), 'a hovered bar on a static chart neither lifts nor changes');
}

// A bar's axis can't be truncated: zero={false} on the container still gives zero.
{
  const ticks = await page.evaluate(() => new Promise((done) => {
    const d = document.createElement('div'); d.style.width = '500px'; document.body.prepend(d);
    const A = window.Altitude, h = React.createElement;
    ReactDOM.createRoot(d).render(h(A.AltitudeProvider, null, h(A.ChartContainer, { zero: false, config: { v: { label: 'V' } } },
      h(A.BarChart, { data: [{ k: 'a', v: 80 }, { k: 'b', v: 95 }], x: 'k' }))));
    setTimeout(() => done([...d.querySelectorAll('[data-axis="y"] text')].map((t) => t.textContent)), 500);
  }));
  expect(ticks[0] === '0', `bars ignore zero={false}: ${ticks}`);
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
