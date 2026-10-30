import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sync } from '../../scripts/pattern-previews.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
for (const config of ['build/fixtures/pattern-tsconfig.json', 'build/fixtures/pattern-examples-tsconfig.json']) {
  const result = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', config], {cwd:root, stdio:'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
// The task patterns' examples are their Storybook previews; the two must not drift.
const stale = sync(false);
if (stale.length) { console.error(`Pattern previews differ from build/fixtures/patterns (run node scripts/pattern-previews.mjs): ${stale.join(', ')}`); process.exit(1); }
console.log('Pattern types: positive/negative contracts and example compositions passed.');
