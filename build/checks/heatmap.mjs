// Heatmap (#61): cells lie flat in data-seq steps (data-div around a midpoint), parted by 2px and at least 10px, zero
// the lightest step and no data an outline; a calendar wraps by week when it's narrow; each step says its range in the
// legend, the cell's name and the table; arrows move cell to cell, Home/End along a row, Ctrl+Home/End across the grid
// and Page Up/Down a month in the calendar; the cell under the readout is outlined in 2px ink; cells can be selected;
// a value change cross-fades the fill, instantly under reduced motion; forced colours give each step a pattern density
// and contrast="more" a 1px ink edge. Run after a render of every preview (it opens test/p-Heatmap-daylight.html);
// exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (opts = {}, media) => {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 1000 }, ...opts });
  const page = await ctx.newPage();
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-Heatmap-daylight.html`);
  await page.waitForTimeout(600);
  return page;
};
const color = (page, v) => page.evaluate((v) => { const d = document.createElement('div'); d.style.color = v; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }, v);
const read = (page) => page.evaluate(() => [...document.querySelectorAll('.alt-chart')].map((fig) => {
  const cells = [...fig.querySelectorAll('.alt-heat-cell')].map((g) => {
    const r = g.querySelector('rect');
    return { x: +r.getAttribute('x'), y: +r.getAttribute('y'), w: +r.getAttribute('width'), h: +r.getAttribute('height'), fill: r.getAttribute('fill'), cls: r.getAttribute('class'), bin: g.dataset.bin, pattern: !!g.querySelector('.alt-heat-pattern'), stroke: getComputedStyle(r).stroke, sw: getComputedStyle(r).strokeWidth };
  });
  return {
    cells, legend: [...fig.querySelectorAll('.alt-heat-legend text')].map((t) => t.textContent),
    rows: [...fig.querySelectorAll('.alt-heat-labels text[text-anchor="end"]')].map((t) => t.textContent),
    summary: fig.querySelector('figcaption').textContent,
    shadows: [...fig.querySelectorAll('.alt-heat *')].some((e) => getComputedStyle(e).filter !== 'none') || !!fig.querySelector('.alt-heat linearGradient, .alt-heat radialGradient, .alt-heat filter'),
  };
}));

{
  const page = await open();
  const [cal, load, div] = await read(page);
  expect(cal.cells.length === 365 && load.cells.length === 168 && div.cells.length === 20, `a cell per day and per x × y (${cal.cells.length}, ${load.cells.length}, ${div.cells.length})`);
  expect([cal, load, div].every((c) => c.cells.every((k) => k.w >= 10 && k.h >= 10)), 'every cell is at least 10px');
  const rowGap = (c) => { const a = c.cells[0], b = c.cells.find((k) => k.y === a.y && k.x > a.x); return b ? b.x - a.x - a.w : null; };
  expect(rowGap(load) === 2 && rowGap(div) === 2, `cells are parted by 2px (${rowGap(load)}, ${rowGap(div)})`);
  expect(!cal.shadows && !load.shadows && !div.shadows, 'cells are flat: no filter, shadow or gradient');
  // Zero is the lightest step; each step is a data-seq token, in order.
  const zeros = cal.cells.filter((k) => k.bin === '0');
  expect(zeros.length > 0 && zeros.every((k) => k.fill === 'var(--data-seq-1)'), 'zero is the lightest step, data-seq-1');
  expect(JSON.stringify([...new Set(cal.cells.map((k) => k.bin))].sort()) === '["0","1","2","3"]' && cal.cells.every((k) => k.fill === `var(--data-seq-${[1, 3, 5, 7][+k.bin]})`), 'four steps spread over the sequential ramp: seq-1, 3, 5, 7');
  expect(JSON.stringify(cal.legend) === JSON.stringify(['0', '1–3', '4–9', '10+']), `the legend says each step's range: ${cal.legend}`);
  expect(JSON.stringify(cal.rows) === JSON.stringify(['Mon', 'Wed', 'Fri']), `the calendar names Mon, Wed and Fri: ${cal.rows}`);
  // Diverging: data-div around the middle step, with no data as an outline, named in the legend.
  expect(div.cells.filter((k) => k.fill).every((k) => /^var\(--data-div-(mid|neg-[123]|pos-[123])\)$/.test(k.fill)) && div.cells.some((k) => k.fill === 'var(--data-div-mid)'), 'diverging cells wear data-div steps around data-div-mid');
  const none = div.cells.find((k) => k.cls === 'alt-heat-none');
  expect(none && none.stroke === await color(page, 'var(--line)') && none.sw === '1px' && div.legend.includes('No data'), `no data is a 1px line outline, in the legend too (${none?.stroke})`);
  expect(div.legend[0].startsWith('< ') && div.legend.some((t) => / to /.test(t)) && div.legend.some((t) => t.startsWith('≥ ')), `diverging steps read as ranges: ${div.legend}`);
  // Summaries.
  expect(/^Calendar heatmap of Commits, Oct 27, 2025 to Oct 26, 2026, 365 days\. Highest \d+ on .*Steps: 0, 1–3, 4–9 and 10\+\.$/.test(cal.summary), 'the calendar summary: ' + cal.summary.slice(0, 120));
  expect(/^Heatmap of Requests by weekday and hour, 7 rows by 24 columns\. Highest \d+ at Tue, 1[345]; lowest/.test(load.summary), 'the grid summary: ' + load.summary.slice(0, 120));
  expect(/1 cell has no data\. .*around 0\.0 pts\.$/.test(div.summary), 'the diverging summary says what has no data and the midpoint: ' + div.summary.slice(-90));

  // Transitions: a value change cross-fades the fill.
  const tr = await page.evaluate(() => getComputedStyle(document.querySelector('.alt-heat-fill')).transitionProperty);
  expect(/fill/.test(tr), `a change cross-fades the fill (${tr})`);

  // Hover: the readout reads the cell, and a static grid outlines it in 2px ink without a pointer.
  const box = await page.locator('.alt-chart').nth(1).locator('.alt-heat-cell').nth(24 + 14).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(350);
  const hov = await page.evaluate(() => {
    const fig = document.querySelectorAll('.alt-chart')[1], a = fig.querySelector('.alt-heat-active');
    return { label: fig.querySelector('.alt-chart-readout-label')?.textContent, value: fig.querySelector('.alt-chart-readout-value')?.textContent, stroke: a && getComputedStyle(a).stroke, w: a && getComputedStyle(a).strokeWidth, cursor: getComputedStyle(fig.querySelector('.alt-chart-plot')).cursor, crosshair: !!fig.querySelector('.alt-chart-crosshair') };
  });
  expect(hov.label === 'Tue, 14' && /^\d+$/.test(hov.value) && hov.stroke === await color(page, 'var(--ink)') && hov.w === '2px', `hover reads the cell and outlines it in 2px ink (${JSON.stringify(hov)})`);
  expect(hov.cursor !== 'pointer' && !hov.crosshair, 'a static grid has no pointer cursor and no crosshair');
  await page.mouse.move(5, 5);

  // Keyboard: Enter goes straight to the cells; arrows move by row and column and stop at the edges.
  await page.locator('.alt-chart').nth(1).locator('.alt-chart-node').first().focus();
  const node = () => page.evaluate(() => { const a = document.activeElement; return { name: a.getAttribute('aria-label'), role: a.getAttribute('aria-roledescription'), w: a.getBoundingClientRect().width }; });
  await page.keyboard.press('Enter');
  let n = await node();
  expect(/^Mon, 00, \d+ requests, step 1 of 5\.$/.test(n.name) && n.role === 'cell', `Enter goes to the first cell, named by row, column, value and step (${n.name})`);
  expect(Math.abs(n.w - load.cells[0].w) < 0.5, `the focus ring is the cell's own box (${n.w} vs ${load.cells[0].w})`);
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowLeft');
  expect((await node()).name.startsWith('Mon, 00,'), 'arrows stop at the edges');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown');
  expect((await node()).name.startsWith('Tue, 01,'), `→ and ↓ move by column and row (${(await node()).name})`);
  await page.keyboard.press('End');
  expect((await node()).name.startsWith('Tue, 23,'), 'End goes to the end of the row');
  await page.keyboard.press('Home');
  expect((await node()).name.startsWith('Tue, 00,'), 'Home goes to the start of the row');
  await page.keyboard.press('Control+End');
  expect((await node()).name.startsWith('Sun, 23,'), 'Ctrl+End goes to the last cell');
  await page.keyboard.press('Control+Home');
  expect((await node()).name.startsWith('Mon, 00,'), 'Ctrl+Home goes to the first cell');
  const tip = await page.evaluate(() => document.querySelectorAll('.alt-chart')[1].querySelector('.alt-chart-readout-label')?.textContent);
  expect(tip === 'Mon, 00', `the keyboard gets the readout too (${tip})`);
  await page.keyboard.press('Escape');
  expect((await node()).name.startsWith('Heatmap of Requests'), 'Escape goes back to the summary');

  // The calendar: Page Down a month, names in words.
  await page.locator('.alt-chart').first().locator('.alt-chart-node').first().focus();
  await page.keyboard.press('Enter');
  n = await node();
  expect(/^Monday, Oct 27, 2025, \d+ commits, step \d of 4\.$/.test(n.name), `a day is named by weekday and date (${n.name})`);
  await page.keyboard.press('PageDown');
  expect((await node()).name.startsWith('Thursday, Nov 27, 2025,'), `Page Down moves a month (${(await node()).name})`);
  await page.keyboard.press('ArrowDown');
  expect((await node()).name.startsWith('Friday, Nov 28, 2025,'), '↓ is the next day in the calendar');
  await page.keyboard.press('ArrowRight');
  expect((await node()).name.startsWith('Friday, Dec 5, 2025,'), '→ is the same weekday a week on');
  await page.keyboard.press('PageUp'); await page.keyboard.press('PageUp');
  expect((await node()).name.startsWith('Monday, Oct 27, 2025,'), `Page Up stops at the first day (${(await node()).name})`);
  await page.keyboard.press('Escape');

  // Select: the cell keeps its colour, the rest recede, the frame says which; again clears.
  const sel = await page.locator('.alt-chart').nth(2).locator('.alt-heat-cell').first().boundingBox();
  await page.mouse.click(sel.x + 10, sel.y + 10);
  await page.waitForTimeout(300);
  let s = await page.evaluate(() => { const fig = document.querySelectorAll('.alt-chart')[2]; const ops = [...fig.querySelectorAll('.alt-chart-rel')].map((g) => +getComputedStyle(g).opacity); return { frame: fig.querySelector('.alt-chart-selection')?.textContent, ops, desc: fig.closest('.alt-card').querySelector('.alt-card-description, p')?.textContent }; });
  expect(s.frame === 'Filtered to Checkout, USClear' && s.ops[0] === 1 && s.ops.slice(1).every((o) => Math.abs(o - 0.35) < 0.01), `a selected cell keeps its colour and the rest recede (${s.frame}, ${s.ops.slice(0, 3)})`);
  await page.mouse.click(sel.x + 10, sel.y + 10);
  await page.waitForTimeout(300);
  s = await page.evaluate(() => document.querySelectorAll('.alt-chart')[2].querySelector('.alt-chart-selection')?.textContent);
  expect(s === '', 'choosing it again clears');

  // The table view: weekday, hour, value and step for every cell.
  await page.locator('.alt-chart').nth(1).getByRole('tab', { name: 'Table' }).click();
  await page.waitForTimeout(300);
  const tbl = await page.evaluate(() => { const t = document.querySelectorAll('.alt-chart')[1].querySelector('table'); return { heads: [...t.querySelectorAll('thead th')].map((h) => h.textContent.trim()), rows: t.querySelectorAll('tbody tr').length, first: [...t.querySelector('tbody tr').querySelectorAll('td, th')].map((c) => c.textContent.trim()) }; });
  expect(tbl.heads.join('|') === 'Weekday|Hour|Requests|Step' && tbl.rows === 168 && tbl.first[0] === 'Mon' && tbl.first[1] === '00', `the table has a row per cell with its step (${tbl.heads}, ${tbl.rows}, ${tbl.first})`);
  await page.close();
}

