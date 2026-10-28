// LineChart: a missing value is a gap, the monotone curve never overshoots its data, lines are named at their ends
// without collisions, the axis needn't include zero (and then its foot isn't drawn as ground), the generated summary
// says which way a series went, and forced colours give every point its slot's marker. Run after a render of every
// preview (it opens test/p-LineChart-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

const read = (page) => page.evaluate(() => [...document.querySelectorAll('.alt-chart')].map((fig) => {
  const p = fig.querySelector('.alt-chart-plot');
  return {
    paths: [...p.querySelectorAll('.alt-line-stroke')].map((l) => ({ d: l.getAttribute('d'), dash: l.getAttribute('stroke-dasharray'), w: l.getAttribute('stroke-width') })),
    labels: [...p.querySelectorAll('.alt-line-label')].map((t) => ({ text: t.textContent, y: +t.getAttribute('y') })),
    ends: p.querySelectorAll('.alt-lines > circle').length,
    markers: p.querySelectorAll('.alt-line > :not(.alt-line-stroke)').length,
    yTicks: [...p.querySelectorAll('[data-axis="y"] text')].map((t) => t.textContent),
    xTicks: [...p.querySelectorAll('[data-axis="x"] text')].map((t) => ({ text: t.textContent, x: +t.getAttribute('x'), w: t.getBBox().width, anchor: t.getAttribute('text-anchor') })),
    ground: !!p.querySelector('.alt-chart-ground'), floor: !!p.querySelector('.alt-chart-floor'),
    summary: fig.querySelector('figcaption').textContent,
  };
}));

const page = await browser.newPage({ viewport: { width: 960, height: 900 } });
await page.goto(`file://${T}p-LineChart-daylight.html`);
await page.waitForTimeout(700);
const [latency, revenue, signups, plans] = await read(page);

// Gaps: the signups line has three runs (nulls on the 4th–5th and the 10th), each its own subpath.
expect((signups.paths[0].d.match(/M/g) || []).length === 3, `a null breaks the line: ${(signups.paths[0].d.match(/M/g) || []).length} runs`);

// Monotone: sampled along the curve, y never leaves the range of the two points it runs between.
{
  const ok = await page.evaluate(() => {
    const path = document.querySelectorAll('.alt-chart')[1].querySelector('.alt-line-stroke');
    const pts = [...path.getAttribute('d').matchAll(/(?:M|C[^ ]+ [^ ]+ )([\d.]+),([\d.]+)/g)].map((m) => [+m[1], +m[2]]);
    const len = path.getTotalLength();
    for (let s = 0; s <= len; s += 1) {
      const p = path.getPointAtLength(s);
      const i = pts.findIndex((q, k) => k < pts.length - 1 && p.x >= q[0] - 0.01 && p.x <= pts[k + 1][0] + 0.01);
      if (i < 0) continue;
      const lo = Math.min(pts[i][1], pts[i + 1][1]) - 0.5, hi = Math.max(pts[i][1], pts[i + 1][1]) + 0.5;
      if (p.y < lo || p.y > hi) return `overshoot at x=${p.x.toFixed(1)}: ${p.y.toFixed(1)} outside ${lo.toFixed(1)}–${hi.toFixed(1)}`;
    }
    return 'ok';
  });
  expect(ok === 'ok', `curve="monotone" never overshoots its points: ${ok}`);
}

// End labels: one per line, in ink, at least 16px apart even where lines converge; a marker at each line's end.
const ys = plans.labels.map((l) => l.y).sort((a, b) => a - b);
expect(plans.labels.length === 4 && ys.slice(1).every((y, i) => y - ys[i] >= 15.9), `four end labels, 16px apart: ${ys.map(Math.round)}`);
expect(plans.ends === 4 && latency.ends === 2, `a marker on each line's last point (${plans.ends}, ${latency.ends})`);
expect(plans.paths.every((p) => p.w === '2' && p.dash === null), 'lines are 2px and solid by default');

// The axis needn't include zero, and then its foot is a gridline, not the ground line.
expect(signups.yTicks[0] !== '0' && !signups.ground && signups.floor, `lines don't force zero (${signups.yTicks[0]}), and the foot isn't ground`);
expect(plans.yTicks[0] === '0' && plans.ground, 'when zero is on the axis, it is the ground line');

// x labels never collide.
for (const [name, c] of [['latency', latency], ['revenue', revenue], ['signups', signups], ['plans', plans]]) {
  const spans = c.xTicks.map((t) => (t.anchor === 'start' ? [t.x, t.x + t.w] : [t.x - t.w / 2, t.x + t.w / 2]));
  expect(spans.slice(1).every((s, i) => s[0] - spans[i][1] >= 4), `${name}: x labels clear each other: ${c.xTicks.map((t) => t.text)}`);
}
expect(latency.xTicks.some((t) => /AM|PM|:/.test(t.text)), `intraday data ticks in hours: ${latency.xTicks.map((t) => t.text)}`);

// Summaries: written when given, otherwise generated with the trend.
expect(revenue.summary.startsWith('Revenue rose 70%'), 'a written summary is shown as written');
expect(/Signups rises from 42 at .* to 74 at /.test(signups.summary) && /p50 .*(rises|falls|holds flat)/.test(latency.summary), 'the generated summary says which way each series went: ' + signups.summary.slice(0, 90));
await page.close();

// Forced colours: every point gets its slot's marker, lines their dash, all in CanvasText.
{
  const forced = await browser.newPage({ viewport: { width: 960, height: 900 } });
  await forced.emulateMedia({ forcedColors: 'active' });
  await forced.goto(`file://${T}p-LineChart-daylight.html`);
  await forced.waitForTimeout(700);
  const [, , , fplans] = await read(forced);
  expect(fplans.markers === 24, `forced colours: a marker on every point (${fplans.markers})`);
  expect(fplans.paths[0].dash === null && fplans.paths.slice(1).every((p) => p.dash), 'forced colours: slot 1 solid, the rest dashed');
  await forced.close();
}

// contrast="more": 3px lines.
{
  const more = await browser.newPage({ viewport: { width: 960, height: 900 } });
  await more.goto(`file://${T}p-LineChart-daylight.html`);
  await more.evaluate(() => document.querySelectorAll('.alt-root').forEach((r) => r.setAttribute('data-contrast', 'more')));
  await more.setViewportSize({ width: 961, height: 900 });
  await more.waitForTimeout(500);
  const [, , , mplans] = await read(more);
  expect(mplans.paths.every((p) => p.w === '3'), `contrast="more": 3px lines (${mplans.paths.map((p) => p.w)})`);
  await more.close();
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
