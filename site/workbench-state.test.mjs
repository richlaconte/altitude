import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { transform } from 'esbuild';

const { code } = await transform(readFileSync(new URL('./workbench-state.ts', import.meta.url), 'utf8'), { loader: 'ts', format: 'esm' });
const { placeTask } = await import(`data:text/javascript,${encodeURIComponent(code)}`);
const task = id => ({ id, title: id, code: id, owner: 'Mara Quist' });

test('moving a task keeps every task exactly once and preserves the previous board', () => {
  const a = task('a'), b = task('b'), c = task('c');
  const original = { next: [a, b], doing: [c], done: [] };
  const moved = placeTask(original, 'a', { column: 'doing', index: 1 });
  assert.deepEqual(moved, { next: [b], doing: [c, a], done: [] });
  assert.deepEqual(original, { next: [a, b], doing: [c], done: [] });
  assert.equal(new Set(Object.values(moved).flat().map(x => x.id)).size, 3);
});

test('a second move finds the task at its latest location, including a keyboard cancellation', () => {
  const a = task('a'), b = task('b');
  const original = { next: [a], doing: [b], done: [] };
  const moved = placeTask(original, 'a', { column: 'doing', index: 99 });
  const movedAgain = placeTask(moved, 'a', { column: 'done', index: 0 });
  assert.deepEqual(movedAgain, { next: [], doing: [b], done: [a] });
  assert.deepEqual(placeTask(movedAgain, 'a', { column: 'next', index: 0 }), original);
});

test('unknown cards and destinations do not corrupt the board', () => {
  const original = { next: [task('a')], doing: [], done: [] };
  assert.equal(placeTask(original, 'missing', { column: 'done', index: 0 }), original);
  assert.equal(placeTask(original, 'a', { column: 'missing', index: 0 }), original);
});
