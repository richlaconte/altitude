import { chromium } from 'playwright-core';
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';
// Run from <root>/build. <root>/project holds the design system's published files.
const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const comps = process.argv[2] ? process.argv[2].split(',') : readdirSync(root + '/project/components').filter((d) => existsSync(`${root}/project/components/${d}/preview.html`));
const themes = (process.argv[3] || 'daylight,nightfall').split(',');
const width = +(process.argv[4] || 960);
// CHROME=/path/to/chromium-or-headless_shell if Playwright's own browser isn't installed.
// PAGES_ONLY=1 writes test/p-<Name>-<scheme>.html, the pages the checks open, without rendering them.
const browser = process.env.PAGES_ONLY ? null : await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const errors = [];
let cur = '';
for (const c of comps) for (const th of themes) {
  cur = c + '/' + th;
  let html = readFileSync(`${root}/project/components/${c}/preview.html`, 'utf8');
  const h = +(html.match(/height=(\d+)/) || [, 300])[1];
  const inject = `<style>${readFileSync('test/tokens.css', 'utf8')}</style><style>${readFileSync(root + '/project/components/bundle.css', 'utf8').replace(/^@import[^\n]*\n/, '')}</style>
<script>${readFileSync('test/react.production.min.js', 'utf8')}</script><script>${readFileSync('test/react-dom.production.min.js', 'utf8')}</script><script>${readFileSync(root + '/project/components/bundle.js', 'utf8')}</script>`;
  html = html.replace('<html lang="en">', `<html lang="en" data-theme="${th}">`).replace('<head>', () => '<head>' + inject); // a function, so $& or $' in the bundle aren't read as patterns
  if (!browser) { writeFileSync(`test/p-${c}-${th}.html`, html); continue; }
  const page = await browser.newPage({ viewport: { width, height: h }, deviceScaleFactor: +(process.env.DPR || 1), forcedColors: process.env.FORCED ? 'active' : 'none' });
  page.on('pageerror', (e) => errors.push(cur + ': ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(cur + ' console: ' + m.text().slice(0, 300)); });
  writeFileSync(`test/p-${c}-${th}.html`, html);
  await page.goto(`file://${process.cwd()}/test/p-${c}-${th}.html`);
  await page.waitForTimeout(+(process.env.WAIT || 900));
  if (process.env.ACT) await eval(process.env.ACT);
  await page.screenshot({ path: `test/shot-${c}-${th}.png` });
  await page.close();
}
await browser?.close();
if (browser) console.log(errors.length ? errors.join('\n') : 'no errors');
if (errors.length) process.exitCode = 1;
