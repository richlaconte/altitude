// Editing a sent message (#275): Edit opens the person's message in place in a Textarea labelled "Edit message", with
// Cancel and "Send edit" (disabled until the text changes); Escape cancels and returns focus to Edit; Ctrl+Enter sends,
// starting a new branch: "Edited", "Version 2 of 2", focus back in the composer, and a new answer; the version switch
// moves between branches, restoring the turns after each, and announces "Showing version 1 of 2". Run after a render
// of every preview (it drives the Conversation preview in test/p-Conversation-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
await page.goto(`file://${T}p-Conversation-daylight.html`); await page.waitForTimeout(500);
const user = () => page.evaluate(() => { const m = document.querySelector('.alt-msg[data-from="user"]'); return { text: m.querySelector('.alt-msg-content')?.textContent, edited: !!m.querySelector('.alt-msg-edited'), version: m.querySelector('.alt-msg-version')?.textContent ?? null, editor: !!m.querySelector('textarea'), actions: !!m.querySelector('.alt-msg-actions') }; });
const answer = () => page.evaluate(() => document.querySelectorAll('.alt-msg[data-from="assistant"] .alt-msg-content')[0]?.textContent ?? '');
const active = () => page.evaluate(() => document.activeElement.getAttribute('aria-label') ?? document.activeElement.getAttribute('placeholder') ?? document.activeElement.tagName);
const original = (await user()).text, firstAnswer = await answer();
await page.click('button[aria-label="Edit message"]'); await page.waitForTimeout(150);
let u = await user();
expect(u.editor && !u.actions && (await active()) === 'Edit message', `Edit opens the message in place, focused, actions hidden (${JSON.stringify(u)})`);
expect(await page.evaluate(() => document.querySelector('.alt-msg-editor textarea').value) === original, 'the editor starts with the message text');
expect(await page.evaluate(() => [...document.querySelectorAll('.alt-msg-editor button')].find((b) => b.textContent === 'Send edit').disabled), 'Send edit is disabled until the text changes');
await page.keyboard.press('Escape'); await page.waitForTimeout(150);
u = await user();
expect(!u.editor && u.text === original && (await active()) === 'Edit message', `Escape cancels and focus returns to Edit (${await active()})`);
await page.click('button[aria-label="Edit message"]'); await page.waitForTimeout(150);
await page.keyboard.press('End');
await page.keyboard.type(' And who joined?');
await page.keyboard.press('Control+Enter'); await page.waitForTimeout(300);
u = await user();
expect(u.text === `${original} And who joined?` && u.edited && u.version === 'Version 2 of 2', `Ctrl+Enter sends the edit as a new version (${JSON.stringify(u)})`);
expect(await page.evaluate(() => !!document.activeElement.closest('.alt-prompt') && document.activeElement.tagName === 'TEXTAREA'), `focus goes to the composer after sending (${await active()})`);
expect(await page.evaluate(() => document.querySelectorAll('.alt-msg').length) === 2, 'the turns after it are the new branch\'s');
await page.waitForTimeout(3000);
const second = await answer();
expect(second !== firstAnswer && second.length > 20, 'a new answer streams in for the edit');
await page.click('button[aria-label="Previous version"]'); await page.waitForTimeout(200);
u = await user();
expect(u.text === original && u.version === 'Version 1 of 2' && !u.edited && (await answer()) === firstAnswer, `the switch restores version 1 and its answer (${JSON.stringify(u)})`);
expect(await page.evaluate(() => document.body.textContent.includes('Showing version 1 of 2')), 'switching is announced');
await page.click('button[aria-label="Next version"]'); await page.waitForTimeout(200);
expect((await answer()) === second && (await user()).version === 'Version 2 of 2', 'and back to version 2 with its answer');
// The button path.
await page.click('button[aria-label="Edit message"]'); await page.waitForTimeout(150);
await page.fill('.alt-msg-editor textarea', 'A third question');
await page.click('.alt-msg-editor button:has-text("Send edit")'); await page.waitForTimeout(200);
expect((await user()).version === 'Version 3 of 3', 'Send edit adds another version');
console.log(`Message edit: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
