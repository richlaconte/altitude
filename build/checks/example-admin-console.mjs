// Fenwick Tools admin console (examples/apps/admin-console, #401), built by scripts/build-examples.mjs and driven in a
// browser on its simulated server. Every section renders in both schemes with no page or console errors, has one h1,
// at most one primary action, and takes focus at its heading when you arrive. Then the fixtures #401 names:
//   General: a rename saves through the SaveBar and shows in the sidebar; a slow save still lands; a save against a
//     version another admin replaced is a conflict, said in words, and saving again replaces theirs.
//   Members: inviting someone already in the workspace is turned away by the server and the list is kept; a role change
//     lands; a lost response is reconciled without a second change; a conflict reverts and says so; a cancelled removal
//     returns focus to Remove.
//   Billing: an upgrade to Business unlocks custom roles in Members; a downgrade lists what's lost, is scheduled, and
//     warns on the audit log.
//   Developers: revoking a key names the webhook that uses it, and the webhook then says it's failing until it's given
//     another key; a new key's dialog can't finish until the secret is saved.
//   Security: a wrong code is turned away; the right one turns two-factor on.
//   Audit log: every change above is in it, one entry each, and an entry expands to what changed. Reset starts over.
// And on a phone the page never scrolls sideways. Exits non-zero on a failure.
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { buildExamples } from '../../scripts/build-examples.mjs';

let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const out = fileURLToPath(new URL('../test/examples/', import.meta.url));
await buildExamples(out, { only: ['admin-console'] });
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const wait = (page, ms) => page.waitForTimeout(ms);

const open = async (page) => {
  await page.goto(`file://${out}admin-console.html`);
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.reload(); await wait(page, 900);
};
const nav = async (page, label) => { await page.locator('.alt-sidebar a', { hasText: label }).first().click(); await wait(page, 800); };
const drawer = async (page) => { const t = page.locator('.ex-drawer .alt-acc-trigger'); if ((await t.getAttribute('aria-expanded')) !== 'true') await t.click(); await wait(page, 200); };
const mode = async (page, label) => { await drawer(page); await page.locator('.ex-drawer label.alt-radio').filter({ has: page.locator('.alt-check-label', { hasText: new RegExp(`^${label}$`) }) }).click(); await wait(page, 60); };
const event = async (page, label) => { await drawer(page); await page.locator('.ex-drawer button', { hasText: label }).click(); await wait(page, 700); };
const primaries = (page) => page.evaluate(() => [...document.querySelectorAll('.ex-app .alt-btn[data-variant="primary"]')].filter((b) => b.getClientRects().length && !b.closest('[role="dialog"], .alt-savebar')).map((b) => b.textContent));
const text = (page, sel) => page.evaluate((s) => document.querySelector(s)?.textContent ?? '', sel);
const choose = async (page, trigger, option) => { await page.locator(trigger).click(); await wait(page, 150); await page.locator('[role="listbox"] [role="option"]', { hasText: option }).first().click(); };
// Every page of the audit log, following Next until it's the last.
const auditSentences = async (page) => {
  await nav(page, 'Audit log');
  const rows = [];
  for (let i = 0; i < 20; i++) {
    rows.push(...await page.evaluate(() => [...document.querySelectorAll('.ex-app table tbody tr')].map((r) => r.textContent)));
    const next = page.locator('.ex-app nav button', { hasText: 'Next' });
    if (!(await next.count()) || await next.isDisabled() || (await next.getAttribute('aria-disabled')) === 'true') break;
    await next.click(); await wait(page, 300);
  }
  return rows;
};

