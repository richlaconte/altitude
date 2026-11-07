// PrintSheet (#564): the document and its pages on screen, light paper in every scheme, fit to width, and print.
import assert from 'node:assert/strict';
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
        outside: getComputedStyle(document.querySelector('.ps-settings')).visibility, inside: getComputedStyle(document.querySelector('.alt-print-body td')).visibility,
        breakAfter: s.breakAfter, head: getComputedStyle(document.querySelector('.alt-print-body thead')).display };
    });
    check(printed.shadow === 'none' && printed.radius === '0px', 'PS-13 in print the page has no shadow and no radius');
    check(printed.transform === 'none' && printed.gap === 'none', 'PS-14 in print there is no scale and no gap between pages');
    check(printed.outside === 'hidden' && printed.inside === 'visible', 'PS-15 in print everything outside the sheet is hidden');
    check(printed.breakAfter === 'page' && printed.head === 'table-header-group', 'PS-16 each page ends in a page break, and table heads repeat');
    const pdf = await page.pdf({ preferCSSPageSize: true });
    const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    check(pages === 2, `PS-17 it prints as two pages (${pages})`);
    await page.close(); }

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
