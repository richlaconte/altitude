// CommentThread: comments are articles with mention plates; typing "@ma" opens a listbox (combobox with
// aria-activedescendant) whose arrows and Enter insert the mention; ⌘/Ctrl+Enter posts; the new comment hovers as
// pending, then lands; a failed post keeps its text in a trench with Retry; Delete leaves a receipt with Undo; Resolve
// stamps and collapses the thread, kept in place, with Reopen; the typing line isn't announced. Run after a render of
// every preview (it opens test/p-CommentThread-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
await page.goto(`file://${T}p-CommentThread-daylight.html`);
await page.waitForTimeout(400);
const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

const read = () => page.evaluate(() => ({ items: [...document.querySelectorAll('.alt-comment')].map((li) => ({ text: li.querySelector('.alt-comment-body')?.textContent ?? li.textContent, status: li.getAttribute('data-status'), mentions: li.querySelectorAll('.alt-comment-mention').length, deleted: li.hasAttribute('data-deleted') })),
  resolved: document.querySelector('.alt-comments-resolved')?.textContent ?? null, typingHidden: document.querySelector('.alt-comments-typing')?.getAttribute('aria-hidden') }));
let r = await read();
expect(r.items.length === 2 && r.items[1].mentions === 1 && await page.locator('.alt-comment article').count() === 2, 'comments are articles; mentions are plates');
expect(r.typingHidden === 'true', 'the typing line isn\'t announced');
const ta = page.locator('textarea');
await ta.click();
await page.keyboard.type('Thanks @ma');
await page.waitForTimeout(200);
const combo = await ta.evaluate((t) => ({ expanded: t.getAttribute('aria-expanded'), active: t.getAttribute('aria-activedescendant'), role: t.getAttribute('role'), options: [...document.querySelectorAll('[role="option"] .alt-comments-name')].map((o) => o.textContent) }));
expect(combo.role === 'combobox' && combo.expanded === 'true' && combo.active && combo.options.join() === 'Maya Chen,Theo Marsh', `typing "@ma" opens a listbox of people (${combo.options})`);
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');
expect(await ta.inputValue() === 'Thanks @Theo Marsh ', `Enter inserts the mention (${await ta.inputValue()})`);
await page.keyboard.type('done');
await page.keyboard.press(`${mod}+Enter`);
await page.waitForTimeout(200);
r = await read();
expect(r.items[2].status === 'pending' && r.items[2].mentions === 1 && await ta.inputValue() === '', '⌘/Ctrl+Enter posts; it hovers as pending with its mention');
await page.waitForTimeout(1000);
expect((await read()).items[2].status === null, 'then it lands');

await page.click('.alt-switch');
await ta.fill('This one fails');
await page.click('button:has-text("Comment")');
await page.waitForTimeout(1100);
r = await read();
expect(r.items[3].status === 'failed' && r.items[3].text === 'This one fails' && await page.locator('.alt-comment >> nth=3 >> button:has-text("Retry")').count() === 1, 'a failed post keeps its text in a trench with Retry');
await page.click('.alt-comment >> nth=2 >> button:has-text("Delete")');
r = await read();
expect(r.items[2].deleted && await page.locator('.alt-comment >> nth=2 >> button:has-text("Undo")').count() === 1, 'Delete leaves a receipt with Undo');
await page.click('.alt-comment >> nth=2 >> button:has-text("Undo")');
expect(!(await read()).items[2].deleted, 'Undo restores it');

await page.click('button:has-text("Resolve")');
await page.waitForTimeout(200);
r = await read();
expect(r.resolved?.includes('Resolved by You') && r.items.length === 0 && await page.locator('textarea').count() === 0, 'Resolve stamps the thread and collapses it to one line');
await page.click('button:has-text("Show 4 comments")');
expect((await read()).items.length === 4, 'it\'s kept in place and can be shown');
await page.click('button:has-text("Reopen")');
expect((await read()).resolved === null && await page.locator('textarea').count() === 1, 'Reopen brings back the composer');

console.log(`CommentThread: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
