// Separator: role="separator" with aria-orientation unless decorative (role="none"); 1px of line with no shadow, a
// vertical one stretching to its row; a labelled one is plain text between two drawn lines; line-control under
// contrast="more" and CanvasText under forced colours. Run after a render of every preview (it opens
// test/p-Separator-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

const open = async (media) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-Separator-daylight.html`);
  await page.waitForTimeout(300);
  return page;
};
const read = (page) => page.evaluate(() => {
  const probe = document.createElement('i'); probe.style.color = 'var(--line)'; document.querySelector('.alt-root').append(probe);
  const lineRgb = getComputedStyle(probe).color; probe.remove();
  return { lineRgb, seps: [...document.querySelectorAll('.alt-sep')].map((el) => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el), before = getComputedStyle(el, '::before');
    const row = el.parentElement.getBoundingClientRect();
    return { role: el.getAttribute('role'), orient: el.getAttribute('aria-orientation'), w: r.width, h: r.height, rowH: row.height, rowW: (el.closest(".alt-card") ?? el.parentElement).clientWidth,
      bg: cs.backgroundColor, shadow: cs.boxShadow, labelled: el.classList.contains('alt-sep-labelled'), text: el.textContent,
      beforeBg: before.backgroundColor, beforeH: parseFloat(before.height), color: cs.color };
  }) };
});

{
  const page = await open();
  const { lineRgb, seps: [card, vert, or] } = await read(page);
  expect(card.role === 'separator' && card.orient === 'horizontal', `a section divider is role="separator", horizontal (${card.role}, ${card.orient})`);
  expect(card.h === 1 && Math.abs(card.w - card.rowW) < 1, `it's 1px tall and as wide as its container (${card.h} × ${card.w} in ${card.rowW})`);
  expect(card.bg === lineRgb && card.shadow === 'none', `it's line with no shadow (${card.bg} vs ${lineRgb}, ${card.shadow})`);
  expect(vert.role === 'none' && vert.orient === null, `a decorative one is role="none" with no orientation (${vert.role})`);
  expect(vert.w === 1 && vert.h >= 16 && Math.abs(vert.h - vert.rowH) < 1, `a vertical one is 1px wide and stretches to its row (${vert.w} × ${vert.h} in ${vert.rowH})`);
  expect(or.labelled && or.role === null && or.text === 'or', `a labelled one is plain text, not role="separator" (${or.role}, "${or.text}")`);
  expect(or.bg === 'rgba(0, 0, 0, 0)' && or.beforeBg === lineRgb && or.beforeH === 1, `its lines are drawn in line, 1px (${or.beforeBg}, ${or.beforeH})`);
  await page.close();
}
{
  const page = await open();
  await page.evaluate(() => document.querySelectorAll('.alt-root').forEach((r) => r.setAttribute('data-contrast', 'more')));
  const ctl = await page.evaluate(() => { const p = document.createElement('i'); p.style.color = 'var(--line-control)'; document.querySelector('.alt-root').append(p); const c = getComputedStyle(p).color; p.remove(); return c; });
  const { seps: [card, , or] } = await read(page);
  expect(card.bg === ctl && or.beforeBg === ctl, `contrast="more": line-control (${card.bg}, ${or.beforeBg} vs ${ctl})`);
  await page.close();
}
{
  const page = await open({ forcedColors: 'active' });
  const { seps: [card] } = await read(page);
  const canvasText = await page.evaluate(() => { const p = document.createElement('i'); p.style.color = 'CanvasText'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; });
  expect(card.bg === canvasText, `forced colours: CanvasText (${card.bg} vs ${canvasText})`);
  await page.close();
}

console.log(`Separator: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
