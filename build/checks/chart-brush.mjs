// ChartBrush (#74): an overview under the plot, the whole series a flat line in a trench; the window a raised lens
// (level 1, accent rim, clear face; 2 on hover, 3 held) with two grips that are sliders named "Window start" and
// "Window end" with dates as aria-valuetext; outside the window the overview recedes to 35%. Dragging the lens pans,
// a grip resizes (the grips can't cross), pressing outside centres the window there; arrow keys on the lens pan. The
// chart shows only the window, the frame says it in words, and a controlled window is the DateRangePicker's state.
// Run after a render of every preview (it opens test/p-ChartBrush-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 1100 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  await page.goto(`file://${T}p-ChartBrush-daylight.html`);
  await page.waitForTimeout(600);
  return { page, errors };
};
const color = (page, v) => page.evaluate((v) => { const d = document.createElement('div'); d.style.color = v; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }, v);
const shadow = (page, v) => page.evaluate((v) => { const d = document.createElement('div'); d.style.boxShadow = v; document.body.append(d); const c = getComputedStyle(d).boxShadow; d.remove(); return c; }, v);
const read = (page, n = 0) => page.evaluate((n) => {
  const fig = document.querySelectorAll('.alt-chart')[n], b = fig.querySelector('.alt-brush');
  const box = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; };
  const lens = b.querySelector('.alt-brush-lens'), track = b.querySelector('.alt-brush-track');
  return {
    label: b.getAttribute('aria-label'), role: b.getAttribute('role'),
    lens: { box: box(lens), label: lens.getAttribute('aria-label'), role: lens.getAttribute('role'), tab: lens.tabIndex, border: getComputedStyle(lens).borderTopColor, bw: getComputedStyle(lens).borderTopWidth, bg: getComputedStyle(lens).backgroundColor, shadow: getComputedStyle(lens).boxShadow },
    grips: [...b.querySelectorAll('.alt-brush-grip')].map((g) => ({ role: g.getAttribute('role'), label: g.getAttribute('aria-label'), text: g.getAttribute('aria-valuetext'), now: +g.getAttribute('aria-valuenow'), min: +g.getAttribute('aria-valuemin'), max: +g.getAttribute('aria-valuemax'), box: box(g), shadow: getComputedStyle(g).boxShadow, bubble: +getComputedStyle(g.querySelector('.alt-brush-bubble')).opacity, bubbleBox: box(g.querySelector('.alt-brush-bubble')) })),
    track: { box: box(track), bg: getComputedStyle(track).backgroundColor, shadow: getComputedStyle(track).boxShadow, border: getComputedStyle(track).borderTopStyle },
    outside: +b.querySelector('.alt-brush-outside').getAttribute('opacity'), clip: !!b.querySelector('.alt-brush-inside[clip-path]'),
    flat: !b.querySelector('.alt-brush-svg [fill]:not([fill="none"]):not(rect)') && ![...b.querySelectorAll('.alt-brush-svg *')].some((e) => getComputedStyle(e).filter !== 'none'),
    lineStroke: getComputedStyle(b.querySelector('.alt-brush-line')).stroke,
    caption: b.querySelector('.alt-brush-range').textContent,
    ticks: [...fig.querySelectorAll('.alt-chart-svg text')].map((t) => t.textContent),
    bars: fig.querySelectorAll('.alt-bar-mark').length,
    picker: [...(fig.closest('.alt-card')?.querySelectorAll('.alt-date-range .alt-date-segs') ?? [])].map((g) => [...g.querySelectorAll('.alt-date-seg')].map((x) => x.textContent).join('/')).join(' '),
    figW: box(fig).w, figX: box(fig).x,
  };
}, n);
const drag = async (page, from, dx, steps = 8) => { await page.mouse.move(from.cx, from.cy); await page.mouse.down(); await page.mouse.move(from.cx + dx, from.cy, { steps }); };
const DAY = (track) => track.w / 364;

