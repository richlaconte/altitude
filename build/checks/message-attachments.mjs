// Message attachments (#274): what went with a sent message, in a list named "2 attachments" before its text; images
// as 64px thumbnails, other files as settled Tag plates with type and size; those with onOpen or href act, by mouse
// and keyboard, named "Open <file>"; an unavailable file says so and doesn't act; an acting plate lifts when hovered.
// Run after a render of every preview (it opens test/p-Conversation-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
await page.goto(`file://${T}p-Conversation-daylight.html`); await page.waitForTimeout(400);
await page.evaluate(() => new Promise((done) => {
  document.body.innerHTML = '<div id="r"></div>'; window.__opened = [];
  const A = window.Altitude, h = React.createElement;
  const img = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='64'/%3E";
  ReactDOM.createRoot(document.getElementById('r')).render(h(A.AltitudeProvider, null,
    h(A.Message, { from: 'user' },
      h(A.MessageAttachments, { items: [
        { name: 'checkout-bug.png', type: 'image/png', url: img, onOpen: () => window.__opened.push('png') },
        { name: 'Q3 pricing.pdf', type: 'application/pdf', size: 482113, href: '#pdf' },
        { name: 'diagram.png', type: 'image/png', url: img },
        { name: 'old-export.csv', type: 'text/csv', size: 1200, href: '#csv', unavailable: true },
      ] }),
      h(A.MessageContent, null, 'Why does checkout break on this screen?'))));
  setTimeout(done, 300);
}));
const info = await page.evaluate(() => {
  const ul = document.querySelector('.alt-msg-attachments');
  const items = [...ul.children];
  return {
    label: ul.getAttribute('aria-label'), beforeText: !!(ul.compareDocumentPosition(document.querySelector('.alt-msg-content')) & Node.DOCUMENT_POSITION_FOLLOWING),
    thumbH: items[0].querySelector('.alt-msg-thumb').getBoundingClientRect().height, thumbName: items[0].querySelector('button')?.getAttribute('aria-label'),
    pdf: items[1].querySelector('a')?.textContent, plain: items[2].querySelector('img')?.getAttribute('alt'), plainActs: !!items[2].querySelector('a, button'),
    gone: items[3].textContent, goneActs: !!items[3].querySelector('a, button'),
  };
});
expect(info.label === '4 attachments' && info.beforeText, `a list named "4 attachments" before the text (${info.label})`);
expect(info.thumbH === 64 && info.thumbName === 'Open checkout-bug.png', `an image is a 64px thumbnail named "Open checkout-bug.png" (${info.thumbH}, ${info.thumbName})`);
expect(/Q3 pricing\.pdf/.test(info.pdf) && /PDF/.test(info.pdf) && /482/.test(info.pdf), `a file plate has name, type and size (${info.pdf})`);
expect(info.plain === 'diagram.png' && !info.plainActs, 'an image that doesn\'t open is a plain thumbnail with its name as alt');
expect(/No longer available/.test(info.gone) && !info.goneActs, `an unavailable file says so and doesn't act (${info.gone})`);
await page.click('.alt-msg-thumb');
expect((await page.evaluate(() => window.__opened)).join() === 'png', 'clicking a thumbnail opens it');
await page.mouse.click(4, 690); // empty page: Tab starts from the top again
await page.keyboard.press('Tab');
expect(await page.evaluate(() => document.activeElement.getAttribute('aria-label')) === 'Open checkout-bug.png', 'Tab reaches the thumbnail');
await page.keyboard.press('Enter');
expect((await page.evaluate(() => window.__opened)).length === 2, 'Enter opens it');
await page.keyboard.press('Tab');
expect(await page.evaluate(() => document.activeElement.getAttribute('href')) === '#pdf', 'Tab then reaches the file link');
const rest = await page.evaluate(() => getComputedStyle(document.querySelectorAll('.alt-msg-file')[0]).transform);
await page.hover('.alt-msg-file[data-acts]'); await page.waitForTimeout(300);
const lifted = await page.evaluate(() => getComputedStyle(document.querySelector('.alt-msg-file[data-acts]')).transform);
expect(rest === 'none' && lifted !== 'none', `an acting plate lifts when hovered (${rest} → ${lifted})`);
console.log(`Message attachments: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
