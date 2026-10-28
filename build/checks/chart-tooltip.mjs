// ChartTooltip: pointing at a chart snaps a crosshair to the nearest x and floats a readout of every series there; it
// steps between positions, flips so it never covers the point, leaves when the pointer does (warm on a quick return),
// can be turned off, works by press-and-hold on touch, and inserts labels as text. Run after a render of every preview
// (it opens test/p-LineChart-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const context = await browser.newContext({ viewport: { width: 960, height: 900 }, hasTouch: true });
const page = await context.newPage();
await page.goto(`file://${T}p-LineChart-daylight.html`);
await page.waitForTimeout(700);

const plot = page.locator('.alt-chart-plot').nth(3); // Seats by plan: six months, four series
const box = await plot.boundingBox();
const state = () => plot.evaluate((p) => {
  const r = p.querySelector('.alt-chart-readout'), c = p.querySelector('.alt-chart-crosshair');
  return {
    open: r?.dataset.state ?? null, side: r?.dataset.side, warm: r?.hasAttribute('data-warm'), hidden: r?.getAttribute('aria-hidden'),
    left: r ? parseFloat(r.style.left) : null, label: r?.querySelector('.alt-chart-readout-label')?.textContent,
    rows: r ? [...r.querySelectorAll('.alt-chart-readout-row')].map((x) => x.textContent) : [],
    transition: r ? getComputedStyle(r).transitionProperty : '',
    cross: c ? +c.getAttribute('x1') : null, rings: p.querySelectorAll('.alt-line-active').length,
  };
});

// Hover: the readout opens on the nearest month, lists all four series, and is hidden from assistive technology.
await page.mouse.move(box.x + box.width * 0.12, box.y + box.height * 0.5);
await page.waitForTimeout(350);
let s = await state();
expect(s.open === 'open' && s.hidden === 'true', `pointing opens the readout, aria-hidden (${s.open}, ${s.hidden})`);
expect(s.label === 'Jan 1, 2026' && s.rows.length === 4 && s.rows[0] === '40Free', `the readout names the x and lists every series: ${s.label} ${s.rows}`);
expect(s.cross !== null && s.rings === 4, `a crosshair at that x and the four points ringed (${s.rings})`);
expect(s.side === 'right', `near the left edge it opens to the right: ${s.side}`);

// Moving steps to the next x at once: left isn't animated, so it never drifts between positions.
const first = s.left;
await page.mouse.move(box.x + box.width * 0.32, box.y + box.height * 0.5);
await page.waitForTimeout(30);
s = await state();
expect(s.left > first && !/\bleft\b|\ball\b/.test(s.transition), `it steps to the next x without easing (left ${first} → ${s.left}; transitions: ${s.transition})`);

// Near the right edge it flips, so it never covers the point.
await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5);
await page.waitForTimeout(100);
s = await state();
expect(s.side === 'left', `near the right edge it opens to the left: ${s.side}`);

// Leaving closes it; coming back within 400ms opens it warm.
await page.mouse.move(box.x + box.width / 2, box.y - 60);
await page.waitForTimeout(60);
expect((await state()).open === 'closed', 'leaving the plot closes the readout');
await page.waitForTimeout(250);
expect((await state()).open === null, 'and it is gone after its exit');
await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
await page.waitForTimeout(200);
s = await state();
expect(s.open === 'open' && s.warm, 'back within 400ms, it opens warm (shared with Tooltip)');
await page.mouse.move(box.x + box.width / 2, box.y - 60);
await page.waitForTimeout(400);

// Touch: press and hold shows it; dragging scrubs; lifting leaves it; a tap elsewhere closes it.
{
  const cdp = await context.newCDPSession(page);
  const at = (fx) => [{ x: box.x + box.width * fx, y: box.y + box.height * 0.5 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0.12) });
  await page.waitForTimeout(120);
  expect((await state()).open === null, 'a brief touch does nothing yet (it may be a scroll)');
  await page.waitForTimeout(300);
  s = await state();
  expect(s.open === 'open' && s.label === 'Jan 1, 2026', `press and hold shows the readout: ${s.label}`);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(0.5) });
  await page.waitForTimeout(80);
  s = await state();
  expect(s.label !== 'Jan 1, 2026', `dragging scrubs along x: ${s.label}`);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(250);
  expect((await state()).open === 'open', 'lifting the finger leaves it open');
  await page.touchscreen.tap(box.x + box.width / 2, box.y - 120);
  await page.waitForTimeout(300);
  expect((await state()).open === null, 'a tap elsewhere closes it');
}

// tooltip={false} turns it off; labels from data are text, never HTML; reduced motion doesn't travel.
{
  const out = await page.evaluate(() => new Promise((done) => {
    const d = document.createElement('div'); d.style.cssText = 'width:420px;position:fixed;top:0;left:0;z-index:9999;background:#fff'; document.body.prepend(d);
    const A = window.Altitude, h = React.createElement;
    const rows = [{ k: '<b>bold</b>', v: 3 }, { k: 'two', v: 5 }];
    ReactDOM.createRoot(d).render(h('div', null,
      h(A.AltitudeProvider, { motion: 'reduced' }, h(A.ChartContainer, { id: 'on', config: { v: { label: '<i>V</i>' } } }, h(A.BarChart, { data: rows, x: 'k' }))),
      h(A.ChartContainer, { id: 'off', config: { v: { label: 'V' } } }, h(A.BarChart, { data: rows, x: 'k', tooltip: false }))));
    setTimeout(() => done(true), 500);
  }));
  void out;
  const on = page.locator('#on .alt-chart-plot'), off = page.locator('#off .alt-chart-plot');
  const ob = await on.boundingBox();
  await page.mouse.move(ob.x + ob.width * 0.3, ob.y + ob.height * 0.5);
  await page.waitForTimeout(400);
  const r = await on.evaluate((p) => { const x = p.querySelector('.alt-chart-readout'); return { html: x.innerHTML, t: getComputedStyle(x).transform }; });
  expect(!r.html.includes('<b>') && r.html.includes('&lt;b&gt;') && r.html.includes('&lt;i&gt;'), 'labels from data are inserted as text');
  expect(r.t === 'none' || r.t === 'matrix(1, 0, 0, 1, 0, 0)', `reduced motion: the readout doesn't travel (${r.t})`);
  const fb = await off.boundingBox();
  await page.mouse.move(fb.x + fb.width * 0.3, fb.y + fb.height * 0.5);
  await page.waitForTimeout(300);
  expect(await off.evaluate((p) => !p.querySelector('.alt-chart-readout') && !p.querySelector('.alt-chart-crosshair')), 'tooltip={false}: no readout, no crosshair');
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
