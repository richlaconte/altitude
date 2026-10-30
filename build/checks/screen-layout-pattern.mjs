// Screen layout pattern: each frame's stated lead (the design record in its fixture's first lines) is the first thing
// after the page header and, where the record says so, the largest region; there's at most one primary action and no
// navigation sidebar. The editor saves as a status and publishes with its outcome taking focus; the decision puts its
// consequence and both choices before the evidence, asks for a decline's reason in place, returns focus to Decline on
// Escape, and replaces the choice with the outcome; the report's takeaway heads the chart that leads, before any other
// heading after the title. Unled equal sets and flat stacks are render-tells.mjs's (it opens every preview). Run after a
// render of every preview (it opens test/p-ScreenLayout*-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (name) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 1000 } });
  await page.goto(`file://${T}p-${name}-daylight.html`);
  await page.waitForTimeout(500);
  return page;
};
// The frame: main's regions in order, with their areas; the primary buttons; any navigation besides the breadcrumb.
const frame = (page) => page.evaluate(() => {
  const main = document.querySelector('main'), kids = [...main.children].filter((c) => getComputedStyle(c).display !== 'none');
  return {
    regions: kids.map((c) => ({ cls: typeof c.className === 'string' ? c.className : '', tag: c.tagName, area: c.getBoundingClientRect().width * c.getBoundingClientRect().height })),
    primaries: [...document.querySelectorAll('button[data-variant="primary"]')].filter((b) => b.getClientRects().length).length,
    navs: [...document.querySelectorAll('nav, [role="navigation"]')].filter((n) => !n.closest('.alt-page-head')).length,
  };
});
const leads = (f, cls, largest) => {
  const i = f.regions.findIndex((r) => r.cls.split(' ').includes(cls));
  expect(f.regions[0]?.cls.includes('alt-page-head') && i === 1, `${cls} is the first thing after the page header (${f.regions.map((r) => r.cls || r.tag).join(', ')})`);
  if (largest) expect(i >= 0 && f.regions.every((r, j) => j === i || r.area < f.regions[i].area), `${cls} is the largest region`);
  expect(f.primaries <= 1 && f.navs === 0, `one primary action at most and no navigation sidebar (${f.primaries} primary, ${f.navs} nav)`);
};
const focused = (page) => page.evaluate(() => { const a = document.activeElement; return { id: a?.id || '', text: a?.textContent?.trim() || '', role: a?.getAttribute('role') || '', tag: a?.tagName || '' }; });

{ // Focused editor.
  const page = await open('ScreenLayoutEditor');
  leads(await frame(page), 'le-body', true);
  const area = (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return r.width * r.height; }, sel);
  expect(await area('.le-draft') > 2 * await area('.le-side'), 'the draft fills the column; its details sit beside it, narrower');
  expect(await page.locator('.le-draft').evaluate((d, s) => d.compareDocumentPosition(document.querySelector(s)) & Node.DOCUMENT_POSITION_FOLLOWING, '.le-side') > 0, 'the draft comes before its details in reading order');
  await page.getByLabel('Note').fill('A first line.');
  expect(/Saving/.test(await page.locator('.alt-sync').textContent()), 'typing saves as a status, not a second button');
  await page.waitForTimeout(1000);
  expect(/Saved/.test(await page.locator('.alt-sync').textContent()), 'and settles to Saved');
  await page.locator('#le-title').fill('');
  await page.getByRole('button', { name: 'Publish' }).click();
  await page.waitForTimeout(200);
  expect((await focused(page)).id === 'le-title' && /Give the note a title/.test(await page.locator('.le-draft').textContent()), 'publishing without a title says so and focuses the title');
  await page.locator('#le-title').fill('Saved views');
  await page.getByRole('button', { name: 'Publish' }).click();
  await page.waitForTimeout(1000);
  const f = await focused(page);
  expect(f.role === 'status' && /^Published/.test(f.text), `the outcome takes focus where the task ends (${f.role} “${f.text.slice(0, 30)}”)`);
  expect(/View the changelog/.test(f.text) && (await frame(page)).primaries === 0, 'it points to what comes next, and Publish is gone');
  await page.close();
}

