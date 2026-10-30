// altitude-design/adapters/codemirror with a real CodeMirror 6 editor: in both schemes it renders with no page or
// console errors and takes the scheme's surfaces; the editor is a well whose floor lights when focused; the active line
// is a tint, never a height; syntax uses ink, ink-muted and accent-ink only; a lint error sinks its gutter marker into a
// trench on critical-soft with the message in words; CodeMirror's own keyboard still works (typing, undo); forced
// colours keep a border; nothing animates, so reduced motion needs nothing. Exits non-zero on a failure.
import { adapterPages } from './adapter-page.mjs';
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const { open, close } = await adapterPages('.storybook/adapters/codemirror-example.jsx', 'CodeMirrorExample');
const tokens = (page, names) => page.evaluate((names) => { const d = document.createElement('div'); document.body.appendChild(d);
  const out = Object.fromEntries(names.map((n) => { d.style.color = `var(--${n})`; return [n, getComputedStyle(d).color]; })); d.remove(); return out; }, names);

for (const scheme of ['daylight', 'nightfall']) {
  const { page, errors } = await open({ scheme });
  const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.cm-editor')).backgroundColor);
  const well = await page.evaluate(() => { const d = document.createElement('div'); d.style.background = 'var(--surface-well)'; document.body.appendChild(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c; });
  expect(errors.length === 0 && await page.locator('.cm-editor .cm-content[contenteditable="true"]').count() === 1, `${scheme}: renders with no errors (${errors.join('; ')})`);
  expect(bg === well, `${scheme}: the editor is the scheme's well (${bg})`);
  await page.close();
}

let { page, errors } = await open();
const shadow = await page.evaluate(() => getComputedStyle(document.querySelector('.cm-editor')).boxShadow);
expect(/0px 4px 0px 0px inset/.test(shadow), 'the editor is an opening with its inside wall');
await page.click('.cm-content');
await page.waitForTimeout(400);
const ink = await tokens(page, ['ink', 'ink-muted', 'accent-ink', 'critical']);
const raised = await page.evaluate(() => { const d = document.createElement('div'); d.style.background = 'var(--surface-raised)'; document.body.appendChild(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c; });
expect(await page.evaluate(() => getComputedStyle(document.querySelector('.cm-editor')).backgroundColor) === raised, 'focus lights the floor');
const active = await page.evaluate(() => { const l = document.querySelector('.cm-activeLine'), cs = getComputedStyle(l); return { bg: cs.backgroundColor, shadow: cs.boxShadow, transform: cs.transform }; });
expect(active.bg !== 'rgba(0, 0, 0, 0)' && active.shadow === 'none' && active.transform === 'none', `the active line is a tint, not a height (${JSON.stringify(active)})`);
const colours = await page.evaluate(() => [...new Set([...document.querySelectorAll('.cm-line span')].map((s) => getComputedStyle(s).color))]);
expect(colours.length >= 2 && colours.every((c) => Object.values(ink).includes(c)), `syntax uses ink, ink-muted and accent-ink only (${colours.join(' | ')})`);
await page.waitForTimeout(600);
const lint = await page.evaluate(() => { const m = document.querySelector('.cm-lint-marker-error'); if (!m) return null; const cs = getComputedStyle(m); return { bg: cs.backgroundColor, shadow: cs.boxShadow, image: cs.backgroundImage }; });
const soft = await page.evaluate(() => { const d = document.createElement('div'); d.style.background = 'var(--critical-soft)'; document.body.appendChild(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c; });
expect(lint && lint.bg === soft && /inset/.test(lint.shadow) && lint.image === 'none', `a lint error sinks its marker into a trench on critical-soft (${JSON.stringify(lint)})`);
await page.hover('.cm-lint-marker-error');
await page.waitForTimeout(600);
expect(/Expected|Unexpected|property|token/i.test(await page.evaluate(() => document.querySelector('.cm-tooltip')?.textContent || '')), 'and the message is in words');
await page.click('.cm-content');
await page.keyboard.press(process.platform === 'darwin' ? 'Meta+End' : 'Control+End');
await page.keyboard.type('\n');
await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
await page.waitForTimeout(200);
expect(await page.evaluate(() => document.querySelectorAll('.cm-line').length) === 7, 'CodeMirror’s own keys still work (type, undo)');
expect(errors.length === 0, `no errors while editing (${errors.join('; ')})`);
await page.close();

({ page, errors } = await open({ forced: true }));
expect(await page.evaluate(() => getComputedStyle(document.querySelector('.cm-editor')).borderTopStyle) === 'solid' && errors.length === 0, 'forced colours keep the editor’s border');
await page.close();
({ page, errors } = await open({ reduced: true, contrast: 'more' }));
await page.click('.cm-content');
await page.waitForTimeout(300);
expect(errors.length === 0 && await page.evaluate(() => [document.querySelector('.cm-editor'), ...document.querySelectorAll('.cm-editor *')].every((e) => { const cs = getComputedStyle(e); return cs.animationName === 'none' && cs.transitionDuration.split(',').every((d) => parseFloat(d) === 0); })), 'nothing in the editor animates; more contrast renders cleanly');
await page.close();

console.log(`CodeMirror adapter: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await close();