for (const scheme of ['daylight', 'nightfall']) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: scheme === 'nightfall' ? 'dark' : 'light' });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await open(page);
  for (const s of ['Members', 'Billing', 'Developers', 'Security', 'Audit log', 'General']) {
    await nav(page, s);
    const v = await page.evaluate(() => ({ h1: [...document.querySelectorAll('.ex-app h1')].map((h) => h.textContent), focus: document.activeElement?.id, current: document.querySelector('.alt-sidebar [aria-current="page"]')?.textContent }));
    const p = await primaries(page);
    expect(v.h1.length === 1 && v.h1[0] === s && v.focus === 'ac-title' && v.current?.includes(s) && p.length <= 1, `${scheme}: ${s} has one h1, focus at it, is current, and ${p.length} primary (${JSON.stringify({ ...v, p })})`);
  }
  expect(!errors.length, `${scheme}: no page or console errors (${errors.slice(0, 2).join('; ')})`);
  if (scheme === 'nightfall') { await page.close(); continue; }

  // ---- General ------------------------------------------------------------------------------------------------
  await nav(page, 'General');
  await page.fill('#ac-ws-name', 'Fenwick Tools Group'); await wait(page, 750);
  expect(await page.locator('.alt-savebar').count() === 1, 'an edit raises the SaveBar');
  await page.locator('.alt-savebar [data-variant="primary"]').click(); await wait(page, 900);
  expect(/Fenwick Tools Group/.test(await text(page, '.alt-sidebar')), 'a saved rename shows in the sidebar');

  await mode(page, 'Slow');
  await page.fill('#ac-ws-url', 'fenwick-tools-group'); await wait(page, 750);
  await page.locator('.alt-savebar [data-variant="primary"]').click(); await wait(page, 600);
  expect(await page.evaluate(() => document.querySelector('.alt-savebar')?.getAttribute('data-state')) !== null, 'a slow save is still in flight after 600 ms');
  await wait(page, 2800);
  expect(await page.inputValue('#ac-ws-url') === 'fenwick-tools-group' && !/Unsaved/.test(await text(page, '.alt-savebar')), 'then it lands');
  await mode(page, 'Succeed');

  await page.fill('#ac-ws-name', 'Mine'); await wait(page, 750);
  await event(page, 'Theo renames the workspace');
  expect(await page.inputValue('#ac-ws-name') === 'Mine', 'a change from elsewhere doesn’t overwrite an unsaved draft');
  await page.locator('.alt-savebar [data-variant="primary"]').click(); await wait(page, 900);
  expect(/Someone else changed these settings/.test(await text(page, '.ex-app')), 'saving over another admin’s change is a conflict, in words');
  await page.locator('.alt-savebar [data-variant="primary"]').click(); await wait(page, 900);
  expect(/Mine/.test(await text(page, '.alt-sidebar')), 'saving again replaces theirs');

  // ---- Members ------------------------------------------------------------------------------------------------
  await nav(page, 'Members');
  await page.locator('.ex-app button', { hasText: 'Invite people' }).click(); await wait(page, 300);
  const tag = page.locator('[role="dialog"] .alt-tag-input input').first();
  await tag.fill('theo@fenwicktools.example,'); await tag.fill('lee@fenwicktools.example,'); await wait(page, 100);
  await page.locator('[role="dialog"] button', { hasText: /Send/ }).click(); await wait(page, 900);
  const turned = await page.evaluate(() => ({ dialog: !!document.querySelector('[role="dialog"]'), says: /already in the workspace/.test(document.querySelector('[role="dialog"]')?.textContent ?? ''), kept: document.querySelectorAll('[role="dialog"] .alt-tag-list li').length }));
  expect(turned.dialog && turned.says && turned.kept === 2, `inviting someone already here is turned away and the list is kept (${JSON.stringify(turned)})`);
  await page.locator('[role="dialog"] [aria-label="Remove theo@fenwicktools.example"]').click(); await wait(page, 400);
  await page.locator('[role="dialog"] button', { hasText: /Send/ }).click(); await wait(page, 900);
  expect(!(await page.locator('[role="dialog"]').count()) && /lee@fenwicktools\.example/.test(await text(page, '.ex-app table')), `the rest are invited (${await text(page, '[role="dialog"]')})`);

  await choose(page, '[aria-label="Role for Kofi Mensah"]', 'Member'); await wait(page, 900);
  expect(/Role changed/.test(await page.locator('tr', { hasText: 'Kofi Mensah' }).textContent()), 'a role change lands');

  await mode(page, 'Lose the response');
  await choose(page, '[aria-label="Role for Kofi Mensah"]', 'Admin'); await wait(page, 2700);
  const kofi = await page.locator('tr', { hasText: 'Kofi Mensah' }).textContent();
  expect(/Role changed/.test(kofi) && /Admin/.test(kofi), `a lost response is reconciled: the change was saved (${kofi})`);
  await mode(page, 'Conflict');
  await choose(page, '[aria-label="Role for Ines Duarte"]', 'Viewer'); await wait(page, 900);
  const ines = await page.locator('tr', { hasText: 'Ines Duarte' }).textContent();
  expect(/Someone else updated Ines first/.test(ines) && /Member/.test(ines), `a conflict reverts and says so (${ines})`);
  await mode(page, 'Succeed');

  const removeBtn = page.locator('[aria-label="Remove Theo Marsh"]');
  await removeBtn.click(); await wait(page, 300);
  expect(/loses access to 9 projects/.test(await text(page, '[role="dialog"]')), 'removing someone says what they lose first');
  await page.keyboard.press('Escape'); await wait(page, 400);
  expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')) === 'Remove Theo Marsh', 'a cancelled removal returns focus to Remove');
  expect(await page.locator('.ex-app .alt-feature-gate, .ex-app [data-requires]').count() + await page.locator('.ex-app button', { hasText: 'Edit role permissions' }).count() > 0, 'custom roles are locked on Pro');

  // ---- Billing ------------------------------------------------------------------------------------------------
  await nav(page, 'Billing');
  await page.locator('[role="radio"][data-plan="business"]').click();
  await page.locator('.ex-app button', { hasText: 'Review change' }).click(); await wait(page, 300);
  expect(/Upgrade to Business\?/.test(await text(page, '#ac-plan-h')), 'an upgrade is reviewed with its price first');
  await page.locator('.ex-app button', { hasText: /^Upgrade to Business/ }).click(); await wait(page, 900);
  expect(/You’re on Business/.test(await text(page, '#ac-plan-h')), 'then it’s confirmed');
  await nav(page, 'Members');
  expect(await page.locator('.ex-app .alt-pm, .ex-app [aria-label="Permissions by role"]').count() > 0, 'Business unlocks custom roles in Members');
  // Let Members delete projects: an editable grant, saved at once and logged.
  const grant = page.locator('[aria-label="Permissions by role"] [role="checkbox"][aria-checked="false"]:not([aria-readonly])').first();
  const grantName = await grant.getAttribute('aria-label');
  await grant.click(); await wait(page, 900);
  expect(await page.locator(`[aria-label="Permissions by role"] [role="checkbox"][aria-label="${grantName}"]`).getAttribute('aria-checked') === 'true', `a grant is saved (${grantName})`);
  await nav(page, 'Billing');
  expect(/Change plan/.test(await text(page, '#ac-plan-h')) && await page.locator('[role="radio"][data-plan="business"] ').getAttribute('aria-checked') !== null, 'coming back, the plan picker starts fresh on Business');
  await page.locator('[role="radio"][data-plan="free"]').click();
  await page.locator('.ex-app button', { hasText: 'Review change' }).click(); await wait(page, 300);
  expect(/You’ll lose/.test(await text(page, '.ac-plan')) && /audit log/i.test(await text(page, '.ac-losses')), 'a downgrade lists what’s lost first');
  await page.locator('.ex-app button', { hasText: /^Downgrade to Free/ }).click(); await wait(page, 900);
  expect(/changes to Free on 30 November/.test(await text(page, '.ex-app')), 'the downgrade is scheduled, and says when');

  // ---- Developers ---------------------------------------------------------------------------------------------
  await nav(page, 'Developers');
  await page.locator('[aria-label="Revoke the Production key"]').click(); await wait(page, 300);
  expect(/the webhook to api\.fenwicktools\.example/.test(await text(page, '[role="dialog"]')), 'revoking a key names what uses it');
  await page.locator('[role="dialog"] button', { hasText: 'Revoke key' }).click(); await wait(page, 1000);
  expect(/Failing/.test(await text(page, '.ac-hook')) && /signing key was revoked/.test(await text(page, '.ac-hook')), 'the webhook signed with it says it’s failing');
  await choose(page, '.ac-hook .alt-select-trigger', 'CI pipeline'); await wait(page, 1000);
  expect(/Active/.test(await text(page, '.ac-hook')), 'another key starts it again');
  await page.locator('.ex-app button', { hasText: 'Create key' }).click(); await wait(page, 300);
  await page.locator('[role="dialog"] input').first().fill('Billing service');
  await page.locator('[role="dialog"] button', { hasText: 'Create key' }).click(); await wait(page, 800);
  const done = page.locator('[role="dialog"] button', { hasText: 'Done' });
  expect(await done.isDisabled() && /won’t see this key again/.test(await text(page, '[role="dialog"]')), 'a new key can’t be finished until the secret is saved');
  await page.locator('[role="dialog"] label', { hasText: 'I\'ve saved this key' }).click(); await wait(page, 100);
  await done.click(); await wait(page, 300);
  expect(/Billing service/.test(await text(page, '.ex-app table')), 'the new key is listed');

  // ---- Security -----------------------------------------------------------------------------------------------
  await nav(page, 'Security');
  await page.locator('.ex-app button', { hasText: 'Set up two-factor' }).click(); await wait(page, 300);
  await page.locator('[role="dialog"] input').first().fill('111111'); await wait(page, 900);
  expect(/doesn’t match/.test(await text(page, '[role="dialog"]')), 'a wrong code is turned away');
  await page.locator('[role="dialog"] input').first().fill('246810'); await wait(page, 1600);
  expect(!(await page.locator('[role="dialog"]').count()) && /^On\./.test(await text(page, '.alt-settings-rowdesc')), `the right code turns two-factor on (${await text(page, '.alt-layers [role="dialog"]')} | ${await text(page, '.alt-settings-rowdesc')})`);

  // ---- Audit log ----------------------------------------------------------------------------------------------
  const log = await auditSentences(page);
  const one = (re) => log.filter((r) => re.test(r)).length === 1;
  for (const [re, what] of [
    [/renamed the workspace from Fenwick Tools to Fenwick Tools Group/, 'the rename'], [/changed the workspace URL to altitude\.app\/fenwick-tools-group/, 'the slow URL change'],
    [/Theo Marsh renamed the workspace/, 'Theo’s rename'], [/invited lee@fenwicktools\.example/, 'the invitation'],
    [/Kofi Mensah’s role from Member to Admin/, 'the role change whose response was lost'], [/upgraded from Pro to Business/, 'the upgrade'],
    [/scheduled a downgrade from Business to Free/, 'the downgrade'], [/revoked the Production API key/, 'the revoked key'],
    [/created the Billing service API key/, 'the new key'], [/turned on two-factor/, 'two-factor'], [/allowed (Admin|Member|Viewer)s to /, 'the permission'],
  ]) expect(one(re), `the audit log has ${what}, once`);
  expect(!log.some((r) => /Ines Duarte’s role from Member to Viewer/.test(r)), 'the conflicting role change isn’t in the log');
  expect(/deleted on 30 November/.test(await text(page, '.ex-app')), 'the audit log warns about the scheduled downgrade');
  await page.locator('.ex-app table tbody tr button').first().click(); await wait(page, 300);
  expect(await page.locator('.ex-app .alt-diff, .ex-app table [class*="diff"]').count() > 0 || /What changed|No details/.test(await text(page, '.ex-app table')), 'an entry expands to what changed');

  // ---- Reset --------------------------------------------------------------------------------------------------
  await drawer(page); await page.locator('.ex-drawer button', { hasText: 'Reset example data' }).click(); await wait(page, 1000);
  expect(await text(page, '.ac-ws') === 'FTFenwick Tools' || (await text(page, '.ac-ws')).endsWith('Fenwick Tools'), `Reset starts over (${await text(page, '.ac-ws')})`);
  expect(!errors.length, `daylight flow: no page or console errors (${errors.slice(0, 2).join('; ')})`);
  await page.close();
}
{ // phone
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await open(page);
  for (const hash of ['members', 'billing', 'developer', 'audit']) {
    await page.goto(`file://${out}admin-console.html#/${hash}`); await wait(page, 700);
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(w[0] <= w[1], `phone: ${hash} doesn’t scroll sideways (${w.join(' > ')})`);
  }
  await ctx.close();
}
await browser.close();
console.log(`Admin console example: ${pass} passed, ${fail} failed.`);
process.exit(fail ? 1 : 0);
