// Dictation in PromptInput (#284): a toggle with aria-pressed; listening is latched with "Listening" (announced) and no
// animation; interim words are a ghost, hidden from assistive tech and never in the value; final words go in at the
// caret with a space; Ctrl/⌘+D toggles from the text; Escape stops listening before it would stop generating; blocked
// stays focusable, isn't pressed, and says why. Run after a render of every preview (it opens
// test/p-PromptInput-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
await page.goto(`file://${T}p-PromptInput-daylight.html`); await page.waitForTimeout(400);
await page.evaluate(() => new Promise((done) => {
  document.body.innerHTML = '<div id="r"></div>'; window.__stops = 0;
  const A = window.Altitude, h = React.createElement;
  function App() {
    const [status, setStatus] = React.useState('idle');
    const [interim, setInterim] = React.useState('');
    const [final, setFinal] = React.useState();
    window.__hear = (t) => setInterim(t); window.__final = (t) => { setFinal({ id: Math.random(), text: t }); setInterim(''); };
    return h('div', null,
      h(A.PromptInput, { id: 'a', status: 'streaming', onStop: () => { window.__stops++; }, onSubmit: () => {} }, h(A.PromptInputTextarea, null),
        h(A.PromptInputToolbar, null, h(A.PromptInputDictate, { status, interim, final, onStart: () => setStatus('listening'), onStop: () => setStatus('idle') }), h(A.PromptInputSubmit))),
      h(A.PromptInput, { id: 'b', onSubmit: () => {} }, h(A.PromptInputTextarea, null), h(A.PromptInputToolbar, null, h(A.PromptInputDictate, { status: 'denied' }))));
  }
  ReactDOM.createRoot(document.getElementById('r')).render(h(A.AltitudeProvider, null, h(App)));
  setTimeout(done, 300);
}));
const st = () => page.evaluate(() => { const f = document.getElementById('a'), b = f.querySelector('.alt-prompt-dictate'); return { pressed: b.getAttribute('aria-pressed'), name: b.getAttribute('aria-label'), text: b.textContent, anim: getComputedStyle(b.querySelector('.alt-prompt-lamp') ?? b).animationName, ghost: f.querySelector('.alt-prompt-interim')?.textContent ?? null, ghostHidden: f.querySelector('.alt-prompt-interim')?.getAttribute('aria-hidden'), value: f.querySelector('textarea').value, said: f.querySelector(':scope > [role="status"]').textContent }; });
let s = await st();
expect(s.pressed === 'false' && s.name === 'Dictate', `a toggle named "Dictate" (${JSON.stringify(s)})`);
await page.click('#a .alt-prompt-dictate'); await page.waitForTimeout(150);
s = await st();
expect(s.pressed === 'true' && /Listening/.test(s.text) && s.anim === 'none' && s.said === 'Listening', `listening: latched, "Listening", announced, nothing animated (${JSON.stringify(s)})`);
await page.evaluate(() => window.__hear('Summarise the')); await page.waitForTimeout(100);
s = await st();
expect(s.ghost === 'Summarise the' && s.ghostHidden === 'true' && s.value === '', `interim words are a ghost, never the value (${JSON.stringify(s)})`);
await page.locator('#a textarea').fill('Please');
await page.evaluate(() => window.__final('summarise the risks')); await page.waitForTimeout(150);
s = await st();
expect(s.value === 'Please summarise the risks' && s.ghost === null, `final words go in at the caret with a space (${JSON.stringify(s.value)})`);
await page.focus('#a textarea'); await page.keyboard.press('Escape'); await page.waitForTimeout(100);
s = await st();
expect(s.pressed === 'false' && await page.evaluate(() => window.__stops) === 0 && s.said === 'Stopped listening', `Escape stops listening first, not generating (${s.said})`);
await page.keyboard.press('Escape'); await page.waitForTimeout(80);
expect(await page.evaluate(() => window.__stops) === 1, 'then Escape stops generating');
await page.keyboard.press('ControlOrMeta+d'); await page.waitForTimeout(100);
expect((await st()).pressed === 'true', 'Ctrl/⌘+D toggles dictation from the text');
const blocked = await page.evaluate(() => { const b = document.querySelector('#b .alt-prompt-dictate'); return { pressed: b.getAttribute('aria-pressed'), disabled: b.getAttribute('aria-disabled'), tab: b.tabIndex, title: b.title }; });
expect(blocked.pressed === null && blocked.disabled === 'true' && blocked.tab >= 0, `blocked stays focusable and isn't pressed (${JSON.stringify(blocked)})`);
await page.click('#b .alt-prompt-dictate', { force: true }); await page.waitForTimeout(100);
const why = await page.evaluate(() => document.querySelector('#b > [role="status"]').textContent);
expect(/Microphone blocked/.test(why), `pressing it says why (${why})`);
console.log(`Prompt dictate: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
