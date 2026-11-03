// Storefront health (examples/apps/service-health, #406), built by scripts/build-examples.mjs. First its rules, as
// units: the burn-rate classification and the takeaway written from the service's own answers. Then the page in a
// browser, with the clock fixed (timezone UTC) so its times are the same every run:
//   both schemes at 1280 and 375: one h1, at most one primary, no errors, no sideways scroll, and the takeaway leads;
//   the takeaway names the service and the deploy, says when the budget runs out, and is all-clear only when it's true:
//   a service that stops reporting reads "No data" (never Operational) and blocks the all-clear; every chart has its
//   table view; one panel failing leaves the others; stale data says so and when; offline is said once, for the page;
//   pausing holds the page; a stalled feed goes stale against the real clock; only status changes are announced;
//   declaring names who it pages, takes focus to the incident and can't happen twice (a teammate first, or a lost
//   response); a failed incident update keeps its words; the service detail opens from a row and from a deploy.
import { chromium } from 'playwright-core';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildExamples } from '../../scripts/build-examples.mjs';

let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const root = fileURLToPath(new URL('../../', import.meta.url));
const out = fileURLToPath(new URL('../test/examples/', import.meta.url));

// ---- The rules, as units ---------------------------------------------------------------------------------------
mkdirSync(out, { recursive: true });
await build({
  entryPoints: [root + 'examples/apps/service-health/data.ts'], bundle: true, format: 'esm', platform: 'node', outfile: out + 'service-health-data.mjs',
  absWorkingDir: root, logLevel: 'error', jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment',
  alias: { 'altitude-design': './project/components/src/index.tsx', react: './node_modules/react', 'react-dom': './node_modules/react-dom' },
  define: { 'process.env.NODE_ENV': '"production"' },
});
const rules = await import(pathToFileURL(out + 'service-health-data.mjs').href);
{
  const { classify, writeTakeaway, service, setScenario } = rules;
  expect(classify(15.8, 37) === 'outage', 'over 14.4× on both windows is a partial outage (the workbook’s page rule)');
  expect(classify(7, 7) === 'degraded', 'over 6× on both windows is degraded');
  expect(classify(4, 37) === 'degraded', 'a fresh spike (5 minutes over 14.4×, before the hour catches up) reads degraded, never the all-clear');
  expect(classify(2, 3) === 'operational', 'under both is operational');
  expect(/can’t say whether everything is fine/.test(writeTakeaway(undefined, false).text), 'no error rates: the takeaway refuses the all-clear');
  const ask = () => service.request('metrics.errors');
  let a = await ask();
  let t = writeTakeaway(a, false);
  expect(t.worst === 'checkout' && t.health === 'outage' && /^Checkout errors rose from 0\.\d+% to 3\.\d% of requests after the \d\d:\d\d deploy\. At this rate the rest of its 30-day error budget runs out in \d+ hours\.$/.test(t.text),
    `a bad deploy: the service, before and after, the deploy as a time, when the budget runs out (${t.text})`);
  expect(/^As of \d\d:\d\d: Checkout/.test(writeTakeaway(a, true).text), 'stale: the takeaway says when it was true');
  setScenario('all-clear'); a = await ask();
  expect(writeTakeaway(a, false).text === 'All 8 services are within their error budgets.', `all clear says so (${writeTakeaway(a, false).text})`);
  setScenario('search-silent'); a = await ask();
  t = writeTakeaway(a, false);
  expect(/^Search stopped reporting at \d\d:\d\d, so this can’t say whether everything is fine\.$/.test(t.text) && a.readings.find((r) => r.id === 'search').health === 'no-data',
    `a service that stops reporting blocks the all-clear and reads no-data (${t.text})`);
  expect(a.rows.slice(-5).every((r) => r.search === null), 'its missing minutes are null (a gap), never zero');
  service.reset();
}

// ---- The page ---------------------------------------------------------------------------------------------------
await buildExamples(out, { only: ['service-health'] });
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const wait = (page, ms) => page.waitForTimeout(ms);
const T = Date.UTC(2026, 10, 3, 14, 30, 20);

