// Avatar: what a person is, drawn in the system's own pieces. Run after a render of every preview (it opens
// test/p-Avatar-daylight.html), like the other checks; exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
await page.goto(`file://${T}p-Avatar-daylight.html`);
await page.waitForTimeout(500);
// Renders `els` (a function of A and h, run in the page) into a fresh container inside the provider.
const mount = (src, dir) => page.evaluate(([src, dir]) => new Promise((done) => {
  const d = document.createElement('div'); d.className = 'mount'; if (dir) d.dir = dir; d.style.padding = '24px'; document.body.append(d);
  const A = window.Altitude, h = React.createElement;
  ReactDOM.createRoot(d).render(h(A.AltitudeProvider, null, h('div', { className: 'm' }, (0, eval)(src)(A, h))));
  setTimeout(done, 400);
}), [src, dir]);
const last = '.mount:last-of-type';

// Faces are neutral: no status hue stands for a person.
{ const bgs = await page.evaluate(() => [...document.querySelectorAll('.alt-avatar:not([data-status="offline"]):not([data-more]) .alt-avatar-face')].map((f) => getComputedStyle(f).backgroundColor));
  const raised = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--surface-raised').trim());
  expect(bgs.length >= 8 && bgs.every((b) => b === 'rgb(255, 255, 255)'), `faces are surface-raised (${raised}): ` + [...new Set(bgs)]); }

// Offline is a flush plate (ground), not an opening and not raised: its shadows are all inset, plus the lip.
{ const sh = await page.evaluate(() => getComputedStyle(document.querySelector('.alt-avatar[data-status="offline"] .alt-avatar-face')).boxShadow);
  const outer = sh.split(/,(?![^(]*\))/).filter((l) => !l.includes('inset'));
  expect(outer.length === 1 && /0px 1px 0px 0px/.test(outer[0]), 'offline face has no cast shadow, only the lip: ' + sh); }

// At rest there's no ground shadow; live faces and a hovered pressable one have one and stand higher.
{ const op = (sel) => page.evaluate((s) => +getComputedStyle(document.querySelector(s + ' .alt-avatar-shadow')).opacity, sel);
  const top = (sel) => page.evaluate((s) => document.querySelector(s + ' .alt-avatar-face').getBoundingClientRect().top, sel);
  const rest = '.who:nth-child(2) .alt-avatar', live = '.who:nth-child(1) .alt-avatar', btn = '.alt-avatar[role="button"]';
  expect((await op(rest)) === 0, 'a resting face has no ground shadow');
  expect((await op(live)) > 0.3, 'a live face has a ground shadow: ' + (await op(live)));
  const r0 = await top(rest), b0 = await top(btn);
  await page.hover(rest); await page.waitForTimeout(700);
  expect(Math.abs((await top(rest)) - r0) < 0.1 && (await op(rest)) === 0, 'an avatar without onClick does not lift on hover');
  await page.hover(btn); await page.waitForTimeout(700);
  expect(b0 - (await top(btn)) > 6 && (await op(btn)) > 0.3, 'a pressable avatar lifts off its shadow on hover: ' + (b0 - (await top(btn))));
  await page.mouse.move(0, 0); }

// A pressable avatar is a button you can reach and press from the keyboard.
{ await mount(`(A, h) => h(A.Avatar, { name: 'Noa Levi', onClick: () => { window.__pressed = (window.__pressed || 0) + 1; } })`);
  await page.focus(`${last} .alt-avatar`); await page.keyboard.press('Enter'); await page.keyboard.press(' ');
  expect((await page.evaluate(() => window.__pressed)) === 2, 'Enter and Space press a pressable avatar'); }

// Initials: first and last words, punctuation and emoji skipped, one letter under 28px.
{ const cases = [['Mara Quist', 36, 'MQ'], ['Mara de Quist', 36, 'MQ'], ['ines', 36, 'I'], ['😀 Sam Okafor', 36, 'SO'], ['李小龙', 36, '李'], ['Jean-Luc Picard', 36, 'JP'], ['(Bot) Deploy', 36, 'BD'], ['Mara Quist', 24, 'M']];
  await mount(`(A, h) => h('div', null, ${JSON.stringify(cases)}.map(([n, s], i) => h(A.Avatar, { key: i, name: n, size: s })))`);
  const got = await page.$$eval(`${last} .alt-avatar-face`, (fs) => fs.map((f) => f.textContent));
  cases.forEach(([n, s, want], i) => expect(got[i] === want, `initials of "${n}" at ${s}px are ${want}: got ${got[i]}`)); }

