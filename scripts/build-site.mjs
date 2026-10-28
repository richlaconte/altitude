// Builds the landing page into site-dist/ from site/ and the design system's own sources.
//   site-dist/index.html      the page served at the GitHub Pages root (a full document; everything inlined)
//   site-dist/artifact.html   the same page as a fragment, for a hosted preview that adds its own document skeleton
// CI then copies Storybook into site-dist/storybook/ (see .github/workflows/ci.yml).
import { build } from 'esbuild';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tokensCss } from './tokens-css.mjs';

const out = 'site-dist';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const result = await build({
  entryPoints: ['site/main.tsx'], bundle: true, write: false, format: 'iife', minify: true, target: 'es2020', legalComments: 'none',
  jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment',
  define: { 'process.env.NODE_ENV': '"production"' },
});
// An inline script ends at the first "</script", wherever it appears.
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const components = readFileSync('project/components/bundle.css', 'utf8');
const fontImport = (components.match(/^@import url\('([^']+)'\);/) || [])[1];
const css = [tokensCss('project/tokens.json'), components.replace(/^@import[^\n]*\n/, ''), readFileSync('site/site.css', 'utf8')].join('\n');

const title = 'Altitude';
const description = 'A design and HCI framework for agent-built React applications. Task guidance, workflow hooks and interaction checks share Altitude’s elevation language.';
const fonts = fontImport
  ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${fontImport}">`
  : '';
// Set the scheme before the first paint, so a dark system never flashes the light page.
const early = `<script>(function(){var t=document.documentElement.getAttribute('data-theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.body.setAttribute('data-theme',d?'nightfall':'daylight');})();</script>`;
const body = `${early}
<div id="altitude-site"></div>
<script>${js}</script>`;

writeFileSync(`${out}/index.html`, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
${fonts}
<style>
${css}
</style>
</head>
<body>
${body}
</body>
</html>
`);

writeFileSync(`${out}/artifact.html`, `<title>${title}</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
<style>
${css}
</style>
${body}
`);
console.log('site ok', Math.round(js.length / 1024) + ' KB of script');
