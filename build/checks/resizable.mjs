// Resizable: panes on the ground (named regions, no shadow), a separator handle with its value, range and controls;
// the grip is flush at rest, lifts when pointed at and floats at level 3 while dragged; dragging and arrow keys
// resize within min/max; Enter collapses the collapsible pane (inert, said in words) and restores it. Run after a
// render of every preview (it opens test/p-Resizable-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-Resizable-daylight.html`);
await page.waitForTimeout(400);

const read = () => page.evaluate(() => {
  const g = document.querySelector('.alt-resizable'), [a, b] = g.querySelectorAll('.alt-resizable-panel'), h = g.querySelector('.alt-resizable-handle'), grip = h.querySelector('.alt-resizable-grip');
  const W = g.getBoundingClientRect().width;
  return { roles: [a.getAttribute('role'), a.getAttribute('aria-label')], shadow: getComputedStyle(a).boxShadow + getComputedStyle(b).boxShadow,
    role: h.getAttribute('role'), name: h.getAttribute('aria-label'), now: Number(h.getAttribute('aria-valuenow')), min: h.getAttribute('aria-valuemin'), max: h.getAttribute('aria-valuemax'),
    text: h.getAttribute('aria-valuetext'), controls: h.getAttribute('aria-controls') === a.id, wa: a.getBoundingClientRect().width / W * 100, grip: getComputedStyle(grip).boxShadow,
    inert: a.inert, hidden: a.getAttribute('aria-hidden') };
});
let r = await read();
expect(r.roles.join() === 'region,Conversations' && r.shadow === 'nonenone', 'panes are named regions on the ground');
expect(r.role === 'separator' && r.name === 'Resize conversations' && r.now === 35 && r.min === '0' && r.max === '60' && r.controls, `a separator with its value, range (0: it can collapse) and the pane it controls (${r.name}, ${r.now})`);
expect(Math.abs(r.wa - 35) < 1, `the list starts at 35% (${r.wa.toFixed(1)})`);
expect(r.grip === 'none', 'the grip is flush at rest');

const h = await page.$('.alt-resizable-handle'), b = await h.boundingBox();
await page.mouse.move(b.x + 1, b.y + b.height / 2);
await page.waitForTimeout(250);
const hover = (await read()).grip;
await page.mouse.down();
await page.mouse.move(b.x + 120, b.y + b.height / 2, { steps: 6 });
await page.waitForTimeout(300);
const held = await read();
expect(hover !== 'none' && held.grip !== hover, `the grip lifts when pointed at and floats higher while held (${held.grip.slice(0, 40)})`);
expect(held.now > 45 && held.now < 52, `dragging resizes (${held.now})`);
await page.mouse.move(b.x + 900, b.y + b.height / 2, { steps: 4 });
expect((await read()).now === 60, 'dragging stops at maxSize');
await page.mouse.up();
await page.mouse.move(5, 5);
await page.waitForTimeout(400);
expect((await read()).grip === 'none', 'letting go and moving away settles the grip back to flush');

await page.focus('.alt-resizable-handle');
await page.keyboard.press('Home');
expect((await read()).now === 20, 'Home goes to minSize');
await page.keyboard.press('ArrowRight');
expect((await read()).now === 25, 'ArrowRight grows by 5%');
await page.keyboard.press('Shift+ArrowRight');
expect((await read()).now === 35, 'Shift+ArrowRight by 10%');
await page.keyboard.press('Enter');
await page.waitForTimeout(450);
r = await read();
expect(r.now === 0 && r.inert && r.hidden === 'true' && r.text === 'Conversations collapsed' && r.wa < 1, `Enter collapses the pane: inert, and said (${r.text})`);
await page.keyboard.press('Enter');
await page.waitForTimeout(450);
r = await read();
expect(r.now === 35 && !r.inert, `Enter restores it (${r.now})`);

console.log(`Resizable: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
