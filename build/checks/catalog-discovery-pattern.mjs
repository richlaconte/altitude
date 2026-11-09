// Catalog discovery pattern: facets edit a draft that never touches the URL; Apply writes the applied query to the URL,
// and Back and Forward restore it; counts come from the applied query; during a refresh the previous results stay with
// "Updating results…" and a late response for an older query is dropped; a failed refresh keeps the previous results
// with Retry; zero results names the filters and offers to clear them; every result has exactly one link and its
// comparison checkbox sits outside it; returning from a product focuses its link at the same offset; compatibility is
// Verified, Incompatible or Not tested in words with evidence, never "Not tested" shown as compatible; the comparison is
// a semantic table with row headers that says "Not stated by publisher" and "Doesn't apply", scrolling inside its own
// frame at 320px. Run after a render of every preview (it opens test/p-CatalogDiscoveryPattern-daylight.html); exits
// non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (hash = '', width = 960) => {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`file://${T}p-CatalogDiscoveryPattern-daylight.html${hash}`);
  await page.waitForTimeout(700);
  page.errors = errors;
  return page;
};
const heading = (page) => page.locator('#cd-results-h').textContent();
const hash = (page) => page.evaluate(() => decodeURIComponent(location.hash));
const settle = (page, ms = 700) => page.waitForTimeout(ms);

{ // Draft, apply, URL, Back and Forward, counts.
  const page = await open();
  expect(await heading(page) === '8 products', `the catalog lists every product (${await heading(page)})`);
  const cards = await page.evaluate(() => [...document.querySelectorAll('.cd-list > li')].map((li) => ({
    links: li.querySelectorAll('a').length, nested: li.querySelector('a button, a input, a a') !== null,
    box: !!li.querySelector('input[type="checkbox"]') && !li.querySelector('a input[type="checkbox"]'), clickable: li.querySelector('[role="button"], .alt-card.alt-lift') !== null })));
  expect(cards.length === 4 && cards.every((c) => c.links === 1 && !c.nested && c.box && !c.clickable), `each result has one link, no nested targets and its comparison checkbox outside the link (${JSON.stringify(cards[0])})`);
  const textures = page.getByRole('checkbox', { name: /^Textures/ });
  const countOf = (name) => page.getByRole('checkbox', { name }).evaluate((b) => (b.closest('label')?.parentElement?.textContent || '').replace(/\D+/g, ' ').trim());
  expect(/\b3\b/.test(await countOf(/^Textures/)) && /\b4\b/.test(await countOf(/^Standard/)), 'counts come from the applied query (Textures 3, Standard 4)');
  await textures.check({ force: true });
  await settle(page, 200);
  expect(/\b4\b/.test(await countOf(/^Standard/)), 'a draft doesn’t change the counts');
  await settle(page, 200);
  expect(await hash(page) === '' && await page.getByText('You have changes that aren’t applied yet.').count() === 1, 'a draft never touches the URL, and says it isn’t applied');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await settle(page);
  expect(/type=texture/.test(await hash(page)) && await heading(page) === '3 products', `Apply writes the query to the URL and searches it (${await hash(page)}, ${await heading(page)})`);
  expect(/\b1\b/.test(await countOf(/^Standard/)), `other facets’ counts follow the applied query (Standard: ${await countOf(/^Standard/)})`);
  expect(await page.getByRole('button', { name: 'Remove Textures' }).count() === 1, 'the applied filter is a removable tag');
  await page.goBack();
  await settle(page);
  expect(await heading(page) === '8 products' && !(await textures.isChecked()), `Back restores the previous query, draft included (${await heading(page)})`);
  await page.goForward();
  await settle(page);
  expect(await heading(page) === '3 products' && await textures.isChecked(), 'Forward restores it again');

  // Latest response wins: a slow search for textures and audio, then Back to textures alone, fast. The slow one lands last.
  await page.getByRole('switch', { name: 'Slow responses' }).click();
  await page.getByRole('checkbox', { name: /^Audio/ }).check({ force: true });
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await settle(page, 150);
  const during = await page.evaluate(() => ({ status: document.querySelector('.cd-results ~ [role="status"], [role="status"].cd-vh')?.textContent, kept: document.querySelectorAll('.cd-list > li').length, counts: document.querySelector('.cd-side')?.textContent }));
  expect(during.status === 'Updating results…' && during.kept === 3 && /Updating counts/.test(during.counts || ''), `while it refreshes, the previous results stay and say so (${JSON.stringify({ ...during, counts: undefined })})`);
  await page.getByRole('switch', { name: 'Slow responses' }).click();
  await page.goBack();
  await settle(page, 2000);
  expect(await heading(page) === '3 products' && /type=texture$/.test(await hash(page)), `a late response for an older query is dropped (${await heading(page)}, ${await hash(page)})`);

  // A failed refresh keeps the previous results, with Retry.
  await page.getByRole('switch', { name: 'Fail the next search' }).click();
  await page.getByRole('button', { name: 'Remove Textures' }).click();
  await settle(page);
  const failed = await page.evaluate(() => ({ alert: document.querySelector('.cd-results .alt-alert')?.textContent || '', kept: document.querySelectorAll('.cd-list > li').length }));
  expect(/couldn’t update the results/.test(failed.alert) && /previous search/.test(failed.alert) && failed.kept === 3, `a failed refresh keeps the previous results and says so (${JSON.stringify(failed)})`);
  expect(!(await page.getByRole('switch', { name: 'Fail the next search' }).isChecked()), 'the simulated failure is used up');
  await page.getByRole('button', { name: 'Retry search' }).click();
  await settle(page);
  expect(await heading(page) === '8 products' && await page.locator('.cd-results .alt-alert').count() === 0, 'Retry repeats the current search and recovers');

  // Zero results names what's applied and offers to clear it; it proposes nothing in its place.
  await page.getByLabel('Search products').fill('zzz');
  await page.getByRole('checkbox', { name: /^Audio/ }).check({ force: true });
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await settle(page);
  const empty = await page.locator('.cd-results').textContent();
  expect(/No products match/.test(empty) && /“zzz”/.test(empty) && /Audio/.test(empty) && await page.locator('.cd-list').count() === 0, 'zero results names the search and filters, and shows no substitute products');
  await page.getByRole('button', { name: 'Clear search and filters' }).click();
  await settle(page);
  expect(await heading(page) === '8 products' && await hash(page) === '#/catalog', 'clearing returns to the whole catalog');
  expect(page.errors.length === 0, `no page errors (${page.errors.join('; ')})`);
  await page.close();
}