{
  const { page, errors } = await open();
  const E1 = await shadow(page, 'var(--elev-1)'), E2 = await shadow(page, 'var(--elev-2)'), E3 = await shadow(page, 'var(--elev-3)');
  let s = await read(page);
  expect(s.role === 'group' && /^Overview, 1 Jan.*2026$/.test(s.label), `the overview is a group named for its whole range (${s.label})`);
  expect(s.track.bg === await color(page, 'var(--surface-trench)') && s.track.shadow === await shadow(page, 'var(--trench)') && Math.round(s.track.box.h) === 40, 'the overview is a 40px trench');
  expect(s.flat && s.lineStroke === await color(page, 'var(--data-1)'), 'the series lies flat in it: a data-1 line, no fill, no filter');
  expect(s.outside === 0.35 && s.clip, 'outside the window the overview recedes to 35%');
  expect(s.lens.border === await color(page, 'var(--accent)') && s.lens.bw === '2px' && s.lens.bg === 'rgba(0, 0, 0, 0)' && s.lens.shadow === E1, `the window is a raised lens: accent rim, clear face, level 1 (${s.lens.border}, ${s.lens.bg})`);
  expect(s.lens.role === 'group' && s.lens.tab === 0 && /^Window, 1 Mar.*30 Apr 2026$/.test(s.lens.label), `the lens is a focusable group named by its dates (${s.lens.label})`);
  const [g0, g1] = s.grips;
  expect(g0.role === 'slider' && g1.role === 'slider' && g0.label === 'Window start' && g1.label === 'Window end', 'two grips, "Window start" and "Window end"');
  expect(g0.text === '1 Mar 2026' && g1.text === '30 Apr 2026', `dates as aria-valuetext (${g0.text}, ${g1.text})`);
  expect(g0.max === g1.now - 1 && g1.min === g0.now + 1, 'each grip is bounded by the other');
  expect(/^1\s*Mar\s*–\s*30\s*Apr\s*2026$/.test(s.caption.replace(/ /g, ' ')), `the frame says the window in words (${s.caption})`);
  expect(s.ticks.includes('1 Mar') && !s.ticks.includes('1 Jan') && !s.ticks.some((t) => /May/.test(t)), `the chart shows only the window (${s.ticks.filter((t) => /[A-Z]/.test(t)).join(', ')})`);
  expect(Math.abs(s.lens.box.x - (s.track.box.x + DAY(s.track.box) * 59)) < 2, 'the lens sits over the window');

  // Hover the lens: level 2. Drag it: level 3, both grips held with their bubbles, the window pans and keeps its length.
  await page.mouse.move(s.lens.box.cx, s.lens.box.cy);
  await page.waitForTimeout(250);
  expect((await read(page)).lens.shadow === E2, 'the lens lifts to level 2 on hover');
  await drag(page, s.lens.box, DAY(s.track.box) * 30);
  await page.waitForTimeout(300);
  s = await read(page);
  expect(s.lens.shadow === E3 && s.grips.every((g) => g.bubble === 1), 'held, the lens floats to level 3 and both dates show');
  expect(s.grips[0].text === '31 Mar 2026' && s.grips[1].text === '30 May 2026', `dragging the lens pans the window, keeping its length (${s.grips.map((g) => g.text)})`);
  expect(s.grips.every((g) => g.bubbleBox.y > s.track.box.y + s.track.box.h), 'the bubbles hang below the overview, clear of the plot');
  await page.mouse.up();
  await page.waitForTimeout(500);
  s = await read(page);
  expect(s.picker.includes('31/03/2026') && s.picker.includes('30/05/2026'), `the DateRangePicker follows: it's the same state (${s.picker})`);
  expect(s.ticks.some((t) => /May/.test(t)) && !s.ticks.includes('1 Mar'), 'the chart redraws for the new window');
  expect(await page.evaluate(() => document.activeElement.classList.contains('alt-brush-lens')), 'panning focuses the lens');

  // A grip resizes; pushed past the other, it stops a record short.
  await drag(page, s.grips[1].box, DAY(s.track.box) * 15);
  await page.mouse.up();
  s = await read(page);
  expect(s.grips[0].text === '31 Mar 2026' && s.grips[1].text === '14 Jun 2026', `dragging the end grip resizes (${s.grips.map((g) => g.text)})`);
  await drag(page, s.grips[1].box, -DAY(s.track.box) * 200, 12);
  await page.mouse.up();
  s = await read(page);
  expect(s.grips[0].text === '31 Mar 2026' && s.grips[1].text === '1 Apr 2026', `the grips can't cross (${s.grips.map((g) => g.text)})`);
  await page.keyboard.press('End');
  s = await read(page);
  expect(s.grips[1].text === '31 Dec 2026', `End takes the grip to the last record (${s.grips[1].text})`);
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft');
  s = await read(page);
  expect(s.grips[1].text === '28 Dec 2026', `arrows step a grip a record at a time (${s.grips[1].text})`);

  // Pressing outside the lens centres the window there.
  const len = s.grips[1].now - s.grips[0].now;
  await page.mouse.click(s.track.box.x + DAY(s.track.box) * 20, s.track.box.cy);
  s = await read(page);
  expect(s.grips[0].now === 0 && s.grips[1].now === len, `a press near the start centres the window, stopping at the end (${s.grips.map((g) => g.text)})`);
  await page.mouse.move(0, 0);
  await page.locator('.alt-brush-grip').nth(1).focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('PageUp');
  s = await read(page);
  const w = s.grips[1].now - s.grips[0].now;
  await page.mouse.click(s.track.box.x + DAY(s.track.box) * 182, s.track.box.cy);
  s = await read(page);
  expect(Math.abs((s.grips[0].now + s.grips[1].now) / 2 - 182) <= 1 && s.grips[1].now - s.grips[0].now === w, `a press in the middle centres the window there (${s.grips.map((g) => g.text)})`);

  // Keyboard on the lens: arrows pan by a record, Home and End go to the ends.
  await page.locator('.alt-brush-lens').first().focus();
  const before = s.grips.map((g) => g.now);
  await page.keyboard.press('ArrowRight');
  s = await read(page);
  expect(s.grips[0].now === before[0] + 1 && s.grips[1].now === before[1] + 1, 'ArrowRight on the lens pans both ends by a record');
  await page.keyboard.press('Home');
  s = await read(page);
  expect(s.grips[0].now === 0 && s.grips[1].now - s.grips[0].now === w, 'Home pans the window to the start');
  await page.keyboard.press('End');
  s = await read(page);
  expect(s.grips[1].text === '31 Dec 2026' && s.grips[1].now - s.grips[0].now === w, 'End pans it to the end');

  // An uncontrolled brush, under bars: the chart keeps its own window.
  let b = await read(page, 1);
  expect(b.bars === 52 && b.grips[0].now === 0 && b.grips[1].now === 51, `with no window, the brush starts over every record (${b.bars} bars)`);
  await drag(page, b.grips[0].box, (b.track.box.w / 51) * 26);
  await page.mouse.up();
  await page.waitForTimeout(500);
  b = await read(page, 1);
  expect(b.bars === 26 && b.grips[0].text === '6 Jul 2026', `dragging the start grip windows the bars (${b.bars}, ${b.grips[0].text})`);
  expect(errors.length === 0, `no console errors (${errors})`);
}

