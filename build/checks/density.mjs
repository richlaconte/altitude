// Size tokens and density (#245): controls take their heights from size-* tokens, which step up under a coarse pointer
// (a finger) unless an AltitudeProvider pins density="compact"; density="comfortable" steps them up everywhere; the
// hit-area minimum follows the pointer alone. Every width a layout switches at is one of the two breakpoints, 480 or
// 640. Run after a render of every preview (it opens test/p-Button-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
import { readFileSync } from 'fs';
import { fixturePath } from './fixture-path.mjs';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
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
  await page.goto(`file://${fixturePath('Button')}`);
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
  page.setDefaultTimeout(5000);
  await page.goto(`file://${fixturePath('Button')}`);
  await page.waitForTimeout(500);
  const s = await sizes(page);
  expect(JSON.stringify(s.auto) === JSON.stringify({ btn: 44, sm: 40, input: 48, tab: 46, target: '44px' }), `under a coarse pointer, controls step up and the hit area is 44px (${JSON.stringify(s.auto)})`);
  expect(s.compact.btn === 36 && s.compact.input === 40 && s.compact.target === '44px', `density="compact" pins the faces on touch, but the hit area still follows the finger (${JSON.stringify(s.compact)})`);
  await ctx.close();
}

// DataTable row spacing must not establish provider control-size tokens (#613). Exercise real public components,
// including the unset/default row density and an explicit nested provider inside a cell.
for (const scheme of ['daylight', 'nightfall']) for (const coarse of [false, true]) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, hasTouch: coarse });
  const page = await ctx.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`file://${fixturePath('Button', scheme)}`);
  await page.waitForFunction(() => !!window.Altitude);
  expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches) === coarse, `${scheme}: expected pointer mode`);
  for (const density of ['auto', 'compact', 'comfortable']) for (const rowDensity of ['default', 'comfortable', 'compact']) {
    const label = `${scheme}/${coarse ? 'coarse' : 'fine'}/${density}/${rowDensity}`;
    await page.evaluate(({ density, rowDensity, scheme, label }) => {
      const A = window.Altitude, h = React.createElement;
      if (!window.densityRoot) {
        const host = document.createElement('div'); host.id = 'density-table';
        host.style.cssText = 'position:relative;padding:24px;background:var(--surface-ground)';
        document.body.prepend(host); window.densityRoot = ReactDOM.createRoot(host);
      }
      const controls = name => h('div', { 'data-controls': name, style: { display: 'flex', gap: 16, alignItems: 'center' } },
        h(A.Button, { size: 'sm' }, 'Edit release'), h(A.Input, { 'aria-label': `${name} release`, placeholder: 'Release name' }));
      const nestedDensity = density === 'comfortable' ? 'compact' : 'comfortable';
      const table = h(A.DataTable, {
        'aria-label': 'Releases', rows: [{ id: 'gateway', name: 'API gateway' }],
        getRowId: row => row.id, getRowLabel: row => row.name,
        ...(rowDensity === 'default' ? { columnsMenu: true } : { density: rowDensity }),
        columns: [
          { key: 'name', header: 'Release' },
          { key: 'actions', header: 'Actions', cell: () => controls('inside') },
          { key: 'nested', header: 'Nested provider', cell: () => h(A.AltitudeProvider, { density: nestedDensity }, controls('nested')) },
        ],
      });
      const scene = h(A.AltitudeProvider, { key: label, density, scheme, 'data-case': label }, controls('outside'), table);
      window.densityRoot.render(document.documentElement.dataset.fixtureStrict === 'true' ? h(React.StrictMode, null, scene) : scene);
    }, { density, rowDensity, scheme, label });
    await page.waitForFunction(label => document.querySelector('#density-table [data-case]')?.dataset.case === label
      && document.querySelector('#density-table tbody td'), label);
    const read = () => page.evaluate(() => {
      const host = document.getElementById('density-table');
      const controlSizes = name => {
        const box = host.querySelector(`[data-controls="${name}"]`), button = box.querySelector('button'), input = box.querySelector('.alt-input');
        const style = getComputedStyle(button);
        return { button: button.getBoundingClientRect().height, input: input.getBoundingClientRect().height,
          controlToken: style.getPropertyValue('--size-control-sm').trim(), fieldToken: getComputedStyle(input).getPropertyValue('--size-field-md').trim(),
          target: style.getPropertyValue('--size-target-min').trim() };
      };
      return { outside: controlSizes('outside'), inside: controlSizes('inside'), nested: controlSizes('nested'),
        padding: getComputedStyle(host.querySelector('tbody td')).paddingTop,
        headerPadding: getComputedStyle(host.querySelector('thead th')).paddingTop };
    });
    const measured = await read();
    const large = density === 'comfortable' || (density === 'auto' && coarse);
    expect(measured.outside.button === (large ? 40 : 30) && measured.outside.input === (large ? 48 : 40), `${label}: provider sizes (${JSON.stringify(measured.outside)})`);
    expect(JSON.stringify(measured.inside) === JSON.stringify(measured.outside), `${label}: table inherits provider sizes (${JSON.stringify(measured)})`);
    const nestedLarge = density !== 'comfortable';
    expect(measured.nested.button === (nestedLarge ? 40 : 30) && measured.nested.input === (nestedLarge ? 48 : 40), `${label}: explicit nested provider controls its own sizes`);
    expect(measured.padding === (rowDensity === 'compact' ? '4px' : '10px') && measured.headerPadding === (rowDensity === 'compact' ? '6px' : '9px'), `${label}: row padding stays independent`);
    if (coarse) expect([measured.outside, measured.inside, measured.nested].every(s => s.target === '44px'), `${label}: coarse target-min token stays 44px`);
    if (rowDensity === 'default') {
      await page.locator('#density-table').getByRole('button', { name: 'Columns', exact: true }).click();
      await page.getByRole('radio', { name: 'Compact', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#density-table .alt-data-table > [aria-live]')?.textContent.trim() === 'Compact rows.');
      const changed = await read();
      expect(changed.padding === '4px' && changed.headerPadding === '6px', `${label}: density menu changes row padding and announces Compact rows`);
      expect(JSON.stringify(changed.inside) === JSON.stringify(measured.outside), `${label}: changing row density preserves provider sizes`);
      await page.keyboard.press('Escape');
    }
  }
  expect(errors.length === 0, `${scheme}/${coarse ? 'coarse' : 'fine'}: no page errors (${errors.join('; ')})`);
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
