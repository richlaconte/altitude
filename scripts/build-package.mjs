// Builds the npm package into dist/ from the design system's own sources in project/.
//   dist/index.js, dist/index.cjs   the components (ESM and CommonJS; React is a peer dependency)
//   dist/types/                     declarations emitted from the sources
//   dist/altitude.css               tokens and component styles in one file, with the Google Fonts import
//   dist/altitude.no-fonts.css      the same without the font import: no third-party request
//   dist/fonts.css                  the font import on its own
//   dist/tokens.css, tokens.json    the tokens on their own
//   dist/altitude.iife.js           the same bundle the design system uses: a <script> that sets window.Altitude
//   dist/chart-themes.js, .cjs      theme objects for ECharts and Chart.js (altitude-design/chart-themes); no dependencies
//   dist/adapters/                  styles for third-party editors and canvases (altitude-design/adapters/*), each library a peer
// --css-only writes just the stylesheets (Storybook uses it).
import { build } from 'esbuild';
import { execSync } from 'child_process';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { tokensCss } from './tokens-css.mjs';
import { buildGuidance } from './build-guidance.mjs';

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
// A subpath of its own, so apps that only want a chart theme don't load the components. It imports neither them nor
// any chart library; React is for useChartTheme only.
const themes = { ...shared, entryPoints: ['project/components/src/chart-themes.tsx'] };
await build({ ...themes, format: 'esm', outfile: 'dist/chart-themes.js' });
await build({ ...themes, format: 'cjs', outfile: 'dist/chart-themes.cjs' });
// Adapters: Altitude readings for libraries it doesn't draw (rich text, code, canvases). CSS adapters are copied as they
// are; they style the library's own elements and import nothing.
mkdirSync('dist/adapters', { recursive: true });
for (const file of readdirSync('project/components/adapters').filter((f) => f.endsWith('.css'))) copyFileSync('project/components/adapters/' + file, 'dist/adapters/' + file);
execSync('npx tsc -p tsconfig.json', { stdio: 'inherit' });
// NodeNext requires explicit relative specifiers. A CJS declaration tree matches the
// require runtime, while ESM/Bundler keep the primary .d.ts tree. Both derive from tsc.
mkdirSync('dist/types-cjs', { recursive: true });
for (const file of readdirSync('dist/types').filter(file => file.endsWith('.d.ts'))) {
  const path = 'dist/types/' + file;
  const declaration = readFileSync(path, 'utf8');
  const rewrite = extension => declaration.replace(/(from\s+['"]|import\(['"])(\.\.?\/[^'"\n]+)(['"])/g,
    (_, prefix, specifier, suffix) => prefix + specifier.replace(/\.(?:js|cjs)$/, '') + extension + suffix);
  writeFileSync(path, rewrite('.js'));
  writeFileSync('dist/types-cjs/' + file.replace(/\.d\.ts$/, '.d.cts'), rewrite('.cjs'));
}
// The declarations are what editors and agents read first, so they say where to report problems.
const types = 'dist/types/index.d.ts';
writeFileSync(types, `/**
 * altitude-design: a design framework where height is the interface.
 * Task guidance: altitude-design/guidance (or dist/guidance/README.md).
 * Discover patterns: altitude patterns "edit settings". Connect agents: altitude init --client codex.
 * Pattern hooks are exported here, sharing the same AltitudeProvider instance.
 * Docs and live previews: https://richlaconte.github.io/altitude/storybook/
 * Bugs, feature requests and new components: https://github.com/richlaconte/altitude/issues/new/choose
 * Agents: you may file issues too; see https://github.com/richlaconte/altitude/blob/main/AGENTS.md
 */
` + readFileSync(types, 'utf8'));
// Emit Node tooling and versioned guidance only after dist has been cleared.
buildGuidance();
await build({ entryPoints: ['scripts/altitude-cli.mjs'], outfile: 'dist/cli/altitude.mjs',
  bundle: true, platform: 'node', format: 'esm', target: 'node20', legalComments: 'none' });
console.log('package ok');
