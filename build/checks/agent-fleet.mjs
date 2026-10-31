// AgentFleet, AgentRequests and AgentLanes (docs/research/agent-orchestration): the roster groups agents by need, each
// row's name says its state in order ("Billing API, waiting 6 min, …, Needs approval, Step 3 of 4, spent $0.38"),
// working never hovers, the open agent is aria-current and raised, the done group folds, Up/Down/Home/End move between
// rows, and an agent that starts needing you is announced once; requests sort oldest first, are raised cards, answer in
// place and announce arrivals; the lanes lead with the time agents waited on you, draw flat bars and give a table. Run
// after a render of every preview (it opens test/p-Agent{Fleet,Requests,Lanes}-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (name) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 800 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`file://${T}p-${name}-daylight.html`); await page.waitForTimeout(400);
  return { page, errors };
};
const text = (s) => s.replace(/\s+/g, ' ').trim();

// ── AgentFleet ──
{
  const { page, errors } = await open('AgentFleet');
  expect(await page.evaluate(() => document.querySelector('[role="region"][aria-label="Agents"]') !== null), 'a region named "Agents"');
  const summary = await page.evaluate(() => document.querySelector('.alt-fleet-summary')?.textContent);
  expect(summary === '2 need you · 1 working · 1 stalled · 1 waiting to start · 1 done', `the summary says the fleet in words (${summary})`);
  const groups = await page.evaluate(() => [...document.querySelectorAll('.alt-fleet-list')].map((l) => l.getAttribute('aria-label')));
  expect(groups.join('|') === 'Needs you, 2|Working, 3|Done, 1', `groups are lists named with their counts (${groups})`);
  const rows = await page.evaluate(() => [...document.querySelectorAll('.alt-agent-row')].map((r) => r.textContent));
  expect(text(rows[0]) === 'Billing API, waiting 6 min, Wants to run the migration on staging, Needs approval, Step 3 of 4, spent $0.38', `a row's name says its state in order (${text(rows[0])})`);
  expect(text(rows[1]).startsWith('QA, waiting 2 min') && text(rows[1]).includes("Couldn't finish"), `the longest wait leads, and failed waits on you (${text(rows[1])})`);
  expect(text(rows[2]).startsWith('Docs') && text(rows[2]).includes('Retried the same step 3 times'), `stalled leads the working group and says why (${text(rows[2])})`);
  expect(text(rows[4]).includes('Waiting on Pricing page'), `blocked says on what (${text(rows[4])})`);
  expect(text(rows[5]).startsWith('Renewal emails, took 14 min') && text(rows[5]).includes('Done'), `done says how long it took (${text(rows[5])})`);
  const conflict = await page.evaluate(() => document.querySelector('.alt-agent-conflict')?.textContent);
  expect(text(conflict ?? '') === ', Also changing src/content/pricing.ts: Docs', `a conflict names the file and the other agent (${conflict})`);
  const sel = await page.evaluate(() => { const r = document.querySelector('.alt-agent-row[aria-current="true"]'); return r && { name: r.querySelector('.alt-agent-name').textContent, sh: getComputedStyle(r).boxShadow, bg: getComputedStyle(r).backgroundColor }; });
  expect(sel?.name === 'Pricing page' && sel.sh !== 'none' && sel.bg !== 'rgba(0, 0, 0, 0)', `the open agent is aria-current, tinted and raised (${JSON.stringify(sel)})`);
  const working = await page.evaluate(() => { const li = document.querySelector('.alt-agent[data-agent-state="working"]'); return { pending: li.querySelector('[data-status="pending"]') !== null, lamp: !!li.querySelector('.alt-badge [class*="lamp"], .alt-badge[data-lamp]') }; });
  expect(!working.pending && working.lamp, `working isn't pending and has a lamp (${JSON.stringify(working)})`);
  // Selecting moves aria-current.
  await page.click('.alt-agent-row:has-text("Docs")'); await page.waitForTimeout(100);
  expect(await page.evaluate(() => document.querySelector('.alt-agent-row[aria-current="true"] .alt-agent-name')?.textContent) === 'Docs', 'clicking a row opens it');
  // Keyboard.
  await page.focus('.alt-agent-row >> nth=0'); await page.keyboard.press('ArrowDown');
  expect(await page.evaluate(() => document.activeElement.querySelector('.alt-agent-name')?.textContent) === 'QA', 'Down moves to the next row');
  await page.keyboard.press('ArrowDown');
  expect(await page.evaluate(() => document.activeElement.querySelector('.alt-agent-name')?.textContent) === 'Docs', 'Down crosses into the next group');
  await page.keyboard.press('End');
  expect(await page.evaluate(() => document.activeElement.querySelector('.alt-agent-name')?.textContent) === 'Renewal emails', 'End goes to the last row');
  await page.keyboard.press('Home');
  expect(await page.evaluate(() => document.activeElement.querySelector('.alt-agent-name')?.textContent) === 'Billing API', 'Home goes to the first row');
  // The done group folds.
  await page.click('button.alt-fleet-group-head'); await page.waitForTimeout(100);
  const folded = await page.evaluate(() => ({ exp: document.querySelector('button.alt-fleet-group-head').getAttribute('aria-expanded'), hidden: document.querySelector('.alt-fleet-group:last-of-type .alt-fleet-list')?.offsetParent === null }));
  expect(folded.exp === 'false' && folded.hidden === true, `the done group folds (${JSON.stringify(folded)})`);
  await page.focus('.alt-agent-row >> nth=0'); await page.keyboard.press('End');
  expect(await page.evaluate(() => document.activeElement.querySelector('.alt-agent-name')?.textContent) === 'Changelog', 'End skips folded rows');
  expect(!errors.length, `AgentFleet: no page or console errors (${errors.slice(0, 2).join('; ')})`);
  // Announcing: an agent that starts needing you is said once; finishing isn't.
  await page.evaluate(() => new Promise((done) => {
    document.body.innerHTML = '<div id="r"></div>';
    const A = window.Altitude, h = React.createElement;
    function App() { const [s, setS] = React.useState('working'); window.__set = setS;
      return h(A.AgentFleet, null, h(A.AgentFleetGroup, { label: 'All' }, h(A.AgentFleetItem, { name: 'Billing API', state: s, needs: 'question' }), h(A.AgentFleetItem, { name: 'Docs', state: 'working' }))); }
    ReactDOM.createRoot(document.getElementById('r')).render(h(A.AltitudeProvider, null, h(App)));
    setTimeout(done, 300);
  }));
  const said = () => page.evaluate(() => document.querySelector('.alt-fleet-said').textContent);
  expect(await said() === '', 'nothing is announced on mount');
  await page.evaluate(() => window.__set('needs-input')); await page.waitForTimeout(150);
  expect(await said() === 'Billing API has a question for you', `needing you is announced (${await said()})`);
  await page.evaluate(() => window.__set('done')); await page.waitForTimeout(150);
  expect(await said() === 'Billing API has a question for you', 'finishing isn\'t announced');
  await page.evaluate(() => window.__set('failed')); await page.waitForTimeout(150);
  expect(await said() === "Billing API couldn't finish", `failing is announced (${await said()})`);
  // Helpers.
  const h = await page.evaluate(() => { const A = window.Altitude;
    return { spans: [A.formatSpan(20000), A.formatSpan(4 * 60000), A.formatSpan(65 * 60000), A.formatSpan(120 * 60000)].join('|'), none: A.summarizeFleet([]), one: A.summarizeFleet(['failed', 'working']),
      g: Object.values(A.groupAgents([{ n: 'a', state: 'done', endedAt: 1 }, { n: 'b', state: 'needs-input', since: 5 }, { n: 'c', state: 'queued' }, { n: 'd', state: 'needs-input', since: 2 }, { n: 'e', state: 'stalled' }, { n: 'f', state: 'done', endedAt: 9 }], (x) => x)).map((l) => l.map((x) => x.n).join('')).join('|') }; });
  expect(h.spans === 'under a minute|4 min|1 h 5 min|2 h', `formatSpan (${h.spans})`);
  expect(h.none === 'No agents' && h.one === '1 needs you · 1 working', `summarizeFleet (${h.none}; ${h.one})`);
  expect(h.g === 'db|ec|fa', `groupAgents sorts by need (${h.g})`);
  await page.close();
}