{ // Decision.
  const page = await open('ScreenLayoutDecision');
  leads(await frame(page), 'ld-choice', false);
  const order = await page.evaluate(() => {
    const choice = document.querySelector('.ld-choice'), evidence = document.querySelector('.ld-evidence');
    return { consequence: !!choice.querySelector('.ld-consequence'), buttons: [...choice.querySelectorAll('button')].map((b) => b.textContent.trim()),
      above: choice.getBoundingClientRect().bottom <= evidence.getBoundingClientRect().top, title: document.querySelector('.alt-page-head h1, .alt-page-head h2')?.textContent };
  });
  expect(/\?$/.test(order.title || ''), `the question is the title (${order.title})`);
  expect(order.consequence && order.buttons.join() === 'Approve refund,Decline' && order.above, `the consequence and both choices come before the evidence (${order.buttons.join()})`);
  await page.getByRole('button', { name: 'Decline' }).click();
  await page.waitForTimeout(200);
  expect((await focused(page)).id === 'ld-reason', 'Decline asks for its reason in place, focused');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  expect((await focused(page)).text === 'Decline', 'Escape cancels and returns focus to Decline');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Send decline' }).click();
  await page.waitForTimeout(200);
  expect((await focused(page)).id === 'ld-reason' && /Say why/.test(await page.locator('.ld-choice').textContent()), 'a decline needs a reason, and says so');
  await page.locator('#ld-reason').fill('The duplicate invoice was already credited on 3 October.');
  await page.getByRole('button', { name: 'Send decline' }).click();
  await page.waitForTimeout(1000);
  let f = await focused(page);
  expect(f.role === 'status' && /^Refund declined/.test(f.text) && /Next request/.test(f.text), `the outcome replaces the choice, takes focus and points to the next request (“${f.text.slice(0, 30)}”)`);
  await page.reload(); await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Approve refund' }).click();
  await page.waitForTimeout(1000);
  f = await focused(page);
  expect(f.role === 'status' && /^Refund approved/.test(f.text) && (await frame(page)).primaries === 0, 'approving reports the outcome in its place');
  await page.close();
}

{ // Report.
  const page = await open('ScreenLayoutReport');
  const f = await frame(page);
  leads(f, 'lr-lead', true);
  const r = await page.evaluate(() => {
    // The takeaway is set as the figure's heading (ChartContainer's .alt-chart-takeaway): it must come before, and read
    // at least as large as, the first heading after the title.
    const take = document.querySelector('.lr-lead .alt-chart-takeaway'), h = [...document.querySelectorAll('main h2, main h3')].find((e) => !e.closest('.alt-page-head') && !e.closest('.lr-lead'));
    const chart = document.querySelector('.lr-lead').getBoundingClientRect(), stats = document.querySelector('.alt-stat-group, [aria-label="October in numbers"]').getBoundingClientRect();
    return { first: take?.textContent || '', before: !!take && !!h && !!(take.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING), larger: !!take && !!h && parseFloat(getComputedStyle(take).fontSize) >= parseFloat(getComputedStyle(h).fontSize), hero: document.querySelectorAll('.alt-stat[data-size="hero"]').length, ratio: (chart.width * chart.height) / (stats.width * stats.height), statsBelow: stats.top >= chart.bottom };
  });
  expect(r.before && r.larger && /^Signups doubled/.test(r.first), `the takeaway heads the chart that leads, before and above every heading after the title (“${r.first.slice(0, 30)}”)`);
  expect(r.hero === 0 && r.statsBelow && r.ratio > 2, `the secondary numbers follow the chart, smaller and grouped (area ×${r.ratio.toFixed(1)})`);
  await page.close();
}

console.log(`Screen layout pattern: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
