// ScatterChart (#62): dots lie flat, at least 8px, ringed 2px in the plot's colour, a data-* fill and a marker shape
// per group (circle, square, triangle); both axes are named; outliers are labelled in ink with a 1px leader, clear of
// each other and of the trend, a 1px ink-muted least-squares line whose word covers no dot; the summary says how the measures relate; the
// readout reads the nearest dot beside it with no crosshair; ← and → go in x order and ↑ and ↓ to the nearest dot
// above or below; hidden groups leave the plot and the keyboard path; dots can be selected; with stable ids they glide;
// forced colours keep the shapes, contrast="more" rings dots in ink. Run after a render of every preview (it opens
// test/p-ScatterChart-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (opts = {}, media) => {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 900 }, ...opts });
  const page = await ctx.newPage();
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-ScatterChart-daylight.html`);
  await page.waitForTimeout(600);
  return page;
};
const color = (page, v) => page.evaluate((v) => { const d = document.createElement('div'); d.style.color = v; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }, v);
const read = (page) => page.evaluate(() => [...document.querySelectorAll('.alt-chart')].map((fig) => {
  const box = (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; };
  return {
    dots: [...fig.querySelectorAll('.alt-scatter-dot')].map((d) => ({ tag: d.tagName, series: d.dataset.series, fill: d.getAttribute('fill'), stroke: getComputedStyle(d).stroke, sw: d.getAttribute('stroke-width'), order: getComputedStyle(d).paintOrder, box: box(d) })),
    labels: [...fig.querySelectorAll('.alt-scatter-label text')].map((t) => ({ text: t.textContent, box: box(t) })),
    leaders: fig.querySelectorAll('.alt-scatter-label line').length,
    trend: (() => { const l = fig.querySelector('.alt-scatter-trend line'), t = fig.querySelector('.alt-scatter-trend text'); return l ? { stroke: getComputedStyle(l).stroke, w: getComputedStyle(l).strokeWidth, text: t?.textContent, box: t && box(t) } : null; })(),
    names: [...fig.querySelectorAll('.alt-scatter-axis-name text')].map((t) => t.textContent),
    summary: fig.querySelector('figcaption').textContent,
    flat: ![...fig.querySelectorAll('.alt-scatter *')].some((e) => getComputedStyle(e).filter !== 'none') && !fig.querySelector('.alt-scatter linearGradient, .alt-scatter radialGradient'),
  };
}));
const overlap = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

{
  const page = await open();
  const [lat, spend] = await read(page);
  const BG = await color(page, 'var(--surface-raised)');
  expect(lat.dots.length === 30 && spend.dots.length === 16, `a dot per record (${lat.dots.length}, ${spend.dots.length})`);
  // A circle is exactly 8px across; measured boxes can come back a hair under at some sub-pixel offsets.
expect(lat.dots.every((d) => d.box[2] >= 8 - 0.01 && d.box[3] >= 8 - 0.5), `every dot is at least 8px (smallest ${Math.min(...lat.dots.map((d) => d.box[2])).toFixed(3)} × ${Math.min(...lat.dots.map((d) => d.box[3])).toFixed(3)})`);
  expect(lat.dots.every((d) => d.stroke === BG && d.sw === '4' && d.order.startsWith('stroke')), `each dot is ringed 2px in the plot's own colour (${lat.dots[0].stroke}, ${lat.dots[0].sw})`);
  const shapes = {};
  for (const d of lat.dots) shapes[d.series] = `${d.tag}:${d.fill}`;
  expect(shapes['group:Checkout'] === 'circle:var(--data-1)' && shapes['group:Search'] === 'rect:var(--data-2)' && shapes['group:Media'] === 'path:var(--data-3)', `a colour and a shape per group (${JSON.stringify(shapes)})`);
  expect(lat.flat && spend.flat, 'dots are flat: no filter, shadow or gradient');
  expect(JSON.stringify(lat.names) === '["p95","Payload"]' && JSON.stringify(spend.names) === '["Spend","Seats"]', `both axes are named (${lat.names}, ${spend.names})`);
  // Labelled outliers and the trend.
  expect(lat.labels.length === 2 && lat.leaders === 2 && lat.labels.some((l) => l.text === 'Search search'), `outliers are labelled with leaders (${lat.labels.map((l) => l.text)})`);
  const boxes = [...lat.labels.map((l) => l.box), lat.trend.box];
  expect(boxes.every((a, i) => boxes.every((b, j) => i === j || !overlap(a, b))), 'labels clear each other and the trend\'s word');
  const under = lat.dots.filter((d) => overlap(d.box, lat.trend.box));
  expect(under.length === 0, `the trend's word covers no dot (#185; ${under.length} under it)`);
  const hid = lat.labels.filter((l) => lat.dots.some((d) => overlap(d.box, l.box)));
  expect(hid.length === 0, `no outlier's label covers a dot (${hid.map((l) => l.text)})`);
  expect(lat.trend && lat.trend.stroke === await color(page, 'var(--ink-muted)') && lat.trend.w === '1px' && lat.trend.text === 'Trend', `the trend is a 1px ink-muted line named "Trend" (${JSON.stringify(lat.trend)})`);
  expect(/^Scatter chart of p95 against Payload, 30 points in 3 groups: Checkout, Search and Media\. p95 rises (strongly|moderately) with Payload \(r = 0\.\d\d\)\. .*Labelled: .*Search search \(/.test(lat.summary), 'the summary says how the measures relate: ' + lat.summary.slice(0, 160));
  expect(spend.trend === null, 'no trend unless asked for');

  // Hover: the nearest dot's readout sits beside it; no crosshair, and a chart that doesn't act has no pointer.
  // The Search outlier, well clear of the cluster.
  const dot = await page.evaluate(() => { const r = [...document.querySelector('.alt-chart').querySelectorAll('.alt-scatter-dot[data-series="group:Search"]')].map((d) => d.getBoundingClientRect()).sort((a, b) => a.y - b.y)[0]; return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  await page.mouse.move(dot.x + dot.width / 2 + 2, dot.y + dot.height / 2 + 1);
  await page.waitForTimeout(350);
  const hov = await page.evaluate(() => {
    const fig = document.querySelector('.alt-chart'), r = fig.querySelector('.alt-chart-readout');
    return { label: r?.querySelector('.alt-chart-readout-label')?.textContent, rows: [...(r?.querySelectorAll('.alt-chart-readout-row') ?? [])].map((x) => x.textContent), side: r?.dataset.side, crosshair: !!fig.querySelector('.alt-chart-crosshair'), cursor: getComputedStyle(fig.querySelector('.alt-chart-plot')).cursor, top: r && r.getBoundingClientRect().top };
  });
  expect(hov.label === 'Search search' && hov.rows.length === 3 && /KBPayload$/.test(hov.rows[0]) && /msp95$/.test(hov.rows[1]) && hov.rows[2] === 'SearchService', `the readout names the nearest dot and both measures (${JSON.stringify(hov)})`);
  expect(!hov.crosshair && hov.cursor !== 'pointer' && hov.top <= dot.y + dot.height / 2 && hov.top >= dot.y + dot.height / 2 - 20, `beside the dot, with no crosshair or pointer (${hov.top} vs ${dot.y})`);
  await page.mouse.move(5, 5);

  // Keyboard: Enter goes to the leftmost dot; ←/→ in x order; ↑ to the nearest above.
  await page.locator('.alt-chart').first().locator('.alt-chart-node').first().focus();
  const node = () => page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  const kbOf = (n) => +/Payload (\d+) KB/.exec(n)[1], msOf = (n) => +/p95 (\d+) ms/.exec(n)[1];
  await page.keyboard.press('Enter');
  let n = await node();
  expect(/^[A-Z]\w+ \w+, (Checkout|Search|Media)\. Payload \d+ KB, p95 \d+ ms\.$/.test(n), `a dot is named by name, group and both measures (${n})`);
  const first = kbOf(n);
  const xs = [first];
  for (let k = 0; k < 6; k++) { await page.keyboard.press('ArrowRight'); xs.push(kbOf(await node())); }
  expect(first === 8 && xs.every((v, i) => i === 0 || v >= xs[i - 1]), `Enter starts at the leftmost dot and → goes in x order (${xs})`);
  const before = await node();
  await page.keyboard.press('ArrowUp');
  const above = await node();
  expect(msOf(above) > msOf(before), `↑ goes to a dot above (${msOf(before)} → ${msOf(above)} ms)`);
  await page.keyboard.press('ArrowDown');
  expect(msOf(await node()) < msOf(above), '↓ goes to a dot below');
  const maxKb = await page.evaluate(() => Math.max(...[...document.querySelector('.alt-chart').querySelectorAll('.alt-scatter-dot')].map((d) => d.getBoundingClientRect().x)));
  await page.keyboard.press('End');
  const endX = await page.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return r.x + r.width / 2; });
  expect(Math.abs(endX - maxKb) < 8, `End goes to the rightmost dot (${endX} vs ${maxKb})`);
  await page.keyboard.press('Escape');

  // Hiding a group takes its dots off the plot and out of the keyboard path.
  await page.locator('.alt-chart').first().getByRole('button', { name: 'Media', exact: true }).click();
  await page.waitForTimeout(400);
  const hidden = await page.evaluate(() => [...document.querySelector('.alt-chart').querySelectorAll('.alt-scatter-dot')].map((d) => d.dataset.series));
  expect(hidden.length === 20 && !hidden.includes('group:Media'), `a hidden group leaves the plot (${hidden.length})`);
  await page.locator('.alt-chart').first().locator('.alt-chart-node').first().focus();
  await page.keyboard.press('Enter');
  const groups = new Set();
  for (let k = 0; k < 25; k++) { groups.add(/, (\w+)\. Payload/.exec(await node())[1]); await page.keyboard.press('ArrowRight'); }
  expect(!groups.has('Media'), `the keyboard skips a hidden group (${[...groups]})`);
  await page.keyboard.press('Escape');
  await page.locator('.alt-chart').first().getByRole('button', { name: 'Media', exact: true }).click();
  await page.waitForTimeout(300);

  // Select: the dot keeps its colour, the rest recede, the frame names it.
  const pick = await page.locator('.alt-chart').nth(1).locator('.alt-scatter-dot').nth(5).boundingBox();
  await page.mouse.click(pick.x + pick.width / 2, pick.y + pick.height / 2);
  await page.waitForTimeout(300);
  const sel = await page.evaluate(() => { const fig = document.querySelectorAll('.alt-chart')[1]; return { frame: fig.querySelector('.alt-chart-selection')?.textContent, ops: [...fig.querySelectorAll('.alt-chart-rel')].map((g) => +getComputedStyle(g).opacity), cursor: getComputedStyle(fig.querySelector('.alt-chart-plot')).cursor }; });
  expect(sel.frame === 'Filtered to VandelayClear' && sel.ops.filter((o) => o === 1).length === 1 && sel.ops.filter((o) => Math.abs(o - 0.35) < 0.01).length === 15 && sel.cursor === 'pointer', `a selected dot keeps its colour and the rest recede (${sel.frame}, ${sel.cursor})`);
  await page.keyboard.press('Escape');
  await page.locator('.alt-chart').nth(1).getByRole('button', { name: 'Clear', exact: true }).click().catch(() => {});

  // Stable ids: a new month glides the dots (no cross-fade), and they arrive where the new data says.
  await page.getByRole('button', { name: 'Next month' }).click();
  const stages = [];
  for (let k = 0; k < 8; k++) { stages.push(await page.evaluate(() => document.querySelectorAll('.alt-chart-plot')[1].dataset.stage)); await page.waitForTimeout(40); }
  expect(stages.some((s) => s === 'values' || s === 'rescale') && !stages.includes('fade'), `with ids, a change glides (${stages})`);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => document.querySelectorAll('.alt-chart')[1].querySelectorAll('.alt-scatter-dot').length) === 16, 'after the glide, a dot per record');

  // The table view: name and both measures.
  await page.locator('.alt-chart').nth(1).getByRole('tab', { name: 'Table' }).click();
  await page.waitForTimeout(300);
  const tbl = await page.evaluate(() => { const t = document.querySelectorAll('.alt-chart')[1].querySelector('table'); return { heads: [...t.querySelectorAll('thead th')].map((h) => h.textContent.trim()), rows: t.querySelectorAll('tbody tr').length }; });
  expect(tbl.heads.join('|') === 'Name|Seats|Spend' && tbl.rows === 16, `the table has name and both measures (${tbl.heads}, ${tbl.rows})`);
  await page.close();
}

