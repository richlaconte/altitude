// Filter in place (#70): misses recede to 35% and keep their place and colour slot; the axis holds unless `rescale`,
// whose rescale is staged; the frame and the summary say how many match; a change cross-fades; misses say "Not
// matching" in their names and the readout, and their value labels turn ink-muted; lines and areas recede per
// record without changing shape; BarList counts too; forced colours draw misses in GrayText; charts without a
// filter are unchanged. Run after a render of every preview (it opens test/p-ChartFilter-daylight.html).
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (name = 'ChartFilter', media) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 1200 } });
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-${name}-daylight.html`);
  await page.waitForTimeout(600);
  return page;
};
const read = (page) => page.evaluate(() => [...document.querySelectorAll('.alt-card')].map((card) => {
  const plot = card.querySelector('.alt-chart-plot');
  return {
    bars: plot ? [...plot.querySelectorAll('.alt-bar-mark')].map((b) => ({ cat: b.dataset.category, fill: b.getAttribute('fill'), x: Math.round(b.getBBox().x), miss: b.closest('.alt-chart-rel')?.hasAttribute('data-miss') ?? null, op: +getComputedStyle(b.closest('.alt-chart-rel') ?? b).opacity, computedFill: getComputedStyle(b).fill })) : [],
    groups: plot ? [...plot.querySelectorAll('.alt-chart-rel')].map((g) => ({ miss: g.hasAttribute('data-miss'), d: g.querySelector('.alt-line-stroke, .alt-area-fill')?.getAttribute('d') ?? null })) : [],
    yTicks: plot ? [...plot.querySelectorAll('[data-axis="y"] text')].map((t) => t.textContent) : [],
    count: card.querySelector('.alt-chart-count')?.textContent ?? null,
    summary: card.querySelector('figcaption')?.textContent ?? '',
    labels: plot ? [...plot.querySelectorAll('.alt-bar-label')].map((t) => ({ text: t.textContent, miss: t.classList.contains('alt-bar-label-miss'), fill: getComputedStyle(t).fill })) : [],
    rows: [...card.querySelectorAll('.alt-barlist-row')].map((r) => r.dataset.relevance ?? null),
    stage: plot?.getAttribute('data-stage') ?? null,
  };
}));
const colour = (page, v) => page.evaluate((v) => { const d = document.createElement('div'); d.style.color = v; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }, v);

{
  const page = await open();
  let [svc, days, regions, pages] = await read(page);
  const missed = svc.bars.filter((b) => b.miss), hit = svc.bars.filter((b) => !b.miss);
  expect(hit.map((b) => b.cat).join() === 'api,search,auth' && hit.every((b) => b.op === 1) && missed.every((b) => Math.abs(b.op - 0.35) < 0.01), `matches full, misses at 35% (${svc.bars.map((b) => `${b.cat}:${b.op}`)})`);
  expect(svc.bars.every((b) => b.fill === 'var(--data-1)'), 'misses keep their colour slot');
  expect(svc.count === '3 of 8 services match' && /3 of 8 services match\.$/.test(svc.summary), `the frame and the summary say how many match (${svc.count})`);
  const ticks = svc.yTicks.join(), xs = svc.bars.map((b) => b.x).join();
  // A change cross-fades over dur-travel-1, and positions and the axis hold.
  await page.getByRole('button', { name: 'Web', exact: true }).click();
  const mid = [];
  for (let i = 0; i < 6; i++) { mid.push(await page.evaluate(() => +getComputedStyle(document.querySelector('.alt-bar-mark[data-category="web"]').closest('.alt-chart-rel')).opacity)); await page.waitForTimeout(20); }
  await page.waitForTimeout(300);
  [svc] = await read(page);
  expect(mid.some((v) => v > 0.36 && v < 0.99), `misses cross-fade (${mid.map((v) => v.toFixed(2))})`);
  expect(svc.bars.map((b) => b.x).join() === xs && svc.yTicks.join() === ticks, 'positions and the axis hold while the filter changes');
  expect(svc.count === '2 of 8 services match', `the count follows (${svc.count})`);
  const api = svc.labels.find((l) => l.text === '412');
  expect(api?.miss && api.fill === await colour(page, 'var(--ink-muted)'), `a miss's value label is ink-muted (${JSON.stringify(api)})`);
  // Its name and the readout say "Not matching".
  await page.locator('.alt-chart-node').first().focus();
  await page.keyboard.press('Enter');
  const name = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  expect(/^api, Requests, 412\. Not matching\. 1 of 8\.$/.test(name), `a miss says so in its name (${name})`);
  const note = await page.evaluate(() => document.querySelector('.alt-chart-readout-note')?.textContent);
  expect(note === 'Not matching', `and in the readout (${note})`);
  await page.keyboard.press('Escape');
  // Rescale: the axis fits the matches, staged.
  await page.getByRole('button', { name: 'Payments', exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByRole('switch', { name: 'Fit the axis to the matches' }).click();
  const stages = new Set();
  for (let i = 0; i < 20; i++) { const s = await page.evaluate(() => document.querySelector('.alt-chart-plot').getAttribute('data-stage')); if (s) stages.add(s); await page.waitForTimeout(20); }
  await page.waitForTimeout(400);
  [svc] = await read(page);
  expect(svc.yTicks.at(-1) !== ticks.split(',').at(-1) && stages.has('rescale'), `rescale fits the matches, staged (${svc.yTicks}, ${[...stages]})`);
  // All: the filter is off, and so is the count.
  await page.getByRole('button', { name: 'All', exact: true }).first().click();
  await page.waitForTimeout(300);
  [svc] = await read(page);
  expect(svc.count === null && svc.bars.every((b) => b.op === 1), 'with no filter, nothing recedes and there is no count');

  // Lines and areas recede per record without changing shape.
  expect(days.groups.length === 21 && days.groups.filter((g) => g.miss).length === 6 && new Set(days.groups.map((g) => g.d)).size === 1, `a line recedes around each miss, its path unchanged (${days.groups.length}, ${days.groups.filter((g) => g.miss).length} misses)`);
  expect(days.count === '15 of 21 match', `the line's frame counts (${days.count})`);
  expect(regions.groups.length === 12 && regions.groups.filter((g) => !g.miss).length === 3, `an area recedes per record (${regions.groups.filter((g) => !g.miss).length} of ${regions.groups.length} match)`);
  // BarList counts too, and its rows rise and sink as before.
  expect(pages.count === '2 of 5 pages match' && pages.rows.join() === 'miss,match,miss,match,miss', `BarList says how many match (${pages.count}, ${pages.rows})`);
  await page.close();
}

// Forced colours: a miss is GrayText at full strength rather than faded CanvasText.
{
  const page = await open('ChartFilter', { forcedColors: 'active' });
  const [svc] = await read(page);
  const web = svc.bars.find((b) => b.cat === 'web');
  const gray = await colour(page, 'GrayText');
  expect(web.op === 1 && web.computedFill === gray, `forced: misses are GrayText at full strength (${web.computedFill} vs ${gray}, ${web.op})`);
  await page.close();
}

// Charts without a filter are unchanged.
{
  const page = await open('BarChart');
  const n = await page.evaluate(() => document.querySelectorAll('.alt-chart-rel, .alt-chart-count').length);
  expect(n === 0, `BarChart without relevance draws as before (${n})`);
  await page.close();
}

await browser.close();
console.log(`chart-filter: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
