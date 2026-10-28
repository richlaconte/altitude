// Range Slider (#73): two thumbs, each its own role="slider" with aria-valuemin/max bounded by the other; the raised
// accent fill runs between them in the one trench; thumbs can't cross or come within minStepsBetween; dragging the fill
// moves both; pressing the track outside them moves the nearer one; only the held thumb floats and shows its bubble;
// the APG multi-thumb keys; the single-value Slider is unchanged. Run after a render of every preview (it opens
// test/p-Slider-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (opts = {}, media) => {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 600 }, ...opts });
  const page = await ctx.newPage();
  if (media) await page.emulateMedia(media);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  await page.goto(`file://${T}p-Slider-daylight.html`);
  await page.waitForTimeout(400);
  return { page, errors };
};
const color = (page, v) => page.evaluate((v) => { const d = document.createElement('div'); d.style.color = v; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }, v);
const shadow = (page, v) => page.evaluate((v) => { const d = document.createElement('div'); d.style.boxShadow = v; document.body.append(d); const c = getComputedStyle(d).boxShadow; d.remove(); return c; }, v);
const read = (page) => page.evaluate(() => {
  const root = document.querySelector('.alt-slider[data-range]');
  const box = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; };
  const thumbs = [...root.querySelectorAll('.alt-slider-thumb')].map((t) => ({
    role: t.getAttribute('role'), tab: t.tabIndex, label: t.getAttribute('aria-label'), now: +t.getAttribute('aria-valuenow'),
    min: +t.getAttribute('aria-valuemin'), max: +t.getAttribute('aria-valuemax'), text: t.getAttribute('aria-valuetext'),
    held: t.hasAttribute('data-grabbed'), shadow: getComputedStyle(t).boxShadow, bubble: +getComputedStyle(t.querySelector('.alt-slider-bubble')).opacity, box: box(t),
  }));
  const fill = root.querySelector('.alt-slider-fill');
  return { thumbs, fill: { box: box(fill), hidden: fill.getAttribute('aria-hidden'), bg: getComputedStyle(fill).backgroundColor, shadow: getComputedStyle(fill).boxShadow, cursor: getComputedStyle(fill).cursor },
    track: box(root.querySelector('.alt-slider-track')), tracks: root.querySelectorAll('.alt-slider-track').length, role: root.getAttribute('role'),
    caption: root.nextElementSibling.textContent };
});
const settle = (page) => page.waitForTimeout(260);

