// Every component that has a guide, read from the design system's own sources so the list can't drift:
//   project/components/<Name>/README.md   the guide; its first sentence is the summary
//   build/previews.txt                    the group (the same grouping Storybook uses)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const groupOrder = ['Foundations', 'Layout', 'Navigation', 'Inputs', 'Actions', 'Display', 'Feedback', 'Overlays', 'Charts', 'Patterns'];

// The first sentence of the README's first paragraph, without bold markers.
export function summary(readme) {
  const para = readme.replace(/^# .*\n+/, '').split(/\n\s*\n/)[0].replace(/\s+/g, ' ').replace(/\*\*/g, '').trim();
  return (para.match(/^.+?[.!?](?=\s|$)/) || [para])[0].replace(/:$/, '.');
}

export function componentIndex() {
  const groups = {};
  for (const line of readFileSync(resolve(root, 'build/previews.txt'), 'utf8').split('\n')) {
    const m = line.match(/^=== (\S+) \|.*?group="([^"]+)"/);
    if (m) groups[m[1]] = m[2];
  }
  return readdirSync(resolve(root, 'project/components'))
    .filter((name) => existsSync(resolve(root, 'project/components', name, 'README.md')))
    .sort()
    .map((name) => ({
      name,
      group: groups[name] || 'Other',
      summary: summary(readFileSync(resolve(root, 'project/components', name, 'README.md'), 'utf8')),
      document: `components/${name}/README.md`,
    }));
}
