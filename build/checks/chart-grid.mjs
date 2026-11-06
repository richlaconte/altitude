// ChartGrid (#530): small multiples. Every panel of a shared grid reads the same y ticks; only the first column says
// the y labels and only the last row the x labels; a free-y panel says "own scale" and reads its own ticks; the focused
// panel keeps its colour and the rest take data-context; one pointer marks the same x in every panel with one readout;
// the panels make one Tab stop, with ←/→/↓/End between panels, Enter into a panel's points and Escape back; at 360px
// it's one column. Run after a render of every preview (it opens test/p-ChartGrid-daylight.html); exits non-zero on a
// failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (opts = {}, media) => {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 1000 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-ChartGrid-daylight.html`);
  await page.waitForTimeout(700);
  page.errors = errors;
  return page;
};
const active = (page) => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');

{
  const page = await open();
  const panels = await page.evaluate(() => [...document.querySelectorAll('.alt-chart-multiples')[0].querySelectorAll('.alt-chart-multiples-panel')].map((p) => ({
    name: p.querySelector('.alt-chart-title')?.textContent,
    y: [...p.querySelectorAll('[data-axis="y"] text')].map((t) => t.textContent),
    x: [...p.querySelectorAll('[data-axis="x"] text')].map((t) => t.textContent),
    w: p.querySelector('.alt-chart-plot')?.getBoundingClientRect().width,
    stroke: getComputedStyle(p.querySelector('.alt-line-stroke') ?? p).stroke,
  })));
  expect(panels.length === 8, `eight panels (${panels.length})`);
  expect(panels[0].name === 'Checkout', `sorted by last value, Checkout first (${panels[0].name})`);
  // One y axis, read in the first column; one x axis, read in the last row.
  expect(panels[0].y.length >= 3 && panels[4].y.length >= 3, 'the first column says the y labels');
  expect(panels.filter((_, i) => i % 4 !== 0).every((p) => p.y.length === 0), 'other columns say no y labels');
  expect(panels.slice(4).every((p) => p.x.length >= 2) && panels.slice(0, 4).every((p) => p.x.length === 0), 'only the last row says the x labels');
  expect(panels[0].y.join() === panels[4].y.join(), `one shared y scale (${panels[0].y} vs ${panels[4].y})`);
  expect(new Set(panels.map((p) => Math.round(p.w))).size === 1, `every plot the same width (${panels.map((p) => Math.round(p.w))})`);
  // Focus: Checkout keeps its colour, the rest share data-context.
  expect(panels[0].stroke !== panels[1].stroke && new Set(panels.slice(1).map((p) => p.stroke)).size === 1, 'the focused panel keeps its colour, the rest data-context');
  const summary = await page.evaluate(() => document.querySelector('.alt-chart-multiples > figcaption')?.textContent ?? '');
  expect(/Highlighted: Checkout\./.test(summary) && /8 panels, on one scale/.test(summary) && /Checkout is highest/.test(summary), `the grid's summary (${summary})`);

  // One pointer: hovering one panel marks the same x in the others, with one readout.
  const box = await page.locator('.alt-chart-multiples').first().locator('.alt-chart-plot').nth(1).boundingBox();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.waitForTimeout(250);
  const hairs = await page.evaluate(() => ({
    rules: document.querySelectorAll('.alt-chart-multiples')[0].querySelectorAll('.alt-chart-crosshair').length,
    shared: document.querySelectorAll('.alt-chart-multiples')[0].querySelectorAll('.alt-chart-crosshair[data-scope]').length,
    readouts: [...document.querySelectorAll('.alt-chart-multiples')[0].querySelectorAll('.alt-chart-readout')].filter((r) => r.dataset.state !== 'closed').length,
  }));
  expect(hairs.rules === 8 && hairs.shared === 7, `a crosshair in every panel, seven of them shared (${hairs.rules}, ${hairs.shared})`);
  expect(hairs.readouts <= 1, `one readout (${hairs.readouts})`);
  await page.mouse.move(2, 2);

  // One Tab stop per grid; arrows move between panels; Enter goes in; Escape comes back.
  const stops = await page.evaluate(() => [...document.querySelectorAll('.alt-chart-multiples')].map((g) => [...g.querySelectorAll('[tabindex="0"]')].length));
  expect(stops.every((n) => n === 1), `one Tab stop per grid (${stops})`);
  await page.keyboard.press('Tab');
  expect((await active(page)).startsWith('Checkout, 1 of 8.'), `Tab lands on the first panel (${await active(page)})`);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(80);
  expect((await active(page)).startsWith('Cart, 2 of 8.'), `→ moves to the next panel (${await active(page)})`);
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80);
  expect((await active(page)).startsWith('Auth, 6 of 8.'), `↓ moves down a row (${await active(page)})`);
  await page.keyboard.press('Enter');
  expect(/1 of 48\.$/.test(await active(page)), `Enter goes into the panel's points (${await active(page)})`);
  await page.keyboard.press('Escape');
  expect((await active(page)).startsWith('Auth, 6 of 8.'), `Escape comes back to the panel (${await active(page)})`);
  await page.keyboard.press('End'); await page.waitForTimeout(80);
  expect((await active(page)).startsWith('Search, 8 of 8.'), `End moves to the last panel (${await active(page)})`);
  await page.keyboard.press('Tab');
  expect((await active(page)).startsWith('North America, 1 of 3.'), `Tab leaves the grid for the next one (${await active(page)})`);

  // Free y: each panel says it and reads its own ticks, inline.
  const free = await page.evaluate(() => [...document.querySelectorAll('.alt-chart-multiples')[1].querySelectorAll('.alt-chart-multiples-panel')].map((p) => ({
    own: !!p.querySelector('.alt-chart-multiples-own'), inline: p.querySelectorAll('[data-axis="y"][data-inline] text').length,
    first: p.querySelector('[data-axis="y"][data-inline] text')?.textContent })));
  expect(free.every((p) => p.own && p.inline >= 2), 'free-y panels say "own scale" and read their own ticks inline');
  expect(new Set(free.map((p) => p.first)).size === 3, `each free-y panel has its own ticks (${free.map((p) => p.first)})`);
  expect(page.errors.length === 0, `no page errors (${page.errors.join(' | ')})`);
  await page.context().close();
}

{
  // Reduced motion and contrast="more" render without errors; at 360px the grid is one column.
  const page = await open({ viewport: { width: 360, height: 1000 } }, { reducedMotion: 'reduce', contrast: 'more' });
  const cols = await page.evaluate(() => getComputedStyle(document.querySelector('.alt-chart-multiples-panels')).gridTemplateColumns.split(' ').length);
  expect(cols === 1, `one column at 360px (${cols})`);
  const ys = await page.evaluate(() => [...document.querySelectorAll('.alt-chart-multiples')[0].querySelectorAll('.alt-chart-multiples-panel')].every((p) => p.querySelectorAll('[data-axis="y"] text').length >= 3));
  expect(ys, 'in one column every panel is the first column, so every panel says its y labels');
  expect(page.errors.length === 0, `no page errors at 360px (${page.errors.join(' | ')})`);
  await page.context().close();
}

await browser.close();
console.log(`chart grid: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
