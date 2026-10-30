// Checklist: the outliner keys, commit on leaving a line, failure, a removed line gliding shut, and undo. ALT_FIXTURE_ROOT selects React 19 fixtures.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { fixturePath } from './fixture-path.mjs';

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const errors = [];
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); passed++; };
// The announcement names the platform's undo shortcut, so the platform is pinned rather than the machine's.
const platform = (page, name, ua) => page.addInitScript(([name, ua]) => {
  Object.defineProperty(Navigator.prototype, 'platform', { get: () => name });
  Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => ({ platform: ua }) });
}, [name, ua]);
const open = async ({ scheme = 'daylight', width = 960 } = {}) => {
  const page = await browser.newPage({ viewport: { width, height: 700 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  await platform(page, 'Linux x86_64', 'Linux');
  await page.goto(`file://${fixturePath('Checklist', scheme)}`);
  page.setDefaultTimeout(5000);
  return page;
};
// The list as text: two spaces per level, [x] for done.
const outline = (page, n = 0) => page.evaluate(n => [...document.querySelectorAll('.alt-checklist')[n].querySelectorAll('.alt-checklist-item:not(.alt-checklist-new):not([data-closing])')].map(li => {
  let depth = 0; for (let p = li.parentElement; p && !p.classList.contains('alt-checklist'); p = p.parentElement) if (p.matches('ul')) depth++;
  return `${'  '.repeat(depth - 1)}${li.hasAttribute('data-done') ? '[x]' : '[ ]'} ${li.querySelector(':scope > .alt-checklist-line .alt-checklist-text').value}`;
}).join('\n'), n);
const line = (page, text, n = 0) => page.locator('.alt-checklist').nth(n).locator(`.alt-checklist-item:not(.alt-checklist-new) > .alt-checklist-line .alt-checklist-text`).filter({ has: page.locator(`xpath=self::*[@value="${text}"]`) }).first();
const at = async (page, text, caret) => { const el = page.locator('.alt-checklist-text').and(page.locator(`[value="${text}"]`)).first(); await el.click(); await el.evaluate((el, c) => { const p = c === 'end' ? el.value.length : c; el.setSelectionRange(p, p); }, caret); return el; };
const active = page => page.evaluate(() => ({ value: document.activeElement?.value, caret: document.activeElement?.selectionStart, tag: document.activeElement?.tagName }));
const status = async page => { await page.waitForTimeout(40); return page.locator('.alt-checklist-status').first().textContent(); };

try {
  { const page = await open();
    await at(page, 'Choose catering', 'end'); await page.keyboard.press('Enter');
    check((await outline(page)).endsWith('[ ] Choose catering\n[ ] ') && (await active(page)).value === '', 'CL-01 Enter at the end makes an empty item below and focuses it');
    await page.keyboard.type('Order flowers'); await page.keyboard.press('ArrowUp');
    check((await outline(page)).endsWith('[ ] Order flowers') && (await active(page)).value === 'Choose catering', 'CL-02 leaving a line commits it; ↑ moves to the line above');
    await page.keyboard.press('ArrowDown'); check((await active(page)).value === 'Order flowers', 'CL-03 ↓ moves to the line below');
    await at(page, 'Order flowers', 5); await page.keyboard.press('Enter');
    check((await outline(page)).endsWith('[ ] Order\n[ ]  flowers') && (await active(page)).value === ' flowers' && (await active(page)).caret === 0, 'CL-04 Enter splits at the caret');
    await page.keyboard.press('Backspace');
    check((await outline(page)).endsWith('[ ] Order flowers') && (await active(page)).value === 'Order flowers' && (await active(page)).caret === 5, 'CL-05 Backspace at the start merges into the line above, caret at the join');
    await page.keyboard.press('End'); await page.keyboard.press('Enter'); await page.keyboard.press('Backspace');
    check((await outline(page)).endsWith('[ ] Order flowers') && (await active(page)).value === 'Order flowers' && (await active(page)).caret === 13, 'CL-06 Backspace on an empty line removes it and goes to the end of the line above');
    await page.keyboard.press('Tab');
    check((await outline(page)).includes('[ ] Choose catering\n  [ ] Order flowers') && (await active(page)).value === 'Order flowers' && (await status(page)).startsWith('Indented under Choose catering'), 'CL-07 Tab indents under the item above and says so');
    await page.keyboard.press('Shift+Tab');
    check((await outline(page)).endsWith('[ ] Choose catering\n[ ] Order flowers'), 'CL-08 Shift+Tab outdents');
    await page.keyboard.press('Escape');
    check(await page.evaluate(() => document.activeElement?.classList.contains('alt-checklist-item')), 'CL-09 Escape leaves the line and focuses the item');
    await page.keyboard.press('Tab');
    check(!(await page.evaluate(() => document.activeElement?.classList.contains('alt-checklist-text') && document.activeElement.value === 'Order flowers')), 'CL-10 then Tab moves on, out of the line (no trap)');
    await at(page, 'Order flowers', 'end');
    await page.keyboard.press('Alt+ArrowUp');
    check((await outline(page)).endsWith('[ ] Order flowers\n[ ] Choose catering') && (await active(page)).value === 'Order flowers', 'CL-11 Alt+↑ moves the item, keeping focus');
    await page.keyboard.press('Control+Enter');
    check((await outline(page)).includes('[x] Order flowers'), 'CL-12 Ctrl+Enter checks the item');
    await page.locator('.alt-checklist-text:focus').evaluate(el => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: true })));
    check((await outline(page)).split('\n').length === 6, 'CL-13 Enter during IME composition doesn’t split');
    // A refused edit marks the line failed and keeps the text, with Retry.
    const el = await at(page, 'Choose catering', 'end'); await page.keyboard.type(' TBD'); await page.keyboard.press('ArrowUp');
    await page.locator('.alt-checklist-item[data-status="failed"]').waitFor();
    check(await page.getByText('Write the task, not “TBD”.').first().isVisible() && await page.getByRole('button', { name: 'Retry' }).isVisible(), 'CL-14 a refused change marks the line and offers Retry');
    // Remove, then undo.
    await at(page, 'Design the card', 'end'); for (let i = 0; i < 15; i++) await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace');
    check(!(await outline(page)).includes('Design the card') && await page.locator('.alt-checklist-undo').count() === 0, 'CL-15 removing leaves no Undo bar after the list');
    await page.waitForFunction(() => document.querySelector('.alt-checklist-status').textContent === 'Empty item removed. Undo with Ctrl+Z.');
    check(true, 'CL-15b the announcement names the shortcut: “Empty item removed. Undo with Ctrl+Z.”');
    await page.keyboard.press('Control+z');
    check((await outline(page)).includes('  [ ] Design the card'), 'CL-16 Ctrl+Z restores the removed item');
    await page.close(); }

  // The line glides shut over dur-travel-2, and nothing else moves first; a merge glides too, its text already above.
  for (const reduce of [false, true]) {
    const page = await open();
    if (reduce) await page.emulateMedia({ reducedMotion: 'reduce' });
    const sample = () => page.evaluate(() => { window.__ys = []; const below = [...document.querySelectorAll('.alt-checklist')[0].querySelectorAll('.alt-checklist-new')][0];
      const tick = () => { window.__ys.push([Math.round(below.getBoundingClientRect().top * 10) / 10, !!document.querySelector('[data-closing]'), document.body.scrollHeight]); if (window.__ys.length < 40) requestAnimationFrame(tick); }; tick(); });
    const read = () => page.evaluate(() => new Promise(r => setTimeout(() => r(window.__ys), 900)));
    // An empty line: Enter at the end makes one, Backspace removes it.
    await at(page, 'Choose catering', 'end'); await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    await sample(); await page.keyboard.press('Backspace');
    const ys = await read();
    const tops = new Set(ys.map(y => y[0]));
    const caret = await active(page);
    if (!reduce) {
      check(ys.some(y => y[1]) && tops.size >= 4, `CL-20 the removed line glides shut (${tops.size} positions of the line below, ${ys.filter(y => y[1]).length} frames closing)`);
      const steps = ys.map(y => y[0]).filter((t, i, a) => i && t !== a[i - 1]).length;
      check(steps >= 3, `CL-21 the lines below move with it, in steps, not one jump (${steps})`);
    } else check(tops.size <= 2, `CL-22 reduced motion: it closes at once (${tops.size} positions)`);
    check(caret.value === 'Choose catering' && caret.caret === 'Choose catering'.length, `CL-23${reduce ? 'r' : ''} the caret is at the end of the line above, at once`);
    check(new Set(ys.map(y => y[2])).size <= (reduce ? 2 : 40) && await page.locator('.alt-checklist-undo').count() === 0, `CL-24${reduce ? 'r' : ''} no bar is added after the list`);
    // A merge: the text joins the line above, and the emptied line glides shut.
    if (!reduce) {
      await at(page, 'Choose catering', 0); await sample(); await page.keyboard.press('Backspace');
      const merged = await read();
      check((await outline(page)).includes('Design the cardChoose catering') && merged.some(y => y[1]) && new Set(merged.map(y => y[0])).size >= 4, 'CL-25 a merged line glides shut too, its text already joined above');
      await page.waitForFunction(() => document.querySelector('.alt-checklist-status').textContent === 'Choose catering removed. Undo with Ctrl+Z.');
      check(true, 'CL-26 a merge announces the line removed, with the shortcut');
      await page.keyboard.press('Control+z');
      check((await outline(page)).endsWith('[ ] Choose catering'), 'CL-27 Ctrl+Z brings the merged line back');
    }
    await page.close();
  }
  // On Apple platforms the announcement says ⌘Z, and ⌘Z undoes.
  { const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
    page.on('pageerror', e => errors.push(e.message));
    await platform(page, 'MacIntel', 'macOS');
    await page.goto(`file://${fixturePath('Checklist', 'daylight')}`);
    await at(page, 'Choose catering', 'end'); await page.keyboard.press('Enter'); await page.keyboard.press('Backspace');
    await page.waitForFunction(() => document.querySelector('.alt-checklist-status').textContent === 'Empty item removed. Undo with ⌘Z.');
    const before = (await outline(page)).split('\n').length;
    await page.keyboard.press('Meta+z');
    check((await outline(page)).split('\n').length === before + 1, 'CL-28 on Apple platforms it says ⌘Z, and ⌘Z restores the line');
    await page.close(); }

  { const page = await open();
    const fresh = page.locator('.alt-checklist').first().getByRole('textbox', { name: 'Add an item' });
    await fresh.fill('Print badges'); await fresh.press('Enter');
    check((await outline(page)).endsWith('[ ] Print badges') && await fresh.evaluate(el => el === document.activeElement), 'CL-17 the last line adds an item and stays ready for the next');
    await fresh.evaluate(el => { const d = new DataTransfer(); d.setData('text/plain', '- [ ] Hire a photographer\n- [x] Book flights\n  - [ ] Window seats'); el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: d, bubbles: true, cancelable: true })); });
    await page.waitForTimeout(100);
    check((await outline(page)).endsWith('[ ] Hire a photographer\n[x] Book flights\n  [ ] Window seats'), 'CL-18 a pasted task list becomes items, with done and nesting');
    // sortDone: checking Passport carries it after the open items.
    await page.locator('.alt-checklist').nth(1).getByRole('checkbox', { name: 'Passport' }).check({ force: true });
    check((await outline(page, 1)) === '[ ] Rain jacket\n[x] Passport\n[x] Charger' || (await outline(page, 1)) === '[ ] Rain jacket\n[x] Charger\n[x] Passport', 'CL-19 with sortDone, a checked item goes after the open ones');
    check(await page.locator('.alt-checklist').nth(1).getByRole('checkbox', { name: 'Passport' }).isChecked(), 'CL-20 the checkbox is named by the item');
    await page.close(); }

  for (const scheme of ['daylight', 'nightfall']) for (const width of [320, 960]) {
    const page = await open({ scheme, width });
    for (const mode of ['standard', 'reduced-motion', 'forced-colors', 'increased-contrast']) {
      await page.emulateMedia({ reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference', forcedColors: mode === 'forced-colors' ? 'active' : 'none' });
      await page.locator('.alt-root').evaluate((root, more) => { root.dataset.contrast = more ? 'more' : 'system'; }, mode === 'increased-contrast');
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${scheme}/${width}/${mode}: no horizontal scrolling`);
    }
    await page.close();
  }
  check(errors.length === 0, `no page or console errors: ${errors.join('\n')}`);
  console.log(`Checklist: ${passed} passed, 0 failed`);
} finally { await browser.close(); }