{
  const { page, errors } = await open();
  let s = await read(page);
  const [a, b] = s.thumbs;
  expect(s.thumbs.length === 2 && s.thumbs.every((t) => t.role === 'slider' && t.tab === 0), 'two thumbs, each a slider and its own Tab stop');
  expect(a.label === 'Minimum price' && b.label === 'Maximum price', `each thumb named by its label (${a.label}, ${b.label})`);
  expect(a.now === 20 && b.now === 80 && a.text === '$20' && b.text === '$80', `values and formatted valuetext (${a.now} ${a.text}, ${b.now} ${b.text})`);
  expect(a.min === 0 && a.max === 70 && b.min === 30 && b.max === 200, `each thumb's bounds stop minStepsBetween short of the other (${a.min}–${a.max}, ${b.min}–${b.max})`);
  expect(s.tracks === 1 && s.role === 'group', 'one trench, in a group');
  expect(s.fill.hidden === 'true' && s.fill.bg === await color(page, 'var(--accent)'), 'the fill is accent, and hidden from assistive technology');
  expect(Math.abs(s.fill.box.x - a.box.cx) < 1.5 && Math.abs(s.fill.box.x + s.fill.box.w - b.box.cx) < 1.5, `the fill runs between the thumbs (${s.fill.box.x}–${s.fill.box.x + s.fill.box.w} vs ${a.box.cx}–${b.box.cx})`);
  expect(s.fill.cursor === 'grab', 'the fill shows it can be dragged');

  // Hover: the fill lifts because dragging it does something.
  const E1 = await shadow(page, 'var(--elev-1)'), E2 = await shadow(page, 'var(--elev-2)'), E3 = await shadow(page, 'var(--elev-3)');
  await page.mouse.move(s.fill.box.cx, s.fill.box.cy);
  await settle(page);
  s = await read(page);
  expect(s.fill.shadow === E2 && s.thumbs.every((t) => t.shadow === E1), 'hovering the fill lifts it to level 2, not the thumbs');
  await page.mouse.move(b.box.cx, b.box.cy);
  await settle(page);
  s = await read(page);
  expect(s.thumbs[1].shadow === E2 && s.thumbs[0].shadow === E1, 'hovering a thumb lifts that thumb only');

  // Drag the upper thumb: it floats to 3 with its bubble; the other stays at rest.
  await page.mouse.down();
  await page.mouse.move(b.box.cx + (s.track.w * 20) / 200, b.box.cy, { steps: 4 });
  await settle(page);
  s = await read(page);
  expect(s.thumbs[1].held && s.thumbs[1].shadow === E3 && s.thumbs[1].bubble === 1, 'the held thumb floats to level 3 with its bubble');
  expect(!s.thumbs[0].held && s.thumbs[0].shadow === E1 && s.thumbs[0].bubble === 0, 'the other thumb stays at rest, its bubble hidden');
  expect(s.thumbs[1].now === 100 && s.thumbs[0].now === 20, `dragging moves only that thumb (${s.thumbs[0].now}, ${s.thumbs[1].now})`);
  // Push it into the other: it stops minStepsBetween short.
  await page.mouse.move(s.track.x + 2, b.box.cy, { steps: 6 });
  s = await read(page);
  expect(s.thumbs[1].now === 30 && s.thumbs[0].now === 20, `a thumb pushed against the other stops, no crossing (${s.thumbs[0].now}, ${s.thumbs[1].now})`);
  await page.mouse.up();

  // Keys, then dragging the fill: both move together and keep their width, and stop at the end.
  await page.locator('.alt-slider[data-range] .alt-slider-thumb').nth(1).focus();
  await page.keyboard.press('End');
  await page.locator('.alt-slider[data-range] .alt-slider-thumb').nth(0).focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
  s = await read(page);
  expect(s.thumbs[0].now === 50 && s.thumbs[1].now === 200, `arrows step, End goes to the thumb's own bound (${s.thumbs[0].now}, ${s.thumbs[1].now})`);
  await page.locator('.alt-slider[data-range] .alt-slider-thumb').nth(1).focus();
  await page.keyboard.press('PageDown');
  s = await read(page);
  expect(s.thumbs[1].now === 180, `Page Down jumps a tenth (${s.thumbs[1].now})`);
  await page.keyboard.press('Home');
  s = await read(page);
  expect(s.thumbs[1].now === 60 && s.thumbs[1].min === 60, `Home goes to the thumb's own lower bound, the other thumb plus the gap (${s.thumbs[1].now})`);
  await page.keyboard.press('End');
  await page.waitForTimeout(200);
  s = await read(page);
  const start = s.fill.box.cx;
  await page.mouse.move(start, s.fill.box.cy);
  await page.mouse.down();
  await page.mouse.move(start - (s.track.w * 30) / 200, s.fill.box.cy, { steps: 5 });
  await settle(page);
  s = await read(page);
  expect(s.thumbs[0].now === 20 && s.thumbs[1].now === 170, `dragging the fill moves both thumbs together (${s.thumbs[0].now}, ${s.thumbs[1].now})`);
  expect(s.thumbs.every((t) => t.held && t.shadow === E3 && t.bubble === 1) && s.fill.shadow === E2, 'panning holds both thumbs; the fill stays lifted');
  await page.mouse.move(s.track.x - 200, s.fill.box.cy, { steps: 5 });
  s = await read(page);
  expect(s.thumbs[0].now === 0 && s.thumbs[1].now === 150, `the pan stops at the end, keeping its width (${s.thumbs[0].now}, ${s.thumbs[1].now})`);
  await page.mouse.up();
  await settle(page);
  s = await read(page);
  expect(s.thumbs.every((t) => !t.held), 'letting go sets both down');
  expect(/^Price \$0–\$150/.test(s.caption), `onValueChange reports the pair (${s.caption})`);

  // Pressing the track outside the thumbs moves the nearer one there.
  await page.mouse.click(s.track.x + (s.track.w * 190) / 200, s.track.y + s.track.h / 2);
  s = await read(page);
  expect(s.thumbs[1].now === 190 && s.thumbs[0].now === 0, `a click past the upper thumb moves it (${s.thumbs[0].now}, ${s.thumbs[1].now})`);
  expect(await page.evaluate(() => document.activeElement.getAttribute('aria-label')) === 'Maximum price', 'and focuses it');
  await page.mouse.click(s.track.x + (s.track.w * 40) / 200, s.track.y + s.track.h / 2);
  s = await read(page);
  expect(s.thumbs[0].now === 0 && s.thumbs[1].now === 190, `a click between the thumbs (on the fill) moves neither (${s.thumbs[0].now}, ${s.thumbs[1].now})`);

  // The single-value Slider is as it was.
  const one = await page.evaluate(() => { const r = document.querySelector('.alt-slider:not([data-range])'), t = r.querySelector('.alt-slider-thumb'); return { n: r.querySelectorAll('.alt-slider-thumb').length, role: r.getAttribute('role'), now: t.getAttribute('aria-valuenow'), min: t.getAttribute('aria-valuemin'), max: t.getAttribute('aria-valuemax'), text: t.getAttribute('aria-valuetext'), w: r.querySelector('.alt-slider-fill').style.width }; });
  expect(one.n === 1 && one.role === null && one.now === '64' && one.min === '0' && one.max === '100' && one.text === null && one.w === '64%', `the single-value Slider is unchanged (${JSON.stringify(one)})`);
  expect(errors.length === 0, `no console errors (${errors})`);
}

