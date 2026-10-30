// Agent action pattern: steps map to one reading each (planned, running, awaiting approval, done, failed); a reversible
// step runs without asking and offers Undo; sending email waits for approval as a Proposed card (raised, never hovering),
// hovers as pending only once approved, and lands with what happened; deleting for good asks in a stationary dialog; a
// failed step says nothing changed and retries; the changed record carries an AI label naming the approver. Run after a
// render of every preview (it opens test/p-AgentActionPattern-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 1100 } });
await page.goto(`file://${T}p-AgentActionPattern-daylight.html`);
await page.waitForTimeout(300);
const steps = () => page.evaluate(() => [...document.querySelectorAll('.alt-trace-item')].map((s) => s.dataset.trace));
const confirm = (n) => page.evaluate((n) => { const c = document.querySelectorAll('.alt-confirm')[n]; return c && { state: c.dataset.state, status: c.dataset.status || '', anim: getComputedStyle(c).animationName, text: c.textContent }; }, n);

expect((await steps()).join() === 'running,planned,planned,planned', `planned steps wait while the first runs (${await steps()})`);
await page.waitForTimeout(2000);
expect((await steps()).join() === 'done,done,awaiting-approval,planned', `a reversible step runs without asking (${await steps()})`);
expect(/4 leads archived\. You can undo this for 30 days\./.test(await page.evaluate(() => document.querySelector('.ag-receipt').textContent)), 'and says what it did, with Undo');
let c = await confirm(0);
expect(c.state === 'requested' && c.status === '' && c.anim !== 'alt-hover' && /Theo Marsh, Ines Duarte and Sam Okafor/.test(c.text), `sending email waits as a Proposed card, never hovering (${JSON.stringify({ ...c, text: '' })})`);
await page.getByRole('button', { name: 'Send 3 emails' }).click();
await page.waitForTimeout(400);
c = await confirm(0);
expect(c.state === 'running' && c.status === 'pending', `approved, it hovers as pending (${c.state}/${c.status})`);
await page.waitForTimeout(900);
c = await confirm(0);
expect(c.state === 'done' && /3 emails sent/.test(c.text), 'then lands with what happened');

await page.getByRole('button', { name: 'Delete list' }).click();
await page.waitForTimeout(500);
const dialog = page.getByRole('dialog', { name: 'Delete the “Summer import” list' });
expect(await dialog.count() === 1 && await page.locator('[data-receded]').count() === 0, 'deleting for good asks in a stationary dialog');
await dialog.getByRole('button', { name: 'Delete list' }).click();
await page.waitForTimeout(1300);
expect((await steps()).join() === 'done,done,done,done', `every step lands (${await steps()})`);

const record = await page.evaluate(() => { const r = document.querySelector('.ag-record'); return r && { label: r.querySelector('.alt-ailabel')?.textContent, text: r.textContent }; });
expect(record && record.label === 'Drafted with AI' && /approved by Maya Chen/.test(record.text), 'the changed record carries provenance and its approver');

await page.getByRole('button', { name: 'Undo archive' }).click();
await page.waitForTimeout(200);
expect(/Archive undone/.test(await page.evaluate(() => document.querySelector('.ag-receipt').textContent)), 'Undo reverses the reversible step');

await page.getByRole('switch', { name: 'Make the next step fail' }).click();
await page.getByRole('button', { name: 'Run again' }).click();
await page.waitForTimeout(1100);
const failed = await page.evaluate(() => { const s = document.querySelector('.alt-trace-item'); return { state: s.dataset.trace, text: s.textContent }; });
expect(failed.state === 'failed' && /Nothing was changed/.test(failed.text), 'a failed step sinks and says nothing changed');
await page.getByRole('button', { name: /Retry/ }).first().click();
await page.waitForTimeout(1900);
expect((await steps()).slice(0, 2).join() === 'done,done', 'and Retry runs it again');

console.log(`Agent action pattern: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
