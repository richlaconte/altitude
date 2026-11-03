// BoardCard's structure (#457): a card is a group named by its label; its draggable button is a face with no children,
// so nothing interactive is nested in a button (axe nested-interactive) and the face's name is the label alone, not the
// label plus its buttons' text. Rename and Edit come after the face in the Tab order; a press on the card's text focuses
// the face; focusing the card element (as Board's refocus and apps do) lands on the face; the card draws the face's
// focus ring. Run after a render of every preview (it opens test/p-Board-daylight.html).
import { chromium } from 'playwright-core';
import { createRequire } from 'node:module';
import { fixturePath } from './fixture-path.mjs';
const require = createRequire(import.meta.url);
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
let pass = 0, fail = 0;
const check = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`file://${fixturePath('Board')}`);
await page.waitForSelector('[data-board-card="c1"]');
await page.waitForTimeout(500);

await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
const axe = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'rule', values: ['nested-interactive', 'aria-allowed-attr', 'aria-allowed-role', 'aria-prohibited-attr', 'button-name'] } }));
check(axe.violations.length === 0, `axe is clean on the board (${axe.violations.map((v) => `${v.id}: ${v.nodes.length} (${v.nodes[0]?.target})`).join(', ')})`);

const card = page.locator('[data-board-card="c1"]');
const s = await card.evaluate((c) => {
  const face = c.querySelector(':scope > .alt-board-card-face');
  return { role: c.getAttribute('role'), name: c.getAttribute('aria-label'), label: c.dataset.label, faceRole: face?.getAttribute('role'), faceName: face?.getAttribute('aria-label'),
    faceKids: face?.children.length, faceText: face?.textContent, faceTab: face?.tabIndex, cardTab: c.tabIndex, roledesc: face?.getAttribute('aria-roledescription'),
    nestedInFace: face?.querySelectorAll('button, a, input').length, toolsSibling: !!c.querySelector(':scope > .alt-board-card-tools') };
});
check(s.role === 'group' && s.name === s.label, `the card is a group named by its label (${s.role}, ${s.name})`);
check(s.faceRole === 'button' && s.roledesc === 'draggable card' && s.faceName === s.label, `its face is a draggable-card button named by the label alone (${s.faceName})`);
check(s.faceKids === 0 && s.faceText === '' && s.nestedInFace === 0, 'the face has no children, so nothing is nested in it');
check(s.toolsSibling, 'Rename and Edit are the face\'s siblings');
check(s.faceTab === 0 && s.cardTab === -1, 'the face is in the Tab order; the card element isn\'t');

// Chromium's computed name for the face: the label, not "label meta Rename label".
const cdp = await page.context().newCDPSession(page);
const { nodes } = await cdp.send('Accessibility.getFullAXTree');
const faces = nodes.filter((n) => n.roleDescription?.value === 'draggable card' || (n.properties || []).some((p) => p.name === 'roledescription' && p.value?.value === 'draggable card'));
const named = faces.map((n) => n.name?.value);
check(named.length >= 6 && named.every((n) => n && !/Rename|Edit|·/.test(n)), `every face's computed name is the label alone (${named.slice(0, 3).join(' | ')})`);

// Tab order: the face, then the card's tools.
await card.evaluate((c) => c.focus());
const first = await page.evaluate(() => document.activeElement?.matches('[data-board-card="c1"] > .alt-board-card-face'));
check(first, 'focusing the card element lands on its face');
const ring = await card.evaluate((c) => getComputedStyle(c).outlineStyle);
await page.keyboard.press('Tab');
const next = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
check(/^Rename /.test(next ?? ''), `Tab goes from the face to Rename (${next})`);
await page.keyboard.press('Shift+Tab');
check(await page.evaluate(() => document.activeElement?.matches('[data-board-card="c1"] > .alt-board-card-face')) && await card.evaluate((c) => getComputedStyle(c).outlineStyle) === 'solid', `the card draws the face's keyboard focus ring (${ring} after a script focus)`);

// A press on the card's text focuses its face (and doesn't pick it up: no move, nothing carried).
await page.mouse.click(10, 10);
const text = await card.evaluate((c) => { const t = [...c.children].find((e) => !e.matches('.alt-board-card-face, .alt-board-card-tools')); const r = t.getBoundingClientRect(); return { x: r.left + 4, y: r.top + r.height / 2 }; });
await page.mouse.click(text.x, text.y); await page.waitForTimeout(150);
check(await page.evaluate(() => document.activeElement?.matches('[data-board-card="c1"] > .alt-board-card-face')) && await card.getAttribute('data-carried') === null, 'a click on the card\'s text focuses its face without carrying it');
// A press on the card's padding lands on the face itself.
const box = await card.boundingBox();
await page.mouse.click(10, 10);
await page.mouse.click(box.x + box.width - 3, box.y + box.height - 3); await page.waitForTimeout(150);
check(await page.evaluate(() => document.activeElement?.matches('[data-board-card="c1"] > .alt-board-card-face')), 'a click on the card\'s padding focuses its face');
check(errors.length === 0, `no page errors (${errors.slice(0, 2).join(' | ')})`);

await browser.close();
console.log(`BoardCard names: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
