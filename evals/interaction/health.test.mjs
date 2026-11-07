import { test } from 'node:test';
import assert from 'node:assert/strict';
import { movementHealth } from './health.mjs';

const end = { column: 'doing', x: 600, y: 200, transformed: false };
test('an instant destination change is a valid reduced-motion alternative', () => {
  assert.equal(movementHealth([{ ...end, column: 'sprint', x: 300 }, end, end], 'reduced').valid, true);
});
test('normal motion needs more than a changed endpoint', () => {
  assert.equal(movementHealth([{ ...end, column: 'sprint', x: 300 }, end, end], 'normal').valid, false);
  assert.equal(movementHealth([{ ...end, x: 400 }, { ...end, x: 500 }, end], 'normal').valid, true);
});
test('reduced motion rejects horizontal travel, vertical travel and scale transforms', () => {
  for (const frame of [{ ...end, x: 599 - 20 }, { ...end, y: 180 }, { ...end, transformed: true }]) {
    assert.equal(movementHealth([frame, end, end], 'reduced').valid, false);
  }
});
test('missing or wrong identity/destination samples are unverified', () => {
  assert.equal(movementHealth([], 'reduced').valid, false);
  assert.equal(movementHealth([{ ...end, column: 'sprint' }], 'reduced').valid, false);
});
