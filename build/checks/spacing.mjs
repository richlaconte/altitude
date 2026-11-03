// Spacing traps (README, "Spacing and radius"), measured on every rendered preview at 960 CSS px:
//   SP1  a control (button, field, select) closer than space-2 to an edge of the drawn surface around it: a card,
//        panel or group with a border or shadow and rounded corners. Cramped, and the shapes' corners collide. A
//        raised button's lip counts as part of it.
//   SP2  two rounded siblings that each draw a surface (fill, border or shadow) touching, with no seam of ground
//        between them. A table row's slab is its first cell's ::before, so rows are measured by that.
//   SP3  a control cut off: part of it lies outside an ancestor that clips (overflow other than visible), usually
//        because it reaches past its column with a negative margin.
// A finding inside [data-spacing-ignore="<id> <reason>"] is skipped for that id. Components whose traps only show while
// editing are opened first (OPEN below), and measured again open; ACT runs extra script, as in shoot.mjs.
//   PAGES_ONLY=1 node shoot.mjs && node checks/spacing.mjs          every preview
//   node checks/spacing.mjs EditRegion,Table                        just these
// Findings listed in spacing-known.json are reported but don't fail; it exits non-zero on any other.
import { chromium } from 'playwright-core';
import { existsSync, readdirSync, readFileSync } from 'fs';
const T = new URL('../test/', import.meta.url).pathname;
const root = new URL('../..', import.meta.url).pathname;
const names = process.argv[2] ? process.argv[2].split(',') : readdirSync(root + 'project/components').filter((d) => existsSync(`${root}project/components/${d}/preview.html`)).sort();
// Editing states, measured as well as the resting page.
const OPEN = {
  EditRegion: async (page) => { await page.locator('.alt-edit-region-view button', { hasText: /^Edit/ }).first().click(); },
  // Every InlineEdit's parent clips, as a card or a table cell can: an open field must still fit (SP3).
  InlineEdit: async (page) => { await page.addStyleTag({ content: ':has(> .alt-inline-edit) { overflow: hidden; }' }); for (const b of await page.locator('.alt-inline-edit-slot-button, .alt-inline-edit button[aria-label^="Edit"]').all()) await b.click().catch(() => {}); },
};
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});