// Narrow: the calendar wraps by week into bands, each naming its months, and cells stay at least 10px.
{
  const page = await open({ viewport: { width: 360, height: 1000 } });
  const [cal] = await read(page);
  const mons = await page.evaluate(() => [...document.querySelector('.alt-heat-labels').querySelectorAll('text[text-anchor="end"]')].filter((t) => t.textContent === 'Mon').length);
  expect(mons >= 2 && cal.cells.every((k) => k.w >= 10), `at 360px the calendar wraps into ${mons} bands, cells ≥ 10px`);
  const right = await page.evaluate(() => [...document.querySelectorAll('.alt-chart')].every((f) => { const r = f.getBoundingClientRect(); return [...f.querySelectorAll('.alt-heat-cell rect')].every((c) => c.getBoundingClientRect().right <= r.right + 0.5); }));
  const loadBands = await page.evaluate(() => [...document.querySelectorAll('.alt-chart')[1].querySelectorAll('.alt-heat-labels text[text-anchor="end"]')].filter((t) => t.textContent === 'Mon').length);
  expect(right && loadBands === 2, `no cell spills past its chart at 360px; the hour grid wraps into ${loadBands} bands`);
  await page.close();
}

// Reduced motion: values change in place.
{
  const page = await open({ reducedMotion: 'reduce' });
  const tr = await page.evaluate(() => getComputedStyle(document.querySelector('.alt-heat-fill')).transitionProperty);
  expect(tr === 'none' || tr === 'all', `reduced motion: no cross-fade (${tr})`);
  await page.close();
}

