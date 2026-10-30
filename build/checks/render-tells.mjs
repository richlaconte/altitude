// The tells of generated interfaces that only show once a page is rendered (Distinctiveness, #321). Warnings, never
// failures: a row of genuinely equal items is legitimate, as Charts says of dashboard cards, so a person decides.
//   LA4  three or more sibling surfaces of the same size, laid out together, none of them leading: no primary action and
//        no larger title in one of them;
//   LA6  a view of eight or more different sections stacked with one gap, so nothing groups.
// It opens every preview (test/p-<Name>-daylight.html, after a render or PAGES_ONLY=1) at 960 CSS px. An element inside
// [data-tells-ignore="<id> <reason>"] is skipped for that id. TY5 (a font that never loads) is in tells-lint.mjs: the
// preview pages leave the font import out on purpose, so it can't be judged here.
//   node checks/render-tells.mjs              every preview
//   node checks/render-tells.mjs Card,Stat    just these
import { chromium } from 'playwright-core';
import { existsSync, readdirSync } from 'fs';
const T = new URL('../test/', import.meta.url).pathname;
const root = new URL('../..', import.meta.url).pathname;
const names = process.argv[2] ? process.argv[2].split(',') : readdirSync(root + 'project/components').filter((d) => existsSync(`${root}project/components/${d}/preview.html`)).sort();
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});

const measure = () => {
  const out = [];
  const ignored = (e, id) => { const s = e.closest('[data-tells-ignore]'); return !!s && new RegExp(`\\b${id}\\s+[A-Za-z]`).test(s.dataset.tellsIgnore); };
  const visible = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity !== 0; };
  const name = (e) => `${e.tagName.toLowerCase()}${typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`;
  const transparent = (c) => c === 'rgba(0, 0, 0, 0)' || c === 'transparent';
  const surface = (e) => { const cs = getComputedStyle(e); return cs.boxShadow !== 'none' || (!transparent(cs.backgroundColor) && cs.backgroundColor !== getComputedStyle(e.parentElement).backgroundColor && parseFloat(cs.borderTopLeftRadius) > 0); };
  const near = (a, b, t) => Math.abs(a - b) <= t * Math.max(a, b);
  const leads = (e) => !!e.querySelector('.alt-btn[data-variant="primary"]') || [...e.querySelectorAll('*')].some((x) => parseFloat(getComputedStyle(x).fontSize) >= 28 && x.textContent.trim());
  for (const p of document.body.querySelectorAll('*')) {
    const kids = [...p.children].filter(visible);
    if (kids.length < 3) continue;
    // LA4: a set of same-sized cards, in a row or a grid, none leading.
    const cards = kids.filter((k) => { const r = k.getBoundingClientRect(); return r.width >= 120 && r.height >= 64 && surface(k); });
    if (cards.length >= 3 && cards.length >= kids.length * 0.75 && !ignored(p, 'LA4')) {
      const rs = cards.map((c) => c.getBoundingClientRect());
      const w = rs.map((r) => r.width).sort((a, b) => a - b)[rs.length >> 1], h = rs.map((r) => r.height).sort((a, b) => a - b)[rs.length >> 1];
      const same = rs.every((r) => near(r.width, w, 0.05) && near(r.height, h, 0.05));
      const together = rs.some((r, i) => rs.some((q, j) => i !== j && Math.abs(r.top - q.top) < 2));
      const leading = cards.filter(leads).length;
      if (same && together && (leading === 0 || leading === cards.length))
        out.push(['LA4', `${cards.length} equal surfaces (${Math.round(w)}×${Math.round(h)}) in ${name(p)}, none leading`]);
    }
    // LA6: different sections, stacked, all one gap apart.
    if (kids.length >= 8 && !ignored(p, 'LA6')) {
      const rs = kids.map((k) => k.getBoundingClientRect());
      const stacked = rs.every((r, i) => i === 0 || r.top >= rs[i - 1].bottom - 1);
      const kinds = new Set(kids.map((k) => k.tagName + '.' + (typeof k.className === 'string' ? k.className.split(/\s+/)[0] : ''))).size;
      const gaps = new Set(rs.slice(1).map((r, i) => Math.round(r.top - rs[i].bottom)));
      if (stacked && kinds >= 3 && gaps.size === 1 && [...gaps][0] > 0) out.push(['LA6', `${kids.length} sections in ${name(p)}, all ${[...gaps][0]}px apart`]);
    }
  }
  return out;
};

const findings = [];
for (const n of names) {
  const file = `${T}p-${n}-daylight.html`;
  if (!existsSync(file)) { console.error(`render-tells: no ${file}; render first (node shoot.mjs "" daylight 960, or PAGES_ONLY=1)`); process.exit(1); }
  const page = await browser.newPage({ viewport: { width: 960, height: 900 } });
  await page.goto('file://' + file);
  await page.waitForTimeout(600);
  for (const [id, text] of await page.evaluate(measure)) findings.push({ id, name: n, text });
  await page.close();
}
await browser.close();

for (const f of findings) console.log(process.env.GITHUB_ACTIONS ? `::warning title=Tell ${f.id} in ${f.name}::${f.text}` : `${f.id}  ${f.name}: ${f.text}`);
console.log(`render-tells: ${names.length} previews, ${findings.length} warning(s)${findings.length ? '. Each is a judgement: give one thing the lead, group with spacing, or mark it data-tells-ignore="<id> <reason>" (project/Distinctiveness.md).' : ''}`);
