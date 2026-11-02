import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { select, blind } from './prepare.mjs';
import { probit, dprime, kappa, rate, analyse } from './analyse.mjs';
import { neutralise, NEUTRAL } from './anchor.mjs';

const briefs = ['dashboard-a', 'dashboard-b', 'records-a', 'records-b'];
const screens = [
  ...['claude-plain', 'claude-shadcn', 'claude-altitude', 'tabler-2018'].flatMap((condition) => briefs.map((brief) => ({ id: `${condition}--${brief}`, condition, brief, task: brief.split('-')[0] }))),
  { id: 'altitude-preview--records', condition: 'altitude-preview', brief: null, task: 'records' },
  { id: 'v0--dashboard-a', condition: 'v0', brief: 'dashboard-a', task: 'dashboard' },
];

test('select folds the anchor into `human`, drops other tools and refuses a gap', () => {
  const { screens: kept, problems } = select(screens);
  assert.deepEqual(problems, []);
  assert.equal(kept.filter((s) => s.condition === 'human').length, 4);
  assert.ok(kept.every((s) => s.condition !== 'v0' && s.condition !== 'tabler-2018'));
  assert.equal(kept.find((s) => s.condition === 'human').source, 'tabler-2018');
  assert.match(select(screens.filter((s) => s.id !== 'claude-altitude--records-b')).problems.join(), /claude-altitude is missing records-b/);
});

test('blind ids are unique, carry no condition, and every session sees every stimulus once', () => {
  const { screens: kept } = select(screens);
  const { keyed, orders } = blind(kept, { seed: 'x', sessions: 3 });
  assert.equal(new Set(keyed.map((s) => s.stimulus)).size, kept.length);
  assert.ok(keyed.every((s) => /^s\d{3}$/.test(s.stimulus)));
  for (const o of orders) assert.deepEqual([...o.order].sort(), keyed.map((s) => s.stimulus).sort());
  assert.notDeepEqual(orders[0].order, orders[1].order);
  assert.deepEqual(blind(kept, { seed: 'x', sessions: 3 }), { keyed, orders });
});

test('probit, d′ and κ', () => {
  assert.ok(Math.abs(probit(0.975) - 1.95996) < 1e-4);
  assert.ok(Math.abs(probit(0.5)) < 1e-9);
  assert.ok(dprime(8, 8, 0, 8).d > 2);
  assert.ok(Math.abs(dprime(4, 8, 4, 8).d) < 1e-9);
  assert.equal(kappa([[true, true], [false, false], [true, true], [false, false]]), 1);
  assert.ok(kappa([[true, false], [false, true], [true, false], [false, true]]) < 0);
});

test('rate bootstraps over units', () => {
  const r = rate([{ unit: 'a', answer: 'ai' }, { unit: 'b', answer: 'designer' }, { unit: 'c', answer: 'ai' }, { unit: 'd', answer: 'ai' }]);
  assert.equal(r.p, 0.75);
  assert.ok(r.lo <= r.p && r.p <= r.hi);
});

test('analyse joins answers and codes to the key', () => {
  const run = mkdtempSync(join(tmpdir(), 'mj-'));
  const { screens: kept } = select(screens);
  const { keyed } = blind(kept, { seed: 'y', sessions: 1 });
  writeFileSync(join(run, 'key.json'), JSON.stringify({ screens: keyed }));
  writeFileSync(join(run, 'judges.json'), JSON.stringify({ 1: 'test-model' }));
  mkdirSync(join(run, 'answers'));
  const answers = keyed.map((s, i) => ({ session: 1, position: i + 1, stimulus: s.stimulus, answer: s.condition === 'human' ? 'designer' : 'ai', confidence: 3, cues: ['x'] }));
  writeFileSync(join(run, 'answers', 'session-1.jsonl'), answers.map((a) => JSON.stringify(a)).join('\n'));
  const codes = answers.map((a) => ({ session: 1, stimulus: a.stimulus, cue: 'x', codes: [a.answer === 'ai' ? 'new:same-card' : 'vague'] }));
  writeFileSync(join(run, 'codes.jsonl'), [...codes, { newLabels: { 'new:same-card': 'Every section in one card.' } }].map((c) => JSON.stringify(c)).join('\n'));
  const s = analyse(run);
  assert.deepEqual(s.problems, []);
  assert.equal(s.origin.pooled.human.p, 0);
  assert.equal(s.origin.pooled['claude-altitude'].p, 1);
  assert.ok(s.discrimination[0].allBuilt.d > 2);
  assert.equal(s.newTells[0].proposed, true);
});

test('neutralise removes brand names and years from visible text, and nothing else', () => {
  const out = neutralise('<span class="brand-text">AdminLTE 3</span><td>AdminLTE v3</td><p>May 6, 2018 · 1 Jan, 2014</p><a>Source code</a><p>Revenue</p>');
  assert.ok(!/AdminLTE|2018|2014|Source code/.test(out));
  assert.ok(out.includes(NEUTRAL) && out.includes('2026') && out.includes('Revenue'));
  // asset paths, scripts and the other logo are untouched or removed whole, never rewritten into a broken path
  assert.equal(neutralise('<img src="../../dist/img/AdminLTELogo.png" alt="AdminLTE Logo"><span>x</span>'), '<span>x</span>');
  assert.equal(neutralise('<link href="dist/css/adminlte.min.css"><script>$.AdminLTE = 2019</script>'), '<link href="dist/css/adminlte.min.css"><script>$.AdminLTE = 2019</script>');
  assert.equal(neutralise('<input type="text" value="AdminLTE" class="form-control">'), '<input type="text" value="Fieldline" class="form-control">');
  assert.match(neutralise('<img src="./demo/brand/tabler.svg" class="header-brand-img" alt="tabler logo">'), new RegExp(`>${NEUTRAL}<`));
});
