// ChartCite (#532): a figure in a chart's sentence cites the mark it comes from. Each cite is a button in the frame's
// Tab order (not the plot's one stop), an ink plate with the series' marker; its name says what it cites; pointing at it
// or focusing it lights the cited mark with the 2px accent-ink ring and opens the readout there (a window lays a flat
// line band under its stretch and the readout says "Cited: average of 13 days"); leaving closes it; Enter pins the
// reading and Enter again unpins it, Escape on the plot takes pins off last first; the plate lifts one level on focus;
// with devChecks on, a figure that isn't the record's value, or a cite whose x isn't in the data, warns once, and a
// right one doesn't. Run after a render of every preview (it opens test/p-ScreenLayoutReport-daylight.html); exits
// non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 900 }, ...opts });
  const page = await ctx.newPage();
  const errors = [], warnings = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warning') warnings.push(m.text()); });
  await page.goto(`file://${T}p-ScreenLayoutReport-daylight.html`);
  await page.waitForTimeout(600);
  Object.assign(page, { errors, warnings });
  return page;
};
const state = (page) => page.evaluate(() => {
  const fig = document.querySelector('.alt-chart');
  return {
    ring: fig.querySelectorAll('.alt-chart-cite-ring circle, .alt-chart-cite-ring path').length,
    band: fig.querySelector('.alt-chart-cite-band') ? +fig.querySelector('.alt-chart-cite-band').getAttribute('width') : 0,
    readout: fig.querySelector('.alt-chart-readout')?.textContent ?? null,
    pins: fig.querySelectorAll('.alt-chart-note[data-pin]').length,
  };
});

