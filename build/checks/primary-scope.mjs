// One primary per view (law 1, ALT-VISUAL-002): with devChecks, two visible primary Buttons in one page warn once,
// naming them and law 1; one primary on the page plus one in a Dialog doesn't (a Dialog is its own view); PrimaryScope
// separates independent parts; a hidden primary doesn't count; without devChecks in this build nothing is checked.
// Renders its own trees into a preview page (test/p-Button-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
const warnings = [];
page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });
await page.goto(`file://${T}p-Button-daylight.html`);
await page.waitForTimeout(300);

// Renders a tree in a fresh root and returns the warnings it caused.
const run = async (tree) => {
  warnings.length = 0;
  await page.evaluate((tree) => new Promise((done) => {
    const A = window.Altitude, h = React.createElement;
    const P = (label, props = {}) => h(A.Button, { variant: 'primary', key: label, ...props }, label);
    const S = (label) => h(A.Button, { variant: 'secondary', key: label }, label);
    const trees = {
      two: () => h(A.AltitudeProvider, { devChecks: true }, P('Save'), P('Publish')),
      one: () => h(A.AltitudeProvider, { devChecks: true }, P('Save'), S('Cancel')),
      dialog: () => h(A.AltitudeProvider, { devChecks: true }, P('Invite members'), h(A.Dialog, { open: true, title: 'Invite', footer: P('Send invites') })),
      scoped: () => h(A.AltitudeProvider, { devChecks: true }, h(A.PrimaryScope, null, P('Upgrade')), h(A.PrimaryScope, null, P('Connect'))),
      hidden: () => h(A.AltitudeProvider, { devChecks: true }, P('Save'), h('div', { hidden: true }, P('Publish'))),
      off: () => h(A.AltitudeProvider, null, P('Save'), P('Publish')),
    };
    const d = document.createElement('div'); document.body.append(d);
    const root = ReactDOM.createRoot(d);
    root.render(trees[tree]());
    setTimeout(() => { root.unmount(); d.remove(); done(); }, 400);
  }), tree);
  return warnings.filter((w) => w.includes('Law 1'));
};

const two = await run('two');
expect(two.length === 1 && two[0].includes('"Save"') && two[0].includes('"Publish"'), `two visible primaries warn once, naming them (${two.join(' | ')})`);
expect((await run('one')).length === 0, 'one primary and a secondary: no warning');
expect((await run('dialog')).length === 0, 'a Dialog is its own view');
expect((await run('scoped')).length === 0, 'PrimaryScope separates independent parts');
expect((await run('hidden')).length === 0, 'a hidden primary doesn\'t count');
expect((await run('off')).length === 0, 'without devChecks (no NODE_ENV in this build) nothing is checked');

console.log(`Primary scope: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
