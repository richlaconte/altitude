import { syncActionsGuide } from '../scripts/sync-actions-guide.mjs';
syncActionsGuide();
import { transformSync } from 'esbuild';
import { examples, withExample } from './examples.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
const src = readFileSync('previews.txt', 'utf8');
// The page every preview renders on, shared with the check fixtures and Storybook (#409).
const common = readFileSync(new URL('./preview-common.css', import.meta.url), 'utf8').trim();
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

// Each component's README ends with an example generated from its preview (examples.mjs), so the usage an agent or a
// person copies is the code CI renders. The section is rewritten in place between its markers.
let written = 0;
for (const [name, ex] of Object.entries(examples())) {
  const path = `../project/components/${name}/README.md`;
  const before = readFileSync(path, 'utf8'), after = withExample(before, name, ex);
  if (after !== before) { writeFileSync(path, after); written++; }
}
console.log(`examples: ${written} READMEs updated`);
