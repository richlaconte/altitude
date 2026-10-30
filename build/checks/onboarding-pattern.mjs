// Onboarding pattern: setup progress is a Meter, not Progress; tasks can't be checked off by clicking them, only by doing
// them, and then they're stamped Done; the guide can be skipped before it's finished, hidden after, and found again from
// Help; an empty region opens with its one action; no tour starts on its own, one runs when asked and doesn't dim the
// page; "What's new" counts only unseen changes and the count goes once they're seen. Run after a render of every
// preview (it opens test/p-OnboardingPattern-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 1000 } });
await page.goto(`file://${T}p-OnboardingPattern-daylight.html`);
await page.waitForTimeout(500);
const guide = () => page.evaluate(() => { const g = document.querySelector('.ob-guide'); return g && { meter: g.querySelectorAll('.alt-meter').length, progress: g.querySelectorAll('[role="progressbar"]').length, text: g.querySelector('.alt-meter').textContent,
  done: [...g.querySelectorAll('.ob-task[data-done]')].map((t) => t.querySelector('.ob-title').textContent), checkboxes: g.querySelectorAll('input[type="checkbox"], [role="checkbox"]').length }; });

let g = await guide();
expect(g.meter === 1 && g.progress === 0 && /2 of 4/.test(g.text), `setup progress is a Meter reading "2 of 4" (${g.text})`);
expect(g.checkboxes === 0 && g.done.join() === 'Create a project,Invite your team', 'tasks can’t be ticked by hand; done ones are stamped');
expect(await page.locator('[role="dialog"]').count() === 0, 'no tour starts on its own');
const empty = await page.evaluate(() => { const e = document.querySelector('#ob-connect .alt-empty'); return e && { buttons: e.querySelectorAll('button').length, text: e.textContent }; });
expect(empty && empty.buttons === 1 && /No data sources yet/.test(empty.text), 'an empty region opens with its one action');
await page.locator('#ob-connect').getByRole('button', { name: 'Connect a data source' }).click();
await page.waitForTimeout(300);
g = await guide();
expect(g.done.includes('Connect a data source') && /3 of 4/.test(g.text), 'doing the task stamps it and the reading rises');
expect(await page.locator('.ob-guide').getByRole('button', { name: 'Skip for now' }).count() === 1, 'an unfinished guide can be skipped');
await page.locator('#ob-billing').getByRole('button', { name: 'Add billing details' }).click();
await page.waitForTimeout(300);
await page.locator('.ob-guide').getByRole('button', { name: 'Hide setup guide' }).click();
await page.waitForTimeout(300);
expect(await page.locator('.ob-guide').count() === 0 && /Open it again any time from Help/.test(await page.evaluate(() => document.querySelector('.ob-page > [role="status"]')?.textContent || '')), 'a finished guide hides, saying where to find it');
await page.getByRole('button', { name: 'Help: setup guide' }).click();
await page.waitForTimeout(300);
expect(await page.locator('.ob-guide').count() === 1, 'and Help brings it back');

await page.getByRole('button', { name: 'Show me what changed in the sidebar' }).click();
await page.waitForTimeout(600);
expect(await page.getByRole('dialog', { name: 'Projects are grouped by team' }).count() === 1 && await page.locator('[data-receded]').count() === 0, 'a tour runs when asked, without dimming the page');
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

const news = page.getByRole('button', { name: /What’s new/ });
expect(/2/.test(await news.textContent()), 'What’s new counts unseen changes');
await news.click();
await page.waitForTimeout(400);
expect(await page.getByRole('dialog', { name: 'What’s new' }).locator('.alt-timeline-item').count() === 3, 'it lists the changes as a timeline');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
expect(!(await page.locator('#ob-new .alt-badge').count()), 'once seen, the count goes');

console.log(`Onboarding pattern: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
