// Timeline: a named section with an ordered list on an upright 1px ink-muted line; day headings; events are flush (no
// shadow) with their <time>; an event that links lifts when pointed at; Details opens a raised card; a comment you
// send arrives new (afterglow, announced), hovers as pending, lands (committed) or fails into a trench with Retry. Run
// after a render of every preview (it opens test/p-Timeline-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
await page.goto(`file://${T}p-Timeline-daylight.html`);
await page.waitForTimeout(400);

const read = () => page.evaluate(() => {
  const root = document.querySelector('.alt-timeline'), list = root.querySelector('ol'), line = getComputedStyle(list, '::before');
  return { label: root.getAttribute('aria-label'), lineW: line.width, lineBg: line.backgroundColor, days: [...root.querySelectorAll('.alt-timeline-day-label')].map((h) => `${h.tagName}:${h.textContent}`),
    items: [...root.querySelectorAll('.alt-timeline-item')].map((li) => ({ text: li.querySelector('.alt-timeline-text').textContent, time: !!li.querySelector('time[datetime]'), shadow: getComputedStyle(li).boxShadow, status: li.getAttribute('data-status'), settle: li.getAttribute('data-settle'), busy: li.getAttribute('aria-busy') })),
    markersHidden: [...root.querySelectorAll('.alt-timeline-marker')].every((m) => m.getAttribute('aria-hidden') === 'true'), said: root.querySelector(':scope > .alt-sr[aria-live]').textContent };
});
let r = await read();
expect(r.label === 'Activity' && r.lineW === '1px', 'a named history on a 1px line');
expect(r.days.join('|') === 'H3:Today|H3:Yesterday', `day headings (${r.days})`);
expect(r.items.length === 3 && r.items.every((i) => i.time && i.shadow === 'none' && !i.settle), 'events are flush, each with its time, and nothing glows at first');
expect(r.markersHidden, 'markers are hidden from assistive technology');
const link = page.locator('.alt-timeline-link').first();
const before = await link.evaluate((el) => getComputedStyle(el).boxShadow);
await link.hover();
await page.waitForTimeout(250);
expect(before === 'none' && (await link.evaluate((el) => getComputedStyle(el).boxShadow)) !== 'none', 'an event that links lifts when pointed at');
await page.click('button:has-text("Details")');
await page.waitForTimeout(300);
const detail = await page.evaluate(() => { const d = document.querySelector('.alt-timeline-detail'); return d && { shadow: getComputedStyle(d).boxShadow, expanded: document.querySelector('[aria-controls="' + d.id + '"]').getAttribute('aria-expanded') }; });
expect(detail?.shadow !== 'none' && detail.expanded === 'true', 'Details opens as a raised card');

await page.click('button:has-text("Comment")');
await page.waitForTimeout(150);
r = await read();
expect(r.items.length === 4 && r.items[0].status === 'pending' && r.items[0].busy === 'true' && (r.items[0].settle === 'a' || r.items[0].settle === 'b'), 'your comment arrives new and hovers as pending');
expect(r.said === '1 new event.', `the arrival is announced (${r.said})`);
expect(!r.items[1].settle, 'older events don\'t glow');
await page.waitForTimeout(1300);
expect((await read()).items[0].status === 'committed', 'it lands');
await page.click('button:has-text("Comment (fails)")');
await page.waitForTimeout(1400);
r = await read();
expect(r.items[0].status === 'failed' && await page.locator('.alt-timeline-item >> nth=0 >> button:has-text("Retry")').count() === 1, 'a failed comment drops to a trench with Retry');

console.log(`Timeline: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
