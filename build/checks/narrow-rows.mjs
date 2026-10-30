// Rows at phone width (#258, #267): a PropertyList proposal stacks its change and its actions under 480px, so values
// keep their words; an ItemGroup row's actions move to their own row under the content, so the title keeps its width;
// nothing changes on a wide screen. Run after a render of every preview; exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
for (const width of [375, 960]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(`file://${T}p-PropertyProposals-daylight.html`); await page.waitForTimeout(500);
  const p = await page.evaluate(() => { const row = document.querySelector('.alt-property[data-proposed]'), change = row.querySelector('.alt-property-change').getBoundingClientRect(), act = row.querySelector('.alt-property-proposal-actions').getBoundingClientRect();
    return { changeW: Math.round(change.width), below: act.top >= change.bottom - 1 }; });
  if (width === 375) expect(p.changeW > 150 && p.below, `375px: a proposal's change keeps its width and its actions sit below (${JSON.stringify(p)})`);
  else expect(!p.below, `960px: the actions stay beside the change (${JSON.stringify(p)})`);
  await page.goto(`file://${T}p-ItemGroup-daylight.html`); await page.waitForTimeout(500);
  // The query follows the group's own width: widen it to see the wide layout.
  if (width === 960) await page.evaluate(() => { const g = document.querySelector('.alt-item-group'); g.style.width = '700px'; g.style.maxWidth = 'none'; });
  await page.waitForTimeout(200);
  const it = await page.evaluate(() => { const row = document.querySelector('.alt-item:has(> .alt-item-actions)'), c = row.querySelector('.alt-item-content').getBoundingClientRect(), a = row.querySelector('.alt-item-actions > *').getBoundingClientRect();
    return { below: a.top >= c.bottom - 1, contentW: Math.round(c.width), alignedLeft: Math.abs(a.left - c.left) < 16 }; });
  if (width === 375) expect(it.below && it.alignedLeft && it.contentW > 200, `375px: an item's actions take their own row, under the content (${JSON.stringify(it)})`);
  else expect(!it.below, `960px: an item's actions stay beside it (${JSON.stringify(it)})`);
  await page.close();
}
console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
