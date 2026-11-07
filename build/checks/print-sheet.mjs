// PrintSheet (#564): the document and its pages on screen, light paper in every scheme, fit to width, and print.
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { chromium } from 'playwright-core';
import { fixturePath } from './fixture-path.mjs';

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const errors = [];
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); passed++; };
const open = async ({ scheme = 'daylight', width = 960 } = {}) => {
  const page = await browser.newPage({ viewport: { width, height: 900 }, locale: 'en-GB' });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  await page.goto(`file://${fixturePath('PrintSheet', scheme)}`);
  page.setDefaultTimeout(5000);
  await page.locator('.alt-print-page').first().waitFor();
  await page.waitForTimeout(300);
  return page;
};
const token = (page, name, scheme) => page.evaluate(([name, scheme]) => {
  const el = document.createElement('i'); el.dataset.theme = scheme; el.style.color = `var(--${name})`; document.querySelector('.alt-root').append(el);
  const c = getComputedStyle(el).color; el.remove(); return c;
}, [name, scheme]);

const px = mm => mm / 25.4 * 96;
// A printed PDF, page by page: its size in points and where its lines of text are, in points from the paper's top
// (Chrome's content streams are Flate-compressed; the transform stack is followed so nested elements land right).
const pdfPages = buf => {
  const s = buf.toString('latin1'), objs = new Map();
  for (const m of s.matchAll(/(\d+) 0 obj([\s\S]*?)endobj/g)) objs.set(+m[1], m[2]);
  const pages = [...s.matchAll(/(\d+) 0 obj\s*<<\s*\/Type\s*\/Pages[\s\S]*?\/Kids\s*\[([^\]]*)\]/g)].flatMap(m => [...m[2].matchAll(/(\d+) 0 R/g)].map(k => +k[1]));
  return pages.map(n => objs.get(n)).filter(o => /\/Type\s*\/Page[^s]/.test(o)).map(o => {
    const box = o.match(/\/MediaBox\s*\[([^\]]*)\]/)[1].trim().split(/\s+/).map(Number);
    const refs = (o.match(/\/Contents\s*(\[[^\]]*\]|\d+ 0 R)/)?.[1].match(/\d+(?= 0 R)/g) || []).map(Number);
    const ops = refs.map(r => { const c = objs.get(r), i = c.indexOf('stream') + 6, raw = c.slice(i).replace(/^\r?\n/, '');
      const data = Buffer.from(raw.slice(0, raw.lastIndexOf('endstream')), 'latin1'); return /FlateDecode/.test(c) ? inflateSync(data).toString('latin1') : data.toString('latin1'); }).join('\n');
    const height = box[3] - box[1], texts = [];
    let m = [1, 0, 0, 1, 0, 0]; const stack = [], nums = [];
    const at = (x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
    for (const t of ops.match(/\[[^\]]*\]|<[^>]*>|\([^)]*\)|\/\S+|[^\s\[\]<>()/]+/g) || []) {
      if (/^-?[\d.]+$/.test(t)) { nums.push(+t); continue; }
      const a = nums.splice(0);
      if (t === 'q') stack.push(m); else if (t === 'Q') m = stack.pop() || m;
      else if (t === 'cm' && a.length === 6) { const [p, q, r, u, e, f] = a; m = [p * m[0] + q * m[2], p * m[1] + q * m[3], r * m[0] + u * m[2], r * m[1] + u * m[3], e * m[0] + f * m[2] + m[4], e * m[1] + f * m[3] + m[5]]; }
      else if (t === 'Tm' && a.length === 6) texts.push(height - at(a[4], a[5])[1]);
    }
    return { w: box[2] - box[0], h: height, texts, blank: texts.length === 0 };
  });
};
const printPdf = async page => { await page.emulateMedia({ media: 'print' }); return pdfPages(await page.pdf({ preferCSSPageSize: true })); };
// Render a sheet of my own in the fixture page (React, ReactDOM and Altitude are globals there), replacing the preview.
const mount = (page, body) => page.evaluate(body => {
  const h = React.createElement, A = window.Altitude;
  document.getElementById('root').remove();
  const root = document.createElement('div'); root.id = 'mine'; document.body.prepend(root);
  ReactDOM.createRoot(root).render(h(A.AltitudeProvider, null, new Function('h', 'A', `return ${body}`)(h, A)));
}, body).then(() => page.locator('#mine .alt-print-page').first().waitFor()).then(() => page.waitForTimeout(200));
const rows = n => `h('table', null, h('thead', null, h('tr', null, h('th', null, 'Day'), h('th', null, 'Work'))), h('tbody', null, Array.from({ length: ${n} }, (_, k) => h('tr', { key: k }, h('td', null, 'Day ' + (k + 1)), h('td', null, 'Structural drawings')))))`;
const chrome = `header: h(A.PrintSheetHeader, null, h('strong', null, 'Larkspur Studio'), h('span', null, 'Timesheet')), footer: h(A.PrintSheetFooter, null, h('span', null, 'Larkspur Studio'), h('span', null, 'Page ', h(A.PrintSheetPageNumber), ' of ', h(A.PrintSheetPageCount)))`;
// The screen rule: one line every content height from the top margin, as far as the page reaches.
const screenRules = page => page.evaluate(() => [...document.querySelectorAll('.alt-print-page')].map(p => {
  const b = getComputedStyle(p, '::before'), probe = document.createElement('div');
  probe.style.height = 'var(--sheet-content-h)'; p.append(probe); const content = probe.offsetHeight; probe.remove();
  const height = parseFloat(b.height) || 0;
  return { top: parseFloat(b.top), content, lines: height > 0 ? Math.ceil(height / content) : 0 };
}));

