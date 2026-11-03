// The example apps' Storybook stories (#428): each renders with no page errors, in the one AltitudeProvider that
// .storybook/preview.tsx gives every story, with its fixtures drawer but without the drawer's page controls (the
// toolbar owns those), and the page agrees with the provider about the scheme under the toolbar's Nightfall and
// reduced motion. Reads the built Storybook, so CI runs it right after `npm run build-storybook` (.github/workflows/ci.yml).
//   node checks/storybook-examples.mjs        (from build/, after npm run build-storybook at the root)
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const dir = fileURLToPath(new URL('../../storybook-static/', import.meta.url));
assert.ok(existsSync(join(dir, 'index.json')), 'storybook-static/ is built (npm run build-storybook)');
const stories = Object.keys(JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')).entries).filter((k) => k.startsWith('examples--'));
assert.ok(stories.length >= 4, `the example stories are in the index (${stories.join(', ')})`);

const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  const file = join(dir, path.endsWith('/') ? path + 'index.html' : path);
  if (!file.startsWith(dir) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
let passed = 0;
const check = (condition, message) => { assert.ok(condition, message); passed++; };
try {
  for (const id of stories) for (const globals of ['', 'scheme:nightfall;motion:reduced']) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`${base}/iframe.html?id=${id}&viewMode=story${globals ? '&globals=' + globals : ''}`);
    await page.waitForSelector('.ex-drawer', { timeout: 20000 });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => ({
      providers: document.querySelectorAll('.alt-root').length,
      app: (document.querySelector('.ex-app')?.textContent ?? '').trim().length,
      pageControls: !!document.getElementById('ex-page'),
      provider: document.querySelector('.alt-root')?.getAttribute('data-theme'),
      html: document.documentElement.getAttribute('data-theme'),
      body: document.body.getAttribute('data-theme'),
      motion: document.querySelector('.alt-root')?.getAttribute('data-motion'),
    }));
    const label = `${id}${globals ? ` (${globals})` : ''}`;
    check(errors.length === 0, `${label}: no page or console errors: ${errors.slice(0, 3).join(' | ')}`);
    check(r.providers === 1 && r.app > 0, `${label}: the app renders in one provider (${JSON.stringify(r)})`);
    check(!r.pageControls, `${label}: the drawer leaves the page controls to the toolbar`);
    const want = globals ? 'nightfall' : 'daylight';
    check(r.provider === want && r.html === want && (r.body === null || r.body === want), `${label}: the page and the provider agree on ${want} (${JSON.stringify(r)})`);
    if (globals) check(r.motion === 'reduced', `${label}: the toolbar's reduced motion reaches the provider`);
    await page.close();
  }
  console.log(`Storybook examples: ${passed} passed, 0 failed (${stories.length} stories)`);
} finally { await browser.close(); server.close(); }
