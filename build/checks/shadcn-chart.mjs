// shadcn/ui chart on Altitude (#76): the example in examples/shadcn-chart, a shadcn ChartContainer over Recharts set up
// as Theming.md ("With shadcn/ui") says, is read back in all four schemes, each nested in a daylight page. Series wear
// data-1 … data-5 through --chart-*; the grid is line, the ground line ink-muted, ticks ink-muted and never a series
// colour; marks are flat (no gradient or filter); the readout is surface-floating at elev-3; the chart is keyboard
// reachable; under reduced motion nothing travels. Writes test/shot-ShadcnChart-<scheme>.png. Build the package and
// then the example first (npm run build; npm ci --prefix examples/shadcn-chart; node examples/shadcn-chart/build.mjs).
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
const APP = new URL('../../examples/shadcn-chart/out/index.html', import.meta.url).pathname;
if (!existsSync(APP)) throw new Error('Build the example first: node examples/shadcn-chart/build.mjs');
const SCHEMES = ['daylight', 'nightfall', 'mesa', 'alpine'];
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (media) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${APP}`);
  await page.waitForSelector('.recharts-bar-rectangle path');
  return { page, errors };
};
// Every colour as a panel's own tokens resolve it, so a nested scheme is measured where it's applied.
const read = (page) => page.evaluate((schemes) => schemes.map((scheme) => {
  const panel = document.querySelector(`section[data-scheme="${scheme}"]`);
  const resolve = (prop, v) => { const d = document.createElement('div'); d.style[prop] = v; panel.append(d); const c = getComputedStyle(d)[prop]; d.remove(); return c; };
  const c = (v) => resolve('color', v);
  const tokens = Object.fromEntries(['data-1', 'data-2', 'data-3', 'data-4', 'data-5', 'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5', 'line', 'ink-muted', 'surface-floating'].map((t) => [t, c(`var(--${t})`)]));
  const chart = (name) => panel.querySelector(`[data-chart-name="${name}"]`);
  const fills = (root, sel) => [...new Set([...root.querySelectorAll(sel)].map((e) => getComputedStyle(e).fill))];
  return {
    scheme, tokens, elev3: resolve('boxShadow', 'var(--elev-3)'),
    bars: ['web', 'ios', 'android'].map((_, i) => fills(chart('visits'), `.recharts-bar:nth-of-type(${i + 1}) .recharts-bar-rectangle path`)),
    barGroups: [...chart('visits').querySelectorAll('.recharts-bar')].map((g) => [...new Set([...g.querySelectorAll('.recharts-bar-rectangle path')].map((p) => getComputedStyle(p).fill))]),
    areas: [...chart('growth').querySelectorAll('.recharts-area-area')].map((p) => getComputedStyle(p).fill),
    legend: ['visits', 'growth'].map((n) => [...chart(n).querySelectorAll('.recharts-legend-wrapper div[style*="background"]')].map((d) => getComputedStyle(d).backgroundColor).sort()),
    grid: [...new Set([...panel.querySelectorAll('.recharts-cartesian-grid line')].map((l) => getComputedStyle(l).stroke))],
    ground: [...panel.querySelectorAll('.recharts-reference-line line')].map((l) => getComputedStyle(l).stroke),
    ticks: [...new Set([...panel.querySelectorAll('.recharts-cartesian-axis-tick-value')].map((t) => getComputedStyle(t).fill))],
    flat: !panel.querySelector('svg linearGradient, svg radialGradient, svg filter') && [...panel.querySelectorAll('.recharts-bar-rectangle path, .recharts-area-area')].every((e) => getComputedStyle(e).filter === 'none'),
    tabStops: [...panel.querySelectorAll('.recharts-surface')].map((s) => s.getAttribute('tabindex')),
  };
}), SCHEMES);

{
  const { page, errors } = await open();
  await page.waitForTimeout(1800);
  const panels = await read(page);
  for (const p of panels) {
    const t = p.tokens, s = p.scheme;
    expect([1, 2, 3, 4, 5].every((n) => t[`chart-${n}`] === t[`data-${n}`]), `${s}: --chart-1…5 resolve to the panel's data-1…5`);
    expect(p.barGroups.length === 3 && p.barGroups.every((f, i) => f.length === 1 && f[0] === t[`data-${i + 1}`]), `${s}: bars wear data-1, data-2, data-3 (${JSON.stringify(p.barGroups)})`);
    expect(p.areas.length === 2 && p.areas[0] === t['data-4'] && p.areas[1] === t['data-5'], `${s}: areas wear data-4, data-5 (${p.areas})`);
    expect(JSON.stringify(p.legend) === JSON.stringify([[t['data-1'], t['data-2'], t['data-3']].sort(), [t['data-4'], t['data-5']].sort()]), `${s}: legend keys wear the series colours (${JSON.stringify(p.legend)})`);
    expect(p.grid.length === 1 && p.grid[0] === t.line, `${s}: the grid is line (${p.grid})`);
    expect(p.ground.length === 2 && p.ground.every((g) => g === t['ink-muted']), `${s}: a ground line in ink-muted on each chart (${p.ground})`);
    expect(p.ticks.length === 1 && p.ticks[0] === t['ink-muted'], `${s}: tick text is ink-muted (${p.ticks})`);
    expect(p.ticks.every((f) => ![1, 2, 3, 4, 5].some((n) => f === t[`data-${n}`])), `${s}: no text wears a series colour`);
    expect(p.flat, `${s}: marks are flat (no gradient, no filter)`);
    expect(p.tabStops.length === 2 && p.tabStops.every((x) => x === '0'), `${s}: each chart is one tab stop (accessibilityLayer) (${p.tabStops})`);
  }
  // The schemes are really nested: each panel resolves its own palette, not the page's.
  expect(new Set(panels.map((p) => p.tokens['data-1'])).size === 4, `four schemes, four data-1s (${panels.map((p) => p.tokens['data-1'])})`);

  // The readout: surface-floating at elev-3, with the series named in ink, not its colour.
  for (const scheme of SCHEMES) {
    const bar = page.locator(`section[data-scheme="${scheme}"] [data-chart-name="visits"] .recharts-bar-rectangle path`).nth(4);
    await bar.hover();
    await page.waitForTimeout(250);
    const tip = await page.evaluate((scheme) => {
      const box = document.querySelector(`section[data-scheme="${scheme}"] [data-chart-name="visits"] .recharts-tooltip-wrapper > div`);
      if (!box) return null;
      const cs = getComputedStyle(box);
      return { bg: cs.backgroundColor, shadow: cs.boxShadow, text: box.textContent };
    }, scheme);
    const p = panels.find((x) => x.scheme === scheme);
    expect(tip && tip.bg === p.tokens['surface-floating'], `${scheme}: the readout is surface-floating (${tip?.bg} vs ${p.tokens['surface-floating']})`);
    expect(tip && tip.shadow.endsWith(p.elev3), `${scheme}: the readout casts elev-3`);
    expect(tip && /Web/.test(tip.text) && /iOS/.test(tip.text), `${scheme}: the readout names each series (${tip?.text})`);
    await page.mouse.move(0, 0);
  }

  // Hover is a promise: on these static charts the marks don't respond; the area chart gets a crosshair, not a dot.
  {
    const D = 'section[data-scheme="daylight"]';
    const fillsBefore = await page.evaluate((D) => [...document.querySelectorAll(`${D} .recharts-bar-rectangle path`)].map((p) => getComputedStyle(p).fill).join(), D);
    await page.locator(`${D} [data-chart-name="visits"] .recharts-bar-rectangle path`).nth(4).hover();
    await page.waitForTimeout(250);
    const bar = await page.evaluate((D) => ({ band: !!document.querySelector(`${D} [data-chart-name="visits"] .recharts-tooltip-cursor`), fills: [...document.querySelectorAll(`${D} .recharts-bar-rectangle path`)].map((p) => getComputedStyle(p).fill).join() }), D);
    expect(!bar.band && bar.fills === fillsBefore, `hovering a bar draws no band and changes no mark (band ${bar.band})`);
    const box = await page.locator(`${D} [data-chart-name="growth"] .recharts-surface`).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
    await page.waitForTimeout(250);
    const area = await page.evaluate((D) => { const c = document.querySelector(`${D} [data-chart-name="growth"] .recharts-tooltip-cursor`); const d = document.createElement('div'); d.style.color = 'var(--ink-muted)'; document.querySelector(D).append(d); const ink = getComputedStyle(d).color; d.remove(); return { cross: c && getComputedStyle(c).stroke, ink, dots: document.querySelectorAll(`${D} [data-chart-name="growth"] .recharts-active-dot`).length }; }, D);
    expect(area.cross === area.ink && area.dots === 0, `hovering the area chart draws an ink-muted crosshair and no active dot (${area.cross}, ${area.dots} dots)`);
    await page.mouse.move(0, 0);
  }

  // Keyboard: Recharts' accessibility layer moves the readout with the arrow keys.
  await page.locator('section[data-scheme="daylight"] [data-chart-name="visits"] .recharts-surface').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(250);
  const keyed = await page.evaluate(() => document.querySelector('section[data-scheme="daylight"] [data-chart-name="visits"] .recharts-tooltip-wrapper > div')?.textContent ?? '');
  expect(/Web/.test(keyed), `an arrow key shows the readout (${keyed})`);

  for (const scheme of SCHEMES) await page.locator(`section[data-scheme="${scheme}"]`).screenshot({ path: `${T}shot-ShadcnChart-${scheme}.png` });
  expect(errors.length === 0, `no page or console errors (${errors.join(' | ')})`);
  await page.context().close();
}

// Reduced motion: the bars are at their values on the first frame; nothing grows from the baseline.
{
  const { page } = await open({ reducedMotion: 'reduce' });
  const heights = () => page.evaluate(() => [...document.querySelectorAll('.recharts-bar-rectangle path')].map((p) => Math.round(p.getBoundingClientRect().height)).join(','));
  const first = await heights();
  await page.waitForTimeout(1800);
  expect(first === await heights(), 'reduced motion: bars are at their values at once');
  await page.context().close();
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
