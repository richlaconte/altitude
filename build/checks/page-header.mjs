// PageHeader: a header with the page's h1 and description, the actions in order (secondary, "More actions", primary
// last) with exactly one level-2 primary; it lies on the ground, and a sticky one rises one level only when content
// passes under it, spanning the page's padding; a primary Button in `actions` warns in development. Run after a render
// of every preview (it opens test/p-PageHeader-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
const warnings = [];
page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });
await page.goto(`file://${T}p-PageHeader-daylight.html`);
await page.waitForTimeout(400);

const read = () => page.evaluate(() => {
  const h = document.querySelector('.alt-page-head'), cs = getComputedStyle(h), box = document.querySelector('.ph').getBoundingClientRect(), r = h.getBoundingClientRect();
  return { tag: h.tagName, h1: h.querySelector('h1')?.textContent, desc: h.querySelector('.alt-page-head-desc')?.textContent,
    actions: [...h.querySelectorAll('.alt-page-head-actions .alt-btn')].map((b) => `${b.dataset.variant}:${b.getAttribute('aria-label') ?? b.textContent}`),
    shadow: cs.boxShadow, bg: cs.backgroundColor, under: h.hasAttribute('data-under'), top: r.top - box.top, left: r.left - box.left, right: box.right - r.right };
});
let r = await read();
expect(r.tag === 'HEADER' && r.h1 === 'Members' && r.desc === 'People who can see and edit this workspace.', 'a header with the page\'s h1 and description');
expect(r.actions.join(',') === 'secondary:Export list,secondary:More actions,primary:Invite members', `secondary, More actions, then the one primary last (${r.actions})`);
expect(r.actions.filter((a) => a.startsWith('primary')).length === 1, 'exactly one primary');
expect(r.shadow === 'none' && !r.under, 'at rest it lies on the ground');
expect(warnings.length === 0, 'a correct header warns about nothing');

await page.evaluate(() => { document.querySelector('.ph').scrollTop = 160; });
await page.waitForTimeout(400);
r = await read();
expect(r.under && r.shadow !== 'none' && Math.abs(r.top - 1) < 2, `sticky: it stays at the top and rises when content passes under it (${r.top})`);
expect(r.left < 2 && r.right < 2, `its rise spans the page's padding (${r.left}, ${r.right})`);
await page.evaluate(() => { document.querySelector('.ph').scrollTop = 0; });
await page.waitForTimeout(400);
expect(!(await read()).under, 'back at the top, it settles');

await page.click('[aria-label="More actions"]');
await page.waitForTimeout(300);
expect(await page.locator('.alt-menu [role="menuitem"]').count() === 2, 'More actions opens the overflow menu');

// A second primary among the actions warns, naming law 1.
await page.evaluate(() => new Promise((done) => {
  const d = document.createElement('div'); document.body.append(d);
  const A = window.Altitude, h = React.createElement;
  ReactDOM.createRoot(d).render(h(A.AltitudeProvider, null, h(A.PageHeader, { primary: h(A.Button, { variant: 'primary' }, 'Save'), actions: h(A.Button, { variant: 'primary' }, 'Publish') }, h(A.PageHeaderTitle, null, 'Post'))));
  setTimeout(done, 300);
}));
expect(warnings.some((w) => w.includes('Law 1')), `a primary in actions warns, naming law 1 (${warnings.join(' | ')})`);

console.log(`PageHeader: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
