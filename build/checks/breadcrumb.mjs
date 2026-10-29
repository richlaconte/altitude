// Breadcrumb: a nav labelled "Breadcrumb" with an ordered list, links for ancestors and aria-current="page" on the last
// step; each deeper step is a taller slab on one ground line; ancestors lift when pointed at and the current step
// doesn't; maxItems keeps the ends with the middle behind a named "…" menu button whose items navigate; renderLink is
// used; nothing animates on a route change. Run after a render of every preview (it opens
// test/p-Breadcrumb-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-Breadcrumb-daylight.html`);
await page.waitForTimeout(400);

const read = (i) => page.evaluate((i) => {
  const nav = document.querySelectorAll('.alt-breadcrumb')[i];
  // Each step is lifted by its wall's height (translateY(−wall)) and the wall is drawn under it back to the ground.
  const steps = [...nav.querySelectorAll('li')].map((li) => { const el = li.querySelector('.alt-crumb-link'), r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return { tag: el.tagName, text: el.textContent, href: el.getAttribute('href'), current: el.getAttribute('aria-current'), label: el.getAttribute('aria-label'), wall: -new DOMMatrix(cs.transform).m42, top: r.top, bottom: r.bottom - new DOMMatrix(cs.transform).m42, anim: cs.animationName }; });
  return { label: nav.getAttribute('aria-label'), list: nav.querySelector('ol') !== null, steps };
}, i);

const a = await read(0);
expect(a.label === 'Breadcrumb' && a.list, 'a nav labelled "Breadcrumb" with an ordered list');
expect(a.steps.map((s) => s.tag).join() === 'A,A,SPAN' && a.steps[2].current === 'page' && a.steps[0].current === null, 'ancestors are links; the last step is the current page');
expect(a.steps[0].wall < a.steps[1].wall && a.steps[1].wall < a.steps[2].wall, `each deeper step is a taller slab (${a.steps.map((s) => s.wall)})`);
expect(Math.max(...a.steps.map((s) => s.bottom)) - Math.min(...a.steps.map((s) => s.bottom)) < 1, 'every step stands on the same ground line');
expect(a.steps.every((s) => s.anim === 'none'), 'nothing animates when the route renders');

await page.hover('.alt-breadcrumb >> nth=0 >> a >> nth=0');
await page.waitForTimeout(300);
const hovered = await read(0);
expect(hovered.steps[0].wall > a.steps[0].wall, 'an ancestor lifts when pointed at');
await page.hover('.alt-breadcrumb >> nth=0 >> .alt-crumb-page');
await page.waitForTimeout(300);
expect((await read(0)).steps[2].wall === a.steps[2].wall, 'the current page doesn\'t');

const b = await read(1);
expect(b.steps.map((s) => s.text).join('|') === 'Projects|…|Issues|Billing page|Comments', `maxItems keeps the ends (${b.steps.map((s) => s.text).join('|')})`);
expect(b.steps[1].label === 'Show 2 more levels', `"…" is named for what it hides (${b.steps[1].label})`);
expect(b.steps[0].href === '#/projects', 'renderLink renders the links');
await page.click('[aria-label="Show 2 more levels"]');
await page.waitForTimeout(300);
const items = await page.evaluate(() => [...document.querySelectorAll('.alt-menu [role="menuitem"]')].map((m) => m.textContent));
expect(items.join('|') === 'Atlas|Q4 launch', `the menu holds the hidden steps (${items.join('|')})`);
await page.click('.alt-menu [role="menuitem"] >> text=Atlas');
await page.waitForTimeout(200);
expect(await page.evaluate(() => location.hash) === '#/projects/atlas', 'choosing one follows its href');

console.log(`Breadcrumb: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
