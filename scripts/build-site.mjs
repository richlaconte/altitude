// Builds the landing page into site-dist/ from site/ and the design system's own sources.
//   site-dist/index.html      the page served at the GitHub Pages root (a full document; everything inlined)
//   site-dist/artifact.html   the same page as a fragment, for a hosted preview that adds its own document skeleton
//   site-dist/llms.txt        the index for agents, with the Markdown it links to (see scripts/build-llms.mjs)
//   site-dist/examples/       the example apps (#399), one page each, from scripts/build-examples.mjs
// CI then copies Storybook into site-dist/storybook/ (see .github/workflows/ci.yml).
import { build } from 'esbuild';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tokensCss } from './tokens-css.mjs';
import { buildLlms } from './build-llms.mjs';
import { buildExamples, exampleSlugs } from './build-examples.mjs';

const out = 'site-dist';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// The example apps, from each app's own app.json, so the band can't drift from them (#399): the product's name without
// the page title's suffix, and what it is, from the page description. The smallest, Team notes, goes last.
const exampleApps = exampleSlugs().map((slug) => {
  const m = JSON.parse(readFileSync(`examples/apps/${slug}/app.json`, 'utf8'));
  const what = m.description.replace(/^.*?Altitude example app: /, '');
  return { slug, title: m.title.replace(/ · Altitude example$/, ''), what: what.charAt(0).toUpperCase() + what.slice(1) };
}).sort((a, b) => (a.slug === 'hello') - (b.slug === 'hello'));

// The landing page's facts, counted from the repository so they can't drift: the version, the numbered experiments
// in Research, the check scripts, the framework's task patterns and the example apps.
const site = {
  examples: exampleApps,
  version: JSON.parse(readFileSync('package.json', 'utf8')).version,
  experiments: (readFileSync('project/Research.md', 'utf8').match(/^### E\d+ /gm) || []).length,
  checks: readdirSync('build/checks').filter((f) => f.endsWith('.mjs')).length,
  patterns: readdirSync('project/framework/patterns').filter((f) => f.endsWith('.md')).length,
};

async function bundle(entry) {
  const result = await build({
    entryPoints: [entry], bundle: true, write: false, format: 'iife', minify: true, target: 'es2020', legalComments: 'none',
    jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment',
    define: { 'process.env.NODE_ENV': '"production"', __SITE__: JSON.stringify(site) },
    // The agent page uses a pattern fixture, which imports the package by name.
    // One React for both: the fixture would otherwise resolve build/'s copy.
    alias: { 'altitude-design': './project/components/src/index.tsx', react: './node_modules/react', 'react-dom': './node_modules/react-dom' },
  });
  // An inline script ends at the first "</script", wherever it appears.
  return result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
}
const js = await bundle('site/main.tsx');
const agentJs = await bundle('site/agent.tsx');

const components = readFileSync('project/components/bundle.css', 'utf8');
const fontImport = (components.match(/^@import url\('([^']+)'\);/) || [])[1];
const css = [tokensCss('project/tokens.json'), components.replace(/^@import[^\n]*\n/, ''), readFileSync('site/site.css', 'utf8')].join('\n');

const title = 'Altitude';
const description = 'React components where height shows state: settled content on the ground, anything live above it, anything to fill below it. With guidance and checks for the coding agents that build with them.';
const fonts = fontImport
  ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${fontImport}">`
  : '';
// Set the scheme before the first paint, so a dark system never flashes the light page.
const early = `<script>(function(){var t=document.documentElement.getAttribute('data-theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.body.setAttribute('data-theme',d?'nightfall':'daylight');})();</script>`;
const body = `${early}
<div id="altitude-site"></div>
<script>${js}</script>`;
const agentBody = `${early}
<div id="altitude-site"></div>
<script>${agentJs}</script>`;

const page = ({ title, description, css, body }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<link rel="describedby" href="llms.txt">
${fonts}
<style>
${css}
</style>
</head>
<body>
${body}
</body>
</html>
`;
writeFileSync(`${out}/index.html`, page({ title, description, css, body }));
writeFileSync(`${out}/agent.html`, page({ title: 'Altitude for agents', description: 'A scripted agent run through every state, in a complete harness built with Altitude.', css, body: agentBody }));

writeFileSync(`${out}/artifact.html`, `<title>${title}</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
<style>
${css}
</style>
${body}
`);
const llms = buildLlms(out);
console.log('llms ok', `${llms.llms} KB llms.txt, ${llms.full} KB llms-full.txt, ${llms.files} files`);
const examples = await buildExamples(`${out}/examples`);
console.log('site facts', JSON.stringify(site));
console.log('examples ok', examples.map((e) => `${e.slug} ${e.kb} KB`).join(', '));
console.log('site ok', Math.round(js.length / 1024) + ' KB of script;', 'agent page', Math.round(agentJs.length / 1024) + ' KB');
