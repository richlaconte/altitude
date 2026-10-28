import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const result = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'build/fixtures/pattern-tsconfig.json'], {cwd:root, stdio:'inherit'});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
console.log('Pattern types: positive/negative contracts and example compositions passed.');
