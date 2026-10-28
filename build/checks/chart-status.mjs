// Not yet the record (#67): partial and projected bars are hatched in their colour on the plot's own with no solid
// fill (a projection keeps its outline); a line is dashed from the last settled point with hollow points; areas are
// hatched; an uncertainty band is a flat low-opacity fill that counts toward y; the record ends at a 1px rule named
// "Today"; point names, the readout, the table and the summary say "So far" or "Projected"; a partial period that
// completes cross-fades from hatch to solid; forced colours dot the pending outline; charts without a status are
// unchanged. Run after a render of every preview (it opens test/p-ChartStatus-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

const open = async (name = 'ChartStatus', media) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 1000 } });
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-${name}-daylight.html`);
  await page.waitForTimeout(700);
  return page;
};
const read = (page) => page.evaluate(() => [...document.querySelectorAll('.alt-chart')].map((fig) => {
  const plot = fig.querySelector('.alt-chart-plot');
  const cs = (el) => getComputedStyle(el);
  const pat = (url) => { const id = /#([^)]+)\)/.exec(url ?? '')?.[1]; const p = id && document.getElementById(id); return p ? { bg: p.querySelector('rect')?.getAttribute('fill'), fg: p.querySelector('line, circle')?.getAttribute('stroke') ?? p.querySelector('circle')?.getAttribute('fill'), rot: p.getAttribute('patternTransform') } : null; };
  return {
    bars: [...plot.querySelectorAll('.alt-bar-mark')].map((b) => ({ cat: b.dataset.category, status: b.dataset.status ?? null, op: cs(b).fillOpacity })),
    pending: [...plot.querySelectorAll('.alt-bar-pending')].map((b) => ({ cat: b.dataset.category, op: cs(b).fillOpacity, sop: cs(b).strokeOpacity, stroke: b.getAttribute('stroke'), dash: cs(b).strokeDasharray, pat: pat(b.getAttribute('fill')) })),
    boundary: [...plot.querySelectorAll('.alt-chart-boundary')].map((g) => ({ x: +g.querySelector('line').getAttribute('x1'), text: plot.querySelector('.alt-chart-boundary-label')?.textContent, stroke: cs(g.querySelector('line')).stroke, w: cs(g.querySelector('line')).strokeWidth })),
    lineControl: cs(fig).getPropertyValue('--line-control').trim(),
    strokes: [...plot.querySelectorAll('.alt-line-stroke')].map((p) => ({ pending: p.hasAttribute('data-pending'), dash: p.getAttribute('stroke-dasharray'), clip: p.getAttribute('clip-path') })),
    hollow: plot.querySelectorAll('.alt-line-hollow').length,
    band: [...plot.querySelectorAll('.alt-line-band')].map((p) => ({ op: p.getAttribute('fill-opacity'), fill: p.getAttribute('fill'), box: p.getBBox() })),
    areaPending: [...plot.querySelectorAll('.alt-area-fill[data-pending]')].map((p) => ({ key: p.dataset.series, pat: pat(p.getAttribute('fill')) })),
    areaTopPending: [...plot.querySelectorAll('.alt-area-line[data-pending]')].map((p) => p.getAttribute('stroke-dasharray')),
    labels: [...plot.querySelectorAll('.alt-bar-label')].map((t) => t.textContent),
    gradients: plot.querySelectorAll('linearGradient, radialGradient').length,
    yTop: Math.max(...[...plot.querySelectorAll('[data-axis="y"] text')].map((t) => parseFloat(t.textContent.replace(/[^\d.]/g, '')))),
    xOf: Object.fromEntries([...plot.querySelectorAll('.alt-bar-mark')].map((b) => { const r = b.getBBox(); return [b.dataset.category, [r.x, r.x + r.width]]; })),
    summary: fig.querySelector('figcaption').textContent,
  };
}));

{
  const page = await open();
  const [rev, sign, area, q] = await read(page);
  // Bars
  const oct = rev.bars.find((b) => b.status);
  expect(oct?.cat === '2026-10-01' && oct.status === 'partial' && +oct.op === 0, `the partial bar has no solid fill (${JSON.stringify(oct)})`);
  expect(rev.bars.filter((b) => !b.status).every((b) => +b.op === 1), 'settled bars are solid');
  const octP = rev.pending.find((p) => p.cat === '2026-10-01');
  expect(octP && +octP.op === 1 && octP.stroke === 'none' && octP.pat?.bg === 'var(--alt-chart-bg)' && octP.pat?.fg === 'var(--data-1)' && octP.pat?.rot === 'rotate(45)',
    `a partial bar is a 45° hatch of its colour on the plot's own, with no outline (${JSON.stringify(octP)})`);
  expect(rev.pending.filter((p) => p.cat !== '2026-10-01').every((p) => +p.op === 0 && +p.sop === 0), 'settled bars carry no hatch');
  expect(rev.labels.includes('so far') && rev.labels.some((l) => /^\$61K$/.test(l)), `the partial bar's label says so: ${rev.labels}`);
  const [sep, octX] = [rev.xOf['2026-09-01'], rev.xOf['2026-10-01']];
  expect(rev.boundary.length === 1 && rev.boundary[0].text === 'Today' && rev.boundary[0].x > sep[1] && rev.boundary[0].x < octX[0] && rev.boundary[0].w === '1px',
    `a 1px rule named "Today" sits between the last settled bar and the first that isn't (${JSON.stringify(rev.boundary)})`);
  expect(rev.boundary[0].stroke === (await page.evaluate(() => { const d = document.createElement('div'); d.style.color = 'var(--line-control)'; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; })), 'the rule is line-control');
  const q3 = q.pending.find((p) => p.cat === 'Q3'), q4 = q.pending.find((p) => p.cat === 'Q4');
  expect(q4?.stroke === 'var(--data-1)' && +q4.sop === 1 && q3?.stroke === 'none', `a projection keeps its outline, a partial period doesn't (${q4?.stroke}, ${q3?.stroke})`);
  expect(/is so far, not complete\./.test(rev.summary) && /lowest at May 1, 2026 \(\$72K\)/.test(rev.summary), `the summary reads extremes from the record and says what's so far: "${rev.summary}"`);
  // Line
  const solid = sign.strokes.filter((s) => !s.pending), dashed = sign.strokes.filter((s) => s.pending);
  expect(solid.length === 1 && dashed.length === 1 && dashed[0].dash === '5 4' && solid[0].dash === null && /url\(#/.test(dashed[0].clip), `one path, clipped: solid for the record, dashed 5 4 after (${JSON.stringify(sign.strokes)})`);
  expect(sign.hollow === 1, `the projected end point is hollow (${sign.hollow})`);
  expect(sign.band.length === 1 && sign.band[0].op === '0.16' && sign.band[0].fill === 'var(--data-1)' && sign.gradients === 0, `the band is a flat low-opacity fill, no gradient (${JSON.stringify(sign.band)})`);
  expect(sign.yTop >= 800, `y reaches the band's high edge (${sign.yTop})`);
  expect(sign.boundary.length === 1 && sign.boundary[0].text === 'Today', 'the line has its "Today" rule');
  expect(/Oct 23, 2026 to Oct 28, 2026 are projected\./.test(sign.summary), `the summary says what's projected: "${sign.summary}"`);
  // Area
  expect(area.areaPending.length === 3 && area.areaPending.every((p) => p.pat?.bg === 'var(--alt-chart-bg)'), `every band is hatched where it's projected (${area.areaPending.length})`);
  expect(area.areaTopPending.length === 1 && area.areaTopPending[0] === '5 4', `the top line is dashed where it's projected (${area.areaTopPending})`);

  // Keyboard names, the readout and the table.
  const name = () => page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  await page.locator('.alt-chart-node').first().focus();
  await page.keyboard.press('Enter'); await page.keyboard.press('End');
  expect(/^Oct 1, 2026, Revenue, \$61K, so far\. /.test(await name()), `a partial point says so: "${await name()}"`);
  const note = await page.evaluate(() => document.querySelector('.alt-chart-readout-note')?.textContent);
  expect(note === 'So far', `the readout's heading says "So far" (${note})`);
  await page.keyboard.press('Escape');
  await page.locator('.alt-chart-node').nth(1).focus();
  await page.keyboard.press('Enter'); await page.keyboard.press('End');
  const proj = await name();
  expect(/^Oct 28, 2026, Signups, \d+, projected\. Range 10th–90th percentile \d+ to \d+\./.test(proj), `a projected point says so, with its range: "${proj}"`);
  const rows = await page.evaluate(() => [...document.querySelectorAll('.alt-chart')[1].querySelectorAll('.alt-chart-readout .alt-chart-readout-row')].map((r) => r.textContent));
  expect(rows.length === 2 && /^\d+–\d+Range 10th–90th percentile$/.test(rows[1]), `the readout has the range's row: ${JSON.stringify(rows)}`);
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Table' }).click();
  await page.waitForTimeout(300);
  const table = await page.evaluate(() => {
    const t = document.querySelector('.alt-chart-tablebox table');
    return { head: [...t.querySelectorAll('thead th')].map((h) => h.textContent), last: [...t.querySelectorAll('tbody tr:last-child td')].map((c) => c.textContent), first: [...t.querySelectorAll('tbody tr:first-child td')].map((c) => c.textContent) };
  });
  expect(table.head.at(-1) === 'Status' && table.last.at(-1) === 'So far' && table.first.at(-1) === 'Actual', `the table has a Status column (${JSON.stringify(table)})`);

  // A partial period that completes cross-fades from hatch to solid over dur-travel-3.
  await page.getByRole('button', { name: 'Close the period' }).click();
  const mid = [];
  for (let i = 0; i < 6; i++) {
    mid.push(await page.evaluate(() => { const b = [...document.querySelectorAll('.alt-chart')][3].querySelector('.alt-bar-mark[data-category="Q3"]'); return +getComputedStyle(b).fillOpacity; }));
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(400);
  const [, , , q2] = await read(page);
  const q3b = q2.bars.find((b) => b.cat === 'Q3'), q3h = q2.pending.find((p) => p.cat === 'Q3');
  expect(mid.some((v) => v > 0.02 && v < 0.98), `the fill cross-fades in (${mid.map((v) => v.toFixed(2))})`);
  expect(+q3b.op === 1 && +q3h.op === 0 && !q3b.status, 'once complete it is solid, its hatch gone');
  expect(q2.boundary.length === 1 && q2.boundary[0].x > q2.xOf.Q3[1] && q2.boundary[0].x < q2.xOf.Q4[0], 'the rule moves to where the record now ends');
  await page.close();
}

// Forced colours: the pending outline is dotted CanvasText, and a slot with its own hatch keeps it, faded.
{
  const page = await open('ChartStatus', { forcedColors: 'active' });
  const [rev, , area] = await read(page);
  const p = rev.pending.find((x) => x.cat === '2026-10-01');
  expect(/^2px,?\s*2px$/.test(p.dash) && p.stroke === 'CanvasText', `forced: a pending bar has a dotted CanvasText outline (${p.dash}, ${p.stroke})`);
  const eu = await page.evaluate(() => { const p = document.querySelector('.alt-area-fill[data-pending][data-series="eu"]'); return { fill: p.getAttribute('fill'), op: p.getAttribute('fill-opacity') }; });
  expect(/-data-2\)$/.test(eu.fill) && eu.op === '0.45', `forced: a band with its own hatch keeps it where it's projected, faded (${JSON.stringify(eu)})`);
  await page.close();
}

// Charts without a status are unchanged: no hatch overlay, no rule, no Status column.
{
  const page = await open('BarChart');
  const n = await page.evaluate(() => ({ pending: document.querySelectorAll('.alt-bar-pending').length, rule: document.querySelectorAll('.alt-chart-boundary').length, style: [...document.querySelectorAll('.alt-bar-mark')].filter((b) => b.getAttribute('style')).length }));
  expect(n.pending === 0 && n.rule === 0 && n.style === 0, `BarChart without status draws as before (${JSON.stringify(n)})`);
  await page.close();
}

await browser.close();
console.log(`chart-status: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
