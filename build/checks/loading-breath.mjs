// Breath (#343): AltitudeProvider loading="breath" replaces the imprint's light sweep with a breath in depth (the floor
// in Daylight, the back wall in Nightfall), phased from one page clock and lagged by height so a swell crosses the view,
// calming after 10s; raised content (Await settle="raised") rises past its rest and settles; flush content fills past
// the ground; a card's parts and a RevealGroup land together; a later arrival gets a plate; charts still fade in place;
// reduced motion stops the breath; without loading="breath" nothing changes. Run after a render of every preview (it
// opens test/p-LoadingBreath-<scheme>.html and test/p-Await-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async (name, scheme = 'daylight', opts = {}) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 700 }, ...opts });
  page.on('pageerror', (e) => { fail++; console.log('FAIL page error:', e.message); });
  await page.goto(`file://${T}p-${name}-${scheme}.html`);
  return page;
};
const BREATH = 4800, WAVE = 1800;

// ── Waiting: the breath, one clock, no sweep ──
{
  const page = await open('LoadingBreath');
  await page.waitForTimeout(550);
  const s = await page.evaluate(([P, W]) => {
    const vh = innerHeight;
    const imprints = [...document.querySelectorAll('.alt-await-wait .alt-skeleton, .alt-await-wait.alt-skeleton')];
    const waits = [...document.querySelectorAll('.alt-await-wait')];
    // Each imprint's phase plus its lag should be the same instant on the page clock.
    const clock = waits.map((w) => {
      const sk = w.querySelector('.alt-skeleton');
      const a = sk?.getAnimations().find((x) => x.animationName === 'alt-breath');
      if (!a) return null;
      const lag = Math.min(1, Math.max(0, w.getBoundingClientRect().top / vh)) * W;
      return (((a.effect.getComputedTiming().progress ?? 0) * P + lag) % P + P) % P;
    }).filter((x) => x !== null);
    return {
      loading: document.querySelector('.alt-root .alt-root')?.getAttribute('data-loading'),
      n: imprints.length,
      names: [...new Set(imprints.map((e) => getComputedStyle(e).animationName))],
      sweep: [...new Set(imprints.map((e) => getComputedStyle(e, '::after').content))],
      clock, busy: waits.every((w) => w.getAttribute('aria-busy') === 'true'),
    };
  }, [BREATH, WAVE]);
  expect(s.loading === 'breath', `the nested provider says data-loading="breath" (${s.loading})`);
  expect(s.n >= 6 && s.names.length === 1 && s.names[0] === 'alt-breath', `every imprint breathes (alt-breath) in Daylight: ${s.n} imprints, ${s.names}`);
  expect(s.sweep.every((c) => c === 'none'), `no light sweeps over a breathing imprint (::after ${s.sweep})`);
  expect(s.busy, 'imprints still say aria-busy');
  // Circular spread: the phases (plus lag) agree to within 5% of a breath. A CSS animation starts on the frame after
  // its imprint commits, so imprints that mount in different commits differ by a few frames, which no one can see.
  const spread = s.clock.length ? Math.min(...s.clock.map((c0) => Math.max(...s.clock.map((c) => (c - c0 + BREATH) % BREATH)))) : Infinity;
  expect(s.clock.length >= 4 && spread < BREATH * 0.05, `one page clock: ${s.clock.length} imprints within ${Math.round(spread)}ms of one phase`);

  // G3: the summary lands first and rises past its rest, then settles.
  await page.waitForFunction(() => document.querySelector('.alt-await[data-rest="raised"][data-phase="reveal"]'), null, { timeout: 3000 });
  const r = await page.evaluate(() => {
    const a = document.querySelector('.alt-await[data-rest="raised"][data-phase="reveal"]');
    const face = a.querySelector(':scope > .alt-await-face');
    return { face: getComputedStyle(face).animationName, lift: getComputedStyle(face, '::before').animationName, liftShadow: getComputedStyle(face, '::before').boxShadow !== 'none' };
  });
  expect(r.face === 'alt-arrive' && r.lift === 'alt-plate' && r.liftShadow, `raised content rises past its rest and settles (face ${r.face}, lift ${r.lift})`);

  // G2: the Staging card's status arrives at 900ms but waits for its commit (1700ms): a card's parts land together.
  await page.waitForTimeout(Math.max(0, 1250 - 550 - 300));
  const mid = await page.evaluate(() => {
    const staging = [...document.querySelectorAll('.alt-card')].find((c) => c.textContent.includes('Staging'));
    const badge = staging?.querySelector('.alt-badge');
    return { shown: !!badge && getComputedStyle(badge).visibility === 'visible', held: !!staging?.querySelector('.alt-await[data-phase="held"], .alt-await-wait .alt-badge-imprint') };
  });
  expect(!mid.shown && mid.held, `a card's status that lands early stays an imprint until its commit lands (${JSON.stringify(mid)})`);
  await page.waitForFunction(() => {
    const staging = [...document.querySelectorAll('.alt-card')].find((c) => c.textContent.includes('Staging'));
    return staging && !staging.querySelector('.alt-await[data-phase="held"], .alt-await-wait') && staging.textContent.includes('bulk export');
  }, null, { timeout: 3000 });
  const landed = await page.evaluate(() => {
    const staging = [...document.querySelectorAll('.alt-card')].find((c) => c.textContent.includes('Staging'));
    return [...staging.querySelectorAll('.alt-await[data-phase="reveal"]')].map((a) => parseFloat(a.style.getPropertyValue('--alt-rise-delay')) || 0);
  });
  expect(landed.length >= 2, `then the status and the commit land together (${landed.length} rising at once)`);

  // The feed: rows of one list land together, filling past the ground.
  await page.waitForFunction(() => document.querySelectorAll('.feed .row').length === 3 && document.querySelector('.feed .alt-await[data-phase="reveal"]'), null, { timeout: 3000 });
  const f = await page.evaluate(() => {
    const revealing = [...document.querySelectorAll('.feed .alt-await[data-phase="reveal"]')];
    const a = revealing[0];
    return { n: revealing.length, face: getComputedStyle(a.querySelector(':scope > .alt-await-face')).animationName, floor: getComputedStyle(a.querySelector(':scope > .alt-await-imprint')).animationName,
      delays: revealing.map((x) => parseFloat(x.style.getPropertyValue('--alt-rise-delay')) || 0) };
  });
  expect(f.n === 3, `the three rows land together (${f.n} revealing at once)`);
  expect(f.face === 'alt-fill-ride' && f.floor === 'alt-fill-past', `flush rows fill past the ground (face ${f.face}, floor ${f.floor})`);
  expect(Math.max(...f.delays) - Math.min(...f.delays) <= 40, `a group takes one place in the budget, its parts 16ms apart (delays ${f.delays})`);

  // A later arrival: Load older events gets a plate, no tint.
  await page.getByRole('button', { name: 'Load older events' }).click();
  await page.waitForFunction(() => document.querySelector('.feed .alt-await[data-arrival="late"][data-phase="reveal"]'), null, { timeout: 3000 });
  const late = await page.evaluate(() => {
    const face = document.querySelector('.feed .alt-await[data-arrival="late"] > .alt-await-face');
    const b = getComputedStyle(face, '::before');
    return { plate: b.animationName, bg: b.backgroundColor, raised: getComputedStyle(document.querySelector('.alt-root')).getPropertyValue('--surface-raised').trim() };
  });
  expect(late.plate === 'alt-plate', `content that arrives into a view already showing gets a plate (${late.plate})`);

  // After 10s an imprint calms. Reload with the view again and wait it out on a boundary that never lands.
  await page.evaluate(() => {
    const A = window.Altitude, h = React.createElement;
    const d = document.createElement('div'); d.id = 'calm'; d.style.cssText = 'position:fixed;left:0;top:600px;width:300px';
    document.body.append(d);
    const Never = () => A.readPromised(new Promise(() => {}));
    ReactDOM.createRoot(d).render(h(A.AltitudeProvider, { loading: 'breath' }, h(A.Await, { imprint: h(A.Skeleton, { height: 40 }) }, h(Never))));
  });
  await page.waitForTimeout(10400);
  const calm = await page.evaluate(() => { const w = document.querySelector('#calm .alt-await-wait'); return { calm: w?.hasAttribute('data-calm'), name: getComputedStyle(w.querySelector('.alt-skeleton')).animationName }; });
  expect(calm.calm && calm.name === 'alt-breath-calm', `ten seconds in, the breath calms (${JSON.stringify(calm)})`);
  await page.close();
}

