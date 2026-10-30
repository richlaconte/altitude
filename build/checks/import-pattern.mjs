// Import pattern: steps are a Stepper; uploading moves to mapping; a column's Select is an opening until it's mapped and
// required fields still unmapped are listed in words; invalid cells lie in a trench on critical-soft (DataGrid
// showInvalid) and say their problem; the problem count is said and drops as cells are fixed; "Only rows with problems"
// narrows the grid; the review says what will be imported and skipped; the import is a cancellable Progress job that
// ends with a receipt. Also checks DataGrid's showInvalid itself. Run after a render of every preview (it opens
// test/p-ImportPattern-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 900 } });
await page.goto(`file://${T}p-ImportPattern-daylight.html`);
await page.waitForTimeout(400);
const current = () => page.evaluate(() => document.querySelector('[aria-label="Import steps"] [aria-current="step"]')?.textContent || 'done');
const status = () => page.evaluate(() => document.querySelector('.im-step [role="status"]')?.textContent);
const pick = async (col, opt) => { await page.getByRole('button', { name: col }).click(); await page.waitForTimeout(250); await page.getByRole('option', { name: opt }).locator('visible=true').click(); await page.waitForTimeout(300); };

expect(/Upload/.test(await current()), 'the import starts at the upload step');
await page.getByRole('button', { name: 'Use the sample file' }).click();
await page.waitForTimeout(1300);
expect(/Map columns/.test(await current()), 'an uploaded file moves to mapping');
const empty = await page.evaluate(() => [...document.querySelectorAll('.im-map .alt-input')].map((i) => i.hasAttribute('data-filled')));
expect(empty.every((f) => !f), 'every column starts as an opening, not mapped');
expect(await status() === 'Map these required fields: Name, Email.' && await page.getByRole('button', { name: 'Continue' }).isDisabled(), 'required fields still unmapped are listed in words');
await pick('Full name', 'Name (required)');
await pick('E-mail', 'Email (required)');
await pick('Company', 'Company');
const filled = await page.evaluate(() => [...document.querySelectorAll('.im-map .alt-input')].map((i) => i.hasAttribute('data-filled')));
expect(filled.join() === 'true,true,true,false' && await status() === 'Every required field is mapped.', `a mapped column fills; what's left shows (${filled})`);
await page.getByRole('button', { name: 'Continue' }).click();
await page.waitForTimeout(400);

const cells = () => page.evaluate(() => [...document.querySelectorAll('.alt-grid-cell[data-invalid]')].map((c) => ({ text: c.textContent, name: c.getAttribute('aria-describedby') && document.getElementById(c.getAttribute('aria-describedby').split(' ')[0])?.textContent,
  bg: getComputedStyle(c).backgroundColor, shadow: getComputedStyle(c).boxShadow, invalid: c.getAttribute('aria-invalid') })));
let bad = await cells();
expect(bad.length === 3 && bad.every((c) => c.invalid === 'true' && /inset/.test(c.shadow)), `invalid cells lie in a trench and are marked invalid (${bad.length})`);
expect(bad.some((c) => c.name === 'This isn’t an email address.') && bad.some((c) => c.name === 'Enter a name.'), 'each invalid cell says its problem');
expect(await status() === '3 problems left in 3 rows. Rows with problems are skipped.', `the problem count is said (${await status()})`);
await page.locator('.alt-grid-cell[data-invalid]').first().click();
await page.keyboard.press('Enter');
await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
await page.keyboard.type('grace@example.com');
await page.keyboard.press('Enter');
await page.waitForTimeout(500);
expect(await status() === '2 problems left in 2 rows. Rows with problems are skipped.' && (await cells()).length === 2, 'fixing a cell lifts it out and the count drops');
await page.getByRole('switch', { name: 'Only rows with problems' }).click();
await page.waitForTimeout(300);
expect(await page.locator('[aria-label="Rows to import"] tbody tr').count() === 2, '"Only rows with problems" narrows the grid');
await page.getByRole('button', { name: 'Continue' }).click();
await page.waitForTimeout(400);

expect(await page.evaluate(() => document.querySelector('.im-lead').textContent) === '5 contacts will be imported. 3 rows will be skipped: 1 duplicate and 2 with problems.', 'the review says what will be imported and skipped');
await page.getByRole('button', { name: 'Import 5 contacts' }).click();
await page.waitForTimeout(450);
expect(await page.locator('.im-step [role="progressbar"]').count() === 1 && /^Importing \d of 5$/.test(await status()), 'the import is a job with progress in words');
await page.getByRole('button', { name: 'Cancel import' }).click();
await page.waitForTimeout(500);
expect(await page.getByRole('heading', { name: 'Import cancelled' }).count() === 1, 'it can be cancelled, and says what was imported');
await page.getByRole('button', { name: 'Back to review' }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Import 5 contacts' }).click();
await page.waitForTimeout(2400);
const receipt = await page.evaluate(() => [...document.querySelectorAll('.im-receipt div')].map((d) => d.textContent));
expect(receipt.join('|') === 'Imported5 contacts|Skipped1 duplicate|Failed2 rows with problems' && await current() === 'done', `the import ends with a receipt (${receipt})`);

console.log(`Import pattern: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
