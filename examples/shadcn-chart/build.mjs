// Builds the example into out/: Tailwind v4 compiles src/index.css (with Altitude's CSS imported from the package),
// esbuild bundles src/main.tsx. Run `npm run build` at the repository root first, so altitude-design's dist exists.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = join(here, 'out');
const require = createRequire(join(here, 'package.json'));
mkdirSync(out, { recursive: true });

execFileSync(process.execPath, [join(here, 'node_modules/@tailwindcss/cli/dist/index.mjs'), '-i', 'src/index.css', '-o', 'out/app.css', '--minify'], { cwd: here, stdio: 'inherit' });

// One React: the example's own, for the app, Recharts and Altitude alike. altitude-design is the package built at the root.
const alias = Object.fromEntries(['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react-is'].map((name) => [name, require.resolve(name)]));
await build({
  entryPoints: [join(here, 'src/main.tsx')], bundle: true, outfile: join(out, 'app.js'), format: 'iife', target: 'es2022',
  jsx: 'automatic', minify: true, alias: { ...alias, '@': join(here, 'src'), 'altitude-design': join(here, '../..') }, loader: { '.css': 'empty' },
  define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'warning',
});

writeFileSync(join(out, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="data:,"><title>shadcn/ui chart on Altitude</title><link rel="stylesheet" href="./app.css"></head><body><div id="root"></div><script src="./app.js"></script></body></html>`);
console.log('Built ' + out);
