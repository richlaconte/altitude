// BarList: a ranked ol whose rows read "1. /pricing, 4,210, 23%", flat bars sized against the largest with ink holding
// 4.5:1 over them in every scheme, only rows that act lifting on hover, "Other" and "Show all", re-ranked rows carried
// (and not under reduced motion), filtering in place, an imprint while loading, and forced colours. Run after a render
// of every preview in all four schemes (it opens test/p-BarList-<scheme>.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
import { existsSync } from 'fs';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

const open = async (scheme = 'daylight', media) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-BarList-${scheme}.html`);
  await page.waitForTimeout(400);
  return page;
};
const lists = (page) => page.evaluate(() => [...document.querySelectorAll('ol.alt-barlist:not([aria-hidden])')].map((ol) => ({
  role: ol.getAttribute('role'),
  rows: [...ol.children].map((li) => ({
    text: li.textContent, name: li.querySelector('.alt-barlist-name').textContent, rel: li.getAttribute('data-relevance'), other: li.hasAttribute('data-other'),
    bar: li.querySelector('.alt-barlist-bar').getBoundingClientRect().width, zone: li.querySelector('.alt-barlist-zone').getBoundingClientRect().width,
    link: li.querySelector('a') ? 'a' : li.querySelector('button') ? 'button' : null,
  })),
})));

// Ink over a bar, composited on its card, in every scheme rendered.
for (const scheme of ['daylight', 'nightfall', 'mesa', 'alpine']) {
  if (!existsSync(`${T}p-BarList-${scheme}.html`)) continue;
  const page = await open(scheme);
  const worst = await page.evaluate(() => {
    const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const cv = document.createElement('canvas'); cv.width = cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true });
    const px = (...fills) => { g.clearRect(0, 0, 1, 1); for (const f of fills) { g.fillStyle = f; g.fillRect(0, 0, 1, 1); } return [...g.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    let min = Infinity;
    for (const li of document.querySelectorAll('.alt-barlist-row')) {
      const bar = li.querySelector('.alt-barlist-bar'); if (!bar) continue;
      const card = li.closest('.alt-card');
      const under = px(getComputedStyle(card).backgroundColor, getComputedStyle(bar).backgroundColor);
      const ink = px(getComputedStyle(li.querySelector('.alt-barlist-value')).color);
      const [a, b] = [lum(under), lum(ink)].sort((x, y) => y - x);
      min = Math.min(min, (a + 0.05) / (b + 0.05));
    }
    return min;
  });
  expect(worst >= 4.5, `${scheme}: ink holds 4.5:1 over every bar (${worst.toFixed(2)})`);
  await page.close();
}

{
  const page = await open();
  const [pages, refs] = await lists(page);
  expect(pages.role === 'list' && pages.rows.length === 8, `an ol of the top 7 and "Other" (${pages.rows.length})`);
  expect(pages.rows[0].text === '1. /pricing, 4,210, 23%', `a row reads "1. /pricing, 4,210, 23%": "${pages.rows[0].text}"`);
  const o = pages.rows[7];
  expect(o.other && o.name === 'Other (14 pages)' && o.text === 'Other (14 pages), 3,605, 19%', `the rest fold into one row (${o.text})`);
  expect(Math.abs(pages.rows[0].bar - pages.rows[0].zone) < 1 && Math.abs(pages.rows[1].bar / pages.rows[0].bar - 3880 / 4210) < 0.01, 'bars are sized against the largest, which fills its row');
  expect(pages.rows.slice(0, 7).every((r) => r.link === 'a') && !o.link, 'rows with href are links; "Other" is not');
  expect(refs.rows.map((r) => r.name).join() === 'google.com,Direct,github.com,news.ycombinator.com,x.com' && refs.rows.every((r) => !r.link), 'ranked by value, largest first; rows without an action are plain');
  const flat = await page.evaluate(() => [...document.querySelectorAll('.alt-barlist-bar')].every((b) => { const c = getComputedStyle(b); return c.boxShadow === 'none' && c.backgroundImage === 'none'; }));
  expect(flat, 'bars are flat: no shadow, no gradient');
  // Hover: a row that acts lifts one level; a static one doesn't move; the bar inside stays flat.
  const link = page.locator('a.alt-barlist-item').first();
  await link.hover(); await page.waitForTimeout(250);
  const lifted = await link.evaluate((a) => ({ sh: getComputedStyle(a).boxShadow, tf: getComputedStyle(a).transform, bar: getComputedStyle(a.querySelector('.alt-barlist-bar')).boxShadow }));
  expect(lifted.sh !== 'none' && lifted.tf !== 'none' && lifted.bar === 'none', `an interactive row lifts on hover, its bar stays flat (${lifted.sh.slice(0, 30)}…)`);
  const still = page.locator('span.alt-barlist-item').first();
  await still.hover(); await page.waitForTimeout(250);
  const flatRow = await still.evaluate((s) => ({ sh: getComputedStyle(s).boxShadow, tf: getComputedStyle(s).transform }));
  expect(flatRow.sh === 'none' && flatRow.tf === 'none', 'a static row never moves');
  // Show all, and back.
  await page.getByRole('button', { name: 'Show all 21 pages' }).click();
  const [expanded] = await lists(page);
  const ex = await page.getByRole('button', { name: 'Show fewer' }).getAttribute('aria-expanded');
  expect(expanded.rows.length === 21 && ex === 'true', `"Show all" lists every row (${expanded.rows.length}, aria-expanded=${ex})`);
  // Re-rank: news.ycombinator.com spikes to the top and is carried there.
  await page.getByRole('button', { name: 'Today' }).click();
  await page.waitForTimeout(30);
  const moving = await page.evaluate(() => [...document.querySelectorAll('.alt-barlist-row')].filter((li) => li.getAnimations().length).length);
  expect(moving >= 3, `re-ranked rows are carried (${moving} moving)`);
  await page.waitForTimeout(400);
  const [, refs2] = await lists(page);
  expect(refs2.rows[0].name === 'news.ycombinator.com' && refs2.rows[0].text.startsWith('1. '), `then sit in their new ranks (${refs2.rows.map((r) => r.name)})`);
  // Filter in place: matches rise, misses sink and say so.
  await page.getByRole('textbox', { name: 'Filter referrers' }).fill('git');
  const [, refs3] = await lists(page);
  const gh = refs3.rows.find((r) => r.name.startsWith('github'));
  expect(gh.rel === 'match' && refs3.rows.filter((r) => r !== gh).every((r) => r.rel === 'miss' && r.text.includes('not matching')) && refs3.rows.length === 5, 'filtering keeps every row: the match rises, misses sink and say "not matching"');
  // Loading: imprinted rows, then the customers land.
  await page.waitForTimeout(2200);
  const all = await lists(page);
  const cust = all[2];
  expect(cust && cust.rows.length === 4 && cust.rows[0].text === '1. Acme Corp, $48,200', `the imprint lands (${cust?.rows.map((r) => r.text)})`);
  await page.close();
}
{
  const page = await open('daylight', { reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Today' }).click();
  await page.waitForTimeout(30);
  const moving = await page.evaluate(() => [...document.querySelectorAll('.alt-barlist-row')].filter((li) => li.getAnimations().length).length);
  expect(moving === 0, `reduced motion: rows change places in place (${moving} moving)`);
  await page.close();
}
{
  const page = await open('daylight', { forcedColors: 'active' });
  const b = await page.evaluate(() => getComputedStyle(document.querySelector('.alt-barlist-bar')).borderTopWidth);
  expect(b === '1px', `forced colours: bars get a 1px border (${b})`);
  await page.close();
}

await browser.close();
console.log(`bar-list: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
