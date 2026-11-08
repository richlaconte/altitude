// FacetFilter (#631): a fieldset of Checkboxes with counts from a search service. The legend names the group; each
// count is part of its option's name, unknown is never read as zero, approximate reads "about"; a selected value the
// response omitted stays checked and removable; a zero-count option stays operable and an unavailable one explains
// itself; "Show more" expands in place with aria-expanded and keeps focus; option search filters by label and says
// when nothing matches; Clear removes everything and keeps focus in the group; focus survives a count refresh, during
// which the group is aria-busy and says "Updating counts…". Nothing overflows at 320px. Opens the FacetFilter preview.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';
import { fixturePath } from './fixture-path.mjs';
const require = createRequire(import.meta.url);

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const errors = [];
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); passed++; };

try {
  for (const scheme of ['daylight', 'nightfall']) {
    const page = await browser.newPage({ viewport: { width: 960, height: 900 } });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
    await page.goto(`file://${fixturePath('FacetFilter', scheme)}`);
    page.setDefaultTimeout(5000);

    await page.waitForTimeout(400); // let the counts' arrival cross-fade finish before measuring contrast
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const axe = await page.evaluate(() => window.axe.run(document.querySelector('.ff'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    check(axe.violations.length === 0, `${scheme}: axe is clean (${axe.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`).join(', ')})`);

    const types = page.getByRole('group', { name: /^Asset type/ });
    check(await types.count() === 1, `${scheme}: the legend names the group`);
    check(/2 selected/.test(await types.locator('legend').textContent()), `${scheme}: the legend says how many are selected`);
    check(await types.getByRole('checkbox', { name: /^Textures ?, 112 results$/ }).count() === 1, `${scheme}: a count is part of its option's name`);
    check(await types.getByRole('checkbox', { name: /^Document templates ?, count unavailable$/ }).count() === 1, `${scheme}: an unknown count says so, never zero`);
    const formats = page.getByRole('group', { name: /^File format/ });
    check(await formats.getByRole('checkbox', { name: /^GLB ?, about 24 results$/ }).count() === 1, `${scheme}: an approximate count reads "about"`);
    const desc = await types.getAttribute('aria-describedby');
    check(desc && /Counts for your applied filters/.test(await page.locator(`[id="${desc}"]`).textContent()), `${scheme}: the group is described by the query its counts describe`);

    // A retained selection: listed first, checked, removable.
    const hdri = types.getByRole('checkbox', { name: /^HDRI skies/ });
    check(await hdri.isChecked() && /Not in the latest results/.test(await types.locator('li').first().textContent()), `${scheme}: a value the response omitted stays checked, first, and says why`);
    await hdri.focus(); await page.keyboard.press(' ');
    check(await types.getByRole('checkbox', { name: /^HDRI skies/ }).count() === 0, `${scheme}: Space removes a retained value`);
    // Zero stays operable; unavailable explains itself and can't be chosen.
    const audio = types.getByRole('checkbox', { name: /^Audio ?, 0 results$/ });
    check(await audio.isEnabled(), `${scheme}: a zero-count option stays operable`);
    check(await types.getByRole('checkbox', { name: /^Fonts/ }).isDisabled() && /Not sold in your region/.test(await types.textContent()), `${scheme}: an unavailable option explains itself`);

    // Show more: in place, aria-expanded, focus kept.
    const more = formats.getByRole('button', { name: 'Show 12 more file formats' });
    check(await more.getAttribute('aria-expanded') === 'false' && await formats.getByRole('checkbox').count() === 6, `${scheme}: six formats before Show more`);
    await more.focus(); await page.keyboard.press('Enter');
    const fewer = formats.getByRole('button', { name: 'Show fewer file formats' });
    check(await fewer.getAttribute('aria-expanded') === 'true' && await formats.getByRole('checkbox').count() === 18, `${scheme}: Show more expands in place`);
    check(await page.evaluate(() => document.activeElement?.textContent?.startsWith('Show fewer')), `${scheme}: focus stays on the toggle`);
    await page.keyboard.press('Enter');
    // A selected option beyond the limit isn't hidden when collapsed.
    await formats.getByRole('button', { name: /^Show 12 more/ }).click();
    await formats.locator('label', { hasText: 'WOFF2' }).click();
    await formats.getByRole('button', { name: 'Show fewer file formats' }).click();
    check(await formats.getByRole('checkbox', { name: /^WOFF2/ }).isChecked(), `${scheme}: a selected option beyond the limit stays visible when collapsed`);

    // Search filters by label.
    const search = formats.getByRole('textbox', { name: 'Search file formats' });
    await search.fill('og');
    check(await formats.getByRole('checkbox').count() === 1, `${scheme}: search filters the options by label`);
    await search.fill('zzz');
    check(/No file formats match “zzz”/.test(await formats.textContent()), `${scheme}: search says when nothing matches`);
    await search.fill('');

    // Clear keeps focus in the group.
    await formats.getByRole('button', { name: 'Clear file format filters' }).click();
    await page.waitForTimeout(50);
    check(await formats.getByRole('checkbox', { checked: true }).count() === 0, `${scheme}: Clear removes every selection`);
    check(await page.evaluate(() => !!document.activeElement?.closest('fieldset') && document.activeElement.type === 'checkbox'), `${scheme}: focus moves to the first option after Clear`);

    // Focus survives a count refresh; the group is busy and says so.
    await audio.focus();
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await audio.focus();
    check(await types.getAttribute('aria-busy') === 'true' && /Updating counts…/.test(await types.textContent()), `${scheme}: refreshing is aria-busy and said in words`);
    await page.waitForTimeout(900);
    check(await types.getAttribute('aria-busy') === null && await page.evaluate(() => document.activeElement?.closest('label')?.textContent?.startsWith('Audio')), `${scheme}: focus stays on its option when counts arrive`);

    // Counts never move: no transform, no shadow.
    const count = await types.locator('.alt-facet-count').first().evaluate((c) => ({ t: getComputedStyle(c).transform, s: getComputedStyle(c).boxShadow }));
    check(count.t === 'none' && count.s === 'none', `${scheme}: counts lie flat on the ground`);

    // 320px: nothing overflows.
    await page.setViewportSize({ width: 320, height: 900 }); await page.waitForTimeout(100);
    check(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), `${scheme}: nothing overflows at 320px`);

    // Reduced motion: counts change without the cross-fade. Contrast more: the boxes keep a hard rim.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    check(await types.locator('.alt-facet-count').first().evaluate((c) => getComputedStyle(c).animationName) === 'none', `${scheme}: reduced motion removes the count cross-fade`);
    await page.emulateMedia({ reducedMotion: 'no-preference', contrast: 'more' });
    check(await types.locator('.alt-check-track').nth(1).evaluate((t) => parseFloat(getComputedStyle(t).borderTopWidth)) >= 1, `${scheme}: contrast more keeps the box's rim`);
    await page.emulateMedia({ contrast: 'no-preference' });

    // Forced colours: the boxes keep a border and counts are text.
    await page.emulateMedia({ forcedColors: 'active' });
    const fc = await types.locator('.alt-check-track').nth(1).evaluate((t) => getComputedStyle(t).borderTopStyle);
    check(fc !== 'none', `${scheme}: forced colours keep the box's border`);
    await page.close();
  }
  check(errors.length === 0, `no page or console errors: ${errors.join('\n')}`);
  console.log(`FacetFilter: ${passed} passed, 0 failed`);
} finally { await browser.close(); }
