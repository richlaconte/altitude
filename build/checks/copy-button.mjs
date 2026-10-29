// CopyButton: copies its value (a string or a function's promise) through a stubbed clipboard, then stays pressed to
// the ground with a check and "Copied" for dur-linger without changing its name or width, announced in a polite status
// region, with no afterglow; an icon-only one is named by label with a Tooltip; a failure says how to copy by hand;
// with no Clipboard API it falls back to the copy command. Run after a render of every preview (it opens
// test/p-CopyButton-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (init) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  await page.addInitScript(init);
  await page.goto(`file://${T}p-CopyButton-daylight.html`);
  await page.waitForTimeout(300);
  return page;
};
const stub = () => { window.__copied = []; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { window.__copied.push(t); } } }); };
const read = (page, i) => page.evaluate((i) => {
  const b = document.querySelectorAll('.alt-copy')[i], cs = getComputedStyle(b);
  const shown = [...b.querySelectorAll('.alt-copy-icons > svg')].findIndex((s) => s.hasAttribute('data-shown'));
  const words = [...b.querySelectorAll('.alt-copy-words > span')].find((s) => s.hasAttribute('data-shown'))?.textContent ?? null;
  const status = b.closest('.alt-tip-anchor')?.nextElementSibling ?? b.nextElementSibling;
  return { state: b.getAttribute('data-copy'), label: b.getAttribute('aria-label'), square: b.hasAttribute('data-square'), icon: ['copy', 'check', 'alert'][shown], words,
    w: b.getBoundingClientRect().width, transform: cs.transform, settle: b.getAttribute('data-settle'), status: status?.getAttribute('role') === 'status' ? status.textContent : '(none)' };
}, i);

{
  const page = await open(stub);
  let key = await read(page, 0);
  expect(key.square && key.label === 'Copy API key' && key.icon === 'copy' && key.state === 'idle', `icon-only: square, named by label (${JSON.stringify(key)})`);
  await page.hover('.alt-copy >> nth=0');
  await page.waitForTimeout(700);
  expect(await page.locator('.alt-tip').first().textContent() === 'Copy API key', 'icon-only shows its label in a Tooltip');
  await page.click('.alt-copy >> nth=0');
  await page.waitForTimeout(250);
  key = await read(page, 0);
  expect((await page.evaluate(() => window.__copied))[0] === 'sk_live_51Hc8x2Lw9Qe7TfR4mNpZa', 'it copies its value');
  expect(key.state === 'copied' && key.icon === 'check', `copied: a check (${key.state}, ${key.icon})`);
  expect(key.label === 'Copy API key', `it keeps its name (${key.label})`);
  expect(key.status === 'Copied', `"Copied" is announced in a polite status region (${key.status})`);
  expect(key.transform !== 'none' && key.settle === null, `pressed to the ground, no afterglow (${key.transform}, settle ${key.settle})`);
  await page.mouse.move(0, 0);

  const before = await read(page, 1);
  expect(before.words === 'Copy invite link', `a text button shows its words (${before.words})`);
  await page.focus('.alt-copy >> nth=1');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  const after = await read(page, 1);
  expect((await page.evaluate(() => window.__copied))[1] === 'https://app.example.com/invite/7Fq2', 'Enter copies a function\'s value');
  expect(after.words === 'Copied' && Math.abs(after.w - before.w) < 0.5, `it says "Copied" at the same width (${before.w} → ${after.w})`);
  const spoken = await page.evaluate(() => [...document.querySelectorAll('.alt-copy')[1].querySelectorAll('.alt-copy-words > span:not([aria-hidden])')].map((s) => s.textContent).join('|'));
  expect(spoken === 'Copy invite link', `its name stays its own words (${spoken})`);
  await page.waitForTimeout(2100);
  const back = await read(page, 1);
  expect(back.state === 'idle' && back.words === 'Copy invite link' && back.status === '', `after dur-linger it springs back and the status clears (${back.state}, "${back.status}")`);

  await page.click('.alt-copy >> nth=2');
  await page.waitForTimeout(250);
  const failed = await read(page, 2);
  expect(failed.state === 'failed' && failed.icon === 'alert' && failed.words === "Couldn't copy", `a failure says so (${failed.state}, ${failed.words})`);
  expect(/^Couldn't copy\. Select the text and press (⌘C|Ctrl\+C)\.$/.test(failed.status), `and how to copy by hand (${failed.status})`);
  await page.close();
}
{
  // No Clipboard API: the copy command.
  const page = await open(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }); document.execCommand = (c) => { window.__cmd = c; return true; }; });
  await page.click('.alt-copy >> nth=1');
  await page.waitForTimeout(250);
  const r = await read(page, 1);
  expect(r.state === 'copied' && await page.evaluate(() => window.__cmd) === 'copy', `without the Clipboard API it falls back to the copy command (${r.state})`);
  await page.close();
}

console.log(`CopyButton: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
