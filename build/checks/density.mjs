// Size tokens and density (#245): controls take their heights from size-* tokens, which step up under a coarse pointer
// (a finger) unless an AltitudeProvider pins density="compact"; density="comfortable" steps them up everywhere; the
// hit-area minimum follows the pointer alone. Every width a layout switches at is one of the two breakpoints, 480 or
// 640. Run after a render of every preview (it opens test/p-Button-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
import { readFileSync } from 'fs';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
const root = new URL('../../', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

const sizes = (page) => page.evaluate(() => new Promise((done) => {
  const d = document.createElement('div'); d.id = 'dn'; d.style.cssText = 'position:absolute;top:0;left:0;width:360px;z-index:9;background:#fff'; document.body.prepend(d);
  const A = window.Altitude, h = React.createElement;
  const box = (density) => h(A.AltitudeProvider, { density, 'data-k': density ?? 'auto' },
    h(A.Button, null, 'Save'), h(A.Button, { size: 'sm' }, 'Edit'), h(A.Input, { placeholder: 'Search' }),
    h(A.Tabs, { defaultValue: 'a' }, h(A.TabsList, { 'aria-label': 'S' }, h(A.TabsTrigger, { value: 'a' }, 'A'), h(A.TabsTrigger, { value: 'b' }, 'B'))));
  ReactDOM.createRoot(d).render(h('div', null, box(undefined), box('compact'), box('comfortable')));
  setTimeout(() => {
    const read = (k) => { const r = d.querySelector(`[data-k="${k}"]`), px = (s) => Math.round(r.querySelector(s).getBoundingClientRect().height);
      return { btn: px('.alt-btn:not([data-size="sm"])'), sm: px('.alt-btn[data-size="sm"]'), input: px('.alt-input'), tab: px('.alt-tabs-trigger'), target: getComputedStyle(r).getPropertyValue('--size-target-min').trim() }; };
    done({ auto: read('auto'), compact: read('compact'), comfortable: read('comfortable') });
  }, 400);
}));

{
  const page = await browser.newPage({ viewport: { width: 960, height: 900 } });
  await page.goto(`file://${T}p-Button-daylight.html`);
  await page.waitForTimeout(500);
  const s = await sizes(page);
  expect(JSON.stringify(s.auto) === JSON.stringify({ btn: 36, sm: 30, input: 40, tab: 38, target: '24px' }), `with a mouse, today's sizes and a 24px hit area (${JSON.stringify(s.auto)})`);
  expect(s.compact.btn === 36 && s.compact.input === 40, `density="compact" keeps them (${JSON.stringify(s.compact)})`);
  expect(JSON.stringify(s.comfortable) === JSON.stringify({ btn: 44, sm: 40, input: 48, tab: 46, target: '44px' }), `density="comfortable" steps everything up, with a mouse too (${JSON.stringify(s.comfortable)})`);
  await page.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 900 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`file://${T}p-Button-daylight.html`);
  await page.waitForTimeout(500);
  const s = await sizes(page);
  expect(JSON.stringify(s.auto) === JSON.stringify({ btn: 44, sm: 40, input: 48, tab: 46, target: '44px' }), `under a coarse pointer, controls step up and the hit area is 44px (${JSON.stringify(s.auto)})`);
  expect(s.compact.btn === 36 && s.compact.input === 40 && s.compact.target === '44px', `density="compact" pins the faces on touch, but the hit area still follows the finger (${JSON.stringify(s.compact)})`);
  await ctx.close();
}

// Every width a layout switches at is a breakpoint: 480 (a component's narrow layout) or 640 (page chrome).
const css = readFileSync(root + 'project/components/bundle.css', 'utf8');
const widths = [...css.matchAll(/@(?:media|container)[^{]*\((?:max|min)-width:\s*([\d.]+)px\)/g)].map((m) => +m[1]);
const odd = widths.filter((w) => ![480, 640, 479.98, 639.98].includes(w));
expect(widths.length > 0 && odd.length === 0, `every width query in bundle.css is 480 or 640 (${odd.length ? 'found ' + odd.join(', ') : widths.join(', ')})`);
const shell = readFileSync(root + 'project/components/src/app-shell.tsx', 'utf8'), notes = readFileSync(root + 'project/components/src/notifications.tsx', 'utf8');
expect(/mobileBreakpoint = 640/.test(shell) && /mobileBreakpoint = 640/.test(notes), 'AppShell and NotificationCenter switch at the compact breakpoint by default');
const tokens = JSON.parse(readFileSync(root + 'project/tokens.json', 'utf8'));
expect(tokens.size?.tokens.some((t) => t.name === 'breakpoint-narrow' && t.value === '480px') && tokens.size.tokens.some((t) => t.name === 'breakpoint-compact' && t.value === '640px'), 'the breakpoints are tokens');

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
