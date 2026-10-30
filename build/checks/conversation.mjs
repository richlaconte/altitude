// Conversation: a log of articles whose own announcements are off; a person's message is an accent sheet; a streaming
// answer is aria-busy on a dashed rule with "Generating…" and no actions, never hovering; completing makes the rule solid,
// settles once and announces the answer once; scrolling up shows "Jump to latest message", which returns to the bottom;
// stopping keeps the answer with "Stopped" and Retry. Run after a render of every preview (it opens
// test/p-Conversation-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
await page.goto(`file://${T}p-Conversation-daylight.html`);
await page.waitForTimeout(400);

const last = () => page.evaluate(() => {
  const ms = [...document.querySelectorAll('.alt-msg')], m = ms[ms.length - 1], cs = getComputedStyle(m);
  return { n: ms.length, stream: m.dataset.stream, busy: m.getAttribute('aria-busy'), dashed: cs.backgroundImage.includes('gradient'), solid: cs.boxShadow.includes('inset'),
    transform: cs.transform, caption: m.querySelector('.alt-msg-caption')?.textContent ?? null, actions: !!m.querySelector('.alt-msg-actions'), settle: m.getAttribute('data-settle'),
    said: document.querySelector('.alt-convo > .alt-sr[aria-live="polite"]').textContent };
});
const log = await page.evaluate(() => { const l = document.querySelector('[role="log"]'); return { label: l.getAttribute('aria-label'), live: l.getAttribute('aria-live'), articles: l.querySelectorAll('article').length, user: getComputedStyle(l.querySelector('[data-from="user"]')).backgroundColor }; });
expect(log.label === 'Assistant' && log.live === 'off' && log.articles === 2, 'a labelled log of articles, its own announcements off');
expect(log.user !== 'rgba(0, 0, 0, 0)', 'a person\'s message is a sheet');
await page.fill('textarea', 'Summarise last week');
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
let r = await last();
expect(r.n === 4 && r.stream === 'streaming' && r.busy === 'true' && r.dashed && r.caption === 'Generating…' && !r.actions, `a streaming answer: busy, dashed, "Generating…", no actions (${JSON.stringify(r)})`);
expect(r.transform === 'none' && !r.said, 'it rests on the ground and isn\'t announced while streaming');
await page.waitForTimeout(2200);
r = await last();
expect(r.stream === 'complete' && r.busy === null && !r.dashed && r.solid && r.actions && (r.settle === 'a' || r.settle === 'b'), 'completing: solid rule, actions, one afterglow');
expect(r.said.startsWith('Assistant: Last week the team shipped 14 changes.'), `the answer is announced once, whole (${r.said.slice(0, 40)})`);

// Scroll up mid-stream: following lets go and Jump to latest appears.
await page.fill('textarea', 'And the week before?');
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
await page.evaluate(() => { document.querySelector('.alt-convo-scroll').scrollTop = 0; });
await page.waitForTimeout(300);
const held = await page.evaluate(() => document.querySelector('.alt-convo-scroll').scrollTop);
expect(held < 10 && await page.locator('.alt-convo-jump').count() === 1, `scrolling up lets go and offers Jump to latest (${held})`);
await page.click('.alt-convo-jump');
await page.waitForTimeout(800);
expect(await page.evaluate(() => { const s = document.querySelector('.alt-convo-scroll'); return s.scrollHeight - s.scrollTop - s.clientHeight < 40; }) && await page.locator('.alt-convo-jump').count() === 0, 'Jump to latest returns to the bottom');
await page.click('[aria-label="Stop generating"]');
await page.waitForTimeout(150);
r = await last();
expect(r.stream === 'stopped' && r.caption?.startsWith('Stopped') && await page.locator('.alt-msg >> nth=-1 >> button:has-text("Retry")').count() === 1 && r.said === 'Assistant stopped.', 'stopping keeps the answer with "Stopped" and Retry, and says so');

console.log(`Conversation: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
