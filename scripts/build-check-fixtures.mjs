// Runtime fixtures come from the same JSX as published previews and Storybook.
// Resolve from this module so neither cwd nor build/node_modules can select React 18.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { tokensCss } from './tokens-css.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const requireRoot = createRequire(process.env.ALT_PACKAGE_ROOT ? resolve(process.env.ALT_PACKAGE_ROOT, 'package.json') : new URL('../package.json', import.meta.url));
const strict = process.env.ALT_CHECK_STRICT === '1';
const installedEntry = process.env.ALT_PACKAGE_ROOT ? resolve(process.env.ALT_PACKAGE_ROOT, 'dist/index.js') : './project/components/src/index.tsx';
const out = join(root, 'build/test', process.env.ALT_PACKAGE_ROOT ? 'react19-installed' : strict ? 'react19-strict' : 'react19');
const names = (process.argv[2] || 'InlineEdit,EditRegion,Dialog,ActionsInPlace,Sheet,CommandPalette,Toaster,TagInput,DatePicker,Tree,Checklist,FilterBar,Schedule,DataGrid,ItemGroup,Board,TableEditing,PropertyList').split(',').map(s => s.trim()).filter(Boolean);
const sections = new Map(readFileSync(join(root, 'build/previews.txt'), 'utf8').split(/^=== /m).filter(s => s.trim()).map(s => [s.split(' | ')[0], s]));
const missing = names.filter(name => !sections.has(name));
if (missing.length) throw new Error('Missing canonical preview sections: ' + missing.join(', '));
const version = requireRoot('react/package.json').version;
if (Number(version.split('.')[0]) !== 19) throw new Error('React 19 runtime required; root resolved ' + version);
mkdirSync(out, { recursive: true });
const tokens = process.env.ALT_PACKAGE_ROOT ? '' : tokensCss(join(root, 'project/tokens.json'));
const componentCss = readFileSync(process.env.ALT_PACKAGE_ROOT ? resolve(process.env.ALT_PACKAGE_ROOT, 'dist/altitude.no-fonts.css') : join(root, 'project/components/bundle.css'), 'utf8').replace(/^@import[^\n]*\n/, '');
const common = '#root { padding: 20px 24px; } .row { display:flex; flex-wrap:wrap; gap:12px; align-items:center; } .col { display:flex; flex-direction:column; gap:14px; } .cap { margin:0; font:500 12.5px/17px var(--font-sans); color:var(--ink-muted); } .body { margin:0; font:400 15px/23px var(--font-sans); color:var(--ink); }';
const aliases = Object.fromEntries(['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'].map(name => [name, requireRoot.resolve(name)]));
for (const name of names) {
  const section = sections.get(name);
  const body = section.slice(section.indexOf('\n') + 1);
  const css = (body.match(/--- css\n([\s\S]*?)(?=--- jsx)/) || [, ''])[1];
  const jsx = body.split('--- jsx\n')[1];
  if (!jsx) throw new Error('Missing JSX for ' + name);
  const result = await build({
    stdin: { contents: `import * as React from 'react';\nimport * as ReactDOM from 'react-dom/client';\nimport * as A from '${installedEntry}';\nwindow.React=React; window.ReactDOM=ReactDOM; window.Altitude=A; window.__ALT_REACT_VERSION=React.version;\nif (React.version.split('.')[0] !== '19') throw new Error('Wrong fixture React runtime');\ndocument.documentElement.dataset.reactVersion=React.version;\n${jsx}\nconst scene=React.createElement(A.AltitudeProvider,null,React.createElement(App));\nReactDOM.createRoot(document.getElementById('root')).render(${strict ? 'React.createElement(React.StrictMode,null,scene)' : 'scene'});`, resolveDir: root, loader: 'jsx', sourcefile: 'canonical-' + name + '.jsx' },
    bundle: true, write: false, format: 'iife', target: 'es2020', jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment',
    alias: aliases, define: { 'process.env.NODE_ENV': JSON.stringify(strict ? 'development' : 'production') }, minify: !strict,
  });
  const code = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  writeFileSync(join(out, name + '.js'), code);
  for (const scheme of ['daylight', 'nightfall']) {
    writeFileSync(join(out, `p-${name}-${scheme}.html`), `<!doctype html><html lang="en" data-theme="${scheme}" data-fixture-strict="${strict}"><head><meta charset="utf-8"><link rel="icon" href="data:,"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${name} — React ${version}${strict ? ' StrictMode' : ''}</title><style>${tokens}\n${componentCss}\n${common}\n${css}</style></head><body><div id="root"></div><script src="./${name}.js"></script></body></html>`);
  }
}
console.log(`React ${version}${strict ? ' development StrictMode' : ' production'}: ${names.join(', ')} → ${out}`);