// ── Nightfall: the back wall breathes ──
{
  const page = await open('LoadingBreath', 'nightfall');
  await page.waitForTimeout(550);
  const names = await page.evaluate(() => [...new Set([...document.querySelectorAll('.alt-await-wait .alt-skeleton')].map((e) => getComputedStyle(e).animationName))]);
  expect(names.length === 1 && names[0] === 'alt-breath-wall', `in Nightfall the back wall breathes (${names})`);
  await page.close();
}

// ── Reduced motion: the breath stops, landings keep their fill and lose travel ──
{
  const page = await open('LoadingBreath', 'daylight', { reducedMotion: 'reduce' });
  await page.waitForTimeout(550);
  const names = await page.evaluate(() => [...new Set([...document.querySelectorAll('.alt-await-wait .alt-skeleton')].map((e) => getComputedStyle(e).animationName))]);
  expect(names.length === 1 && names[0] === 'none', `under reduced motion the breath stops (${names})`);
  await page.waitForFunction(() => document.querySelector('.alt-await[data-rest="raised"][data-phase="reveal"]'), null, { timeout: 3000 });
  const travel = await page.evaluate(() => getComputedStyle(document.querySelector('.alt-await[data-rest="raised"] > .alt-await-face')).getPropertyValue('--alt-travel').trim());
  expect(travel === '0', `and landings don't travel (--alt-travel ${travel})`);
  await page.close();
}

