// Builds each example app in examples/apps/<slug>/ (#399) into one self-contained page, <out>/<slug>.html.
// An app is a folder with main.tsx (it mounts into #example), app.json ({ title, description }) and optionally app.css.
// examples/apps/shared/ is the simulated service and the frame they share, not an app.
// scripts/build-site.mjs calls this for site-dist/examples/; build/checks/example-service.mjs calls it for its own pages.
//   node scripts/build-examples.mjs [out]     default out: site-dist/examples
import { build } from 'esbuild';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokensCss } from './tokens-css.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const apps = join(root, 'examples/apps');

export const exampleSlugs = () => readdirSync(apps, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'shared' && existsSync(join(apps, d.name, 'main.tsx')))
  .map((d) => d.name).sort();

export async function buildExamples(out = join(root, 'site-dist/examples'), { only } = {}) {
  mkdirSync(out, { recursive: true });
  const components = readFileSync(join(root, 'project/components/bundle.css'), 'utf8');
  const fontImport = (components.match(/^@import url\('([^']+)'\);/) || [])[1];
  const fonts = fontImport
    ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${fontImport}">`
    : '';
  const shared = [tokensCss(join(root, 'project/tokens.json')), components.replace(/^@import[^\n]*\n/, ''), readFileSync(join(apps, 'shared/examples.css'), 'utf8')];
  const built = [];
  for (const slug of only ?? exampleSlugs()) {
    const dir = join(apps, slug);
    const meta = JSON.parse(readFileSync(join(dir, 'app.json'), 'utf8'));
    const result = await build({
      entryPoints: [join(dir, 'main.tsx')], bundle: true, write: false, format: 'iife', minify: true, target: 'es2020', legalComments: 'none',
      absWorkingDir: root, jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment',
      define: { 'process.env.NODE_ENV': '"production"' },
      // The apps import the package by name, as a consumer would; here it's built from the components' own sources,
      // with one React for both.
      alias: { 'altitude-design': './project/components/src/index.tsx', react: './node_modules/react', 'react-dom': './node_modules/react-dom' },
    });
    // An inline script ends at the first "</script", wherever it appears.
    const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
    const css = [...shared, existsSync(join(dir, 'app.css')) ? readFileSync(join(dir, 'app.css'), 'utf8') : ''].join('\n');
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    // Set the scheme before the first paint, so a dark system never flashes the light page.
    const early = `<script>(function(){var d=false;try{d=matchMedia('(prefers-color-scheme: dark)').matches}catch(e){}document.body.setAttribute('data-theme',d?'nightfall':'daylight');})();</script>`;
    writeFileSync(join(out, `${slug}.html`), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}">
${fonts}
<style>
${css}
</style>
</head>
<body>
${early}
<div id="example"></div>
<script>${js}</script>
</body>
</html>
`);
    built.push({ slug, kb: Math.round(js.length / 1024) });
  }
  return built;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const built = await buildExamples(process.argv[2] ? resolve(process.argv[2]) : undefined);
  console.log('examples ok', built.map((b) => `${b.slug} ${b.kb} KB`).join(', ') || '(none)');
}
