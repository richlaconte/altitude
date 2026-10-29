// HoldButton: its width never changes (#116). Holding and completing swap the label, but every label shares one
// cell, so the button is as wide as its longest from the start and its neighbour doesn't move; the accessible name
// is the label that shows. Run after a render of every preview (it opens test/p-HoldButton-daylight.html); exits
// non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-HoldButton-daylight.html`);
await page.waitForTimeout(400);

const del = page.locator('.alt-hold').nth(0), pub = page.locator('.alt-hold').nth(1);
const box = async () => ({ del: (await del.boundingBox()).width, pubX: (await pub.boundingBox()).x });
const name = (el) => el.evaluate((b) => [...b.querySelectorAll('.alt-hold-label')].filter((l) => getComputedStyle(l).visibility !== 'hidden').map((l) => l.textContent).join('|'));

const rest = await box();
expect(await name(del) === 'Hold to delete', `at rest only the label shows (${await name(del)})`);
const spoken = await del.evaluate((b) => [...b.querySelectorAll('.alt-hold-label:not([aria-hidden])')].map((l) => l.textContent).join('|'));
expect(spoken === 'Hold to delete', `only the label that shows is in the accessible name (${spoken})`);

await del.focus();
await page.keyboard.down('Space');
await page.waitForTimeout(300);
const holding = await box();
expect(await name(del) === 'Keep holding…', `holding shows holdingLabel (${await name(del)})`);
expect(Math.abs(holding.del - rest.del) < 0.5 && Math.abs(holding.pubX - rest.pubX) < 0.5, `holding doesn't change its width or move its neighbour (${rest.del} → ${holding.del})`);
await page.waitForTimeout(1000);
await page.keyboard.up('Space');
await page.waitForTimeout(600);
const done = await box();
expect(await name(del) === 'Project deleted', `once done it shows doneLabel (${await name(del)})`);
expect(Math.abs(done.del - rest.del) < 0.5 && Math.abs(done.pubX - rest.pubX) < 0.5, `completing doesn't change its width or move its neighbour (${rest.del} → ${done.del})`);

// A repeatable button with a shorter doneLabel keeps its width too, and re-arms with its label.
const pubW = (await pub.boundingBox()).width;
await pub.focus();
await page.keyboard.down('Space');
await page.waitForTimeout(900);
await page.keyboard.up('Space');
await page.waitForTimeout(100);
expect(await name(pub) === 'Published' && Math.abs((await pub.boundingBox()).width - pubW) < 0.5, 'a repeatable button keeps its width when done');
await page.waitForTimeout(2000);
expect(await name(pub) === 'Hold to publish', `it re-arms with its label (${await name(pub)})`);

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