// ── Charts still fade in place under breath ──
{
  const page = await open('LoadingBreath');
  await page.evaluate(() => {
    const A = window.Altitude, h = React.createElement;
    const d = document.createElement('div'); d.id = 'chart'; d.style.cssText = 'width:480px;position:fixed;top:0;left:0;z-index:9999';
    document.body.prepend(d);
    const data = new Promise((r) => setTimeout(() => r([{ k: 'a', v: 3 }, { k: 'b', v: 5 }]), 800));
    ReactDOM.createRoot(d).render(h(A.AltitudeProvider, { loading: 'breath' }, h(A.ChartContainer, { title: 'Probe', config: { v: { label: 'V' } } }, h(A.BarChart, { data, x: 'k' }))));
  });
  await page.waitForTimeout(500);
  const still = await page.evaluate(() => [...new Set([...document.querySelectorAll('#chart .alt-chart-imprint .alt-skeleton')].map((e) => getComputedStyle(e).animationName))]);
  expect(still.length === 1 && still[0] === 'none', `a chart's imprint holds still under breath (${still})`);
  await page.waitForFunction(() => document.querySelector('#chart .alt-chart-await[data-phase="reveal"]'), null, { timeout: 3000 });
  const c = await page.evaluate(() => { const f = document.querySelector('#chart .alt-chart-await > .alt-await-face'); return { name: getComputedStyle(f).animationName, y: getComputedStyle(f).getPropertyValue('--alt-from-y').trim() }; });
  expect(c.name === 'alt-emerge' && c.y === '0px', `a chart's marks still fade in place, never rising (${c.name}, from-y ${c.y})`);
  await page.close();
}

// ── Without loading="breath", nothing changes ──
{
  const page = await open('Await');
  await page.waitForTimeout(550);
  const s = await page.evaluate(() => {
    const sk = document.querySelector('.alt-await-wait .alt-skeleton');
    return { own: getComputedStyle(sk).animationName, sweep: getComputedStyle(sk, '::after').animationName, attr: document.querySelector('.alt-root').getAttribute('data-loading') };
  });
  expect(s.own === 'none' && s.sweep === 'alt-sweep' && s.attr === null, `the default is unchanged: light sweeps the imprint (${JSON.stringify(s)})`);
  await page.close();
}

await browser.close();
console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
