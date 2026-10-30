// Conversation checkpoints (#277): a labelled divider ("Checkpoint · Before editing 6 files · 2:14 PM") with Restore,
// described by its consequence. With onReturn, Restore runs at once: pending hovers on the label, then "Restored",
// the outcome is announced, and "Return to where you were" brings the turns back. Without onReturn, Restore asks in a
// Dialog first (Cancel keeps everything). A failure sinks into a trench with Retry. Run after a render of every
// preview (it opens test/p-Conversation-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 800 } });
await page.goto(`file://${T}p-Conversation-daylight.html`); await page.waitForTimeout(400);
await page.evaluate(() => new Promise((done) => {
  document.body.innerHTML = '<div id="r"></div>';
  const A = window.Altitude, h = React.createElement;
  window.__log = [];
  function App({ mode }) {
    const [later, setLater] = React.useState(true);
    const restore = () => new Promise((ok, no) => setTimeout(() => { if (window.__fail) { window.__fail = false; no(new Error("Couldn't restore: the files changed.")); } else { setLater(false); window.__log.push(`${mode} restore`); ok(); } }, 400));
    return h(A.Conversation, { 'aria-label': mode, id: mode }, h(A.ConversationContent, null,
      h(A.Message, { from: 'user' }, h(A.MessageContent, null, 'Refactor the billing module')),
      h(A.ConversationCheckpoint, { label: 'Before editing 6 files', at: '2026-10-30T14:14:00', locale: 'en-US', consequence: 'The 4 messages after this and the changes to 6 files will be set aside. You can return to them.',
        onRestore: restore, onReturn: mode === 'undo' ? () => { setLater(true); window.__log.push('return'); } : undefined }),
      later && h(A.Message, { from: 'assistant' }, h(A.MessageContent, null, 'Edited 6 files.'))));
  }
  ReactDOM.createRoot(document.getElementById('r')).render(h(A.AltitudeProvider, null, h('div', { style: { height: '300px', display: 'flex' } }, h(App, { mode: 'undo' })), h('div', { style: { height: '300px', display: 'flex' } }, h(App, { mode: 'ask' }))));
  setTimeout(done, 300);
}));
const cp = (mode) => page.evaluate((mode) => { const g = document.querySelector(`#${mode} .alt-checkpoint`); const l = g.querySelector('.alt-checkpoint-label'); return { name: g.getAttribute('aria-label'), text: l.textContent, status: l.dataset.status ?? null, buttons: [...g.querySelectorAll('button')].map((b) => b.textContent), later: !!document.querySelector(`#${mode} .alt-msg[data-from="assistant"]`), said: document.querySelector(`#${mode}`).closest('.alt-convo')?.textContent ?? '' }; }, mode);
let s = await cp('undo');
expect(s.name === 'Checkpoint: Before editing 6 files, 2:14 PM' && /Checkpoint.*Before editing 6 files.*2:14/.test(s.text), `a labelled divider with its time (${s.name})`);
const desc = await page.evaluate(() => { const b = document.querySelector('#undo button[aria-label="Restore to this checkpoint"]'); return document.getElementById(b.getAttribute('aria-describedby'))?.textContent; });
expect(/set aside/.test(desc ?? ''), 'Restore is described by its consequence');
await page.click('#undo button[aria-label="Restore to this checkpoint"]'); await page.waitForTimeout(150);
s = await cp('undo');
expect(s.status === 'pending' && /Restoring/.test(s.text), `restoring hovers as pending (${JSON.stringify(s)})`);
await page.waitForTimeout(500);
s = await cp('undo');
expect(/Restored/.test(s.text) && !s.later && s.buttons.includes('Return to where you were'), `restored: the later turns are set aside, with a way back (${JSON.stringify(s)})`);
expect(await page.evaluate(() => document.body.textContent.includes('Restored to Before editing 6 files')), 'the outcome is announced');
await page.click('#undo button:has-text("Return to where you were")'); await page.waitForTimeout(300);
s = await cp('undo');
expect(s.later && s.buttons.includes('Restore'), `Return brings the turns back (${JSON.stringify(s)})`);
// Without onReturn: ask first.
await page.click('#ask button[aria-label="Restore to this checkpoint"]'); await page.waitForTimeout(300);
const dlg = await page.evaluate(() => { const d = document.querySelector('[role="dialog"], [role="alertdialog"]'); return d && d.textContent; });
expect(/Restore to "Before editing 6 files"\?/.test(dlg ?? '') && /set aside/.test(dlg ?? ''), `without a way back, Restore asks in a Dialog (${dlg})`);
await page.click('[role="dialog"] button:has-text("Cancel"), [role="alertdialog"] button:has-text("Cancel")'); await page.waitForTimeout(300);
s = await cp('ask');
expect(s.later && !(await page.evaluate(() => document.querySelector('[role="dialog"]:not([hidden])'))), 'Cancel keeps everything');
await page.evaluate(() => { window.__fail = true; });
await page.click('#ask button[aria-label="Restore to this checkpoint"]'); await page.waitForTimeout(300);
await page.click('[role="dialog"] button:has-text("Restore")'); await page.waitForTimeout(700);
s = await cp('ask');
expect(s.status === 'failed' && /files changed/.test(s.text) && s.buttons.includes('Retry') && s.later, `a failure sinks into a trench with Retry (${JSON.stringify(s)})`);
await page.click('#ask button:has-text("Retry")'); await page.waitForTimeout(700);
s = await cp('ask');
expect(/Restored/.test(s.text) && !s.later, `Retry restores (${JSON.stringify(s)})`);
console.log(`Checkpoint: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
