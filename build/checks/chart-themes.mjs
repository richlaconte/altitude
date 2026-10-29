// altitude-design/chart-themes (#77): echartsTheme and chartjsDefaults read each scheme's tokens (no ECharts or
// Chart.js needed): series in data-1 … data-6 then data-other, text in ink, axes in line-control, split lines in line,
// the readout on surface-floating at elev-3, the sequential ramp for visualMap, dur-travel-3 animation that is zero
// under reduced motion (the system's or AltitudeProvider's), decals under forced colours or with patterns, and the
// same object from tokens passed by name as from an element. A custom accent re-leads the palette, and useChartTheme
// re-reads it when the provider's scheme or accent changes. Run after the one-time setup (test/tokens.css).
import { chromium } from 'playwright-core';
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = fileURLToPath(new URL('../test/', import.meta.url));
const SRC = fileURLToPath(new URL('../../project/components/src/', import.meta.url));
const tokens = JSON.parse(readFileSync(new URL('../../project/tokens.json', import.meta.url), 'utf8'));
const SCHEMES = tokens.color.themes.map((t) => t.id);
const value = (name, scheme) => {
  for (const fam of ['color', 'shadow']) {
    const tok = tokens[fam].tokens.find((t) => t.name === name);
    if (tok) { const v = typeof tok.value === 'string' ? tok.value : tok.value[scheme] ?? tok.value[SCHEMES[0]]; return v; }
  }
};
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const entry = `
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { AltitudeProvider } from '${SRC}index.tsx';
import * as themes from '${SRC}chart-themes.tsx';
window.themes = themes;
function Probe() {
  const ref = React.useRef(null);
  const theme = themes.useChartTheme(themes.echartsTheme, ref);
  React.useEffect(() => { window.hookThemes.push(theme); }, [theme]);
  return React.createElement('div', { ref, id: 'probe' });
}
window.hookThemes = [];
function App() {
  const [scheme, setScheme] = React.useState('daylight');
  const [accent, setAccent] = React.useState(undefined);
  window.setScheme = setScheme; window.setAccent = setAccent;
  return React.createElement(AltitudeProvider, { scheme, accent }, React.createElement(Probe));
}
createRoot(document.getElementById('root')).render(React.createElement(App));
`;
const out = await build({ stdin: { contents: entry, resolveDir: SRC, loader: 'jsx' }, bundle: true, write: false, format: 'iife', target: 'es2020',
  jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment', define: { 'process.env.NODE_ENV': '"production"' }, minify: true, logLevel: 'error',
  nodePaths: [fileURLToPath(new URL('../node_modules/', import.meta.url))] });
const css = readFileSync(`${T}tokens.css`, 'utf8') + readFileSync(new URL('../../project/components/bundle.css', import.meta.url), 'utf8').replace(/^@import[^\n]*\n/, '');
writeFileSync(`${T}chart-themes.js`, out.outputFiles[0].text);
writeFileSync(`${T}chart-themes.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>chart-themes</title><style>${css}</style></head><body>
${SCHEMES.map((s) => `<div class="scheme" data-theme="${s}"></div>`).join('')}
<div data-motion="reduced"><div id="motion-reduced"></div></div><div data-motion="full"><div id="motion-full"></div></div>
<div id="root"></div><script src="./chart-themes.js"></script></body></html>`);

