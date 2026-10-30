// Nested and parallel Trace steps (#278): a Trace inside a TraceStep is a nested run behind a lid ("2 steps · 1
// running"), open when something in it is running, waiting or failed and closed when it's all done; TraceParallel is a
// labelled group ("Subagents: 3 in parallel · 1 of 3 done · 1 failed"); status="auto" is running while anything inside
// runs, failed once the rest stop, done only when everything is; nested steps announce through the outer Trace with
// their run's name, failures at once. Run after a render of every preview (it opens test/p-Trace-daylight.html);
// exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
await page.goto(`file://${T}p-Trace-daylight.html`); await page.waitForTimeout(400);
await page.evaluate(() => new Promise((done) => {
  document.body.innerHTML = '<div id="r"></div>';
  const A = window.Altitude, h = React.createElement;
  function App() {
    const [paddle, setPaddle] = React.useState('running');
    const [lemon, setLemon] = React.useState('running');
    const [summ, setSumm] = React.useState('planned');
    window.__set = { paddle: setPaddle, lemon: setLemon, summ: setSumm };
    const sub = (name, steps) => h(A.TraceStep, { title: name, status: 'auto' }, h(A.Trace, { 'aria-label': `${name} subagent` }, steps.map(([t, s], i) => h(A.TraceStep, { key: i, title: t, status: s }))));
    return h(A.Trace, { 'aria-label': 'Agent run' },
      h(A.TraceStep, { title: 'Research pricing pages', status: 'auto' },
        h(A.TraceParallel, { label: 'Subagents' },
          sub('Stripe', [['Open', 'done'], ['Extract', 'done']]),
          sub('Paddle', [['Open', 'done'], ['Extract', paddle], ['Summarise', summ]]),
          h(A.TraceStep, { title: 'Lemon Squeezy', status: lemon }))));
  }
  ReactDOM.createRoot(document.getElementById('r')).render(h(A.AltitudeProvider, null, h(App)));
  setTimeout(() => {
    // Every announcement, since the polite region is throttled to its latest text.
    window.__said = [];
    new MutationObserver(() => document.querySelectorAll('[aria-live]').forEach((l) => { if (l.textContent && window.__said[window.__said.length - 1] !== l.textContent) window.__said.push(l.textContent); }))
      .observe(document.body, { subtree: true, childList: true, characterData: true });
    done();
  }, 300);
}));
const read = () => page.evaluate(() => {
  const steps = Object.fromEntries([...document.querySelectorAll('.alt-trace-item')].map((li) => [li.querySelector('.alt-step-title').textContent, li.dataset.trace]));
  const lids = Object.fromEntries([...document.querySelectorAll('.alt-trace-nested .alt-acc-item')].map((it) => [it.querySelector('.alt-trace-nested-title span').textContent, { open: it.dataset.state === 'open', sum: it.querySelector('.alt-trace-nested-sum').textContent }]));
  const group = document.querySelector('.alt-trace-parallel');
  return { steps, lids, group: group.getAttribute('aria-label'), role: group.getAttribute('role'), live: window.__said.join(' | ') };
});
let r = await read();
expect(r.role === 'group' && r.group === 'Subagents: 3 in parallel · 1 of 3 done', `a labelled parallel group (${r.group})`);
expect(r.lids['Stripe subagent']?.sum === '2 steps · all done' && !r.lids['Stripe subagent'].open, `a finished nested run is closed, and says so (${JSON.stringify(r.lids['Stripe subagent'])})`);
expect(r.lids['Paddle subagent']?.sum === '3 steps · 1 running' && r.lids['Paddle subagent'].open, `a running nested run is open (${JSON.stringify(r.lids['Paddle subagent'])})`);
expect(r.steps.Stripe === 'done' && r.steps.Paddle === 'running' && r.steps['Research pricing pages'] === 'running', `status="auto" follows the steps inside (${JSON.stringify(r.steps)})`);
expect(await page.evaluate(() => document.querySelectorAll('.alt-trace-parallel > ol > .alt-trace-item[data-trace="running"]').length) === 2, 'several steps can be running at once in parallel');
await page.evaluate(() => window.__set.lemon('failed')); await page.waitForTimeout(150);
r = await read();
expect(r.steps['Research pricing pages'] === 'running' && r.group.endsWith('1 failed'), `a failure doesn't fail the parent while others still run (${r.steps['Research pricing pages']}, ${r.group})`);
expect(r.live.includes('Failed: Lemon Squeezy'), `a failure is announced at once (${r.live})`);
await page.evaluate(() => { window.__set.paddle('done'); window.__set.summ('running'); }); await page.waitForTimeout(1000);
r = await read();
expect(r.live.includes('Summarise (Paddle subagent)'), `a nested step announces with its run's name (${r.live})`);
await page.evaluate(() => window.__set.summ('done')); await page.waitForTimeout(1000);
r = await read();
expect(r.steps.Paddle === 'done' && r.steps['Research pricing pages'] === 'failed', `once the rest have stopped, the parent is failed (${JSON.stringify(r.steps)})`);
await page.evaluate(() => window.__set.lemon('done')); await page.waitForTimeout(150);
r = await read();
expect(r.steps['Research pricing pages'] === 'done' && r.group === 'Subagents: 3 in parallel · 3 of 3 done', 'done only when all are done');
expect(await page.evaluate(() => document.querySelectorAll('[aria-live]').length) === 2, 'nested runs share the outer live regions');
console.log(`Trace nested: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
