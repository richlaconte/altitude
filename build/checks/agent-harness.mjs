// Agent harness (#286): every moment of the scripted run is reachable from the rail (by mouse and keyboard), renders
// without page errors, and shows its state: asked, thinking (reasoning streaming), searching (subagents in parallel),
// writing (a streaming answer), approval (a requested Confirmation), question (asking), test failed (a failed step,
// "Exited with 1"), retried ("Exited with 0"), queued, reviewing (an undecided hunk), rewound (a checkpoint), done (a
// complete answer with follow-ups). The rail marks the current moment and announces it; on a phone it's one row that
// scrolls within itself and keeps the current moment in view, and the page never scrolls sideways. The Coding session
// view reads at a glance: the finished turn is one closed fold, the proposal is the only raised thing and sits outside
// any fold, the header says the session's state in words and follows an approval, and on a phone nothing scrolls
// sideways. Run after a render of every preview (it opens test/p-AgentHarness-<scheme>.html); exits non-zero on a failure.
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
    expect(await page.evaluate(() => !document.querySelector('.ah-rail button:not(.ah-moment):not([role="switch"])')), 'the rail is only the moments and Notes');
  }
  await page.close();
}
// On a phone: the rail is one row above the harness, scrolls within itself, keeps the current moment in view, and the
// harness fits the screen under it.
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`file://${T}p-AgentHarness-daylight.html`); await page.waitForTimeout(400);
  await page.click('.ah-moment:text-is("Done")'); await page.waitForTimeout(150);
  const m = await page.evaluate(() => { const l = document.querySelector('.ah-moments'), cur = document.querySelector('.ah-moment[aria-current]').getBoundingClientRect(), r = l.getBoundingClientRect();
    const tops = new Set([...l.querySelectorAll('.ah-moment')].map((b) => Math.round(b.offsetTop)));
    return { rows: tops.size, inView: cur.left >= r.left - 1 && cur.right <= r.right + 1, fades: l.hasAttribute('data-more-start'), page: document.documentElement.scrollWidth,
      above: l.getBoundingClientRect().bottom <= document.querySelector('.ah-frame').getBoundingClientRect().top, frame: document.querySelector('.ah-frame').getBoundingClientRect().height }; });
  expect(m.rows === 1 && m.inView && m.fades && m.above, `phone: the rail is one row above the harness, with the current moment in view and a fade where there's more (${JSON.stringify(m)})`);
  expect(m.page <= 375, `phone: the page doesn't scroll sideways (${m.page})`);
  expect(m.frame <= 640, `phone: the harness is no taller than on a desktop (${m.frame})`);
  await ctx.close();
}
// The Coding session view: history folded, the proposal in the open, the state said once in the header.
for (const scheme of ['daylight', 'nightfall']) {
  const page = await browser.newPage({ viewport: { width: 1180, height: 900 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`file://${T}p-AgentHarness-${scheme}.html`); await page.waitForTimeout(400);
  await page.click('.ah-views .alt-tabs button:text-is("Coding session")'); await page.waitForTimeout(300);
  const g = await page.evaluate(() => {
    const folds = [...document.querySelectorAll('.ah-phone .alt-trace-fold')];
    const lid = (f) => f.querySelector('.alt-acc-trigger')?.textContent ?? '';
    const confirm = document.querySelector('.ah-phone .alt-confirm[data-state="requested"]');
    const scroll = document.querySelector('.ah-phone .alt-convo-scroll');
    return { folds: folds.length, closed: folds.map((f) => f.querySelector(':scope > .alt-acc-item')?.getAttribute('data-state') === 'closed'), lids: folds.map(lid),
      confirmOutside: !!confirm && !confirm.closest('.alt-trace-fold'), raised: document.querySelectorAll('.ah-phone .alt-confirm[data-state="requested"], .ah-phone .alt-step[data-state="current"]').length,
      status: document.querySelector('.ah-phone .cs-status')?.textContent ?? '', atEnd: !!scroll && Math.abs(scroll.scrollTop + scroll.clientHeight - scroll.scrollHeight) < 2 };
  });
  if (scheme === 'daylight') {
    expect(g.folds === 2 && g.closed.every(Boolean), `coding session: both turns are folded to one line (${JSON.stringify(g.closed)})`);
    expect(/^Edited 2 files · Updated 3 memories · Ran 4 tools/.test(g.lids[0]) && /4 steps · all done/.test(g.lids[0]), `coding session: the finished turn's lid says what it did (${g.lids[0]})`);
    expect(g.confirmOutside && g.raised === 1, `coding session: the proposal is the only raised thing and isn't behind a lid (${g.raised})`);
    expect(/Needs approval/.test(g.status) && /Open a pull request\?/.test(g.status), `coding session: the header says the state in words (${g.status})`);
    expect(g.atEnd, 'coding session: opens at the end of the thread, where the live turn is');
    await page.click('.ah-phone .alt-confirm button:has-text("Open pull request")'); await page.waitForTimeout(120);
    const mid = await page.evaluate(() => document.querySelector('.ah-phone .cs-status')?.textContent ?? '');
    expect(/Working/.test(mid) && /Opening the pull request/.test(mid), `coding session: approving says Working (${mid})`);
    await page.waitForTimeout(1300);
    const end = await page.evaluate(() => ({ status: document.querySelector('.ah-phone .cs-status')?.textContent ?? '', lid: document.querySelectorAll('.ah-phone .alt-trace-fold')[1]?.querySelector('.alt-acc-trigger')?.textContent ?? '',
      done: document.querySelector('.ah-phone .alt-confirm')?.getAttribute('data-state') }));
    expect(/Pull request #112 opened/.test(end.status) && end.done === 'done' && /Ran 2 tools/.test(end.lid) && /all done/.test(end.lid), `coding session: once opened, the header, the card and the lid all say so (${end.status} · ${end.lid} · ${end.done})`);
  }
  expect(!errors.length, `${scheme} coding session: no page or console errors (${errors.slice(0, 2).join('; ')})`);
  await page.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`file://${T}p-AgentHarness-daylight.html`); await page.waitForTimeout(400);
  await page.click('.ah-views .alt-tabs button:text-is("Coding session")'); await page.waitForTimeout(300);
  const m = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, frame: document.querySelector('.ah-phone')?.getBoundingClientRect().width,
    inner: document.querySelector('.ah-phone .alt-convo-scroll')?.scrollWidth, innerW: document.querySelector('.ah-phone .alt-convo-scroll')?.clientWidth,
    confirm: !!document.querySelector('.ah-phone .alt-confirm[data-state="requested"]') }));
  expect(m.page <= 375 && (m.inner ?? 0) <= (m.innerW ?? 0) + 1, `phone coding session: nothing scrolls sideways (${JSON.stringify(m)})`);
  expect(m.confirm, 'phone coding session: the proposal is on screen');
  await ctx.close();
}
console.log(`Agent harness: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
