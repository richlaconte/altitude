// Shared by the adapter checks: bundles an example from .storybook/adapters with the real third-party library, and opens
// it in a scheme (data-theme), optionally with forced colours, reduced motion or more contrast. Collects page and console
// errors so each check can assert there were none.
import { build } from 'esbuild';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
const root = fileURLToPath(new URL('../../', import.meta.url));

export async function adapterPages(file, exportName) {
  const dir = await mkdtemp(join(tmpdir(), 'altitude-adapter-'));
  const entry = `import * as React from 'react'; import { createRoot } from 'react-dom/client'; import { AltitudeProvider } from './project/components/src/index';
    import * as Example from './${file}';
    const q = new URLSearchParams(location.search);
    document.documentElement.setAttribute('data-theme', q.get('scheme'));
    createRoot(document.getElementById('root')).render(React.createElement(AltitudeProvider, { scheme: q.get('scheme'), contrast: q.get('contrast') || 'system', motion: q.get('motion') || 'system' }, React.createElement(Example[q.get('example') || '${exportName}'])));`;
  const out = await build({ stdin: { contents: entry, resolveDir: root, loader: 'jsx' }, bundle: true, write: false, outdir: dir, format: 'iife', jsx: 'transform',
    loader: { '.js': 'jsx' }, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent' });
  for (const f of out.outputFiles) await writeFile(join(dir, f.path.endsWith('.css') ? 'bundle.css' : 'bundle.js'), f.contents);
  const tokens = await readFile(join(root, 'build/test/tokens.css'), 'utf8');
  const altitude = (await readFile(join(root, 'project/components/bundle.css'), 'utf8')).replace(/^@import[^\n]*\n/, '');
  await writeFile(join(dir, 'altitude.css'), tokens + '\n' + altitude);
  await writeFile(join(dir, 'index.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Adapter</title><link rel="stylesheet" href="altitude.css"><link rel="stylesheet" href="bundle.css"><style>body{margin:0;padding:24px;background:var(--surface-ground);color:var(--ink);font-family:var(--font-sans)}</style></head><body><div id="root"></div><script src="bundle.js"></script></body></html>');
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const open = async ({ scheme = 'daylight', forced = false, reduced = false, contrast, example, width = 960, height = 700 } = {}) => {
    const page = await browser.newPage({ viewport: { width, height }, forcedColors: forced ? 'active' : 'none', reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    const q = new URLSearchParams({ scheme, ...(contrast ? { contrast } : {}), ...(reduced ? { motion: 'reduced' } : {}), ...(example ? { example } : {}) });
    await page.goto(`file://${join(dir, 'index.html')}?${q}`);
    await page.waitForTimeout(500);
    return { page, errors };
  };
  return { open, close: () => browser.close() };
}