const measure = () => {
  const out = [];
  const ignored = (e, id) => { const s = e.closest('[data-spacing-ignore]'); return !!s && new RegExp(`\\b${id}\\s+[A-Za-z]`).test(s.dataset.spacingIgnore); };
  const shown = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  const name = (e) => `${e.tagName.toLowerCase()}${typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`;
  const clear = (c) => c === 'rgba(0, 0, 0, 0)' || c === 'transparent';
  const CONTROL = 'button, .alt-btn, .alt-input, .alt-select-trigger, select, textarea, [role="combobox"], [role="switch"]';
  // A control is the outermost of nested control boxes (an Input's inner <input>, a Select's trigger in its .alt-input).
  const controls = [...document.querySelectorAll(CONTROL)].filter((c) => shown(c) && !c.parentElement.closest(CONTROL) && !c.closest('.alt-sr, [aria-hidden="true"]'));
  const radius = (cs) => parseFloat(cs.borderTopLeftRadius) || 0;
  // A shadow that draws something: some layer with a colour that isn't fully transparent and some size.
  const shadowed = (v) => v !== 'none' && v.split(/,(?![^(]*\))/).some((sh) => !/rgba\([^)]*,\s*0\)/.test(sh) && (sh.match(/-?[\d.]+px/g) || []).some((n) => parseFloat(n) !== 0));
  // The colour showing behind an element: its nearest ancestor that paints one.
  const behind = (e) => { for (let a = e.parentElement; a; a = a.parentElement) { const c = getComputedStyle(a).backgroundColor; if (!clear(c)) return c; } return 'rgb(255, 255, 255)'; };
  const drawn = (e) => {
    const cs = getComputedStyle(e);
    const border = ['Top', 'Right', 'Bottom', 'Left'].every((s) => parseFloat(cs[`border${s}Width`]) > 0 && !clear(cs[`border${s}Color`]));
    const fill = !clear(cs.backgroundColor) && cs.backgroundColor !== behind(e);
    return border || shadowed(cs.boxShadow) || fill;
  };
  // SP1: the nearest drawn, rounded, non-control ancestor that's a real panel (not a chip or a row of its own size).
  for (const c of controls) {
    if (ignored(c, 'SP1')) continue;
    let s = c.parentElement;
    while (s && s !== document.body && !(drawn(s) && radius(getComputedStyle(s)) >= 6 && !s.matches(CONTROL))) s = s.parentElement;
    if (!s || s === document.body || ignored(s, 'SP1')) continue;
    const sr = s.getBoundingClientRect(), cs = getComputedStyle(s);
    // Measure to what's seen: a raised control's lip (its shadow's offset and spread, not the blur) is part of it.
    const box = c.getBoundingClientRect(), lip = { top: 0, right: 0, bottom: 0, left: 0 };
    for (const sh of getComputedStyle(c).boxShadow.split(/,(?![^(]*\))/)) {
      if (sh.includes('inset') || sh.trim() === 'none') continue;
      const [x = 0, y = 0, , spread = 0] = (sh.replace(/rgba?\([^)]*\)/g, '').match(/-?[\d.]+px/g) || []).map(parseFloat);
      lip.bottom = Math.max(lip.bottom, y + spread); lip.top = Math.max(lip.top, spread - y); lip.right = Math.max(lip.right, x + spread); lip.left = Math.max(lip.left, spread - x);
    }
    const cr = { top: box.top - lip.top, right: box.right + lip.right, bottom: box.bottom + lip.bottom, left: box.left - lip.left, width: box.width };
    if (sr.width < 120 || sr.height < 48) continue;
    // Only a control that sits inside the panel; one that reaches outside is SP3's business.
    if (cr.left < sr.left - 1 || cr.right > sr.right + 1 || cr.top < sr.top - 1 || cr.bottom > sr.bottom + 1) continue;
    const bw = (k) => parseFloat(cs[`border${k}Width`]) || 0;
    // A control as wide as the panel's inside is the panel's own lid (an Accordion trigger, a full-width row): its edge
    // is the panel's edge, not something set inside it.
    if (cr.width >= sr.width - bw('Left') - bw('Right') - 2) continue;
    const gaps = { top: cr.top - sr.top - bw('Top'), right: sr.right - cr.right - bw('Right'), bottom: sr.bottom - cr.bottom - bw('Bottom'), left: cr.left - sr.left - bw('Left') };
    const [side, gap] = Object.entries(gaps).sort((a, b) => a[1] - b[1])[0];
    // space-2 from the control's box; a 1px lip may dip into it, a 3px one may not.
    if (gap < 6.5) out.push(['SP1', `${name(c)} is ${gap.toFixed(1)}px from the ${side} edge of ${name(s)} (radius ${radius(cs)}px); stand it in at least space-2`]);
  }
  // SP2: touching rounded siblings that both draw a surface.
  const slab = (e) => {
    if (e.matches('.alt-tr')) {
      const td = e.querySelector(':scope > .alt-td:first-child'); if (!td) return null;
      const b = getComputedStyle(td, '::before'); if (b.content === 'none' || (clear(b.backgroundColor) && b.boxShadow === 'none')) return null;
      const r = e.getBoundingClientRect(), t = parseFloat(b.top) || 0, bo = parseFloat(b.bottom) || 0, l = parseFloat(b.left) || 0;
      return { top: r.top + t, bottom: r.bottom - bo, left: r.left + l, right: r.left + l + (parseFloat(b.width) || r.width), radius: parseFloat(b.borderTopLeftRadius) || 0 };
    }
    const cs = getComputedStyle(e); if (!drawn(e) || radius(cs) < 4) return null;
    const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, radius: radius(cs) };
  };
  for (const p of document.body.querySelectorAll('*')) {
    const kids = [...p.children].filter(shown);
    if (kids.length < 2) continue;
    for (let i = 0; i + 1 < kids.length; i++) {
      const a = kids[i], b = kids[i + 1];
      if (ignored(a, 'SP2')) continue;
      const ra = slab(a), rb = slab(b);
      if (!ra || !rb) continue;
      const overlapX = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), overlapY = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      const vertical = overlapX > 8 && rb.top - ra.bottom < 1.5 && rb.top - ra.bottom > -1.5;
      const horizontal = overlapY > 8 && rb.left - ra.right < 1.5 && rb.left - ra.right > -1.5;
      if (vertical || horizontal) out.push(['SP2', `${name(a)} and ${name(b)} touch (${vertical ? 'stacked' : 'side by side'}, radius ${ra.radius}px); leave at least space-1 between them`]);
    }
  }
  // SP3: a control cut off by an ancestor that clips.
  for (const c of controls) {
    if (ignored(c, 'SP3')) continue;
    const cr = c.getBoundingClientRect();
    for (let a = c.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      const ar = a.getBoundingClientRect(), scrolls = cs.overflowX === 'auto' || cs.overflowX === 'scroll';
      // Sideways only: a scroller is meant to hide what's below its fold. Past the start edge nothing scrolls back to
      // it; past the end edge, only a frame that hides rather than scrolls cuts it off.
      const start = ar.left - cr.left, end = scrolls ? 0 : cr.right - ar.right;
      if (Math.max(start, end) > 1) { out.push(['SP3', `${name(c)} is cut off by ${Math.max(start, end).toFixed(0)}px at the ${start > end ? 'start' : 'end'} of ${name(a)}`]); break; }
    }
  }
  return [...new Set(out.map((o) => o.join('  ')))];
};

const known = new Set(JSON.parse(readFileSync(new URL('spacing-known.json', import.meta.url), 'utf8')).known);
const seen = new Set();
let found = 0;
for (const n of names) {
  const file = `${T}p-${n}-daylight.html`;
  if (!existsSync(file)) { console.log(`skip ${n} (render it first: PAGES_ONLY=1 node shoot.mjs)`); continue; }
  const page = await browser.newPage({ viewport: { width: 960, height: 900 } });
  await page.goto(`file://${file}`);
  await page.waitForTimeout(+(process.env.WAIT || 700));
  if (process.env.ACT) await eval(process.env.ACT);
  const res = await page.evaluate(measure);
  if (OPEN[n]) { await OPEN[n](page); await page.waitForTimeout(500); for (const r of await page.evaluate(measure)) if (!res.includes(r)) res.push(r + '  (editing)'); }
  for (const r of res) {
    const line = `${n}  ${r}`;
    seen.add(line);
    if (known.has(line)) console.log(`known  ${line}`); else { console.log(line); found++; }
  }
  await page.close();
}
await browser.close();
// A listed finding that's gone: fixed, so take it off the list (only when every preview ran).
if (!process.argv[2]) for (const k of known) if (!seen.has(k)) console.log(`fixed, remove from spacing-known.json:  ${k}`);
console.log(found ? `Spacing: ${found} new finding${found === 1 ? '' : 's'}` : `Spacing: no new findings (${[...known].filter((k) => seen.has(k)).length} known)`);
process.exit(found ? 1 : 0);
