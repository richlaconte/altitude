// Marks you can select or drill into (#69): hover only promises what a click does (cursor, 2px ink outline, the action
// in the readout), and a chart that doesn't act doesn't respond; a selection keeps its colour and the rest recede to
// 35%, the frame says "Filtered to EU" with Clear, and choosing it again, Clear or Escape clears it; Enter and Space
// select from the keyboard with aria-pressed; a tap selects; drilling opens the child in Drilldown and focuses the
// new chart's summary; forced colours outline in Highlight. Run after a render of every preview (it opens
// test/p-ChartSelect-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (name = 'ChartSelect', opts = {}, media) => {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 1000 }, ...opts });
  const page = await ctx.newPage();
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-${name}-daylight.html`);
  await page.waitForTimeout(600);
  return page;
};
const ink = (page, v = 'var(--ink)') => page.evaluate((v) => { const d = document.createElement('div'); d.style.color = v; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }, v);
const barAt = async (page, fig, cat) => {
  const box = await page.locator('.alt-chart').nth(fig).locator(`.alt-bar-mark[data-category="${cat}"]`).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height - 6 };
};
const state = (page) => page.evaluate(() => {
  const fig = document.querySelector('.alt-chart');
  return {
    ops: Object.fromEntries([...fig.querySelectorAll('.alt-bar-mark')].map((b) => [b.dataset.category, +getComputedStyle(b.closest('.alt-chart-rel')).opacity])),
    frame: fig.querySelector('.alt-chart-selection')?.textContent ?? null,
    linked: document.querySelectorAll('.alt-chart')[1].querySelector('.alt-chart-title')?.textContent,
    summary: fig.querySelector('figcaption').textContent,
  };
});

{
  const page = await open();
  const INK = await ink(page);
  let s = await state(page);
  expect(s.ops.EU === 1 && ['US', 'APAC', 'LATAM'].every((k) => Math.abs(s.ops[k] - 0.35) < 0.01), `the selection keeps its colour, the rest recede (${JSON.stringify(s.ops)})`);
  expect(s.frame === 'Filtered to EUClear' && /Filtered to EU\.$/.test(s.summary), `the frame and the summary say what it's filtered to (${s.frame})`);
  // Hover promises what a click does.
  const cursor = await page.evaluate(() => getComputedStyle(document.querySelector('.alt-chart-plot')).cursor);
  const us = await barAt(page, 0, 'US');
  await page.mouse.move(us.x, us.y);
  await page.waitForTimeout(300);
  const hover = await page.evaluate(() => { const p = document.querySelector('.alt-chart-hover path'); return p ? { stroke: getComputedStyle(p).stroke, w: getComputedStyle(p).strokeWidth } : null; });
  const action = await page.evaluate(() => document.querySelector('.alt-chart-readout-action')?.textContent);
  expect(cursor === 'pointer' && hover?.stroke === INK && hover.w === '2px' && action === 'Select to filter', `hover: a pointer, a 2px ink outline and "Select to filter" (${cursor}, ${JSON.stringify(hover)}, ${action})`);
  // Click selects; the linked chart follows; choosing it again clears.
  await page.mouse.click(us.x, us.y);
  await page.waitForTimeout(300);
  s = await state(page);
  expect(s.ops.US === 1 && s.frame === 'Filtered to USClear' && s.linked === 'Monthly revenue, US', `a click selects, and the linked chart follows (${s.frame}, ${s.linked})`);
  expect(await page.evaluate(() => document.querySelector('.alt-chart-readout-action')?.textContent) === 'Select to clear', 'over the selection, the readout says a click clears it');
  await page.mouse.click(us.x, us.y);
  await page.waitForTimeout(300);
  s = await state(page);
  expect(s.frame === '' && Object.values(s.ops).every((o) => o === 1) && s.linked === 'Monthly revenue, all regions', `choosing it again clears (${s.frame}, ${s.linked})`);
  await page.mouse.move(5, 5);
  // Keyboard: Enter selects, aria-pressed follows, Escape clears.
  await page.locator('.alt-chart').first().locator('.alt-chart-node').first().focus();
  await page.keyboard.press('Enter');
  const node = () => page.evaluate(() => ({ pressed: document.activeElement.getAttribute('aria-pressed'), name: document.activeElement.getAttribute('aria-label') }));
  let n = await node();
  expect(n.pressed === 'false' && /Press Enter to filter to it\.$/.test(n.name), `a point says it can be selected (${JSON.stringify(n)})`);
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  n = await node();
  s = await state(page);
  expect(n.pressed === 'true' && s.frame === 'Filtered to EUClear', `Enter selects and the point is pressed (${n.pressed}, ${s.frame})`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  s = await state(page);
  expect(s.frame === '' && (await node()).name?.startsWith('EU,'), `Escape clears the selection first, and stays on the point (${s.frame})`);
  // Clear does too.
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await page.waitForTimeout(150);
  expect((await state(page)).frame === '', 'Clear clears it');

  // Drilling: a quarter opens its months in Drilldown, and focus moves to the new chart's summary.
  const q2 = await barAt(page, 2, 'Q2');
  await page.mouse.move(q2.x, q2.y);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => document.querySelectorAll('.alt-chart')[2].querySelector('.alt-chart-readout-action')?.textContent) === 'Select to open', 'a drill says "Select to open"');
  await page.mouse.click(q2.x, q2.y);
  await page.waitForTimeout(500);
  const drilled = await page.evaluate(() => ({
    crumbs: [...document.querySelectorAll('.alt-crumbs li')].map((l) => l.textContent),
    title: document.querySelector('.alt-drill-view[data-phase="in"] .alt-chart-title')?.textContent,
    focus: document.activeElement?.closest('.alt-drill-view') ? document.activeElement.dataset.level ?? document.activeElement.className : null,
  }));
  expect(drilled.crumbs.join('>') === '2026>Q2' && drilled.title === 'Bookings by month, Q2 2026', `a click drills into the quarter (${drilled.crumbs}, ${drilled.title})`);
  expect(drilled.focus === 'summary', `focus moves to the new chart's summary (${drilled.focus})`);
  await page.getByRole('button', { name: '2026', exact: true }).click();
  await page.waitForTimeout(400);
  await page.locator('.alt-drill-view[data-phase="in"] .alt-chart-node').first().focus();
  await page.keyboard.press('Enter'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(() => document.activeElement.getAttribute('aria-haspopup')) === 'true', 'a point that drills says it opens something');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => [...document.querySelectorAll('.alt-crumbs li')].map((l) => l.textContent).join('>')) === '2026>Q3', 'Enter drills from the keyboard');
  await page.context().close();
}

