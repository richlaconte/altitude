// Agent harness (#286): every moment of the scripted run is reachable from the rail (by mouse and keyboard), renders
// without page errors, and shows its state: asked, thinking (reasoning streaming), searching (subagents in parallel),
// writing (a streaming answer), approval (a requested Confirmation), question (asking), test failed (a failed step,
// "Exited with 1"), retried ("Exited with 0"), queued, reviewing (an undecided hunk), rewound (a checkpoint), done (a
// complete answer with follow-ups). The rail marks the current moment and announces it; Play advances. Run after a
// render of every preview (it opens test/p-AgentHarness-<scheme>.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const has = {
  Asked: () => !!document.querySelector('.alt-msg[data-from="user"]') && !document.querySelector('.alt-msg[data-from="assistant"]'),
  Thinking: () => document.querySelector('.alt-trace-thought')?.getAttribute('data-status') === 'streaming',
  Searching: () => /3 in parallel · 1 of 3 done/.test(document.querySelector('.alt-trace-parallel')?.getAttribute('aria-label') ?? ''),
  Writing: () => document.querySelector('.alt-msg[data-from="assistant"]')?.getAttribute('data-stream') === 'streaming' && !!document.querySelector('.alt-md'),
  'Approval needed': () => document.querySelector('.alt-confirm[data-state="requested"]') !== null,
  Question: () => document.querySelector('.alt-question[data-question]') !== null,
  'Test failed': () => /Exited with 1/.test(document.querySelector('.alt-term-exit')?.textContent ?? '') && !!document.querySelector('.alt-trace-item[data-trace="failed"]'),
  Retried: () => /Exited with 0/.test(document.querySelector('.alt-term-exit')?.textContent ?? ''),
  'Queued follow-up': () => document.querySelector('.alt-queued') !== null,
  'Reviewing changes': () => document.querySelector('.alt-diff-hunk:not([data-decision])') !== null,
  Rewound: () => document.querySelector('.alt-checkpoint') !== null,
  Done: () => document.querySelector('.alt-msg[data-from="assistant"]')?.getAttribute('data-stream') === 'complete' && !!document.querySelector('.alt-suggestions'),
};
for (const scheme of ['daylight', 'nightfall']) {
  const page = await browser.newPage({ viewport: { width: 1180, height: 900 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`file://${T}p-AgentHarness-${scheme}.html`); await page.waitForTimeout(400);
  const names = await page.evaluate(() => [...document.querySelectorAll('.ah-moment')].map((b) => b.textContent));
  if (scheme === 'daylight') expect(names.length === 12, `twelve moments on the rail (${names.length})`);
  for (const name of names) {
    await page.click(`.ah-moment:text-is("${name}")`); await page.waitForTimeout(120);
    const ok = await page.evaluate((src) => (0, eval)(`(${src})`)(), has[name].toString());
    const current = await page.evaluate(() => document.querySelector('.ah-moment[aria-current="step"]')?.textContent);
    if (scheme === 'daylight' || !ok) expect(ok && current === name, `${scheme}: ${name} shows its state and is current (${current})`);
  }
  expect(!errors.length, `${scheme}: no page or console errors (${errors.slice(0, 2).join('; ')})`);
  if (scheme === 'daylight') {
    expect(/^Done: /.test(await page.evaluate(() => document.querySelector('.ah > span.alt-sr')?.textContent ?? '')), 'the moment reached is announced');
    // Keyboard: the rail's moments are buttons in the tab order.
    await page.focus('.ah-moment >> nth=4'); await page.keyboard.press('Enter'); await page.waitForTimeout(120);
    expect(await page.evaluate(() => document.querySelector('.ah-moment[aria-current="step"]')?.textContent) === 'Approval needed', 'Enter on a moment jumps to it');
    await page.click('.ah-rail > button'); await page.waitForTimeout(2700);
    expect(await page.evaluate(() => document.querySelector('.ah-moment[aria-current="step"]')?.textContent) === 'Question', 'Play advances to the next moment');
    await page.click('.ah-rail > button');
  }
  await page.close();
}
console.log(`Agent harness: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
