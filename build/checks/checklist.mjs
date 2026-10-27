// Checklist: the outliner keys, commit on leaving a line, failure and undo. ALT_FIXTURE_ROOT selects React 19 fixtures.
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
  await page.goto(`file://${fixturePath('Checklist', scheme)}`);
  page.setDefaultTimeout(5000);
  return page;
};
// The list as text: two spaces per level, [x] for done.
const outline = (page, n = 0) => page.evaluate(n => [...document.querySelectorAll('.alt-checklist')[n].querySelectorAll('.alt-checklist-item:not(.alt-checklist-new)')].map(li => {
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
    check(!(await outline(page)).includes('Design the card') && await page.getByText('removed.', { exact: false }).first().isVisible(), 'CL-15 removing offers Undo');
    await page.keyboard.press('Control+z');
    check((await outline(page)).includes('  [ ] Design the card'), 'CL-16 Ctrl+Z restores the removed item');
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
  console.log(`Checklist: ${passed} passed, 0 failed`);
} finally { await browser.close(); }
