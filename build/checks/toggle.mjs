// Toggle and ToggleGroup: on is a well with accent-soft and accent-ink (no lift, no wall), off is the slab it started
// as; aria-pressed changes but the name doesn't; a single-choice group is a radio group whose pill sits under the
// chosen option and whose arrows move and choose; a multiple group is a row of toggles with one tab stop that
// remembers where you were; forced colours. Run after a render of every preview (it opens
// test/p-Toggle-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (media) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-Toggle-daylight.html`);
  await page.waitForTimeout(400);
  return page;
};
const colour = (page, v) => page.evaluate((v) => { const p = document.createElement('i'); p.style.color = v; document.querySelector('.alt-root').append(p); const c = getComputedStyle(p).color; p.remove(); return c; }, v);
const bg = (page, v) => page.evaluate((v) => { const p = document.createElement('i'); p.style.backgroundColor = v; document.querySelector('.alt-root').append(p); const c = getComputedStyle(p).backgroundColor; p.remove(); return c; }, v);
const btn = (page, sel) => page.evaluate((sel) => {
  const b = document.querySelector(sel), cs = getComputedStyle(b);
  return { pressed: b.getAttribute('aria-pressed'), checked: b.getAttribute('aria-checked'), label: b.getAttribute('aria-label'), text: b.textContent,
    bg: cs.backgroundColor, color: cs.color, shadow: cs.boxShadow, well: cs.boxShadow.split(/,(?![^(]*\))/)[0].includes('inset'), transform: cs.transform, tab: b.tabIndex, border: `${cs.borderTopStyle} ${cs.borderTopColor}` };
}, sel);
const bold = '[aria-label="Bold"]', italic = '[aria-label="Italic"]', underline = '[aria-label="Underline"]', archived = '.alt-toggle[data-variant="secondary"]';

{
  const page = await open();
  const soft = await bg(page, 'var(--accent-soft)'), ink = await colour(page, 'var(--accent-ink)');
  const on = await btn(page, bold), off = await btn(page, italic);
  expect(on.pressed === 'true' && off.pressed === 'false', 'aria-pressed says the state');
  expect(on.bg === soft && on.color === ink, `on: accent-soft poured in, accent-ink label (${on.bg}, ${on.color})`);
  expect(on.well && on.transform === 'none', `on: a well, not lifted (${on.shadow})`);
  expect(!off.well, `off: the ghost slab it started as (${off.shadow})`);
  const sec = await btn(page, archived);
  expect(sec.pressed === 'false' && !sec.well && /0px 2px 0px 0px/.test(sec.shadow), `secondary off is a raised slab (${sec.shadow})`);
  await page.click(archived);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
  const secOn = await btn(page, archived);
  expect(secOn.pressed === 'true' && secOn.text === 'Show archived' && secOn.bg === soft && secOn.well, `clicking latches it, and its name stays (${secOn.text})`);
  await page.hover(archived);
  await page.waitForTimeout(300);
  const preview = await btn(page, archived);
  expect(preview.bg !== soft && preview.transform === 'none', `pointing at an on toggle previews off without lifting (${preview.bg})`);

  // One choice: a radio group whose pill sits under the chosen option.
  const radios = await page.evaluate(() => { const g = document.querySelector('[role="radiogroup"][aria-label="View"]'), pill = g.querySelector('.alt-tabs-indicator').getBoundingClientRect(), chosen = g.querySelector('[aria-checked="true"]').getBoundingClientRect(); return { n: g.querySelectorAll('[role="radio"]').length, chosen: g.querySelector('[aria-checked="true"]').textContent, dx: Math.abs(pill.left - chosen.left), dw: Math.abs(pill.width - chosen.width) }; });
  expect(radios.n === 3 && radios.chosen === 'Board' && radios.dx < 1 && radios.dw < 1, `single: a radio group, the pill under the chosen option (${JSON.stringify(radios)})`);

  // Keyboard: the multiple group is one tab stop, and arrows move without toggling.
  await page.mouse.move(0, 0);
  await page.focus(bold);
  expect((await btn(page, bold)).tab === 0 && (await btn(page, italic)).tab === -1, 'a group is one tab stop');
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(() => document.activeElement.getAttribute('aria-label')) === 'Italic' && (await btn(page, italic)).pressed === 'false', 'arrows move without toggling');
  await page.keyboard.press('Space');
  expect((await btn(page, italic)).pressed === 'true', 'Space toggles');
  await page.keyboard.press('End');
  expect(await page.evaluate(() => document.activeElement.getAttribute('aria-label')) === 'Underline', 'End jumps to the last');
  await page.keyboard.press('Tab');
  const landed = await page.evaluate(() => document.activeElement.closest('[role="radiogroup"]')?.getAttribute('aria-label') + ':' + document.activeElement.textContent);
  expect(landed === 'View:Board', `Tab leaves the group and lands on the chosen radio (${landed})`);
  await page.keyboard.press('ArrowRight');
  const chose = await page.evaluate(() => document.querySelector('[role="radiogroup"][aria-label="View"] [aria-checked="true"]').textContent);
  expect(chose === 'Calendar' && await page.evaluate(() => document.activeElement.textContent) === 'Calendar', `in a radio group, arrows move and choose (${chose})`);
  await page.waitForTimeout(400);
  const moved = await page.evaluate(() => { const g = document.querySelector('[role="radiogroup"][aria-label="View"]'); return Math.abs(g.querySelector('.alt-tabs-indicator').getBoundingClientRect().left - g.querySelector('[aria-checked="true"]').getBoundingClientRect().left); });
  expect(moved < 1, `the pill follows the choice (${moved})`);
  await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
  expect(await page.evaluate(() => document.activeElement.getAttribute('aria-label')) === 'Underline', 'returning to a group lands where you left it');
  await page.close();
}
{
  const page = await open({ forcedColors: 'active' });
  const on = await btn(page, bold);
  expect(on.border.startsWith('dashed'), `forced colours: on is dashed (${on.border})`);
  await page.close();
}

console.log(`Toggle: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
