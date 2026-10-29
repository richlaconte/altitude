// RelativeTime and formatRelativeTime: the words for each distance ("now", minutes, hours, "yesterday", a date past
// the threshold in format="auto"), tense and locale; a <time dateTime> that's focusable for its Tooltip with the exact
// time; one shared timer for every instance that pauses while the page is hidden and catches up when shown; ticking
// gets no afterglow, a new moment does. Uses a controlled clock. Run after a render of every preview (it opens
// test/p-RelativeTime-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

const page = await browser.newPage({ viewport: { width: 960, height: 600 }, locale: 'en-US', timezoneId: 'America/New_York' });
await page.clock.install({ time: new Date('2026-10-29T15:00:00-04:00') });
// Count the intervals the page starts (over the controlled clock), to see that every RelativeTime shares one.
await page.addInitScript(() => {
  window.__intervals = [];
  const si = window.setInterval;
  window.setInterval = function (f, ms, ...a) { window.__intervals.push(ms); return si.call(this, f, ms, ...a); };
});
await page.goto(`file://${T}p-RelativeTime-daylight.html`);
await page.clock.runFor(500);

const f = await page.evaluate(() => {
  const { formatRelativeTime: r } = window.Altitude, now = Date.now(), ago = (ms) => now - ms;
  return {
    now: r(ago(20_000), now), min: r(ago(3 * 60_000), now), hours: r(ago(5 * 3_600_000), now), yesterday: r(ago(26 * 3_600_000), now),
    future: r(now + 2 * 3_600_000, now), past: r(now + 2 * 60_000, now, { tense: 'past' }), fut: r(ago(5 * 60_000), now, { tense: 'future' }),
    fr: r(ago(3 * 60_000), now, { locale: 'fr' }),
    auto: r(ago(40 * 86_400_000), now, { format: 'auto' }), autoNear: r(ago(3 * 86_400_000), now, { format: 'auto' }),
    lastYear: r(new Date('2025-03-04T12:00:00Z'), now, { format: 'auto' }), twelve: r(ago(13 * 3_600_000), now, { format: 'auto', threshold: 'PT12H' }),
    months: r(ago(70 * 86_400_000), now), bad: r('not a date', now),
  };
});
expect(f.now === 'now' && f.min === '3 minutes ago' && f.hours === '5 hours ago' && f.yesterday === 'yesterday', `words by distance (${f.now}, ${f.min}, ${f.hours}, ${f.yesterday})`);
expect(f.future === 'in 2 hours', `the future (${f.future})`);
expect(f.past === 'now' && f.fut === 'now', `tense clamps to now (${f.past}, ${f.fut})`);
expect(f.fr === 'il y a 3 minutes', `locale (${f.fr})`);
expect(f.auto === 'Sep 19' && f.autoNear === '3 days ago', `format="auto": a date past 7 days, relative within (${f.auto}, ${f.autoNear})`);
expect(f.lastYear === 'Mar 4, 2025', `another year has its year (${f.lastYear})`);
expect(f.twelve === 'Oct 29', `an ISO duration threshold (${f.twelve})`);
expect(f.months === '2 months ago' && f.bad === '', `months, and an invalid date is empty (${f.months}, "${f.bad}")`);

const edited = page.locator('.alt-card .alt-reltime');
const card = () => edited.evaluate((el) => ({ text: el.textContent, settle: el.getAttribute('data-settle'), iso: el.getAttribute('dateTime'), tab: el.getAttribute('tabindex') }));
let c = await card();
expect(c.text === '12 minutes ago' && c.iso.startsWith('2026-10-29T18:48:00.') && c.tab === '0', `a focusable <time dateTime> (${JSON.stringify(c)})`);
const timers = await page.evaluate(() => window.__intervals.filter((ms) => ms === 15000).length);
expect(timers === 1, `six RelativeTimes share one timer (${timers})`);

await page.clock.runFor(60_000);
c = await card();
expect(c.text === '13 minutes ago' && c.settle === null, `time passing changes the words and nothing else (${c.text}, settle ${c.settle})`);

// Hidden: no refresh; shown again: it catches up at once.
await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
await page.clock.runFor(120_000);
expect((await card()).text === '13 minutes ago', 'while the page is hidden it doesn\'t refresh');
await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
await page.clock.runFor(50);
expect((await card()).text === '15 minutes ago', `shown again, it catches up at once (${(await card()).text})`);

await page.getByRole('button', { name: 'Edit again' }).click();
await page.clock.runFor(100);
c = await card();
expect(c.text === 'now' && (c.settle === 'a' || c.settle === 'b'), `a new moment settles with the afterglow (${c.text}, ${c.settle})`);

await edited.focus();
await page.clock.runFor(100);
const tip = await page.evaluate(() => { const t = document.activeElement, id = t.getAttribute('aria-describedby'); return { id, text: id && document.getElementById(id)?.textContent }; });
expect(tip.id && /Thursday, October 29, 2026 at 3:\d\d:\d\d PM EDT/.test(tip.text), `focus shows the exact date, time and zone, described by (${tip.text})`);

console.log(`RelativeTime: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