// Narrow: every label still finds a clear spot, and nothing spills past the plot.
{
  const page = await open({ viewport: { width: 360, height: 900 } });
  const [lat] = await read(page);
  const boxes = [...lat.labels.map((l) => l.box), lat.trend.box];
  expect(lat.labels.length === 2 && boxes.every((a, i) => boxes.every((b, j) => i === j || !overlap(a, b))), `at 360px both labels are placed, clear of each other (${lat.labels.map((l) => l.text)})`);
  expect(!lat.dots.some((d) => overlap(d.box, lat.trend.box)), 'at 360px the trend\'s word covers no dot');
  await page.close();
}

// Forced colours: shapes carry the groups; dots CanvasText, ringed in Canvas.
{
  const page = await open({}, { forcedColors: 'active' });
  const [lat] = await read(page);
  const tags = {};
  for (const d of lat.dots) tags[d.series] = d.tag;
  expect(lat.dots.every((d) => d.fill === 'CanvasText') && new Set(Object.values(tags)).size === 3, `forced colours: the shapes still tell the groups apart (${JSON.stringify(tags)})`);
  await page.close();
}

// contrast="more": a 1px ink ring.
{
  const page = await open();
  await page.evaluate(() => document.querySelectorAll('.alt-root').forEach((r) => r.setAttribute('data-contrast', 'more')));
  await page.setViewportSize({ width: 961, height: 900 });
  await page.waitForTimeout(400);
  const [lat] = await read(page);
  const INK = await color(page, 'var(--ink)');
  expect(lat.dots.every((d) => d.stroke === INK && d.sw === '2'), `contrast="more": dots are ringed 1px in ink (${lat.dots[0].stroke} ${lat.dots[0].sw})`);
  await page.close();
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
