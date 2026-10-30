import { syncActionsGuide } from '../scripts/sync-actions-guide.mjs';
syncActionsGuide();
import { transformSync } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
const src = readFileSync('previews.txt', 'utf8');
const common = `#root { padding: 20px 24px; }
.row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.col { display: flex; flex-direction: column; gap: 14px; }
.cap { margin: 0; font: 500 12.5px/17px var(--font-sans); color: var(--ink-muted); }
.body { margin: 0; font: 400 15px/23px var(--font-sans); color: var(--ink); }
/* Preview chrome that apps copy: a disclosure's summary is a target too, at least 24px tall (WCAG 2.5.8). */
summary { min-height: 24px; padding-block: 2px; box-sizing: border-box; cursor: pointer; }`;
const sections = src.split(/^=== /m).filter((s) => s.trim());
const names = [];
for (const sec of sections) {
  const [head, ...rest] = sec.split('\n');
  const [name, marker] = head.split(' | ');
  const body = rest.join('\n');
  const css = (body.match(/--- css\n([\s\S]*?)(?=--- jsx)/) || [, ''])[1].trim();
  const jsx = body.split('--- jsx\n')[1];
  const js = transformSync(jsx, { loader: 'jsx', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment', target: 'es2020' }).code;
  if (/<\/script|<!--/i.test(js)) throw new Error('bad seq in ' + name);
  const html = `${marker.trim()}
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><link rel="icon" href="data:,">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name} — Altitude</title>
<style>
${common}
${css}
</style>
</head>
<body>
<div id="root"></div>
<script>
var A = window.Altitude;
${js.trim()}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(A.AltitudeProvider, null, React.createElement(App)));
</script>
</body>
</html>
`;
  mkdirSync(`../project/components/${name}`, { recursive: true });
  writeFileSync(`../project/components/${name}/preview.html`, html);
  names.push(name);
}
console.log(names.join(' '));
