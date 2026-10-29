// CodeBlock: a figure named by its title, flush (no shadow) with a line rim and mono code; tabs switch forms and Copy
// copies the current one; highlighted lines are bands on the right lines and said in words; line numbers are hidden;
// the scroll area is a focusable named region only when it overflows; streaming says "Writing…", is busy and can't be
// copied; a syntax function renders its tokens. Run after a render of every preview (it opens
// test/p-CodeBlock-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
await page.addInitScript(() => { window.__copied = []; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { window.__copied.push(t); } } }); });
await page.goto(`file://${T}p-CodeBlock-daylight.html`);
await page.waitForTimeout(300);

const read = (i) => page.evaluate((i) => {
  const f = document.querySelectorAll('.alt-code')[i], cs = getComputedStyle(f), scroll = f.querySelector('.alt-code-scroll:not([hidden])');
  return { tag: f.tagName, name: document.getElementById(f.getAttribute('aria-labelledby') || '')?.textContent, shadow: cs.boxShadow, border: cs.borderTopWidth,
    font: getComputedStyle(f.querySelector('pre')).fontFamily, code: f.querySelector('[role="tabpanel"] code, .alt-code-scroll code')?.textContent,
    region: scroll?.getAttribute('role'), tab: scroll?.tabIndex, label: scroll?.getAttribute('aria-label'), sr: f.querySelector('.alt-code-scroll .alt-sr')?.textContent ?? null,
    bands: [...f.querySelectorAll('.alt-code-band')].map((b) => { const r = b.getBoundingClientRect(); return r.top + r.height / 2; }), lines: [...f.querySelectorAll('.alt-code-line')].map((l) => { const r = l.getBoundingClientRect(); return r.top + r.height / 2; }),
    gutter: f.querySelector('.alt-code-gutter')?.getAttribute('aria-hidden') ?? null, busy: f.getAttribute('aria-busy'), writing: f.querySelector('.alt-code-writing')?.textContent ?? null,
    copyDisabled: f.querySelector('.alt-copy')?.disabled, tokens: f.querySelectorAll('.tok-keyword, .tok-comment').length };
}, i);

const install = await read(0);
expect(install.tag === 'FIGURE' && install.name === 'Install', 'a figure named by its title');
expect(install.shadow === 'none' && install.border === '1px' && /mono|Menlo|Courier|monospace/i.test(install.font), `flush, with a 1px rim and mono code (${install.shadow})`);
expect(install.code === 'npm install altitude-design' && install.region == null, 'a block that doesn\'t scroll isn\'t a tab stop');
await page.click('[role="tab"]:has-text("pnpm")');
await page.waitForTimeout(150);
expect((await read(0)).code === 'pnpm add altitude-design', 'the tabs switch forms');
await page.click('.alt-code >> nth=0 >> .alt-copy');
await page.waitForTimeout(150);
expect((await page.evaluate(() => window.__copied))[0] === 'pnpm add altitude-design', 'Copy copies the form that shows');

const json = await read(1);
expect(json.region === 'region' && json.tab === 0 && json.label === 'invoice.paid', `taller than maxHeight: a focusable, named region (${json.region}, ${json.label})`);
expect(json.sr === 'Lines 3 and 7 are highlighted.', `highlighted lines are said in words (${json.sr})`);
expect(json.bands.length === 2 && Math.abs(json.bands[0] - json.lines[2]) < 1 && Math.abs(json.bands[1] - json.lines[6]) < 1, 'the bands sit behind lines 3 and 7');
expect(json.gutter === 'true', 'line numbers are hidden from assistive technology');

const streaming = await read(2);
expect(streaming.busy === 'true' && streaming.writing === 'Writing…' && streaming.copyDisabled, 'while streaming: busy, "Writing…", not copyable');
await page.waitForTimeout(3500);
const done = await read(2);
expect(done.busy === null && done.writing === null && !done.copyDisabled, 'once written, it settles and can be copied');
expect(done.tokens >= 3, `a syntax function renders its tokens (${done.tokens})`);

console.log(`CodeBlock: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
