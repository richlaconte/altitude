// DropZone queue: each file is a named slat; uploading carries a progressbar and Cancel; processing hovers as pending
// (aria-busy); done lands (committed) and settles; failed drops to a trench with its reason, Retry and Remove, every
// button naming its file; progress is announced at coarse steps. Run after a render of every preview (it opens
// test/p-DropZone-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
await page.goto(`file://${T}p-DropZone-daylight.html`);
await page.waitForTimeout(300);

const read = () => page.evaluate(() => [...document.querySelectorAll('.alt-upload')].map((li) => ({
  name: li.querySelector('.alt-upload-name').textContent, state: li.dataset.state, status: li.getAttribute('data-status'), busy: li.getAttribute('aria-busy'),
  words: li.querySelector('.alt-upload-state').textContent, bar: !!li.querySelector('[role="progressbar"]'), bg: getComputedStyle(li).backgroundColor,
  buttons: [...li.querySelectorAll('button')].map((b) => b.getAttribute('aria-label')),
})));
const said = () => page.evaluate(() => document.querySelector('.alt-drop-wrap > .alt-sr[aria-live]').textContent);

let r = await read();
expect(r.length === 3 && r.every((x) => x.state === 'uploading' && x.bar), 'each file is a slat with a progressbar while it uploads');
expect(r[0].buttons.includes('Cancel upload of Q3 board deck.pdf'), `buttons name their file (${r[0].buttons})`);
let saw = { processing: false, failed: false, done: false, quarter: false };
for (let i = 0; i < 30 && !(saw.processing && saw.failed && saw.done); i++) {
  await page.waitForTimeout(300);
  r = await read();
  const s = await said();
  if (/\d+% uploaded/.test(s)) saw.quarter = true;
  const proc = r.find((x) => x.state === 'processing');
  if (proc && proc.status === 'pending' && proc.busy === 'true' && proc.words.includes('Processing') && !proc.bar) saw.processing = true;
  const failed = r.find((x) => x.state === 'failed');
  if (failed && failed.status === 'failed' && failed.words.includes('The connection dropped') && failed.buttons.includes('Retry upload of Brand guidelines.pdf') && failed.buttons.includes('Remove Brand guidelines.pdf')) saw.failed = true;
  const done = r.find((x) => x.state === 'done');
  if (done && done.status === 'committed' && done.words.includes('Uploaded')) saw.done = true;
}
expect(saw.processing, 'processing hovers as pending, aria-busy, in words');
expect(saw.failed, 'failed drops to a trench with its reason, Retry and Remove');
expect(saw.done, 'done lands (committed) and says Uploaded');
expect(saw.quarter, 'progress is announced at coarse steps');
await page.click('[aria-label="Retry upload of Brand guidelines.pdf"]');
await page.waitForTimeout(100);
expect((await read()).find((x) => x.name === 'Brand guidelines.pdf').state === 'uploading', 'Retry sends it back to uploading');

console.log(`DropZone queue: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