// ── AgentRequests ──
{
  const { page, errors } = await open('AgentRequests');
  const order = await page.evaluate(() => [...document.querySelectorAll('.alt-request .alt-request-agent')].map((a) => a.textContent));
  expect(order.join() === 'Billing API,Renewal emails,QA', `oldest first (${order})`);
  const head = text(await page.evaluate(() => document.querySelector('.alt-requests-head').textContent));
  expect(head === 'Needs you3oldest waiting 9 min', `the heading counts and says the oldest wait (${head})`);
  const card = await page.evaluate(() => { const c = document.querySelector('.alt-request'); return { tag: c.tagName, level: c.getAttribute('data-level'), name: document.getElementById(c.getAttribute('aria-labelledby'))?.textContent, pending: c.getAttribute('data-status'), primary: !!c.querySelector('[data-variant="primary"]') }; });
  expect(card.tag === 'ARTICLE' && card.level === '1' && card.name === 'Run the plans-table migration on staging?' && !card.pending && !card.primary,
    `a request is a raised article named by its ask, not pending, with no primary (${JSON.stringify(card)})`);
  expect(await page.evaluate(() => document.querySelector('.alt-request button[aria-label="Open Billing API"]') !== null), 'Open is named for the agent');
  await page.click('.alt-request button:has-text("Run migration")'); await page.waitForTimeout(150);
  expect((await page.evaluate(() => document.querySelectorAll('.alt-request').length)) === 2, 'answering in place removes the request');
  await page.click('.alt-request button:has-text("Active only")'); await page.click('.alt-request button:has-text("Retry")'); await page.waitForTimeout(150);
  const empty = await page.evaluate(() => document.querySelector('.alt-requests-empty')?.textContent);
  expect(empty === 'Nothing needs you. Agents ask here when they need a decision.', `nothing waiting is said (${empty})`);
  expect(!errors.length, `AgentRequests: no page or console errors (${errors.slice(0, 2).join('; ')})`);
  // A new request is announced once.
  await page.evaluate(() => new Promise((done) => {
    document.body.innerHTML = '<div id="r"></div>';
    const A = window.Altitude, h = React.createElement;
    function App() { const [n, setN] = React.useState(1); window.__add = () => setN(2);
      const reqs = [h(A.AgentRequest, { key: 'a', agent: 'Docs', kind: 'question', title: 'Skip /enterprise?', since: Date.now() })];
      if (n > 1) reqs.push(h(A.AgentRequest, { key: 'b', agent: 'QA', kind: 'failed', title: 'Tests failed', since: Date.now() }));
      return h(A.AgentRequests, null, reqs); }
    ReactDOM.createRoot(document.getElementById('r')).render(h(A.AltitudeProvider, null, h(App)));
    setTimeout(done, 300);
  }));
  const said = () => page.evaluate(() => document.querySelector('.alt-requests [role="status"]').textContent);
  expect(await said() === '', 'requests already there aren\'t announced');
  await page.evaluate(() => window.__add()); await page.waitForTimeout(150);
  expect(await said() === 'QA: Tests failed', `a new request is announced (${await said()})`);
  await page.close();
}

