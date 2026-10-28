// Tree: the APG tree view keys, plus rename, create, carry (keyboard and pointer) and remove. ALT_FIXTURE_ROOT selects React 19 fixtures.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { fixturePath } from './fixture-path.mjs';

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const errors = [];
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); passed++; };
const open = async ({ scheme = 'daylight', width = 960 } = {}) => {
  const page = await browser.newPage({ viewport: { width, height: 700 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  await page.goto(`file://${fixturePath('Tree', scheme)}`);
  page.setDefaultTimeout(5000);
  await page.getByRole('tree', { name: 'Pages' }).waitFor();
  return page;
};
const item = (page, name) => page.getByRole('treeitem', { name, exact: true });
const focused = page => page.evaluate(() => document.activeElement?.querySelector('.alt-tree-label')?.textContent ?? document.activeElement?.getAttribute('aria-label'));
const order = page => page.evaluate(() => [...document.querySelectorAll('[role="treeitem"]')].map(el => `${'  '.repeat(+el.getAttribute('aria-level') - 1)}${el.querySelector('.alt-tree-label')?.textContent ?? ''}`).join('\n'));
const level = (page, name) => item(page, name).getAttribute('aria-level');
const status = async page => { await page.waitForTimeout(60); return (await page.locator('.alt-tree-status').allTextContents()).join(' '); };

try {
  { const page = await open();
    const roadmap = item(page, 'Roadmap');
    check(await roadmap.getAttribute('tabindex') === '0' && await page.locator('[role="treeitem"][tabindex="0"]').count() === 1, 'TR-01 one node is in the Tab order (the selected one)');
    check(await roadmap.getAttribute('aria-level') === '2' && await roadmap.getAttribute('aria-posinset') === '1' && await roadmap.getAttribute('aria-setsize') === '2', 'TR-02 level, position and set size are on every node');
    await roadmap.focus();
    await page.keyboard.press('ArrowDown'); check(await focused(page) === 'Specs', 'TR-03 ↓ moves to the next visible node');
    await page.keyboard.press('ArrowRight'); check(await item(page, 'Specs').getAttribute('aria-expanded') === 'true' && await focused(page) === 'Specs', 'TR-04 → expands a closed node');
    await page.keyboard.press('ArrowRight'); check(await focused(page) === 'Search', 'TR-05 → on an open node moves to its first child');
    await page.keyboard.press('ArrowLeft'); check(await focused(page) === 'Specs', 'TR-06 ← on a child moves to its parent');
    await page.keyboard.press('ArrowLeft'); check(await item(page, 'Specs').getAttribute('aria-expanded') === 'false', 'TR-07 ← on an open node collapses it');
    await page.keyboard.press('Home'); check(await focused(page) === 'Brand', 'TR-08 Home goes to the first node');
    await page.keyboard.press('End'); check(await focused(page) === 'Team handbook', 'TR-09 End goes to the last visible node');
    await page.keyboard.press('ArrowUp'); check(await focused(page) === 'Archive', 'TR-10 ↑ moves to the previous visible node');
    await page.keyboard.type('ty'); check(await focused(page) === 'Typography', 'TR-11 type-ahead finds a node by its label');
    await item(page, 'Product').focus(); await page.keyboard.press('*');
    check(await item(page, 'Archive').getAttribute('aria-expanded') === 'true', 'TR-12 * expands every sibling');
    await item(page, 'Colour').focus(); await page.keyboard.press('Enter');
    check(await item(page, 'Colour').getAttribute('aria-selected') === 'true' && await page.locator('.tree-demo-panel h3').textContent() === 'Colour', 'TR-13 Enter selects (the default action)');
    // RTL mirrors → and ←.
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
    await item(page, 'Specs').focus(); await page.keyboard.press('ArrowLeft');
    check(await item(page, 'Specs').getAttribute('aria-expanded') === 'true', 'TR-14 in RTL, ← expands');
    await page.keyboard.press('ArrowRight'); check(await item(page, 'Specs').getAttribute('aria-expanded') === 'false', 'TR-15 in RTL, → collapses');
    await page.evaluate(() => { document.documentElement.dir = 'ltr'; });
    await page.close(); }

  { const page = await open();
    await item(page, 'Logo usage').focus(); await page.keyboard.press('F2');
    const rename = page.getByRole('textbox', { name: 'Rename Logo usage' });
    check(await rename.evaluate(el => el === document.activeElement && el.selectionStart === 0 && el.selectionEnd === el.value.length), 'TR-16 F2 opens a rename well with the label selected');
    await rename.fill('Logo'); await rename.press('Escape');
    check(await item(page, 'Logo usage').isVisible() && await focused(page) === 'Logo usage', 'TR-17 Escape cancels a rename and refocuses the node');
    await page.keyboard.press('F2'); await rename.fill('A'.repeat(45)); await rename.press('Enter');
    await page.locator('.alt-tree-error').waitFor();
    check(await page.getByRole('textbox', { name: 'Rename Logo usage' }).inputValue() === 'A'.repeat(45) && await page.locator('[data-status="failed"]').count() === 1, 'TR-18 a rejected rename keeps the draft and fails the node');
    await page.getByRole('textbox', { name: 'Rename Logo usage' }).fill('Logo rules'); await page.keyboard.press('Enter');
    await page.locator('.alt-tree-name-input').waitFor({ state: 'detached' });
    check(await focused(page) === 'Logo rules' && (await status(page)).includes('Changes saved'), 'TR-19 Enter saves the rename and returns focus');
    await page.keyboard.press('Control+Enter');
    const name = page.getByRole('textbox', { name: 'Name new item in Brand' });
    check(await name.evaluate(el => el === document.activeElement), 'TR-20 Ctrl+Enter opens a naming well for a sibling after');
    await name.fill('Voice'); await name.press('Enter'); await page.locator('.alt-tree-name-input').waitFor({ state: 'detached' });
    check((await order(page)).includes('  Logo rules\n  Voice\n  Colour') && await focused(page) === 'Voice', 'TR-21 the new node lands after, and takes focus');
    await item(page, 'Archive').focus(); await page.keyboard.press('Control+Shift+Enter');
    const inside = page.getByRole('textbox', { name: 'Name new item in Archive' }); await inside.fill('Old launch'); await inside.press('Enter');
    await page.locator('.alt-tree-name-input').waitFor({ state: 'detached' });
    check(await level(page, 'Old launch') === '2' && await item(page, 'Archive').getAttribute('aria-expanded') === 'true', 'TR-22 Ctrl+Shift+Enter adds a child inside');
    // Keyboard carry.
    await item(page, 'Team handbook').focus(); await page.keyboard.press('Space');
    await page.waitForTimeout(50); check(await item(page, 'Team handbook').getAttribute('data-carried') === 'keys' && (await status(page)).includes('Picked up Team handbook'), 'TR-23 Space picks a node up and says how to move it');
    // ARIA 1.2: treeitem supports these states and properties (plus the global ones); aria-pressed isn't among them.
    const misused = await page.evaluate(() => {
      const allowed = new Set(['aria-level', 'aria-setsize', 'aria-posinset', 'aria-expanded', 'aria-selected', 'aria-checked', 'aria-busy',
        'aria-disabled', 'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-current', 'aria-hidden', 'aria-invalid', 'aria-keyshortcuts', 'aria-roledescription']);
      return [...document.querySelectorAll('[role="treeitem"]')].flatMap(el => [...el.attributes].map(a => a.name).filter(n => n.startsWith('aria-') && !allowed.has(n)));
    });
    check(misused.length === 0, `TR-23b a carried node uses only ARIA a treeitem allows (${misused.join(', ')})`);
    await page.keyboard.press('ArrowUp');
    check(await level(page, 'Team handbook') === '2' && (await order(page)).includes('Archive\n  Team handbook\n  Old launch'), 'TR-24 ↑ carries it into the open node above, at its depth');
    await page.keyboard.press('Escape');
    check((await order(page)).endsWith('Team handbook') && await level(page, 'Team handbook') === '1' && (await status(page)).includes('Move cancelled'), 'TR-25 Escape puts it back');
    await item(page, 'Roadmap').focus(); await page.keyboard.press('Space'); await page.keyboard.press('ArrowDown');
    check((await order(page)).includes('  Specs\n  Roadmap'), 'TR-26 ↓ carries it past the next node');
    await page.keyboard.press('ArrowRight');
    check(await level(page, 'Roadmap') === '3', 'TR-27 → carries it inside the node above (indent)');
    await page.keyboard.press('ArrowLeft'); check(await level(page, 'Roadmap') === '2', 'TR-27b ← carries it back out (outdent)');
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('Space');
    await page.waitForFunction(() => document.querySelector('.alt-tree-status[aria-live="assertive"]').textContent.startsWith('Moved Roadmap into Specs'));
    check(await level(page, 'Roadmap') === '3' && await item(page, 'Roadmap').getAttribute('data-carried') === null, 'TR-28 Space drops it and the move is announced with its depth');
    await item(page, 'Old launch').focus(); await page.keyboard.press('Space'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Space');
    await page.waitForFunction(() => document.querySelector('.alt-tree-status[aria-live="assertive"]').textContent.includes('back in its place'));
    check(await level(page, 'Old launch') === '2' && await page.locator('[data-status="failed"]').count() === 1, 'TR-29 a rejected move puts the node back and says why');
    // Into a page that can't hold children: canDrop refuses.
    await item(page, 'Colour').focus(); await page.keyboard.press('Space'); await page.keyboard.press('ArrowRight');
    check((await status(page)).includes('Can’t move Colour there.') && await level(page, 'Colour') === '2', 'TR-30 canDrop refuses a target and says so');
    await page.keyboard.press('Escape');
    // Alt+↓ moves one step without picking up.
    await item(page, 'Logo rules').focus(); await page.keyboard.press('Alt+ArrowDown');
    await page.waitForFunction(() => document.querySelector('.alt-tree-status[aria-live="assertive"]').textContent.startsWith('Moved Logo rules'));
    check((await order(page)).includes('  Voice\n  Logo rules'), 'TR-31 Alt+↓ moves a node one step');
    // Delete, and focus repair.
    await item(page, 'Voice').focus(); await page.keyboard.press('Delete');
    check(!(await order(page)).includes('Voice') && await focused(page) === 'Logo rules', 'TR-32 Delete asks to remove, and focus moves to the next node');
    await page.close(); }

  { const page = await open();
    // Pointer: drag Team handbook into the collapsed Archive; it springs open after 600ms.
    const from = await item(page, 'Team handbook').boundingBox(), to = await item(page, 'Archive').boundingBox();
    await page.mouse.move(from.x + 40, from.y + from.height / 2); await page.mouse.down();
    await page.mouse.move(from.x + 50, from.y + 4, { steps: 3 });
    await page.mouse.move(to.x + 60, to.y + to.height / 2, { steps: 6 });
    check(await page.locator('.alt-tree-ghost').isVisible() && await item(page, 'Archive').getAttribute('data-into') === '', 'TR-33 a carried node floats and the node under it opens to receive it');
    await page.waitForTimeout(750);
    check(await item(page, 'Archive').getAttribute('aria-expanded') === 'true', 'TR-34 hovering a closed node opens it (spring-loaded)');
    const archive = await item(page, 'Archive').boundingBox();
    await page.mouse.move(archive.x + 60, archive.y + archive.height / 2, { steps: 2 });
    await page.mouse.up();
    await page.waitForFunction(() => document.querySelector('.alt-tree-status[aria-live="assertive"]').textContent.startsWith('Moved Team handbook into Archive'));
    check(await level(page, 'Team handbook') === '2', 'TR-35 dropping into a node moves it inside');
    const a = await item(page, 'Colour').boundingBox(), b = await item(page, 'Logo usage').boundingBox();
    await page.mouse.move(a.x + 40, a.y + a.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + 40, b.y + 3, { steps: 6 });
    check(await page.locator('.alt-tree-slot').count() === 1, 'TR-36 the top of a row shows a slot before it');
    await page.mouse.up();
    await page.waitForFunction(() => document.querySelector('.alt-tree-status[aria-live="assertive"]').textContent.startsWith('Moved Colour'));
    check((await order(page)).includes('  Colour\n  Logo usage'), 'TR-37 dropping on a slot moves it there');
    await page.close(); }

  for (const scheme of ['daylight', 'nightfall', 'mesa', 'alpine']) for (const width of [320, 960]) {
    const page = await open({ scheme, width });
    for (const mode of ['standard', 'reduced-motion', 'forced-colors', 'increased-contrast']) {
      await page.emulateMedia({ reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference', forcedColors: mode === 'forced-colors' ? 'active' : 'none' });
      await page.locator('.alt-root').evaluate((root, more) => { root.dataset.contrast = more ? 'more' : 'system'; }, mode === 'increased-contrast');
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${scheme}/${width}/${mode}: no horizontal scrolling`);
    }
    await page.close();
  }
  check(errors.length === 0, `no page or console errors: ${errors.join('\n')}`);
  console.log(`Tree: ${passed} passed, 0 failed`);
} finally { await browser.close(); }
