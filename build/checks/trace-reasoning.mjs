// TraceReasoning while it streams (#279): "Thinking…" on a closed lid with aria-busy; opened, a dashed rule and the
// text follows its end as it arrives, until the person scrolls up; complete, "Thought for 12s"; redacted, "Reasoning
// hidden by the provider" with nothing to open; no ticking counter. Run after a render of every preview (it opens
// test/p-Trace-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
await page.goto(`file://${T}p-Trace-daylight.html`); await page.waitForTimeout(400);
await page.evaluate(() => new Promise((done) => {
  document.body.innerHTML = '<div id="r"></div>';
  const A = window.Altitude, h = React.createElement;
  function App() {
    const [text, setText] = React.useState('First thought.');
    const [status, setStatus] = React.useState('streaming');
    window.__more = () => setText((t) => t + '\nAnother line of reasoning that keeps the box growing.');
    window.__done = () => setStatus('complete');
    return h(A.Trace, { 'aria-label': 'Run' },
      h(A.TraceStep, { title: 'Think', status: 'running' }, h(A.TraceReasoning, { status, duration: 12000 }, text)),
      h(A.TraceStep, { title: 'Hidden', status: 'done' }, h(A.TraceReasoning, { status: 'redacted' })));
  }
  ReactDOM.createRoot(document.getElementById('r')).render(h(A.AltitudeProvider, null, h(App)));
  setTimeout(done, 300);
}));
const thought = () => page.evaluate(() => { const t = document.querySelector('.alt-trace-thought'); const r = t.querySelector('.alt-trace-reasoning'); return { lid: t.querySelector('.alt-trace-thought-title').textContent, busy: t.getAttribute('aria-busy'), open: t.querySelector('.alt-acc-item').dataset.state === 'open', rule: r ? getComputedStyle(r).borderLeftStyle : null, bottom: r ? r.scrollHeight - r.scrollTop - r.clientHeight : null }; });
let t = await thought();
expect(t.lid === 'Thinking…' && t.busy === 'true' && !t.open, `streaming: "Thinking…", busy, closed (${JSON.stringify(t)})`);
await page.click('.alt-trace-thought .alt-acc-trigger'); await page.waitForTimeout(300);
for (let i = 0; i < 20; i++) await page.evaluate(() => window.__more());
await page.waitForTimeout(200);
t = await thought();
expect(t.open && t.rule === 'dashed', `open while streaming: a dashed rule (${t.rule})`);
expect(t.bottom !== null && t.bottom < 4, `the text follows its end (${t.bottom}px from the bottom)`);
await page.evaluate(() => { const r = document.querySelector('.alt-trace-reasoning'); r.scrollTop = 0; r.dispatchEvent(new Event('scroll')); });
await page.evaluate(() => { window.__more(); window.__more(); }); await page.waitForTimeout(150);
t = await thought();
expect(t.bottom > 40, `after scrolling up, it stops following (${t.bottom}px from the bottom)`);
const before = (await thought()).lid;
await page.waitForTimeout(1200);
expect((await thought()).lid === before, 'no ticking counter while it thinks');
await page.evaluate(() => window.__done()); await page.waitForTimeout(200);
t = await thought();
expect(t.lid === 'Thought for 12s' && t.busy === null && t.rule !== 'dashed', `complete: "Thought for 12s", not busy, no dashed rule (${JSON.stringify(t)})`);
const hidden = await page.evaluate(() => { const li = [...document.querySelectorAll('.alt-trace-item')][1]; return { text: li.querySelector('.alt-trace-reasoning-hidden')?.textContent, buttons: li.querySelectorAll('.alt-trace-detail button').length }; });
expect(hidden.text === 'Reasoning hidden by the provider' && hidden.buttons === 0, `redacted: said, with nothing to open (${JSON.stringify(hidden)})`);
console.log(`Trace reasoning: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
