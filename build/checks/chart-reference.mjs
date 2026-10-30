// References and annotations (#68): a reference line is 1px ink-muted and solid, a status threshold wears its tone and
// icon, a band is a flat line-coloured fill under the marks; references count toward y; a mean or median is computed
// and said at the data's precision, and glides when the data changes; labels never overlap each other or a plate,
// and neither covers a line or a bar;
// annotations are Badge plates in rows with a leader to their x, buttons when they act (lifting when pointed at);
// the summary lists references and annotations; horizontal charts draw references across; forced colours hatch bands.
// Run after a render of every preview (it opens test/p-ChartReference-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

const open = async (name = 'ChartReference', media) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 1000 } });
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-${name}-daylight.html`);
  await page.waitForTimeout(700);
  return page;
};
const read = (page) => page.evaluate(() => {
  const colour = (v) => { const d = document.createElement('div'); d.style.color = v; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; };
  const rect = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
  return {
    inkMuted: colour('var(--ink-muted)'), critical: colour('var(--critical)'), caution: colour('var(--caution)'), line: colour('var(--line)'), lineControl: colour('var(--line-control)'),
    charts: [...document.querySelectorAll('.alt-chart')].map((fig) => {
      const plot = fig.querySelector('.alt-chart-plot');
      const cs = (el) => getComputedStyle(el);
      const kids = [...plot.querySelector('.alt-chart-svg > g').children].map((g) => g.getAttribute('class'));
      return {
        order: kids,
        lines: [...plot.querySelectorAll('.alt-chart-ref')].map((l) => ({ tone: l.dataset.tone ?? null, stroke: cs(l).stroke, w: cs(l).strokeWidth, dash: cs(l).strokeDasharray, x1: +l.getAttribute('x1'), x2: +l.getAttribute('x2'), y1: +l.getAttribute('y1'), y2: +l.getAttribute('y2') })),
        bands: [...plot.querySelectorAll('.alt-chart-ref-band')].map((b) => ({ fill: cs(b).fill, attr: b.getAttribute('fill') })),
        labels: [...plot.querySelectorAll('.alt-chart-ref-label')].map((g) => ({ text: g.querySelector('text').textContent, tone: g.dataset.tone ?? null, icon: !!g.querySelector('.alt-chart-ref-icon'), iconColour: g.querySelector('.alt-chart-ref-icon') ? cs(g.querySelector('.alt-chart-ref-icon')).color : null, box: rect(g) })),
        plates: [...plot.querySelectorAll('.alt-chart-note')].map((p) => ({ text: p.textContent, tag: p.tagName, hidden: p.getAttribute('aria-hidden'), name: p.getAttribute('aria-label'), box: rect(p), cls: p.className })),
        leaders: [...plot.querySelectorAll('.alt-chart-note-leader')].map((l) => ({ x: +l.getAttribute('x1'), y1: +l.getAttribute('y1'), y2: +l.getAttribute('y2'), stroke: cs(l).stroke })),
        yTicks: [...plot.querySelectorAll('[data-axis="y"] text')].map((t) => t.textContent),
        summary: fig.querySelector('figcaption').textContent,
        node: plot.querySelector('.alt-chart-node')?.getAttribute('aria-label'),
      };
    }),
  };
});
const overlap = (a, b) => a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5;

// What a word covers (#184): the points along each line's stroke, and each bar's box, inside a label or a plate.
const covered = (page) => page.evaluate(() => [...document.querySelectorAll('.alt-chart')].map((fig) => {
  const plot = fig.querySelector('.alt-chart-plot');
  const pts = [...plot.querySelectorAll('.alt-line-stroke')].flatMap((path) => {
    const n = path.getTotalLength(), m = path.getScreenCTM(), out = [];
    for (let l = 0; l <= n; l += 2) { const p = path.getPointAtLength(l); out.push([m.a * p.x + m.c * p.y + m.e, m.b * p.x + m.d * p.y + m.f]); }
    return out;
  });
  const bars = [...plot.querySelectorAll('.alt-bar-mark, .alt-bar rect, .alt-bar path')].map((b) => b.getBoundingClientRect()).filter((r) => r.width && r.height);
  const words = [...[...plot.querySelectorAll('.alt-chart-ref-label')].map((g) => ({ text: g.querySelector('text').textContent, r: g.getBoundingClientRect() })),
    ...[...plot.querySelectorAll('.alt-chart-note')].map((p) => ({ text: p.textContent, r: p.getBoundingClientRect() }))];
  return words.filter(({ r }) => pts.some(([x, y]) => x > r.left && x < r.right && y > r.top && y < r.bottom)
    || bars.some((b) => b.left < r.right - 0.5 && r.left < b.right - 0.5 && b.top < r.bottom - 0.5 && r.top < b.bottom - 0.5)).map((w) => w.text);
}));

{
  const page = await open();
  const { inkMuted, critical, caution, line, lineControl, charts: [up, spend, score, lat] } = await read(page);
  // Uptime: band, target, critical limit, an annotation.
  const plain = up.lines.find((l) => !l.tone), crit = up.lines.find((l) => l.tone === 'critical');
  expect(plain && plain.stroke === inkMuted && plain.w === '1px' && plain.dash === 'none', `a reference line is 1px ink-muted and solid (${JSON.stringify(plain)})`);
  expect(crit && crit.stroke === critical, `a critical threshold wears critical (${crit?.stroke})`);
  const critLabel = up.labels.find((l) => l.tone === 'critical');
  expect(critLabel?.icon && critLabel.iconColour === critical && critLabel.text === 'Limit 99%', `its label carries the status icon (${JSON.stringify(critLabel)})`);
  expect(up.bands.length === 1 && up.bands[0].fill === line, `a band is a flat line-coloured fill (${up.bands[0]?.fill} vs ${line})`);
  expect(up.order.indexOf('alt-chart-refs-under') < up.order.indexOf('alt-chart-marks') && up.order.indexOf('alt-chart-refs') > up.order.indexOf('alt-chart-marks'), `bands and leaders lie under the marks, lines over (${up.order})`);
  expect(/References: Normal range, 99\.5% to 100%; Target 99\.9% at 99\.9%; Limit 99% at 99%\. 1 annotation: DNS outage, Mar 14, 2026\.$/.test(up.summary), `the summary lists references and annotations: "${up.summary}"`);
  expect(/1 annotation: DNS outage, Mar 14, 2026\. Press Enter/.test(up.node ?? ''), `so does the keyboard's summary: "${up.node}"`);
  // Spend: budget above every bar counts toward y; the median is computed.
  expect(spend.yTicks.at(-1) === '$1,000', `a reference above every value is still on the plot (${spend.yTicks})`);
  const budget = spend.lines.find((l) => l.tone === 'caution');
  expect(budget?.stroke === caution && spend.labels.some((l) => l.text === 'Budget $700' && l.icon), 'a caution threshold wears caution, with its icon');
  expect(spend.labels.some((l) => l.text === 'Median $430'), `the median is computed and said (${spend.labels.map((l) => l.text)})`);
  // Horizontal: references run across.
  const bar = score.lines[0];
  expect(bar && bar.x1 === bar.x2 && bar.y1 === 0 && bar.y2 > 100, `across a horizontal chart, a reference stands upright (${JSON.stringify(bar)})`);
  // Latency: mean at the data's precision, annotations in rows.
  expect(lat.labels.some((l) => /^Average 162\.5 ms$/.test(l.text)), `a mean is said at the data's precision (${lat.labels.map((l) => l.text)})`);
  expect(lat.plates.length === 3 && lat.plates.every((p, i) => lat.plates.every((q, j) => i === j || !overlap(p.box, q.box))), 'annotation plates never overlap each other');
  expect(new Set(lat.plates.map((p) => Math.round(p.box.t))).size === 3, `crowded plates stack into rows (${lat.plates.map((p) => Math.round(p.box.t))})`);
  expect(lat.leaders.length === 3 && lat.leaders.every((l) => l.stroke === lineControl), 'each plate has a 1px line-control leader');
  for (const c of [up, spend, score, lat]) {
    const boxes = [...c.labels.map((l) => l.box), ...c.plates.map((p) => p.box)];
    expect(boxes.every((a, i) => boxes.every((b, j) => i === j || !overlap(a, b))), `labels and plates never overlap (${c.labels.map((l) => l.text)})`);
  }
  const under = await covered(page);
  expect(under.every((c) => c.length === 0), `no reference label or plate covers a line or a bar (#184; ${JSON.stringify(under)})`);
  const btn = lat.plates.find((p) => p.text === 'Cache rollout'), still = lat.plates.find((p) => p.text === 'Incident 412');
  expect(btn?.tag === 'BUTTON' && btn.name === 'Cache rollout, Apr 10, 2026' && /alt-badge/.test(btn.cls), `an annotation that acts is a Badge-plate button named with its date (${JSON.stringify(btn)})`);
  expect(still?.tag === 'SPAN' && still.hidden === 'true', 'one that only labels is hidden from assistive technology (the summary lists it)');
  const plate = page.locator('.alt-chart-note', { hasText: 'Cache rollout' });
  const flat = await plate.evaluate((el) => getComputedStyle(el).boxShadow);
  await plate.hover(); await page.waitForTimeout(250);
  const lifted = await plate.evaluate((el) => ({ shadow: getComputedStyle(el).boxShadow, transform: getComputedStyle(el).transform }));
  expect(lifted.shadow !== flat && lifted.transform !== 'none', `it lifts one level when pointed at (${lifted.transform})`);
  await plate.click();
  await page.waitForTimeout(100);
  expect(await page.getByText('Picked: Cache rollout', { exact: true }).count() === 1, 'pressing it calls onSelect');

  // The median glides with the data, staged with the rescale.
  const medianY = () => page.evaluate(() => { const l = [...document.querySelectorAll('.alt-chart')][1].querySelectorAll('.alt-chart-ref')[1]; return +l.getAttribute('y1'); });
  const y0 = await medianY();
  await page.getByRole('button', { name: 'This week' }).click();
  const ys = [];
  for (let i = 0; i < 14; i++) { ys.push(await medianY()); await page.waitForTimeout(30); }
  await page.waitForTimeout(500);
  const after = await read(page);
  expect(new Set(ys.map((v) => Math.round(v))).size >= 3, `the reference glides rather than jumps (${ys.map((v) => Math.round(v))})`);
  expect(after.charts[1].labels.some((l) => l.text === 'Median $575') && (await medianY()) !== y0, `and settles on the new median (${after.charts[1].labels.map((l) => l.text)})`);
  await page.close();
}