// An image that fails to load falls back to the initials.
{ await mount(`(A, h) => h(A.Avatar, { name: 'Kai Ito', src: 'data:image/png;base64,AAAA' })`);
  await page.waitForTimeout(300);
  const f = await page.$eval(`${last} .alt-avatar-face`, (f) => [f.querySelector('img') ? 'img' : '', f.textContent]);
  expect(f[0] === '' && f[1] === 'KI', 'a broken image shows the initials: ' + f); }

// Square faces for teams and bots: corners from the radius scale, growing with size.
{ await mount(`(A, h) => h('div', null, [24, 36, 44, 64].map((s) => h(A.Avatar, { key: s, name: 'Northwind Studio', size: s, shape: 'square' })), h(A.Avatar, { name: 'Ada Obi', size: 44 }))`);
  const r = await page.$$eval(`${last} .alt-avatar-face`, (fs) => fs.map((f) => getComputedStyle(f).borderTopLeftRadius));
  expect(JSON.stringify(r.slice(0, 4)) === JSON.stringify(['4px', '7px', '10px', '14px']), 'square corners are radius-xs, sm, md, lg by size: ' + r);
  expect(r[4] === '9999px', 'people stay round: ' + r[4]); }

// Groups: a labelled group, a shared size, an overflow plate that names who it hides, and initials never covered.
{ await mount(`(A, h) => h(A.AvatarGroup, { max: 5, size: 32 }, ['Ada Obi', 'Ivy Chen', 'Theo Marsh', 'Rui Costa', 'Noa Levi', 'Eli Ward', 'Kai Ito'].map((n) => h(A.Avatar, { key: n, name: n, status: 'active' })))`);
  const g = await page.$eval(`${last} .alt-avatar-group`, (g) => [g.getAttribute('role'), g.getAttribute('aria-label')]);
  expect(g[0] === 'group' && g[1] === '7 people', 'the group is labelled: ' + g);
  const more = await page.$eval(`${last} .alt-avatar[data-more]`, (m) => m.getAttribute('aria-label'));
  expect(more === '2 more: Eli Ward, Kai Ito', 'the overflow names who it hides: ' + more);
  const sizes = await page.$$eval(`${last} .alt-avatar`, (as) => as.map((a) => a.getBoundingClientRect().width));
  expect(sizes.length === 6 && sizes.every((w) => w === 32), 'the group size applies to every face: ' + sizes);
  const clipped = await page.$$eval(`${last} .alt-avatar-face`, (fs) => fs.slice(0, -1).map((f, i) => {
    const range = document.createRange(); range.selectNodeContents(f); const text = range.getBoundingClientRect();
    return fs[i + 1].getBoundingClientRect().left - 2 - text.right; // the next face, less its 2px ring of ground
  }).filter((gap) => gap < 0));
  expect(clipped.length === 0, 'no face covers the initials of the one before it: ' + clipped); }

// Right to left: the lamp sits at the inline end, and later faces overlap towards the left.
{ await mount(`(A, h) => h('div', null, h(A.Avatar, { name: 'Ada Obi', size: 44, status: 'active' }), h(A.AvatarGroup, null, h(A.Avatar, { name: 'Ada Obi' }), h(A.Avatar, { name: 'Ivy Chen' })))`, 'rtl');
  const [lamp, face] = await page.$$eval(`${last} .m > div > .alt-avatar`, (a) => [a[0].querySelector('.alt-avatar-lamp').getBoundingClientRect(), a[0].querySelector('.alt-avatar-face').getBoundingClientRect()].map((r) => [r.left, r.right]));
  expect(lamp[0] < face[0] + 4, 'in RTL the lamp is on the left: ' + lamp + ' / ' + face);
  const xs = await page.$$eval(`${last} .alt-avatar-group .alt-avatar`, (as) => as.map((a) => a.getBoundingClientRect()));
  expect(xs[1].right < xs[0].right && xs[1].right > xs[0].left, 'in RTL the second face overlaps the first from the left'); }

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
