// yMode (#531): a line chart indexed to a common base, or read as % change. The axis says what it reads once, 100 is a
// named reference line, the summary says the mode first, the readout and each point's name keep the value beside the
// reading, the table keeps the values and adds the reading, and the reader's switch (modes) changes all of it. Run
// after a render of every preview (it opens test/p-ChartIndexed-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 1200 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`file://${T}p-ChartIndexed-daylight.html`);
await page.waitForTimeout(700);
const state = (i) => page.evaluate((i) => {
  const f = document.querySelectorAll('.alt-chart')[i];
  return {
    unit: f.querySelector('.alt-chart-ymode-unit')?.textContent ?? null,
    ticks: [...f.querySelectorAll('[data-axis="y"] text')].map((t) => t.textContent),
    refs: [...f.querySelectorAll('.alt-chart-ref-label, .alt-chart-reference text, [class*="ref"] text')].map((t) => t.textContent),
    summary: f.querySelector('figcaption')?.textContent ?? '',
  };
}, i);

{
  const s = await state(0);
  expect(s.unit === 'Index, Jan 2026 = 100', `the axis says what it reads (${s.unit})`);
  expect(s.ticks.includes('100') && s.ticks.every((t) => Number(t) < 1000), `ticks are an index around 100 (${s.ticks})`);
  expect(/^Indexed to Jan 2026 = 100\./.test(s.summary), `the summary says the mode first (${s.summary.slice(0, 60)})`);
  const text = await page.evaluate(() => document.querySelectorAll('.alt-chart')[0].textContent);
  expect(text.includes('Jan 2026 = 100'), 'a reference line names the base');
}
{
  // The readout: the index and the value.
  const box = await page.locator('.alt-chart').first().locator('.alt-chart-plot').boundingBox();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
  await page.waitForTimeout(300);
  const readout = await page.evaluate(() => document.querySelector('.alt-chart-readout')?.textContent ?? '');
  expect(/\d+(\.\d)? · \$\d+K/.test(readout) && /\d+(\.\d)? · [\d,]+/.test(readout), `the readout shows both figures (${readout})`);
  await page.mouse.move(2, 2);
}
{
  // A point's name: "Mar 2026, Signups, index 118, 1,954."
  await page.locator('.alt-chart').first().locator('.alt-chart-node').first().focus();
  await page.keyboard.press('Enter'); await page.keyboard.press('Enter'); await page.keyboard.press('ArrowRight');
  const name = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');
  expect(/index \d+(\.\d)?, [\d,$K]+\./.test(name), `a point names the index and the value (${name})`);
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
}
{
  // The table keeps the values and adds the index.
  await page.getByRole('tab', { name: 'Table' }).first().click();
  await page.waitForTimeout(300);
  const t = await page.evaluate(() => {
    const tb = document.querySelector('.alt-chart-tablebox table');
    return { heads: [...tb.querySelectorAll('th')].map((h) => h.textContent), first: [...tb.querySelectorAll('tbody tr')[0].cells].map((c) => c.textContent) };
  });
  expect(t.heads.some((h) => /Signups, index/.test(h)) && t.heads.some((h) => /Revenue, index/.test(h)), `the table adds the index (${t.heads})`);
  expect(t.first.some((c) => /^\$\d+K$/.test(c)) && t.first.includes('100'), `the table keeps the values (${t.first})`);
  await page.getByRole('tab', { name: 'Chart' }).first().click();
}
{
  // The switch: Values, then % change.
  await page.getByRole('radio', { name: 'Values' }).click();
  await page.waitForTimeout(700);
  let s = await state(0);
  expect(s.unit === null && s.ticks.some((t) => /K|\d{3},?\d{3}/.test(t)), `Values reads the values, with no unit line (${s.unit}; ${s.ticks})`);
  expect(!/^Indexed/.test(s.summary), 'the summary drops the mode');
  await page.getByRole('radio', { name: '% change' }).click();
  await page.waitForTimeout(700);
  s = await state(0);
  expect(s.unit === '% change from Jan 2026' && s.ticks.some((t) => /%$/.test(t)), `% change reads from the base (${s.unit}; ${s.ticks})`);
  expect(/^Change from Jan 2026\./.test(s.summary), `the summary says it (${s.summary.slice(0, 40)})`);
}
{
  // The second chart starts as % change, with zero on its ground line.
  const s = await state(1);
  expect(s.unit === '% change from Jan 2026' && s.ticks.includes('0%'), `the regions read as change from zero (${s.ticks})`);
  const ground = await page.evaluate(() => !!document.querySelectorAll('.alt-chart')[1].querySelector('.alt-chart-ground'));
  expect(ground, 'zero is the ground line');
}
expect(errors.length === 0, `no page errors (${errors.join(' | ')})`);
await browser.close();
console.log(`chart indexed: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
