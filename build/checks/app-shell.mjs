// AppShell and Sidebar: landmarks (a labelled nav, header, main) and a skip link; the frame on the ground divided by
// lines; the current destination has aria-current and a raised pill that follows navigation; a count is part of the
// destination's name and floats; ⌘/Ctrl+B collapses to a rail whose destinations keep their names and show tooltips
// to the right; a collapsible group is a disclosure; the top bar rises while content passes under it; at 360px the
// sidebar is a "Navigation" drawer that closes on navigation. Run after a render of every preview (it opens
// test/p-AppShell-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (width) => {
  const page = await browser.newPage({ viewport: { width, height: 640 } });
  page.on('pageerror', (e) => { fail++; console.log('FAIL page error', e.message.slice(0, 120)); });
  await page.goto(`file://${T}p-AppShell-daylight.html`);
  await page.waitForTimeout(400);
  return page;
};
const page = await open(960);
const read = () => page.evaluate(() => {
  const nav = document.querySelector('nav.alt-sidebar'), cur = nav.querySelector('[aria-current="page"]'), pill = nav.querySelector('.alt-sidebar-pill');
  const a = cur?.getBoundingClientRect(), b = pill.getBoundingClientRect();
  return { nav: nav.getAttribute('aria-label'), header: !!document.querySelector('header.alt-topbar'), main: document.querySelector('main')?.id, skip: document.querySelector('.alt-skip')?.getAttribute('href'),
    navShadow: getComputedStyle(nav).boxShadow, navBorder: getComputedStyle(nav).borderRightWidth, current: cur?.textContent, pillOff: a ? Math.abs(a.top - b.top) + Math.abs(a.left - b.left) : NaN, pillShadow: getComputedStyle(pill).boxShadow,
    inbox: (() => { const l = [...nav.querySelectorAll('.alt-sidebar-button')].find((x) => x.textContent.startsWith('Inbox')); return l ? (l.getAttribute('aria-label') ?? l.textContent) : null; })(),
    badge: getComputedStyle(nav.querySelector('.alt-sidebar-badge')).boxShadow, rail: nav.hasAttribute('data-rail'), width: nav.getBoundingClientRect().width,
    topUnder: document.querySelector('.alt-topbar').hasAttribute('data-under') };
});

let r = await read();
expect(r.nav === 'Main' && r.header && r.main === 'alt-main' && r.skip === '#alt-main', 'landmarks: a labelled nav, a header, a main, and a skip link to it');
expect(r.navShadow === 'none' && r.navBorder === '1px', 'the sidebar lies on the ground, divided by a line');
expect(r.current === 'Inbox, 4 unread' && r.pillOff < 1 && r.pillShadow !== 'none', `the current destination sits on a raised pill (${r.pillOff})`);
expect(r.inbox === 'Inbox, 4 unread' && r.badge !== 'none', `a count is part of the name, and floats (${r.inbox})`);
await page.click('.alt-sidebar-button:has-text("Reports")');
await page.waitForTimeout(500);
r = await read();
expect(r.current === 'Reports' && r.pillOff < 1, `the pill follows navigation (${r.current}, ${r.pillOff})`);

await page.click('button.alt-sidebar-label');
expect(await page.evaluate(() => document.querySelector('button.alt-sidebar-label').getAttribute('aria-expanded')) === 'false' && !(await page.locator('.alt-sidebar-button:has-text("Members")').isVisible()), 'a collapsible group is a disclosure');
await page.click('button.alt-sidebar-label');

await page.keyboard.press('Control+b');
await page.waitForTimeout(500);
r = await read();
expect(r.rail && r.width < 70, `⌘/Ctrl+B collapses to a rail (${r.width}px)`);
expect(r.inbox === 'Inbox, 4 unread', `in the rail a destination keeps its name (${r.inbox})`);
expect(await page.getAttribute('.alt-sidebar-trigger', 'aria-label') === 'Expand sidebar', 'the trigger says what it will do');
await page.hover('[aria-label="Projects"]');
await page.waitForTimeout(800);
const tip = await page.evaluate(() => { const t = document.querySelector('.alt-tip'), a = document.querySelector('[aria-label="Projects"]').getBoundingClientRect(); const r = t?.getBoundingClientRect(); return t ? { text: t.textContent, right: r.left > a.right } : null; });
expect(tip?.text === 'Projects' && tip.right, `the rail's tooltip opens to the right (${JSON.stringify(tip)})`);
await page.keyboard.press('Control+b');
await page.waitForTimeout(400);
expect(!(await read()).rail, 'and expands again');

await page.evaluate(() => { document.querySelector('.alt-shell-page').scrollTop = 120; });
await page.waitForTimeout(300);
expect((await read()).topUnder, 'the top bar rises while content passes under it');
await page.close();

const phone = await open(360);
expect(await phone.locator('nav.alt-sidebar').count() === 0, 'at 360px the sidebar isn\'t on the page');
await phone.click('[aria-label="Open navigation"]');
await phone.waitForTimeout(600);
const drawer = await phone.evaluate(() => { const d = document.querySelector('.alt-sidebar-drawer'); return d ? { role: d.getAttribute('role'), title: d.querySelector('.alt-sheet-title, h2')?.textContent, nav: !!d.querySelector('nav.alt-sidebar') } : null; });
expect(drawer?.role === 'dialog' && drawer.title === 'Navigation' && drawer.nav, `it opens as a "Navigation" drawer (${JSON.stringify(drawer)})`);
await phone.click('.alt-sidebar-drawer .alt-sidebar-button:has-text("Billing")');
await phone.waitForTimeout(600);
expect(await phone.locator('.alt-sidebar-drawer[data-state="open"]').count() === 0, 'choosing a destination closes it');
await phone.close();

console.log(`AppShell: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
