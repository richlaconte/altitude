// AltitudeProvider mode: a flush strip (no shadow) naming the mode in a labelled region, with its description and way
// out; a fixed 2px frame around the viewport in the mode's tone that stays while scrolling and above a Dialog; the
// Dialog's header names the mode; entering is announced once; leaving removes all of it; forced colours and
// contrast="more" thicken the frame. Run after a render of every preview (it opens test/p-AppMode-daylight.html);
// exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (media) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 500 } });
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-AppMode-daylight.html`);
  await page.waitForTimeout(400);
  return page;
};
const read = (page) => page.evaluate(() => {
  const strip = document.querySelector('.alt-mode-strip'), frame = document.querySelector('.alt-mode-frame');
  const fcs = frame && getComputedStyle(frame);
  return { strip: strip ? { label: strip.getAttribute('aria-label'), tag: strip.tagName, text: strip.textContent, shadow: getComputedStyle(strip).boxShadow } : null,
    frame: frame ? { pos: fcs.position, w: fcs.borderTopWidth, style: fcs.borderTopStyle, z: Number(fcs.zIndex), events: fcs.pointerEvents } : null,
    said: [...document.querySelectorAll('.alt-root [aria-live="polite"]')].map((s) => s.textContent).find((t) => t.includes('mode')) ?? '' };
});

const page = await open();
let r = await read(page);
expect(r.strip?.tag === 'SECTION' && r.strip.label === 'Test mode' && r.strip.shadow === 'none', 'a flush strip, a region named by the mode');
expect(r.strip.text.includes('Payments are simulated') && r.strip.text.includes('Leave test mode'), 'it says what the mode means and offers a way out');
expect(r.frame?.pos === 'fixed' && r.frame.w === '2px' && r.frame.events === 'none', `a fixed 2px frame around the viewport that takes no clicks (${JSON.stringify(r.frame)})`);
expect(r.said === 'Test mode on', `entering the mode is announced (${r.said})`);
await page.click('text=Refund a payment');
await page.waitForTimeout(500);
const dialog = await page.evaluate(() => { const d = document.querySelector('.alt-dialog'); return { plate: d?.querySelector('.alt-mode-plate')?.textContent, z: Number(getComputedStyle(d.closest('.alt-layers') ?? d).zIndex) || 0 }; });
expect(dialog.plate === 'Test mode', 'the Dialog names the mode in its header');
expect(r.frame.z > 1000000, 'the frame sits above dialogs and sheets');
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.click('text=Leave test mode');
await page.waitForTimeout(300);
r = await read(page);
expect(r.strip === null && r.frame === null, 'leaving the mode removes the strip and the frame');
await page.close();

const more = await open();
await more.evaluate(() => document.querySelectorAll('.alt-root').forEach((x) => x.setAttribute('data-contrast', 'more')));
expect((await read(more)).frame.w === '3px', 'contrast="more": a 3px frame');
await more.close();
const forced = await open({ forcedColors: 'active' });
const f = (await read(forced)).frame;
expect(f.style === 'double' && f.w === '4px', `forced colours: a 4px double frame (${f.style} ${f.w})`);
await forced.close();

console.log(`App mode: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
