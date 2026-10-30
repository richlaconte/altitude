// The keyboard path through a chart (#63): one Tab stop; summary → series → points with Enter, back with Escape;
// arrows, Home/End and Page Up/Down inside each level; names that say the value, the change and the place; the readout
// opens on the focused point and its ring sits on the mark. Checked on LineChart (several series and one), BarChart
// (stacked and horizontal) and hand-drawn marks. Run after a render of every preview; exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 900 } });
const focused = () => page.evaluate(() => {
  const a = document.activeElement;
  return { name: a.getAttribute('aria-label') ?? a.textContent, level: a.dataset?.level ?? null, role: a.getAttribute('aria-roledescription'), chart: [...document.querySelectorAll('.alt-chart-plot')].indexOf(a.closest('.alt-chart-plot')) };
});
const press = async (...keys) => { for (const k of keys) await page.keyboard.press(k); await page.waitForTimeout(40); return focused(); };
const tabbable = (i) => page.evaluate((i) => document.querySelectorAll('.alt-chart-plot')[i].querySelectorAll('[tabindex="0"]').length, i);

// LineChart with two series.
await page.goto(`file://${T}p-LineChart-daylight.html`);
await page.waitForTimeout(700);
let f = await press('Tab');
expect(f.level === 'summary' && f.role === 'chart' && /p50 .*Press Enter to explore the series\.$/.test(f.name), `Tab lands on the chart's summary: ${f.name.slice(0, 60)}…`);
expect((await tabbable(0)) === 1, 'the chart is one Tab stop');
f = await press('Enter');
expect(f.level === 'series' && f.role === 'series' && /^p50, 49 points, \d+ ms to \d+ ms, (rising|falling|flat)\. 1 of 2\.$/.test(f.name), `Enter goes to the series: ${f.name}`);
f = await press('ArrowRight');
expect(/^p95, .* 2 of 2\.$/.test(f.name), `→ moves to the next series: ${f.name}`);
const dim = await page.evaluate(() => [...document.querySelectorAll('.alt-chart-plot')[0].querySelectorAll('.alt-line')].map((g) => g.dataset.series + ':' + (g.getAttribute('opacity') ?? '1')).join());
expect(dim === 'p50:0.3,p95:1', `the other series recede while one is focused: ${dim}`);
f = await press('Enter');
expect(f.level === 'point' && f.role === 'data point' && /^Mar 14, 12:00 AM, p95, \d+ ms\. 1 of 49\.$/.test(f.name), `Enter goes to its points: ${f.name}`);
f = await press('ArrowRight');
expect(/^Mar 14, 12:30 AM, p95, \d+ ms\. (Up|Down) \d+% from Mar 14, 12:00 AM\. 2 of 49\.$|Same as/.test(f.name), `→ moves along x and says the change: ${f.name}`);
const ring = await page.evaluate(() => {
  const n = document.activeElement.getBoundingClientRect(), r = document.querySelectorAll('.alt-chart-plot')[0].querySelector('.alt-chart-readout');
  const m = [...document.querySelectorAll('.alt-chart-plot')[0].querySelectorAll('.alt-line-active')].map((c) => c.getBoundingClientRect());
  return { readout: r?.dataset.state, dist: Math.min(...m.map((b) => Math.hypot(b.x + b.width / 2 - (n.x + n.width / 2), b.y + b.height / 2 - (n.y + n.height / 2)))) };
});
expect(ring.readout === 'open' && ring.dist < 1.5, `the readout opens on the focused point and the ring sits on its mark (${ring.dist.toFixed(2)}px)`);
f = await press('ArrowDown');
expect(/^Mar 14, 12:30 AM, p50, /.test(f.name), `↓ stays at x and moves to the other series: ${f.name}`);
f = await press('End');
expect(/49 of 49\.$/.test(f.name), `End goes to the last x: ${f.name.slice(-12)}`);
f = await press('PageUp');
expect(/44 of 49\.$/.test(f.name), `Page Up goes back 10% of the range: ${f.name.slice(-12)}`);
f = await press('Home');
expect(/1 of 49\.$/.test(f.name), 'Home goes to the first x');
f = await press('Escape');
expect(f.level === 'series' && f.name.startsWith('p50'), `Escape goes back to the series: ${f.name.slice(0, 20)}`);
f = await press('Escape');
expect(f.level === 'summary', 'Escape again goes back to the summary');
expect((await tabbable(0)) === 1, 'still one Tab stop');
f = await press('Tab');
expect(f.chart === 1 && f.level === 'summary', 'Tab leaves the chart in one press');

// A single series skips the series level.
f = await press('Enter');
expect(f.level === 'point' && /^Jul 1, 2025, Revenue, \$61K\. 1 of 12\.$/.test(f.name), `one series: Enter goes straight to its points: ${f.name}`);
f = await press('Escape');
expect(f.level === 'summary' && f.name.startsWith('Revenue rose 70%'), 'Escape goes back to the summary, which is the written one');

// Moving off the chart closes the readout.
await press('Tab', 'Tab', 'Tab');
expect(await page.evaluate(() => !document.querySelectorAll('.alt-chart-plot')[0].querySelector('.alt-chart-readout[data-state="open"]')), 'leaving the chart closes its readout');

// BarChart: stacked points say their total; horizontal points sit on their bar's end.
await page.goto(`file://${T}p-BarChart-daylight.html`);
await page.waitForTimeout(700);
await page.locator('.alt-chart-plot').nth(2).locator('[tabindex="0"]').focus();
// The preview focuses Web (#188), so it's the first series on the keyboard path.
f = await press('Enter', 'Enter');
expect(/^Jan, Web, 14\. Total 40\. 1 of 6\.$/.test(f.name), `a stacked bar's point says its total: ${f.name}`);
await page.locator('.alt-chart-plot').nth(5).locator('[tabindex="0"]').focus();
f = await press('Enter');
// The preview compares against Q2 (#189), so the name says the change too.
expect(/^North America, Seats, 1,240\. Up 11% from Q2\. 1 of 4\.$/.test(f.name), `horizontal bars: ${f.name}`);
const end = await page.evaluate(() => {
  const n = document.activeElement.getBoundingClientRect(), bar = document.querySelectorAll('.alt-chart-plot')[5].querySelector('.alt-bar path').getBoundingClientRect();
  return { dx: Math.abs(n.x + n.width / 2 - bar.right), dy: Math.abs(n.y + n.height / 2 - (bar.y + bar.height / 2)) };
});
expect(end.dx < 1.5 && end.dy < 1.5, `its ring sits on the bar's end (${end.dx.toFixed(1)}, ${end.dy.toFixed(1)})`);

// Hand-drawn marks get the path too, from the container alone.
await page.goto(`file://${T}p-ChartContainer-daylight.html`);
await page.waitForTimeout(700);
f = await press('Tab', 'Enter', 'Enter');
expect(f.level === 'point' && /^Jan 1, 2026, Revenue, \$8\.2K\. 1 of 6\.$/.test(f.name), `hand-drawn marks: ${f.name}`);

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
