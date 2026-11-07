// Run after build-site. Exercise the actual shipped homepage and its responsive lifecycle.
// Browser emulation and axe are engineering checks, not physical-device or screen-reader validation.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '../build/node_modules/playwright-core/index.mjs';

const site = new URL('../site-dist/index.html', import.meta.url).href;
const shots = fileURLToPath(new URL('../build/test/site/', import.meta.url));
mkdirSync(shots, { recursive: true });
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const failures = [];
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); passed++; };
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); passed++; };
const mobile = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const active = page => page.locator('.showcase [role="tabpanel"][data-state="active"]');
const tab = (page, name) => page.getByRole('tab', { name, exact: true });
const review = page => page.getByRole('button', { name: 'Review time', exact: true });
const slot = (page, value) => page.locator(`.showcase .alt-slot[data-value="${value}"]`);
async function screenshot(page, name) {
  if (name !== 'sheet' && !name.startsWith('failure-')) await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: `${shots}/${name}.png`, fullPage: name.startsWith('failure-'), animations: 'disabled' });
}

async function waitText(locator, text) {
  await locator.getByText(text, { exact: true }).waitFor({ state: 'visible' });
}
async function focused(locator, message) {
  await locator.page().waitForFunction(element => element === document.activeElement, await locator.elementHandle());
  check(await locator.evaluate(element => element === document.activeElement), message);
}
async function noOverflow(page, message) {
  const sizes = await page.evaluate(() => ({ viewport: innerWidth, root: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  check(Math.max(sizes.root, sizes.body) <= sizes.viewport + 1, `${message}: ${JSON.stringify(sizes)}`);
}
async function scene(page, name) {
  await tab(page, name).click();
  equal(await tab(page, name).getAttribute('aria-selected'), 'true', `${name} tab is selected`);
}
async function sheetOpen(page, time = '09:30') {
  await slot(page, time).tap();
  await review(page).tap();
  const sheet = page.getByRole('dialog', { name: 'Review your time', exact: true });
  await sheet.waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('.ms-sheet')?.contains(document.activeElement));
  return sheet;
}
async function sheetClosed(page) {
  await page.locator('.ms-sheet').waitFor({ state: 'detached' });
  await page.waitForFunction(() => !document.querySelector('[aria-modal="true"]'));
}
async function titleSaved(page, title) {
  const record = active(page).locator('.alt-inline-edit[data-state="read"]');
  await record.getByText(title, { exact: true }).waitFor();
  equal(await active(page).getByRole('textbox', { name: 'Note title', exact: true }).count(), 0, 'accepted title returns to read state');
}
async function titleEdit(page, title) {
  await active(page).getByRole('button', { name: 'Edit title', exact: true }).click();
  await active(page).getByRole('textbox', { name: 'Note title', exact: true }).fill(title);
}
async function touchTargets(page, scope = '.showcase') {
  const small = await page.locator(scope).evaluate(root => {
    const controls = [...root.querySelectorAll('button, input[type="radio"]')].filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.width && rect.height && !element.closest('[inert], [aria-hidden="true"]')
        && !element.disabled && element.getAttribute('aria-disabled') !== 'true';
    });
    return controls.flatMap(element => {
      // Radio and Switch labels are click targets, not just their small visual marks.
      const target = element.closest('label') || element;
      const rect = target.getBoundingClientRect();
      let width = rect.width, height = rect.height;
      for (const pseudo of ['::before', '::after']) {
        const css = getComputedStyle(target, pseudo);
        if (css.content !== 'none' && css.content !== 'normal' && css.pointerEvents !== 'none') {
          width = Math.max(width, parseFloat(css.width) || 0);
          height = Math.max(height, parseFloat(css.height) || 0);
        }
      }
      return width < 43.5 || height < 43.5
        ? [{ label: element.getAttribute('aria-label') || target.textContent.trim(), width, height }] : [];
    });
  });
  equal(small, [], 'coarse-pointer controls have at least 44×44 hit targets');
}
async function axe(page, scope = '.showcase') {
  await page.addScriptTag({ path: fileURLToPath(new URL('../node_modules/axe-core/axe.min.js', import.meta.url)) });
  const violations = await page.evaluate(async scope => {
    const results = await window.axe.run(document.querySelector(scope), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    });
    return results.violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target), description: v.description }));
  }, scope);
  equal(violations, [], `axe WCAG rules report no violations in ${scope}`);
}
async function run(name, options, test) {
  const context = await browser.newContext({ colorScheme: 'light', reducedMotion: 'reduce', ...options });
  // No external font/network dependency in deterministic checks. Native visual QA uses the actual fonts separately.
  await context.route(/^https?:\/\//, route => route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !/Failed to load resource|net::ERR_FAILED/.test(message.text())) errors.push(message.text());
  });
  try {
    await page.goto(site);
    await page.locator('.showcase').waitFor();
    await test(page);
    equal(errors, [], `${name}: no page or application-console errors`);
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, message: error.stack || String(error) });
    await screenshot(page, `failure-${name.replace(/[^a-z0-9-]/gi, '-')}`).catch(() => {});
    console.error(`FAIL ${name}: ${error.message}`);
  } finally { await context.close(); }
}

