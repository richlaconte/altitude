// Schedule when narrow (#257): under 480px of its own width it shows one day (narrowView="day", default), paged by
// "Previous day" and "Next day"; wide, it shows the week; narrowView={false} keeps the week; on touch an hour is 96px,
// so a 15-minute slot is 24px, and a tap opens an event. Run after a render of every preview (it opens
// test/p-Schedule-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const mount = (page) => page.evaluate(() => new Promise((done) => {
  document.body.innerHTML = ''; const d = document.createElement('div'); document.body.append(d);
  const A = window.Altitude, h = React.createElement; window.__opened = [];
  const events = [{ id: 'a', start: '2026-10-27T09:00', end: '2026-10-27T10:00', label: 'Review' }];
  const props = { view: 'workweek', date: '2026-10-27', events, getKey: (e) => e.id, getStart: (e) => e.start, getEnd: (e) => e.end, getLabel: (e) => e.label, onOpen: (e) => window.__opened.push(e.id), onDateChange: () => {}, now: '2026-10-27T08:30' };
  ReactDOM.createRoot(d).render(h(A.AltitudeProvider, null,
    h('div', { id: 'n', style: { width: '340px' } }, h(A.Schedule, props)),
    h('div', { id: 'w', style: { width: '900px' } }, h(A.Schedule, props)),
    h('div', { id: 'f', style: { width: '340px' } }, h(A.Schedule, { ...props, narrowView: false }))));
  setTimeout(done, 600);
}));
const cols = (page, sel) => page.evaluate((sel) => { const s = document.querySelector(`${sel} .alt-schedule`); return { days: getComputedStyle(s).getPropertyValue('--days').trim(), prev: s.querySelector('button[aria-label^="Previous"]')?.getAttribute('aria-label'), slot: getComputedStyle(s).getPropertyValue('--slot').trim() }; }, sel);
{
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  await page.goto(`file://${T}p-Schedule-daylight.html`); await page.waitForTimeout(300);
  await mount(page);
  const [n, w, f] = [await cols(page, '#n'), await cols(page, '#w'), await cols(page, '#f')];
  expect(n.days === '1' && n.prev === 'Previous day', `narrow, it shows one day, paged by day (${JSON.stringify(n)})`);
  expect(w.days === '5' && w.prev === 'Previous week', `wide, the work week (${JSON.stringify(w)})`);
  expect(f.days === '5', `narrowView={false} keeps the week (${JSON.stringify(f)})`);
  expect(n.slot === '12px', `with a mouse an hour is 48px (${n.slot} a slot)`);
  await page.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 1400 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`file://${T}p-Schedule-daylight.html`); await page.waitForTimeout(300);
  await mount(page);
  const n = await cols(page, '#n');
  expect(n.slot === '24px', `on touch a 15-minute slot is 24px (${n.slot})`);
  await page.locator('#n .alt-schedule-event').first().tap(); await page.waitForTimeout(200);
  expect((await page.evaluate(() => window.__opened)).join() === 'a', 'a tap opens an event on touch');
  await ctx.close();
}
console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
