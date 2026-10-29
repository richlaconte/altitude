// Link: accent-ink with an underline that thickens on hover, and nothing that lifts (no transform, no shadow); a 2px
// accent-ink focus ring; external links open a new tab with rel, an icon and "(opens in a new tab)"; asChild styles
// your own element; a 2px underline under contrast="more" and LinkText under forced colours. Run after a render of
// every preview (it opens test/p-Link-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

const open = async (media) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-Link-daylight.html`);
  await page.waitForTimeout(300);
  return page;
};
const colour = (page, value) => page.evaluate((v) => { const p = document.createElement('i'); p.style.color = v; document.querySelector('.alt-root').append(p); const c = getComputedStyle(p).color; p.remove(); return c; }, value);
const read = (page, i) => page.evaluate((i) => {
  const el = document.querySelectorAll('.alt-link')[i], cs = getComputedStyle(el), r = el.getBoundingClientRect();
  return { tag: el.tagName, href: el.getAttribute('href'), target: el.getAttribute('target'), rel: el.getAttribute('rel'), text: el.textContent,
    color: cs.color, line: cs.textDecorationLine, thick: cs.textDecorationThickness, transform: cs.transform, shadow: cs.boxShadow,
    outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`, offset: cs.outlineOffset, top: r.top, icon: !!el.querySelector('.alt-link-ext') };
}, i);

{
  const page = await open();
  const ink = await colour(page, 'var(--accent-ink)');
  const prose = await read(page, 0), ext = await read(page, 1), router = await read(page, 2);
  expect(prose.tag === 'A' && prose.href === '#webhooks' && prose.target === null, 'a plain link is an <a href> in the same tab');
  expect(prose.color === ink && prose.line === 'underline' && prose.thick === '1px', `accent-ink, underlined 1px (${prose.color} vs ${ink}, ${prose.line} ${prose.thick})`);
  await page.hover('.alt-link >> nth=0');
  await page.waitForTimeout(250);
  const hovered = await read(page, 0);
  expect(hovered.thick === '2px', `hover thickens the underline (${hovered.thick})`);
  expect(hovered.transform === 'none' && hovered.shadow === 'none' && Math.abs(hovered.top - prose.top) < 0.01, `hover never lifts it (${hovered.transform}, ${hovered.shadow}, ${prose.top} → ${hovered.top})`);
  await page.mouse.move(0, 0);
  await page.keyboard.press('Tab');
  const focused = await read(page, 0);
  expect(focused.outline === `solid 2px ${ink}` && focused.offset === '2px', `keyboard focus is the 2px accent-ink ring at 2px (${focused.outline}, ${focused.offset})`);
  expect(ext.target === '_blank' && ext.rel === 'noopener noreferrer', `external opens a new tab with rel (${ext.target}, ${ext.rel})`);
  expect(ext.icon && ext.text === 'status page (opens in a new tab)', `external has an icon and says so (${ext.text})`);
  const glued = await page.evaluate(() => { const t = document.querySelectorAll('.alt-link')[1].querySelector('.alt-link-tail'); const range = document.createRange(); range.selectNodeContents(t.firstChild); return Math.abs(range.getBoundingClientRect().bottom - t.querySelector('svg').getBoundingClientRect().bottom) < 6; });
  expect(glued, 'the external icon stays on the line of the last word');
  expect(router.tag === 'A' && router.href === '#/billing/invoices' && router.color === ink && router.line === 'underline', `asChild styles your own element and keeps its props (${router.href})`);
  await page.close();
}
{
  const page = await open();
  await page.evaluate(() => document.querySelectorAll('.alt-root').forEach((r) => r.setAttribute('data-contrast', 'more')));
  expect((await read(page, 0)).thick === '2px', 'contrast="more": the underline is 2px at rest');
  await page.close();
}
{
  const page = await open({ forcedColors: 'active' });
  const linkText = await colour(page, 'LinkText');
  expect((await read(page, 0)).color === linkText, 'forced colours: LinkText');
  await page.close();
}

console.log(`Link: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
