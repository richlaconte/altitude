// Question (#270): a raised section labelled by its question, "The assistant is asking", announced assertively once;
// nothing chosen or focused for you, and Answer waits for a choice; options are a radio group (arrows) or checkboxes;
// "Your own answer" replaces a single choice and Enter there doesn't submit; Skip lets the run go on; answered, it's one
// line ("You chose: Staging"); a QuestionSet answers several with one button. Also: radios with nothing chosen draw
// empty (they match :indeterminate). Run after a render of every preview (it opens test/p-Question-daylight.html);
// exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 1000 } });
await page.goto(`file://${T}p-Question-daylight.html`); await page.waitForTimeout(500);
const first = page.locator('.alt-question').first();
const info = await page.evaluate(() => { const q = document.querySelector('.alt-question'); return { name: document.getElementById(q.getAttribute('aria-labelledby'))?.textContent, line: q.querySelector('.alt-confirm-line')?.textContent, said: q.querySelector('[aria-live="assertive"]')?.textContent, focus: document.activeElement === document.body, empty: [...q.querySelectorAll('.alt-radio .alt-check-fill')].every((f) => getComputedStyle(f).opacity === '0'), disabled: [...q.querySelectorAll('button')].find((b) => b.textContent === 'Deploy').disabled, raised: getComputedStyle(q).boxShadow !== 'none' }; });
expect(info.name === 'Which environment should I deploy to?' && info.line === 'The assistant is asking' && info.raised, `a raised section labelled by its question (${JSON.stringify(info)})`);
expect(info.said === 'The assistant is asking: Which environment should I deploy to?', `asked is announced assertively (${info.said})`);
expect(info.focus && info.disabled, 'nothing is focused for you, and Answer waits for a choice');
expect(info.empty, 'radios with nothing chosen draw empty');
await first.locator('.alt-radio').first().click();
await page.keyboard.press('ArrowDown'); await page.waitForTimeout(100);
expect(await page.evaluate(() => document.querySelectorAll('.alt-question input[type="radio"]')[1].checked), 'arrows move between options');
await first.locator('input').last().fill('A preview environment');
expect(await page.evaluate(() => ![...document.querySelector('.alt-question').querySelectorAll('input[type="radio"]')].some((r) => r.checked)), 'your own answer replaces a single choice');
await first.locator('input').last().press('Enter'); await page.waitForTimeout(100);
expect(await page.locator('.alt-question').first().getAttribute('data-state') === 'requested', 'Enter in your own answer doesn\'t submit');
await first.locator('.alt-radio').first().click();
await first.locator('button:has-text("Deploy")').click(); await page.waitForTimeout(200);
const rec = await page.evaluate(() => { const q = document.querySelector('.alt-question'); return { state: q.dataset.state, text: q.querySelector('.alt-question-record')?.textContent, said: q.querySelector('[role="status"]')?.textContent }; });
expect(rec.state === 'answered' && /You chose: Staging/.test(rec.text ?? ''), `answered, it's one line in the record (${JSON.stringify(rec)})`);
expect(rec.said === 'Answered: Staging', `answering is announced (${rec.said})`);
// The set: one Answer for both.
const set = page.locator('.alt-question-set');
const setBtn = set.locator('button:has-text("Answer")');
expect(await setBtn.isDisabled(), 'a set\'s Answer waits until every question has an answer');
await set.locator('.alt-radio').nth(1).click();
expect(await setBtn.isDisabled(), 'still waiting with one answered');
await set.locator('.alt-check:not(.alt-radio)').nth(0).click(); await set.locator('.alt-check:not(.alt-radio)').nth(2).click();
await setBtn.click(); await page.waitForTimeout(200);
const setRec = await page.evaluate(() => [...document.querySelectorAll('.alt-question-set .alt-question-record')].map((r) => r.textContent));
expect(setRec.length === 2 && /You chose: Drop it/.test(setRec[0]) && /#eng-billing, The account owner/.test(setRec[1]), `the set answers both, with several choices (${JSON.stringify(setRec)})`);
// Skip.
await page.goto(`file://${T}p-Question-daylight.html`); await page.waitForTimeout(400);
await page.click('button:has-text("Let the assistant decide")'); await page.waitForTimeout(200);
expect(/No longer needed/.test(await page.locator('.alt-question').first().textContent()), 'Skip lets the run go on');
console.log(`Question: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
