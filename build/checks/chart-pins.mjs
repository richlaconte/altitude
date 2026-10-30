// Pinned readings (#190): with pinnable, a click (or P on the keyboard path, or a tap while the touch readout is open)
// sets the reading down as a plate at the top of the plot, with a pin icon, a 1px line-control leader and a ghost
// remove button; it lands from level 3 to the ground and is announced; two pins say their difference under the x axis;
// a third replaces the oldest; Escape removes the last; where clicks select, only P pins; pins can be controlled.
// Run after a render of every preview (it opens test/p-ChartTooltip-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const context = await browser.newContext({ viewport: { width: 960, height: 1000 }, hasTouch: true });
const page = await context.newPage();
await page.goto(`file://${T}p-ChartTooltip-daylight.html`);
await page.waitForTimeout(700);

const read = (sel) => page.evaluate((sel) => {
  const f = document.querySelector(sel);
  return {
    plates: [...f.querySelectorAll('.alt-chart-note[data-pin]')].map((p) => ({ name: p.getAttribute('aria-label'), role: p.getAttribute('role'), text: p.textContent, icon: !!p.querySelector('.alt-chart-pin-icon'), remove: p.querySelector('button')?.getAttribute('aria-label'), top: p.getBoundingClientRect().top })),
    leaders: f.querySelectorAll('.alt-chart-note-leader').length,
    strip: f.querySelector('.alt-chart-pins-strip text')?.textContent ?? null,
    said: [...f.querySelectorAll('[aria-live]')].map((e) => e.textContent).join(' '),
    plotTop: f.querySelector('.alt-chart-plot').getBoundingClientRect().top,
  };
}, sel);

// The preview: two pins on the opened-issues line.
const P = '.alt-card:nth-child(3) .alt-chart';
let r = await read(P);
expect(r.plates.length === 2 && r.plates.every((p) => p.icon && p.role === 'group'), `two pinned plates, each with a pin icon (${JSON.stringify(r.plates.map((p) => p.text))})`);
expect(r.plates[0].name === 'Pinned Mar 9, 2026: 38 Opened' && r.plates[0].remove === 'Remove pin, Mar 9, 2026', `each is named, and so is its remove button (${r.plates[0].name}; ${r.plates[0].remove})`);
expect(r.leaders === 2, `each plate has a leader to its x (${r.leaders})`);
expect(r.strip === '+24% over 28 days', `two pins say their difference under the axis ("${r.strip}")`);
const lc = await page.evaluate(() => { const d = document.createElement('div'); d.style.color = 'var(--line-control)'; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; });
const stripStroke = await page.evaluate((P) => getComputedStyle(document.querySelector(`${P} .alt-chart-pins-strip path`)).stroke, P);
expect(stripStroke === lc, `on a line-control bracket (${stripStroke})`);
await page.waitForTimeout(500);
const settled = await page.evaluate((P) => {
  const plain = document.createElement('span'); plain.className = 'alt-badge'; plain.dataset.variant = 'plate'; document.querySelector(P).append(plain);
  const want = getComputedStyle(plain).boxShadow; plain.remove();
  return { got: getComputedStyle(document.querySelector(`${P} .alt-chart-note[data-pin]`)).boxShadow, want };
}, P);
expect(settled.got === settled.want, `a plate settles on the ground, built like a Badge plate (${settled.got})`);

// Remove one with its button; it's announced.
await page.locator(`${P} .alt-chart-pin-remove`).first().click();
await page.waitForTimeout(100);
r = await read(P);
expect(r.plates.length === 1 && r.strip === null && /Pin removed, Mar 9, 2026\./.test(r.said), `the remove button takes it off and says so (${r.plates.length}, "${r.said}")`);

// Click pins the reading under the pointer; the second announces the comparison; a third replaces the oldest.
const box = await page.locator(`${P} .alt-chart-plot`).boundingBox();
await page.mouse.move(box.x + box.width * 0.08, box.y + box.height * 0.6);
await page.waitForTimeout(250);
const action = await page.evaluate((P) => document.querySelector(`${P} .alt-chart-readout-action`)?.textContent, P);
expect(action === 'Click to pin', `the readout says how to pin ("${action}")`);
await page.mouse.click(box.x + box.width * 0.08, box.y + box.height * 0.6);
await page.waitForTimeout(150);
r = await read(P);
expect(r.plates.length === 2 && /Pinned Mar 2, 2026: 31 Opened\. Apr 6, 2026 is 52% higher than Mar 2, 2026\./.test(r.said), `a click pins it, and the pair is compared aloud ("${r.said}")`);
await page.mouse.click(box.x + box.width * 0.45, box.y + box.height * 0.6);
await page.waitForTimeout(150);
r = await read(P);
expect(r.plates.length === 2 && !r.plates.some((p) => /Apr 6/.test(p.name)), `a third pin replaces the oldest (${r.plates.map((p) => p.name)})`);

