// Each task pattern's working example lives in build/fixtures/patterns/<id>.jsx, where it's type-checked against the
// public declarations. The lines between its preview markers are also the "<Id>Pattern" preview in build/previews.txt
// (and so its Storybook story). `node scripts/pattern-previews.mjs` copies them in; `--check` lists any that differ.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const dir = root + 'build/fixtures/patterns/', previews = root + 'build/previews.txt';
export const previewName = (id) => id.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase()) + 'Pattern';
export function examples() {
  return readdirSync(dir).filter((f) => f.endsWith('.jsx')).sort().map((f) => {
    const src = readFileSync(dir + f, 'utf8'), m = src.match(/\/\/ preview:start\n([\s\S]*?)\/\/ preview:end\n/);
    if (!m) throw new Error(`${f}: no preview markers`);
    return { id: f.slice(0, -4), name: previewName(f.slice(0, -4)), jsx: m[1] };
  });
}
export function sync(write) {
  let text = readFileSync(previews, 'utf8');
  const stale = [];
  for (const { name, jsx } of examples()) {
    const head = text.indexOf(`\n=== ${name} | `);
    if (head < 0) { stale.push(`${name}: no section in build/previews.txt`); continue; }
    const start = text.indexOf('--- jsx\n', head) + 8, next = text.indexOf('\n=== ', start), end = next < 0 ? text.length : next + 1;
    const body = jsx + (next < 0 ? '' : '\n');
    if (text.slice(start, end) !== body) { stale.push(name); text = text.slice(0, start) + body + text.slice(end); }
  }
  if (write) writeFileSync(previews, text);
  return stale;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check'), stale = sync(!check);
  console.log(stale.length ? (check ? 'out of date: ' : 'updated: ') + stale.join(', ') : 'pattern previews match their examples');
  if (check && stale.length) process.exitCode = 1;
}
