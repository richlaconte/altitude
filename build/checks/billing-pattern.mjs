// Billing pattern: quotas are Meters (never Progress) that say their state in words; the rest of the cycle is projected
// (hatched, and said); the estimate says how it's computed; a plan change is reviewed with its proration before it's
// confirmed, the review heading takes focus, and only a completed change says so; a downgrade lists what will be lost
// and its button is a danger one; a locked feature stays live with its plan plate; a failed payment is a page banner
// that asks for action; invoice amounts are formatted currency. Run after a render of every preview (it opens
// test/p-BillingPattern-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 1200 } });
await page.goto(`file://${T}p-BillingPattern-daylight.html`);
await page.waitForTimeout(600);

const usage = await page.evaluate(() => { const s = document.querySelector('[aria-labelledby="bl-usage-h"]');
  return { meters: s.querySelectorAll('.alt-meter').length, progress: s.querySelectorAll('.alt-progress, [role="progressbar"]').length, text: s.textContent }; });
expect(usage.meters === 3 && usage.progress === 0, `quotas are Meters, never Progress (${usage.meters} meters, ${usage.progress} progress)`);
expect(/8 of 10/.test(usage.text) && /Near limit/.test(usage.text) && /Over limit/.test(usage.text), 'each quota says its reading and state in words');
expect(/the last two weeks of the cycle are projected/i.test(usage.text) && await page.locator('[aria-labelledby="bl-calls-h"] [data-status="projected"]').count() === 2, 'the rest of the cycle is projected, and said');
expect(/10 seats × €24, plus €48/.test(usage.text), 'the estimate says how it is computed');

await page.getByRole('button', { name: 'Review change' }).click();
await page.waitForTimeout(200);
expect(await page.getByText('Choose a plan you’re not on.').count() === 1, 'reviewing without a change says why it can’t');
await page.getByRole('radio', { name: /Business/ }).click();
await page.getByRole('button', { name: 'Review change' }).click();
await page.waitForTimeout(300);
const review = await page.evaluate(() => ({ focus: document.activeElement.textContent, text: document.querySelector('.bl-proration')?.textContent }));
expect(review.focus === 'Upgrade to Business?' && /You’ll pay €\d+\.\d\d today for the rest of this cycle, then €480\.00\/month/.test(review.text), `the review states the proration and takes focus (${JSON.stringify(review)})`);
await page.getByRole('button', { name: 'Upgrade to Business' }).click();
await page.waitForTimeout(300);
expect(await page.evaluate(() => [...document.querySelectorAll('[aria-labelledby="bl-plan-h"] [role="status"], [aria-labelledby="bl-plan-h"] .alt-workflow-status')].some((n) => n.textContent === 'Changing plan…')), 'the change is pending while it’s made');
expect(await page.getByRole('heading', { name: 'You’re on Business' }).count() === 0, 'and nothing claims it’s done yet');
await page.waitForTimeout(900);
expect(await page.getByRole('heading', { name: 'You’re on Business' }).count() === 1, 'a completed change says so');

await page.getByRole('button', { name: 'Change plan again' }).click();
await page.waitForTimeout(200);
await page.getByRole('radio', { name: /Free/ }).click();
await page.getByRole('button', { name: 'Review change' }).click();
await page.waitForTimeout(300);
const down = await page.evaluate(() => ({ head: document.getElementById('bl-plan-h').textContent, losses: [...document.querySelectorAll('.bl-losses li')].map((l) => l.textContent),
  danger: [...document.querySelectorAll('button')].find((b) => b.textContent === 'Downgrade to Free')?.dataset.variant }));
expect(down.head === 'Downgrade to Free?' && down.losses.length === 3 && /SAML SSO/.test(down.losses[0]), `a downgrade lists what will be lost (${JSON.stringify(down.losses)})`);
expect(down.danger === 'danger', 'and its button is a danger one');

const gate = await page.evaluate(() => { const s = document.querySelector('[aria-labelledby="bl-roles-h"]'), b = [...s.querySelectorAll('button')].find((b) => b.textContent.includes('Create a role'));
  return { live: !!b && !b.disabled, plate: s.textContent.includes('Business') }; });
expect(gate.live && gate.plate, 'a locked feature stays live with its plan plate');

await page.getByRole('switch', { name: 'Simulate a failed payment' }).click();
await page.waitForTimeout(300);
const banner = await page.evaluate(() => { const a = document.querySelector('.bl-page > .alt-alert, .bl-page > * .alt-alert');
  return a && { role: a.getAttribute('role') || a.querySelector('[role]')?.getAttribute('role'), page: a.closest('[data-placement="page"], .alt-alert[data-placement="page"]') !== null || a.dataset.placement === 'page', action: [...a.querySelectorAll('button')].map((b) => b.textContent).join() }; });
expect(banner && banner.page && /Update payment method/.test(banner.action), `a failed payment is a page banner asking for action (${JSON.stringify(banner)})`);

const amounts = await page.evaluate(() => [...document.querySelectorAll('[aria-labelledby="bl-inv-h"] tbody td:nth-child(3)')].map((t) => t.textContent));
expect(amounts.join() === '€264.00,€240.00,€240.00', `invoice amounts are formatted currency (${amounts})`);

console.log(`Billing pattern: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
