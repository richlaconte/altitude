// PromptInput: the composer is the Input well (empty → filled); Send is aria-disabled when empty and stays focusable;
// Shift+Enter adds a line; Enter during IME composition doesn't send; Enter sends, clears and keeps focus; while
// generating Send becomes Stop in the same place and size; Escape stops and announces it; an attached file hovers as
// pending (Uploading) and holds Send, then settles; Remove removes it. Run after a render of every preview (it opens
// test/p-PromptInput-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-PromptInput-daylight.html`);
await page.waitForTimeout(400);

const read = () => page.evaluate(() => {
  const w = document.querySelector('.alt-prompt-well'), b = document.querySelector('.alt-prompt-send'), r = b.getBoundingClientRect(), t = document.querySelector('textarea');
  return { bg: getComputedStyle(w).backgroundColor, label: b.getAttribute('aria-label'), disabled: b.getAttribute('aria-disabled'), native: b.disabled, box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
    value: t.value, focused: document.activeElement === t, said: document.querySelector('.alt-prompt .alt-sr').textContent, cap: document.querySelector('.cap').textContent,
    chips: [...document.querySelectorAll('.alt-prompt-chip')].map((c) => [c.textContent, c.getAttribute('data-status')]) };
});
let r = await read();
const emptyBg = r.bg;
expect(r.label === 'Send message' && r.disabled === 'true' && !r.native, 'an empty composer\'s Send is aria-disabled, still focusable');
const ta = page.locator('textarea').first();
expect(await ta.getAttribute('aria-label') === 'Message', 'the textarea is named');
await ta.click();
await page.keyboard.type('Summarise last week');
await page.keyboard.press('Shift+Enter');
await page.keyboard.type('and risks');
r = await read();
expect(r.value === 'Summarise last week\nand risks' && r.disabled === null && r.bg !== emptyBg, 'Shift+Enter adds a line; the well fills; Send wakes');
// A synthetic IME composition: Enter while composing confirms, it never sends.
await ta.evaluate((t) => { t.dispatchEvent(new CompositionEvent('compositionstart')); t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, isComposing: true, bubbles: true, cancelable: true })); t.dispatchEvent(new CompositionEvent('compositionend')); });
expect((await read()).value === 'Summarise last week\nand risks', 'Enter during IME composition doesn\'t send');
const sendBox = (await read()).box;
await page.keyboard.press('Enter');
await page.waitForTimeout(100);
r = await read();
expect(r.value === '' && r.focused && r.cap === 'Sending…', 'Enter sends, clears and keeps focus');
expect(r.label === 'Stop generating' && JSON.stringify(r.box) === JSON.stringify(sendBox), `Send becomes Stop in the same place and size (${r.box} vs ${sendBox})`);
await page.waitForTimeout(700);
await page.keyboard.press('Escape');
await page.waitForTimeout(100);
r = await read();
expect(r.label === 'Send message' && r.said === 'Generating stopped.', 'Escape stops and says so');

await page.setInputFiles('input[type=file]', { name: 'q3-report.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') });
await ta.fill('Read this');
await page.waitForTimeout(100);
r = await read();
expect(r.chips[0]?.[0].includes('Uploading') && r.chips[0][1] === 'pending' && r.disabled === 'true', `an uploading file hovers as pending and holds Send (${JSON.stringify(r.chips)})`);
await page.waitForTimeout(1000);
r = await read();
expect(r.chips[0][1] === null && !r.chips[0][0].includes('Uploading') && r.disabled === null, 'then it settles and Send wakes');
await page.click('[aria-label="Remove q3-report.pdf"]');
r = await read();
expect(r.chips.length === 0 && r.said === 'q3-report.pdf removed.' && r.focused, 'Remove removes it, says so, and returns to the text');

console.log(`PromptInput: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
