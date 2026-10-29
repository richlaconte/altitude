// FilterBar groups: a FilterTree renders the top level's conditions and each group as a flush bracket (1px border, no
// shadow, role="group" named "Any of") with its own all/any switch; changing a group's match and conditions updates
// the tree and the sentence; Add group adds an "any of" group; removing a group's last condition removes it; the table
// filters by the tree. Run after a render of every preview (it opens test/p-FilterGroups-daylight.html); exits
// non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
await page.goto(`file://${T}p-FilterGroups-daylight.html`);
await page.waitForTimeout(400);

const read = () => page.evaluate(() => {
  const groups = [...document.querySelectorAll('.alt-filter-group')];
  return { root: document.querySelector('.alt-filter-tree')?.getAttribute('aria-label'), groups: groups.map((g) => ({ label: g.getAttribute('aria-label'), border: getComputedStyle(g).borderTopWidth, shadow: getComputedStyle(g).boxShadow, match: g.querySelector('[data-part="match"], .alt-filter-match, button')?.textContent })),
    sentence: document.querySelector('.cap').textContent, matched: [...document.querySelectorAll('tbody tr')].filter((r) => r.dataset.rowRelevance === 'match').map((r) => r.querySelector('td').textContent) };
});
let r = await read();
expect(r.root === 'Segment rules' && r.groups.length === 1, 'a tree renders its conditions and one group');
expect(r.groups[0].label === 'Any of' && r.groups[0].border === '1px' && r.groups[0].shadow === 'none', 'a group is a flush bracket named "Any of"');
expect(r.sentence === 'Plan is Pro and any of: Country is Germany, Seats > 50', `the expression in words (${r.sentence})`);
expect(r.matched.join(',') === 'Acme,Globex', `the table filters by the tree (${r.matched})`);

await page.click('.alt-filter-group button:has-text("Match any of")');
await page.waitForTimeout(200);
r = await read();
expect(r.groups[0].label === 'All of' && r.sentence.includes('all of:'), `the group's own switch changes its match (${r.sentence})`);
expect(r.matched.length === 0, `and the results follow (${r.matched})`);
await page.click('.alt-filter-group button:has-text("Match all of")');

await page.click('button:has-text("+ Add group")');
await page.waitForTimeout(200);
expect((await read()).groups.length === 2, 'Add group adds a group');
await page.click('[aria-label="Remove this group"] >> nth=1');
await page.waitForTimeout(200);
expect((await read()).groups.length === 1, 'and a group can be removed');

// Removing a group's conditions one by one removes the group.
await page.click('.alt-filter-group [aria-label^="Remove filter: Seats"]');
await page.waitForTimeout(200);
await page.click('.alt-filter-group [aria-label^="Remove filter: Country"]');
await page.waitForTimeout(200);
r = await read();
expect(r.groups.length === 0 && r.sentence === 'Plan is Pro', `removing a group's last condition removes it (${r.sentence})`);

console.log(`Filter groups: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
