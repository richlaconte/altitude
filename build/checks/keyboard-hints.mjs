// Shortcut hints on touch (#262): menu shortcuts, CommandPalette's footer, chips and esc, and Kbd with hideOnTouch show
// where there's likely a keyboard and hide on a touch-only device until a key is pressed, after which they're back
// for the session. Run after a render of every preview (it opens test/p-DropdownMenu-daylight.html and
// p-CommandPalette); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const read = async (ctx, pg) => {
  const p = await ctx.newPage(); await p.goto(`file://${T}p-${pg}-daylight.html`); await p.waitForTimeout(700);
  const r = () => p.evaluate(() => ({ menu: document.querySelectorAll('.alt-menu-shortcut').length, foot: !!document.querySelector('.alt-cmd-foot'), chips: document.querySelectorAll('.alt-cmd-keys').length }));
  return { p, r };
};
const desk = await browser.newContext({ viewport: { width: 960, height: 900 } });
const phone = await browser.newContext({ viewport: { width: 400, height: 900 }, isMobile: true, hasTouch: true });
{
  const a = await read(desk, 'DropdownMenu'), b = await read(phone, 'DropdownMenu');
  const [x, y] = [await a.r(), await b.r()];
  expect(x.menu > 0 && y.menu === 0, `menu shortcuts show with a mouse and hide on a touch-only phone (${x.menu}, ${y.menu})`);
  await b.p.keyboard.press('Shift');
  await b.p.waitForTimeout(150);
  expect((await b.r()).menu === x.menu, 'a key press (a tablet\'s keyboard) brings them back');
}
{
  const a = await read(desk, 'CommandPalette'), b = await read(phone, 'CommandPalette');
  const [x, y] = [await a.r(), await b.r()];
  expect(x.foot && x.chips > 0 && !y.foot && y.chips === 0, `CommandPalette's footer and chips: on with a mouse, off on a phone (${JSON.stringify(x)} ${JSON.stringify(y)})`);
}
{
  const p = (await read(phone, 'Kbd')).p;
  const k = await p.evaluate(() => new Promise((done) => {
    const d = document.createElement('div'); document.body.prepend(d);
    const A = window.Altitude, h = React.createElement;
    ReactDOM.createRoot(d).render(h('p', { id: 'kb' }, h(A.Kbd, null, 'K'), h(A.Kbd, { hideOnTouch: true }, 'J')));
    setTimeout(() => done(document.querySelectorAll('#kb kbd').length), 300);
  }));
  expect(k === 1, `on a phone, an app's Kbd stays unless hideOnTouch (${k} of 2 shown)`);
}
console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
