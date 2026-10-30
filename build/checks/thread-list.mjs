// ThreadList (#269): conversations in a nav, grouped by date; each row's name says its state ("Q3 pricing comparison,
// Needs approval, 2 minutes ago"); working is a lamp plate, never hovering; the current row is aria-current; unread
// says so; F2 renames in place (Enter saves, Escape cancels, focus returns); Delete leaves a receipt with Undo; the row
// menu is named for its thread; a thread that starts needing you is announced once; ⌘K focuses search. Run after a
// render of every preview (it drives test/p-ThreadList-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
await page.goto(`file://${T}p-ThreadList-daylight.html`); await page.waitForTimeout(500);
const names = () => page.evaluate(() => [...document.querySelectorAll('.alt-thread-link')].map((a) => a.textContent.replace(/\s+/g, ' ').trim()));
const n = await names();
expect(await page.evaluate(() => document.querySelector('nav[aria-label="Conversations"], [aria-label="Conversations"]') !== null), 'a landmark named "Conversations"');
expect(n[0] === 'Q3 pricing comparison, Needs approval, 2 minutes ago', `a row's name says its state (${n[0]})`);
expect(n[2].startsWith('Summarise incident #4821, unread'), `unread says so (${n[2]})`);
const groups = await page.evaluate(() => [...document.querySelectorAll('.alt-threads-group .alt-sidebar-label, .alt-threads-group button')].map((g) => g.textContent.trim()).filter(Boolean));
expect(groups.slice(0, 3).join() === 'Today,Yesterday,Previous 7 days', `grouped by date (${groups})`);
const work = await page.evaluate(() => { const li = [...document.querySelectorAll('.alt-thread')].find((x) => x.dataset.threadStatus === 'working'); return { lamp: !!li.querySelector('.alt-badge [class*="lamp"], .alt-badge[data-lamp]'), pending: li.getAttribute('data-status'), current: li.querySelector('a').getAttribute('aria-current') }; });
expect(work.pending !== 'pending' && work.current === 'page', `working isn't pending; the current row is aria-current (${JSON.stringify(work)})`);
// F2 renames in place.
await page.focus('.alt-thread-link >> nth=3');
await page.keyboard.press('F2'); await page.waitForTimeout(150);
expect(await page.evaluate(() => document.activeElement.getAttribute('aria-label')) === 'Conversation name', 'F2 opens a field labelled "Conversation name"');
await page.keyboard.press('Escape'); await page.waitForTimeout(150);
expect((await names())[3].startsWith('Draft the release note') && await page.evaluate(() => document.activeElement.classList.contains('alt-thread-link')), 'Escape cancels and focus returns to the row');
await page.keyboard.press('F2'); await page.waitForTimeout(100);
await page.keyboard.press('ControlOrMeta+a'); await page.keyboard.type('Release note for 0.3'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
expect((await names()).some((x) => x.startsWith('Release note for 0.3')), 'Enter saves the new name');
// The row menu.
const menuName = await page.evaluate(() => document.querySelector('.alt-thread-more').getAttribute('aria-label'));
expect(menuName === 'More actions for Q3 pricing comparison', `the row menu is named for its thread (${menuName})`);
// Delete leaves a receipt with Undo.
await page.focus('.alt-thread-link >> nth=5');
const target = (await names())[5].split(',')[0];
await page.keyboard.press('Delete'); await page.waitForTimeout(300);
const receipt = await page.evaluate(() => document.querySelector('.alt-thread[data-removed]')?.textContent ?? '');
expect(receipt.includes(`Deleted “${target}”.`) && receipt.includes('Undo'), `Delete leaves a receipt with Undo (${receipt})`);
await page.click('.alt-thread[data-removed] button:has-text("Undo")'); await page.waitForTimeout(300);
expect((await names()).some((x) => x.startsWith(target)), 'Undo brings it back');
// ⌘K focuses search, and search filters.
await page.keyboard.press('ControlOrMeta+k'); await page.waitForTimeout(100);
expect(await page.evaluate(() => document.activeElement.getAttribute('aria-label')) === 'Search conversations', '⌘K focuses search');
await page.keyboard.type('billing'); await page.waitForTimeout(200);
expect((await names()).length === 1, 'search filters the list');
// A thread that starts needing you is announced once.
await page.evaluate(() => new Promise((done) => {
  document.body.innerHTML = '<div id="r"></div>';
  const A = window.Altitude, h = React.createElement;
  function App() { const [s, setS] = React.useState('working'); window.__set = setS;
    return h(A.SidebarProvider, null, h(A.Sidebar, { 'aria-label': 'Conversations' }, h(A.SidebarContent, null, h(A.ThreadList, null, h(A.ThreadListGroup, { label: 'Today' },
      h(A.ThreadListItem, { href: '#a', title: 'Deploy the API', updatedAt: Date.now(), status: s }), h(A.ThreadListItem, { href: '#b', title: 'Other', updatedAt: Date.now(), current: true })))))); }
  ReactDOM.createRoot(document.getElementById('r')).render(h(A.AltitudeProvider, null, h(App)));
  setTimeout(done, 300);
}));
await page.evaluate(() => window.__set('needs-input')); await page.waitForTimeout(150);
const ann = await page.evaluate(() => [...document.querySelectorAll('.alt-threads-said')].map((s) => s.textContent).join('|'));
expect(ann === 'Deploy the API needs your approval', `needing you is announced (${ann})`);
await page.evaluate(() => window.__set('idle')); await page.waitForTimeout(150);
expect(await page.evaluate(() => document.querySelector('.alt-threads-said').textContent) === 'Deploy the API needs your approval', 'finishing isn\'t announced');
// groupByDate
const g = await page.evaluate(() => { const now = new Date(2026, 9, 30, 12).getTime(), d = 86400000; return window.Altitude.groupByDate([{ t: now - 3600000 }, { t: now - d }, { t: now - 3 * d }, { t: now - 20 * d }, { t: now - 90 * d }], (x) => x.t, now, 'en-US').map((x) => x.label); });
expect(g.join() === 'Today,Yesterday,Previous 7 days,Previous 30 days,August 2026', `groupByDate (${g})`);
console.log(`ThreadList: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