// Touch: a tap selects.
{
  const page = await open('ChartSelect', { hasTouch: true, isMobile: false });
  const latam = await barAt(page, 0, 'LATAM');
  await page.touchscreen.tap(latam.x, latam.y);
  await page.waitForTimeout(300);
  expect((await state(page)).frame === 'Filtered to LATAMClear', `a tap selects (${(await state(page)).frame})`);
  await page.context().close();
}

// Forced colours: the hover outline is Highlight.
{
  const page = await open('ChartSelect', {}, { forcedColors: 'active' });
  const us = await barAt(page, 0, 'US');
  await page.mouse.move(us.x, us.y);
  await page.waitForTimeout(250);
  const [stroke, hi] = [await page.evaluate(() => getComputedStyle(document.querySelector('.alt-chart-hover path')).stroke), await ink(page, 'Highlight')];
  expect(stroke === hi, `forced: the hover outline is Highlight (${stroke} vs ${hi})`);
  await page.context().close();
}

// A chart whose marks don't act doesn't respond: no pointer, no outline, no action.
{
  const page = await open('BarChart');
  const box = await page.locator('.alt-bar-mark').first().boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 4);
  await page.waitForTimeout(250);
  const r = await page.evaluate(() => ({ cursor: getComputedStyle(document.querySelector('.alt-chart-plot')).cursor, hover: document.querySelectorAll('.alt-chart-hover').length, action: document.querySelectorAll('.alt-chart-readout-action').length, groups: document.querySelectorAll('.alt-chart-rel').length }));
  expect(r.cursor !== 'pointer' && r.hover === 0 && r.action === 0 && r.groups === 0, `a chart that doesn't act doesn't promise anything (${JSON.stringify(r)})`);
  await page.context().close();
}

await browser.close();
console.log(`chart-select: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