const open = async (media) => {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}chart-themes.html`);
  await page.waitForFunction(() => window.hookThemes?.some(Boolean));
  return { page, errors };
};

// Each scheme, read from an element, against tokens.json.
{
  const { page, errors } = await open();
  const read = await page.evaluate(() => [...document.querySelectorAll('.scheme')].map((el) => ({ scheme: el.dataset.theme, e: themes.echartsTheme(el), c: themes.chartjsDefaults(el), colors: themes.dataColors(el), t: themes.readChartTokens(el) })));
  for (const { scheme, e, c, colors, t } of read) {
    const v = (n) => value(n, scheme);
    const cat = ['data-1', 'data-2', 'data-3', 'data-4', 'data-5', 'data-6', 'data-other'].map(v);
    expect(same(e.color, cat), `${scheme}: ECharts color is data-1 … data-6, data-other (${e.color})`);
    expect(same(colors, cat), `${scheme}: dataColors is the same list`);
    expect(e.textStyle.color === v('ink') && e.textStyle.fontFamily === t['font-sans'] && /Instrument Sans/.test(e.textStyle.fontFamily), `${scheme}: text in ink, --font-sans`);
    for (const axis of ['categoryAxis', 'valueAxis', 'timeAxis', 'logAxis']) {
      expect(e[axis].axisLine.lineStyle.color === v('line-control') && e[axis].splitLine.lineStyle.color[0] === v('line') && e[axis].axisLabel.color === v('ink-muted'), `${scheme}: ${axis} lines line-control, split lines line, labels ink-muted`);
    }
    expect(e.tooltip.backgroundColor === v('surface-floating') && e.tooltip.textStyle.color === v('ink'), `${scheme}: the readout on surface-floating in ink`);
    expect(e.tooltip.extraCssText.includes(`box-shadow: ${v('elev-3')}`), `${scheme}: the readout casts elev-3`);
    expect(same(e.visualMap.inRange.color, [1, 2, 3, 4, 5, 6, 7].map((n) => v(`data-seq-${n}`))), `${scheme}: visualMap reads the sequential ramp`);
    expect(e.aria.enabled === true && e.aria.decal.show === false, `${scheme}: aria on, decals off by default`);
    expect(e.animation === true && e.animationDuration === 220 && e.animationDurationUpdate === 220, `${scheme}: dur-travel-3 animation (${e.animationDuration})`);
    expect(e.backgroundColor === 'transparent', `${scheme}: the chart's ground is the page's`);
    expect(c.color === v('ink-muted') && c.scale.grid.color === v('line') && c.scale.border.color === v('line-control') && c.scale.ticks.color === v('ink-muted'), `${scheme}: Chart.js text ink-muted, grid line, border line-control`);
    expect(c.plugins.tooltip.backgroundColor === v('surface-floating') && c.plugins.tooltip.bodyColor === v('ink') && c.plugins.legend.labels.color === v('ink'), `${scheme}: Chart.js readout surface-floating, legend in ink`);
    expect(c.animation.duration === 220 && c.font.family === t['font-sans'], `${scheme}: Chart.js dur-travel-3 and --font-sans`);
    // The same objects from tokens passed by name: no DOM needed.
    const byName = await page.evaluate((t) => [themes.echartsTheme(t), themes.chartjsDefaults(t)], t);
    expect(same(byName[0], e) && same(byName[1], c), `${scheme}: tokens by name give the same theme as the element`);
  }
  expect(new Set(read.map((r) => r.e.color[0])).size === SCHEMES.length, 'each scheme has its own data-1');
  // AltitudeProvider's motion prop beats the system setting either way.
  const motion = await page.evaluate(() => [themes.echartsTheme(document.getElementById('motion-reduced')).animationDuration, themes.echartsTheme(document.getElementById('motion-full')).animationDuration]);
  expect(motion[0] === 0 && motion[1] === 220, `motion="reduced" zeroes animation; "full" keeps it (${motion})`);
  const patterns = await page.evaluate(() => themes.echartsTheme(document.querySelector('.scheme'), { patterns: true }).aria.decal.show);
  expect(patterns === true, 'patterns: true turns decals on');
  expect(errors.length === 0, `no page errors (${errors})`);

  // useChartTheme follows the provider: scheme, then accent.
  const last = () => page.evaluate(() => { const t = window.hookThemes.filter(Boolean); return { n: t.length, first: t[t.length - 1].color[0], root: getComputedStyle(document.querySelector('.alt-root')).getPropertyValue('--data-1').trim() }; });
  const start = await last();
  expect(start.first === value('data-1', 'daylight'), `the hook reads daylight first (${start.first})`);
  await page.evaluate(() => window.setScheme('nightfall'));
  await page.waitForTimeout(200);
  const night = await last();
  expect(night.first === value('data-1', 'nightfall') && night.n === start.n + 1, `the hook re-reads when the scheme changes (${night.first}, ${night.n} reads)`);
  await page.evaluate(() => window.setAccent('#0f8a6b'));
  await page.waitForTimeout(200);
  const accent = await last();
  expect(accent.first === accent.root && accent.first !== night.first, `the hook re-reads a custom accent's palette (${accent.first}, root ${accent.root})`);
  await page.evaluate(() => window.setAccent(undefined));
  await page.waitForTimeout(200);
  expect((await last()).first === value('data-1', 'nightfall'), 'and again when the accent is removed');
  await page.close();
}

// The system's reduced motion and forced colours, read from the element's window.
{
  const { page } = await open({ reducedMotion: 'reduce' });
  const r = await page.evaluate(() => { const el = document.querySelector('.scheme'); return { e: themes.echartsTheme(el), c: themes.chartjsDefaults(el), full: themes.echartsTheme(document.getElementById('motion-full')).animationDuration }; });
  expect(r.e.animation === false && r.e.animationDuration === 0 && r.e.animationDurationUpdate === 0, 'reduced motion: ECharts animation off, durations 0');
  expect(r.c.animation === false, 'reduced motion: Chart.js animation off');
  expect(r.full === 220, 'motion="full" overrides the system setting');
  await page.close();
}
{
  const { page } = await open({ forcedColors: 'active' });
  const show = await page.evaluate(() => themes.echartsTheme(document.querySelector('.scheme')).aria.decal.show);
  expect(show === true, 'forced colours: decals on');
  await page.close();
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
