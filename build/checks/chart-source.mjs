// The source line (#533): a chart, a stat or a stat group says where its data came from, how many records are behind
// it and when it was read, in one flush line at caption size in ink-muted; a string name with href is a Link; the time
// is a RelativeTime with the exact time on hand; the generated summary ends with the source in absolute words; past
// staleAfter the line leads with a caution icon and "Stale", the marks don't change, the line takes the afterglow once
// and "Stale: …" is said politely once; a StatGroup says it once for the row; a live chart's "Updated" caption gives way
// to the line. Run after a render of every preview (it opens test/p-ChartSource-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

const ctx = await browser.newContext({ viewport: { width: 960, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
await page.clock.install({ time: new Date('2026-11-05T12:00:00Z') });
await page.goto(`file://${T}p-ChartSource-daylight.html`);
await page.clock.runFor(800);
const lines = () => page.evaluate(() => [...document.querySelectorAll('.alt-source')].map((p) => { const c = p.cloneNode(true); c.querySelectorAll('.alt-sr').forEach((n) => n.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); }));

{
  const l = await lines();
  expect(l.length === 4, `a line for the stat group and each chart, none per stat (${l.length})`);
  expect(l[0] === 'Source: Orders warehouse · updated 2 minutes ago', `the stat group says it once (${l[0]})`);
  expect(l[1] === 'Source: Orders warehouse · 14 days · updated 2 minutes ago', `name, count with its noun, and time (${l[1]})`);
  expect(/^Stale · Source: Payments export · 524 refunds · updated 3 hours ago$/.test(l[2]), `stale leads with the word (${l[2]})`);
  expect(l[3] === 'Source: Orders warehouse · updated 14 minutes ago', `not yet stale (${l[3]})`);
  const look = await page.evaluate(() => {
    const p = document.querySelectorAll('.alt-chart-source')[0];
    const muted = (() => { const d = document.createElement('div'); d.style.color = 'var(--ink-muted)'; p.append(d); const c = getComputedStyle(d).color; d.remove(); return c; })();
    return { size: getComputedStyle(p).fontSize, color: getComputedStyle(p).color, muted, shadow: getComputedStyle(p).boxShadow, link: p.querySelector('a.alt-link')?.getAttribute('href'), time: p.querySelector('time')?.getAttribute('datetime'), afterCaption: p.previousElementSibling?.tagName };
  });
  expect(look.size === '13px' && look.color === look.muted && look.shadow === 'none', `flush, caption size, ink-muted (${JSON.stringify(look)})`);
  expect(look.link === '#/sources/orders' && look.time?.startsWith('2026-11-05T11:58:00') && look.afterCaption === 'FIGCAPTION', `a Link, a <time>, under the summary (${JSON.stringify(look)})`);
  const icon = await page.evaluate(() => { const s = document.querySelector('.alt-source-stale svg'); const d = document.createElement('div'); d.style.color = 'var(--caution)'; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return { got: s && getComputedStyle(s).color, want: c, hidden: s?.getAttribute('aria-hidden') }; });
  expect(icon.got === icon.want && icon.hidden === 'true', `the stale icon is caution and decorative (${JSON.stringify(icon)})`);
  const sums = await page.evaluate(() => [...document.querySelectorAll('.alt-chart figcaption')].map((f) => f.textContent));
  expect(/Source: Orders warehouse, 14 days, as of 5 Nov 2026, \d+:58\.$/.test(sums[0]), `the summary ends with the source, absolute (${sums[0].slice(-70)})`);
  expect(/Stale\. Source: Payments export, 524 refunds, as of 5 Nov 2026, \d+:00\.$/.test(sums[1]), `a stale summary says so (${sums[1].slice(-70)})`);
}

// Turning stale: the word, the afterglow once, one polite announcement; the marks stay as they were.
{
  const before = await page.evaluate(() => document.querySelectorAll('.alt-chart')[2].querySelector('.alt-line-stroke').getAttribute('d'));
  await page.clock.runFor(2 * 60_000);
  await page.waitForTimeout(100);
  const l = await lines();
  const s = await page.evaluate(() => { const p = document.querySelectorAll('.alt-source')[3]; return { settle: p.getAttribute('data-settle'), said: p.querySelector('[aria-live]').textContent, stale: p.hasAttribute('data-stale') }; });
  const after = await page.evaluate(() => document.querySelectorAll('.alt-chart')[2].querySelector('.alt-line-stroke').getAttribute('d'));
  expect(/^Stale · Source: Orders warehouse · updated 16 minutes ago$/.test(l[3]), `past staleAfter the line says Stale (${l[3]})`);
  expect(s.stale && !!s.settle, `it takes the afterglow once (${JSON.stringify(s)})`);
  expect(/^Stale: Source: Orders warehouse, as of 5 Nov 2026, \d+:46\.$/.test(s.said), `and says it politely once (${s.said})`);
  expect(before === after, 'the marks don\'t change');
  const said3 = await page.evaluate(() => document.querySelectorAll('.alt-source')[2].querySelector('[aria-live]').textContent);
  expect(said3 === '', `a line stale on arrival doesn't announce (${said3})`);
}

// A live chart: the line takes the "Updated" caption's place, its time the last update.
{
  const out = await page.evaluate(async () => {
    const { AltitudeProvider, ChartContainer, LineChart } = window.Altitude;
    const h = React.createElement, el = document.createElement('div');
    document.body.append(el);
    const rows = [{ t: '2026-11-05T11:00:00Z', v: 1 }, { t: '2026-11-05T11:30:00Z', v: 2 }];
    const root = ReactDOM.createRoot(el);
    root.render(h(AltitudeProvider, null, h(ChartContainer, { config: { v: { label: 'Requests' } }, live: true, source: { name: 'Edge logs' } }, h(LineChart, { data: rows, x: 't' }))));
    await new Promise((r) => setTimeout(r, 300));
    const r = { updated: el.querySelector('.alt-chart-updated')?.textContent ?? null, line: el.querySelector('.alt-source')?.textContent.replace(/\s+/g, ' ').trim() };
    root.unmount(); el.remove();
    return r;
  });
  expect(out.updated === null && out.line === 'Source: Edge logs · updated now', `one line, not two (${JSON.stringify(out)})`);
}
expect(errors.length === 0, `no errors or warnings (${errors.join(' | ')})`);

// Forced colours: the line and the stale icon are CanvasText.
{
  const p2 = await browser.newPage({ forcedColors: 'active' });
  await p2.emulateMedia({ forcedColors: 'active' });
  await p2.goto(`file://${T}p-ChartSource-daylight.html`);
  await p2.waitForTimeout(500);
  const c = await p2.evaluate(() => { const s = document.querySelector('.alt-source-stale'); return [getComputedStyle(s).color, getComputedStyle(s.querySelector('svg')).color]; });
  expect(c[0] === c[1], `under forced colours the word and the icon share CanvasText (${c})`);
}

await browser.close();
console.log(`chart-source: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
