// Artifact (#271): a region named by its title; "Writing… version 3" with aria-busy and a dashed edge while written,
// then "Version 3", one announcement ("Pricing page, version 3, complete") and a solid edge; failed says so with
// Retry; the reference opens the pane and focuses its heading, and Escape in the pane goes back to the reference;
// Previous/Next version, and viewing an earlier one shows a strip with Return to latest and Restore; Preview, Source
// and Changes are segmented tabs. Run after a render of every preview (it opens test/p-Artifact-daylight.html);
// exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
await page.goto(`file://${T}p-Artifact-daylight.html`); await page.waitForTimeout(400);
await page.evaluate(() => new Promise((done) => {
  document.body.innerHTML = '<div id="r"></div>'; window.__retried = 0;
  const A = window.Altitude, h = React.createElement;
  function App() {
    const [open, setOpen] = React.useState(false);
    const [status, setStatus] = React.useState('writing');
    const [v, setV] = React.useState(3);
    window.__status = setStatus;
    return h('div', { style: { display: 'flex', gap: '16px', height: '600px' } },
      h('div', { style: { width: '320px' } }, h(A.ArtifactReference, { title: 'Pricing page', version: 3, status, controls: 'pa', onOpen: () => setOpen(true) })),
      open && h('div', { style: { flex: 1 } }, h(A.Artifact, { id: 'pa', title: 'Pricing page', status, version: 3, onRetry: () => { window.__retried++; } },
        h(A.ArtifactHeader, { onClose: () => setOpen(false), onDownload: () => {} }),
        h(A.ArtifactVersions, { versions: 3, current: v, onChange: setV, onRestore: () => setV(3) }),
        h(A.ArtifactContent, { views: { preview: h('p', null, 'preview ' + v), source: h('pre', null, 'source ' + v), changes: h('p', null, 'changes ' + v) } }))));
  }
  ReactDOM.createRoot(document.getElementById('r')).render(h(A.AltitudeProvider, null, h(App)));
  setTimeout(done, 300);
}));
const pane = () => page.evaluate(() => { const s = document.getElementById('pa'); if (!s) return null; return { role: s.tagName, name: s.getAttribute('aria-label'), busy: s.getAttribute('aria-busy'), edge: getComputedStyle(s).borderLeftStyle, state: s.querySelector('.alt-artifact-state').textContent, said: s.querySelector(':scope > [role="status"]').textContent, strip: s.querySelector('.alt-artifact-earlier')?.textContent ?? null, version: s.querySelector('.alt-artifact-version')?.textContent, view: s.querySelector('.alt-artifact-body')?.textContent }; });
const ref = await page.evaluate(() => { const b = document.querySelector('.alt-artifact-ref'); return { name: b.textContent.replace(/\s+/g, ' ').trim(), controls: b.getAttribute('aria-controls') }; });
expect(/^Pricing page, ?Writing…\. Open$/.test(ref.name) && ref.controls === 'pa', `the reference names the artifact and controls the pane (${ref.name})`);
await page.click('.alt-artifact-ref'); await page.waitForTimeout(250);
let p = await pane();
expect(p && p.role === 'SECTION' && p.name === 'Pricing page', `a region named by its title (${JSON.stringify(p)})`);
expect(await page.evaluate(() => document.activeElement.classList.contains('alt-artifact-title')), 'opening moves focus to the pane\'s heading');
expect(p.busy === 'true' && p.edge === 'dashed' && p.state === 'Writing… version 3', `being written: busy, a dashed edge, "Writing… version 3" (${p.state})`);
await page.keyboard.press('Escape'); await page.waitForTimeout(100);
expect(await page.evaluate(() => document.activeElement.classList.contains('alt-artifact-ref')), 'Escape in the pane goes back to the reference');
await page.evaluate(() => window.__status('complete')); await page.waitForTimeout(200);
p = await pane();
expect(p.busy === null && p.edge === 'solid' && p.state === 'Version 3' && p.said === 'Pricing page, version 3, complete', `complete: solid, "Version 3", announced once (${JSON.stringify(p)})`);
await page.click('button[aria-label="Previous version"]'); await page.waitForTimeout(150);
p = await pane();
expect(p.version === 'Version 2 of 3' && /Viewing version 2 of 3/.test(p.strip ?? '') && p.view === 'preview 2', `an earlier version shows a strip that says so (${p.strip})`);
await page.click('.alt-artifact-earlier button:has-text("Return to latest")'); await page.waitForTimeout(150);
expect((await pane()).strip === null, 'Return to latest closes the strip');
const tabs = await page.evaluate(() => [...document.querySelectorAll('#pa [role="tab"]')].map((t) => t.textContent));
expect(tabs.join() === 'Preview,Source,Changes', `Preview, Source and Changes are tabs (${tabs})`);
await page.click('#pa [role="tab"]:has-text("Source")'); await page.waitForTimeout(150);
expect((await pane()).view === 'source 3', 'switching to Source shows the source');
expect(await page.locator('button[aria-label="Close Pricing page"]').count() === 1 && await page.locator('button[aria-label="Download Pricing page"]').count() === 1, 'header tools are named for the artifact');
await page.evaluate(() => window.__status('writing')); await page.waitForTimeout(50);
await page.evaluate(() => window.__status('failed')); await page.waitForTimeout(150);
p = await pane();
expect(p.state.startsWith("Couldn't finish version 3") && p.edge === 'solid', `failed says so (${p.state})`);
await page.click('#pa button:has-text("Retry")');
expect(await page.evaluate(() => window.__retried) === 1, 'Retry calls onRetry');
console.log(`Artifact: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
