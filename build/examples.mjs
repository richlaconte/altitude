// Each component's usage example, generated from its preview in previews.txt: the preview is rendered in both schemes
// and checked in CI, so an example can't drift from code that works. Example code is the part of documentation that
// helps a model use an unfamiliar API most, and a wrong example gets copied (Chen et al. 2025, arXiv 2503.15231).
//   minimal   the component as first used in its preview, e.g. <Select items={regions} … />
//   full      the whole preview as an app module: `A.` dropped and real imports from 'altitude-design'
// previews.mjs writes both into the component's README (between the markers below); scripts/build-package.mjs puts
// the minimal one on the component's declaration as @example; checks/examples.mjs type-checks every full example
// against the public declarations.
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, '../package.json'));
const ts = require('typescript');

export const START = '<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->';
export const END = '<!-- /example -->';

// Class names the preview page defines (previews.mjs's shared styles and each section's css), not Altitude's.
const previewClasses = (css) => new Set(['row', 'col', 'cap', 'body', ...[...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1])]);

function firstElement(code, name) {
  const sf = ts.createSourceFile('x.jsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
  let found;
  const visit = (n) => {
    if (found) return;
    const tag = ts.isJsxElement(n) ? n.openingElement.tagName : ts.isJsxSelfClosingElement(n) ? n.tagName : null;
    if (tag && tag.getText(sf) === `A.${name}`) { found = n; return; }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  if (!found) return null;
  // Dedent the continuation lines by the same amount, so their indentation relative to each other survives.
  const lines = found.getText(sf).split('\n');
  const col = found.getStart(sf) - sf.text.lastIndexOf('\n', found.getStart(sf)) - 1;
  const strip = Math.min(col, ...lines.slice(1).filter((l) => l.trim()).map((l) => l.length - l.trimStart().length));
  return lines.map((line, i) => (i ? line.slice(strip) : line)).join('\n');
}

export function examples(previewsPath = resolve(here, 'previews.txt')) {
  const out = {};
  for (const sec of readFileSync(previewsPath, 'utf8').split(/^=== /m).filter((s) => s.trim())) {
    const [head, ...rest] = sec.split('\n');
    const name = head.split(' | ')[0];
    if (!existsSync(resolve(here, `../project/components/${name}/README.md`))) continue;
    const body = rest.join('\n');
    const css = (body.match(/--- css\n([\s\S]*?)(?=--- jsx)/) || [, ''])[1];
    const jsx = body.split('--- jsx\n')[1].trim();
    const names = [...new Set([...jsx.matchAll(/\bA\.([A-Za-z_]\w*)/g)].map((m) => m[1]))].sort();
    const code = jsx.replace(/\bA\.([A-Za-z_]\w*)/g, '$1').replace(/^function App\(/m, 'export default function App(');
    const imports = [
      /\bReact\./.test(code) ? `import * as React from 'react';` : null,
      names.length ? `import { ${names.join(', ')} } from 'altitude-design';` : null,
    ].filter(Boolean).join('\n');
    const first = firstElement(jsx, name);
    const minimal = first?.replace(/\bA\.([A-Za-z_]\w*)/g, '$1') || null;
    const minimalNames = first ? [...new Set([...first.matchAll(/\bA\.([A-Za-z_]\w*)/g)].map((m) => m[1]))].sort() : [];
    const classes = previewClasses(css);
    const used = [...new Set([...code.matchAll(/className="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)))].filter((c) => classes.has(c));
    out[name] = { names, minimal, minimalNames, full: `${imports}\n\n${code}\n`, previewClasses: used };
  }
  return out;
}

export function section(name, ex) {
  const lines = [START, '## Example', ''];
  if (ex.minimal) lines.push(`\`${name}\` as first used in its preview:`, '', '```tsx', `import { ${ex.minimalNames.join(', ')} } from 'altitude-design';`, '', ex.minimal, '```', '');
  lines.push(`The full preview, as rendered in Storybook and checked in CI${ex.previewClasses.length ? ` (${ex.previewClasses.map((c) => `\`${c}\``).join(', ')} ${ex.previewClasses.length > 1 ? 'are' : 'is'} the preview page's own layout ${ex.previewClasses.length > 1 ? 'classes' : 'class'}, not Altitude's)` : ''}:`, '');
  lines.push('```tsx', ex.full.trimEnd(), '```', END);
  return lines.join('\n');
}

// The README with its example section replaced, or appended when it has none yet.
export function withExample(readme, name, ex) {
  const block = section(name, ex);
  const start = readme.indexOf(START), end = readme.indexOf(END);
  if (start >= 0 && end > start) return readme.slice(0, start) + block + readme.slice(end + END.length);
  return readme.trimEnd() + '\n\n' + block + '\n';
}
