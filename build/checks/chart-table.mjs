// The table view (#64): a Chart | Table tab list (APG tabs, focus stays on the tab); switching cross-fades in the chart's
// own box without moving the page; the hidden view is inert; the table has x first, a column per series in its own
// format, a Total for stacks, and sorts. Run after a render of every preview (it opens test/p-ChartTable-daylight.html);
// exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 800 } });
await page.goto(`file://${T}p-ChartTable-daylight.html`);
await page.waitForTimeout(700);

const fig = page.locator('.alt-chart').first();
const state = () => fig.evaluate((f) => {
  const tabs = [...f.querySelectorAll('[role="tab"]')].map((t) => `${t.textContent}:${t.getAttribute('aria-selected')}`);
  const panels = [...f.querySelectorAll('.alt-chart-view')].map((p) => ({ state: p.dataset.state, inert: p.hasAttribute('inert'), hidden: p.getAttribute('aria-hidden') }));
  return { tabs, panels, height: f.getBoundingClientRect().height, list: f.querySelector('[role="tablist"]').getAttribute('aria-label'), transition: getComputedStyle(f.querySelector('.alt-chart-view')).transitionProperty };
});

let s = await state();
expect(s.list === 'View' && s.tabs.join() === 'Chart:true,Table:false', `a tab list named View, on the chart: ${s.tabs}`);
expect(s.panels[1].inert && s.panels[1].hidden === 'true' && s.panels[0].state === 'active', 'the table waits, inert and hidden from assistive technology');
const h0 = s.height;

// Keyboard: focus the selected tab, → selects Table and focus stays on the tab.
await fig.locator('[role="tab"][aria-selected="true"]').focus();
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(60);
s = await state();
const onTab = await page.evaluate(() => document.activeElement.getAttribute('role') + ':' + document.activeElement.textContent);
expect(s.tabs.join() === 'Chart:false,Table:true' && onTab === 'tab:Table', `→ chooses Table and focus stays on the tab (${onTab})`);
expect(s.panels[0].inert && !s.panels[1].inert, 'now the chart is inert and the table is live');
expect(/opacity/.test(s.transition) && !/transform|translate/.test(s.transition), `the views cross-fade, never slide: ${s.transition}`);
await page.waitForTimeout(300);
expect(Math.abs((await state()).height - h0) < 1, `switching doesn't move the page (${h0} → ${(await state()).height})`);
expect(await fig.evaluate((f) => [...f.querySelectorAll('.alt-chart-node')].every((n) => n.closest('[inert]'))), "the chart's keyboard path can't be reached from the table");

// The table: x first, a column per series, a Total for the stack; sortable.
const table = () => fig.evaluate((f) => ({
  head: [...f.querySelectorAll('thead th')].map((t) => t.textContent.trim()),
  first: [...f.querySelectorAll('tbody tr')].map((r) => r.querySelector('th, td').textContent.trim()),
  row: [...f.querySelector('tbody tr').querySelectorAll('th, td')].map((c) => c.textContent.trim()),
  rows: f.querySelectorAll('tbody tr').length,
}));
let t = await table();
expect(t.head.join() === 'Month,API,Web,Jobs,Total', `columns: ${t.head}`);
expect(t.rows === 6 && t.row.join() === 'Jan,20,14,6,40', `one row per record, totals summed: ${t.row}`);
await fig.locator('thead button', { hasText: 'API' }).click();
await page.waitForTimeout(400);
t = await table();
expect(t.first.join() === 'Jan,Jun,Mar,May,Feb,Apr' || t.first.join() === 'Apr,Feb,May,Mar,Jun,Jan', `sorting by a series orders the rows: ${t.first}`);

// views="table" starts on the table, with the x header named by xLabel.
{
  const second = page.locator('.alt-chart').nth(1);
  const r = await second.evaluate((f) => ({ tabs: [...f.querySelectorAll('[role="tab"]')].map((x) => x.getAttribute('aria-selected')).join(), head: f.querySelector('thead th').textContent.trim() }));
  expect(r.tabs === 'false,true' && r.head === 'Month', `views="table" starts on the table: ${JSON.stringify(r)}`);
}

// Controlled: view and onViewChange.
{
  const r = await page.evaluate(() => new Promise((done) => {
    const d = document.createElement('div'); d.style.cssText = 'width:420px;position:fixed;top:0;left:0;z-index:9999;background:#fff'; document.body.prepend(d);
    const A = window.Altitude, h = React.createElement, calls = [];
    function C() {
      const [view, setView] = React.useState('chart');
      return h(A.ChartContainer, { id: 'ctl', views: true, view, onViewChange: (v) => { calls.push(v); setView(v); }, config: { v: { label: 'V' } } },
        h(A.BarChart, { data: [{ k: 'a', v: 1 }, { k: 'b', v: 2 }], x: 'k' }));
    }
    ReactDOM.createRoot(d).render(h(C));
    setTimeout(() => { d.querySelectorAll('[role="tab"]')[1].click(); setTimeout(() => done({ calls, sel: [...d.querySelectorAll('[role="tab"]')].map((x) => x.getAttribute('aria-selected')).join() }), 200); }, 400);
  }));
  expect(r.calls.join() === 'table' && r.sel === 'false,true', `controlled view and onViewChange: ${JSON.stringify(r)}`);
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
