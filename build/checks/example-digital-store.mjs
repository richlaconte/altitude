// The digital store foundation (examples/apps/digital-store, #636). First as units, on the store's own modules with a
// manual clock: routes parse and print every address, unknown and malformed ones are "not found", and each page names
// who may open it; the seed keeps products, immutable versions, licenses, evidence (tested digest = version digest) and
// principals apart, with rights on every preview and both product kinds; every protected read is refused to the wrong
// role (reads too, not only writes), another buyer's order is "not found", statements add up, a mode can fail one
// operation while the rest answer, switching accounts is announced, and Reset is deterministic and turns away a
// request from before it. No product module imports the drawer's controls or reads the service's mode.
// Then the built page in a browser: both schemes at 1280, 640 (200% zoom) and 320 px with one h1, no primary, no
// sideways scroll, no errors and a clean axe scan; links make real history (Back, Forward, reload keep the page and
// focus goes to the new heading); unknown ids and pages keep the frame; a page the account can't open says so and
// shows nothing of it; switching buyers never shows the last buyer's library, even for a frame, and aborts what was in
// flight; a failed protected refresh keeps nothing; signing out refuses the library; Reset puts Mara back; forced
// colours, reduced motion and more contrast render.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createManualClock, DemoError } from '../../examples/apps/shared/service.ts';
import { createStore, DAY } from '../../examples/apps/digital-store/store.ts';
import { CATALOG, canOpen, href, parseHash, ROUTE_ROLES } from '../../examples/apps/digital-store/routes.ts';
import { seed, T0 } from '../../examples/apps/digital-store/seed.ts';
import { buildExamples } from '../../scripts/build-examples.mjs';

const require = createRequire(import.meta.url);
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

// ---- Routes -------------------------------------------------------------------------------------------------------
{
  const samples = [
    CATALOG, { name: 'catalog', q: 'pine trees', kind: 'download' }, { name: 'product', id: 'p-pines' }, { name: 'product', id: 'p-pines', version: '1.2.0' },
    { name: 'library' }, { name: 'orders' }, { name: 'order', id: 'o-1001' }, { name: 'creator' }, { name: 'submission', id: 's-201' },
    { name: 'statement', period: '2026-10' }, { name: 'moderation' }, { name: 'moderation-item', id: 's-203' }, { name: 'support' }, { name: 'support-order', id: 'o-1003' },
  ];
  for (const r of samples) expect(JSON.stringify(parseHash(href(r))) === JSON.stringify(r), `routes: ${href(r)} reads back as itself (${JSON.stringify(parseHash(href(r)))})`);
  for (const bad of ['#/nowhere', '#/product', '#/product/p-pines/v', '#/product/p-pines/extra', '#/orders/o-1/x', '#/product/%E0%A4%A', '#/product/../etc', '#/creator/submissions']) {
    expect(parseHash(bad).name === 'not-found', `routes: ${bad} is not found`);
  }
  expect(parseHash('').name === 'catalog' && parseHash('#/?kind=other').kind === 'all' && parseHash('#/library/').name === 'library', 'routes: empty, odd query values and a trailing slash are handled');
  expect(Object.keys(ROUTE_ROLES).length === 13, 'routes: every page names who may open it');
  expect(canOpen({ name: 'library' }, 'buyer') && !canOpen({ name: 'library' }, 'guest') && !canOpen({ name: 'moderation' }, 'buyer') && canOpen({ name: 'submission', id: 's' }, 'moderator') && canOpen(CATALOG, 'guest'), 'routes: roles decide which pages open');
}

