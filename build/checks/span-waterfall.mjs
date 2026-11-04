// SpanWaterfall (#466): a treegrid of spans, one tab stop. ↑/↓ move; → expands a collapsed caller or moves to its
// first child; ← collapses an open caller or moves to its parent; Home/End; Enter opens the span's detail flush beneath
// its row; Space selects (aria-selected), and the selected row is raised while its bar only takes an outline. The
// critical path is computed (Jaeger's walk-back) and drawn as focus; a failed span has its hatch, a status icon and
// "Failed". Rows are named with their timings. Nothing overflows at 375px. Opens the SpanWaterfall preview.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';
import { fixturePath } from './fixture-path.mjs';
const require = createRequire(import.meta.url);

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const errors = [];
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); passed++; };
const focused = (page) => page.evaluate(() => document.activeElement?.closest('[data-span]')?.dataset.span ?? document.activeElement?.tagName);
const row = (page, id) => page.locator(`[data-span="${id}"]`);

try {
  for (const scheme of ['daylight', 'nightfall']) {
    const page = await browser.newPage({ viewport: { width: 960, height: 760 } });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
    await page.goto(`file://${fixturePath('SpanWaterfall', scheme)}`);
    page.setDefaultTimeout(5000);

    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const axe = await page.evaluate(() => window.axe.run(document.querySelector('.alt-spans'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    check(axe.violations.length === 0, `${scheme}: axe is clean (${axe.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`).join(', ')})`);

    const grid = page.getByRole('treegrid', { name: 'Spans of the slowest checkout request' });
    check(await grid.count() === 1 && await page.locator('[data-span][tabindex="0"]').count() === 1, `${scheme}: a treegrid with one tab stop`);
    const desc = await row(page, 'pay').evaluate((r) => document.getElementById(r.getAttribute('aria-describedby'))?.textContent);
    check(desc === 'started at 98 ms, took 2.29 s, failed, on the critical path', `${scheme}: a row is described with its timings (${desc})`);
    const path = await page.evaluate(() => [...document.querySelectorAll('[data-span][data-path="on"]')].map((r) => r.dataset.span).join(','));
    check(path === 'root,auth,db,pay,a1,a2,a3,render', `${scheme}: the critical path is the spans the request waited on (${path})`);
    const fail = await row(page, 'pay').evaluate((r) => ({ word: r.querySelector('.alt-spans-word')?.textContent, icon: !!r.querySelector('.alt-spans-fail svg'), hatch: getComputedStyle(r.querySelector('.alt-spans-bar')).backgroundImage }));
    check(fail.word === 'Failed' && fail.icon && /repeating-linear-gradient/.test(fail.hatch), `${scheme}: a failed span has its word, icon and hatch (${JSON.stringify(fail)})`);

    // Keyboard.
    await row(page, 'root').focus();
    await page.keyboard.press('ArrowDown'); check(await focused(page) === 'auth', `${scheme}: ↓ moves to the next span`);
    await page.keyboard.press('End'); check(await focused(page) === 'render', `${scheme}: End goes to the last span`);
    await page.keyboard.press('Home'); check(await focused(page) === 'root', `${scheme}: Home goes to the first`);
    await row(page, 'a3').focus();
    check(await row(page, 'a3').getAttribute('aria-expanded') === 'false' && await row(page, 'card').count() === 0, `${scheme}: a deep caller starts collapsed, saying what's inside`);
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(50);
    check(await row(page, 'a3').getAttribute('aria-expanded') === 'true' && await row(page, 'card').count() === 1, `${scheme}: → expands a collapsed caller`);
    await page.keyboard.press('ArrowRight'); check(await focused(page) === 'card', `${scheme}: → on an open caller moves to its first child`);
    await page.keyboard.press('ArrowLeft'); check(await focused(page) === 'a3', `${scheme}: ← on a leaf moves to its parent`);
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(50);
    check(await row(page, 'a3').getAttribute('aria-expanded') === 'false', `${scheme}: ← on an open caller collapses it`);

    // Enter opens the detail flush; Space selects.
    await row(page, 'pay').focus();
    await page.keyboard.press('Enter'); await page.waitForTimeout(50);
    const detail = page.locator('.alt-spans-detail');
    check(await detail.count() === 1 && /duplicate idempotency key/.test(await detail.textContent()) && await detail.evaluate((d) => getComputedStyle(d).boxShadow) === 'none', `${scheme}: Enter opens the detail flush beneath`);
    await page.keyboard.press(' ');
    const sel = await row(page, 'pay').evaluate((r) => ({ sel: r.getAttribute('aria-selected'), shadow: getComputedStyle(r).boxShadow, bar: getComputedStyle(r.querySelector('.alt-spans-bar')) }));
    const bar = await row(page, 'pay').evaluate((r) => { const b = getComputedStyle(r.querySelector('.alt-spans-bar')); return { outline: `${b.outlineWidth} ${b.outlineStyle}`, shadow: b.boxShadow, transform: b.transform }; });
    check(sel.sel === 'true' && sel.shadow !== 'none' && bar.outline === '2px solid' && bar.shadow === 'none' && bar.transform === 'none', `${scheme}: Space selects; the row rises, the bar only takes an outline (${JSON.stringify(bar)})`);

    // The critical path off: every bar is data-1 and nothing is said about focus.
    await page.getByRole('switch', { name: 'Highlight the critical path' }).click();
    check(await page.locator('[data-span][data-path]').count() === 0 && await page.locator('.alt-spans[data-focus]').count() === 0, `${scheme}: with the critical path off, colour has no focus`);

    // Phone width: nothing overflows; rows stack.
    await page.setViewportSize({ width: 375, height: 760 }); await page.waitForTimeout(150);
    const narrow = await page.evaluate(() => ({ sideways: document.documentElement.scrollWidth > window.innerWidth, stacked: (() => { const r = document.querySelector('[data-span="pay"]'); const n = r.querySelector('.alt-spans-c-name').getBoundingClientRect(), b = r.querySelector('.alt-spans-c-bar').getBoundingClientRect(); return b.top >= n.bottom - 1; })() }));
    check(!narrow.sideways && narrow.stacked, `${scheme}: at 375px nothing overflows and the bar goes under the name (${JSON.stringify(narrow)})`);

    // Forced colours: bars keep an outline and failed ones a pattern.
    await page.emulateMedia({ forcedColors: 'active' });
    const fc = await row(page, 'pay').evaluate((r) => { const b = getComputedStyle(r.querySelector('.alt-spans-bar')); return { border: b.borderTopStyle, img: b.backgroundImage }; });
    check(fc.border === 'solid' && /repeating-linear-gradient/.test(fc.img), `${scheme}: forced colours keep the outline and the failed pattern`);
    await page.close();
  }
  check(errors.length === 0, `no page or console errors: ${errors.join('\n')}`);
  console.log(`SpanWaterfall: ${passed} passed, 0 failed`);
} finally { await browser.close(); }
