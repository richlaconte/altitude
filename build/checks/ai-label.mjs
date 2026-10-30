// AILabel: a button plate (aria-haspopup dialog) named by what it marks; no gradient or animation; it lifts when pointed
// at; it opens "About this content" with model, time, confidence and sources; a reviewed label reads "Drafted with AI"
// and says who reviewed it; Escape closes and returns focus. Run after a render of every preview (it opens
// test/p-AILabel-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(`file://${T}p-AILabel-daylight.html`);
await page.waitForTimeout(400);

const label = (n) => page.evaluate((n) => { const b = document.querySelectorAll('.alt-ailabel')[n], cs = getComputedStyle(b);
  return { tag: b.tagName, name: b.getAttribute('aria-label'), popup: b.getAttribute('aria-haspopup'), text: b.textContent, bg: cs.backgroundImage, anim: b.getAnimations().length, transform: cs.transform }; }, n);
let r = await label(0);
expect(r.tag === 'BUTTON' && r.popup === 'dialog' && r.name === 'Summary generated with AI. Show details', `a button named by what it marks (${r.name})`);
expect(r.text === 'AI' && r.bg === 'none' && r.anim === 0 && r.transform === 'none', 'a flush plate: a word, no gradient, nothing animating');
await page.hover('.alt-ailabel >> nth=0');
await page.waitForTimeout(250);
expect((await label(0)).transform !== 'none', 'it lifts when pointed at');
await page.focus('.alt-ailabel >> nth=0');
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
const pop = await page.evaluate(() => { const p = document.querySelector('.alt-ailabel-pop'); return p && { title: p.querySelector('.alt-ailabel-title').textContent, facts: [...p.querySelectorAll('.alt-ailabel-facts dt')].map((d) => d.textContent), sources: p.querySelectorAll('.alt-ailabel-sources li').length, made: p.querySelector('.alt-ailabel-facts dd').textContent }; });
expect(pop?.title === 'About this content' && pop.made === 'AI (Opus 5.5)' && pop.facts.join() === 'Made by,Generated,Confidence' && pop.sources === 2, `it explains how the content was made (${JSON.stringify(pop)})`);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
expect(await page.locator('.alt-ailabel-pop').count() === 0 && await page.evaluate(() => document.activeElement.classList.contains('alt-ailabel')), 'Escape closes it and returns focus');
r = await label(1);
expect(r.text === 'Drafted with AI' && r.name === 'Reply drafted with AI and reviewed. Show details', 'a reviewed label reads "Drafted with AI"');
await page.click('.alt-ailabel >> nth=1');
await page.waitForTimeout(400);
expect(await page.evaluate(() => [...document.querySelectorAll('.alt-ailabel-pop .alt-ailabel-facts div')].map((d) => d.textContent).includes('Reviewed byMaya Chen')), 'and says who reviewed it');

console.log(`AILabel: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
