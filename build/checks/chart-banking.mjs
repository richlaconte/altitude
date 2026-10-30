// LineChart aspect="banked" (#194): the plot takes the proportions that bank the lines' segments to an average of 45°
// of absolute orientation, held between 1 and 4 for the data area; the width is the container's; gliding values keep
// the height and new x values reset it; aspect="banked" works on LineChart or on the container; the default stays 2.
// Prints the mean orientation before and after for the preview's revenue data. Run after a render of every preview
// (it opens test/p-LineChart-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 1400 } });
await page.goto(`file://${T}p-LineChart-daylight.html`);
await page.waitForTimeout(700);

// Mount charts in a 480px box; read each one's data area and its line's mean absolute orientation, in degrees.
await page.evaluate(() => {
  const d = document.createElement('div'); d.id = 'bk'; d.style.cssText = 'width:480px;position:absolute;top:0;left:0;z-index:9;background:#fff'; document.body.prepend(d);
  window.__root = ReactDOM.createRoot(d);
});
const mount = (charts) => page.evaluate((charts) => new Promise((done) => {
  const A = window.Altitude, h = React.createElement;
  window.__root.render(h('div', null, ...charts.map(({ rows, container = {}, line = {} }, i) => h(A.ChartContainer, { key: i, id: `c${i}`, config: { v: { label: 'V' } }, ...container }, h(A.LineChart, { data: rows, x: 'x', endLabels: false, ...line })))));
  setTimeout(done, 450);
}), charts);
const measure = () => page.evaluate(() => [...document.querySelectorAll('#bk .alt-chart')].map((fig) => {
  const floor = fig.querySelector('.alt-chart-ground, .alt-chart-floor'), grid = [...fig.querySelectorAll('.alt-chart-grid line')].map((l) => +l.getAttribute('y1'));
  const pw = +floor.getAttribute('x2'), ph = Math.max(...grid) - Math.min(...grid);
  const nums = (fig.querySelector('.alt-line-stroke').getAttribute('d').match(/-?[\d.]+/g) ?? []).map(Number);
  const pts = []; for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  const angles = pts.slice(1).map((p, i) => Math.abs(Math.atan2(p[1] - pts[i][1], p[0] - pts[i][0])) * 180 / Math.PI).map((a) => (a > 90 ? 180 - a : a));
  return { ratio: pw / ph, mean: angles.reduce((t, a) => t + a, 0) / angles.length, height: fig.querySelector('.alt-chart-plot').getBoundingClientRect().height, aspect: fig.querySelector('.alt-chart-plot').style.aspectRatio };
}));

const smooth = Array.from({ length: 24 }, (_, x) => ({ x, v: 50 + 30 * Math.sin(x / 4) }));
const flat = Array.from({ length: 12 }, (_, x) => ({ x, v: 40 + x * 0.2 })); // a gentle ramp, read on an axis from zero
const jagged = Array.from({ length: 30 }, (_, x) => ({ x, v: x % 2 ? 90 : 10 }));
await mount([{ rows: smooth, line: { aspect: 'banked' } }, { rows: smooth, container: { aspect: 'banked' } }, { rows: flat, container: { aspect: 'banked', zero: true } }, { rows: jagged, container: { aspect: 'banked' } }, { rows: smooth }]);
let [onLine, onBox, flatM, jaggedM, plain] = await measure();
expect(Math.abs(onLine.mean - 45) < 2.5, `banked on LineChart: the segments average 45° (${onLine.mean.toFixed(1)}°, ratio ${onLine.ratio.toFixed(2)})`);
expect(Math.abs(onBox.mean - 45) < 2.5 && Math.abs(onBox.height - onLine.height) < 2, `banked on the container does the same (${onBox.mean.toFixed(1)}°)`);
expect(flatM.ratio > 0.9 && flatM.ratio < 1.15, `nearly flat data banks tall, held at 1 (${flatM.ratio.toFixed(2)})`);
expect(jaggedM.ratio > 3.6 && jaggedM.ratio < 4.4, `a sawtooth banks wide, held at 4, never a sliver (${jaggedM.ratio.toFixed(2)})`);
expect(/^2( \/ 1)?$/.test(plain.aspect), `without it the default aspect is 2 (${plain.aspect})`);

// Values that glide keep the height; new x values reset it.
const h0 = onLine.height, r0 = onLine.ratio;
await mount([{ rows: smooth.map((d) => ({ ...d, v: d.v * 1.6 - 20 })), line: { aspect: 'banked' } }]);
[onLine] = await measure();
expect(Math.abs(onLine.ratio - r0) < 0.03, `new values on the same x keep the ratio (${r0.toFixed(2)} → ${onLine.ratio.toFixed(2)})`);
await mount([{ rows: smooth.slice(0, 10).map((d, i) => ({ x: i, v: d.v * (i % 3 ? 1 : 1.4) })), line: { aspect: 'banked' } }]);
[onLine] = await measure();
expect(Math.abs(onLine.ratio - r0) > 0.1, `new x values bank afresh (${r0.toFixed(2)} → ${onLine.ratio.toFixed(2)})`);
void h0;

// The preview's revenue: before (aspect 1.9) and after.
const revenue = [61, 64, 63, 70, 74, 72, 79, 85, 83, 92, 98, 104].map((v, x) => ({ x, v: v * 1000 }));
await mount([{ rows: revenue, container: { aspect: 1.9 } }, { rows: revenue, container: { aspect: 'banked' } }]);
const [before, after] = await measure();
console.log(`  revenue: mean orientation ${before.mean.toFixed(1)}° at data ratio ${before.ratio.toFixed(2)} → ${after.mean.toFixed(1)}° at ${after.ratio.toFixed(2)}`);
expect(after.mean > before.mean && after.ratio >= 0.95 && after.ratio <= 4.05, 'banking the revenue steepens it toward 45°, within the 1–4 clamp');

const card = await page.evaluate(() => { const f = [...document.querySelectorAll('.alt-chart')].find((x) => /banked/.test(x.closest('.alt-card')?.textContent ?? '')); const p = f.querySelector('.alt-chart-plot'); return { aspect: p.style.aspectRatio, h: p.style.height }; });
expect(card.aspect === '' && parseFloat(card.h) > 0, `the banked preview's height is set by its data (${JSON.stringify(card)})`);

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