// ---- Seed ---------------------------------------------------------------------------------------------------------
{
  const s = seed();
  expect(s.products.length === 6 && new Set(s.publishers.map((p) => p.id)).size === 3, 'seed: six products from three studios');
  expect(s.products.some((p) => p.kind === 'engine-asset') && s.products.some((p) => p.kind === 'download'), 'seed: both an engine asset and an ordinary download');
  expect(s.products.every((p) => p.media.length && p.media.every((m) => m.rights.license === 'CC0-1.0' && m.src.startsWith('data:image/svg+xml') && m.alt)), 'seed: every preview has rights, alt text and no remote source');
  expect(s.evidence.every((e) => s.versions.find((v) => v.id === e.versionId)?.digest === e.digestTested), 'seed: evidence names the digest it tested, which matches its version');
  expect(s.evidence.some((e) => e.result === 'incompatible'), 'seed: some evidence is incompatible');
  expect(new Set(s.versions.map((v) => v.digest)).size === s.versions.length && s.versions.filter((v) => v.productId === 'p-pines').length === 2, 'seed: versions are distinct builds, and the pine pack has two');
  expect(new Set(s.principals.map((p) => p.role)).size === 4 && s.principals.filter((p) => p.role === 'buyer').length === 2 && s.principals.every((p) => p.email.endsWith('.example')), 'seed: two buyers, creators, a moderator and support, all at .example');
  expect(JSON.stringify(seed()) === JSON.stringify(seed()), 'seed: deterministic');
  const shared = seed(); shared.products[0].title = 'changed';
  expect(seed().products[0].title !== 'changed', 'seed: a fresh copy every time');
}

// ---- The store, on a manual clock -----------------------------------------------------------------------------------
{
  const clock = createManualClock(T0);
  const store = createStore({ clock });
  const { service } = store;
  const ask = async (op, input) => {
    const p = service.request(op, input).then((v) => ({ ok: true, v }), (e) => ({ ok: false, e }));
    clock.advance(2000);
    return p;
  };
  const kind = (r) => (r.ok ? 'ok' : r.e instanceof DemoError ? r.e.kind : r.e.name);
  const as = (id) => store.switchPrincipal(id);
  let announced = 0; store.auth.subscribe(() => announced++);

  const cat = await ask('catalog.list');
  expect(cat.ok && cat.v.length === 5 && !cat.v.some((p) => p.id === 'p-ferry'), 'store: the catalog leaves out the withdrawn product');
  const ferry = await ask('product.get', { id: 'p-ferry' });
  expect(ferry.ok && ferry.v.product.status === 'withdrawn' && /Withdrawn/.test(ferry.v.product.withdrawn.reason), 'store: a withdrawn product still answers, saying so');
  expect(kind(await ask('product.get', { id: 'p-nope' })) === 'not-found', 'store: an unknown product is not found');

  const mara = await ask('library.list');
  expect(mara.ok && mara.v.length === 3 && mara.v.every((g) => ['o-1001', 'o-1002', 'o-1005'].includes(g.orderId)), 'store: Mara’s library is hers');
  as('u-kofi');
  expect(announced === 1, 'store: switching accounts is announced on the auth channel');
  const kofi = await ask('library.list');
  expect(kofi.ok && kofi.v.length === 3 && !kofi.v.some((g) => g.orderId === 'o-1005') && kofi.v.some((g) => g.status === 'withdrawn'), 'store: Kofi’s library is his, and keeps the withdrawn loop');
  expect(kind(await ask('order.get', { id: 'o-1001' })) === 'not-found', 'store: another buyer’s order is not found, so ids can’t be probed');
  expect(kind(await ask('support.order', { id: 'o-1001' })) === 'unauthorized', 'store: a buyer can’t use support’s lookup');

  as(null);
  for (const op of ['library.list', 'orders.list', 'creator.listings', 'moderation.queue']) expect(kind(await ask(op)) === 'unauthorized', `store: a guest is refused ${op}`);
  expect((await ask('catalog.list')).ok, 'store: a guest still reads the catalog');

  as('u-ines');
  const listings = await ask('creator.listings');
  expect(listings.ok && listings.v.products.every((p) => p.publisher === 'Fernhollow Studio') && listings.v.submissions.map((x) => x.id).join() === 's-201', 'store: a creator sees only their studio');
  expect(kind(await ask('submission.get', { id: 's-202' })) === 'not-found', 'store: another studio’s submission is not found');
  const oct = await ask('statement.get', { period: '2026-10' });
  expect(oct.ok && oct.v.gross === 4900 && oct.v.fee === 588 && oct.v.net === 4312 && oct.v.lines.length === 1, `store: October’s statement adds up (${oct.ok && JSON.stringify([oct.v.gross, oct.v.fee, oct.v.net])})`);
  expect(kind(await ask('statement.get', { period: '2026-12' })) === 'not-found' && kind(await ask('statement.get', { period: '2026-13' })) === 'not-found', 'store: a future or impossible period is not found');
  expect(kind(await ask('library.list')) === 'unauthorized', 'store: a creator has no buyer library');
  as('u-wen');
  const wen = await ask('statement.get', { period: '2026-10' });
  expect(wen.ok && wen.v.gross === 1300 && wen.v.lines.length === 2, 'store: Wen’s statement has his two October sales');

  as('u-oluwaseun');
  const queue = await ask('moderation.queue');
  expect(queue.ok && queue.v.map((x) => x.id).join() === 's-203,s-201', 'store: the queue is what’s in review, oldest first');
  expect((await ask('submission.get', { id: 's-202' })).ok, 'store: a moderator can read any submission');
  as('u-pia');
  const so = await ask('support.order', { id: 'o-1003' });
  expect(so.ok && so.v.buyer?.name === 'Kofi Mensah-Baptiste', 'store: support reads any order with its buyer');

  // A session that ended refuses writes in the shared service; the store refuses protected reads by role on its own.
  service.endSession();
  expect((await ask('support.order', { id: 'o-1003' })).ok, 'store: endSession alone leaves reads open, which is why the store checks reads itself');
  service.signIn();

  // One operation failing while the rest answer.
  as('u-mara');
  service.setMode('fail', { ops: ['library.list'] });
  expect(kind(await ask('library.list')) === 'failed' && (await ask('orders.list')).ok, 'store: a mode can fail one operation while the others answer');
  service.setMode('success');

  // The clock, and a deterministic reset that turns away a request from before it.
  store.advanceClock(DAY);
  const now = await ask('session.get');
  expect(now.ok && now.v.now === T0 + DAY, 'store: a day passes on the server’s clock');
  as('u-kofi');
  const before = service.request('library.list').then(() => 'ok', (e) => e.message);
  service.reset();
  clock.advance(2000);
  expect(/reset before the server answered/.test(await before), 'store: a request from before Reset is turned away');
  const after = await ask('session.get');
  expect(after.ok && after.v.principal.id === 'u-mara' && after.v.now === T0 && JSON.stringify(service.getSnapshot().state) === JSON.stringify(seed()), 'store: Reset is the seed again: Mara, the clock at the start');
}

