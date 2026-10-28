// ChartLegend: a static legend is a labelled list; a toggle legend is one toolbar of aria-pressed switches (one Tab
// stop, arrow keys between keys) whose toggling fades a series out, rescales y and repaints nothing else, is announced,
// and never hides the last series. Run after a render of every preview (it opens test/p-ChartLegend-daylight.html);
// exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
await page.goto(`file://${T}p-ChartLegend-daylight.html`);
await page.waitForTimeout(700);

// Static: a list of keys, no buttons.
{
  const s = await page.evaluate(() => { const l = document.querySelectorAll('.alt-chart-legend')[0]; return { role: l.getAttribute('role'), name: l.getAttribute('aria-label'), items: l.querySelectorAll('[role="listitem"]').length, buttons: l.querySelectorAll('button').length }; });
  expect(s.role === 'list' && s.name === 'Series' && s.items === 3 && s.buttons === 0, `a legend that only labels is a list of keys: ${JSON.stringify(s)}`);
}

const legend = page.locator('.alt-chart-legend').nth(1);
const chart = page.locator('.alt-chart-plot').nth(1);
const keys = () => legend.locator('button').evaluateAll((bs) => bs.map((b) => `${b.textContent}:${b.getAttribute('aria-pressed')}:${b.tabIndex}`));
const lines = () => chart.evaluate((p) => Object.fromEntries([...p.querySelectorAll('.alt-line')].map((g) => [g.dataset.series, { stroke: g.querySelector('.alt-line-stroke').getAttribute('stroke'), o: g.getAttribute('opacity') }])));
const ticks = () => chart.evaluate((p) => [...p.querySelectorAll('[data-axis="y"] text')].map((t) => t.textContent).join(','));

// Toggle: a toolbar of switches, Enterprise hidden from the start.
{
  const t = await legend.evaluate((l) => ({ role: l.getAttribute('role'), name: l.getAttribute('aria-label') }));
  expect(t.role === 'toolbar' && t.name === 'Series', 'a toggle legend is a toolbar named Series');
  const k = await keys();
  expect(k.join() === 'Free:true:0,Team:true:-1,Business:true:-1,Enterprise:false:-1', `keys are aria-pressed buttons, one in the tab order: ${k}`);
  const l = await lines();
  expect(!('enterprise' in l) && (await ticks()).startsWith('30'), 'a series hidden from the start is left out, and y fits the rest');
}

// Keyboard: one Tab stop; arrows move between keys; Space toggles.
const before = await lines();
const ticksBefore = await ticks();
// Each chart is one Tab stop, then its legend: Tab, Tab (the two plots), Tab (the toggle legend).
await page.keyboard.press('Tab');
await page.keyboard.press('Tab');
expect(await page.evaluate(() => document.activeElement.dataset.level) === 'summary', 'the plot comes first, as one Tab stop');
await page.keyboard.press('Tab');
expect(await page.evaluate(() => document.activeElement.textContent) === 'Free', 'Tab from the plot lands on the legend\'s first key');
await page.keyboard.press('ArrowRight');
await page.keyboard.press('ArrowRight');
expect(await page.evaluate(() => document.activeElement.textContent) === 'Business', '→ moves between keys');
await page.keyboard.press('End');
expect(await page.evaluate(() => document.activeElement.textContent) === 'Enterprise', 'End goes to the last key');
await page.keyboard.press('Home');
await page.keyboard.press('ArrowRight');
await page.keyboard.press('Space');
await page.waitForTimeout(80);
{
  const k = await keys();
  expect(k[1] === 'Team:false:0', `Space hides Team and keeps focus on its key: ${k[1]}`);
  const said = await legend.evaluate((l) => l.querySelector('[aria-live]').textContent);
  expect(said === 'Team hidden. 2 of 4 series shown.', `it's announced politely: "${said}"`);
  const mid = await lines();
  expect(mid.team && mid.team.o !== null && +mid.team.o < 1, `the hidden series fades out rather than vanishing (opacity ${mid.team?.o})`);
}
await page.waitForTimeout(700);
{
  const after = await lines();
  expect(!('team' in after), 'once faded, the hidden series is gone from the plot');
  expect(after.free.stroke === before.free.stroke && after.business.stroke === before.business.stroke, 'the other series keep their colours (slots never repaint)');
}
// Showing Enterprise (12–17) rescales y to take it in.
await page.keyboard.press('End');
await page.keyboard.press('Space');
await page.waitForTimeout(800);
expect((await ticks()).startsWith('0') && (await ticks()) !== ticksBefore, `y rescales to the shown series: ${ticksBefore} → ${await ticks()}`);
await page.keyboard.press('Space');
await page.waitForTimeout(800);

// The last shown series stays: hide Free and Business, then Business's key won't hide it.
await page.keyboard.press('Home');
await page.keyboard.press('Space');
await page.keyboard.press('End');
await page.keyboard.press('ArrowLeft');
{
  const k = await keys();
  const last = await legend.locator('button').nth(2).evaluate((b) => ({ dis: b.getAttribute('aria-disabled'), desc: document.getElementById(b.getAttribute('aria-describedby'))?.textContent }));
  expect(k[2] === 'Business:true:0' && last.dis === 'true' && last.desc === 'At least one series stays shown.', `the last shown series can't be hidden, and says why: ${JSON.stringify(last)}`);
  await page.keyboard.press('Space');
  await page.waitForTimeout(50);
  expect((await keys())[2] === 'Business:true:0', 'pressing it does nothing');
}

// Pointing at a key lifts it (clicking it does something); its swatch is a trench the series fills.
{
  const key = legend.locator('button').nth(0);
  await key.hover();
  await page.waitForTimeout(250);
  const st = await key.evaluate((b) => ({ t: getComputedStyle(b).transform, sh: getComputedStyle(b).boxShadow, sw: getComputedStyle(b.querySelector('.alt-legend-swatch')).boxShadow }));
  expect(st.t !== 'none' && st.sh !== 'none', `a hovered key lifts: ${st.t}`);
  expect(/inset/.test(st.sw), 'its swatch is a trench (an inset shadow)');
}

// Controlled: hidden and onHiddenChange.
{
  const r = await page.evaluate(() => new Promise((done) => {
    const d = document.createElement('div'); d.style.cssText = 'width:420px;position:fixed;top:0;left:0;z-index:9999;background:#fff'; document.body.prepend(d);
    const A = window.Altitude, h = React.createElement;
    const calls = [];
    function C() {
      const [hidden, setHidden] = React.useState(['b']);
      return h(A.ChartContainer, { id: 'ctl', config: { a: { label: 'A' }, b: { label: 'B' } } },
        h(A.BarChart, { data: [{ k: 'x', a: 1, b: 2 }], x: 'k' }, h(A.ChartLegend, { content: h(A.ChartLegendContent, { toggle: true, hidden, onHiddenChange: (n) => { calls.push(n.join()); setHidden(n); } }) })));
    }
    ReactDOM.createRoot(d).render(h(C));
    setTimeout(() => {
      const bs = d.querySelectorAll('button');
      const first = [...bs].map((b) => b.getAttribute('aria-pressed')).join();
      bs[1].click();
      setTimeout(() => done({ first, calls, after: [...d.querySelectorAll('button')].map((b) => b.getAttribute('aria-pressed')).join(), bars: d.querySelectorAll('.alt-bar path').length }), 600);
    }, 400);
  }));
  expect(r.first === 'true,false' && r.calls.length === 1 && r.calls[0] === '' && r.after === 'true,true' && r.bars === 2, `controlled hidden and onHiddenChange: ${JSON.stringify(r)}`);
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
