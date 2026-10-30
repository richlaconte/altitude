// The data palette in the browser: every built-in scheme passes checkScheme's data gates, an accent re-leads the
// palette without breaking them, and the opt-in leaves today's checks alone. Run after a render of every preview (it
// opens test/p-AltitudeProvider-daylight.html), like the other checks; exits non-zero on a failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const T = new URL('../test/', import.meta.url).pathname;
let pass = 0, fail = 0;
const expect = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const page = await browser.newPage({ viewport: { width: 960, height: 700 } });
const warnings = [];
page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });
await page.goto(`file://${T}p-AltitudeProvider-daylight.html`);
await page.waitForTimeout(500);

// Mounts providers, one per [scheme, accent], and returns what each root reads.
let mounts = 0;
const read = (cases) => page.evaluate(([cases, m]) => new Promise((done) => {
  const d = document.createElement('div'); document.body.append(d);
  const A = window.Altitude, h = React.createElement;
  ReactDOM.createRoot(d).render(h('div', null, cases.map(([scheme, accent], i) => h(A.AltitudeProvider, { key: i, scheme, accent, id: `case-${m}-${i}` }, h('span', null, i)))));
  setTimeout(() => done(cases.map((_, i) => {
    const el = document.getElementById(`case-${m}-${i}`);
    const cs = getComputedStyle(el);
    return {
      data: A.checkScheme(el, { include: ['data'] }),
      both: A.checkScheme(el, { include: ['core', 'data'] }).length,
      core: A.checkScheme(el).length,
      slots: [1, 2, 3, 4, 5, 6].map((n) => cs.getPropertyValue('--data-' + n).trim()),
      seq1: cs.getPropertyValue('--data-seq-1').trim(),
    };
  })), 400);
}), [cases, mounts++]);

const schemes = ['daylight', 'nightfall'];
const plain = await read(schemes.map((s) => [s]));
plain.forEach((r, i) => {
  expect(r.data.length === 0, `${schemes[i]} passes the data gates: ${r.data.join(' / ')}`);
  expect(r.core === 0 && r.both === 0, `${schemes[i]}: the default include is the core checks, and core + data passes`);
});

// Brand accents across the wheel, including the docs' own and two that sit on status hues.
const accents = ['#0f8a6b', '#7c3aed', '#e11d48', '#0ea5e9', '#f59e0b', '#16a34a', '#db2777'];
const led = await read(schemes.flatMap((s) => accents.map((a) => [s, a])));
led.forEach((r, i) => {
  const s = schemes[Math.floor(i / accents.length)], a = accents[i % accents.length], base = plain[schemes.indexOf(s)];
  // A slot may sit near a custom accent: checkScheme reports it, and the provider leaves it (Theming.md, "Custom accent").
  const problems = r.data.filter((m) => !/^data-\d \S+ and accent /.test(m));
  expect(problems.length === 0, `${s} with accent ${a} keeps the data gates: ${problems.join(' / ')}`);
  expect(new Set(r.slots).size === 6, `${s} with accent ${a} keeps six distinct slots: ${r.slots}`);
  expect(r.slots.slice(1).every((c) => base.slots.includes(c)), `${s} with accent ${a}: slots 2–6 are the scheme's own, re-ordered`);
  expect(r.seq1 !== base.seq1 || r.slots[0] === base.slots[0], `${s} with accent ${a}: the magnitude ramp follows data-1`);
});
expect(led[0].slots[0] === plain[0].slots[3], `daylight's green slot leads for #0f8a6b, whose own hue is blocked by positive: ${led[0].slots[0]}`);
expect(!warnings.some((w) => w.includes('data palette')), 'no accent here costs a slot, so nothing warns: ' + warnings.join(' / '));

// The same accent twice gives the same palette.
const again = await read([['daylight', '#7c3aed']]);
expect(again[0].slots.join() === led[1].slots.join(), 'deterministic: ' + again[0].slots + ' vs ' + led[1].slots);

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
await browser.close();
