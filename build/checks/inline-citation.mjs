// InlineCitation and Sources: markers are links named "Source n: title" pointing at their Sources entry, flush until
// pointed at (then they lift); focus opens the preview with title and excerpt; an unverified source says so in words;
// Enter follows to the Sources entry; Sources is a labelled ordered list. Run after a render of every preview (it opens
// test/p-InlineCitation-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-InlineCitation-daylight.html`);
await page.waitForTimeout(400);

const marks = await page.evaluate(() => [...document.querySelectorAll('.alt-cite')].map((a) => ({ tag: a.tagName, name: a.getAttribute('aria-label'), href: a.getAttribute('href'), text: a.textContent, transform: getComputedStyle(a).transform })));
expect(marks.length === 3 && marks.every((m) => m.tag === 'A') && marks[1].name === 'Source 2: Plans and pricing' && marks[1].href === '#source-2', `markers are links named by their source (${marks[1].name})`);
expect(marks.every((m) => m.transform === 'none'), 'flush at rest');
await page.hover('.alt-cite >> nth=1');
await page.waitForTimeout(250);
expect(await page.evaluate(() => getComputedStyle(document.querySelectorAll('.alt-cite')[1]).transform) !== 'none', 'it lifts when pointed at');
await page.mouse.move(900, 500);
await page.waitForTimeout(400);
await page.focus('.alt-cite >> nth=0');
await page.waitForTimeout(600);
const card = await page.evaluate(() => { const c = document.querySelector('.alt-cite-card'); return c && { title: c.querySelector('.alt-cite-title').textContent, excerpt: c.querySelector('.alt-cite-excerpt')?.textContent, meta: c.querySelector('.alt-cite-meta').textContent }; });
expect(card?.title === 'Billing FAQ' && card.excerpt.startsWith('Annual plans') && card.meta === 'Source 1 · help.example.com', `focus opens the preview (${JSON.stringify(card)})`);
expect(marks[2].name === 'Source 3: Forum post: “Refunds after 30 days?” (unverified)' && await page.evaluate(() => document.querySelectorAll('.alt-sources-list li')[2].textContent.includes('Unverified source')), 'an unverified source says so in words');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
expect(await page.evaluate(() => location.hash) === '#source-1' && await page.evaluate(() => getComputedStyle(document.getElementById('source-1')).backgroundColor) !== 'rgba(0, 0, 0, 0)', 'Enter follows to its entry, highlighted');
const src = await page.evaluate(() => { const s = document.querySelector('.alt-sources'); return { label: document.getElementById(s.getAttribute('aria-labelledby')).textContent, items: s.querySelectorAll('ol > li').length }; });
expect(src.label === 'Sources' && src.items === 3, 'Sources is a labelled ordered list');

console.log(`InlineCitation: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
