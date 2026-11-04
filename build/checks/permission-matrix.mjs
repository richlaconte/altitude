// PermissionMatrix: a grid of checkbox cells with one tab stop; editable cells are checkboxes, inherited and locked
// cells are stamped, aria-readonly and say why; arrows, End and Ctrl+Home move; Space toggles an editable cell, which
// hovers as pending until its promise settles, then glows; Space on a stamped cell changes nothing and says why; the
// active cell is a ring. Run after a render of every preview (it opens test/p-PermissionMatrix-daylight.html); exits
// non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-PermissionMatrix-daylight.html`);
await page.waitForTimeout(400);

const cell = (name) => page.evaluate((name) => { const b = document.querySelector(`[aria-label="${name}"]`), td = b.closest('td');
  return { checked: b.getAttribute('aria-checked'), readonly: b.getAttribute('aria-readonly'), desc: b.getAttribute('aria-description'), fixed: b.hasAttribute('data-fixed'), tab: b.tabIndex, status: td.getAttribute('data-status'), settle: td.getAttribute('data-settle'), stamp: !!b.querySelector('.alt-matrix-stamp'), box: !!b.querySelector('.alt-check-track') }; }, name);
const said = () => page.evaluate(() => document.querySelector('.alt-matrix > .alt-sr').textContent);
const focused = () => page.evaluate(() => document.activeElement.getAttribute('aria-label'));

expect(await page.evaluate(() => document.querySelector('[role="grid"]').getAttribute('aria-label')) === 'Role permissions', 'a named grid');
const tabs = await page.evaluate(() => [...document.querySelectorAll('[role="checkbox"]')].filter((b) => b.tabIndex === 0).length);
expect(tabs === 1, 'one tab stop');
let c = await cell('Manage billing, Admin');
expect(c.box && !c.fixed && c.checked === 'true' && c.readonly === null, 'an editable grant is a checkbox');
c = await cell('Manage billing, Owner');
expect(c.stamp && c.readonly === 'true' && c.checked === 'true' && c.desc === 'Always granted to Owner', `a locked role's grant is stamped and says why (${c.desc})`);
c = await cell('View invoices, Viewer');
expect(c.stamp && c.checked === 'false' && c.desc === 'Not granted, inherited from Guest policy', `an inherited denial is a stamped dash (${c.desc})`);

await page.focus('[aria-label="View invoices, Owner"]');
await page.keyboard.press('ArrowRight');
expect(await focused() === 'View invoices, Admin', 'arrows move between cells');
await page.keyboard.press('End');
expect(await focused() === 'View invoices, Viewer', 'End goes to the row\'s last cell');
await page.keyboard.press('Space');
await page.waitForTimeout(100);
expect((await cell('View invoices, Viewer')).checked === 'false' && (await said()).includes("can't be changed here"), 'Space on a stamped cell changes nothing and says why');
await page.keyboard.press('Control+Home');
expect(await focused() === 'View invoices, Owner', 'Ctrl+Home goes to the first cell');
const ring = await page.evaluate(() => { const b = document.activeElement; return [getComputedStyle(b).boxShadow, getComputedStyle(b).transform]; });
expect(ring[0].includes('0px 0px 0px 2px') && ring[1] === 'none', `the active cell is a ring, not a lift (${ring[0]})`);

await page.focus('[aria-label="Remove members, Member"]');
await page.keyboard.press('Space');
await page.waitForTimeout(450);
c = await cell('Remove members, Member');
expect(c.checked === 'true' && c.status === 'pending', 'Space toggles an editable cell, which hovers while it saves');
await page.waitForTimeout(500);
c = await cell('Remove members, Member');
expect(c.status === null && (c.settle === 'a' || c.settle === 'b') && (await said()) === 'Remove members granted to Member.', `then it settles and is announced (${await said()})`);

// #495: at rest an editable cell reads as part of the record: a granted one is its accent-ink check on the ground with no
// trench, an ungranted one shows nothing. The checkbox build comes up across the row under the pointer and on the focused cell.
const look = (name) => page.evaluate((n) => { const b = document.querySelector(`[aria-label="${n}"]`), t = b.querySelector('.alt-check-track'), m = b.querySelector('.alt-check-mark'), f = b.querySelector('.alt-check-fill');
  const cs = getComputedStyle(t); return { trench: cs.boxShadow !== 'none' || cs.backgroundColor !== 'rgba(0, 0, 0, 0)', fill: +getComputedStyle(f).opacity, mark: getComputedStyle(m).color }; }, name);
const accentInk = await page.evaluate(() => { const p = document.createElement('span'); p.style.color = 'var(--accent-ink)'; document.querySelector('.alt-matrix').append(p); const c = getComputedStyle(p).color; p.remove(); return c; });
await page.evaluate(() => document.activeElement?.blur());
await page.mouse.move(5, 5); await page.waitForTimeout(300);
let rest = await look('Invite members, Admin'), empty = await look('Invite members, Viewer');
expect(!rest.trench && rest.fill === 0 && rest.mark === accentInk, `at rest a granted editable cell is an accent-ink check on the ground, no trench (${JSON.stringify(rest)})`);
expect(!empty.trench, `at rest an ungranted editable cell shows no box (${JSON.stringify(empty)})`);
const row = await page.locator('[aria-label="Invite members, Viewer"]').boundingBox();
await page.mouse.move(row.x + row.width / 2, row.y + row.height / 2); await page.waitForTimeout(300);
const hovered = await look('Invite members, Viewer'), sameRow = await look('Invite members, Admin'), otherRow = await look('Remove members, Viewer');
expect(hovered.trench && sameRow.trench && sameRow.fill === 1 && !otherRow.trench, 'pointing at a row brings up its cells\' checkboxes, and only that row\'s');
await page.mouse.move(5, 5);
await page.focus('[aria-label="Create projects, Viewer"]'); await page.waitForTimeout(300);
expect((await look('Create projects, Viewer')).trench, 'the focused cell shows its checkbox');

console.log(`PermissionMatrix: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