// Forced colours: each step adds a pattern density; the cells are Canvas with CanvasText edges.
{
  const page = await open({}, { forcedColors: 'active' });
  const [cal, , div] = await read(page);
  const byBin = {};
  for (const k of cal.cells) byBin[k.bin] = k.pattern;
  expect(byBin['0'] === false && ['1', '2', '3'].every((b) => byBin[b]), `forced colours: steps above the first get a pattern (${JSON.stringify(byBin)})`);
  const ids = await page.evaluate(() => [...document.querySelector('.alt-heat defs').children].map((p) => p.id.replace(/^.*-d/, '')));
  expect(ids.length === 3, `three densities for four steps (${ids})`);
  expect(div.cells.filter((k) => k.cls === 'alt-heat-fill').every((k) => k.fill === 'Canvas'), 'forced colours: cells are Canvas under their pattern');
  await page.close();
}

// contrast="more": a 1px ink edge on every cell.
{
  const page = await open();
  await page.evaluate(() => document.querySelectorAll('.alt-root').forEach((r) => r.setAttribute('data-contrast', 'more')));
  await page.setViewportSize({ width: 961, height: 1000 });
  await page.waitForTimeout(400);
  const [, load] = await read(page);
  const INK = await color(page, 'var(--ink)');
  expect(load.cells.every((k) => k.stroke === INK && k.sw === '1px'), `contrast="more": 1px ink edges (${load.cells[0].stroke} ${load.cells[0].sw})`);
  await page.close();
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
