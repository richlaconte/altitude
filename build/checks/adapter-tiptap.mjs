// altitude-design/adapters/tiptap.css with a real Tiptap editor: in both schemes it renders with no page or console
// errors; an empty editor is a well and a filled one rises flush; focus lights the floor; Altitude's Toolbar toggles
// latch with the selection; Tiptap's own keyboard support still works (⌘/Ctrl+B); @ opens the mention list floating at
// level 3 and Enter inserts a flush mention plate; forced colours keep a border, more contrast and reduced motion
// render cleanly. Exits non-zero on a failure.
import { adapterPages } from './adapter-page.mjs';
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const { open, close } = await adapterPages('.storybook/adapters/tiptap-example.jsx', 'TiptapExample');
const editorStyle = (page) => page.evaluate(() => { const e = document.querySelector('.tiptap'), cs = getComputedStyle(e); return { bg: cs.backgroundColor, shadow: cs.boxShadow, border: cs.borderTopStyle, font: cs.fontFamily }; });

for (const scheme of ['daylight', 'nightfall']) {
  const { page, errors } = await open({ scheme });
  const s = await editorStyle(page);
  const ground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(errors.length === 0 && await page.locator('.tiptap[contenteditable="true"]').count() === 1, `${scheme}: renders with no errors (${errors.join('; ')})`);
  expect(s.bg !== ground && s.bg !== 'rgba(0, 0, 0, 0)', `${scheme}: the editor takes the scheme's surface (${s.bg})`);
  await page.close();
}

let { page, errors } = await open({ example: 'EmptyTiptapExample' });
const empty = await editorStyle(page);
expect(/0px [1-9]\d*px 0px 0px inset/.test(empty.shadow), `an empty editor is a well showing its inside wall (${empty.shadow.slice(0, 60)})`);
await page.click('.tiptap');
await page.waitForTimeout(400);
const focused = await editorStyle(page);
expect(focused.bg !== empty.bg, `focus lights the floor (${empty.bg} → ${focused.bg})`);
await page.keyboard.type('Hello');
await page.evaluate(() => document.activeElement.blur());
await page.waitForTimeout(400);
const filled = await editorStyle(page);
expect(filled.bg !== empty.bg && /0px 0px 0px 0px inset/.test(filled.shadow), `filled and unfocused, the floor stays flush (${filled.shadow.slice(0, 50)})`);
await page.click('.tiptap');
await page.keyboard.press('Control+a'); await page.keyboard.press('Meta+a');
await page.keyboard.press(process.platform === 'darwin' ? 'Meta+b' : 'Control+b');
await page.waitForTimeout(200);
expect(await page.locator('.tiptap strong').count() === 1, 'Tiptap’s own shortcut still works (bold)');
expect(await page.getByRole('button', { name: 'Bold' }).getAttribute('aria-pressed') === 'true', 'the Toolbar toggle latches with the selection');
await page.keyboard.press('End');
await page.keyboard.type(' @Th');
await page.waitForTimeout(300);
const list = await page.evaluate(() => { const l = document.querySelector('.alt-rte-mentions'); return l && { shadow: getComputedStyle(l).boxShadow, options: [...l.querySelectorAll('[role="option"]')].map((o) => o.textContent) }; });
expect(list && list.options.join() === 'Theo Marsh' && list.shadow !== 'none', `@ opens the mention list, floating (${JSON.stringify(list?.options)})`);
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
expect(await page.locator('.tiptap [data-type="mention"]').textContent() === '@Theo Marsh', 'Enter inserts a mention plate');
expect(errors.length === 0, `no errors while editing (${errors.join('; ')})`);
await page.close();

({ page, errors } = await open({ forced: true }));
expect(await page.evaluate(() => getComputedStyle(document.querySelector('.tiptap')).borderTopStyle) === 'solid' && errors.length === 0, 'forced colours keep the editor’s border');
await page.close();
({ page, errors } = await open({ contrast: 'more', reduced: true }));
expect(errors.length === 0 && await page.evaluate(() => getComputedStyle(document.querySelector('.tiptap')).transitionDuration.split(',').every((d) => parseFloat(d) === 0)), 'more contrast and reduced motion render cleanly, without transitions');
await page.close();

console.log(`Tiptap adapter: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await close();
