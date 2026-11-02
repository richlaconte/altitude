import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MAIN, load, validate, slots, random } from './stimuli.mjs';

const { briefs } = JSON.parse(readFileSync(new URL('../distinctiveness/briefs.json', import.meta.url), 'utf8'));
const ids = briefs.map((b) => b.id);
const tasks = [...new Set(briefs.map((b) => b.task))];
// A matched set without images: every main condition answers every brief, plus a preview for each task.
const full = [
  ...MAIN.flatMap((condition) => briefs.map((b) => ({ id: `${condition}--${b.id}`, condition, brief: b.id, task: b.task }))),
  ...tasks.map((task) => ({ id: `altitude-preview--${task}`, condition: 'altitude-preview', brief: null, task })),
];

test('a matched set passes, and a missing designer brief is refused', () => {
  assert.deepEqual(validate(full, ids, tasks).problems, []);
  const { problems } = validate(full.filter((s) => s.id !== 'designer--records-b'), ids, tasks);
  assert.deepEqual(problems, ['designer is missing records-b']);
});

test('the committed benchmark run is refused until the designer pages are captured', () => {
  const dir = fileURLToPath(new URL('../distinctiveness/results/2026-10-31', import.meta.url));
  const { screens, problems } = validate(load([dir]), ids, tasks);
  assert.equal(screens.filter((s) => s.condition !== 'designer').length, 28);
  assert.ok(screens.every((s) => !s.id.endsWith('--s2')), 'repeat samples stay out');
  assert.deepEqual(problems, ids.map((id) => `designer is missing ${id}`));
});

test('every slot sees every screen once in each phase, with 3 free-text trials a main condition', () => {
  const run = slots(full, { participants: 50, seed: 'x' });
  for (const slot of run) {
    assert.deepEqual([...slot.phaseA].sort(), full.map((s) => s.id).sort());
    assert.deepEqual([...slot.phaseB].sort(), full.map((s) => s.id).sort());
    assert.equal(new Set(slot.freeText).size, 12);
    for (const condition of MAIN) assert.equal(slot.freeText.filter((id) => id.startsWith(condition + '--')).length, 3);
    const [a, b] = slot.catch;
    assert.notEqual(a.answer, b.answer);
    assert.ok(a.before >= 2 && b.before <= full.length - 2 && b.before - a.before > 1);
  }
});

test('orders are reproducible from the seed and differ between seeds', () => {
  assert.deepEqual(slots(full, { participants: 3, seed: '2026-11-01' }), slots(full, { participants: 3, seed: '2026-11-01' }));
  assert.notDeepEqual(slots(full, { participants: 3, seed: 'a' })[0].phaseA, slots(full, { participants: 3, seed: 'b' })[0].phaseA);
  const next = random('s');
  for (let i = 0; i < 1000; i++) { const v = next(); assert.ok(v >= 0 && v < 1); }
});
