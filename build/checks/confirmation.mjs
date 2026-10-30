// Confirmation: a requested proposal is a raised section (elev shadow, not hovering, no aria-busy) named by its title and
// described by its consequence, with Reject and a named Approve, and nothing focused; approving makes it pending (hovers,
// aria-busy) then done (lands) and announces it; rejecting leaves it flush and muted in the record; hold escalation needs a
// hold; dialog escalation asks in a dialog, and a failure drops to a trench with Retry. Run after a render of every preview
// (it opens test/p-Confirmation-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(`file://${T}p-Confirmation-daylight.html`);
await page.waitForTimeout(400);

const card = (n) => page.evaluate((n) => {
  const c = document.querySelectorAll('.alt-confirm')[n], cs = getComputedStyle(c);
  return { state: c.dataset.state, status: c.getAttribute('data-status'), busy: c.getAttribute('aria-busy'), shadow: cs.boxShadow, transform: cs.transform,
    name: document.getElementById(c.getAttribute('aria-labelledby'))?.textContent, desc: document.getElementById(c.getAttribute('aria-describedby'))?.textContent,
    line: c.querySelector('.alt-confirm-line').textContent, buttons: [...c.querySelectorAll('button')].map((b) => b.textContent), said: c.querySelector('[role="status"]').textContent, color: getComputedStyle(c.querySelector('.alt-confirm-title')).color };
}, n);
let r = await card(0);
expect(r.state === 'requested' && r.status === null && r.busy === null && r.shadow !== 'none' && !r.shadow.startsWith('rgba(0, 0, 0, 0) 0px 0px 0px 1px inset'), 'a proposal is raised, not pending');
expect(r.name === 'Send campaign email' && r.desc.startsWith('214 Pro customers'), 'named by its title, described by its consequence');
expect(r.line === 'Approval needed' && r.buttons.join('|') === "Don't send|Send 214 emails", `Reject and a named Approve (${r.buttons})`);
expect(await page.evaluate(() => document.activeElement === document.body), 'nothing is focused');
await page.click('text=Send 214 emails');
await page.waitForTimeout(500);
r = await card(0);
expect(r.status === 'pending' && r.busy === 'true' && r.line === 'Sending…' && r.buttons.length === 0, 'approving makes it pending');
await page.waitForTimeout(1200);
r = await card(0);
expect(r.state === 'done' && r.status === 'committed' && r.line.startsWith('Sent · approved by you') && r.said === 'Send campaign email: Sent.', `then it lands and is announced (${r.said})`);
const ink = (await card(1)).color;
await page.click('text=Keep them');
r = await card(1);
expect(r.state === 'rejected' && r.line.startsWith('Rejected by you') && r.color !== ink && r.buttons.length === 0, 'rejecting leaves it muted in the record');
expect(r.name === 'Delete 3 stale branches' && await page.locator('.alt-confirm').count() === 5, 'it stays in place');
// Hold escalation: a click alone doesn't approve.
await page.goto(`file://${T}p-Confirmation-daylight.html`);
await page.waitForTimeout(400);
await page.click('text=Delete 3 branches');
await page.waitForTimeout(300);
expect((await card(1)).state === 'requested', 'with escalate="hold", a click doesn\'t approve');
const hold = page.locator('.alt-confirm').nth(1).locator('button', { hasText: 'Delete 3 branches' });
const box = await hold.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(1200); await page.mouse.up();
await page.waitForTimeout(200);
expect((await card(1)).status === 'pending', 'holding approves');
await page.click('text=Archive workspace');
await page.waitForTimeout(400);
expect(await page.locator('[role="dialog"]').count() === 1 && (await card(2)).state === 'requested', 'with escalate="dialog", it asks in a dialog');
await page.click('[role="dialog"] button:has-text("Archive workspace")');
await page.waitForTimeout(1700);
r = await card(2);
expect(r.state === 'failed' && r.status === 'failed' && r.line === "Couldn't archive" && r.buttons.join() === 'Retry', 'a failure drops to a trench with Retry');

console.log(`Confirmation: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
