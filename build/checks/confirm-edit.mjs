// Editing a proposal before approving it (#281): Edit opens its fields in place inside the card and focuses the first;
// the consequence and Approve follow the edited values; "Edited" sits by the title; Escape cancels the edit (values go
// back, focus returns to Edit) but not the proposal; Reject stays available; approving an edited proposal records
// "edited and approved by you". Run after a render of every preview (it drives the last Confirmation in
// test/p-Confirmation-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
await page.goto(`file://${T}p-Confirmation-daylight.html`); await page.waitForTimeout(500);
const card = page.locator('.alt-confirm').last();
const read = () => card.evaluate((c) => ({ consequence: c.querySelector('.alt-confirm-consequence').textContent, approve: [...c.querySelectorAll('.alt-confirm-actions button')].map((b) => b.textContent), edited: !!c.querySelector('.alt-confirm-edited'), fields: !!c.querySelector('.alt-confirm-edit'), line: c.querySelector('.alt-confirm-line').textContent, focus: document.activeElement.tagName + ':' + (document.activeElement.textContent || document.activeElement.value || '') }));
let r = await read();
expect(!r.fields && r.approve.includes('Edit') && !r.edited, `Edit is offered and the fields are closed (${JSON.stringify(r.approve)})`);
await card.locator('button:has-text("Edit")').click(); await page.waitForTimeout(200);
r = await read();
expect(r.fields && r.focus === 'INPUT:October product update', `Edit opens the fields in place, focusing the first (${r.focus})`);
expect(r.approve.includes("Don't send") && r.approve.includes('Send 214 emails'), 'Reject and Approve stay while editing');
await page.keyboard.type(' (corrected)'); await page.waitForTimeout(100);
r = await read();
expect(r.consequence.includes('“October product update (corrected)”') && r.edited, `the consequence follows the edit and "Edited" shows (${r.consequence})`);
await page.keyboard.press('Escape'); await page.waitForTimeout(200);
r = await read();
expect(!r.fields && !r.edited && r.consequence.includes('“October product update”') && r.focus === 'BUTTON:Edit' && r.line === 'Approval needed', `Escape cancels the edit, not the proposal (${JSON.stringify(r)})`);
await card.locator('button:has-text("Edit")').click(); await page.waitForTimeout(200);
await page.keyboard.type(' — final');
await card.locator('button:has-text("Done editing")').click(); await page.waitForTimeout(100);
r = await read();
expect(!r.fields && r.edited && r.consequence.includes('— final'), 'Done editing keeps the values');
await card.locator('button:has-text("Send 214 emails")').click(); await page.waitForTimeout(1500);
r = await read();
expect(/Sent · edited and approved by you/.test(r.line), `approving an edited proposal records it (${r.line})`);
console.log(`Confirmation edit: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