{ // Page resets on a new query; removing a tag keeps focus among the tags.
  const page = await open('#/catalog?page=2');
  expect(await page.locator('.cd-list > li').count() === 4, 'page 2 lists the rest');
  await page.getByRole('checkbox', { name: /^Textures/ }).check({ force: true });
  await page.getByRole('checkbox', { name: /^Standard/ }).check({ force: true });
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await settle(page);
  expect(!/page=/.test(await hash(page)) && await page.locator('.cd-list > li').count() === 1, `a new query starts at page 1 (${await hash(page)})`);
  await page.getByRole('button', { name: 'Remove Textures' }).focus();
  await page.keyboard.press('Enter');
  await settle(page);
  expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent) === 'Remove Standard', 'removing a tag focuses the next tag’s remove button');
  await page.keyboard.press('Enter');
  await settle(page);
  expect(await page.evaluate(() => document.activeElement?.id) === 'cd-results-h', 'removing the last one focuses the results heading');
  await page.close();
}

{ // Back to results from a deep link and a version link goes to the catalog, not the previous product.
  const page = await open('#/product/tidewater');
  await page.getByRole('link', { name: '1.2.0' }).click();
  await settle(page, 300);
  await page.getByRole('link', { name: 'Back to results' }).click();
  await settle(page);
  expect(/^#\/catalog/.test(await hash(page)), `Back to results lands on the catalog (${await hash(page)})`);
  await page.goBack();
  await settle(page, 300);
  await page.getByRole('link', { name: 'Back to results' }).click();
  await settle(page);
  expect(/^#\/catalog/.test(await hash(page)) && page.url().startsWith('file:'), `after a browser Back onto the product, it still lands on the catalog, not outside the app (${page.url()})`);
  await page.close();
}

{ // Return position: open a product from far down the list, come back, land on its link.
  const page = await open('', 960);
  await page.setViewportSize({ width: 960, height: 500 });
  const link = page.locator('[data-product="harbour-ambience"]');
  await link.scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => scrollY);
  await link.click();
  await settle(page);
  expect(await page.evaluate(() => document.activeElement?.id) === 'cd-product-h', 'the product page focuses its heading');
  await page.getByRole('link', { name: 'Back to results' }).click();
  await settle(page);
  const back = await page.evaluate(() => ({ focus: document.activeElement?.getAttribute('data-product'), y: scrollY }));
  expect(back.focus === 'harbour-ambience' && Math.abs(back.y - y) < 4, `Back focuses the product that was opened at the same offset (${JSON.stringify(back)}, was ${y})`);
  await page.close();
}

{ // Product detail: exact facts, compatibility in three values with evidence, the person's own copy kept apart.
  const text = async (id) => { const page = await open(`#/product/${id}`); const t = await page.locator('.cd-product').textContent(); await page.close(); return t; };
  const tide = await text('tidewater'), pine = await text('pine'), quarry = await text('quarry'), audio = await text('harbour-ambience'), gulls = await text('gulls');
  expect(/Verified/.test(tide) && /sha256:9f2c…41ad/.test(tide) && /tested 2026-10-04/.test(tide), 'Verified names the engine, the package digest and the date tested');
  expect(/Not tested/.test(pine) && !/Verified/.test(pine) && /may or may not work/.test(pine), 'an untested product says Not tested and never Verified');
  expect(/Incompatible/.test(quarry) && /can’t read/.test(quarry), 'Incompatible says why, with evidence');
  expect(/doesn’t apply/.test(audio) && !/Verified|Not tested/.test(audio), 'engine compatibility doesn’t apply to an ordinary download');
  expect(/You own 1\.2\.0/.test(tide) && /Version 1\.3\.0 is available/.test(tide) && !/You own/.test(pine), 'the person’s own copy is stated apart from public facts');
  expect(/Not stated by publisher/.test(gulls), 'a missing fact says Not stated by publisher');
}

{ // Comparison.
  const page = await open();
  for (const name of ['Tidewater stone textures', 'Pine forest kit', 'Harbour ambience']) await page.getByRole('checkbox', { name: `Compare ${name}` }).check({ force: true });
  await page.getByRole('link', { name: 'Compare 3 products' }).click();
  await settle(page);
  const t = await page.evaluate(() => ({ rows: document.querySelectorAll('tbody th[scope="row"]').length, cols: [...document.querySelectorAll('thead th[scope="col"] a')].map((a) => a.textContent), text: document.querySelector('table').textContent }));
  expect(t.rows === 7 && t.cols.length === 3, `attributes are row headers and products are linked column headers (${t.rows} rows, ${t.cols})`);
  expect(/Doesn’t apply/.test(t.text) && /Not tested/.test(t.text) && /\(differs\)/.test(t.text), 'non-applicable values and differences are said in words');
  await page.setViewportSize({ width: 320, height: 800 });
  await settle(page, 200);
  const narrow = await page.evaluate(() => { const r = document.querySelector('.cd-scroll .alt-table-wrap'); return { scrolls: r.scrollWidth > r.clientWidth, more: r.hasAttribute('data-more-end'), page: document.documentElement.scrollWidth }; });
  expect(narrow.scrolls && narrow.more && narrow.page <= 320, `at 320px the table scrolls inside its own frame, which shows there's more, not the page (${JSON.stringify(narrow)})`);
  await page.close();
}

console.log(`Catalog discovery pattern: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