async function open({ width = 1280, scheme = 'light', mobile = false, forced = false, reduced = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme, timezoneId: 'UTC', isMobile: mobile, hasTouch: mobile,
    forcedColors: forced ? 'active' : 'none', reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.clock.install({ time: T });
  await page.goto(`file://${out}service-health.html`); await wait(page, 1600);
  return { page, ctx, errors };
}
const drawer = async (page) => { const t = page.locator('.ex-drawer .alt-acc-trigger'); if ((await t.getAttribute('aria-expanded')) !== 'true') await t.click(); await wait(page, 200); };
const mode = async (page, label) => { await drawer(page); await page.locator('.ex-drawer label.alt-radio').filter({ has: page.locator('.alt-check-label', { hasText: new RegExp(`^${label}$`) }) }).click(); await wait(page, 80); };
const applies = async (page, op) => { await page.locator('.ex-drawer [aria-labelledby="ex-ops"]').click(); await wait(page, 150); await page.locator('[role="listbox"] [role="option"]', { hasText: new RegExp(`^${op.replace('.', '\\.')}$`) }).click(); await wait(page, 100); };
const once = async (page, on) => { const sw = page.getByRole('switch', { name: 'Only the next request' }); if ((await sw.getAttribute('aria-checked')) !== String(on)) await sw.click(); await wait(page, 60); };
const event = async (page, label) => { await drawer(page); await page.locator('.ex-drawer button', { hasText: label }).click(); await wait(page, 1000); };
const scenario = async (page, label) => {
  await drawer(page); await page.locator('.ex-drawer [aria-labelledby="sh-scenario"]').click(); await wait(page, 150);
  await page.locator('[role="listbox"] [role="option"]', { hasText: label }).click(); await wait(page, 1000);
};
const takeaway = (page) => page.locator('.sh-lead .alt-chart-takeaway-text:not([data-out]), .sh-lead .sh-lead-takeaway').first().textContent();
const primaries = (page) => page.evaluate(() => [...document.querySelectorAll('.ex-app .alt-btn[data-variant="primary"]')].filter((b) => b.getClientRects().length && !b.closest('[role="dialog"]')).length);
const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
const status = (page, name) => page.locator('.sh-table tbody tr', { has: page.locator('.sh-link', { hasText: new RegExp(`^${name}$`) }) }).locator('.alt-badge').textContent();
const focused = (page) => page.evaluate(() => document.activeElement?.id || document.activeElement?.textContent?.trim().slice(0, 40) || '');
const require = createRequire(import.meta.url);
const axe = async (page, within = '.ex-app') => {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const r = await page.evaluate((w) => window.axe.run(document.querySelector(w)), within);
  return r.violations.map((v) => `${v.id}: ${v.nodes.length} (${v.nodes[0]?.target})`);
};
const log = (page, op) => page.evaluate((op) => [...document.querySelectorAll('.ex-log-row')].filter((r) => r.textContent.includes(op)).map((r) => r.dataset.status), op);

// Both schemes, desktop and phone: the frame holds.
for (const scheme of ['light', 'dark']) {
  for (const [width, mobile] of [[1280, false], [375, true]]) {
    const { page, ctx, errors } = await open({ width, scheme, mobile });
    const lead = await page.evaluate(() => {
      const h1 = document.querySelector('.ex-app h1');
      const after = [...document.querySelectorAll('.ex-app h1, .ex-app .alt-chart-takeaway, .ex-app h2, .ex-app .alt-card-title, .ex-app [class*="card-title"]')];
      return { h1: document.querySelectorAll('.ex-app h1').length, first: after[after.indexOf(h1) + 1]?.className ?? '' };
    });
    expect(lead.h1 === 1 && /alt-chart-takeaway/.test(lead.first), `${scheme} ${width}: one h1, and the takeaway is the first heading after it (${JSON.stringify(lead)})`);
    expect(await primaries(page) === 1, `${scheme} ${width}: one primary, Declare incident for Checkout (${await primaries(page)})`);
    expect(!(await sideways(page)), `${scheme} ${width}: no sideways scroll`);
    const found = await axe(page);
    expect(!found.length, `${scheme} ${width}: axe is clean on the app (${found.join(', ')})`);
    expect(!errors.length, `${scheme} ${width}: no page or console errors (${errors.slice(0, 2).join('; ')})`);
    await ctx.close();
  }
}

// Forced colours, reduced motion and more contrast: the meaning is in words, so it survives each.
for (const [name, opts] of [['forced colours', { forced: true }], ['reduced motion', { reduced: true }], ['more contrast', {}]]) {
  const { page, ctx, errors } = await open(opts);
  if (name === 'more contrast') { await drawer(page); await page.getByRole('switch', { name: /contrast/i }).click(); await wait(page, 300); }
  expect(/^Checkout errors rose/.test(await takeaway(page)), `${name}: the takeaway leads`);
  expect(await status(page, 'Checkout') === 'Partial outage' && /Highlighted: Checkout/.test(await page.locator('.sh-lead').textContent()), `${name}: status and focus are in words`);
  if (name === 'forced colours') await page.screenshot({ path: out + 'service-health-forced.png', fullPage: true });
  await event(page, 'Skip ahead a minute');
  expect(!(await sideways(page)) && !errors.length, `${name}: no sideways scroll or errors (${errors.slice(0, 1).join('')})`);
  await ctx.close();
}

{
  const { page, ctx, errors } = await open();
  // The takeaway, the deploy and the reference line.
  let t = await takeaway(page);
  expect(/^Checkout errors rose from .+ after the 14:05 deploy\. At this rate the rest of its 30-day error budget runs out in \d+ hours\.$/.test(t), `the takeaway names the service, the deploy and the consequence (${t})`);
  expect(await page.locator('.sh-lead').getByText('Checkout deploy 4f2c').count() > 0 && await page.locator('.sh-lead').getByText('SLO: 0.1% may fail').count() > 0, 'the deploy is an annotation and the SLO a reference line');
  expect(/Highlighted: Checkout/.test(await page.locator('.sh-lead').textContent()), 'the lead highlights the service the takeaway names, in words');
  expect(await status(page, 'Checkout') === 'Partial outage' && await status(page, 'Payments') === 'Operational', 'statuses in words');

  // Every chart has its table view.
  const views = page.locator('.ex-app [role="tab"]', { hasText: /^Table$/ });
  const n = await views.count();
  for (let i = 0; i < n; i++) { await views.nth(i).click(); await wait(page, 150); }
  expect(n === 3 && await page.locator('.ex-app .alt-chart table').count() === 3, `each chart (lead, latency, heatmap) has a table view (${n})`);
  for (let i = 0; i < n; i++) await page.locator('.ex-app [role="tab"]', { hasText: /^Chart$/ }).nth(i).click();

  // A deploy opens its service; so does a row. Escape returns.
  await page.locator('.sh-lead button', { hasText: 'Checkout deploy 4f2c' }).click(); await wait(page, 900);
  let sheet = await page.locator('[role="dialog"]').textContent();
  expect(/Checkout/.test(sheet) && /Where the slowest request spent its time/.test(sheet) && /Ana Ruiz deployed 4f2c: Retry payment authorisation on timeout/.test(sheet) && /duplicate idempotency key/.test(sheet),
    'the deploy annotation opens Checkout: its spans, its deploy and its log');
  expect(/isn't a timeline of the request/.test(sheet), 'the spans say they aren’t a waterfall');
  let found = await axe(page, '[role="dialog"]');
  expect(!found.length, `axe is clean on the service detail (${found.join(', ')})`);
  await page.keyboard.press('Escape'); await wait(page, 500);
  // A row lifts on hover because clicking anywhere on it opens the service.
  await page.locator('.sh-table tbody tr', { hasText: 'Catalog' }).locator('td').nth(3).click(); await wait(page, 900);
  expect(/Catalog/.test(await page.locator('[role="dialog"] h2').first().textContent()), 'clicking a row opens its service');
  await page.keyboard.press('Escape'); await wait(page, 500);
  await page.locator('.sh-link', { hasText: /^Payments$/ }).click(); await wait(page, 900);
  expect(/Payments/.test(await page.locator('[role="dialog"] h2').first().textContent()), 'a service row opens its detail');
  await page.keyboard.press('Escape'); await wait(page, 500);
  expect(await focused(page) === 'Payments', `closing it returns focus to the row (${await focused(page)})`);

  // Declaring: the consequence in people, by severity. The fault for the lost response is set first: the dialog is modal.
  await mode(page, 'Lose the response'); await applies(page, 'incidents.declare'); await once(page, true);
  await page.locator('.sh-lead button', { hasText: 'Declare incident for Checkout' }).click(); await wait(page, 600);
  const dlg = page.locator('[role="dialog"]');
  const button = () => dlg.locator('.alt-btn[data-variant="primary"]').textContent();
  found = await axe(page, '[role="dialog"]');
  expect(!found.length, `axe is clean on the declare dialog (${found.join(', ')})`);
  expect(await button() === 'Declare SEV-2 and page 3 people', `a partial outage starts at SEV-2, and the button says who it pages (${await button()})`);
  expect(/This pages 3 people on the Payments and checkout rota/.test(await dlg.textContent()), 'the consequence is in the description');
  expect(/Checkout errors rose/.test(await dlg.locator('textarea').inputValue()), 'what’s happening starts from the takeaway');
  await dlg.locator('label.alt-radio', { hasText: 'SEV-3' }).click(); await wait(page, 100);
  expect(await button() === 'Declare SEV-3 without paging anyone', `SEV-3 pages nobody, and says so (${await button()})`);
  await dlg.locator('label.alt-radio', { hasText: 'SEV-1' }).click(); await wait(page, 100);
  expect(await button() === 'Declare SEV-1 and page 5 people', `SEV-1 adds a commander and comms (${await button()})`);
  await dlg.locator('label.alt-radio', { hasText: 'SEV-2' }).click(); await wait(page, 100);

  // A lost response: read back by key, declared once, nobody paged twice.
  await dlg.locator('.alt-btn[data-variant="primary"]').click(); await wait(page, 2400);
  expect(await page.locator('[role="dialog"]').count() === 0, 'the declaration lands after reading back');
  expect(await page.locator('.sh-incident').count() === 1 && /INC-213: Checkout/.test(await page.locator('.sh-incident h2').textContent()), 'one incident, INC-213');
  const declares = await log(page, 'incidents.declare');
  expect(declares.length === 1, `one declare request, never two (${declares.join(',')})`);
  expect(await focused(page) === 'sh-INC-213', `focus goes to the incident (${await focused(page)})`);
  expect(/Paged 3 people/.test(await page.locator('.sh-incident').textContent()), 'the incident says who it paged');
  expect(await page.locator('.sh-lead button', { hasText: 'Go to INC-213' }).count() === 1 && await primaries(page) === 0, 'the lead now goes to the incident, and nothing else is primary');

  // A failed update keeps its words, and Retry posts it once.
  await mode(page, 'Fail'); await applies(page, 'incidents.update'); await once(page, true);
  await page.locator('.sh-update textarea').fill('Rollback started.'); await page.locator('.sh-update button', { hasText: 'Post update' }).click(); await wait(page, 900);
  const item = page.locator('.sh-incident .alt-timeline-item', { hasText: 'Rollback started.' });
  expect(/Couldn't send/.test(await item.textContent()), 'a failed update drops into the trench with its words');
  await item.locator('button', { hasText: /Retry|Try again/ }).click(); await wait(page, 1000);
  expect(await page.locator('.sh-incident .alt-timeline-item', { hasText: 'Rollback started.' }).count() === 1 && !/Couldn't send/.test(await page.locator('.sh-incident').textContent()), 'Retry posts it, once');

  // A teammate declared first: a conflict, with theirs to join.
  await page.locator('.ex-drawer button', { hasText: 'Reset example data' }).click(); await wait(page, 1200);
  await event(page, 'Ana declares an incident for Checkout');
  await page.locator('.ex-app header button', { hasText: /^Declare incident$/ }).click(); await wait(page, 600);
  await dlg.locator('.alt-btn[data-variant="primary"]').click(); await wait(page, 900);
  expect(/Someone declared it first/.test(await dlg.textContent()) && /Ana Ruiz declared INC-213 for Checkout/.test(await dlg.textContent()), 'declaring the same incident twice is refused, naming who did');
  await dlg.locator('.alt-btn[data-variant="primary"]', { hasText: 'Go to INC-213' }).click(); await wait(page, 600);
  expect(await focused(page) === 'sh-INC-213', `Go to INC-213 lands on theirs (${await focused(page)})`);

  // One panel fails; the rest stay. Then stale, with the takeaway saying when.
  await mode(page, 'Fail'); await applies(page, 'metrics.latency');
  await event(page, 'Skip ahead a minute');
  expect(/Couldn’t refresh latency/.test(await page.locator('.sh-panel', { has: page.locator('#sh-latency-title') }).textContent()), 'the latency panel says its refresh failed');
  expect(await page.locator('.sh-panel', { has: page.locator('#sh-services-title') }).locator('.alt-alert, .sh-refresh-failed').count() === 0 && await page.locator('.sh-lead .sh-refresh-failed').count() === 0, 'and the other panels refreshed');
  await mode(page, 'Fail'); await applies(page, 'metrics.errors');
  await event(page, 'Skip ahead a minute'); await event(page, 'Skip ahead a minute');
  t = await takeaway(page);
  expect(/^As of 14:31: Checkout/.test(t) && await page.locator('.sh-lead .alt-badge', { hasText: 'Stale' }).count() + await page.locator('.sh-lead .sh-refresh-failed').count() > 0, `two missed minutes: the takeaway says when it was true (${t})`);
  await mode(page, 'Succeed'); await event(page, 'Skip ahead a minute');
  expect(!/^As of/.test(await takeaway(page)), 'back: no longer stale');

  // Offline: said once, for the page.
  await mode(page, 'Offline'); await event(page, 'Skip ahead a minute');
  expect(await page.locator('.ex-app .alt-alert', { hasText: 'You’re offline' }).count() === 1, 'offline is one message for the page');
  await mode(page, 'Succeed'); await wait(page, 300);

  // Scenarios: all clear (no primary), and a service that stops reporting (no all-clear, no data).
  await scenario(page, 'All clear');
  expect(await takeaway(page) === 'All 8 services are within their error budgets.', 'all clear says so');
  expect(await primaries(page) === 0, 'and has no primary action: reading is the task');
  await scenario(page, 'Search stops reporting');
  t = await takeaway(page);
  expect(/^Search stopped reporting at \d\d:\d\d, so this can’t say whether everything is fine\.$/.test(t), `silence blocks the all-clear (${t})`);
  expect(await status(page, 'Search') === 'No data', `a silent service reads No data, never Operational (${await status(page, 'Search')})`);
  await scenario(page, 'A Checkout deploy goes bad');
  expect(/Checkout: partial outage\./.test(await page.locator('.sh-sr').textContent()), 'a change of status is announced');

  // Pause holds the whole page; resuming catches up.
  const caption = () => page.locator('.sh-panel', { has: page.locator('#sh-services-title') }).locator('.sh-caption').first().textContent();
  const before = await caption();
  await page.locator('.sh-lead').getByRole('switch', { name: /Pause updates/ }).click(); await wait(page, 100);
  await event(page, 'Skip ahead a minute');
  expect(await caption() === before, `paused, the page holds still (${before} → ${await caption()})`);
  await page.locator('.sh-lead').getByRole('switch', { name: /Pause updates/ }).click(); await wait(page, 300);
  expect(await caption() !== before, 'resumed, it catches up');

  // A stalled feed goes stale against the real clock.
  await drawer(page); await page.getByRole('switch', { name: 'A new minute of metrics every minute' }).click();
  // The skips above put the simulated clock a few minutes ahead of the real one, so let ten real minutes pass.
  await page.clock.fastForward('10:00'); await wait(page, 300); await page.clock.fastForward('00:15'); await wait(page, 300);
  expect(/^As of /.test(await takeaway(page)), `with the feed stalled, the page says how old its data is (${await takeaway(page)})`);
  expect(!errors.length, `no page or console errors (${errors.slice(0, 2).join('; ')})`);
  await ctx.close();
}

await browser.close();
console.log(`Service health example: ${pass} passed, ${fail} failed.`);
if (fail) process.exit(1);
