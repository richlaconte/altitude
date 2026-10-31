// Agent orchestration (docs/research/agent-orchestration): every moment of the scripted launch is reachable from the
// rail, renders without page errors, and shows its state: planned (the lead alone), fanned out (four working, QA
// waiting on two others), two need you (two requests, oldest first, matching the roster's needs-you group), overlap (a
// conflict naming the file), stalled (a caution plate in the working group, not a request), failed (QA in the queue
// with Retry, a pull request to review), reviewed (finished agents folded and stamped), all done (nothing waiting; the
// lanes' takeaway says how long agents waited on you). Selecting a row or a lane opens that agent. Run after a render
// of every preview (it opens test/p-AgentOrchestration-<scheme>.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const has = {
  Planned: () => document.querySelectorAll('.alt-agent').length === 1 && document.querySelector('.alt-page-head-desc')?.textContent === '1 working',
  'Fanned out': () => document.querySelectorAll('.alt-agent[data-agent-state="working"]').length === 5 && /Waiting on Pricing page and Billing API/.test(document.querySelector('.alt-agent[data-agent-state="blocked"]')?.textContent ?? ''),
  'Two need you': () => [...document.querySelectorAll('.alt-request .alt-request-agent')].map((a) => a.textContent).join() === 'Billing API,Renewal emails'
    && [...document.querySelectorAll('.alt-fleet-list')].some((l) => l.getAttribute('aria-label') === 'Needs you, 2'),
  Overlap: () => /Also changing src\/content\/pricing\.ts: Pricing page/.test(document.querySelector('.alt-agent-conflict')?.textContent ?? '') && document.querySelectorAll('.alt-request').length === 1,
  Stalled: () => /Retried the same step 3 times/.test(document.querySelector('.alt-agent[data-agent-state="stalled"]')?.textContent ?? '') && document.querySelectorAll('.alt-request').length === 0,
  Failed: () => document.querySelector('.alt-request[data-kind="failed"] button')?.textContent === 'Retry' && document.querySelector('.alt-request[data-kind="review"]') !== null,
  Reviewed: () => document.querySelectorAll('.alt-request').length === 0 && /Done, 4/.test([...document.querySelectorAll('.alt-fleet-list')].map((l) => l.getAttribute('aria-label')).join()),
  'All done': () => document.querySelector('.alt-requests-empty') !== null && /^Agents have waited on you for 15 min in all; the longest wait was Pricing page, 5 min\.$/.test(document.querySelector('.alt-lanes-takeaway')?.textContent.replace(/^.*?\. /, '') ?? ''),
};
for (const scheme of ['daylight', 'nightfall']) {
  const page = await browser.newPage({ viewport: { width: 1180, height: 1000 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`file://${T}p-AgentOrchestration-${scheme}.html`); await page.waitForTimeout(400);
  const names = await page.evaluate(() => [...document.querySelectorAll('.aoh-moment')].map((b) => b.textContent));
  if (scheme === 'daylight') expect(names.length === 8, `eight moments on the rail (${names.length})`);
  for (const name of names) {
    await page.click(`.aoh-moment:text-is("${name}")`); await page.waitForTimeout(150);
    const ok = await page.evaluate((src) => (0, eval)(`(${src})`)(), has[name].toString());
    const current = await page.evaluate(() => document.querySelector('.aoh-moment[aria-current="step"]')?.textContent);
    if (scheme === 'daylight' || !ok) expect(ok && current === name, `${scheme}: ${name} shows its state and is current (${current})`);
  }
  expect(!errors.length, `${scheme}: no page or console errors (${errors.slice(0, 2).join('; ')})`);
  if (scheme === 'daylight') {
    // The open agent: a row opens it, and so does a lane.
    await page.click('.aoh-moment:text-is("Failed")'); await page.waitForTimeout(150);
    await page.click('.alt-agent-row:has-text("QA")'); await page.waitForTimeout(100);
    const d = await page.evaluate(() => ({ title: document.getElementById('ao-detail-title')?.textContent, failed: !!document.querySelector('.ao-detail .alt-trace-item[data-trace="failed"]'), lane: document.querySelector('button.alt-lane-name[aria-pressed="true"]')?.textContent }));
    expect(d.title === 'QA' && d.failed && d.lane === 'QA', `a row opens its agent, with its failed step, and the lane follows (${JSON.stringify(d)})`);
    await page.click('button.alt-lane-name:has-text("Billing API")'); await page.waitForTimeout(100);
    expect(await page.evaluate(() => document.getElementById('ao-detail-title')?.textContent) === 'Billing API', 'a lane opens its agent');
    await page.click('.alt-request button[aria-label="Open Pricing page"]'); await page.waitForTimeout(100);
    expect(await page.evaluate(() => document.getElementById('ao-detail-title')?.textContent) === 'Pricing page', "a request's Open opens its agent");
    // One primary in the view: the steering composer's Send.
    const primaries = await page.evaluate(() => [...document.querySelectorAll('.aoh-frame [data-variant="primary"]')].filter((b) => b.offsetParent !== null).length);
    expect(primaries <= 1, `at most one primary in the view (${primaries})`);
    await page.click('.aoh-moment:text-is("All done")'); await page.waitForTimeout(100);
    expect(/^All done: /.test(await page.evaluate(() => document.querySelector('.aoh > span.alt-sr')?.textContent ?? '')), 'the moment reached is announced');
    await page.click('.aoh-moment:text-is("Planned")'); await page.waitForTimeout(100);
    await page.click('.aoh-rail > button'); await page.waitForTimeout(2700);
    expect(await page.evaluate(() => document.querySelector('.aoh-moment[aria-current="step"]')?.textContent) === 'Fanned out', 'Play advances to the next moment');
    await page.click('.aoh-rail > button');
  }
  await page.close();
}
console.log(`Agent orchestration: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
