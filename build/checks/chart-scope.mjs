// ChartScope (#529): one record, many views. One entity keeps one colour across every chart in the scope; a pointer in
// one chart marks the same x in every sibling with the same kind of x (a 1px line-control rule, no second readout); a
// bar chosen in one chart recedes what misses in every chart and table at 35%, positions held, and the scope's caption
// says it once, politely, with Clear; each chart's summary says it too; Escape in any chart clears it; the brush sets
// every time chart's window; entering a sibling's points from the keyboard starts at the shared x; reduced motion
// changes everything in place. Run after a render of every preview (it opens test/p-ChartScope-daylight.html); exits
// non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (opts = {}, media) => {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 1200 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-ChartScope-daylight.html`);
  await page.waitForTimeout(700);
  page.errors = errors;
  return page;
};
const ERR = 0, LAT = 1, BAR = 2;
const fig = (page, i) => page.locator('.alt-chart').nth(i);
const plotPoint = async (page, i, fx) => {
  const box = await fig(page, i).locator('.alt-chart-plot').boundingBox();
  return { x: box.x + box.width * fx, y: box.y + box.height * 0.5 };
};
const caption = (page) => page.evaluate(() => document.querySelector('.alt-chart-scope-caption p')?.textContent ?? null);
const lineOpacity = (page, i, key) => page.evaluate(([i, key]) => {
  const g = document.querySelectorAll('.alt-chart')[i].querySelector(`.alt-line[data-series="${key}"]`);
  return g ? +(g.getAttribute('opacity') ?? 1) : null;
}, [i, key]);
const barOps = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.alt-chart')[2].querySelectorAll('.alt-bar-mark')]
  .map((b) => [b.dataset.category, +getComputedStyle(b.closest('.alt-chart-rel')).opacity])));
const rowRel = (page) => page.evaluate(() => [...document.querySelectorAll('.alt-chart-scope > .alt-table-wrap tr[data-row-relevance], .alt-chart-scope tr[data-row-relevance]')]
  .filter((r) => !r.closest('.alt-chart')).map((r) => `${r.cells[1]?.textContent}:${r.dataset.rowRelevance}`));