{ // At 360px the thumbs are still apart, and the trench fits.
  const { page } = await open({ viewport: { width: 360, height: 600 }, deviceScaleFactor: 2 });
  const s = await read(page);
  expect(s.track.x >= 0 && s.track.x + s.track.w <= 360 && s.thumbs[1].box.x - (s.thumbs[0].box.x + s.thumbs[0].box.w) > 0, 'fits at 360px with the thumbs apart');
}

{ // Forced colours: the fill is Highlight in a dashed trench; each thumb is outlined.
  const { page } = await open({ forcedColors: 'active' });
  const f = await page.evaluate(() => { const r = document.querySelector('.alt-slider[data-range]'); return { fill: getComputedStyle(r.querySelector('.alt-slider-fill')).backgroundColor, track: getComputedStyle(r.querySelector('.alt-slider-track')).borderStyle, thumbs: [...r.querySelectorAll('.alt-slider-thumb')].map((t) => getComputedStyle(t).borderStyle) }; });
  expect(f.fill === await color(page, 'Highlight') && f.track === 'dashed' && f.thumbs.every((b) => b === 'solid'), `forced colours keep the parts apart (${JSON.stringify(f)})`);
}

{ // Thumbs that meet: with minStepsBetween 0, the first move picks which one goes.
  const { page } = await open();
  await page.evaluate(() => {
    const host = document.createElement('div'); host.id = 'tie'; host.style.cssText = 'width:400px;margin:20px';
    document.body.append(host);
    const A = window.Altitude;
    window.ReactDOM.createRoot(host).render(window.React.createElement(A.AltitudeProvider, null, window.React.createElement(A.Slider, { defaultValue: [50, 50], 'aria-label': 'Window' })));
  });
  await page.waitForTimeout(200);
  const names = await page.$$eval('#tie .alt-slider-thumb', (ts) => ts.map((t) => t.getAttribute('aria-label')));
  expect(names[0] === 'Window, minimum' && names[1] === 'Window, maximum' && await page.$eval('#tie .alt-slider', (r) => r.getAttribute('aria-label')) === 'Window', `one name names the group and both thumbs (${names})`);
  const t = await page.$eval('#tie .alt-slider-thumb', (e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.mouse.move(t.x, t.y); await page.mouse.down(); await page.mouse.move(t.x - 80, t.y, { steps: 4 }); await page.mouse.up();
  let v = await page.$$eval('#tie .alt-slider-thumb', (ts) => ts.map((e) => +e.getAttribute('aria-valuenow')));
  expect(v[0] < 50 && v[1] === 50, `dragging left from a tie moves the lower thumb (${v})`);
  await page.mouse.move(t.x - 80, t.y); await page.mouse.down(); await page.mouse.move(t.x + 80, t.y, { steps: 6 }); await page.mouse.up();
  v = await page.$$eval('#tie .alt-slider-thumb', (ts) => ts.map((e) => +e.getAttribute('aria-valuenow')));
  expect(v[0] === 50 && v[1] === 50, `and it stops at the other thumb (${v})`);
}

await browser.close();
console.log(`range-slider: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
