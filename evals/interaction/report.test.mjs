import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRecord, interpretRecord, renderRecord } from './report.mjs';

// Synthetic regression data only; these do not reconstruct the maintainer assessments.
const record = () => ({
  protocolVersion: '1.0.0', id: 'synthetic-case', evidenceType: 'synthetic-test',
  recordedAt: '2026-11-07T12:00:00.000Z', sessionId: 'synthetic-session', observedVariant: 'b', priorRecordRefs: ['synthetic-a.json'],
  source: { commit: 'a'.repeat(40), packageVersion: '0.31.0', artifactSha256: 'b'.repeat(64), dirty: false },
  environment: { browser: 'test', os: 'test', viewport: [1280, 900], zoom: 1, scheme: 'daylight', input: 'keyboard', motion: 'normal', assistiveTechnology: null },
  journey: 'field-edit', task: 'Rename the same record, recover and finish.',
  order: ['a', 'b'], variants: [{ id: 'a', description: 'Baseline', artifactSha256: 'b'.repeat(64) }, { id: 'b', description: 'One changed presentation', artifactSha256: 'c'.repeat(64) }],
  stimulus: { status: 'valid', reason: 'Both delivered as defined.', healthRef: 'synthetic-health' },
  outcome: { result: 'completed', observations: ['Correct record changed.'], assistance: 'none' },
  comprehension: { result: 'correct', response: 'The new title is saved.', reason: 'Identified the record and confirmed state.' },
  ratings: [{ variant: 'a', score: 4 }, { variant: 'b', score: 3 }],
  comparison: { status: 'selected', selected: 'a', reason: 'Clearer local feedback.' },
  negativeEvidence: [], uncertainty: ['Synthetic fixture; no participant.'],
});

test('broken demo remains invalid evidence, not a negative preference', () => {
  const r = record(); r.stimulus = { status: 'invalid', reason: 'The intended transition never ran.', healthRef: 'broken-motion' };
  r.ratings[0].score = 1;
  const summary = interpretRecord(r);
  assert.equal(summary.comparisonUsable, false);
  assert.ok(summary.cautions.includes('Invalid or unverified stimulus: judgments cannot establish a presentation preference.'));
  assert.match(renderRecord(r), /The intended transition never ran/);
});
test('a 1/5 relative winner preserves low rating and rejection of both', () => {
  const r = record(); r.ratings = [{ variant: 'a', score: 1 }, { variant: 'b', score: 1 }]; r.negativeEvidence = ['Both were disliked.'];
  const text = renderRecord(r);
  assert.match(text, /Both were disliked/); assert.match(text, /"score": 1/);
  assert.ok(interpretRecord(r).cautions.includes('The selected alternative has a low absolute rating; selection is not approval.'));
});
test('indistinguishable and misunderstood alternatives do not produce a winner', () => {
  for (const status of ['indistinguishable', 'misunderstood']) {
    const r = record(); r.comparison = { status, selected: null, reason: 'Could not explain any difference.' };
    assert.equal(interpretRecord(r).comparisonUsable, false);
    assert.match(renderRecord(r), /Could not explain any difference/);
  }
});
test('successful task with low satisfaction keeps both observations', () => {
  const r = record(); r.ratings[0].score = 2; r.negativeEvidence = ['Succeeded but recovery was frustrating.'];
  const text = renderRecord(r); assert.match(text, /"result": "completed"/); assert.match(text, /recovery was frustrating/);
  assert.equal(interpretRecord(r).approval, 'not-inferred');
});
test('missing responses stay missing and source/order/mode survive rendering', () => {
  const r = record(); r.ratings[0].score = null; r.comprehension = { result: 'not-assessed', response: null, reason: 'Declined.' };
  r.order = ['b', 'a']; r.observedVariant = 'a'; r.environment.motion = 'reduced';
  const text = renderRecord(r); assert.match(text, /"score": null/); assert.match(text, /"reduced"/);
  assert.deepEqual(JSON.parse(text.split('```json\n')[1].split('\n```')[0]), r);
});
test('engineering and model records cannot contain participant judgments', () => {
  for (const evidenceType of ['engineering', 'model-review']) {
    const r = record(); r.evidenceType = evidenceType;
    assert.throws(() => validateRecord(r), /participant judgments/);
    r.ratings = []; r.comparison = { status: 'not-assessed', selected: null, reason: 'Not participant evidence.' };
    r.comprehension = { result: 'not-assessed', response: null, reason: 'No participant.' };
    assert.doesNotThrow(() => validateRecord(r));
    assert.equal(interpretRecord(r).comparisonUsable, false);
  }
});
test('invalid references, ratings and provenance fail explicitly', () => {
  for (const mutate of [r => r.ratings[0].score = 6, r => r.order = ['unknown'], r => r.comparison.selected = 'unknown', r => r.source.commit = 'main', r => r.source.artifactSha256 = '', r => r.variants.push(r.variants[0]), r => r.negativeEvidence = null]) {
    const r = record(); mutate(r); assert.throws(() => validateRecord(r));
  }
});
test('relative selection requires at least two exposed alternatives', () => {
  const r = record(); r.variants = r.variants.slice(0, 1); r.order = ['a']; r.observedVariant = 'a'; r.ratings = r.ratings.slice(0, 1);
  assert.throws(() => validateRecord(r), /two exposed/);
});
test('unknown fields are retained, never silently discarded', () => {
  const r = record(); r.rawNotes = ['Unexpected but relevant observation.'];
  assert.match(renderRecord(r), /Unexpected but relevant observation/);
});
test('each observation identifies its exposure and preserves prior trial references', () => {
  const r = record(); r.observedVariant = 'a';
  assert.throws(() => validateRecord(r), /current exposure/);
  r.observedVariant = 'b'; r.priorRecordRefs = [];
  assert.throws(() => validateRecord(r), /prior exposure/);
});
test('participant ratings require every exposed variant, allowing explicit null', () => {
  const r = record(); r.evidenceType = 'participant-study'; r.ratings = [];
  assert.throws(() => validateRecord(r), /absolute rating/);
  r.ratings = [{ variant: 'a', score: null }, { variant: 'b', score: null }];
  assert.doesNotThrow(() => validateRecord(r));
});
