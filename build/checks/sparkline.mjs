// Sparkline: as tall as the text beside it, a 1.5px line with a 4px end marker (2px under contrast="more", CanvasText
// when forced), gaps left as gaps, bars standing on zero 1px apart, a band behind the line, a label that says the trend
// in words (or nothing, when decorative), never focusable, and an imprint while its data loads. Run after a render of
// every preview (it opens test/p-Sparkline-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

const open = async (media) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-Sparkline-daylight.html`);
  await page.waitForTimeout(400);
  return page;
};
const read = (page) => page.evaluate(() => [...document.querySelectorAll('.alt-sparkline')].map((el) => {
  const line = el.querySelector('.alt-sparkline-line');
  const probe = document.createElement('span'); probe.style.cssText = 'display:inline-block;height:1lh;width:0'; el.parentElement.append(probe);
  const parentLh = probe.getBoundingClientRect().height; probe.remove();
  return {
    role: el.getAttribute('role'), label: el.getAttribute('aria-label'), hidden: el.getAttribute('aria-hidden'), tab: el.getAttribute('tabindex'),
    h: el.getBoundingClientRect().height, parentLh,
    d: line?.getAttribute('d') ?? null, stroke: line ? getComputedStyle(line).stroke : null, sw: line ? parseFloat(getComputedStyle(line).strokeWidth) : null,
    end: el.querySelector('.alt-sparkline-end')?.getAttribute('r') ?? null,
    bars: [...el.querySelectorAll('.alt-sparkline-bar')].map((b) => ({ x: +b.getAttribute('x'), w: +b.getAttribute('width'), y: +b.getAttribute('y'), h: +b.getAttribute('height') })),
    band: !!el.querySelector('.alt-sparkline-band'),
  };
}));

{
  const page = await open();
  const imprints = await page.locator('.alt-sparkline-imprint').count();
  expect(imprints === 1, `undefined data is an imprint (${imprints})`);
  const all = await read(page);
  const [big, latency, deploys, ...rows] = all;
  expect(big.role === 'img' && /^Signups, last 30 days\. Up 17% over 30 days, from 1\.2K to 1\.4K\./.test(big.label), `the label says the trend in words: ${big.label}`);
  expect(/Low 1\.2K, high 1\.5K\./.test(big.label) || /Low 1\.2K, high 1\.4K\./.test(big.label), `…with its low and high: ${big.label}`);
  expect(latency.band && /2 of 18 outside the normal range\./.test(latency.label), `a band, and the label counts what's outside it: ${latency.label}`);
  expect(all.every((s) => Math.abs(s.h - s.parentLh) < 1), `as tall as the line of text around it: ${all.map((s) => `${s.h}/${s.parentLh}`).join(' ')}`);
  expect(all.every((s) => s.tab === null), 'never focusable');
  expect(big.sw === 1.5 && big.end === '2', `a 1.5px line and a 4px end marker (${big.sw}, r=${big.end})`);
  // Bars: 7 days, one of them zero (no bar), 1px apart, standing on zero (all end at the same baseline).
  const b = deploys.bars;
  expect(b.length === 6, `bars for each non-zero value (${b.length})`);
  const step = b[1].x - b[0].x;
  expect(Math.abs(step - b[0].w - 1) < 0.01, `bars are 1px apart (${(step - b[0].w).toFixed(2)})`);
  expect(new Set(b.map((r) => Math.round((r.y + r.h) * 10))).size === 1, 'bars stand on one baseline');
  // Decorative cells are hidden from assistive technology; the labelled ones aren't.
  const builds = rows.filter((_, i) => i % 2 === 0), errors = rows.filter((_, i) => i % 2 === 1);
  expect(builds.every((s) => s.hidden === 'true' && s.role === null && s.label === null), 'decorative: aria-hidden, no role, no label');
  expect(errors.every((s) => s.role === 'img' && s.label), 'labelled sparklines are images with names');
  // The Data team's values have a gap: the line breaks into separate runs.
  expect((builds[2].d.match(/M/g) || []).length === 2, `a null breaks the line (${(builds[2].d.match(/M/g) || []).length} runs)`);
  expect(errors[0].stroke !== errors[1].stroke, `tone="critical" colours the rising error rate (${errors[0].stroke} vs ${errors[1].stroke})`);
  // The imprint lands.
  await page.waitForTimeout(2800);
  const landed = await page.evaluate(() => document.querySelectorAll('.alt-sparkline').length);
  expect(landed === all.length + 1 && (await page.locator('.alt-sparkline-imprint').count()) === 0, `the loading one lands (${landed})`);
  await page.close();
}
{
  const page = await open();
  await page.evaluate(() => document.querySelectorAll('.alt-root').forEach((r) => r.setAttribute('data-contrast', 'more')));
  const [big] = await read(page);
  expect(big.sw === 2, `contrast="more": 2px (${big.sw})`);
  await page.close();
}
{
  const page = await open({ forcedColors: 'active' });
  const [big, latency] = await read(page);
  const canvasText = await page.evaluate(() => { const s = document.createElement('span'); s.style.color = 'CanvasText'; document.body.append(s); const c = getComputedStyle(s).color; s.remove(); return c; });
  expect(big.stroke === canvasText && latency.stroke === canvasText, `forced colours: CanvasText (${big.stroke} vs ${canvasText})`);
  await page.close();
}

await browser.close();
console.log(`sparkline: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
