// Live charts (#66): a new or changed mark (four or fewer) gets a 2px ink outline and its value, and its name says
// "Changed."; more than four at once is one change, so the "Updated" caption glows and no mark does; a window that
// moves on glides (no cross-fade) and keeps its span; while the pointer is in the plot, or paused, updates wait and
// the caption says so; a threshold crossing is announced and nothing else; reduced motion updates in place; charts
// that aren't live are unchanged. Run after a render of every preview (it opens test/p-ChartLive-daylight.html).
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (name = 'ChartLive', media) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 900 } });
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-${name}-daylight.html`);
  await page.waitForTimeout(500);
  return page;
};
const figs = (page) => page.locator('.alt-chart');
const state = (page, i) => page.evaluate((i) => {
  const fig = document.querySelectorAll('.alt-chart')[i];
  const plot = fig.querySelector('.alt-chart-plot');
  return {
    glows: [...plot.querySelectorAll('.alt-chart-glow')].map((g) => ({ series: g.dataset.series, shape: g.firstElementChild.tagName, stroke: getComputedStyle(g.firstElementChild).stroke, w: getComputedStyle(g.firstElementChild).strokeWidth, text: g.querySelector('text').textContent })),
    caption: fig.querySelector('.alt-chart-updated')?.textContent ?? null,
    captionSettle: fig.querySelector('.alt-chart-updated')?.getAttribute('data-settle') ?? null,
    path: plot.querySelector('.alt-line-stroke')?.getAttribute('d') ?? null,
    points: (plot.querySelector('.alt-line-stroke')?.getAttribute('d') ?? '').split(/[ML]/).filter(Boolean).length,
    stage: plot.getAttribute('data-stage'),
    clip: plot.querySelector('.alt-chart-marks')?.getAttribute('clip-path') ?? null,
    said: fig.querySelector('.alt-chart-live [aria-live]')?.textContent ?? null,
    ticks: [...plot.querySelectorAll('[data-axis="x"] text')].map((t) => t.textContent),
  };
}, i);
const ink = async (page) => page.evaluate(() => { const d = document.createElement('div'); d.style.color = 'var(--ink)'; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; });

{
  const page = await open();
  const INK = await ink(page);
  // One change: the Email bar glows.
  let q = await state(page, 1);
  expect(q.glows.length === 0 && /^Updated \d{1,2}:\d{2}/.test(q.caption), `nothing glows on first render, and the caption says when (${q.caption})`);
  await page.getByRole('button', { name: 'Add jobs to Email' }).click();
  await page.waitForTimeout(400);
  q = await state(page, 1);
  expect(q.glows.length === 1 && q.glows[0].shape === 'path' && q.glows[0].stroke === INK && q.glows[0].w === '2px' && q.glows[0].text === '75', `a changed bar carries a 2px ink outline in its shape, and its value (${JSON.stringify(q.glows)})`);
  expect(q.captionSettle === null, 'a single change leaves the caption alone');
  // Its name says "Changed." while it glows.
  await figs(page).nth(1).locator('.alt-chart-node').first().focus();
  await page.keyboard.press('Enter'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  const name = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  expect(/^Email, Jobs waiting, 75\. Changed\. 3 of 5\.$/.test(name), `its point says "Changed." (${name})`);
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.activeElement.blur());
  // A whole refresh: more than four marks change, so the caption glows and no new mark does.
  await page.getByRole('button', { name: 'Refresh all' }).click();
  await page.waitForTimeout(400);
  q = await state(page, 1);
  expect(q.glows.length <= 1 && q.captionSettle !== null, `a whole refresh glows the caption, not five marks (${q.glows.length} glows, caption ${q.captionSettle})`);
  const tint = await page.evaluate(() => getComputedStyle(document.querySelectorAll('.alt-chart-updated')[1], '::before').animationName);
  expect(tint === 'alt-chart-tint-a' || tint === 'alt-chart-tint-b', `the caption's afterglow is a tint at ground level, not a lift (${tint})`);

  // The window slides: a tick glides (no cross-fade), the span stays 15 minutes, the marks are clipped to the plot.
  let l = await state(page, 0);
  expect(l.points === 16 && l.clip?.startsWith('url('), `15 minutes at a point a minute is 16 points, clipped to the plot (${l.points}, ${l.clip})`);
  const before = l.path;
  const stages = new Set();
  const t = Date.now();
  while (Date.now() - t < 2600) { const s = await state(page, 0); if (s.stage) stages.add(s.stage); if (s.path !== before && !s.stage) break; await page.waitForTimeout(25); }
  l = await state(page, 0);
  expect(l.path !== before && !stages.has('fade') && (stages.has('values') || stages.has('rescale')), `a tick glides one step, never a cross-fade (${[...stages]})`);
  expect(l.points === 16, `and the window keeps its span (${l.points})`);
  const glow = l.glows.find((g) => g.series === 'rate');
  expect(glow?.shape === 'circle', `the new point carries a ring (${JSON.stringify(l.glows)})`);

  // The crossing announces; nothing else does.
  await page.waitForTimeout(2300);
  l = await state(page, 0);
  expect(/^Error rate crossed 2%: 2\.70%$/.test(l.said ?? ''), `a threshold crossing is announced (${l.said})`);

  // Holding still: while the pointer is in the plot, updates wait; they land when it leaves.
  const plot = figs(page).first().locator('.alt-chart-plot');
  await plot.hover({ position: { x: 200, y: 80 } });
  const held = (await state(page, 0)).path;
  await page.waitForTimeout(2300);
  l = await state(page, 0);
  expect(l.path === held && /new data when you move away/.test(l.caption), `under the pointer the plot holds still and says so (${l.caption})`);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(500);
  expect((await state(page, 0)).path !== held, 'leaving lets the update in');

  // Pausing: the switch stops updates until it's turned off.
  const sw = page.getByRole('switch', { name: 'Pause updates' });
  await sw.click();
  // A tick that was already gliding finishes after the click, so the paused path is read once it settles.
  for (const t = Date.now(); (await state(page, 0)).stage && Date.now() - t < 1500;) await page.waitForTimeout(20);
  const paused = (await state(page, 0)).path;
  await page.waitForTimeout(2300);
  l = await state(page, 0);
  const pressed = await sw.getAttribute('aria-checked');
  expect(pressed === 'true' && l.path === paused && /^Paused\. Updated .* · new data waiting$/.test(l.caption), `paused, nothing changes and the caption says so (${l.caption}; aria-checked ${pressed}; path ${l.path === paused ? 'held' : 'moved'})`);
  await sw.click();
  await page.waitForTimeout(500);
  expect((await state(page, 0)).path !== paused, 'unpausing applies what came');
  await page.close();
}

// Reduced motion: the window updates in place (a cross-fade), and afterglows stay.
{
  const page = await open('ChartLive', { reducedMotion: 'reduce' });
  const stages = new Set();
  const before = (await state(page, 0)).path;
  const t = Date.now();
  while (Date.now() - t < 2600) { const s = await state(page, 0); if (s.stage) stages.add(s.stage); if (s.path !== before && !s.stage) break; await page.waitForTimeout(20); }
  expect(!stages.has('values') && !stages.has('rescale'), `reduced motion: no glide (${[...stages]})`);
  expect((await state(page, 0)).glows.length === 1, 'reduced motion keeps the afterglow');
  await page.close();
}

// Charts that aren't live are unchanged: no caption, no clip, no glow.
{
  const page = await open('LineChart');
  const n = await page.evaluate(() => ({ live: document.querySelectorAll('.alt-chart-live').length, clip: [...document.querySelectorAll('.alt-chart-marks')].filter((g) => g.getAttribute('clip-path')).length }));
  expect(n.live === 0 && n.clip === 0, `a chart without live draws as before (${JSON.stringify(n)})`);
  await page.close();
}

await browser.close();
console.log(`chart-live: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
