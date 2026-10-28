// AreaChart: bands stack on the ground line in config order with no gradient anywhere, parted by 2px lines in the
// plot's colour with a 2px top line on the topmost; expand reaches 100% at every x; a single area is a translucent flat
// fill under its line; bands are named inside themselves; ↑ moves to the band above and a point names its share of the
// total; a change glides; the imprint is an area; contrast="more" and forced colours. Run after a render of every
// preview (it opens test/p-AreaChart-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

const open = async (media) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 900 } });
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-AreaChart-daylight.html`);
  await page.waitForTimeout(600);
  return page;
};
const read = (page) => page.evaluate(() => [...document.querySelectorAll('.alt-chart')].map((fig) => {
  const plot = fig.querySelector('.alt-chart-plot');
  const ground = plot.querySelector('.alt-chart-ground');
  const box = (el) => { const b = el.getBBox(); return { x: b.x, y: b.y, width: b.width, height: b.height }; };
  return {
    gradients: plot.querySelectorAll('linearGradient, radialGradient').length,
    fills: [...plot.querySelectorAll('.alt-area-fill')].map((p) => ({ key: p.dataset.series, fill: p.getAttribute('fill'), op: p.getAttribute('fill-opacity'), box: box(p) })),
    seps: [...plot.querySelectorAll('.alt-area-sep')].map((p) => ({ stroke: getComputedStyle(p).stroke, w: getComputedStyle(p).strokeWidth })),
    tops: [...plot.querySelectorAll('.alt-area-line')].map((p) => ({ key: p.dataset.series, w: p.getAttribute('stroke-width'), box: box(p) })),
    labels: [...plot.querySelectorAll('.alt-area-label')].map((t) => t.textContent),
    groundY: ground ? +ground.getAttribute('y1') : null,
    yTicks: [...plot.querySelectorAll('[data-axis="y"] text')].map((t) => t.textContent),
    bg: getComputedStyle(fig).getPropertyValue('--alt-chart-bg').trim(),
    cardBg: getComputedStyle(fig.closest('.alt-card')).backgroundColor,
  };
}));

{
  const page = await open();
  const [reqs, plans, storage] = await read(page);
  expect(reqs.gradients + plans.gradients + storage.gradients === 0, 'no gradient anywhere');
  expect(reqs.fills.map((f) => f.key).join() === 'us,eu,apac' && reqs.fills.every((f) => /^var\(--data-\d\)$/.test(f.fill) && f.op === null), `bands are flat data-* fills in config order (${reqs.fills.map((f) => f.fill)})`);
  expect(Math.abs(reqs.fills[0].box.y + reqs.fills[0].box.height - (reqs.groundY - 0.5)) < 1.5, 'the first band stands on the ground line');
  expect(reqs.seps.length === 2 && reqs.seps.every((s) => s.stroke === reqs.cardBg && s.w === '2px'), `bands are parted by 2px lines in the plot's own colour (${reqs.seps.map((s) => s.stroke + ' ' + s.w)} vs ${reqs.cardBg})`);
  expect(reqs.tops.length === 1 && reqs.tops[0].key === 'apac' && reqs.tops[0].w === '2', 'the topmost band has a 2px top line');
  expect(['US', 'EU', 'APAC'].every((l) => reqs.labels.includes(l)), `each band is named inside itself (${reqs.labels})`);
  expect(plans.yTicks[plans.yTicks.length - 1] === '100%' && plans.tops[0].box.height < 1, `expand: shares of 100%, the top edge flat at 100% (${plans.yTicks.at(-1)}, ${plans.tops[0].box.height.toFixed(2)})`);
  expect(storage.fills.length === 1 && storage.fills[0].op === '0.28' && storage.tops[0].w === '2' && storage.seps.length === 0, 'one area: a flat fill at reduced opacity under its 2px line');

  // Keyboard: into the points, ↑ to the band above, and each point names its share of the total.
  await page.locator('.alt-chart-node').first().focus();
  await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
  const name = () => page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  const first = await name();
  expect(/^[A-Z][a-z]{2} 1, 2026, US, [\d.]+K\. \d+% of [\d.]+K\. 1 of 14\.$/.test(first), `a point names its share of the total: "${first}"`);
  await page.keyboard.press('ArrowUp');
  const up = await name();
  expect(/, EU, /.test(up), `↑ moves to the band above: "${up}"`);
  await page.keyboard.press('ArrowDown');
  expect(/, US, /.test(await name()), '↓ moves back down');
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');

  // A change of data glides at one level (same x), rather than cross-fading.
  await page.getByRole('button', { name: 'Second week' }).click();
  await page.waitForTimeout(60);
  const stage = await page.evaluate(() => document.querySelector('.alt-chart-plot').getAttribute('data-stage'));
  expect(stage === 'values' || stage === 'rescale', `new values glide, staged (${stage})`);
  // The table view has a Total column for a stack.
  await page.getByRole('tab', { name: 'Table' }).click();
  await page.waitForTimeout(300);
  const heads = await page.evaluate(() => [...document.querySelectorAll('.alt-chart-tablebox th')].map((t) => t.textContent.trim()));
  expect(heads.includes('Total') && heads.includes('APAC'), `the table view has each band and a total (${heads})`);
  // While its data loads, an area chart's imprint is an area.
  const shape = await page.evaluate(async () => {
    const A = window.Altitude, el = document.createElement('div'); document.body.append(el);
    window.ReactDOM.createRoot(el).render(React.createElement(A.AltitudeProvider, null, React.createElement(A.ChartContainer, { config: { a: { label: 'A' } } }, React.createElement(A.AreaChart, { data: undefined, x: 'd' }))));
    await new Promise((r) => setTimeout(r, 600));
    return el.querySelector('.alt-chart-imprint')?.getAttribute('data-shape');
  });
  expect(shape === 'area', `the imprint is an area (${shape})`);
  await page.close();
}
{
  const page = await open();
  await page.evaluate(() => document.querySelectorAll('.alt-root').forEach((r) => r.setAttribute('data-contrast', 'more')));
  await page.waitForTimeout(100);
  const [reqs] = await read(page);
  expect(reqs.seps.every((s) => s.w === '3px'), `contrast="more": 3px separators (${reqs.seps.map((s) => s.w)})`);
  await page.close();
}
{
  const page = await open({ forcedColors: 'active' });
  const [reqs] = await read(page);
  expect(reqs.fills[0].fill === 'CanvasText' && reqs.fills.slice(1).every((f) => /^url\(#/.test(f.fill)) && new Set(reqs.fills.map((f) => f.fill)).size === 3, `forced colours: a different hatch per band (${reqs.fills.map((f) => f.fill)})`);
  await page.close();
}

await browser.close();
console.log(`area-chart: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