// ---- The boundary between the app and the drawer ---------------------------------------------------------------------
{
  const dir = fileURLToPath(new URL('../../examples/apps/digital-store/', import.meta.url));
  const product = readdirSync(dir).filter((f) => /\.tsx?$/.test(f) && !['controls.tsx', 'main.tsx'].includes(f));
  const offenders = product.filter((f) => {
    const src = readFileSync(dir + f, 'utf8').replace(/\/\/.*$/gm, '');
    return /from '\.\/controls'|getSnapshot\(\)\.(mode|ops|once)|\bcommitted\b|\.setMode\(/.test(src);
  });
  expect(product.length >= 8 && offenders.length === 0, `boundary: no product module imports the drawer or reads the service’s mode (${offenders.join(', ')})`);
}

// ---- In a browser ---------------------------------------------------------------------------------------------------
const out = fileURLToPath(new URL('../test/examples/', import.meta.url));
await buildExamples(out, { only: ['digital-store'] });
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const wait = (page, ms) => page.waitForTimeout(ms);
const fresh = async (opts = {}, hash = '') => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  await page.goto(`file://${out}digital-store.html${hash}`); await wait(page, 900);
  return { ctx, page, errors };
};
const go = async (page, hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await wait(page, 900); };
const drawer = async (page) => { const t = page.locator('.ex-drawer .alt-acc-trigger'); if ((await t.getAttribute('aria-expanded')) !== 'true') await t.click(); await wait(page, 200); };
const signIn = async (page, name, settle = 900) => { await drawer(page); await page.locator('.ex-drawer [aria-labelledby="ds-signed-in"]').click(); await wait(page, 150); await page.locator('[role="listbox"] [role="option"]', { hasText: name }).first().click(); await wait(page, settle); };
const mode = async (page, label, op) => {
  await drawer(page);
  await page.locator('.ex-drawer label.alt-radio').filter({ has: page.locator('.alt-check-label', { hasText: new RegExp(`^${label}$`) }) }).click(); await wait(page, 60);
  if (op) { await page.locator('.ex-drawer [aria-labelledby="ex-ops"]').click(); await wait(page, 150); await page.locator('[role="listbox"] [role="option"]', { hasText: new RegExp(`^${op.replace('.', '\\.')}$`) }).click(); await wait(page, 100); }
};
const h1 = (page) => page.locator('.ex-app h1').first().textContent().catch(() => '');
const look = (page) => page.evaluate(() => ({
  h1: document.querySelectorAll('.ex-app h1').length,
  primaries: [...document.querySelectorAll('.ex-app .alt-btn[data-variant="primary"]')].filter((b) => b.getClientRects().length).length,
  sideways: document.documentElement.scrollWidth > window.innerWidth,
}));
const axe = async (page) => {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const r = await page.evaluate(() => window.axe.run(document.querySelector('.ex-app'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  return r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`);
};
const logCount = (page, op, status) => page.evaluate(([op, status]) => [...document.querySelectorAll('.ex-log-row')].filter((r) => r.querySelector('.ex-log-op')?.textContent === op && (!status || r.dataset.status === status)).length, [op, status]);

try {
  // Renders.
  for (const [scheme, width] of [['light', 1280], ['dark', 1280], ['light', 640], ['dark', 320]]) {
    const { ctx, page, errors } = await fresh({ colorScheme: scheme, viewport: { width, height: 900 } });
    const pages = ['#/', '#/product/p-kiln', '#/product/p-pines/v/1.2.0', '#/library', '#/orders/o-1001'];
    const seen = [];
    for (const p of pages) { await go(page, p); seen.push({ p, ...(await look(page)) }); }
    expect(seen.every((s) => s.h1 === 1 && s.primaries === 0 && !s.sideways), `${scheme} ${width}: one h1, no primary (none is earned yet), no sideways scroll (${JSON.stringify(seen.filter((s) => s.h1 !== 1 || s.primaries || s.sideways))})`);
    if (width === 1280) {
      for (const p of ['#/', '#/product/p-pines/v/1.2.0', '#/library']) { await go(page, p); const v = await axe(page); expect(v.length === 0, `${scheme}: axe is clean on ${p} (${v.join(', ')})`); }
    }
    expect(!errors.length, `${scheme} ${width}: no page or console errors (${errors.slice(0, 2).join('; ')})`);
    await ctx.close();
  }

  const { ctx, page, errors } = await fresh();

  // The catalog and its addresses.
  expect(/Catalog/.test(await h1(page)) && await page.locator('.ds-tile').count() === 5, 'catalog: five listed products');
  await page.getByRole('link', { name: 'Downloads' }).click(); await wait(page, 300);
  expect(await page.locator('.ds-tile').count() === 2 && page.url().endsWith('#/?kind=download'), 'catalog: the kind filter is an address');
  await page.getByRole('searchbox', { name: 'Search the catalog' }).fill('saltmarsh'); await page.keyboard.press('Enter'); await wait(page, 300);
  expect(await page.locator('.ds-tile').count() === 1 && /q=saltmarsh/.test(page.url()), 'catalog: a search is an address too');
  await page.goBack(); await wait(page, 300);
  expect(await page.locator('.ds-tile').count() === 2 && await page.getByRole('searchbox').inputValue() === '', 'catalog: Back undoes the search');
  await go(page, '#/');

  // Real navigation: a link, Back, Forward, reload; focus goes to the new heading.
  await page.getByRole('link', { name: 'Kiln & Cinder props' }).click(); await wait(page, 900);
  expect(/#\/product\/p-kiln$/.test(page.url()) && await h1(page) === 'Kiln & Cinder props', 'navigation: a product link opens its page');
  expect(await page.evaluate(() => document.activeElement?.tagName) === 'H1', 'navigation: focus moves to the new heading');
  const kiln = await page.locator('.ds-dl').textContent();
  expect(/Imports into Injin/.test(kiln) && /Verified.*Injin 2\.3\.0/.test(kiln) && /Incompatible.*Injin 2\.4\.1/.test(kiln), 'product: verified and incompatible evidence are both said in words');
  await page.getByRole('link', { name: '0.9.2' }).click(); await wait(page, 600);
  expect(/Glaze materials use a shader model removed in 2\.4/.test(await page.locator('main').textContent()), 'product: a version’s page lists its limitations');
  await page.goBack(); await wait(page, 600); await page.goBack(); await wait(page, 900);
  expect(/Catalog/.test(await h1(page)), 'navigation: Back returns to the catalog');
  await page.goForward(); await wait(page, 900);
  expect(await h1(page) === 'Kiln & Cinder props', 'navigation: Forward returns to the product');
  await page.reload(); await wait(page, 1200);
  expect(await h1(page) === 'Kiln & Cinder props', 'navigation: reload keeps the page');
  await go(page, '#/product/p-saltmarsh');
  expect(!/Tested on/.test(await page.locator('main').textContent()) && /Download/.test(await page.locator('.ds-dl').textContent()), 'product: a download has no engine evidence');
  await go(page, '#/product/p-tidewater');
  expect(/Free/.test(await page.locator('.ds-licenses').textContent()), 'product: a free license says Free');

  // Unknown ids and pages keep the frame.
  await go(page, '#/product/p-missing');
  expect(await h1(page) === 'There’s no product here' && await page.locator('.ds-header nav').count() === 1, 'not found: an unknown product keeps the store’s frame');
  await go(page, '#/product/p-pines/v/9.9.9');
  expect(/There’s no version 9\.9\.9/.test(await h1(page)) && await page.getByRole('link', { name: 'Go to Fernhollow pine forest pack' }).count() === 1, 'not found: an unknown version links back to its product');
  await go(page, '#/somewhere/else');
  expect(await h1(page) === 'We can’t find that page', 'not found: an unknown page');
  await go(page, '#/orders/o-1003');
  expect(/There’s no order o-1003 in your account/.test(await h1(page)) && !/Saltmarsh/.test(await page.locator('main').textContent()), 'not found: another buyer’s order shows nothing of it');

  // A page this account can't open.
  await go(page, '#/moderation');
  expect(await h1(page) === 'You don’t have access to this page' && !/Kiln|Fernhollow/.test(await page.locator('main').textContent()), 'access: a buyer can’t open moderation, and sees nothing of the queue');

  // Switching buyers on the library: never a frame of Mara's, and the slow read in flight is aborted.
  await go(page, '#/library');
  expect(await page.locator('main tbody tr').count() === 3 && /Kiln & Cinder props/.test(await page.locator('main').textContent()), 'library: Mara’s three');
  await page.evaluate(() => {
    window.__leak = [];
    const seen = () => { const m = document.querySelector('.ex-app main'); if (m && /Kiln & Cinder props|Tidewater stone textures/.test(m.textContent) && /Kofi/.test(document.querySelector('.ds-account')?.textContent ?? '')) window.__leak.push(m.textContent.slice(0, 80)); };
    new MutationObserver(seen).observe(document.querySelector('.ex-app'), { subtree: true, childList: true, characterData: true });
  });
  await mode(page, 'Slow', 'library.list');
  await signIn(page, 'Kofi Mensah-Baptiste', 300);
  const midway = await page.locator('.ex-app main').textContent();
  expect(!/Kiln & Cinder props|Tidewater/.test(midway), 'switch: the moment the account changes, Mara’s library is gone');
  await signIn(page, 'Mara Lindqvist', 300);
  await signIn(page, 'Kofi Mensah-Baptiste', 300);
  await page.waitForFunction(() => document.querySelectorAll('.ex-app main tbody tr').length === 3, null, { timeout: 12000 });
  const kofi = await page.locator('main').textContent();
  expect(/Saltmarsh field recordings/.test(kofi) && /No longer available to download/.test(kofi) && !/Kiln & Cinder props/.test(kofi), 'switch: Kofi’s library, with the withdrawn loop marked');
  expect((await page.evaluate(() => window.__leak)).length === 0, `switch: no frame showed Mara’s items under Kofi (${await page.evaluate(() => window.__leak.join(' | '))})`);
  expect(await logCount(page, 'library.list', 'aborted') >= 1, 'switch: the library read in flight for the old account is aborted');
  await mode(page, 'Succeed');

  // A failed protected refresh keeps nothing.
  await mode(page, 'Fail', 'library.list');
  await drawer(page); await page.locator('.ex-drawer button', { hasText: 'A day passes' }).click(); await wait(page, 1200);
  const failed = await page.locator('main').textContent();
  expect(/We couldn’t load your library/.test(failed) && !/Saltmarsh field recordings/.test(failed) && await page.getByRole('button', { name: 'Try again' }).count() === 1, 'failure: a failed protected refresh drops the old answer and offers Try again');
  await mode(page, 'Succeed');
  await page.getByRole('button', { name: 'Try again' }).click(); await wait(page, 900);
  expect(await page.locator('main tbody tr').count() === 3, 'failure: Try again loads it');
  await go(page, '#/');
  await mode(page, 'Fail', 'catalog.list');
  await drawer(page); await page.locator('.ex-drawer button', { hasText: 'A day passes' }).click(); await wait(page, 1200);
  expect(await page.locator('.ds-tile').count() === 5 && /We couldn’t refresh the catalog/.test(await page.locator('main').textContent()), 'failure: the public catalog keeps its last answer, and says it may be out of date');
  await mode(page, 'Succeed');

  // Signing out on the library refuses it; Reset puts Mara back.
  await go(page, '#/library');
  await signIn(page, 'A guest');
  expect(await h1(page) === 'You don’t have access to this page' && /Sign in/.test(await page.locator('main').textContent()) && /Browsing as a guest/.test(await page.locator('.ds-account').textContent()), 'sign out: the library is refused, and says to sign in');
  await page.locator('.ex-drawer button', { hasText: 'Reset example data' }).click(); await wait(page, 1200);
  expect(/Mara Lindqvist/.test(await page.locator('.ds-account').textContent()) && await page.locator('main tbody tr').count() === 3, 'reset: Mara is signed in again, with her library');

  // Other roles' frames.
  await signIn(page, 'Inês Duarte');
  await go(page, '#/creator/submissions/s-201');
  expect(await page.locator('.ds-editor-side').count() === 1 && /In review/.test(await page.locator('.ds-editor-side').textContent()), 'creator: a submission opens in the editor frame');
  await go(page, '#/statements/2026-10');
  expect(/October 2026 statement/.test(await h1(page)) && /\$43\.12/.test(await page.locator('tfoot').textContent()), 'creator: the statement opens in the report frame and adds up');
  await signIn(page, 'Oluwaseun Hart');
  await go(page, '#/moderation/s-203');
  expect(await page.locator('.ds-triage-list a[aria-current="page"]').textContent() === 'Kiln & Cinder props 1.0.0' && /Rebuilds the glaze/.test(await page.locator('.ds-triage-detail').textContent()), 'moderator: the queue beside the item, in the triage frame');
  await signIn(page, 'Pia Okonkwo');
  await go(page, '#/support');
  await page.getByRole('button', { name: 'Find order' }).click(); await wait(page, 200);
  expect(/Enter an order number/.test(await page.locator('main').textContent()), 'support: an empty lookup says what to enter');
  await page.getByLabel('Order number').fill('o-1003'); await page.keyboard.press('Enter'); await wait(page, 900);
  expect(/Order o-1003/.test(await h1(page)) && /Kofi Mensah-Baptiste/.test(await page.locator('main').textContent()), 'support: a lookup opens the order with its buyer');
  expect(!errors.length, `no page or console errors (${errors.slice(0, 2).join('; ')})`);
  await ctx.close();

  // Forced colours, reduced motion and more contrast.
  {
    const { ctx, page, errors } = await fresh({ forcedColors: 'active', reducedMotion: 'reduce' }, '#/product/p-pines');
    await drawer(page); await page.locator('.ex-drawer label', { hasText: 'More contrast' }).click(); await wait(page, 300);
    expect(await page.locator('[data-contrast="more"]').count() > 0 && await h1(page) === 'Fernhollow pine forest pack', 'forced colours, reduced motion and more contrast render the product');
    expect(!errors.length, `forced colours: no page or console errors (${errors.slice(0, 2).join('; ')})`);
    await ctx.close();
  }
} finally { await browser.close(); }

console.log(`Digital store example: ${pass} passed, ${fail} failed.`);
assert.equal(fail, 0);
