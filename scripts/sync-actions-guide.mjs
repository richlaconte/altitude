/** Copy the executable recipe into its guide; build/previews.txt remains the only source. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
export function syncActionsGuide() {
  const catalog = readFileSync(resolve(root, 'build/previews.txt'), 'utf8');
  const section = catalog.split('=== ActionsInPlace |')[1]?.split('\n=== ')[0];
  if (!section) throw new Error('Missing canonical ActionsInPlace preview');
  const jsx = section.split('--- jsx\n')[1];
  const recipe = jsx.slice(jsx.indexOf('const FILES_SEED'), jsx.indexOf('\nfunction App()')).trim();
  const css = section.split('--- css\n')[1].split('--- jsx\n')[0].trim();
  const path = resolve(root, 'project/ActionsInPlace.md');
  let guide = readFileSync(path, 'utf8');
  for (const [marker, language, source] of [['source', 'jsx', recipe], ['css', 'css', css]]) {
    const pattern = new RegExp(`<!-- recipe-${marker}:start -->[\\s\\S]*?<!-- recipe-${marker}:end -->`);
    if (!pattern.test(guide)) throw new Error(`Missing recipe-${marker} markers in ActionsInPlace.md`);
    guide = guide.replace(pattern, () => `<!-- recipe-${marker}:start -->\n\x60\x60\x60${language}\n${source}\n\x60\x60\x60\n<!-- recipe-${marker}:end -->`);
  }
  writeFileSync(path, guide);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) syncActionsGuide();