try {
  for (const scheme of ['daylight', 'nightfall']) {
    const page = await open({ scheme });
    const doc = page.getByRole('document', { name: 'Invoice 1042' });
    check(await doc.count() === 1, `${scheme}: PS-01 the sheet is a document named by its title`);
    check(await page.locator('.alt-print-page').count() === 2, `${scheme}: PS-02 a break placed by hand starts a second page`);
    check(await page.getByRole('separator', { name: 'Page 2 of 2' }).count() === 1, `${scheme}: PS-03 the break is announced as "Page 2 of 2"`);
    const footers = await page.locator('.alt-print-footer').allTextContents();
    check(footers.length === 2 && footers[0].endsWith('Page 1 of 2') && footers[1].endsWith('Page 2 of 2'), `${scheme}: PS-04 the footer repeats on each page with its number and the count`);
    check(await page.locator('.alt-print-header').count() === 2, `${scheme}: PS-05 the header repeats on each page`);
    const paper = await page.locator('.alt-print-page').first().evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, ink: getComputedStyle(el).color, shadow: getComputedStyle(el).boxShadow }));
    check(paper.bg === await token(page, 'surface-raised', 'daylight') && paper.bg === 'rgb(255, 255, 255)' && paper.ink === await token(page, 'ink', 'daylight'), `${scheme}: PS-06 the paper is white with ink text in every scheme (${paper.bg}, ${paper.ink})`);
    check(paper.shadow !== 'none', `${scheme}: PS-07 on screen the paper is raised one level`);
    // Fit: the page's print geometry (210 mm) scaled to the container, never up.
    const geo = await page.evaluate(() => { const p = document.querySelector('.alt-print-page'), o = document.querySelector('.alt-print'); return { w: p.offsetWidth, shown: p.getBoundingClientRect().width, box: o.clientWidth }; });
    check(Math.abs(geo.w - 210 / 25.4 * 96) < 2 && geo.shown <= geo.box + 1 && geo.shown < geo.w, `${scheme}: PS-08 an A4 page keeps its 210 mm and is scaled to fit (${geo.w} → ${Math.round(geo.shown)}px in ${geo.box}px)`);
    check(await page.evaluate(() => [...document.querySelectorAll('style')].some(s => /@page\s*\{\s*size:\s*210mm 297mm;\s*margin:\s*18mm;/.test(s.textContent))), `${scheme}: PS-09 the sheet sets the paper and margins with @page`);
    await page.close();
  }

  { const page = await open();
    // Changing the paper and removing the break.
    await page.locator('.alt-select-trigger').first().click(); await page.getByRole('option', { name: 'US Letter' }).click();
    await page.waitForFunction(() => Math.abs(document.querySelector('.alt-print-page').offsetWidth - 8.5 * 96) < 2);
    check(true, 'PS-10 size="letter" is 8.5 in wide');
    await page.getByRole('switch', { name: 'Time entries page' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.alt-print-page').length === 1);
    check((await page.locator('.alt-print-footer').textContent()).endsWith('Page 1 of 1') && await page.getByRole('separator').count() === 0, 'PS-11 without the break it’s one page, and the count follows');
    // Keyboard: nothing of its own; the controls outside it tab in order and the sheet takes no focus.
    check(await page.locator('.alt-print [tabindex], .alt-print button, .alt-print a').count() === 0, 'PS-12 the sheet adds no tab stops of its own');
    await page.close(); }

  { const page = await open();
    // Print: no ground, no height; everything outside the sheet hidden; actual size.
    await page.emulateMedia({ media: 'print' });
    const printed = await page.evaluate(() => {
      const p = document.querySelector('.alt-print-page'), s = getComputedStyle(p);
      return { shadow: s.boxShadow, radius: s.borderRadius, transform: getComputedStyle(document.querySelector('.alt-print-stack')).transform, gap: getComputedStyle(document.querySelector('.alt-print-gap')).display,
        outside: getComputedStyle(document.querySelector('.ps-settings')).display, inside: getComputedStyle(document.querySelector('.alt-print-body td')).display,
        breakAfter: s.breakAfter, head: getComputedStyle(document.querySelector('.alt-print-body thead')).display };
    });
    check(printed.shadow === 'none' && printed.radius === '0px', 'PS-13 in print the page has no shadow and no radius');
    check(printed.transform === 'none' && printed.gap === 'none', 'PS-14 in print there is no scale and no gap between pages');
    check(printed.outside === 'none' && printed.inside === 'table-cell', 'PS-15 in print everything outside the sheet is removed, and the sheet’s content kept');
    check(printed.breakAfter === 'page' && printed.head === 'table-header-group', 'PS-16 each page ends in a page break, and table heads repeat');
    // The printed page is the @page content box (297 mm less 18 mm top and bottom), so the footer sits at its foot.
    const box = await page.evaluate(() => [...document.querySelectorAll('.alt-print-page')].map(p => { const f = p.querySelector('.alt-print-footer'); return { h: p.offsetHeight, foot: f.offsetTop + f.offsetHeight }; }));
    check(box.every(b => Math.abs(b.h - px(261)) < 1.5 && Math.abs(b.foot - b.h) < 1), `PS-17 in print each page is at least the paper less its margins, with the footer at its foot (${box.map(b => `${b.h}/${b.foot}`).join(', ')}; ${px(261).toFixed(1)}px)`);
    const pdf = await pdfPages(await page.pdf({ preferCSSPageSize: true }));
    check(pdf.length === 2 && pdf.every(p => Math.abs(p.w - 595.3) < 1 && Math.abs(p.h - 841.9) < 1), `PS-18 it prints as two A4 pages (${pdf.map(p => `${p.w.toFixed(0)}×${p.h.toFixed(0)}`).join(', ')})`);
    // Text starts below the top margin (18 mm = 51 pt) and the footer's line ends just above the bottom margin.
    const lowest = pdf.map(p => Math.max(...p.texts)), highest = pdf.map(p => Math.min(...p.texts));
    check(pdf.every(p => !p.blank) && highest.every(y => y >= 51 && y < 51 + 14) && lowest.every(y => y > 841.9 - 51 - 14 && y <= 841.9 - 51 + 1),
      `PS-19 in the PDF each page has its header at the top margin and its footer at the bottom margin (header ${highest.map(y => y.toFixed(0))}pt, footer ${lowest.map(y => y.toFixed(0))}pt of 842)`);
    await page.close(); }

  { const page = await open();
    // Loading: each page an imprint at its paper size, no header or footer, and the document says it is loading.
    await mount(page, `h(A.PrintSheet, { title: 'Invoice 1042', loading: true, ${chrome} }, h('p', null, 'Hidden'), h(A.PrintSheetBreak), h('p', null, 'Hidden'))`);
    const doc = page.getByRole('document', { name: 'Loading Invoice 1042' });
    check(await doc.count() === 1 && await doc.getAttribute('aria-busy') === 'true', 'PS-20 loading: the document is named "Loading Invoice 1042" and is busy');
    const imprint = await page.evaluate(() => [...document.querySelectorAll('.alt-print-page')].map(p => ({ loading: p.hasAttribute('data-loading'), h: p.offsetHeight, bg: getComputedStyle(p).backgroundColor, shadow: getComputedStyle(p).boxShadow })));
    check(imprint.length === 2 && imprint.every(p => p.loading && Math.abs(p.h - px(297)) < 1.5 && /inset/.test(p.shadow)) && imprint[0].bg === await token(page, 'surface-well', 'daylight'), `PS-21 loading: each page is a well at its paper size (${imprint.map(p => p.h)}px)`);
    check(await page.locator('.alt-print-header, .alt-print-footer, .alt-print-body').count() === 0, 'PS-22 loading: no header, footer or content');
    await page.close(); }

  { const page = await open();
    // Landscape: the paper turns, on screen, in @page and in the PDF.
    await mount(page, `h(A.PrintSheet, { title: 'Timesheet', orientation: 'landscape', margins: '15mm', scale: 1, ${chrome} }, h('h1', null, 'Week 45'), ${rows(5)})`);
    const geo = await page.locator('.alt-print-page').evaluate(p => ({ w: p.offsetWidth, h: p.offsetHeight }));
    check(Math.abs(geo.w - px(297)) < 1.5 && Math.abs(geo.h - px(210)) < 1.5, `PS-23 landscape A4 is 297 × 210 mm on screen (${geo.w} × ${geo.h})`);
    check(await page.evaluate(() => [...document.querySelectorAll('style')].some(s => /@page\s*\{\s*size:\s*297mm 210mm;\s*margin:\s*15mm;/.test(s.textContent))), 'PS-24 landscape sets @page to 297mm 210mm');
    const pdf = await printPdf(page), foot = Math.max(...pdf[0].texts);
    check(pdf.length === 1 && Math.abs(pdf[0].w - 841.9) < 1 && Math.abs(pdf[0].h - 595.3) < 1 && foot > 595.3 - 42.5 - 14 && foot <= 595.3 - 42.5 + 1, `PS-25 landscape prints one 842 × 595 pt page with the footer at the bottom margin (${pdf.map(p => `${p.w.toFixed(0)}×${p.h.toFixed(0)}`)}, footer ${foot.toFixed(0)}pt)`);
    await page.close(); }

  { const page = await open();
    // A custom size with four margins: the vertical two set the printed page's height.
    await mount(page, `h(A.PrintSheet, { title: 'Label', size: { width: '6in', height: '4in' }, margins: '10mm 12mm 20mm', scale: 1, ${chrome} }, h('p', null, 'Ship to Harbour Authority'))`);
    const geo = await page.locator('.alt-print-page').evaluate(p => ({ w: p.offsetWidth, h: p.offsetHeight }));
    check(Math.abs(geo.w - 576) < 1 && Math.abs(geo.h - 384) < 1, `PS-26 a custom 6 × 4 in size is 576 × 384px on screen (${geo.w} × ${geo.h})`);
    await page.emulateMedia({ media: 'print' });
    const h = await page.locator('.alt-print-page').evaluate(p => p.offsetHeight);
    check(Math.abs(h - (384 - px(30))) < 1.5, `PS-27 "10mm 12mm 20mm": the printed page is 4 in less 10 mm and 20 mm (${h} ≈ ${(384 - px(30)).toFixed(1)}px)`);
    const pdf = await printPdf(page), foot = Math.max(...pdf[0].texts), head = Math.min(...pdf[0].texts);
    check(pdf.length === 1 && Math.abs(pdf[0].w - 432) < 1 && Math.abs(pdf[0].h - 288) < 1 && head >= 28.3 && head < 28.3 + 14 && foot > 288 - 56.7 - 14 && foot <= 288 - 56.7 + 1,
      `PS-28 it prints one 432 × 288 pt page, header at the 10 mm margin and footer at the 20 mm one (header ${head.toFixed(1)}pt, footer ${foot.toFixed(1)}pt)`);
    await page.close(); }

  { const page = await open();
    // Overflow: 60 rows on the second page run past the paper; the screen draws a line wherever the printer breaks.
    await mount(page, `h(A.PrintSheet, { title: 'Timesheet', margins: '18mm', scale: 1, ${chrome} }, h('h1', null, 'Invoice'), h('p', null, 'Summary'), h(A.PrintSheetBreak), h('h2', null, 'Time entries'), ${rows(60)})`);
    const rules = await screenRules(page);
    check(rules[0].lines === 0 && rules[1].lines >= 1 && Math.abs(rules[1].top - (px(18) + rules[1].content)) < 1, `PS-29 the screen rule is drawn one content height below the top margin, and not on a page that fits (${rules.map(r => r.lines)} lines; first at ${rules[1].top.toFixed(1)}px)`);
    const pdf = await printPdf(page), lines = rules.reduce((n, r) => n + r.lines, 0);
    check(pdf.length === lines + 2 && pdf.every(p => !p.blank), `PS-30 printed pages = sheet pages + screen rules (${pdf.length} printed, ${rules.length} sheet pages, ${lines} rules)`);
    await page.close(); }

  for (const where of ['long', 'nested']) {
    // A long app page around the sheet: nothing but the sheet prints, wherever the sheet sits.
    const page = await open();
    await page.evaluate(where => {
      const filler = h => { const d = document.createElement('div'); d.style.height = `${h}px`; d.textContent = 'Other content'; return d; };
      const root = document.getElementById('root');
      if (where === 'nested') {
        const panel = document.createElement('div'); panel.style.cssText = 'position: relative; overflow: hidden; height: 400px; margin: 0 0 0 120px; padding: 40px; transform: translateZ(0)';
        root.before(panel); panel.append(filler(300), root);
      }
      document.body.prepend(filler(1500)); document.body.append(filler(2500));
    }, where);
    const pdf = await printPdf(page);
    const foot = pdf.map(p => Math.max(...p.texts));
    check(pdf.length === 2 && pdf.every(p => !p.blank) && foot.every(y => y > 841.9 - 51 - 14 && y <= 841.9 - 51 + 1),
      `PS-31 ${where === 'long' ? 'with 4000px of other content around it' : 'inside a positioned, clipped panel on a long page'} it prints as the sheet’s two pages, footers at the foot (${pdf.length}: ${pdf.map(p => p.blank ? 'blank' : 'text')})`);
    await page.close();
  }

  // Narrow, schemes and modes: the page scales down; nothing scrolls sideways; forced colours keep the edge.
  for (const scheme of ['daylight', 'nightfall']) for (const width of [320, 960]) {
    const page = await open({ scheme, width });
    for (const mode of ['standard', 'reduced-motion', 'forced-colors', 'increased-contrast']) {
      await page.emulateMedia({ reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference', forcedColors: mode === 'forced-colors' ? 'active' : 'none' });
      await page.locator('.alt-root').evaluate((root, more) => { root.dataset.contrast = more ? 'more' : 'system'; }, mode === 'increased-contrast');
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${scheme}/${width}/${mode}: the page doesn’t scroll sideways`);
      if (mode === 'forced-colors') check(await page.locator('.alt-print-page').first().evaluate(el => getComputedStyle(el).borderTopStyle === 'solid' && getComputedStyle(el).borderTopWidth === '1px'), `${scheme}/${width}: forced colours give the paper a 1px edge`);
    }
    await page.close();
  }
  check(errors.length === 0, `no page or console errors: ${errors.join('\n')}`);
  console.log(`PrintSheet: ${passed} passed, 0 failed`);
} finally { await browser.close(); }
