// Trace: an ordered list of Stepper plates; done steps are flush and stamped with duration, the running step is raised
// and aria-current with no spinner, planned steps are imprints; a failed step drops to a trench with its reason and
// Retry and is announced at once; tool calls open behind a lid showing input; an approval step holds a Confirmation.
// Run after a render of every preview (it opens test/p-Trace-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 800 } });
await page.goto(`file://${T}p-Trace-daylight.html`);
await page.waitForTimeout(300);

const read = () => page.evaluate(() => [...document.querySelector('ol.alt-trace').querySelectorAll(':scope > .alt-trace-item')].map((li) => {
  const s = li.querySelector('.alt-step');
  return { state: s.dataset.state, status: li.dataset.trace, current: li.getAttribute('aria-current'), desc: li.querySelector('.alt-step-desc').textContent, shadow: getComputedStyle(s).boxShadow,
    spinner: !!li.querySelector('.alt-btn-spinner, [class*="spin"]'), error: li.querySelector('.alt-trace-error')?.textContent ?? null };
}));
let r = await read();
expect(await page.evaluate(() => document.querySelector('ol.alt-trace').getAttribute('aria-label')) === 'Agent run: answer refund question', 'a labelled ordered list');
expect(r[0].status === 'running' && r[0].state === 'current' && r[0].current === 'step' && r[0].desc === 'Running' && !r[0].spinner, 'the running step is raised and current, with no spinner');
expect(r.slice(1).every((s) => s.state === 'upcoming' && s.desc === 'Planned'), 'planned steps are imprints');
await page.waitForTimeout(3300);
r = await read();
expect(r[0].status === 'done' && r[0].desc === 'Done · 820ms' && r[1].desc === 'Done · 1.4s', 'done steps are stamped with their durations');
expect(r[2].status === 'failed' && r[2].state === 'failed' && r[2].error?.startsWith('The billing service timed out.') && r[2].shadow.includes('inset'), `a failed step drops to a trench with its reason and Retry (${r[2].shadow})`);
expect(await page.evaluate(() => document.querySelector('.alt-trace ~ .alt-sr[aria-live="assertive"]').textContent) === 'Failed: Check the customer’s plan', 'a failure is announced at once');
await page.click('text=get_subscription');
await page.waitForTimeout(300);
expect(await page.evaluate(() => { const t = [...document.querySelectorAll('.alt-acc-trigger')].find((b) => b.textContent.includes('get_subscription')); return t.getAttribute('aria-expanded') === 'true' && document.getElementById(t.getAttribute('aria-controls')).textContent.includes('cus_EXAMPLE42'); }), 'a tool call opens behind its lid, showing its input');
await page.click('.alt-trace-error button:has-text("Retry")');
await page.waitForTimeout(800);
r = await read();
expect(r[2].status === 'done' && r[3].status === 'running', 'Retry carries on');
await page.waitForTimeout(2300);
r = await read();
expect(r[4].status === 'awaiting-approval' && r[4].desc === 'Waiting for your approval' && r[4].current === 'step' && await page.locator('.alt-trace-item >> nth=4 >> .alt-confirm[data-state="requested"]').count() === 1, 'an approval step holds a raised Confirmation');
expect(await page.evaluate(() => document.querySelector('.alt-trace-item:nth-child(4)').textContent.includes('Thought for 2.1s')), 'reasoning sits under its step');
await page.click('.alt-confirm button:has-text("Send reply")');
await page.waitForTimeout(1300);
expect((await read())[4].status === 'done', 'approving finishes the run');

console.log(`Trace: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
