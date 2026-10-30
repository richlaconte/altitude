// Sync pattern: a change hovers as pending until the server acknowledges it, then lands, and the indicator says Saved
// only then; offline, changes wait ("Waiting to sync"), the indicator counts them and nothing claims to be saved; going
// online sends them; a conflict is counted by the indicator, which takes you to it, shows both versions (theirs with
// their presence rim and name) and keeps the chosen one, saying what happened to the other; an expiring session asks in
// a stationary dialog that Escape doesn't close and says the draft is kept. Run after a render of every preview (it opens
// test/p-SyncPattern-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 800 } });
await page.goto(`file://${T}p-SyncPattern-daylight.html`);
await page.waitForTimeout(400);
const indicator = () => page.evaluate(() => [...document.querySelectorAll('.alt-sync > :not(.alt-sr)')].map((n) => n.textContent).join(' '));
const task = (name) => page.evaluate((name) => { const s = [...document.querySelectorAll('.sy-task')].find((t) => t.textContent.includes(name)); return { status: s.dataset.status || '', words: s.querySelector('.sy-state').textContent }; }, name);

await page.getByText('Book the venue').click();
await page.waitForTimeout(150);
let t = await task('Book the venue');
expect(t.status === 'pending' && t.words === 'Saving…' && !/Saved/.test(await indicator()), `a change is pending until acknowledged (${JSON.stringify(t)}, ${await indicator()})`);
await page.waitForTimeout(800);
t = await task('Book the venue');
expect(t.status === 'committed' && /Saved/.test(await indicator()), `then lands, and only then is Saved said (${await indicator()})`);

await page.getByRole('switch', { name: 'Online' }).click();
await page.getByText('Send the press kit').click();
await page.getByText('Draft the launch email').click();
await page.waitForTimeout(1100);
const a = await task('Send the press kit'), b = await task('Draft the launch email'), ind = await indicator();
expect(a.status === 'pending' && b.status === 'pending' && a.words === 'Waiting to sync', `offline, changes wait (${JSON.stringify(a)})`);
expect(/Offline/i.test(ind) && /2/.test(ind) && !/Saved/.test(ind), `the indicator counts them and claims nothing (${ind})`);
await page.getByRole('switch', { name: 'Online' }).click();
await page.waitForTimeout(900);
expect((await task('Send the press kit')).status === 'committed' && (await task('Draft the launch email')).status === 'committed' && /Saved/.test(await indicator()), 'going online sends them');

await page.getByRole('button', { name: 'Simulate a conflict' }).click();
await page.waitForTimeout(300);
expect(/1 conflict/.test(await indicator()), 'the indicator counts the conflict');
await page.locator('.alt-sync').getByRole('button').last().click();
await page.waitForTimeout(200);
expect(await page.evaluate(() => document.activeElement.id) === 'sy-conflict-h', 'and takes you to it');
const theirs = await page.evaluate(() => { const v = document.querySelector('.sy-version[data-presence]'); return { name: v.textContent, rim: getComputedStyle(v).boxShadow }; });
expect(/Jane Park’s version/.test(theirs.name) && /inset/.test(theirs.rim), 'their version wears their presence rim and name');
await page.getByRole('button', { name: 'Keep theirs' }).click();
await page.waitForTimeout(300);
expect(await page.evaluate(() => document.querySelector('.sy-brief').textContent) === 'Launch on 11 December, in Porto.' && /Yours is in the history/.test(await page.evaluate(() => document.querySelector('.sy-note').textContent)), 'the chosen version is kept, and the other is never silently dropped');

await page.getByRole('button', { name: 'Simulate session expiry' }).click();
await page.waitForTimeout(500);
const dialog = page.getByRole('dialog', { name: 'Your session ends in 2 minutes' });
expect(await dialog.count() === 1 && /kept on this device/.test(await dialog.textContent()), 'an expiring session asks, with the time in words, and keeps the draft');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
expect(await dialog.count() === 1 && await page.locator('[data-receded]').count() === 0, 'it is stationary and Escape doesn’t dismiss it');
await dialog.getByRole('button', { name: 'Stay signed in' }).click();
await page.waitForTimeout(400);
expect(await page.getByRole('dialog').count() === 0, 'Stay signed in closes it');

console.log(`Sync pattern: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
