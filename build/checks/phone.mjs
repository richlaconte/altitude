// The phone check (#247): every preview as a phone, at 320 and 375 CSS px with isMobile and hasTouch, so coarse-pointer
// and no-hover styles apply. It reports, per preview:
//   M1  the page scrolls sideways, or a visible element runs past the right edge outside a scroll container (WCAG 1.4.10);
//   M2  an interactive element whose hit area is under 24×24 (WCAG 2.5.8), or under 44×44 on touch (Mobile.md, M2);
//   M6  a text field whose text is under 16px on touch, so iOS Safari zooms the page when it's focused.
// Hit areas are measured where the browser hits them (elementFromPoint at the edges of the size around the centre), so
// a transparent ::before that extends a small face counts. Inline links in prose are exempt (2.5.8's inline exception).
// An element inside [data-phone-ignore="why"] is skipped: a scoped, explained suppression.
//
//   node checks/phone.mjs              every preview (after a render: it opens test/p-<Name>-daylight.html)
//   node checks/phone.mjs Tabs,Select  just these
//   PHONE_FAIL=M1,M2-24,M6             which findings fail the run; the rest are printed as warnings. Default: M6.
//   PHONE_LIST=1                       print every offender, not just the first few per preview
import { chromium } from 'playwright-core';
import { existsSync, readdirSync } from 'fs';
const T = new URL('../test/', import.meta.url).pathname;
const root = new URL('../..', import.meta.url).pathname;
const names = process.argv[2] ? process.argv[2].split(',') : readdirSync(root + 'project/components').filter((d) => existsSync(`${root}project/components/${d}/preview.html`)).sort();
// What fails by default: field text under 16px on touch (fixed by #250). PHONE_FAIL overrides it; PHONE_FAIL= warns only.
const failOn = new Set((process.env.PHONE_FAIL ?? 'M6').split(',').filter(Boolean));
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});

// W is the phone's width: a mobile browser zooms out to fit wide content, so innerWidth grows with the overflow.
const measure = (W) => {
  const out = { M1: [], 'M2-24': [], 'M2-44': [], M6: [] };
  const ignored = (e) => !!e.closest('[data-phone-ignore]');
  const name = (e) => `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}${e.getAttribute('aria-label') ? `[${e.getAttribute('aria-label').slice(0, 30)}]` : e.textContent.trim() ? ` "${e.textContent.trim().slice(0, 24)}"` : ''}`;
  const visible = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity !== 0 && !e.closest('[inert],[aria-hidden="true"]'); };
  // M1: sideways scroll, and the outermost element past the right edge that isn't inside a horizontal scroller.
  if (document.body.closest('[data-phone-ignore]')) return out;
  if (document.documentElement.scrollWidth > W + 1) out.M1.push(`page scrolls sideways: ${document.documentElement.scrollWidth}px in ${W}px`);
  const scroller = (e) => { for (let p = e.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true; } return false; };
  const past = [...document.body.querySelectorAll('*')].filter((e) => !ignored(e) && visible(e) && e.getBoundingClientRect().right > W + 1 && !scroller(e));
  for (const e of past) if (!past.includes(e.parentElement)) out.M1.push(`${name(e)} reaches ${Math.round(e.getBoundingClientRect().right)}px`);
  // M2: hit areas, probed where the browser hits them.
  const sel = 'button, a[href], input, select, textarea, summary, [role=button], [role=tab], [role=option], [role=menuitem], [role=menuitemcheckbox], [role=menuitemradio], [role=checkbox], [role=radio], [role=switch], [role=slider], [role=treeitem], [role=spinbutton], [role=separator][tabindex], [tabindex="0"]';
  const targets = [...document.querySelectorAll(sel)].filter((e) => !ignored(e) && visible(e) && !e.disabled && !e.closest('[disabled]'));
  const coarse = matchMedia('(pointer: coarse)').matches;
  for (const e of targets) {
    // An inline link in running text is exempt.
    if (e.tagName === 'A' && getComputedStyle(e).display === 'inline' && e.parentElement && /^(P|LI|SPAN|DD|TD|FIGCAPTION|LABEL)$/.test(e.parentElement.tagName)) continue;
    // A checkbox, radio or switch input is hit through its label; a text field through its frame.
    const owner = (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' || e.tagName === 'SELECT') ? (e.closest('label') ?? e.closest('.alt-input') ?? e) : e;
    const r = owner.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const hits = (x, y) => { const h = document.elementFromPoint(x, y); return !!h && (owner.contains(h) || h === owner || (e.labels && [...e.labels].some((l) => l.contains(h)))); };
    if (!hits(cx, cy)) continue; // covered by something else (a popover, a layer): not measured here
    const reaches = (s) => hits(cx - s / 2 + 0.5, cy) && hits(cx + s / 2 - 0.5, cy) && hits(cx, cy - s / 2 + 0.5) && hits(cx, cy + s / 2 - 0.5);
    const size = `${Math.round(r.width)}×${Math.round(r.height)}`;
    if (!reaches(24)) out['M2-24'].push(`${name(owner)} ${size}`);
    else if (coarse && !reaches(44)) out['M2-44'].push(`${name(owner)} ${size}`);
  }
  // M6: text you type, at 16px or more on touch.
  if (coarse) {
    const fields = [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=hidden]):not([type=color]):not([type=file]), textarea, select, [contenteditable="true"]')].filter((e) => !ignored(e) && visible(e));
    for (const f of fields) { const px = parseFloat(getComputedStyle(f).fontSize); if (px < 16) out.M6.push(`${name(f)} ${px}px`); }
  }
  return out;
};

const totals = { M1: 0, 'M2-24': 0, 'M2-44': 0, M6: 0 }, previews = { M1: 0, 'M2-24': 0, 'M2-44': 0, M6: 0 };
let failed = 0, missing = 0;
const queue = [...names];
const worker = async () => {
  for (let c; (c = queue.shift()); ) {
    const file = `${T}p-${c}-daylight.html`;
    if (!existsSync(file)) { missing++; console.log(`MISSING ${c}: render it first (node shoot.mjs ${c} daylight)`); continue; }
    for (const width of [320, 375]) {
      const ctx = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true });
      const page = await ctx.newPage();
      await page.goto(`file://${file}`);
      await page.waitForTimeout(700);
      // Show the whole preview, so every target is in the viewport and can be hit-tested.
      const h = await page.evaluate(() => Math.min(6000, document.documentElement.scrollHeight));
      await page.setViewportSize({ width, height: h });
      await page.waitForTimeout(150);
      const out = await page.evaluate(measure, width);
      await ctx.close();
      for (const [k, list] of Object.entries(out)) {
        if (!list.length) continue;
        totals[k] += list.length; previews[k]++;
        const bad = failOn.has(k);
        if (bad) failed++;
        const shown = process.env.PHONE_LIST ? list : list.slice(0, 4);
        console.log(`${bad ? 'FAIL' : 'warn'} ${c} @${width} ${k} (${list.length}): ${shown.join('; ')}${list.length > shown.length ? ' …' : ''}`);
      }
    }
  }
};
await Promise.all([worker(), worker(), worker(), worker()]);
await browser.close();
console.log(`phone: ${names.length - missing} previews at 320 and 375 · M1 overflow ${previews.M1} · M2 under 24px ${totals['M2-24']} in ${previews['M2-24']} · M2 under 44px on touch ${totals['M2-44']} in ${previews['M2-44']} · M6 field text under 16px ${totals.M6} in ${previews.M6} · failing on: ${[...failOn].join(', ') || 'nothing (warnings only)'}`);
if (failed || missing) process.exitCode = 1;
