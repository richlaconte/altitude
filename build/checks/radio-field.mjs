// RadioGroup in a Field (#442): the group is named by Field's label through aria-labelledby (a <label for> can't name a
// radiogroup); error and required reach it as aria-describedby, aria-invalid and aria-required, never native required
// on the radios; focusing the group (an ErrorSummary link) lands on the checked radio, else the first enabled one, so
// the arrow keys work at once; a click on blank space selects nothing; invalid tracks keep a critical rim, on hover too,
// while a disabled option keeps its disabled reading; forced colours outline the whole group; axe is clean on the
// fields. Run after a render of every preview (it opens test/p-RadioGroup-daylight.html and mounts its own cases).
import { chromium } from 'playwright-core';
import { createRequire } from 'node:module';
import { fixturePath } from './fixture-path.mjs';
const require = createRequire(import.meta.url);
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
let pass = 0, fail = 0;
const check = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`file://${fixturePath('RadioGroup')}`);
await page.waitForFunction(() => window.Altitude && window.React && document.querySelector('.alt-radio-group'));

// Two cases of our own beside the preview: a chosen time the server refused, and a list whose first option is booked.
await page.evaluate(() => {
  const { createElement: h } = window.React, A = window.Altitude;
  const host = document.createElement('div'); host.id = 'cases'; document.body.append(host);
  const times = () => ['09:00', '09:30', '10:30'].map((t, i) => h(A.Radio, { key: t, value: t, label: t, disabled: i === 0, description: i === 0 ? 'Booked' : undefined }));
  window.ReactDOM.createRoot(host).render(h(A.AltitudeProvider, null,
    h(A.Field, { label: 'Refused time', error: 'That time was just booked.' }, h(A.RadioGroup, { id: 'refused', defaultValue: '10:30', orientation: 'horizontal' }, times())),
    h(A.Field, { label: 'Open time', required: true, error: 'Choose a time.' }, h(A.RadioGroup, { id: 'open', defaultValue: '', orientation: 'horizontal' }, times())),
    h(A.Field, { label: 'Plain time' }, h(A.RadioGroup, { id: 'plain', defaultValue: '09:30', 'aria-labelledby': 'extra-name' }, times()))));
});
await page.waitForSelector('#plain');
await page.waitForTimeout(400);

const invoice = page.getByRole('radiogroup', { name: 'Send invoices by' });
check(await invoice.count() === 1, 'the group is named by Field\'s label');
const a = await invoice.evaluate((g) => ({
  invalid: g.getAttribute('aria-invalid'), required: g.getAttribute('aria-required'), tab: g.tabIndex,
  described: (g.getAttribute('aria-describedby') || '').split(/\s+/).map((id) => document.getElementById(id)?.textContent).join(' '),
  label: document.getElementById(g.getAttribute('aria-labelledby'))?.tagName, nativeRequired: g.querySelectorAll('input[required]').length,
  invalidAttr: g.hasAttribute('invalid'),
}));
check(a.invalid === 'true' && /Choose how invoices reach you/.test(a.described), `aria-invalid and aria-describedby come from error (${JSON.stringify(a)})`);
check(a.required === 'true' && a.nativeRequired === 0, `required is aria-required on the group, never native required on the radios (${a.required}, ${a.nativeRequired})`);
check(a.label === 'SPAN' && !a.invalidAttr, `the label is a span the group points at, and invalid isn't left on the DOM (${a.label})`);
check(a.tab === -1, 'the group is focusable but never in the Tab order');
const plainNames = await page.locator('#plain').getAttribute('aria-labelledby');
check(plainNames.split(' ').includes('extra-name') && plainNames.split(' ').length === 2, `Field merges its label into an aria-labelledby the group already has (${plainNames})`);

