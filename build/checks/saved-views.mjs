// SavedViews and useSavedViews: views are folder tabs over the filters and table; switching applies a view's filters,
// sort and columns; changing a view makes it a draft (a dot, "modified" in its name, announced) with Save view, Save
// as new view and Reset; a draft survives switching away and back; Reset restores it; Save keeps it; Save as new adds
// a tab. Run after a render of every preview (it opens test/p-SavedViews-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
await page.goto(`file://${T}p-SavedViews-daylight.html`);
await page.waitForTimeout(400);

const read = () => page.evaluate(() => {
  const root = document.querySelector('.alt-views');
  return { variant: root.getAttribute('data-variant'), tabs: [...root.querySelectorAll('[role="tab"]')].map((t) => t.textContent), active: root.querySelector('[role="tab"][aria-selected="true"]').textContent,
    filters: root.querySelectorAll('.alt-filter-chip, .alt-filter-cond, [data-filter]').length, actions: [...root.querySelectorAll('.alt-views-actions .alt-btn')].map((b) => b.textContent),
    first: root.querySelector('tbody tr td')?.textContent, headers: [...root.querySelectorAll('thead th')].map((t) => t.textContent.trim()).filter(Boolean),
    said: root.querySelector(':scope > .alt-sr[aria-live]').textContent };
});
let r = await read();
expect(r.variant === 'folder' && r.tabs.join('|') === 'All deals|My open deals|In negotiation', `folder tabs, one per view (${r.tabs})`);
expect(r.first === 'Globex expansion' && r.actions.length === 0, 'the first view applies its sort, and isn\'t modified');
await page.click('[role="tab"]:has-text("In negotiation")');
await page.waitForTimeout(300);
r = await read();
expect(!r.headers.includes('Owner'), `a view applies its columns (${r.headers})`);
await page.click('[role="tab"]:has-text("My open deals")');
await page.waitForTimeout(300);
await page.click('th:has-text("Value") button');
await page.waitForTimeout(300);
r = await read();
expect(r.active === 'My open deals, modified' && r.actions.join('|') === 'Save view|Save as new view|Reset', `a change makes a draft: "modified", and its actions (${r.active})`);
expect(r.said === 'My open deals modified.', `announced once (${r.said})`);
await page.click('[role="tab"]:has-text("All deals")');
await page.waitForTimeout(200);
await page.click('[role="tab"]:has-text("My open deals")');
await page.waitForTimeout(200);
expect((await read()).active === 'My open deals, modified', 'the draft survives switching away and back');
await page.click('.alt-views-actions button:has-text("Reset")');
await page.waitForTimeout(200);
r = await read();
expect(r.active === 'My open deals' && r.actions.length === 0, 'Reset restores the saved view');
await page.click('th:has-text("Value") button');
await page.waitForTimeout(200);
await page.click('.alt-views-actions button:has-text("Save view")');
await page.waitForTimeout(200);
expect((await read()).active === 'My open deals', 'Save keeps the change and clears the draft');
await page.click('th:has-text("Deal") button');
await page.waitForTimeout(200);
await page.click('.alt-views-actions button:has-text("Save as new view")');
await page.waitForTimeout(300);
await page.fill('.alt-views-new input', 'Big deals');
await page.click('.alt-views-new button[type="submit"]');
await page.waitForTimeout(300);
expect((await read()).tabs.includes('Big deals'), 'Save as new view adds a tab');

console.log(`Saved views: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
