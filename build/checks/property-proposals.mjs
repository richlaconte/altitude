// PropertyList proposals: a field with a proposal is raised, current struck beside proposed (an empty current isn't
// struck), with named Accept and Reject; a summary group counts them with Accept all and Reject all; accepting hovers as
// pending, then the record changes and settles with an afterglow, announced; a failed save drops to a trench with Retry
// and keeps the proposal; Reject leaves the record unchanged; Accept all clears the rest. Run after a render of every
// preview (it opens test/p-PropertyProposals-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-PropertyProposals-daylight.html`);
await page.waitForTimeout(400);

const read = () => page.evaluate(() => ({
  summary: document.querySelector('.alt-property-proposals')?.getAttribute('aria-label') ?? null,
  items: [...document.querySelectorAll('.alt-property')].map((p) => ({ label: p.querySelector('dt').textContent, proposed: p.hasAttribute('data-proposed'), status: p.getAttribute('data-status'), settle: p.getAttribute('data-settle'),
    shadow: getComputedStyle(p).boxShadow, old: p.querySelector('del')?.textContent ?? null, nu: p.querySelector('ins')?.textContent ?? null, value: p.querySelector('dd').textContent, by: p.querySelector('.alt-property-proposal-by')?.textContent ?? null })),
  said: document.querySelector('.alt-property-list > .alt-sr').textContent,
}));
let r = await read();
expect(r.summary === '3 proposed changes' && await page.locator('.alt-property-proposals button').allTextContents().then((b) => b.join() === 'Reject all,Accept all'), 'a summary group with Accept all and Reject all');
expect(r.items[0].proposed && r.items[0].shadow !== 'none' && r.items[0].old === 'Current: Qualified' && r.items[0].nu === 'Proposed: Proposal', 'a proposed field is raised: current struck beside proposed');
expect(r.items[2].old === null && r.items[2].value.startsWith('Current: Not set'), 'an empty current value isn\'t struck');
expect(!r.items[3].proposed && r.items[3].shadow === 'none', 'fields without proposals stay flush');
expect(await page.locator('[aria-label="Accept new stage"]').count() === 1 && await page.locator('[aria-label="Reject new stage"]').count() === 1, 'Accept and Reject name their field');
await page.click('[aria-label="Accept new stage"]');
await page.waitForTimeout(400);
r = await read();
expect(r.items[0].status === 'pending' && r.items[0].by === 'Saving…', 'accepting hovers as pending');
await page.waitForTimeout(600);
r = await read();
expect(!r.items[0].proposed && r.items[0].value.includes('Proposal') && (r.items[0].settle === 'a' || r.items[0].settle === 'b') && r.said === 'New stage saved.' && r.summary === '2 proposed changes', `then the record changes and settles (${r.said})`);
await page.click('[aria-label="Accept new amount"]');
await page.waitForTimeout(1000);
r = await read();
expect(r.items[1].status === 'failed' && r.items[1].proposed && r.items[1].by.includes('need a manager') && await page.locator('[aria-label="Retry new amount"]').count() === 1, 'a failed save keeps the proposal in a trench with Retry');
await page.click('[aria-label="Reject new close date"]');
await page.waitForTimeout(100);
r = await read();
expect(!r.items[2].proposed && r.items[2].value.includes('Not set') && r.said === 'Rejected the new close date.', 'Reject leaves the record unchanged');
await page.click('.alt-property-proposals button:has-text("Accept all")');
await page.waitForTimeout(1100);
r = await read();
expect(r.summary === null && r.items.every((i) => !i.proposed) && r.items[1].value.includes('18,500'), 'Accept all clears the rest');

console.log(`PropertyProposals: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