// Focus sent to the group goes on to a radio.
const focusGroup = (id) => page.evaluate((id) => { document.getElementById(id).focus(); const f = document.activeElement; return f?.type === 'radio' ? f.value : f?.id || f?.tagName; }, id);
check(await focusGroup('refused') === '10:30', 'focusing a group with a refused choice lands on the checked radio');
check(await focusGroup('open') === '09:30', 'focusing a group with nothing chosen lands on the first enabled radio, skipping the booked one');
const invoiceId = await invoice.getAttribute('id');
check(await focusGroup(invoiceId) === 'email', 'an ErrorSummary-style link to the Field\'s group lands on its first radio');
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
check(await page.locator('input[value="post"]').isChecked() && await page.locator('.alt-field-error', { hasText: 'Choose how invoices reach you' }).count() === 0, 'the arrow keys work at once from there, and choosing clears the error');

// A click on blank space inside the group selects nothing.
const before = await page.evaluate(() => [...document.querySelectorAll('#open input')].map((i) => i.checked).join());
const box = await page.locator('#open').boundingBox();
await page.mouse.click(box.x + box.width - 3, box.y + box.height / 2); await page.waitForTimeout(150);
const after = await page.evaluate(() => [...document.querySelectorAll('#open input')].map((i) => i.checked).join());
check(before === after, `a click on blank space selects nothing (${before} → ${after})`);

// A click on a label chooses it and focuses it, without a hop to the radio that was checked (a hop can scroll a long
// list under the pointer between press and release).
await page.evaluate(() => { window.__hops = []; document.addEventListener('focusin', (e) => window.__hops.push(e.target.value || e.target.id), true); });
await page.locator('#refused label', { hasText: '09:30' }).click(); await page.waitForTimeout(150);
const visited = await page.evaluate(() => window.__hops);
check(await page.locator('#refused input[value="09:30"]').isChecked() && !visited.includes('10:30') && visited.at(-1) === '09:30', `a click on a label chooses and focuses it, never visiting the old choice (${visited.join(' → ')})`);
await page.locator('#refused label', { hasText: '10:30' }).click(); await page.waitForTimeout(150);

// Invalid tracks: critical rim, kept on hover; a disabled option keeps its disabled reading; a refused choice is ringed.
const critical = await page.evaluate(() => { const p = document.createElement('i'); p.style.color = 'var(--critical)'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; });
const rim = (sel) => page.locator(sel).evaluate((t) => getComputedStyle(t).borderTopColor);
check(await rim('#open label:nth-of-type(2) .alt-check-track') === critical, 'an invalid group\'s unchosen track has a critical rim');
await page.hover('#open label:nth-of-type(2)'); await page.waitForTimeout(300);
check(await rim('#open label:nth-of-type(2) .alt-check-track') === critical, 'and keeps it on hover');
check(await rim('#open label:nth-of-type(1) .alt-check-track') !== critical, 'a booked option in an invalid group keeps its disabled rim');
check(await page.locator('#refused label:nth-of-type(3) .alt-check-track').evaluate((t) => getComputedStyle(t).boxShadow).then((s) => s.includes(critical.replace(/\s/g, ' '))), 'a refused choice keeps its accent and gets a critical ring');
check(await rim('#plain label:nth-of-type(2) .alt-check-track') !== critical, 'a valid group\'s tracks are unchanged');

// Forced colours: the tracks are dashed already, so the whole group is outlined.
await page.emulateMedia({ forcedColors: 'active' });
check(await page.locator('#open').evaluate((g) => getComputedStyle(g).outlineStyle) === 'dashed', 'under forced colours an invalid group is outlined, dashed');
check(await page.locator('#plain').evaluate((g) => getComputedStyle(g).outlineStyle) !== 'dashed', 'and a valid one isn\'t');
await page.emulateMedia({ forcedColors: 'none' });

// axe on the fields.
await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
const axe = await page.evaluate(() => window.axe.run({ include: [['.alt-field']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] } }));
check(axe.violations.length === 0, `axe is clean on the fields (${axe.violations.map((v) => `${v.id}: ${v.nodes.length}`).join(', ')})`);
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);

await browser.close();
console.log(`RadioGroup in a Field: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