{
  const page = await open();
  const cites = page.locator('button.alt-chart-cite');
  expect(await cites.count() === 3, `three cites: two in the takeaway, one in the summary (${await cites.count()})`);
  const names = await cites.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(/^39 a day, cites Signups, average of 13 days to 13 Oct 2026: 39\.3\. Press Enter to pin\.$/.test(names[0]), `a window cite's name says what it covers (${names[0]})`);
  expect(/^\d+, cites Signups, \d+ Oct 2026: \d+\. Press Enter to pin\.$/.test(names[2]), `a single cite's name says its record (${names[2]})`);
  // In ink, never a series colour; the marker is ink-muted.
  const look = await page.evaluate(() => {
    const c = document.querySelector('button.alt-chart-cite');
    const ink = (() => { const d = document.createElement('div'); d.style.color = 'var(--ink)'; document.body.append(d); const v = getComputedStyle(d).color; d.remove(); return v; })();
    return { color: getComputedStyle(c).color, ink, shadow: getComputedStyle(c).boxShadow, marker: !!c.querySelector('svg.alt-chart-cite-mark') };
  });
  expect(look.color === look.ink && look.marker && /inset/.test(look.shadow), `an ink plate with a marker, flush (${JSON.stringify(look)})`);
  // The cites aren't in the plot's one stop: Tab reaches them from the page.
  const tabIdx = await cites.evaluateAll((els) => els.map((e) => e.tabIndex));
  expect(tabIdx.every((t) => t === 0), `each cite is a Tab stop (${tabIdx})`);

  // Hover a window cite: a band and the readout, no ring.
  await cites.nth(0).hover();
  await page.waitForTimeout(300);
  let s = await state(page);
  expect(s.band > 20 && s.ring === 0 && /^13 Oct 2026/.test(s.readout ?? '') && /Cited: average of 13 days, 39\.3/.test(s.readout ?? ''), `a window lays a band and the readout says what's cited (${JSON.stringify(s)})`);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(300);
  s = await state(page);
  expect(s.band === 0 && !s.readout, `leaving takes it away (${JSON.stringify(s)})`);

  // Focus the single cite: a ring on its mark and the readout at its record.
  await cites.nth(2).focus();
  await page.waitForTimeout(300);
  s = await state(page);
  const ring = await page.evaluate(() => { const r = document.querySelector('.alt-chart-cite-ring circle, .alt-chart-cite-ring path'); return r ? { stroke: getComputedStyle(r).stroke, w: getComputedStyle(r).strokeWidth } : null; });
  const accentInk = await page.evaluate(() => { const d = document.createElement('div'); d.style.color = 'var(--accent-ink)'; document.querySelector('.alt-chart').append(d); const v = getComputedStyle(d).color; d.remove(); return v; });
  expect(s.ring === 1 && s.band === 0 && ring?.stroke === accentInk && ring.w === '2px', `focus rings the cited mark in 2px accent-ink (${JSON.stringify(s)}, ${JSON.stringify(ring)})`);
  const label = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  const day = label.match(/, (\d+ Oct 2026):/)?.[1];
  expect(!!day && s.readout?.startsWith(day), `the readout opens at the cited record (${day}, ${s.readout})`);
  const lift = await page.evaluate(() => {
    const c = document.activeElement, e = document.createElement('div'); e.style.boxShadow = 'var(--elev-1)'; document.querySelector('.alt-chart').append(e);
    const elev = getComputedStyle(e).boxShadow; e.remove();
    return { shadow: getComputedStyle(c).boxShadow, elev, outline: getComputedStyle(c).outlineStyle };
  });
  expect(lift.shadow === lift.elev && lift.outline === 'solid', `focused, the plate lifts to elev-1 with the focus ring (${JSON.stringify(lift)})`);

  // Enter pins; Enter again unpins.
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  s = await state(page);
  const pinnedName = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  expect(s.pins === 1 && /Pinned\.$/.test(pinnedName), `Enter pins the reading (${s.pins}, ${pinnedName})`);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  expect((await state(page)).pins === 0, 'Enter again unpins it');
  // Pin two, then Escape on the plot takes the last one off first.
  await page.keyboard.press('Enter');
  await cites.nth(1).focus(); await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  expect((await state(page)).pins === 2, 'two cites pin two readings');
  await page.locator('.alt-chart .alt-chart-node').first().focus();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const left = await page.evaluate(() => [...document.querySelectorAll('.alt-chart .alt-chart-note[data-pin]')].map((p) => p.getAttribute('aria-label')));
  expect(left.length === 1 && !/31 Oct/.test(left[0]), `Escape on the plot unpins the last first (${left})`);
  // The plot itself doesn't pin: clicking it doesn't add one.
  const box = await page.locator('.alt-chart-plot').boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.waitForTimeout(200);
  expect((await state(page)).pins === 1, 'a chart that isn\'t pinnable still doesn\'t pin from the plot');
  expect(page.errors.length === 0 && page.warnings.length === 0, `no errors or warnings (${[...page.errors, ...page.warnings].join(' | ')})`);

  // With devChecks: a wrong figure and a missing x warn, once each; a right figure doesn't.
  const warned = await page.evaluate(async () => {
    const out = [];
    const orig = console.warn;
    console.warn = (...a) => { out.push(a.join(' ')); };
    const { AltitudeProvider, ChartContainer, LineChart, ChartCite } = window.Altitude;
    const h = React.createElement, el = document.createElement('div');
    document.body.append(el);
    const rows = [{ d: '2026-10-01', v: 10 }, { d: '2026-10-02', v: 76 }, { d: '2026-10-03', v: 1250 }, { d: '2026-10-06', v: 40 }];
    const tree = h(AltitudeProvider, { devChecks: true }, h(ChartContainer, { config: { v: { label: 'Signups' } }, locale: 'en-GB',
      takeaway: h(React.Fragment, null, h(ChartCite, { x: '2026-10-02' }, '80'), ' ', h(ChartCite, { x: '2026-10-09' }, '5'), ' ', h(ChartCite, { x: '2026-10-01' }, '10 a day'), ' ', h(ChartCite, { x: '2026-10-03' }, '1.3K'), ' ', h(ChartCite, { x: '2026-10-02', window: 2 }, '43')) },
      h(LineChart, { data: rows, x: 'd' })));
    const root = ReactDOM.createRoot(el);
    root.render(tree);
    await new Promise((r) => setTimeout(r, 400));
    root.render(tree);
    await new Promise((r) => setTimeout(r, 200));
    console.warn = orig;
    root.unmount(); el.remove();
    return out;
  });
  expect(warned.length === 2, `two warnings, once each (${warned.length}: ${warned.join(' | ')})`);
  expect(warned.some((w) => w === "ChartCite: '80' cites Signups on 2 Oct 2026, which is 76."), `a wrong figure says what the record is (${warned[0]})`);
  expect(warned.some((w) => /^ChartCite: '5' cites a series at 2026-10-09, which isn't in the chart's data\.$/.test(w)), `a missing x says so (${warned[1]})`);
}

// Reduced motion: the plate doesn't travel; the ring and readout appear in place.
{
  const page = await open({ reducedMotion: 'reduce' });
  await page.locator('button.alt-chart-cite').nth(2).focus();
  await page.waitForTimeout(80);
  const t = await page.evaluate(() => getComputedStyle(document.activeElement).transform);
  const s = await state(page);
  expect((t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)') && s.ring === 1, `under reduced motion the plate doesn't travel and the ring is there (${t}, ${s.ring})`);
}

// Forced colours: the ring is Highlight, the plate keeps an edge.
{
  const page = await open({ forcedColors: 'active' });
  await page.locator('button.alt-chart-cite').nth(2).focus();
  await page.waitForTimeout(200);
  const f = await page.evaluate(() => ({ ring: getComputedStyle(document.querySelector('.alt-chart-cite-ring circle, .alt-chart-cite-ring path')).stroke, edge: getComputedStyle(document.activeElement).borderTopStyle }));
  expect(f.ring !== 'none' && f.edge === 'solid', `under forced colours the ring and the plate's edge stay (${JSON.stringify(f)})`);
}

await browser.close();
console.log(`chart-cite: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