// ── AgentLanes ──
{
  const { page, errors } = await open('AgentLanes');
  const take = await page.evaluate(() => document.querySelector('.alt-lanes-takeaway').textContent);
  expect(take.endsWith('Agents have waited on you for 15 min in all; the longest wait was Pricing page, 5 min.'), `the takeaway leads with the wait (${take})`);
  const bars = await page.evaluate(() => [...document.querySelectorAll('.alt-lane-bar')].map((b) => { const cs = getComputedStyle(b); return { h: b.getBoundingClientRect().height, sh: cs.boxShadow, lane: b.dataset.lane }; }));
  expect(new Set(bars.map((b) => Math.round(b.h))).size === 1, `every bar is the same height (${[...new Set(bars.map((b) => b.h))]})`);
  expect(bars.every((b) => b.sh === 'none' || /inset/.test(b.sh)), 'bars cast no shadow');
  const waiting = await page.evaluate(() => getComputedStyle(document.querySelector('.alt-lane-bar[data-lane="waiting"]')).backgroundImage);
  expect(/repeating-linear-gradient/.test(waiting), 'waiting on you is hatched, not colour alone');
  const legend = await page.evaluate(() => [...document.querySelectorAll('.alt-lanes-legend li')].map((l) => l.textContent));
  expect(legend.join() === 'Working,Waiting on you,Waiting on another agent,Failed', `a key in words (${legend})`);
  const table = (await page.evaluate(() => [...document.querySelectorAll('.alt-lanes table tbody tr')].map((r) => r.textContent))).map(text);
  expect(table[3] === 'QA8 min—16 min2 min', `a table says the same (${table[3]})`);
  expect(await page.evaluate(() => document.querySelector('.alt-lanes-plot .alt-lane-track').getAttribute('aria-hidden')) === 'true', 'the bars are hidden from assistive technology');
  await page.click('button.alt-lane-name:has-text("Billing API")'); await page.waitForTimeout(100);
  expect(await page.evaluate(() => document.querySelector('button.alt-lane-name[aria-pressed="true"]')?.textContent) === 'Billing API', 'a lane name selects its agent (aria-pressed)');
  const ticks = await page.evaluate(() => [...document.querySelectorAll('.alt-lanes-ticks span')].map((s) => s.textContent));
  expect(ticks.join() === '31 min ago,15 min ago,Now', `the axis is relative, so it doesn't depend on a timezone (${ticks})`);
  expect(!errors.length, `AgentLanes: no page or console errors (${errors.slice(0, 2).join('; ')})`);
  await page.close();
}
console.log(`AgentFleet: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
