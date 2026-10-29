// FormattedNumber and formatNumber: each preset's text (currency in minor units, bytes, durations, percent, compact),
// a <data value> in tabular figures, the exact value as its title when abbreviated, units spoken in words, and a change
// that cross-fades and settles with a tint (no lift) and never passes through numbers in between; no cross-fade under
// reduced motion. Run after a render of every preview (it opens test/p-FormattedNumber-daylight.html); exits non-zero
// on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const open = async () => {
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  await page.goto(`file://${T}p-FormattedNumber-daylight.html`);
  await page.waitForTimeout(300);
  return page;
};

{
  const page = await open();
  const f = await page.evaluate(() => {
    const { formatNumber: f, describeNumber: d } = window.Altitude;
    return {
      eur: f(4900, { format: 'currency', currency: 'EUR', locale: 'en-IE' }), jpy: f(4900, { format: 'currency', currency: 'JPY', locale: 'en-US' }),
      whole: f(49, { format: 'currency', currency: 'USD', minorUnits: false, locale: 'en-US' }),
      gb: d(4_512_000_000, { format: 'bytes', locale: 'en-US' }), small: d(512, { format: 'bytes', locale: 'en-US' }), gib: d(4_512_000_000, { format: 'bytes', base: 1024, locale: 'en-US' }),
      ms: d(128, { format: 'duration', locale: 'en-US' }), min: f(95_000, { format: 'duration', locale: 'en-US' }), sec: f(2, { format: 'duration', unit: 'second', locale: 'en-US' }),
      pct: f(0.123, { format: 'percent', maximumFractionDigits: 1, locale: 'en-US' }),
      k: d(4213, { format: 'compact', locale: 'en-US' }), plain: f(1250, { locale: 'en-US' }), nan: f(NaN),
    };
  });
  expect(f.eur === '€49.00', `currency is in minor units: 4900 EUR is €49.00 (${f.eur})`);
  expect(f.jpy === '¥4,900', `a currency with no minor unit isn't divided (${f.jpy})`);
  expect(f.whole === '$49.00', `minorUnits={false} takes whole units (${f.whole})`);
  expect(f.gb.text === '4.5 GB' && f.gb.full === '4,512,000,000 bytes' && f.gb.spoken === '4.5 gigabytes', `bytes: ${JSON.stringify(f.gb)}`);
  expect(f.small.text === '512 B' && f.small.spoken === '512 bytes', `small byte counts stay in bytes (${JSON.stringify(f.small)})`);
  expect(f.small.full === undefined, 'an exact byte count needs no title');
  expect(f.gib.text === '4.2 GiB' && f.gib.spoken === '4.2 gibibytes', `base 1024: ${JSON.stringify(f.gib)}`);
  expect(f.ms.text === '128 ms' && f.ms.spoken === '128 milliseconds', `duration: ${JSON.stringify(f.ms)}`);
  expect(f.min === '1.6 min' && f.sec === '2 sec', `durations take the largest unit that keeps them at 1 or more (${f.min}, ${f.sec})`);
  expect(f.pct === '12.3%', `percent of a fraction (${f.pct})`);
  expect(f.k.text === '4.2K' && f.k.full === '4,213', `compact keeps the exact value (${JSON.stringify(f.k)})`);
  expect(f.plain === '1,250' && f.nan === '—', `plain numbers group; a non-number is a dash (${f.plain}, ${f.nan})`);

  const els = await page.evaluate(() => [...document.querySelectorAll('.alt-num')].map((el) => ({
    tag: el.tagName, value: el.getAttribute('value'), title: el.getAttribute('title'), text: el.querySelector('.alt-num-text').textContent,
    hidden: el.querySelector('.alt-num-text').getAttribute('aria-hidden'), spoken: el.querySelector('.alt-sr')?.textContent ?? null,
    nums: getComputedStyle(el).fontVariantNumeric, shadow: getComputedStyle(el).boxShadow,
  })));
  const [plan, storage, , , , requests] = els;
  expect(plan.tag === 'DATA' && plan.value === '4900' && plan.text === '€49.00', `a <data> with the raw value (${plan.tag} ${plan.value} ${plan.text})`);
  expect(els.every((e) => e.nums.includes('tabular-nums') && e.shadow === 'none'), 'tabular figures, flush (no shadow)');
  expect(storage.title === '4,512,000,000 bytes' && storage.hidden === 'true' && storage.spoken === '4.5 gigabytes', `bytes: exact title, symbol hidden, spoken in words (${JSON.stringify(storage)})`);
  expect(requests.title === '4,213' && requests.text === '4.2K', `compact: the exact value as its title (${requests.title})`);
  expect(plan.title === null && plan.spoken === null, 'an exact value needs no title or spoken text');

  // A change: sample every frame of the usage figure while it changes.
  const seen = await page.evaluate(() => new Promise((done) => {
    const el = document.querySelectorAll('.alt-card .alt-num')[0], texts = new Set(), glow = [];
    const start = performance.now(), before = el.textContent;
    const tick = () => {
      el.querySelectorAll('.alt-num-text').forEach((t) => texts.add(t.textContent));
      glow.push(el.getAttribute('data-settle'));
      const bg = getComputedStyle(el, '::before');
      if (el.getAttribute('data-settle')) glow.push('bg:' + bg.backgroundColor + '|' + bg.boxShadow);
      if (performance.now() - start < 3200) requestAnimationFrame(tick); else done({ texts: [...texts], glow, before, shadow: getComputedStyle(el).boxShadow });
    };
    requestAnimationFrame(tick);
  }));
  expect(seen.texts.length === 2 || seen.texts.length === 3, `a change shows only the old and new figures, never one in between (${seen.texts.join(', ')})`);
  expect(seen.glow.some((g) => g === 'a' || g === 'b'), 'a change takes the afterglow');
  expect(seen.glow.filter((g) => g?.startsWith('bg:')).every((g) => g.endsWith('|none')), 'the afterglow is a tint with no shadow');
  await page.close();
}
{
  const page = await open();
  await page.evaluate(() => document.querySelectorAll('.alt-root').forEach((r) => r.setAttribute('data-motion', 'reduced')));
  const outs = await page.evaluate(() => new Promise((done) => {
    const el = document.querySelectorAll('.alt-card .alt-num')[0], seen = [];
    const start = performance.now();
    const tick = () => { const o = el.querySelector('[data-out]'); if (o) seen.push(getComputedStyle(o).display); if (performance.now() - start < 2800) requestAnimationFrame(tick); else done(seen); };
    requestAnimationFrame(tick);
  }));
  expect(outs.length > 0 && outs.every((d) => d === 'none'), `reduced motion: no cross-fade (${[...new Set(outs)].join(',')})`);
  await page.close();
}

console.log(`FormattedNumber: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
