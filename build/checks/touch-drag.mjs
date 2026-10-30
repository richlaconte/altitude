// Dragging by touch (#254–#256): a swipe that starts on a row or card scrolls; a press-and-hold picks it up and a drag
// then moves it; a grip picks it up at once; a mouse drag still works without a hold. Driven with CDP touch events
// (pointerType "touch"). Run after a render of every preview (it opens test/p-SortableList-daylight.html and the
// Board and Tree previews); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
const only = process.argv[2];
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const phone = async (name, height = 700) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`file://${T}p-${name}-daylight.html`); await page.waitForTimeout(500);
  const cdp = await ctx.newCDPSession(page);
  // A gesture: start, wait (the hold), then move in steps to the end point, then lift.
  const gesture = async ([x, y], [x2, y2], hold = 0) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await page.waitForTimeout(hold || 30);
    for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + ((x2 - x) * i) / 8, y: y + ((y2 - y) * i) / 8 }] }); await page.waitForTimeout(30); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(400);
  };
  return { ctx, page, gesture };
};
const centre = (page, sel, i = 0) => page.evaluate(([sel, i]) => { const r = document.querySelectorAll(sel)[i].getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, [sel, i]);

if (!only || only === 'SortableList') {
  const order = (page) => page.evaluate(() => [...document.querySelectorAll('.alt-sort-item')].map((el) => el.textContent.slice(0, 8)).join('|'));
  // A swipe on a row scrolls the page (the list in a page taller than the screen).
  {
    const { ctx, page, gesture } = await phone('SortableList', 300);
    await page.evaluate(() => { document.body.style.paddingBottom = '1500px'; });
    const before = await order(page);
    const [x, y] = await centre(page, '.alt-sort-item', 3);
    await gesture([x + 60, y], [x + 60, y - 150]);
    const sy = await page.evaluate(() => scrollY);
    expect(sy > 40 && (await order(page)) === before, `SortableList: a swipe on a row scrolls the page and leaves the order (scrollY ${sy})`);
    await ctx.close();
  }
  {
    const { ctx, page, gesture } = await phone('SortableList');
    const before = await order(page);
    const [x, y] = await centre(page, '.alt-sort-item', 0);
    await gesture([x + 60, y], [x + 60, y + 110], 600);
    const after = await order(page);
    expect(after !== before && after.split('|')[0] !== before.split('|')[0], `SortableList: press-and-hold, then drag, moves the row (${before} → ${after})`);
    const [gx, gy] = await centre(page, '.alt-sort-grip', 0);
    const b2 = await order(page);
    await gesture([gx, gy], [gx, gy + 110]);
    expect((await order(page)) !== b2, 'SortableList: the grip picks the row up without a hold');
    const grip = await page.evaluate(() => { const g = document.querySelector('.alt-sort-grip'); const a = getComputedStyle(g, '::after'); return { touch: getComputedStyle(g).touchAction, row: getComputedStyle(g.closest('.alt-sort-item')).touchAction, w: g.offsetWidth + parseFloat(a.left) * -2 }; });
    expect(grip.touch === 'none' && grip.row !== 'none', `SortableList: touch-action none on the grip only (${JSON.stringify(grip)})`);
    expect(grip.w >= 40, `SortableList: the grip's hit area is finger-sized on touch (${grip.w}px)`);
    await ctx.close();
  }
  {
    const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
    await page.goto(`file://${T}p-SortableList-daylight.html`); await page.waitForTimeout(400);
    const before = await order(page);
    const [x, y] = await centre(page, '.alt-sort-item', 0);
    await page.mouse.move(x, y); await page.mouse.down();
    for (let i = 1; i <= 8; i++) { await page.mouse.move(x, y + i * 14); await page.waitForTimeout(20); }
    await page.mouse.up(); await page.waitForTimeout(400);
    expect((await order(page)) !== before, 'SortableList: a mouse drag still moves the row without a hold');
    await page.close();
  }
}
console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
