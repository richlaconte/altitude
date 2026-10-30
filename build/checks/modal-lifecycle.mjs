import { chromium } from 'playwright-core';
import { fixturePath, fixtureRoot } from './fixture-path.mjs';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
let pass = 0, fail = 0;
const expect = (ok, label) => { if (ok) pass++; else { fail++; console.error('FAIL', label); } };
const pause = (page, ms = 280) => page.waitForTimeout(ms);
const act = (page, method, value) => page.evaluate(([method, value]) => window.altitudeModalFixture[method](value), [method, value]);
const inside = page => page.evaluate(() => !!document.activeElement.closest('[aria-modal="true"]'));
async function scene(label, run, options = {}) {
  if (process.env.ALT_MODAL_CASE && !label.includes(process.env.ALT_MODAL_CASE)) return;
  const page = await browser.newPage({ viewport: { width: 960, height: 760 }, ...options });
  page.on('pageerror', error => { fail++; console.error('FAIL', label, error.message); });
  page.on('console', message => { if (['error', 'warning'].includes(message.type()) && !message.text().includes('only one Dialog or CommandPalette')) { fail++; console.error('FAIL', label, message.text()); } });
  try {
    await page.goto('file://' + fixturePath('Dialog', options.scheme || 'daylight'));
    await page.waitForFunction(() => !!window.altitudeModalFixture);
    if (fixtureRoot.includes('react19')) expect(await page.evaluate(() => React.version.startsWith('19.')), label + ' React 19 runtime');
    await run(page);
  } catch (error) { fail++; console.error('FAIL', label, error.message); }
  await page.close();
}
await scene('MOD-01 legacy visual helper', async page => {
  await act(page, 'legacyVote'); expect(await page.locator('[data-receded]').count() === 1, 'MOD-01 legacy pushLayer vote remains compatible');
  await act(page, 'openFirst'); await pause(page);
  expect(await page.locator('[data-receded]').count() === 0, 'MOD-02 stationary suppresses legacy recession votes');
  await act(page, 'legacyRelease'); await act(page, 'legacyRelease'); await act(page, 'close'); await pause(page);
  expect(await page.locator('[data-receded]').count() === 0, 'MOD-06 legacy release is idempotent');
});
await scene('MOD-03 title navigation', async page => {
  await act(page, 'setMode', 'title'); await pause(page);
  expect(await page.evaluate(() => document.activeElement.matches('.alt-dialog-title')), 'MOD-03 initial title focus');
  await page.keyboard.press('Shift+Tab'); expect(await inside(page), 'MOD-03 title Shift+Tab stays contained');
  expect(await page.evaluate(() => document.activeElement.matches('.alt-dialog-close')), 'MOD-03 Shift+Tab reaches last eligible control');
  await page.keyboard.press('Tab'); expect(await page.evaluate(() => document.activeElement.hasAttribute('data-first')), 'MOD-03 wrap reaches first eligible control');
  await page.evaluate(() => document.querySelector('.alt-dialog-title').focus());
  await page.keyboard.press('Tab'); expect(await page.evaluate(() => document.activeElement.hasAttribute('data-first')), 'MOD-03 title Tab reaches first control');
  await page.locator('[data-first]').focus(); await act(page, 'setControls', false); await pause(page, 50);
  expect(await inside(page), 'MOD-03 removed focused control recovers within panel');
  await page.evaluate(() => document.querySelector('[data-background-control]').focus());
  expect(await inside(page), 'MOD-03 script focus cannot enter background');
  await page.evaluate(() => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true })));
  expect(await page.locator('[aria-modal="true"]').count() === 1, 'MOD-03 IME Escape does not close');
});
await scene('MOD-03 zero controls', async page => {
  await act(page, 'setMode', 'panel'); await pause(page);
  for (const key of ['Tab', 'Shift+Tab', 'Escape']) await page.keyboard.press(key);
  expect(await page.evaluate(() => document.activeElement.matches('.alt-dialog')), 'MOD-03 panel-only and initialFocus=false contain focus, nondismissible Escape');
});
await scene('MOD-03 field', async page => {
  await act(page, 'setMode', 'field'); await pause(page);
  expect(await page.getByLabel('Fixture field').evaluate(el => document.activeElement === el), 'MOD-03 first field gets initial focus');
});
await scene('MOD-04 restore and retained exit', async page => {
  const trigger = page.locator('[data-file="file-brand"]'); await trigger.click(); await pause(page);
  expect(await page.locator('[data-cancel]').evaluate(el => document.activeElement === el), 'MOD-03/CON-01 Cancel initially focused');
  await page.locator('[data-cancel]').click(); await pause(page, 30);
  expect(await page.evaluate(() => document.body.style.overflow === 'hidden' && !!document.querySelector('.alt-stage[inert]')), 'MOD-06 close retains leases during exit');
  await pause(page);
  expect(await trigger.evaluate(el => document.activeElement === el), 'MOD-04 cancellation restores invoker');
  expect(await page.evaluate(() => !document.body.style.overflow && !document.querySelector('.alt-stage[inert]')), 'MOD-06 final release restores availability');
});
await scene('MOD-04 deleted invoker', async page => {
  await page.locator('[data-file="file-brand"]').click(); await pause(page);
  await page.locator('[data-confirm]').click(); await pause(page, 800);
  expect(await page.locator('[data-file="file-brand"]').count() === 0, 'CON-03 success deletes captured target only');
  expect(await page.evaluate(() => document.activeElement.textContent === 'Archived files'), 'MOD-04 removed invoker uses lazy heading fallback');
  expect(await page.locator('[data-file]').count() === 2, 'CON-03 other records survive');
});
await scene('MOD-04 app focus', async page => {
  await page.locator('[data-file="file-brand"]').click(); await pause(page);
  // The app explicitly moves focus outside the retiring root after release, in the same callback turn.
  await act(page, 'close'); await pause(page);
  await page.locator('[data-file="file-brand-draft"]').focus(); await pause(page);
  expect(await page.locator('[data-file="file-brand-draft"]').evaluate(el => document.activeElement === el), 'MOD-04 completed close cannot later steal app focus');
});
await scene('MOD-05 nested provider isolation', async page => {
  await page.evaluate(() => { const node = document.createElement('div'); node.id = 'pre-inert'; node.setAttribute('inert', 'application'); document.body.append(node); });
  await act(page, 'setNested', true); await pause(page);
  expect(await page.evaluate(() => { const panel = document.querySelector('[aria-modal="true"]'); return panel && !panel.closest('[inert]') && !panel.closest('[data-receded]'); }), 'MOD-05 nested active portal ancestors never inert or transformed');
  expect(await page.locator('[data-receded]').count() === 0, 'MOD-01 nested recede=false prevents stage transforms');
  expect(await page.locator('.alt-dialog-root > .alt-scrim').evaluate(el => getComputedStyle(el).backdropFilter !== 'none'), 'MOD-01 recede=false retains default blur');
  await page.evaluate(() => { const button = document.createElement('button'); button.id = 'late-body'; button.textContent = 'Late background'; document.body.append(button); });
  await pause(page, 30);
  expect(await page.locator('#late-body').evaluate(el => el.inert), 'MOD-05 newly inserted body branch becomes inert');
  await page.locator('#late-body').evaluate(el => el.focus()); expect(await inside(page), 'MOD-05 inserted background cannot take focus');
  await page.keyboard.press('Escape'); await pause(page);
  expect(await page.locator('#pre-inert').getAttribute('inert') === 'application', 'MOD-05 original inert value preserved');
  expect(await page.locator('#late-body').evaluate(el => !el.inert), 'MOD-05 owned inert cleared');
});
await scene('MOD-05 toast isolation and paused expiry', async page => {
  await act(page, 'notify'); await pause(page, 650); await act(page, 'setMode', 'title'); await pause(page, 1400);
  expect(await page.locator('.alt-toast').count() === 1, 'MOD-05 toast expiry paused through modal');
  expect(await page.locator('.alt-toaster').evaluate(el => !!el.closest('[inert]')), 'MOD-05 toast subtree inert above scrim');
  expect(await page.locator('[data-modal-announcements]').textContent() === 'Background update ', 'MOD-05 toast text routed into active modal');
  expect(await page.locator('.alt-toaster').getAttribute('aria-live') === 'off', 'MOD-05 external live announcement suppressed');
  await page.locator('.alt-toast-action').evaluate(el => el.focus()); expect(await inside(page), 'MOD-05 toast action cannot steal focus');
  await page.keyboard.press('Escape'); await pause(page, 1000);
  expect(await page.locator('.alt-toast').count() === 0, 'MOD-05 toast expiry resumes remaining lifetime without resetting');
});
await scene('MOD-06 reopen and overflow restoration', async page => {
  await page.evaluate(() => document.body.style.setProperty('overflow', 'clip', 'important'));
  await act(page, 'openFirst'); await pause(page); await act(page, 'close'); await pause(page, 40); await act(page, 'openFirst'); await pause(page, 300);
  expect(await inside(page) && await page.evaluate(() => document.body.style.overflow === 'hidden'), 'MOD-06 reopen cancels exit release');
  await act(page, 'setPresent', false); await pause(page, 50);
  expect(await page.evaluate(() => document.body.style.overflow === 'clip' && document.body.style.getPropertyPriority('overflow') === 'important'), 'MOD-06 unmount restores overflow value and priority');
  expect(await page.locator('[inert]').count() === 0, 'MOD-06 unmount releases owned inert');
});
await scene('MOD-06 independent style change', async page => {
  await act(page, 'openFirst'); await pause(page);
  await page.evaluate(() => document.body.style.setProperty('overflow', 'scroll', 'important'));
  await act(page, 'close'); await pause(page);
  expect(await page.evaluate(() => document.body.style.overflow === 'scroll'), 'MOD-06 independently changed overflow is not overwritten');
});
await scene('MOD-06 Sheet Dialog resume', async page => {
  await act(page, 'setSheet', true); await pause(page); await page.locator('[data-sheet-dialog]').click(); await pause(page);
  expect(await page.locator('[aria-modal="true"]').count() === 1 && await page.locator('.alt-sheet-root').evaluate(el => el.inert), 'MOD-06 Sheet suspended beneath Dialog');
  expect(await page.locator('.alt-sheet-root').getAttribute('data-modal-stationary') === '', 'MOD-02 stationary Dialog controls lower scrim policy');
  await page.keyboard.press('Escape'); await pause(page);
  expect(await page.locator('[data-sheet-dialog]').evaluate(el => document.activeElement === el), 'MOD-06 Sheet resumes at dialog invoker');
  expect(await page.locator('.alt-sheet').getAttribute('aria-modal') === 'true', 'MOD-06 Sheet resumes modal ownership');
  expect(await page.locator('.alt-sheet-root > .alt-scrim').evaluate(el => getComputedStyle(el).backdropFilter !== 'none'), 'MOD-02 resumed Sheet restores default blur');
  await page.keyboard.press('Escape'); await pause(page);
  expect(await page.locator('[inert]').count() === 0 && await page.evaluate(() => !document.body.style.overflow), 'MOD-06 stacked releases cleanly');
});
await scene('MOD-07 palette handoff', async page => {
  await act(page, 'setPalette', true); await pause(page); await page.keyboard.press('Enter'); await pause(page, 50);
  expect(await page.locator('[aria-modal="true"]').count() === 1 && await page.locator('.alt-dialog').count() === 1, 'MOD-07 palette callback opens Dialog immediately');
  expect(await page.locator('.alt-cmd-root').evaluate(el => el.hidden) && await page.evaluate(() => document.body.style.overflow === 'hidden'), 'MOD-07 palette root retires without unlocking');
  await page.keyboard.press('Control+k'); await pause(page);
  expect(await page.locator('.alt-dialog[aria-modal="true"]').count() === 1, 'MOD-07 shortcut cannot steal occupied summit');
});
await scene('MOD-07 owner-document palette shortcut', async page => {
  await page.locator('summary').click(); await act(page, 'setFrame', true);
  await page.waitForFunction(() => !!window.altitudeModalFrameFixture);
  const frame = page.frames().find(frame => frame.parentFrame());
  await frame.locator('[data-frame-trigger]').focus(); await frame.locator('[data-frame-trigger]').press('Control+k'); await pause(page);
  expect(await frame.locator('.alt-cmd[aria-modal="true"]').count() === 1, 'MOD-07 palette shortcut listens in its owner document');
  expect(await page.locator('.alt-cmd').count() === 0 && await page.evaluate(() => !document.body.style.overflow), 'MOD-07 child-document shortcut cannot open parent palette or lock parent');
  await page.evaluate(() => window.altitudeModalFrameFixture.setSheet(true)); await pause(page);
  expect(await frame.locator('.alt-cmd[aria-modal="true"]').count() === 1 && await frame.evaluate(() => !!document.activeElement.closest('.alt-cmd')), 'MOD-07 child-document Sheet cannot displace its own summit');
  await page.locator('[data-background-control]').focus(); await page.locator('[data-background-control]').press('Control+k'); await pause(page);
  expect(await page.locator('.alt-cmd[aria-modal="true"]').count() === 1 && await frame.locator('.alt-cmd[aria-modal="true"]').count() === 1, 'MOD-07 independent owner documents have independent summits');
  await page.keyboard.press('Escape'); await pause(page);
  expect(await page.evaluate(() => !document.body.style.overflow) && await frame.evaluate(() => document.body.style.overflow === 'hidden'), 'MOD-06 releasing parent owner preserves child document lock');
});
await scene('MOD-07 rapid palette handback', async page => {
  await act(page, 'setPalette', true); await pause(page); await page.keyboard.press('Enter'); await pause(page, 30);
  await page.evaluate(() => { window.altitudeModalFixture.setMode(''); window.altitudeModalFixture.setPalette(true); });
  await pause(page, 400);
  expect(await page.locator('.alt-cmd[aria-modal="true"]').count() === 1 && await page.locator('.alt-cmd-root').evaluate(el => !el.hidden), 'MOD-07 retired palette can reopen during retained exit');
  expect(await inside(page) && await page.evaluate(() => document.body.style.overflow === 'hidden'), 'MOD-06 rapid handback retains focus/isolation/scroll ownership');
});
await scene('MOD-07 rapid Dialog handback', async page => {
  await act(page, 'setMode', 'title'); await pause(page);
  await page.evaluate(() => { window.altitudeModalFixture.setMode(''); window.altitudeModalFixture.setCompeting(true); }); await pause(page, 30);
  await page.evaluate(() => { window.altitudeModalFixture.setCompeting(false); window.altitudeModalFixture.setMode('title'); }); await pause(page, 400);
  expect(await page.locator('.alt-dialog[aria-modal="true"]').count() === 1 && await page.locator('.alt-dialog-root').evaluate(el => !el.hidden), 'MOD-07 retired Dialog can reopen during retained exit');
});
await scene('MOD-07 competing requests', async page => {
  let warned = 0; page.on('console', message => { if (message.text().includes('only one Dialog or CommandPalette')) warned++; });
  await act(page, 'setMode', 'title'); await pause(page); await act(page, 'setCompeting', true); await pause(page);
  expect(await page.locator('[aria-modal="true"]').count() === 1 && await page.locator('.alt-dialog-title').textContent() === 'Modal focus fixture', 'MOD-07 first controlled summit retains ownership');
  if (fixtureRoot.includes('strict')) expect(warned > 0, 'MOD-07 development collision warning');
  else expect(warned === 0, 'MOD-07 production omits development collision warning');
  await act(page, 'setMode', ''); await pause(page);
  expect(await page.locator('.alt-dialog').count() === 0, 'MOD-07 rejected request never queues');
  await act(page, 'setCompeting', false); await pause(page, 30); await act(page, 'setCompeting', true); await pause(page);
  expect(await page.locator('.alt-dialog-title').textContent() === 'Competing summit', 'MOD-07 reset permits a fresh request');
});
await scene('MOD-07 Sheet requested under summit', async page => {
  await act(page, 'setMode', 'title'); await pause(page); await act(page, 'setSheet', true); await pause(page);
  expect(await page.locator('.alt-dialog[aria-modal="true"]').count() === 1 && await page.evaluate(() => !!document.activeElement.closest('.alt-dialog')), 'MOD-07 late Sheet cannot displace summit focus');
});
await scene('MOD-08 nonmodal Sheet', async page => {
  await act(page, 'setNonmodal', true); await pause(page);
  expect(await page.locator('[aria-modal="true"]').count() === 0 && await page.locator('[inert]').count() === 0 && await page.evaluate(() => !document.body.style.overflow), 'MOD-08 nonmodal has no lock or modal semantics');
  expect(await page.locator('.alt-sheet-root .alt-scrim').count() === 0 && await page.locator('[data-receded]').count() === 0, 'MOD-08 nonmodal has no scrim or recession');
  await page.locator('[data-nonmodal-close]').click(); await pause(page); expect(await page.locator('.alt-sheet').count() === 0, 'MOD-08 closes from inside');
  await act(page, 'setNonmodal', true); await pause(page); await act(page, 'setMode', 'title'); await pause(page); await act(page, 'setNonmodal', false); await pause(page);
  expect(await page.evaluate(() => !!document.activeElement.closest('.alt-dialog')), 'MOD-08 nonmodal close cannot steal later modal focus');
});
await scene('CON-02 cancellation and known failure retry', async page => {
  await page.locator('[data-file="file-brand"]').click(); await pause(page); await page.keyboard.press('Escape'); await pause(page);
  expect(await page.evaluate(() => window.altitudeModalFixture.snapshot().requests) === 0, 'CON-02 Cancel/Escape never dispatches');
  await act(page, 'setFixture', 'fail-once'); await page.locator('[data-file="file-brand"]').click(); await pause(page); await page.locator('[data-confirm]').click(); await act(page, 'confirm'); await pause(page, 1250);
  expect(await page.evaluate(() => window.altitudeModalFixture.snapshot().requests) === 1, 'CON-03 duplicate confirmation suppressed');
  expect(await page.locator('.alt-dialog .alt-alert').count() === 1 && await inside(page), 'CON-05 known failure stays in target dialog');
  expect(await page.locator('[data-file="file-brand"]').count() === 1, 'CON-05 known failure retains record');
  await page.locator('[data-confirm]').click(); await pause(page, 800);
  expect(await page.locator('[data-file="file-brand"]').count() === 0, 'CON-05 retry uses same captured target');
});
await scene('CON-04 pending close and removed invoker', async page => {
  await act(page, 'setFixture', 'success-1200'); await page.locator('[data-file="file-brand"]').click(); await pause(page); await page.locator('[data-confirm]').click();
  expect(await page.locator('[data-cancel]').textContent() === 'Close', 'CON-04 pending Cancel becomes Close');
  await page.locator('[data-cancel]').click(); await pause(page); await pause(page, 1800);
  expect(await page.locator('[data-file="file-brand"]').count() === 0 && await page.evaluate(() => document.activeElement.textContent === 'Archived files'), 'CON-04 pending close write completes with removed-invoker focus recovery');
});
await scene('CON-04 same target cannot reopen while pending', async page => {
  await act(page, 'setFixture', 'success-1200'); await page.locator('[data-file="file-brand"]').click(); await pause(page); await page.locator('[data-confirm]').click(); await page.locator('[data-cancel]').click(); await pause(page);
  await page.locator('[data-file="file-brand"]').click(); await pause(page, 100);
  expect(await page.locator('.alt-dialog').count() === 0, 'CON-04 pending target cannot open a fresh idle confirmation');
  expect(await page.evaluate(() => window.altitudeModalFixture.snapshot().requests) === 1, 'CON-04 pending-target reopen cannot dispatch another write');
});
await scene('CON-06 stale completion never closes newer session', async page => {
  await act(page, 'setFixture', 'success-1200'); await page.locator('[data-file="file-brand"]').click(); await pause(page); await page.locator('[data-confirm]').click(); await page.locator('[data-cancel]').click(); await pause(page);
  await page.locator('[data-file="file-brand-draft"]').click(); await pause(page, 1900);
  expect(await page.locator('.alt-dialog-desc').textContent() === '“Brand guidelines draft.pdf” will be removed. You won’t be able to restore it.', 'CON-06 A settling cannot replace target B');
  expect(await inside(page), 'CON-06 A settling cannot steal B focus or close it');
});
await scene('CON-06 stale failure and newer session', async page => {
  await act(page, 'setFixture', 'fail-once'); await page.locator('[data-file="file-brand"]').click(); await pause(page); await page.locator('[data-confirm]').click(); await page.locator('[data-cancel]').click(); await pause(page);
  await page.locator('[data-file="file-brand-draft"]').click(); await pause(page, 1900);
  expect(await page.locator('.alt-dialog .alt-alert').count() === 0 && (await page.locator('.alt-dialog-desc').textContent()).includes('Brand guidelines draft.pdf'), 'CON-06 A failure never appears inside B');
  expect((await page.locator('[data-outcome]').textContent()).includes('Brand guidelines.pdf'), 'CON-06 closed failure stays in originating context');
});
await scene('CON-04 presentation unmount', async page => {
  await act(page, 'setFixture', 'unmount'); await page.locator('[data-file="file-brand"]').click(); await pause(page); await page.locator('[data-confirm]').click(); await pause(page, 800);
  expect(await page.locator('.alt-dialog').count() === 0 && await page.locator('[data-file="file-brand"]').count() === 0, 'CON-04 presentation unmount does not cancel dispatched write');
  expect(await page.locator('[inert]').count() === 0 && await page.evaluate(() => document.activeElement.textContent === 'Archived files'), 'MOD-06/CON-04 unmount releases leases and recovers removed invoker');
});
await scene('MOD-06 provider unmount', async page => {
  await act(page, 'setNested', true); await pause(page); await act(page, 'setNestedPresent', false); await pause(page, 30);
  expect(await page.locator('[inert]').count() === 0 && await page.evaluate(() => !document.body.style.overflow), 'MOD-06 provider unmount releases document leases');
  await act(page, 'setMode', 'title'); await pause(page);
  expect(await inside(page), 'MOD-06 later modal remains usable after provider unmount');
});
await scene('CON-07 stale revision', async page => {
  await page.locator('[data-file="file-brand"]').click(); await pause(page); await act(page, 'changeTarget'); await page.locator('[data-confirm]').click(); await pause(page, 150);
  expect(await page.locator('[data-confirm]').isDisabled() && (await page.locator('.alt-dialog').textContent()).includes('This file changed'), 'CON-07 changed revision requires fresh confirmation');
  expect(await page.locator('[data-file="file-brand"]').count() === 1, 'CON-07 changed record is never deleted');
});
for (const fixture of ['interrupted-before-save', 'interrupted-after-save']) await scene('CON-08 ' + fixture, async page => {
  await act(page, 'setFixture', fixture); await page.locator('[data-file="file-brand"]').click(); await pause(page); await page.locator('[data-confirm]').click(); await pause(page, fixture === 'interrupted-after-save' ? 1250 : 150);
  expect(await page.locator('[data-confirm]').textContent() === 'Checking deletion…', 'CON-08 unknown outcome reconciles before retry');
  await pause(page, 750);
  expect((await page.locator('[data-file="file-brand"]').count() === 0) === (fixture === 'interrupted-after-save'), 'CON-08 reconciliation matches authoritative record');
});
for (const scheme of ['daylight', 'nightfall']) await scene('MOD-01/02 ' + scheme, async page => {
  await act(page, 'setBackground', 'recede'); await page.locator('[data-file="file-brand"]').click(); await pause(page, 450);
  expect(await page.locator('[data-receded]').count() === 1, 'MOD-01 default stage recession ' + scheme);
  expect(await page.locator('.alt-dialog-root > .alt-scrim').evaluate(el => getComputedStyle(el).backdropFilter !== 'none'), 'MOD-01 default scrim blur ' + scheme);
  await act(page, 'setBackground', 'stationary'); await pause(page, 450);
  expect(await page.locator('[data-receded]').count() === 0, 'MOD-02 stationary removes recession ' + scheme);
  expect(await page.locator('.alt-dialog-root > .alt-scrim').evaluate(el => getComputedStyle(el).backdropFilter === 'none'), 'MOD-02 stationary removes blur ' + scheme);
}, { scheme });
for (const mode of ['reduced', 'contrast', 'forced', 'narrow']) await scene('MOD-09 accessible presentation ' + mode, async page => {
  if (mode === 'reduced') await page.emulateMedia({ reducedMotion: 'reduce' });
  if (mode === 'forced') await page.emulateMedia({ forcedColors: 'active' });
  if (mode === 'contrast') await page.evaluate(() => document.querySelector('.alt-root').dataset.contrast = 'more');
  if (mode === 'narrow') await page.setViewportSize({ width: 320, height: 720 });
  await page.locator('[data-file="file-brand"]').click(); await pause(page);
  expect(await inside(page), 'MOD-09 focus under ' + mode);
  const box = await page.locator('.alt-dialog').boundingBox(); const width = page.viewportSize().width;
  expect(box.x >= 0 && box.x + box.width <= width + 1, 'MOD-09 panel fits ' + mode);
  await page.keyboard.press('Shift+Tab'); expect(await inside(page), 'MOD-09 keyboard contained under ' + mode);
});
for (const background of ['recede', 'stationary']) await scene('DEM-08 D2 tap-only ' + background, async page => {
  await act(page, 'setBackground', background);
  const trigger = page.locator('[data-file="file-brand"]');
  await trigger.tap(); await page.locator('[data-cancel]').tap(); await pause(page);
  expect((await act(page, 'snapshot')).requests === 0, 'DEM-08 touch Cancel performs no write ' + background);
  await trigger.tap(); await page.locator('[data-confirm]').tap(); await pause(page, 500);
  expect(await trigger.count() === 0 && await page.locator('[data-file]').count() === 2, 'DEM-08 touch confirm deletes only captured file ' + background);
  expect(await page.evaluate(() => document.activeElement.textContent === 'Archived files'), 'DEM-08 touch deletion uses surviving heading ' + background);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'DEM-08 touch D2 fits 320 CSS pixels ' + background);
}, { viewport: { width: 320, height: 800 }, isMobile: true, hasTouch: true });
await browser.close();
console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
