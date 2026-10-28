// Stat: flush on what it sits on, named by its label, its change said in words with an arrow, neutral unless a good
// direction is given (then a positive or critical plate), a value that loads as an imprint and lands, and a changed
// value that cross-fades straight to the new number (never counting up) with the afterglow and a polite
// announcement. Run after a render of every preview (it opens test/p-Stat-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

const read = (page) => page.evaluate(() => [...document.querySelectorAll('.alt-stat')].map((el) => {
  const change = el.querySelector('.alt-stat-change');
  const value = el.querySelector('.alt-stat-value');
  const cs = getComputedStyle(value);
  return {
    name: document.getElementById(el.getAttribute('aria-labelledby'))?.textContent,
    texts: [...el.querySelectorAll('.alt-stat-text')].map((t) => ({ text: t.textContent, out: t.hasAttribute('data-out') })),
    imprint: !!el.querySelector('.alt-stat-imprint'),
    change: change && { text: change.textContent, badge: change.classList.contains('alt-badge'), tone: change.getAttribute('data-tone'), arrow: !!change.querySelector('svg[aria-hidden="true"]'), color: getComputedStyle(change).color },
    vs: el.querySelector('.alt-stat-vs')?.textContent ?? null,
    size: cs.fontSize, weight: cs.fontWeight, nums: cs.fontVariantNumeric,
    shadow: getComputedStyle(el).boxShadow, settle: el.getAttribute('data-settle'),
    live: el.querySelector('[aria-live]')?.textContent ?? null,
  };
}));

const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
await page.goto(`file://${T}p-Stat-daylight.html`);
await page.waitForTimeout(500);
{
  const [mrr, users, errors, latency, refunds] = await read(page);
  expect(mrr.imprint && mrr.name === 'Monthly recurring revenue', 'an undefined value is an imprint, under its label');
  expect(users.name === 'Active users' && users.texts[0].text === '12,480', `the stat is named by its label and shows its value (${users.name}, ${users.texts[0]?.text})`);
  expect(users.shadow === 'none' && users.settle === null, `flush: no shadow, no afterglow at rest (${users.shadow})`);
  expect(users.size === '28px' && users.weight === '600' && users.nums === 'tabular-nums', `text-title, 600, tabular (${users.size}, ${users.weight}, ${users.nums})`);
  expect(users.change.badge && users.change.tone === 'positive' && users.change.text === 'Up 8%' && users.change.arrow, `good="up", going up: a positive plate, "Up 8%" and an arrow (${JSON.stringify(users.change)})`);
  expect(errors.change.badge && errors.change.tone === 'critical' && /^Up 21%/.test(errors.change.text), `good="down", going up: a critical plate (${errors.change.tone})`);
  expect(!latency.change.badge && latency.change.text === 'Down 12 ms' && latency.change.arrow, `no good direction: neutral text with an arrow (${latency.change.text})`);
  const muted = await page.evaluate(() => getComputedStyle(document.querySelector('.alt-stat-label')).color);
  expect(latency.change.color === muted, `neutral change is ink-muted (${latency.change.color} vs ${muted})`);
  expect(users.vs === 'vs last month: 11,556', `the comparison names its value (${users.vs})`);
  expect(refunds.texts[0].text === '—' && refunds.change === null, 'null is an em dash, with no change');
}
// The imprint lands, formatted, in the hero size.
await page.waitForTimeout(2400);
{
  const [mrr] = await read(page);
  expect(!mrr.imprint && mrr.texts.map((t) => t.text).join() === '$184,200' && mrr.size === '44px', `the value lands, in text-display (${mrr.texts.map((t) => t.text)}, ${mrr.size})`);
}
// A changed value cross-fades straight to the new number, with the afterglow and a polite announcement.
await page.getByRole('button', { name: 'Refresh' }).click();
await page.waitForTimeout(40);
{
  const [, users, errors] = await read(page);
  const shown = users.texts.filter((t) => !t.out).map((t) => t.text), leaving = users.texts.filter((t) => t.out).map((t) => t.text);
  expect(shown.join() === '12,792' && leaving.join() === '12,480', `the new value at once, the old one fading out (${shown} / ${leaving})`);
  expect(!!users.settle, 'a changed value gets the afterglow');
  expect(users.live === 'Active users, 12,792, up 10.7% vs last month.', `announced politely: "${users.live}"`);
  expect(errors.texts.filter((t) => !t.out)[0].text === '1.8%', `no counting up: the new value is the final one (${errors.texts[0].text})`);
}
await page.waitForTimeout(500);
{
  const [, users] = await read(page);
  expect(users.texts.length === 1, `the old value is gone once the cross-fade ends (${users.texts.length})`);
}
await page.close();
{
  const forced = await browser.newPage({ viewport: { width: 960, height: 700 } });
  await forced.emulateMedia({ forcedColors: 'active' });
  await forced.goto(`file://${T}p-Stat-daylight.html`);
  await forced.waitForTimeout(400);
  const border = await forced.evaluate(() => getComputedStyle(document.querySelector('.alt-stat-change.alt-badge')).borderTopWidth);
  expect(border === '1px', `forced colours: the change plate has a 1px border (${border})`);
  await forced.close();
}

await browser.close();
console.log(`stat: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