{
  const page = await open();
  // One colour per entity across the page: no slot is used by two different series.
  const strokes = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('.alt-chart').forEach((f) => f.querySelectorAll('.alt-line[data-series] .alt-line-stroke').forEach((p) => { out[p.closest('.alt-line').dataset.series] = getComputedStyle(p).stroke; }));
    out.rate = getComputedStyle(document.querySelectorAll('.alt-chart')[2].querySelector('.alt-bar-mark')).fill;
    return out;
  });
  const vals = Object.values(strokes);
  expect(vals.length === 6 && new Set(vals).size === 6, `six series on the page take six different slots (${JSON.stringify(strokes)})`);
  const first = await page.evaluate(() => getComputedStyle(document.querySelector('.alt-line[data-series="checkout"] .alt-line-stroke')).stroke);
  const d1 = await page.evaluate(() => { const d = document.createElement('div'); d.style.color = 'var(--data-1)'; document.querySelector('.alt-chart').append(d); const c = getComputedStyle(d).color; d.remove(); return c; });
  expect(first === d1, `the first entity drawn takes data-1 (${first} vs ${d1})`);
  // The caption: the slice in words, polite, at caption weight in ink-muted.
  const cap = await page.evaluate(() => { const p = document.querySelector('.alt-chart-scope-caption p'); return { live: p.getAttribute('aria-live'), size: getComputedStyle(p).fontSize, text: p.textContent }; });
  expect(cap.live === 'polite' && cap.size === '13px' && /UTC · production$/.test(cap.text), `the slice is said once, politely, at caption size (${JSON.stringify(cap)})`);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.alt-chart-scope')).boxShadow) === 'none', 'the scope adds no height');

  // The shared pointer: a crosshair in the latency chart, no readout there.
  const at = await plotPoint(page, ERR, 0.42);
  await page.mouse.move(at.x, at.y);
  await page.waitForTimeout(300);
  const ptr = await page.evaluate(() => {
    const figs = document.querySelectorAll('.alt-chart');
    const rule = figs[1].querySelector('.alt-chart-crosshair[data-scope]');
    const own = figs[0].querySelector('.alt-chart-crosshair:not([data-scope])');
    return {
      sibling: !!rule, own: !!own, barRule: !!figs[2].querySelector('.alt-chart-crosshair[data-scope]'),
      readouts: [...document.querySelectorAll('.alt-chart-readout')].length,
      ownX: own ? +own.getAttribute('x1') : null, sibX: rule ? +rule.getAttribute('x1') : null,
      stroke: rule ? getComputedStyle(rule).stroke : null, w: rule ? getComputedStyle(rule).strokeWidth : null,
      ref: (() => { const d = document.createElement('div'); d.style.color = 'var(--line-control)'; figs[1].append(d); const c = getComputedStyle(d).color; d.remove(); return c; })(),
    };
  });
  expect(ptr.own && ptr.sibling && !ptr.barRule, `the pointer marks the same hour in the sibling over time, not in the bar chart over services (${JSON.stringify(ptr)})`);
  expect(ptr.readouts === 1, `one readout on the page (${ptr.readouts})`);
  expect(ptr.stroke === ptr.ref && ptr.w === '1px', `the sibling's rule is the 1px line-control crosshair (${ptr.stroke}, ${ptr.w})`);
  // Both charts are 24 hours wide here; the latency card is narrower, so the rule sits at the same fraction of its plot.
  const frac = await page.evaluate(() => {
    const figs = document.querySelectorAll('.alt-chart');
    const f = (i, sel) => { const l = figs[i].querySelector(sel); const g = l.closest('g[transform]'); const w = figs[i].querySelector('.alt-chart-grid line')?.getAttribute('x2'); return +l.getAttribute('x1') / +w; };
    return [f(0, '.alt-chart-crosshair:not([data-scope])'), f(1, '.alt-chart-crosshair[data-scope]')];
  });
  expect(Math.abs(frac[0] - frac[1]) < 0.03, `the sibling's rule is at the same hour (${frac.map((v) => v.toFixed(3))})`);

  // Keyboard: entering the latency chart's points starts at the shared hour.
  const hour = await page.evaluate(() => document.querySelector('.alt-chart-readout-label')?.textContent);
  await fig(page, LAT).locator('.alt-chart-node').first().focus();
  await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  const name = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  expect(!!hour && name?.startsWith(hour), `the keyboard picks up the reading at the shared hour (${hour} → ${name?.slice(0, 40)})`);
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await page.mouse.move(5, 5);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => !document.querySelector('.alt-chart-crosshair[data-scope]')), 'leaving the plot takes the shared rule away');

  // Selection: a bar chosen in one chart recedes what misses everywhere.
  const bar = await fig(page, BAR).locator('.alt-bar-mark[data-category="checkout"]').boundingBox();
  await page.mouse.click(bar.x + bar.width / 2, bar.y + bar.height - 6);
  await page.waitForTimeout(500);
  const ops = await barOps(page);
  expect(ops.checkout === 1 && Math.abs(ops.search - 0.35) < 0.01 && Math.abs(ops.payments - 0.35) < 0.01, `in the bar chart, misses recede to 35% (${JSON.stringify(ops)})`);
  const lines = { checkout: await lineOpacity(page, ERR, 'checkout'), search: await lineOpacity(page, ERR, 'search'), p50: await lineOpacity(page, LAT, 'p50') };
  expect(lines.checkout === 1 && Math.abs(lines.search - 0.35) < 0.02 && lines.p50 === 1, `in the line chart whose series are services, the others recede; latency isn't touched (${JSON.stringify(lines)})`);
  const rows = await rowRel(page);
  expect(rows.includes('Checkout:match') && rows.includes('Payments:miss'), `the incidents table filters in place (${rows.join(', ')})`);
  expect(await caption(page) === 'Wed 00:00 – Wed 23:00 UTC · production · Filtered to Checkout', `the caption says the selection once (${await caption(page)})`);
  const counts = await page.evaluate(() => document.querySelectorAll('.alt-chart .alt-chart-count, .alt-chart .alt-chart-selection:not(:empty)').length);
  expect(counts === 0, `no chart repeats the slice in its own frame (${counts})`);
  const sums = await page.evaluate(() => [...document.querySelectorAll('.alt-chart figcaption')].map((f) => f.textContent));
  expect(/Filtered to Checkout\.$/.test(sums[BAR]) && /Filtered to Checkout\.$/.test(sums[ERR]) && !/Filtered/.test(sums[LAT]), `the summaries that it filters say it (${sums.map((s) => s.slice(-40)).join(' | ')})`);
  await fig(page, BAR).locator('.alt-chart-node').first().focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  const pressed = [await page.evaluate(() => document.activeElement.getAttribute('aria-pressed'))];
  await page.keyboard.press('ArrowRight');
  pressed.push(await page.evaluate(() => document.activeElement.getAttribute('aria-pressed')));
  expect(pressed.join() === 'true,false', `the chosen bar is pressed, the others not (${pressed})`);

  // Escape from another chart clears it.
  await fig(page, LAT).locator('.alt-chart-node').first().focus();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  expect(await caption(page) === 'Wed 00:00 – Wed 23:00 UTC · production' && (await lineOpacity(page, ERR, 'search')) === 1, `Escape in any chart clears the shared selection (${await caption(page)})`);
  // Choosing again, then Clear.
  await page.mouse.click(bar.x + bar.width / 2, bar.y + bar.height - 6);
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await page.waitForTimeout(200);
  expect(!(await caption(page)).includes('Filtered'), 'Clear clears it');

  // The window: the brush moves every chart over time.
  const ticks = () => page.evaluate(() => [...document.querySelectorAll('.alt-chart')[1].querySelectorAll('.alt-chart-axis[data-axis="x"] text')].map((t) => t.textContent).join(' '));
  const before = await ticks();
  await page.getByRole('slider', { name: 'Window start' }).focus();
  for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(800);
  const after = await ticks();
  const cap2 = await caption(page);
  expect(before !== after && /^Tue 12:00/.test(cap2), `the brush sets the scope's window, and the sibling and the caption follow (${before} → ${after}; ${cap2})`);
  expect(page.errors.length === 0, `no page or console errors (${page.errors.join(' | ')})`);
}

// Reduced motion: the shared selection changes in place.
{
  const page = await open({ reducedMotion: 'reduce' });
  const bar = await fig(page, BAR).locator('.alt-bar-mark[data-category="search"]').boundingBox();
  await page.mouse.click(bar.x + bar.width / 2, bar.y + bar.height - 6);
  await page.waitForTimeout(60);
  const o = await lineOpacity(page, ERR, 'checkout');
  expect(Math.abs(o - 0.35) < 0.01, `under reduced motion the other lines recede at once (${o})`);
}

// Forced colours: the shared rule is CanvasText.
{
  const page = await open({ forcedColors: 'active' });
  const at = await plotPoint(page, ERR, 0.5);
  await page.mouse.move(at.x, at.y);
  await page.waitForTimeout(250);
  const s = await page.evaluate(() => { const r = document.querySelector('.alt-chart-crosshair[data-scope]'); return r ? getComputedStyle(r).stroke : null; });
  expect(s === 'rgb(0, 0, 0)' || s === 'rgb(255, 255, 255)', `under forced colours the shared rule is CanvasText (${s})`);
}

await browser.close();
console.log(`chart-scope: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
