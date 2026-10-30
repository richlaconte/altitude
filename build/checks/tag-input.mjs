// TagInput keyboard, focus and persistence paths, against the preview. ALT_FIXTURE_ROOT selects React 19 fixtures.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { fixturePath } from './fixture-path.mjs';

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const errors = [];
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); passed++; };
const open = async ({ scheme = 'daylight', width = 960 } = {}) => {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  await page.goto(`file://${fixturePath('TagInput', scheme)}`);
  page.setDefaultTimeout(5000);
  return page;
};
const tagsOf = (page, label) => page.locator('.alt-field', { has: page.getByRole('combobox', { name: label }) }).locator('.alt-tag-face').allTextContents();
const status = (page, label) => page.locator('.alt-field', { has: page.getByRole('combobox', { name: label }) }).locator('.alt-tag-status');
const active = page => page.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent);

try {
  { const page = await open(); const input = page.getByRole('combobox', { name: 'Labels' });
    check(await input.evaluate(el => el.getAttribute('aria-describedby').split(' ').map(id => document.getElementById(id)?.textContent).join(' ').includes('2 labels. Press comma or Enter to add.')), 'TAG-01 the input is described by the count and the separators');
    await input.click(); await input.type('Docs'); await input.press('Enter');
    check(JSON.stringify(await tagsOf(page, 'Labels')) === '["design","accessibility","docs"]' && await input.inputValue() === '', 'TAG-02 Enter adds the normalized tag and clears the input');
    await status(page, 'Labels').filter({ hasText: 'Added docs' }).waitFor();
    await input.type('mob'); await input.press('ArrowDown'); await input.press('Enter');
    check((await tagsOf(page, 'Labels')).includes('mobile'), 'TAG-03 a suggestion chosen with the arrows and Enter is added');
    await input.type('DESIGN,');
    check((await tagsOf(page, 'Labels')).filter(t => t === 'design').length === 1 && await input.inputValue() === 'DESIGN', 'TAG-04 a duplicate (after normalizing) is refused and stays in the input');
    await status(page, 'Labels').filter({ hasText: 'design is already added.' }).waitFor();
    await input.fill('');
    await input.press('Backspace');
    check(await page.locator('.alt-tag[data-armed]').count() === 1 && (await status(page, 'Labels').textContent()).includes('Press Backspace again to remove mobile'), 'TAG-05 a first Backspace on an empty input arms the last tag and says so');
    await input.type('x'); check(await page.locator('.alt-tag[data-armed]').count() === 0, 'TAG-06 typing disarms'); await input.press('Backspace');
    await input.press('Backspace'); await input.press('Backspace'); await page.waitForTimeout(300);
    check(!(await tagsOf(page, 'Labels')).includes('mobile') && await input.evaluate(el => el === document.activeElement), 'TAG-07 a second Backspace removes the last tag and keeps focus in the input');
    await input.press('ArrowLeft');
    check(await active(page) === 'docs', 'TAG-08 ← from the start of the input moves to the last tag');
    await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Home');
    check(await active(page) === 'design', 'TAG-09 ←/Home move between tags');
    check(await page.locator('.alt-field', { has: input }).locator('.alt-tag-face[tabindex="0"]').count() === 1, 'TAG-10 the tags are one Tab stop (roving tabindex)');
    await page.keyboard.press('Delete'); await page.waitForTimeout(300);
    check(JSON.stringify(await tagsOf(page, 'Labels')) === '["accessibility","docs"]' && await active(page) === 'accessibility', 'TAG-11 Delete on a tag removes it and focuses the next tag');
    await page.keyboard.press('End'); await page.keyboard.press('Backspace'); await page.waitForTimeout(300);
    check(await active(page) === 'accessibility', 'TAG-12 removing the last tag focuses the previous one');
    await page.keyboard.press('Enter'); const edit = page.getByRole('textbox', { name: 'Edit accessibility' });
    check(await edit.evaluate(el => el === document.activeElement), 'TAG-13 Enter edits the focused tag in place');
    await edit.fill('a11y'); await edit.press('Enter');
    check(JSON.stringify(await tagsOf(page, 'Labels')) === '["a11y"]' && await active(page) === 'a11y', 'TAG-14 Enter saves the edit and returns focus to the tag');
    await page.keyboard.press('F2'); await page.getByRole('textbox', { name: 'Edit a11y' }).fill('changed'); await page.keyboard.press('Escape');
    check(JSON.stringify(await tagsOf(page, 'Labels')) === '["a11y"]', 'TAG-15 Escape cancels an edit');
    await page.keyboard.press('Delete'); await page.waitForTimeout(300);
    check(await input.evaluate(el => el === document.activeElement), 'TAG-16 removing the only tag focuses the input');
    // Paste splitting and max.
    await input.evaluate(el => { const data = new DataTransfer(); data.setData('text/plain', 'one, two\nthree,four,five,six,seven'); el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })); });
    await page.waitForTimeout(100);
    check(JSON.stringify(await tagsOf(page, 'Labels')) === '["one","two","three","four","five","six"]', 'TAG-17 a paste is split on separators and newlines, up to max');
    check(await input.getAttribute('readonly') !== null && await input.evaluate(el => el === document.activeElement), 'TAG-18 at max the input stays focused and read-only');
    check((await input.evaluate(el => document.getElementById(el.getAttribute('aria-describedby').split(' ').pop())?.textContent || '')).includes('Limit reached (6).') || (await page.getByText('Limit reached (6).').count()) > 0, 'TAG-19 the limit is stated');
    // IME: a comma during composition doesn't add.
    check(await input.inputValue() === 'seven', 'TAG-19b what didn’t fit stays in the input');
    await page.getByRole('button', { name: 'Remove six' }).click(); await page.waitForTimeout(300); await input.fill('');
    await input.evaluate(el => el.dispatchEvent(new KeyboardEvent('keydown', { key: ',', bubbles: true, cancelable: true, isComposing: true })));
    await input.evaluate(el => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: true })));
    check((await tagsOf(page, 'Labels')).length === 5, 'TAG-20 separators during IME composition do nothing');
    await page.close(); }

  { const page = await open(); const input = page.getByRole('combobox', { name: 'Share with' });
    await input.fill('ines@northwind.example'); await input.press('Enter');
    await page.waitForTimeout(400);
    check(await page.locator('.alt-tag[data-status="pending"]').count() === 1 && await page.locator('.alt-tag[aria-busy="true"]').count() === 1, 'TAG-21 a tag waits, pending and busy, for onAdd');
    await status(page, 'Share with').filter({ hasText: 'Added ines@northwind.example' }).waitFor();
    check((await tagsOf(page, 'Share with')).includes('ines@northwind.example') && await page.locator('.alt-tag[data-status]').count() === 0, 'TAG-22 an accepted add lands');
    await input.fill('x@other.example'); await input.press('Enter');
    await page.locator('.alt-tag-error', { hasText: 'Only people at northwind.example can be invited.' }).waitFor();
    check(await input.inputValue() === 'x@other.example' && await input.getAttribute('aria-invalid') === 'true' && !(await tagsOf(page, 'Share with')).includes('x@other.example'), 'TAG-23 a rejected add returns its text to the input with the error');
    await input.fill('not-an-email,');
    check(await page.locator('.alt-tag-error', { hasText: 'not-an-email isn’t an email address.' }).isVisible(), 'TAG-24 validate refuses a tag before any write');
    await input.fill(''); await page.getByRole('button', { name: 'Remove mara@northwind.example' }).click();
    await status(page, 'Share with').filter({ hasText: 'Removed mara@northwind.example' }).waitFor();
    check(!(await tagsOf(page, 'Share with')).includes('mara@northwind.example'), 'TAG-25 the remove button removes after onRemove succeeds');
    check(await page.getByRole('combobox', { name: 'Skills' }).isDisabled() && await page.locator('.alt-field', { has: page.getByRole('combobox', { name: 'Skills' }) }).locator('.alt-tag-remove').count() === 0, 'TAG-26 a disabled TagInput has no remove buttons');
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
  console.log(`TagInput: ${passed} passed, 0 failed`);
} finally { await browser.close(); }