try {
  console.log(`Chromium ${browser.version()}`);
  await run('phone booking and local receipt', mobile, async page => {
    equal(await page.locator('.showcase').getAttribute('data-layout'), 'mobile', 'phone mounts mobile showcase');
    equal(await tab(page, 'Book').getAttribute('aria-selected'), 'true', 'phone leads with Book');
    equal(await page.locator('.alt-board').count(), 0, 'wide board is not mounted on phone');
    equal(await page.getByRole('heading', { name: 'Book a studio session', exact: true }).count(), 1, 'one booking heading');
    equal(await page.locator('.showcase .alt-slot').count(), 6, 'six sample time slots');
    equal(await page.locator('.showcase .alt-slot[aria-checked="true"]').count(), 0, 'no time is preselected');
    check(await review(page).isDisabled(), 'Review time waits for a time');
    equal(await slot(page, '10:00').getAttribute('aria-disabled'), 'true', 'booked slot is unavailable');
    const first = await slot(page, '09:00').boundingBox();
    check(first && first.y >= 0 && first.y + first.height <= 844, 'a useful first time choice fits the initial phone viewport');
    await touchTargets(page);
    await noOverflow(page, 'initial phone fits');
    await screenshot(page, 'phone');
    await axe(page);
    const booked = await slot(page, '10:00').boundingBox();
    await page.touchscreen.tap(booked.x + booked.width / 2, booked.y + booked.height / 2);
    equal(await page.locator('.showcase .alt-slot[aria-checked="true"]').count(), 0, 'tapping booked time does not select it');
    const sheet = await sheetOpen(page);
    check((await sheet.innerText()).includes('9:30'), 'sheet names the chosen time');
    await touchTargets(page, '.ms-sheet');
    await screenshot(page, 'sheet');
    await axe(page, '.ms-sheet');
    await sheet.getByRole('button', { name: 'Cancel', exact: true }).tap();
    await sheetClosed(page);
    await focused(review(page), 'Cancel returns to the surviving opener');
    equal(await page.getByRole('heading', { name: 'Confirmed in this demo', exact: true }).count(), 0, 'cancel creates no receipt');
    await review(page).tap();
    await page.getByRole('dialog', { name: 'Review your time', exact: true }).getByRole('button', { name: 'Confirm demo booking', exact: true }).tap();
    await sheetClosed(page);
    await active(page).getByRole('heading', { name: 'Confirmed in this demo', exact: true }).waitFor();
    check((await page.locator('.ms-receipt').innerText()).includes('9:30'), 'receipt reflects selected time');
    await waitText(active(page), 'No real appointment was booked.');
    await focused(review(page), 'confirmation returns to surviving Review time action');
    await slot(page, '11:00').tap();
    equal(await page.locator('.ms-receipt').count(), 0, 'choosing another time clears stale receipt');
    await review(page).tap();
    await page.getByRole('button', { name: 'Confirm demo booking', exact: true }).tap();
    await sheetClosed(page);
    check((await page.locator('.ms-receipt').innerText()).includes('11:00'), 'rebooking updates actual receipt');
    await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
    equal(await page.locator('.ms-receipt').count(), 0, 'reset clears booking result');
    equal(await page.locator('.showcase .alt-slot[aria-checked="true"]').count(), 0, 'reset clears selection');
  });

  await run('state survives tabs and scheme', mobile, async page => {
    await slot(page, '11:30').click();
    await scene(page, 'Tune');
    const radios = page.getByRole('radiogroup', { name: 'Delivery time', exact: true });
    await radios.locator('label').filter({ hasText: 'Evening' }).tap();
    check((await page.locator('.ms-brief').innerText()).includes('5:00 pm'), 'preference changes visible delivery time');
    const toggle = page.getByRole('switch', { name: 'Include tomorrow', exact: true });
    const wasChecked = await toggle.getAttribute('aria-checked') === 'true';
    await toggle.tap();
    equal(await page.locator('.ms-tomorrow').count(), wasChecked ? 0 : 1, 'switch changes the actual preview content');
    await touchTargets(page);
    await axe(page);
    await scene(page, 'Edit');
    await titleEdit(page, 'A thoughtful first day');
    await active(page).getByRole('button', { name: 'Save title', exact: true }).click();
    await titleSaved(page, 'A thoughtful first day');
    await scene(page, 'Book');
    equal(await slot(page, '11:30').getAttribute('aria-checked'), 'true', 'booking selection survives scene changes');
    await page.getByRole('button', { name: 'Switch to nightfall', exact: true }).click();
    equal(await page.locator('body').getAttribute('data-theme'), 'nightfall', 'theme changes');
    equal(await slot(page, '11:30').getAttribute('aria-checked'), 'true', 'theme retains booking selection');
    await screenshot(page, 'nightfall');
    await axe(page);
    await scene(page, 'Tune');
    check(await radios.getByRole('radio', { name: /Evening/ }).isChecked(), 'preference survives tabs/theme');
    equal(await toggle.getAttribute('aria-checked'), String(!wasChecked), 'switch survives tabs/theme');
    await scene(page, 'Edit');
    await titleSaved(page, 'A thoughtful first day');
    passed++;
  });

  await run('failed save recovery and cancellation', mobile, async page => {
    await scene(page, 'Edit');
    await page.getByRole('switch', { name: 'Fail next save', exact: true }).click();
    await titleEdit(page, 'A draft worth keeping');
    await active(page).getByRole('button', { name: 'Save title', exact: true }).click();
    await waitText(active(page), 'The demo refused this save. Your title is kept; try again.');
    equal(await active(page).getByRole('textbox', { name: 'Note title', exact: true }).inputValue(), 'A draft worth keeping', 'failed save keeps the draft');
    await noOverflow(page, 'failed edit fits');
    await touchTargets(page);
    await axe(page);
    await active(page).getByRole('button', { name: 'Save title', exact: true }).click();
    await titleSaved(page, 'A draft worth keeping');
    equal(await active(page).getByRole('textbox', { name: 'Note title', exact: true }).count(), 0, 'retry accepts the retained draft');
    await titleEdit(page, 'This old save must not land');
    await active(page).getByRole('button', { name: 'Save title', exact: true }).click();
    await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
    await scene(page, 'Edit');
    await active(page).getByText('A better first day', { exact: true }).waitFor();
    // Deliberately pass the demo's 1000ms persistence window to catch stale callbacks after reset.
    await page.waitForTimeout(1150);
    equal(await page.getByText('This old save must not land', { exact: true }).count(), 0, 'cancelled save cannot overwrite reset state');
    await focused(tab(page, 'Edit'), 'late save does not take focus from the current scene');
  });

  await run('keyboard choices and sheet focus', { viewport: { width: 390, height: 844 } }, async page => {
    const first = slot(page, '09:00');
    await first.focus();
    await page.keyboard.press('ArrowRight');
    await focused(slot(page, '09:30'), 'Right arrow moves focus');
    equal(await page.locator('.showcase .alt-slot[aria-checked="true"]').count(), 0, 'arrows do not select a time');
    await page.keyboard.press('ArrowRight');
    await focused(slot(page, '10:30'), 'arrow skips booked time');
    await page.keyboard.press('End');
    await focused(slot(page, '11:30'), 'End reaches last free time');
    await page.keyboard.press('Home');
    await focused(first, 'Home reaches first free time');
    await page.keyboard.press('Space');
    equal(await first.getAttribute('aria-checked'), 'true', 'Space chooses focused time');
    await page.keyboard.press('Tab');
    await focused(review(page), 'Tab exits picker to its review action');
    await page.keyboard.press('Enter');
    const sheet = page.getByRole('dialog', { name: 'Review your time', exact: true });
    await sheet.waitFor();
    await page.waitForFunction(() => document.querySelector('.ms-sheet')?.contains(document.activeElement));
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press('Tab');
      check(await sheet.evaluate(el => el.contains(document.activeElement)), 'Tab stays inside the review sheet');
    }
    await page.keyboard.press('Shift+Tab');
    check(await sheet.evaluate(el => el.contains(document.activeElement)), 'Shift+Tab stays inside the sheet');
    await page.keyboard.press('Escape');
    await sheetClosed(page);
    await focused(review(page), 'Escape returns focus to Review time');
    await tab(page, 'Book').focus();
    await page.keyboard.press('ArrowRight');
    await focused(tab(page, 'Tune'), 'keyboard changes mobile scenes');
    equal(await tab(page, 'Tune').getAttribute('aria-selected'), 'true', 'keyboard activates Tune');
  });

  await run('responsive widths and touch targets', mobile, async page => {
    for (const width of [320, 375, 390, 430, 640, 641, 768, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      const layout = width <= 640 ? 'mobile' : 'desktop';
      await page.waitForFunction(layout => document.querySelector('.showcase')?.dataset.layout === layout, layout);
      await noOverflow(page, `${width}px ${layout} fits`);
      equal(await page.locator('.alt-board').count(), layout === 'desktop' ? 1 : 0, `${width}px only mounts the correct family`);
      if (layout === 'mobile') {
        for (const name of ['Book', 'Tune', 'Edit']) {
          await scene(page, name);
          await noOverflow(page, `${width}px ${name} fits`);
          await touchTargets(page);
        }
        await scene(page, 'Book');
        if (width === 320) await screenshot(page, 'phone-320');
      }
    }
  });

  await run('breakpoint cleanup and focus ownership', mobile, async page => {
    await sheetOpen(page);
    const locked = await page.evaluate(() => [document.body, document.documentElement].some(el => ['hidden', 'clip'].includes(getComputedStyle(el).overflowY)));
    check(locked, 'modal owns a document scroll lock');
    await page.setViewportSize({ width: 900, height: 844 });
    await page.waitForFunction(() => document.querySelector('.showcase')?.dataset.layout === 'desktop');
    await sheetClosed(page);
    await focused(page.locator('.showcase'), 'resizing with sheet focus moves it to the replacement showcase');
    const unlocked = await page.evaluate(() => [document.body, document.documentElement].every(el => !['hidden', 'clip'].includes(getComputedStyle(el).overflowY)));
    check(unlocked, 'unmount releases modal scroll ownership');
    check(await page.locator('.showcase').evaluate(el => !el.closest('[inert], [aria-hidden="true"]')), 'replacement showcase is not inert');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.querySelector('.showcase')?.dataset.layout === 'mobile');
    await focused(page.locator('.showcase'), 'owned focus follows replacement in both directions');
    equal(await page.locator('.showcase .alt-slot[aria-checked="true"]').count(), 0, 'breakpoint remount resets choices');
    const outside = page.getByRole('link', { name: 'Get started', exact: true });
    await outside.focus();
    await page.setViewportSize({ width: 900, height: 844 });
    await page.waitForFunction(() => document.querySelector('.showcase')?.dataset.layout === 'desktop');
    await focused(outside, 'resize preserves focus outside the outgoing showcase');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.querySelector('.showcase')?.dataset.layout === 'mobile');
    await scene(page, 'Edit');
    await titleEdit(page, 'Discarded by layout change');
    await active(page).getByRole('button', { name: 'Save title', exact: true }).click();
    await page.setViewportSize({ width: 900, height: 844 });
    await page.waitForFunction(() => document.querySelector('.showcase')?.dataset.layout === 'desktop');
    await outside.focus();
    await page.waitForTimeout(1150);
    await focused(outside, 'outgoing pending save cannot steal focus after resize');
    await tab(page, 'Edit a note').click();
    await active(page).getByText('A better first day', { exact: true }).waitFor();
    equal(await page.getByText('Discarded by layout change', { exact: true }).count(), 0, 'outgoing save does not affect new family');
  });

  await run('forced colors and reduced motion', { ...mobile, forcedColors: 'active', reducedMotion: 'reduce' }, async page => {
    check(await page.evaluate(() => matchMedia('(forced-colors: active)').matches), 'forced-colors emulation active');
    check(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), 'reduced motion active');
    await slot(page, '09:30').click();
    equal(await slot(page, '09:30').getAttribute('aria-checked'), 'true', 'selected state survives without color/motion');
    const chosen = await slot(page, '09:30').evaluate(el => ({ border: getComputedStyle(el).borderTopWidth, text: el.textContent }));
    check(parseFloat(chosen.border) >= 2 && chosen.text.includes('9:30'), 'chosen slot keeps outlined, named state');
    await noOverflow(page, 'forced-colors phone fits');
    await screenshot(page, 'forced-colors');
    await review(page).click();
    await page.getByRole('dialog', { name: 'Review your time', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await sheetClosed(page);
    await focused(review(page), 'visible Close dismisses reduced-motion sheet');
  });

  await run('desktop regression and navigation', { viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' }, async page => {
    equal(await page.locator('.showcase').getAttribute('data-layout'), 'desktop', 'wide default stays desktop');
    equal(await tab(page, 'Plan a project').getAttribute('aria-selected'), 'true', 'desktop still leads with planning');
    equal(await tab(page, 'Book').count(), 0, 'mobile family not mounted wide');
    await noOverflow(page, 'desktop fits');
    await screenshot(page, 'desktop');
    await page.getByRole('button', { name: 'Move to done: Choose the example apps', exact: true }).click();
    const done = page.locator('.wb-column').filter({ hasText: 'Done' });
    await done.getByText('Choose the example apps', { exact: true }).waitFor();
    await page.getByText('“Choose the example apps” moved to done.', { exact: true }).waitFor();
    passed++;
    await scene(page, 'Edit a note');
    await titleEdit(page, 'A desktop note');
    await active(page).getByRole('button', { name: 'Save title', exact: true }).click();
    await titleSaved(page, 'A desktop note');
    passed++;
    await scene(page, 'Review a change');
    await page.getByRole('button', { name: 'Use this wording', exact: true }).click();
    await page.locator('.wb-review-result').getByText('Here’s how to get started.', { exact: true }).waitFor();
    passed++;
    await page.getByRole('button', { name: 'Try the review again', exact: true }).click();
    await page.getByRole('button', { name: 'Keep the original', exact: true }).click();
    await page.locator('.wb-review-result').getByText('Welcome to our comprehensive guide to getting started.', { exact: true }).waitFor();
    passed++;
    equal(await page.locator('#examples .example-preview').count(), 3, 'three featured example apps remain');
    equal(await page.locator('#examples a[href="examples/booking.html"]').count(), 2, 'booking example links remain');
    check((await page.locator('#start').innerText()).includes('npm install altitude-design'), 'installation instructions remain');
    check(await page.getByRole('link', { name: /Agent demo/ }).count() === 1, 'agent demo remains linked');
  });
} finally { await browser.close(); }

console.log(`${passed} assertions passed; ${failures.length} scenario(s) failed. Screenshots: build/test/site/`);
if (failures.length) {
  for (const failure of failures) console.error(`\n${failure.name}\n${failure.message}`);
  process.exitCode = 1;
}
