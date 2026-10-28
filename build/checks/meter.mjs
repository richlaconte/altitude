// Meter: role="meter" with its range and a value text in words, a flush track with flat fills (no shadow, wall or
// sheen), threshold notches, caution past `high` and critical past the limit (said in a Badge, and aria-valuenow kept
// in range), segments parted by 2px with their parts in the value text, an imprint while the reading loads, a fill that
// glides (and doesn't under reduced motion), and forced colours. Run after a render of every preview (it opens
// test/p-Meter-daylight.html); exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

const open = async (media) => {
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  if (media) await page.emulateMedia(media);
  await page.goto(`file://${T}p-Meter-daylight.html`);
  await page.waitForTimeout(400);
  return page;
};
const read = (page) => page.evaluate(() => [...document.querySelectorAll('.alt-meter')].map((el) => {
  const track = el.querySelector('.alt-meter-track');
  const fills = [...el.querySelectorAll('.alt-meter-fill')];
  const tw = track?.getBoundingClientRect().width ?? 0;
  return {
    name: document.getElementById(el.getAttribute('aria-labelledby'))?.textContent,
    role: el.getAttribute('role'), now: el.getAttribute('aria-valuenow'), min: el.getAttribute('aria-valuemin'), max: el.getAttribute('aria-valuemax'), text: el.getAttribute('aria-valuetext'),
    state: el.getAttribute('data-state'), badge: el.querySelector('.alt-meter-state')?.textContent ?? null, tone: el.querySelector('.alt-meter-state')?.getAttribute('data-tone') ?? null,
    trackShadow: track ? getComputedStyle(track).boxShadow : null,
    fills: fills.map((f) => { const cs = getComputedStyle(f); return { w: f.getBoundingClientRect().width / tw, shadow: cs.boxShadow, image: cs.backgroundImage, bg: cs.backgroundColor, borderLeft: cs.borderLeftWidth }; }),
    notches: [...el.querySelectorAll('.alt-meter-notch')].map((n) => (n.getBoundingClientRect().left + 0.5 - track.getBoundingClientRect().left) / tw),
    imprint: !!el.querySelector('.alt-meter-imprint'),
  };
}));

{
  const page = await open();
  const [storage, seats, api, cpu, byType, team] = await read(page);
  expect(storage.role === 'meter' && storage.name === 'Storage' && storage.min === '0' && storage.max === '100' && storage.now === '62', 'role="meter", named by its label, with its range');
  expect(storage.text === '62 GB of 100 GB' && storage.state === 'normal' && storage.badge === null, `normal: the value in words, no state (${storage.text})`);
  expect(storage.trackShadow === 'none' && storage.fills[0].shadow === 'none' && storage.fills[0].image === 'none', 'flush: no shadow on the track or the fill, no sheen');
  expect(Math.abs(storage.fills[0].w - 0.62) < 0.01, `the fill is the reading's share of the track (${storage.fills[0].w.toFixed(3)})`);
  expect(storage.notches.length === 1 && Math.abs(storage.notches[0] - 0.8) < 0.01, `a notch at the threshold (${storage.notches})`);
  expect(seats.state === 'high' && seats.badge === 'Near limit' && seats.tone === 'caution' && seats.text === '24 of 25, near limit', `past high: caution, said in words (${seats.text})`);
  expect(api.state === 'critical' && api.badge === 'Over limit' && api.tone === 'critical' && api.now === '10000' && api.text === '11,800 of 10,000, over limit', `over the limit: critical, aria-valuenow kept in range (${api.now}, ${api.text})`);
  expect(seats.fills[0].bg !== storage.fills[0].bg && api.fills[0].bg !== seats.fills[0].bg, 'each state has its own fill colour');
  expect(cpu.imprint && cpu.now === null, 'an undefined reading is an imprint');
  expect(byType.fills.length === 4 && byType.fills.slice(1).every((f) => f.borderLeft === '2px') && byType.fills[0].borderLeft === '0px', 'segments are parted by 2px');
  expect(byType.text === '62 GB of 100 GB, Media 38 GB, Documents 14 GB, Mail 6 GB, Other 4 GB', `segments are in the value text (${byType.text})`);
  expect(Math.abs(byType.fills.reduce((t, f) => t + f.w, 0) - 0.62) < 0.01, 'segments add up to the reading');
  expect(team.state === 'high' && team.badge === 'Near limit', 'a segmented meter still has thresholds');
  await page.waitForTimeout(2400);
  const [, , , landed] = await read(page);
  expect(!landed.imprint && landed.now === '37' && landed.text === '37% of 100%', `the reading lands (${landed.text})`);
  // Crossing a threshold: the fill glides, turns caution, and the state appears.
  await page.getByRole('button', { name: 'Use 15 GB' }).click();
  await page.getByRole('button', { name: 'Use 15 GB' }).click();
  await page.waitForTimeout(60);
  const [mid] = await read(page);
  expect(mid.fills[0].w > 0.62 && mid.fills[0].w < 0.91, `the fill glides (${mid.fills[0].w.toFixed(3)} on its way to 0.92)`);
  await page.waitForTimeout(400);
  const [after] = await read(page);
  expect(Math.abs(after.fills[0].w - 0.92) < 0.01 && after.state === 'high' && after.badge === 'Near limit', `then lands past the threshold, near limit (${after.fills[0].w.toFixed(3)})`);
  await page.close();
}
{
  const page = await open({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Use 15 GB' }).click();
  await page.waitForTimeout(40);
  const [m] = await read(page);
  expect(Math.abs(m.fills[0].w - 0.77) < 0.01, `reduced motion: the fill changes in place (${m.fills[0].w.toFixed(3)})`);
  await page.close();
}
{
  const page = await open();
  await page.evaluate(() => document.querySelectorAll('.alt-root').forEach((r) => r.setAttribute('data-contrast', 'more')));
  const [m] = await read(page);
  expect(m.trackShadow.includes('inset') && m.trackShadow.includes('1px'), `contrast="more": the track gets an ink edge (${m.trackShadow})`);
  await page.close();
}
{
  const page = await open({ forcedColors: 'active' });
  const r = await page.evaluate(() => {
    const t = document.querySelector('.alt-meter-track'), f = document.querySelector('.alt-meter-fill');
    const probe = document.createElement('span'); probe.style.color = 'Highlight'; document.body.append(probe);
    const hl = getComputedStyle(probe).color; probe.remove();
    return { border: getComputedStyle(t).borderTopWidth, fill: getComputedStyle(f).backgroundColor, hl };
  });
  expect(r.border === '1px' && r.fill === r.hl, `forced colours: an outlined track and a Highlight fill (${r.border}, ${r.fill} vs ${r.hl})`);
  await page.close();
}

await browser.close();
console.log(`meter: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
