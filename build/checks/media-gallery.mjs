// MediaGallery (#632): a named group with one figure, every thumbnail an ordinary button named "{label}, {kind}" in a
// list labelled "Choose a preview"; the current one has aria-current and an outline, never more height. Selecting by
// keyboard keeps focus and is said once in a polite status; Previous and Next wrap. Only the active item is mounted, so
// playing audio stops when another preview is chosen. A failed image drops to a trench with Retry, which remounts it;
// an unplayable video says so; a host-known error is shown; removing the active item selects the one now at its place
// and says so. View larger opens the same gallery in a Dialog, parks the inline stage, and returns focus on Escape.
// Nothing overflows at 320px. Opens the MediaGallery preview.
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
    const page = await browser.newPage({ viewport: { width: 960, height: 760 } });
    page.on('pageerror', (e) => errors.push(e.message));
    // The test gallery below requests files that don't exist, on purpose.
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/ERR_FILE_NOT_FOUND|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await page.goto(`file://${fixturePath('MediaGallery', scheme)}`);
    page.setDefaultTimeout(5000);
    await page.waitForTimeout(300);

    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const axe = await page.evaluate(() => window.axe.run(document.querySelector('.mg'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    check(axe.violations.length === 0, `${scheme}: axe is clean (${axe.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`).join(', ')})`);

    const gallery = page.getByRole('group', { name: 'Fernhollow pine forest pack previews', exact: true });
    check(await gallery.count() === 1, `${scheme}: the gallery is a named group`);
    check(/Preview 1 of 4/.test(await gallery.locator('figcaption').textContent()), `${scheme}: the caption says the position`);
    const thumbs = gallery.getByRole('list', { name: 'Choose a preview' }).getByRole('button');
    check(await thumbs.count() === 4, `${scheme}: every preview has a visible thumbnail button`);
    const names = await thumbs.evaluateAll((b) => b.map((x) => x.getAttribute('aria-label')));
    check(names.join('|') === 'Forest scene, image|Bark texture, image|Wind in the pines, audio|Tall pine, wireframe, model poster (not interactive)', `${scheme}: thumbnails are named with their kind (${names.join('|')})`);
    check(await thumbs.nth(0).getAttribute('aria-current') === 'true' && await gallery.locator('[aria-current]').count() === 1, `${scheme}: the current thumbnail has aria-current`);
    const cur = await thumbs.nth(0).evaluate((b) => ({ t: getComputedStyle(b).transform, o: getComputedStyle(b).borderTopColor }));
    check(cur.t === 'none', `${scheme}: the current thumbnail isn't raised (${cur.t})`);

    // Keyboard selection keeps focus and is said once.
    await thumbs.nth(1).focus(); await page.keyboard.press('Enter');
    check(/Bark texture/.test(await gallery.locator('figcaption').textContent()) && await thumbs.nth(1).getAttribute('aria-current') === 'true', `${scheme}: Enter selects`);
    check(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')) === 'Bark texture, image', `${scheme}: focus stays on the thumbnail`);
    check(await gallery.getByRole('status').textContent() === 'Showing 2 of 4: Bark texture', `${scheme}: the selection is said once`);
    await thumbs.nth(3).focus(); await page.keyboard.press(' ');
    await gallery.getByRole('button', { name: 'Next preview' }).click();
    check(/Preview 1 of 4/.test(await gallery.locator('figcaption').textContent()), `${scheme}: Next wraps from the last to the first`);
    await gallery.getByRole('button', { name: 'Previous preview' }).click();
    check(/Preview 4 of 4/.test(await gallery.locator('figcaption').textContent()), `${scheme}: Previous wraps from the first to the last`);
    check(await gallery.getByRole('img', { name: /Wireframe of the tall pine model/ }).count() === 1, `${scheme}: a custom item without a renderer shows its poster and alt`);

    // Audio: native controls, a transcript; choosing another preview unmounts it.
    await thumbs.nth(2).click();
    const audio = gallery.locator('audio');
    check(await audio.count() === 1 && await audio.evaluate((a) => a.controls && !a.autoplay && a.preload === 'metadata'), `${scheme}: audio has native controls and doesn't autoplay`);
    check(await gallery.locator('summary', { hasText: 'Transcript: Wind in the pines' }).count() === 1, `${scheme}: audio has a transcript`);
    await audio.evaluate((a) => { a.muted = true; return a.play().catch(() => {}); });
    await page.waitForTimeout(150);
    check(await audio.evaluate((a) => !a.paused), `${scheme}: the sample plays when asked`);
    await thumbs.nth(0).click();
    check(await gallery.locator('audio').count() === 0, `${scheme}: choosing another preview unmounts the playing audio`);

    // View larger: the same gallery in a Dialog; the inline stage parks; Escape returns focus.
    const larger = gallery.getByRole('button', { name: 'View larger' });
    await larger.click();
    const dialog = page.getByRole('dialog', { name: 'Fernhollow pine forest pack previews' });
    await dialog.waitFor();
    check(await dialog.getByRole('list', { name: 'Choose a preview' }).getByRole('button').count() === 4, `${scheme}: the larger view keeps the thumbnails`);
    check(await dialog.getByRole('button', { name: 'View larger' }).count() === 0, `${scheme}: no View larger inside the larger view`);
    check(/Shown in the larger view/.test(await gallery.locator('.alt-media-stage').textContent()), `${scheme}: the inline stage parks while the larger view is open`);
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    check(await page.evaluate(() => document.activeElement?.textContent) === 'View larger', `${scheme}: Escape returns focus to View larger`);

    // A test gallery for failure, retry, an unplayable video, a host error and removal of the active item.
    await page.evaluate(() => {
      const A = window.Altitude;
      const host = document.createElement('div'); host.id = 'mg-test'; document.body.appendChild(host);
      const base = [
        { id: 'broken', kind: 'image', label: 'Missing still', src: 'missing-still.png', alt: 'A still that does not exist' },
        { id: 'clip', kind: 'video', label: 'Missing clip', src: 'missing-clip.webm', transcript: 'No speech.' },
        { id: 'region', kind: 'image', label: 'Blocked still', src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', alt: 'Blocked' },
        { id: 'last', kind: 'image', label: 'Last still', src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', alt: 'Last' },
      ];
      window.__mg = { retries: 0 };
      function T() {
        const [items, setItems] = React.useState(base);
        const [v, setV] = React.useState('broken');
        window.__mg.remove = (id) => setItems((xs) => xs.filter((x) => x.id !== id));
        window.__mg.select = setV;
        window.__mg.value = v;
        return React.createElement(A.MediaGallery, { 'aria-label': 'Test previews', items, value: v, onValueChange: setV,
          error: { region: 'Preview unavailable in your region' }, onRetry: () => { window.__mg.retries++; } });
      }
      ReactDOM.createRoot(host).render(React.createElement(A.AltitudeProvider, null, React.createElement(T)));
    });
    const test = page.getByRole('group', { name: 'Test previews' });
    await test.locator('.alt-media-failed').waitFor();
    check(/We couldn't load this preview/.test(await test.locator('.alt-media-failed').textContent()), `${scheme}: a failed image says so`);
    check(await test.locator('.alt-media-failed').evaluate((f) => getComputedStyle(f).backgroundColor !== 'rgba(0, 0, 0, 0)'), `${scheme}: a failed preview drops into a trench`);
    await test.getByRole('button', { name: 'Retry preview' }).click();
    check(await page.evaluate(() => window.__mg.retries) === 1, `${scheme}: Retry calls onRetry`);
    await test.locator('.alt-media-failed').waitFor();
    check(await test.getByRole('list', { name: 'Choose a preview' }).getByRole('button').count() === 4, `${scheme}: the other thumbnails still work after a failure`);
    await page.evaluate(() => window.__mg.select('clip'));
    await test.locator('.alt-media-failed').waitFor();
    check(/(couldn't load this preview|can't play this video)\..*transcript is below/.test(await test.locator('.alt-media-failed').textContent()), `${scheme}: an unplayable video says so and points to the transcript`);
    await page.evaluate(() => window.__mg.select('region'));
    await page.waitForTimeout(50);
    check(/Preview unavailable in your region/.test(await test.locator('.alt-media-stage').textContent()), `${scheme}: a host-known error is shown`);
    await page.evaluate(() => window.__mg.remove('region'));
    await page.waitForTimeout(100);
    check(await page.evaluate(() => window.__mg.value) === 'last' && /That preview was removed. Showing 3 of 3: Last still/.test(await test.getByRole('status').textContent()), `${scheme}: removing the active item selects the one at its place and says so`);

    // Reduced motion: no cross-fade. Forced colours: the current thumbnail keeps a thick border.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    check(await gallery.locator('.alt-media-frame').first().evaluate((f) => getComputedStyle(f).animationName) === 'none', `${scheme}: reduced motion removes the cross-fade`);
    await page.emulateMedia({ reducedMotion: 'no-preference', forcedColors: 'active' });
    const fc = await thumbs.nth(0).evaluate((b) => `${getComputedStyle(b).borderTopWidth} ${getComputedStyle(b).borderTopStyle}`);
    check(fc === '3px solid', `${scheme}: forced colours give the current thumbnail a 3px border (${fc})`);
    await page.emulateMedia({ forcedColors: 'none' });

    // 320px: nothing overflows; thumbnails take their own row.
    await page.setViewportSize({ width: 320, height: 760 }); await page.waitForTimeout(100);
    check(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), `${scheme}: nothing overflows at 320px`);
    await page.close();
  }
  check(errors.length === 0, `no page or console errors: ${errors.join('\n')}`);
  console.log(`MediaGallery: ${passed} passed, 0 failed`);
} finally { await browser.close(); }
