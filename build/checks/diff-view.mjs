// DiffView and diffLines: the line diff itself; a figure named by its caption with a summary; additions are ins with +
// and "Added", removals del with −, "Removed" and a strike-through; changed words are marked within paired lines;
// unchanged runs of two or more fold behind a lid that opens; Next/Previous change and n/p move focus; the properties
// mode shows old struck through beside new; forced colours drop the tints and keep the signs. Run after a render of
// every preview (it opens test/p-DiffView-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (media) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-DiffView-daylight.html`);
  await page.waitForTimeout(300);
  return page;
};
const page = await open();
const ops = await page.evaluate(() => window.Altitude.diffLines('a\nb\nc', 'a\nB\nc\nd').map((o) => o.kind + ':' + o.text).join(' '));
expect(ops === 'same:a del:b add:B same:c add:d', `the line diff (${ops})`);

const read = () => page.evaluate(() => {
  const f = document.querySelector('.alt-diff');
  const lines = [...f.querySelectorAll('.alt-diff-line')].map((l) => ({ kind: l.dataset.kind, sign: l.querySelector('.alt-diff-sign').textContent, tag: l.querySelector('.alt-diff-text').tagName, text: l.querySelector('.alt-diff-text').textContent, deco: getComputedStyle(l.querySelector('.alt-diff-text')).textDecorationLine, marks: [...l.querySelectorAll('mark')].map((m) => m.textContent) }));
  return { name: document.getElementById(f.getAttribute('aria-labelledby')).textContent, lines, folds: [...f.querySelectorAll('.alt-diff-fold button')].map((b) => b.textContent) };
});
let r = await read();
expect(r.name.includes('deploy.yaml · version 4 → 5') && r.name.includes('3 additions, 2 removals'), `named by its caption, with a summary (${r.name})`);
const add = r.lines.find((l) => l.kind === 'add'), del = r.lines.find((l) => l.kind === 'del');
expect(add.tag === 'INS' && add.sign === '+' && add.text.startsWith('Added: '), 'additions: ins, +, "Added"');
expect(del.tag === 'DEL' && del.sign === '−' && del.text.startsWith('Removed: ') && del.deco === 'line-through', 'removals: del, −, "Removed", struck through');
const rep = r.lines.find((l) => l.kind === 'add' && l.text.includes('replicas'));
expect(rep.marks.join() === '4', `changed words are marked within paired lines (${rep.marks})`);
expect(r.folds.length === 1 && r.folds[0] === '6 unchanged lines', `long unchanged runs fold; single lines don't (${r.folds})`);
await page.click('.alt-diff-fold button');
expect((await read()).folds.length === 0, 'a lid opens its lines');

await page.click('.alt-diff >> nth=0 >> button:has-text("Next change")');
const f1 = await page.evaluate(() => document.activeElement.textContent);
await page.keyboard.press('n');
const f2 = await page.evaluate(() => document.activeElement.textContent);
await page.keyboard.press('p');
const f3 = await page.evaluate(() => document.activeElement.textContent);
expect(f1.includes('replicas: 2') && f2.includes('alerts') && f3.includes('replicas: 2'), `Next change and n/p move between changes (${f1} → ${f2} → ${f3})`);

const props = await page.evaluate(() => [...document.querySelectorAll('.alt-diff-prop')].map((p) => `${p.querySelector('dt').textContent}:${p.querySelector('del').textContent}>${p.querySelector('ins').textContent}`));
expect(props.join('|') === 'Plan:Removed: Pro>Added: Business|Seats:Removed: 12>Added: 25', `properties: old struck through beside new, unchanged fields left out (${props})`);
await page.close();

const forced = await open({ forcedColors: 'active' });
const bg = await forced.evaluate(() => [getComputedStyle(document.querySelector('.alt-diff-line[data-kind="add"]')).backgroundColor, document.querySelector('.alt-diff-line[data-kind="add"] .alt-diff-sign').textContent]);
expect(bg[1] === '+', `forced colours: the signs are kept (the system colours replace the tints) (${bg[0]})`);
await forced.close();

console.log(`DiffView: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
