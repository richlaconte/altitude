// A chart in an answer (#541): landed, the chart carries its source, an AILabel and figures that cite their marks;
// asked again, it's an imprint inside the streaming answer, says "Chart ready" once when the rows land, and the answer
// then completes; a follow-up changes the same chart (one chart, gliding) rather than drawing a second; forced colours
// and reduced motion render it without errors. Run after a render of every preview (it opens
// test/p-ChartAnswer-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (opts = {}, media) => {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 900 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-ChartAnswer-daylight.html`);
  await page.waitForTimeout(600);
  page.errors = errors;
  return page;
};

{
  const page = await open();
  const landed = await page.evaluate(() => {
    const f = document.querySelector('.alt-msg[data-from="assistant"] .alt-chart');
    return {
      cites: [...f.querySelectorAll('button.alt-chart-cite')].map((b) => b.getAttribute('aria-label')),
      source: f.querySelector('.alt-chart-source')?.textContent ?? '',
      ai: !!f.querySelector('.alt-chart-head .alt-ailabel'),
      sources: document.querySelectorAll('.alt-msg[data-from="assistant"] .alt-sources li').length,
    };
  });
  expect(landed.cites.length === 2 && /^39 a day, cites Signups, average of 13 days to 13 Oct 2026: 39/.test(landed.cites[0]), `the takeaway's figures cite their marks (${landed.cites[0]})`);
  expect(/^Source: Signups query · 31 days · updated/.test(landed.source), `the source line (${landed.source})`);
  expect(landed.ai, 'an AILabel on the takeaway');
  expect(landed.sources === 2, `the answer's Sources list the query beside documents (${landed.sources})`);

  // A cite lights its stretch: pressed, the reading is pinned there.
  await page.locator('button.alt-chart-cite').nth(1).focus();
  await page.waitForTimeout(250);
  const band = await page.evaluate(() => !!document.querySelector('.alt-chart-cite-band'));
  expect(band, 'focusing a cite lays a band under the stretch it averages');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  const pinned = await page.evaluate(() => document.querySelectorAll('button.alt-chart-cite')[1].hasAttribute('data-pinned'));
  expect(pinned, 'Enter pins the reading');

  // The query opens in a Sheet from the source line.
  await page.getByRole('link', { name: 'Signups query' }).first().click();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => /from warehouse\.accounts/.test(document.body.textContent ?? '') && !!document.querySelector('.alt-sheet, [role="dialog"]')), 'the query opens in a Sheet');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // Asked again: an imprint in a streaming answer, "Chart ready" once, then the answer completes.
  await page.getByRole('button', { name: 'Ask again' }).click();
  await page.waitForTimeout(250);
  const streaming = await page.evaluate(() => {
    const m = document.querySelector('.alt-msg[data-from="assistant"]');
    return { stream: m.dataset.stream, imprint: !!m.querySelector('.alt-chart-await, .alt-chart-imprint, [data-imprint]'), plot: !!m.querySelector('.alt-chart-plot svg path') };
  });
  expect(streaming.stream === 'streaming' && streaming.imprint, `an imprint inside the streaming answer (${JSON.stringify(streaming)})`);
  const saidLog = [];
  for (let i = 0; i < 30; i++) {
    const t = await page.evaluate(() => document.querySelector('.alt-convo > .alt-sr[aria-live="polite"]')?.textContent ?? '');
    if (t && saidLog[saidLog.length - 1] !== t) saidLog.push(t);
    await page.waitForTimeout(100);
  }
  expect(saidLog.includes('Chart ready: Daily signups, October.'), `"Chart ready" said when the rows land (${saidLog.join(' / ')})`);
  expect(saidLog.some((t) => /^Assistant: Yes\./.test(t)), `then the answer completes (${saidLog.join(' / ')})`);
  expect(await page.evaluate(() => document.querySelector('.alt-msg[data-from="assistant"]').dataset.stream) === 'complete', 'the rule goes solid');

  // A follow-up keeps x and the series: the same chart changes, no second chart.
  await page.getByRole('button', { name: 'Follow up: only paid plans' }).click();
  await page.waitForTimeout(80);
  const follow = await page.evaluate(() => ({ charts: document.querySelectorAll('.alt-msg .alt-chart').length, stage: document.querySelector('.alt-msg .alt-chart-plot')?.dataset.stage }));
  expect(follow.charts === 1, `one chart after the follow-up (${follow.charts})`);
  expect(follow.stage === 'rescale' || follow.stage === 'values', `it glides as a data change (${follow.stage})`);
  await page.waitForTimeout(900);
  const cite = await page.evaluate(() => document.querySelector('button.alt-chart-cite')?.getAttribute('aria-label'));
  expect(/^11 a day, cites Paid signups/.test(cite ?? ''), `the takeaway's cites follow the new rows (${cite})`);
  expect(page.errors.length === 0, `no page errors or warnings (${page.errors.join(' | ')})`);
  await page.context().close();
}
{
  const page = await open({ forcedColors: 'active' }, { reducedMotion: 'reduce' });
  expect(await page.evaluate(() => document.querySelectorAll('button.alt-chart-cite').length) === 2, 'renders under forced colours and reduced motion');
  expect(page.errors.length === 0, `no page errors (${page.errors.join(' | ')})`);
  await page.context().close();
}
await browser.close();
console.log(`chart answer: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