// Keyboard: P pins the focused point; Escape removes the last pin before anything else.
await page.mouse.move(box.x + box.width / 2, box.y - 80);
await page.locator(`${P} .alt-chart-node`).focus();
await page.keyboard.press('Enter');
await page.keyboard.press('End');
await page.keyboard.press('p');
await page.waitForTimeout(120);
r = await read(P);
expect(r.plates.some((p) => /Apr 13/.test(p.name)) && /Pinned Apr 13, 2026/.test(r.said), `P pins the focused point (${r.plates.map((p) => p.name)})`);
await page.keyboard.press('Escape');
await page.waitForTimeout(120);
r = await read(P);
const lvl = await page.evaluate(() => document.activeElement?.dataset.level);
expect(r.plates.length === 1 && !r.plates.some((p) => /Apr 13/.test(p.name)) && lvl === 'point', `Escape removes the last pin and stays on the point (${r.plates.map((p) => p.name)}, ${lvl})`);

// Our own charts: touch, a chart whose clicks select, and controlled pins.
await page.evaluate(() => new Promise((done) => {
  const d = document.createElement('div'); d.id = 'pn'; d.style.cssText = 'width:440px;position:absolute;top:0;left:0;z-index:9;background:#fff'; document.body.prepend(d);
  const A = window.Altitude, h = React.createElement, rows = [{ k: 'a', v: 4 }, { k: 'b', v: 6 }, { k: 'c', v: 9 }];
  window.__changes = [];
  function Sel() {
    const [sel, setSel] = React.useState(null);
    return h(A.ChartContainer, { id: 'sel', config: { v: { label: 'V' } } }, h(A.BarChart, { data: rows, x: 'k', pinnable: true, selected: sel?.k, onSelect: (r) => setSel(r) }));
  }
  ReactDOM.createRoot(d).render(h('div', null,
    h(A.ChartContainer, { id: 'tch', config: { v: { label: 'V' } } }, h(A.BarChart, { data: rows, x: 'k', pinnable: 1 })),
    h(Sel),
    h(A.ChartContainer, { id: 'ctl', config: { v: { label: 'V' } } }, h(A.BarChart, { data: rows, x: 'k', pinnable: true, pins: ['b'], onPinsChange: (p) => window.__changes.push(p) }))));
  setTimeout(done, 450);
}));
{
  const tb = await page.locator('#tch .alt-chart-plot').boundingBox();
  const cdp = await context.newCDPSession(page);
  const at = (fx) => [{ x: tb.x + tb.width * fx, y: tb.y + tb.height * 0.6 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0.2) });
  await page.waitForTimeout(400);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(150);
  expect((await read('#tch')).plates.length === 0, 'opening the touch readout by holding doesn\'t pin');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0.8) });
  await page.waitForTimeout(80);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(150);
  const t = await read('#tch');
  expect(t.plates.length === 1 && /Pinned c:/.test(t.plates[0].name), `with the touch readout open, a tap pins the reading there (${t.plates.map((p) => p.name)})`);
}
{
  const sb = await page.locator('#sel .alt-chart-plot').boundingBox();
  await page.mouse.click(sb.x + sb.width * 0.5, sb.y + sb.height * 0.7);
  await page.waitForTimeout(150);
  const s = await read('#sel');
  const pressed = await page.evaluate(() => document.querySelector('#sel figcaption').textContent);
  expect(s.plates.length === 0 && /Filtered to b/.test(pressed), `where a click selects, it selects and doesn't pin (${s.plates.length})`);
  await page.locator('#sel .alt-chart-node').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('p');
  await page.waitForTimeout(120);
  expect((await read('#sel')).plates.length === 1, 'P still pins there');
}
{
  const c = await read('#ctl');
  expect(c.plates.length === 1 && /Pinned b:/.test(c.plates[0].name), 'controlled pins show what they\'re given');
  await page.locator('#ctl .alt-chart-pin-remove').click();
  await page.waitForTimeout(100);
  const changes = await page.evaluate(() => window.__changes);
  expect(JSON.stringify(changes) === '[[]]' && (await read('#ctl')).plates.length === 1, `removing calls onPinsChange and waits for the new pins (${JSON.stringify(changes)})`);
}

// Forced colours: the bracket and words in CanvasText.
{
  const fp = await browser.newPage({ viewport: { width: 960, height: 1000 } });
  await fp.emulateMedia({ forcedColors: 'active' });
  await fp.goto(`file://${T}p-ChartTooltip-daylight.html`);
  await fp.waitForTimeout(600);
  const f = await fp.evaluate(() => { const s = document.querySelector('.alt-chart-pins-strip'); return { line: getComputedStyle(s.querySelector('path')).stroke, text: getComputedStyle(s.querySelector('text')).fill }; });
  expect(f.line === 'rgb(0, 0, 0)' && f.text === 'rgb(0, 0, 0)', `forced colours: CanvasText (${JSON.stringify(f)})`);
  await fp.close();
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