{ // A bubble near an end stays inside the frame.
  const { page } = await open();
  const g = (await read(page, 1)).grips[0];
  await page.locator('.alt-chart').nth(1).locator('.alt-brush-grip').first().focus();
  await page.keyboard.press('Home');
  await page.waitForTimeout(300);
  const s = await read(page, 1);
  expect(s.grips[0].bubble === 1 && s.grips[0].bubbleBox.x >= s.figX - 2, `the start's bubble stays inside the frame (${s.grips[0].bubbleBox.x} vs ${s.figX}, was ${g.box.x})`);
}

{ // At 360px the brush fits and its grips stay apart.
  const { page } = await open({ viewport: { width: 360, height: 1100 }, deviceScaleFactor: 2 });
  const s = await read(page);
  expect(s.track.box.x >= 0 && s.track.box.x + s.track.box.w <= 360 && s.grips[1].box.x > s.grips[0].box.x + s.grips[0].box.w, 'fits at 360px with the grips apart');
}

{ // Forced colours: the track dashed, the lens a 1px Highlight border, the line CanvasText.
  const { page } = await open({ forcedColors: 'active' });
  const s = await read(page);
  expect(s.track.border === 'dashed' && s.lens.bw === '1px' && s.lens.border === await color(page, 'Highlight') && s.lineStroke === await color(page, 'CanvasText'), `forced colours keep the parts apart (${s.track.border}, ${s.lens.bw} ${s.lens.border})`);
}

await browser.close();
console.log(`chart-brush: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
