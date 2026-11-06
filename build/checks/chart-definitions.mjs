// Definitions (#534): a series' definition opens from an info button beside its legend key (on focus and on hover) in
// a HoverCard, closes on Escape, sits beside the table header too, is said once on the series node, and a lone series
// says it under the title, in the figure's description. Run after a render of every preview (it opens
// test/p-ChartDefinitions-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`file://${T}p-ChartDefinitions-daylight.html`);
await page.waitForTimeout(600);
const card = () => page.evaluate(() => [...document.querySelectorAll('.alt-hovercard')].map((c) => c.textContent).join(' | '));

const btns = await page.evaluate(() => [...document.querySelectorAll('.alt-chart')[0].querySelectorAll('.alt-chart-legend .alt-chart-definition')].map((b) => b.getAttribute('aria-label')));
expect(btns.join() === 'What Active users means,What New users means', `an info button per legend key, named (${btns})`);
await page.locator('.alt-chart-legend .alt-chart-definition').first().focus();
await page.waitForTimeout(700);
expect(/Active users Signed in at least once in the last 28 days\./.test(await card()), `focus opens the definition (${await card()})`);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
expect((await card()) === '', 'Escape closes it');
await page.locator('.alt-chart-legend .alt-chart-definition').nth(1).hover();
await page.waitForTimeout(800);
expect(/New users Created an account that week\./.test(await card()), `hover opens it too (${await card()})`);
await page.mouse.move(2, 2);
await page.waitForTimeout(500);

// The keyboard path: the series node says it once.
await page.locator('.alt-chart').first().locator('.alt-chart-node').first().focus();
await page.keyboard.press('Enter');
const node = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
expect(/^Active users, defined as Signed in at least once in the last 28 days, 8 points,/.test(node), `the series node says it (${node})`);
await page.keyboard.press('Enter');
const point = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
expect(!/defined as/.test(point), 'never per point');
await page.keyboard.press('Escape'); await page.keyboard.press('Escape');

// The table header carries it.
await page.getByRole('tab', { name: 'Table' }).click();
await page.waitForTimeout(300);
const th = await page.evaluate(() => [...document.querySelectorAll('.alt-chart-tablebox th .alt-chart-definition')].map((b) => b.getAttribute('aria-label')));
expect(th.length === 2, `the table headers carry it (${th})`);

// A lone series says it under the title, in the figure's description.
const lone = await page.evaluate(() => {
  const f = document.querySelectorAll('.alt-chart')[1];
  const d = f.querySelector('.alt-chart-defined');
  return { text: d?.textContent, described: !!d && (f.getAttribute('aria-describedby') ?? '').split(' ').includes(d.id), buttons: f.querySelectorAll('.alt-chart-definition').length };
});
expect(lone.text === 'Opened the app at least once that week.' && lone.described, `a lone series says it under the title (${lone.text})`);
expect(errors.length === 0, `no page errors (${errors.join(' | ')})`);
await browser.close();
console.log(`chart definitions: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
