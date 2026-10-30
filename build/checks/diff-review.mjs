// DiffView review (#282): each change is a labelled group ("Change 1 of 2, lines 3 to 4"), raised while it waits,
// with "Accept change 1" and "Reject change 1"; the header counts "1 of 2 changes reviewed" and offers Accept all and
// Reject all; deciding is announced ("Change 1 accepted. 1 left."); accepted lands flush with "Accepted"; rejected
// collapses to "Rejected · show" after dur-linger (at once under reduced motion); n and p move between undecided
// changes; without review nothing changes. Run after a render of every preview (it opens test/p-DiffView-daylight.html);
// exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.goto(`file://${T}p-DiffView-daylight.html`); await page.waitForTimeout(400);
await page.evaluate(() => new Promise((done) => {
  document.body.innerHTML = '<div id="r"></div>';
  const A = window.Altitude, h = React.createElement;
  const before = 'a\nb\nc\nd\ne\nf\ng\nh\ni', after = 'a\nb\nC\nD\ne\nf\ng\nh\nI';
  function App() {
    const [decisions, setDecisions] = React.useState({});
    return h('div', null,
      h(A.DiffView, { caption: 'file.txt', before, after, review: true, decisions, onDecide: (id, d) => setDecisions((x) => ({ ...x, [id]: d })), onDecideAll: (d) => setDecisions((x) => ({ 'change-1': x['change-1'] ?? d, 'change-2': x['change-2'] ?? d })) }),
      h(A.DiffView, { caption: 'plain', before, after, className: 'plain' }));
  }
  ReactDOM.createRoot(document.getElementById('r')).render(h(A.AltitudeProvider, null, h(App)));
  setTimeout(done, 300);
}));
const read = () => page.evaluate(() => { const f = document.querySelector('.alt-diff'); return { summary: f.querySelector('.alt-diff-summary').textContent, hunks: [...f.querySelectorAll('.alt-diff-hunk')].map((h) => ({ name: h.getAttribute('aria-label'), decision: h.dataset.decision ?? null, raised: getComputedStyle(h).boxShadow !== 'none', text: h.textContent })), said: f.querySelector('[role="status"]')?.textContent, tools: [...f.querySelectorAll('.alt-diff-nav button')].map((b) => b.textContent) }; });
let r = await read();
expect(r.hunks.map((x) => x.name).join(' | ') === 'Change 1 of 2, lines 3 to 4 | Change 2 of 2, line 9', `each change is a labelled group (${r.hunks.map((x) => x.name)})`);
expect(r.hunks.every((x) => x.raised && x.text.includes('Proposed change')), 'a change awaiting a decision is raised and says "Proposed change"');
expect(r.summary === '0 of 2 changes reviewed' && r.tools.includes('Accept all') && r.tools.includes('Reject all'), `the header counts and offers all-actions (${r.summary})`);
expect(await page.locator('button[aria-label="Accept change 1"]').count() === 1 && await page.locator('button[aria-label="Reject change 2"]').count() === 1, 'Accept and Reject are named by the change');
await page.click('button[aria-label="Accept change 1"]'); await page.waitForTimeout(200);
r = await read();
expect(r.hunks[0].decision === 'accept' && !r.hunks[0].raised && r.hunks[0].text.includes('Accepted') && r.summary === '1 of 2 changes reviewed', `accepted lands flush (${JSON.stringify(r.hunks[0])})`);
expect(r.said === 'Change 1 accepted. 1 left.', `deciding is announced (${r.said})`);
// n moves to the next undecided change: change 2.
await page.mouse.click(5, 880); await page.locator('.alt-diff').first().focus().catch(() => {});
await page.evaluate(() => document.querySelector('.alt-diff [data-change-start]').focus());
await page.keyboard.press('n'); await page.waitForTimeout(100);
expect(await page.evaluate(() => document.activeElement.closest('.alt-diff-hunk')?.getAttribute('aria-label')) === 'Change 2 of 2, line 9', 'n moves between undecided changes');
await page.click('button[aria-label="Reject change 2"]'); await page.waitForTimeout(300);
r = await read();
expect(r.hunks[1].decision === 'reject' && /Rejected · show/.test(r.hunks[1].text) && r.summary === '2 of 2 changes reviewed', `rejected collapses to one line (${r.hunks[1].text})`);
expect(!r.tools.includes('Accept all'), 'with everything reviewed, the all-actions go');
await page.click('.alt-diff-hunk-folded'); await page.waitForTimeout(100);
expect(await page.evaluate(() => { const h = document.querySelectorAll('.alt-diff-hunk')[1]; return !h.hasAttribute('data-folded') && h.querySelectorAll('.alt-diff-line').length === 2; }), 'show opens a rejected change again');
expect(await page.evaluate(() => !document.querySelector('.plain .alt-diff-hunk') && !document.querySelector('.plain [role="status"]')), 'without review, nothing changes');
console.log(`Diff review: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