// Forced colours: lines CanvasText, bands hatched, plates bordered.
{
  const page = await open('ChartReference', { forcedColors: 'active' });
  const { charts: [up, , , lat] } = await read(page);
  const borders = await page.evaluate(() => [...document.querySelectorAll('.alt-chart-note')].map((p) => getComputedStyle(p).borderTopWidth));
  expect(borders.length === 4 && borders.every((b) => b === '1px'), `forced: every plate has a border, buttons too (${borders})`);
  expect(/url\(.*-ref"?\)/.test(up.bands[0]?.fill ?? '') && up.lines.every((l) => l.stroke === 'rgb(0, 0, 0)'), `forced: the band is hatched and lines are CanvasText (${up.bands[0]?.fill}, ${up.lines.map((l) => l.stroke)})`);
  await page.close();
}

// At 360px, where labels crowd, they still never overlap each other or a plate.
{
  const page = await browser.newPage({ viewport: { width: 360, height: 2400 } });
  await page.goto(`file://${T}p-ChartReference-daylight.html`);
  await page.waitForTimeout(700);
  const { charts } = await read(page);
  for (const c of charts) {
    const boxes = [...c.labels.map((l) => l.box), ...c.plates.map((p) => p.box)];
    expect(boxes.every((a, i) => boxes.every((b, j) => i === j || !overlap(a, b))), `360px: labels and plates never overlap (${c.labels.map((l) => l.text)})`);
  }
  // A small plot can leave a label no clear spot (it then takes the one covering least), but the headroom always holds.
  const narrow = await covered(page);
  const plates = new Set(charts.flatMap((c) => c.plates.map((p) => p.text)));
  expect(narrow.every((c) => c.every((t) => !plates.has(t))) && narrow[2].length === 0, `360px: no plate, nor a label across a horizontal chart, covers a mark (${JSON.stringify(narrow)})`);
  await page.close();
}

// Charts without references or annotations are unchanged.
{
  const page = await open('BarChart');
  const n = await page.evaluate(() => document.querySelectorAll('.alt-chart-refs, .alt-chart-refs-under, .alt-chart-note').length);
  expect(n === 0, `BarChart without references draws as before (${n})`);
  await page.close();
}

await browser.close();
console.log(`chart-reference: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
