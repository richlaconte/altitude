// altitude-design/adapters/react-flow.css with a real React Flow canvas: in all four schemes it renders with no page or
// console errors and the canvas is the scheme's ground with a dot grid in line; nodes are raised cards at level 1 that
// lift when pointed at and float at level 3 while dragged; a selected node gets a rim, not height; a running node hovers
// and a failed one lies in a trench; ports are openings that sink to a trench with the accent rim under an edge being
// drawn, which is dashed; React Flow's keyboard still works (Tab to a node, arrow keys move it); the minimap is a well;
// forced colours give nodes a border; reduced motion stops the hover. Exits non-zero on a failure.
import { adapterPages } from './adapter-page.mjs';
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const { open, close } = await adapterPages('.storybook/adapters/react-flow-example.jsx', 'ReactFlowExample');
const colour = (page, v) => page.evaluate((v) => { const d = document.createElement('div'); d.style.background = `var(--${v})`; document.body.appendChild(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c; }, v);
const node = (page, id) => page.evaluate((id) => { const n = document.querySelector(`.react-flow__node[data-id="${id}"]`), cs = getComputedStyle(n); return { bg: cs.backgroundColor, shadow: cs.boxShadow, anim: cs.animationName, border: cs.borderTopStyle }; }, id);

for (const scheme of ['daylight', 'nightfall', 'mesa', 'alpine']) {
  const { page, errors } = await open({ scheme });
  const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.react-flow')).backgroundColor);
  expect(errors.length === 0 && await page.locator('.react-flow__node').count() === 4, `${scheme}: renders with no errors (${errors.join('; ')})`);
  expect(bg === await colour(page, 'surface-ground') && (await node(page, 'done')).bg === await colour(page, 'surface-raised'), `${scheme}: ground canvas, raised nodes`);
  await page.close();
}

let { page, errors } = await open();
expect(await page.locator('.react-flow__background pattern circle, .react-flow__background circle').count() > 0, 'the canvas has a dot grid');
const rest = await node(page, 'done');
await page.hover('.react-flow__node[data-id="done"]');
await page.waitForTimeout(300);
const hover = await node(page, 'done');
expect(rest.shadow !== hover.shadow, 'a node lifts one level when pointed at');
await page.click('.react-flow__node[data-id="done"]');
await page.waitForTimeout(200);
expect(/0px 0px 0px 2px/.test((await node(page, 'done')).shadow), 'a selected node gets a rim');
const box = await page.locator('.react-flow__node[data-id="done"]').boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 20, { steps: 6 });
await page.waitForTimeout(150);
const held = await page.evaluate(() => { const n = document.querySelector('.react-flow__node[data-id="done"]'); return { dragging: n.classList.contains('dragging'), shadow: getComputedStyle(n).boxShadow }; });
await page.mouse.up();
expect(held.dragging && held.shadow !== rest.shadow, 'a dragged node is in your hand: it floats higher');
expect((await node(page, 'fetch')).anim === 'alt-flow-hover', 'a running node hovers as a pending write');
const failed = await node(page, 'notify');
expect(failed.bg === await colour(page, 'critical-soft') && /inset/.test(failed.shadow), 'a failed node lies in a trench');

const src = await page.locator('.react-flow__node[data-id="notify"] .react-flow__handle.source').boundingBox();
const tgt = await page.locator('.react-flow__node[data-id="done"] .react-flow__handle.target').boundingBox();
await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
await page.mouse.down();
await page.mouse.move(tgt.x + tgt.width / 2, tgt.y + tgt.height / 2, { steps: 10 });
await page.waitForTimeout(200);
const drawing = await page.evaluate(() => { const p = document.querySelector('.react-flow__connection-path'), h = document.querySelector('.react-flow__handle.connectingto');
  return { dash: p && getComputedStyle(p).strokeDasharray, port: h && getComputedStyle(h).boxShadow }; });
await page.mouse.up();
expect(drawing.dash && drawing.dash !== 'none', `the edge being drawn is dashed (${drawing.dash})`);
expect(drawing.port && /0px 0px 0px 2px/.test(drawing.port), `the port it can land on sinks with the accent rim (${drawing.port?.slice(0, 50)})`);
await page.waitForTimeout(200);
expect(await page.locator('.react-flow__edge').count() === 4, 'and dropping it connects');

await page.locator('.react-flow__node[data-id="trigger"]').focus();
await page.keyboard.press('Enter');
const before = await page.evaluate(() => document.querySelector('.react-flow__node[data-id="trigger"]').style.transform);
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(200);
expect(before !== await page.evaluate(() => document.querySelector('.react-flow__node[data-id="trigger"]').style.transform), 'React Flow’s keyboard still works (Enter selects, arrow keys move)');
expect(await page.evaluate(() => getComputedStyle(document.querySelector('.react-flow__minimap')).backgroundColor) === await colour(page, 'surface-well'), 'the minimap is a well');
expect(errors.length === 0, `no errors while working (${errors.join('; ')})`);
await page.close();

({ page, errors } = await open({ forced: true }));
expect((await node(page, 'done')).border === 'solid' && errors.length === 0, 'forced colours give nodes a border');
await page.close();
({ page, errors } = await open({ reduced: true, contrast: 'more' }));
expect((await node(page, 'fetch')).anim === 'none' && errors.length === 0, 'reduced motion stops the hover; more contrast renders cleanly');
await page.close();

console.log(`React Flow adapter: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await close();
