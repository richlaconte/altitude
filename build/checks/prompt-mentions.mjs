// @ mentions and / commands in PromptInput (#283): the textarea is a combobox; @ opens a list of matches ("Searching…"
// while a promise is out), grouped by kind; arrows and Enter choose, putting "@label" in the text and a plate in the
// context row; Backspace after it removes it whole; / at the start opens commands; onSubmit gets text, mentions and
// command separately; while streaming, the first Escape closes the list and only a second stops; without mentionable
// or commands, nothing changes. Run after a render of every preview (it opens test/p-PromptInput-daylight.html);
// exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 900, height: 800 } });
await page.goto(`file://${T}p-PromptInput-daylight.html`); await page.waitForTimeout(400);
await page.evaluate(() => new Promise((done) => {
  document.body.innerHTML = '<div id="r" style="padding-top:320px"></div>'; window.__sent = []; window.__stops = 0;
  const A = window.Altitude, h = React.createElement;
  const ctx = [{ id: 'f1', label: 'pricing.ts', kind: 'file' }, { id: 'f2', label: 'plans.ts', kind: 'file' }, { id: 'p1', label: 'Maya', kind: 'person' }];
  function App() {
    const [status, setStatus] = React.useState('ready'); window.__status = setStatus;
    return h('div', null,
      h(A.PromptInput, { id: 'a', status, onStop: () => { window.__stops++; }, onSubmit: (m) => window.__sent.push(m),
        mentionable: (q) => new Promise((r) => setTimeout(() => r(ctx.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()))), 150)),
        commands: [{ name: 'review', description: 'Review changes' }, { name: 'compact' }] }, h(A.PromptInputTextarea, null), h(A.PromptInputToolbar, null, h(A.PromptInputSubmit))),
      h(A.PromptInput, { id: 'b', onSubmit: () => {} }, h(A.PromptInputTextarea, { placeholder: 'plain' })));
  }
  ReactDOM.createRoot(document.getElementById('r')).render(h(A.AltitudeProvider, null, h(App)));
  setTimeout(done, 300);
}));
const box = page.locator('#a textarea');
const st = () => page.evaluate(() => { const t = document.querySelector('#a textarea'), l = document.getElementById(t.getAttribute('aria-controls') ?? '_'); return { role: t.getAttribute('role'), expanded: t.getAttribute('aria-expanded'), list: l ? { busy: l.getAttribute('aria-busy'), text: l.textContent, groups: [...l.querySelectorAll('[role="group"]')].map((g) => g.getAttribute('aria-label')), opts: [...l.querySelectorAll('[role="option"]')].map((o) => o.textContent) } : null, active: t.getAttribute('aria-activedescendant'), value: t.value, plates: [...document.querySelectorAll('#a .alt-prompt-context .alt-tag-face')].map((p) => p.textContent) }; });
let s = await st();
expect(s.role === 'combobox' && s.expanded === 'false', 'with mentionable or commands, the text is a combobox');
await box.click(); await box.type('Check @'); await page.waitForTimeout(40);
s = await st();
expect(s.list?.busy === 'true' && /Searching/.test(s.list.text), `a promise shows "Searching…" (${JSON.stringify(s.list)})`);
await page.waitForTimeout(300);
s = await st();
expect(s.expanded === 'true' && s.list.groups.join() === 'Files,People' && s.list.opts.length === 3, `@ opens matches grouped by kind (${JSON.stringify(s.list)})`);
await box.type('pr'); await page.waitForTimeout(300);
s = await st();
expect(s.list.opts.join() === 'pricing.ts' && !!s.active, `typing filters, with an active option (${s.list.opts})`);
await page.keyboard.press('Enter'); await page.waitForTimeout(150);
s = await st();
expect(s.value === 'Check @pricing.ts ' && s.plates.join() === 'pricing.ts' && s.expanded === 'false', `Enter puts "@label" in the text and a plate above it (${JSON.stringify(s)})`);
await page.keyboard.press('Backspace'); await page.waitForTimeout(100);
s = await st();
expect(s.value === 'Check ' && s.plates.length === 0, `Backspace after a mention removes it whole (${JSON.stringify(s.value)})`);
// Commands.
await box.fill(''); await box.type('/re'); await page.waitForTimeout(150);
s = await st();
expect(s.list?.groups.join() === 'Commands' && s.list.opts[0].startsWith('/review'), `/ at the start opens commands (${JSON.stringify(s.list)})`);
await page.keyboard.press('Tab'); await page.waitForTimeout(100);
await box.type('the @plans'); await page.waitForTimeout(300); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
s = await st();
expect(s.value === '/review the @plans.ts ' && s.plates.join() === '/review,plans.ts', `a command and a mention both show as plates (${JSON.stringify(s)})`);
await page.keyboard.press('Enter'); await page.waitForTimeout(150);
const sent = await page.evaluate(() => window.__sent[0]);
expect(sent && sent.command === 'review' && sent.text === 'the @plans.ts' && sent.mentions?.map((m) => m.label).join() === 'plans.ts', `onSubmit gets text, mentions and command separately (${JSON.stringify(sent)})`);
// While streaming: the first Escape closes the list, the second stops.
await page.evaluate(() => window.__status('streaming')); await page.waitForTimeout(100);
await box.type('also @Ma'); await page.waitForTimeout(300);
await page.keyboard.press('Escape'); await page.waitForTimeout(80);
expect((await st()).expanded === 'false' && await page.evaluate(() => window.__stops) === 0, 'the first Escape closes the list and doesn\'t stop');
await page.keyboard.press('Escape'); await page.waitForTimeout(80);
expect(await page.evaluate(() => window.__stops) === 1, 'a second Escape stops');
expect(await page.evaluate(() => document.querySelector('#b textarea').getAttribute('role')) === null, 'without mentionable or commands, the text is a plain textarea');
console.log(`Prompt mentions: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
