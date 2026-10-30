// Terminal (#273): a figure named "$ command" with a focusable log region (aria-live off) that follows its end while
// running, until you scroll up (then "Jump to latest output"); stderr lines say "stderr" and carry a mark; ANSI colours
// map to Altitude's inks (or are stripped); a carriage return overwrites its line; maxLines hides earlier lines behind
// "Show N earlier lines"; Stop and Escape (with stopOnEscape) stop it; the exit is said in words and announced once.
// Run after a render of every preview (it opens test/p-Terminal-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
await page.goto(`file://${T}p-Terminal-daylight.html`); await page.waitForTimeout(400);
await page.evaluate(() => new Promise((done) => {
  document.body.innerHTML = '<div id="r"></div>'; window.__stops = 0;
  const A = window.Altitude, h = React.createElement, E = String.fromCharCode(27);
  function App() {
    const [chunks, setChunks] = React.useState([{ text: 'start\n' }, { text: 'warn: deprecated\n', stream: 'stderr' }, { text: E + '[31mred' + E + '[0m plain' + E + '[2K\n' }, { text: 'progress 10%\rprogress 100%\n' }]);
    const [status, setStatus] = React.useState('running');
    window.__add = (n) => setChunks((c) => [...c, ...Array.from({ length: n }, (_, i) => ({ text: `line ${c.length + i}\n` }))]);
    window.__end = (s) => setStatus(s);
    return h('div', null,
      h(A.Terminal, { command: 'npm test', output: chunks, status, exitCode: 1, duration: 4200, onStop: () => { window.__stops++; }, stopOnEscape: true, id: 't1' }),
      h(A.Terminal, { command: 'cat log', output: E + '[32mgreen' + E + '[0m\n', status: 'exited', exitCode: 0, ansi: false, id: 't2' }),
      h(A.Terminal, { command: 'seq', output: Array.from({ length: 30 }, (_, i) => `n${i}`).join('\n'), status: 'exited', exitCode: 0, maxLines: 10, id: 't3' }));
  }
  ReactDOM.createRoot(document.getElementById('r')).render(h(A.AltitudeProvider, null, h(App)));
  setTimeout(done, 300);
}));
const t1 = () => page.evaluate(() => { const f = document.getElementById('t1'), b = f.querySelector('.alt-term-body'); return { name: f.getAttribute('aria-label'), busy: f.getAttribute('aria-busy'), role: b.getAttribute('role'), live: b.getAttribute('aria-live'), tab: b.tabIndex, gap: b.scrollHeight - b.scrollTop - b.clientHeight, jump: !!f.querySelector('.alt-term-jump'), exit: f.querySelector('.alt-term-exit')?.textContent ?? null, failed: f.hasAttribute('data-failed'), text: b.textContent }; });
let s = await t1();
expect(s.name === '$ npm test' && s.busy === 'true' && s.role === 'log' && s.live === 'off' && s.tab === 0, `a figure named by the command, with a focusable log that isn't live (${JSON.stringify(s)})`);
const lines = await page.evaluate(() => [...document.querySelectorAll('#t1 .alt-term-line')].map((l) => ({ t: l.textContent, stderr: l.dataset.stream === 'stderr', red: !!l.querySelector('[data-tone="critical"]') })));
expect(lines[1].stderr && lines[1].t.startsWith('stderr: warn'), `stderr lines say so (${JSON.stringify(lines[1])})`);
expect(lines[2].red && lines[2].t === 'red plain\n' && !s.text.includes('\u001b'), `ANSI red maps to an ink and escapes are stripped (${JSON.stringify(lines[2])})`);
expect(lines[3].t === 'progress 100%\n', `a carriage return overwrites its line (${JSON.stringify(lines[3].t)})`);
expect(await page.evaluate(() => { const l = document.querySelector('#t2 .alt-term-line'); return l.textContent === 'green\n' && !l.querySelector('[data-tone]'); }), 'ansi={false} strips escapes without colour');
await page.evaluate(() => window.__add(60)); await page.waitForTimeout(150);
s = await t1();
expect(s.gap < 4 && !s.jump, `while running it follows its end (${s.gap}px from the bottom)`);
await page.evaluate(() => { const b = document.querySelector('#t1 .alt-term-body'); b.scrollTop = 0; b.dispatchEvent(new Event('scroll')); });
await page.evaluate(() => window.__add(5)); await page.waitForTimeout(150);
s = await t1();
expect(s.gap > 100 && s.jump, `scrolled up, it stays put and offers "Jump to latest output" (${s.gap})`);
await page.click('#t1 .alt-term-jump'); await page.waitForTimeout(700);
s = await t1();
expect(s.gap < 4 && !s.jump, `Jump goes to the end (${s.gap})`);
expect(await page.evaluate(() => document.querySelector('#t1 .alt-code-tools button').textContent) === 'Stop command', 'Stop is named "Stop command"');
await page.focus('#t1 .alt-term-body'); await page.keyboard.press('Escape');
expect(await page.evaluate(() => window.__stops) === 1, 'Escape in the output stops it (stopOnEscape)');
await page.evaluate(() => window.__end('exited')); await page.waitForTimeout(200);
s = await t1();
expect(s.exit === 'Exited with 1 · 4.2s' && s.failed && s.busy === null, `the exit in words, critical when non-zero (${s.exit})`);
const said = await page.evaluate(() => document.querySelector('#t1 .alt-term-said').textContent);
expect(said === 'npm test exited with 1 after 4.2 seconds.', `completion is announced once (${said})`);
expect(await page.evaluate(() => document.querySelector('#t2 .alt-term-exit').textContent) === 'Exited with 0' && !(await page.evaluate(() => document.getElementById('t2').hasAttribute('data-failed'))), 'exit 0 is not a failure');
const more = await page.evaluate(() => ({ btn: document.querySelector('#t3 .alt-term-more')?.textContent, n: document.querySelectorAll('#t3 .alt-term-line').length }));
expect(more.btn === 'Show 20 earlier lines' && more.n === 10, `maxLines keeps the last lines (${JSON.stringify(more)})`);
await page.click('#t3 .alt-term-more'); await page.waitForTimeout(100);
expect(await page.evaluate(() => document.querySelectorAll('#t3 .alt-term-line').length) === 30, 'and the earlier ones come back');
await page.evaluate(() => window.__end('stopped')); await page.waitForTimeout(100);
expect((await t1()).exit === 'Stopped by you', 'stopped says so');
console.log(`Terminal: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
