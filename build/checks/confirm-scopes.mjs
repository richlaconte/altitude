// Confirmation scopes (#280): with scopes, Approve is a SplitButton: the face approves once, the menu ("More ways to
// approve") holds each scope as a menuitem with its description; the scope is passed to onApprove, named in the
// announcement and in the resolved line ("Ran · allowed for this session by you"); with escalate, scopes are ignored.
// Run after a render of every preview (it opens test/p-Confirmation-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
await page.goto(`file://${T}p-Confirmation-daylight.html`); await page.waitForTimeout(400);
await page.evaluate(() => new Promise((done) => {
  document.body.innerHTML = '<div id="r"></div>'; window.__approved = [];
  const A = window.Altitude, h = React.createElement;
  const scopes = [{ value: 'session', label: 'Allow npm test for this session' }, { value: 'always', label: 'Always allow npm test', description: 'Saved to this project’s settings' }];
  function One({ id, escalate }) {
    const [state, setState] = React.useState('requested');
    const [scope, setScope] = React.useState();
    return h('div', { id }, h(A.Confirmation, { state, title: 'Run npm test', consequence: 'Runs the test suite.', approveLabel: 'Run once', doneLabel: 'Ran', resolvedBy: 'you', scopes, escalate, resolvedScope: scope,
      onApprove: (s) => { window.__approved.push(`${id}:${s}`); setScope(s); setState('running'); setTimeout(() => setState('done'), 200); } }));
  }
  ReactDOM.createRoot(document.getElementById('r')).render(h(A.AltitudeProvider, null, h(One, { id: 'a' }), h(One, { id: 'b' }), h(One, { id: 'c', escalate: 'hold' })));
  setTimeout(done, 300);
}));
const line = (id) => page.evaluate((id) => document.querySelector(`#${id} .alt-confirm-line`).textContent, id);
await page.click('#a .alt-split-action'); await page.waitForTimeout(400);
expect((await page.evaluate(() => window.__approved)).join() === 'a:once' && (await line('a')) === 'Ran · approved by you', `the face approves once, with no scope in the line (${await line('a')})`);
const chev = page.locator('#b button[aria-label="More ways to approve"]');
expect(await chev.count() === 1, 'the menu face is named "More ways to approve"');
await chev.click(); await page.waitForTimeout(300);
const items = await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].map((i) => i.textContent));
expect(items.length === 2 && items[1].includes('Saved to this project’s settings'), `each scope is a menuitem with its description (${JSON.stringify(items)})`);
await page.click('[role="menuitem"]:has-text("for this session")'); await page.waitForTimeout(80);
const said = await page.evaluate(() => document.querySelector('#b [role="status"]').textContent);
expect(said.includes('allowed for this session'), `the announcement names the scope (${said})`);
await page.waitForTimeout(400);
expect((await page.evaluate(() => window.__approved)).includes('b:session') && (await line('b')) === 'Ran · allowed for this session by you', `the resolved line names the scope (${await line('b')})`);
expect(await page.evaluate(() => !document.querySelector('#c .alt-split') && !!document.querySelector('#c .alt-hold')), 'with escalate, scopes are ignored: never pre-approved');
console.log(`Confirmation scopes: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
