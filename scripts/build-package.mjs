// Builds the npm package into dist/ from the design system's own sources in project/.
//   dist/index.js, dist/index.cjs   the components (ESM and CommonJS; React is a peer dependency)
//   dist/types/                     declarations emitted from the sources
//   dist/altitude.css               tokens and component styles in one file, with the Google Fonts import
//   dist/altitude.no-fonts.css      the same without the font import: no third-party request
//   dist/fonts.css                  the font import on its own
//   dist/tokens.css, tokens.json    the tokens on their own
//   dist/altitude.iife.js           the same bundle the design system uses: a <script> that sets window.Altitude
// --css-only writes just the stylesheets (Storybook uses it).
import { build } from 'esbuild';
import { execSync } from 'child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tokensCss } from './tokens-css.mjs';

const cssOnly = process.argv.includes('--css-only');
const src = 'project/components/src/index.tsx';
const tokens = tokensCss('project/tokens.json');
const components = readFileSync('project/components/bundle.css', 'utf8');
// An @import must come first, so the font import stays at the top, above the tokens.
const [, fontImport = '', rest = components] = components.match(/^(@import[^\n]*\n)?([\s\S]*)$/) ?? [];

if (!cssOnly) rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
writeFileSync('dist/tokens.css', tokens);
writeFileSync('dist/altitude.css', fontImport + '\n' + tokens + '\n' + rest);
writeFileSync('dist/altitude.no-fonts.css', tokens + '\n' + rest);
writeFileSync('dist/fonts.css', fontImport);
if (cssOnly) { console.log('css ok'); process.exit(0); }

copyFileSync('project/tokens.json', 'dist/tokens.json');
copyFileSync('project/components/bundle.js', 'dist/altitude.iife.js');
const shared = {
  entryPoints: [src], bundle: true, target: 'es2020', sourcemap: true, legalComments: 'none',
  external: ['react', 'react-dom', 'react/jsx-runtime'], jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment',
  // Every component uses hooks or the DOM, so frameworks with server components must load them on the client.
  banner: { js: '"use client";' },
};
await build({ ...shared, format: 'esm', outfile: 'dist/index.js' });
await build({ ...shared, format: 'cjs', outfile: 'dist/index.cjs' });
execSync('npx tsc -p tsconfig.json', { stdio: 'inherit' });
// The declarations are what editors and agents read first, so they say where to report problems.
const types = 'dist/types/index.d.ts';
writeFileSync(types, `/**
 * altitude-design: a React component library where height is the interface.
 * Docs and live previews: https://richlaconte.github.io/altitude/
 * Bugs, feature requests and new components: https://github.com/richlaconte/altitude/issues/new/choose
 * Agents: you may file issues too; see https://github.com/richlaconte/altitude/blob/main/AGENTS.md
 */
` + readFileSync(types, 'utf8'));
console.log('package ok');
