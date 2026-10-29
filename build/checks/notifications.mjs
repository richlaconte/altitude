// NotificationCenter: the bell's name includes the unread count and only its count floats; the panel opens at level 3
// with Mark all as read first; unread items carry a dot, weight 600 and "Unread" in their name and no extra height;
// opening a linked item marks it read; Mark all as read clears the dots; a new notification is announced while the
// panel is closed and arrives with the afterglow; at 360px the panel is a bottom Sheet. Run after a render of every
// preview (it opens test/p-NotificationCenter-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (width) => {
  const page = await browser.newPage({ viewport: { width, height: 700 } });
  await page.goto(`file://${T}p-NotificationCenter-daylight.html`);
  await page.waitForTimeout(400);
  return page;
};
const page = await open(960);
const bell = () => page.evaluate(() => { const b = document.querySelector('.alt-notes-bell'); return { name: b.getAttribute('aria-label'), badge: b.querySelector('.alt-notes-badge')?.textContent ?? null }; });
const items = () => page.evaluate(() => [...document.querySelectorAll('.alt-notes-item')].map((li) => ({ unread: li.hasAttribute('data-unread'), title: li.querySelector('.alt-notes-title').textContent, weight: getComputedStyle(li.querySelector('.alt-notes-title')).fontWeight, dot: getComputedStyle(li.querySelector('.alt-notes-dot')).opacity, shadow: getComputedStyle(li).boxShadow, settle: li.getAttribute('data-settle') })));
const said = () => page.evaluate(() => document.querySelector('.alt-notes-center > .alt-sr[aria-live]').textContent);

expect((await bell()).name === 'Notifications, 2 unread' && (await bell()).badge === '2', 'the bell names the unread count, and the count floats');
await page.click('.alt-notes-bell');
await page.waitForTimeout(400);
const first = await page.evaluate(() => { const p = document.querySelector('.alt-notes-pop'); return { shadow: getComputedStyle(p).boxShadow, firstButton: p.querySelector('button')?.textContent }; });
expect(first.shadow !== 'none' && first.firstButton === 'Mark all as read', 'the panel floats, with Mark all as read first');
let it = await items();
expect(it[0].unread && it[0].title.startsWith('Unread: ') && Number(it[0].weight) >= 600 && it[0].dot === '1', 'an unread item: a dot, weight 600, "Unread" in its name');
expect(!it[2].unread && Number(it[2].weight) < 600 && it[2].dot === '0', 'a read item has neither');
expect(it.every((x) => x.shadow === 'none'), 'unread is never a height');
await page.click('.alt-notes-link >> nth=0');
await page.waitForTimeout(300);
expect((await bell()).name === 'Notifications, 1 unread', 'opening a linked item marks it read');
await page.click('.alt-notes-bell');
await page.waitForTimeout(400);
await page.click('button:has-text("Mark all as read")');
await page.waitForTimeout(300);
expect((await items()).every((x) => !x.unread) && (await bell()).badge === null, 'Mark all as read clears the dots and the count');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await page.click('button:has-text("Simulate a new notification")');
await page.waitForTimeout(200);
expect((await said()) === '1 new notification.' && (await bell()).badge === '1', `a new notification is announced while the panel is closed (${await said()})`);
await page.click('.alt-notes-bell');
await page.waitForTimeout(400);
it = await items();
expect(it[0].unread && (it[0].settle === 'a' || it[0].settle === 'b') && !it[1].settle, 'it arrives with the afterglow; older ones don\'t glow');
await page.close();

const phone = await open(360);
await phone.click('.alt-notes-bell');
await phone.waitForTimeout(600);
expect(await phone.evaluate(() => !!document.querySelector('.alt-sheet [role="dialog"], .alt-sheet[role="dialog"], [role="dialog"] .alt-notes')), 'at 360px the panel is a Sheet');
await phone.close();

console.log(`NotificationCenter: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
