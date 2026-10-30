// Suggestions (#272): a labelled group of small secondary buttons; mode="fill" puts the value in the composer and
// focuses it with the caret at the end; mode="send" sends it and says "sends now"; `value` fills or sends more than
// the label; follow-ups inside a Message cross-fade in (starters don't); more than four become a toolbar with one tab
// stop and arrow keys. Run after a render of every preview (it opens test/p-Suggestions-daylight.html); exits
// non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
await page.goto(`file://${T}p-Suggestions-daylight.html`); await page.waitForTimeout(500);
const groups = await page.evaluate(() => [...document.querySelectorAll('.alt-suggestions')].map((g) => ({ role: g.getAttribute('role'), name: g.getAttribute('aria-label'), arrive: g.hasAttribute('data-arrive'), variants: [...g.querySelectorAll('button')].map((b) => b.dataset.variant), names: [...g.querySelectorAll('button')].map((b) => b.textContent) })));
expect(groups[0].role === 'group' && groups[0].name === 'Start with' && !groups[0].arrive, `starters: a labelled group that's simply there (${JSON.stringify(groups[0])})`);
expect(groups[1].name === 'Suggested follow-ups' && groups[1].arrive, 'follow-ups inside a Message cross-fade in');
expect(groups.every((g) => g.variants.every((v) => v === 'secondary')), `every suggestion is a secondary button, never the primary (${groups.map((g) => g.variants)})`);
expect(groups[1].names.every((n) => n.endsWith(', sends now')) && !groups[0].names.some((n) => n.includes('sends now')), 'send-mode suggestions say "sends now"');
await page.click('button:has-text("What\'s blocked?")'); await page.waitForTimeout(200);
const filled = await page.evaluate(() => { const t = document.querySelector('.alt-prompt textarea'); return { value: t.value, focus: document.activeElement === t, caret: t.selectionStart === t.value.length }; });
expect(filled.value === 'Which of my open pull requests are blocked, and by whom?' && filled.focus && filled.caret, `fill puts the value in the composer, focused, caret at the end (${JSON.stringify(filled)})`);
await page.click('button:has-text("Biggest risks")'); await page.waitForTimeout(200);
expect(await page.evaluate(() => document.body.textContent.includes('Sent: List the three biggest risks, with owners')), 'send hands over the value at once');
// Keyboard: Enter chooses; with more than four, one tab stop and arrows.
await page.evaluate(() => new Promise((done) => {
  document.body.innerHTML = '<div id="r"></div>'; window.__chosen = [];
  const A = window.Altitude, h = React.createElement;
  ReactDOM.createRoot(document.getElementById('r')).render(h(A.AltitudeProvider, null, h(A.Suggestions, { 'aria-label': 'Many', onChoose: (v) => window.__chosen.push(v) }, ['One', 'Two', 'Three', 'Four', 'Five'].map((t) => h(A.Suggestion, { key: t }, t)))));
  setTimeout(done, 200);
}));
const tb = await page.evaluate(() => { const g = document.querySelector('.alt-suggestions'); return { role: g.getAttribute('role'), stops: [...g.querySelectorAll('button')].filter((b) => b.tabIndex === 0).length }; });
expect(tb.role === 'toolbar' && tb.stops === 1, `more than four: a toolbar with one tab stop (${JSON.stringify(tb)})`);
await page.mouse.click(900, 650); await page.keyboard.press('Tab');
await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
expect(await page.evaluate(() => document.activeElement.textContent) === 'Three', 'arrow keys move between them');
await page.keyboard.press('Enter'); await page.waitForTimeout(100);
expect((await page.evaluate(() => window.__chosen)).join() === 'Three', 'Enter chooses');
console.log(`Suggestions: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
