// `altitude check`'s rules (scripts/source-check.mjs), each proven active: it catches its example and passes its
// counter-example. Then the CLI is run on a small fixture app, to check exit codes and that every rule it reports has
// an entry in project/framework/rules.json, so `altitude explain` resolves it. No browser, no network.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES, scan } from '../../scripts/source-check.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const app = (body) => `import 'altitude-design/altitude.css';\nimport { AltitudeProvider, Button, Input } from 'altitude-design';\nexport function App() { return <AltitudeProvider>${body}</AltitudeProvider>; }\n`;
const tokenNames = new Set([...readFileSync(resolve(root, 'project/tokens.json'), 'utf8').matchAll(/"(ink|accent|surface-[\w-]+|line)"/g)].map((m) => m[1]).concat(['ink', 'accent']));

// [rule, files that must produce it, files that must not]
const cases = [
  ['ALT-TOKEN-001',
    { 'App.tsx': app('<p style={{ color: "#6b7280" }}>Hi</p>') },
    { 'App.tsx': app('<p style={{ color: "var(--ink-muted)" }}>Hi</p>'), 'theme.ts': "export const paper = { name: 'paper', tokens: { ink: '#1b1b1b' } };", 'brand.tsx': "<AltitudeProvider accent=\"#0f8a6b\" />", 'a.css': ':root { --brand: #0f8a6b; }\n.x { color: var(--brand); }\n/* color: #fff */'}],
  ['ALT-TOKEN-001', { 'a.css': '.title { color: #6b7280; }' }, { 'a.css': '.title { color: var(--ink-muted); } /* was #6b7280 */' }],
  ['ALT-TOKEN-001',
    { 'App.tsx': app('<p className="text-sm text-zinc-500">Hi</p>') },
    { 'App.tsx': app('<p className="text-sm text-muted-foreground border-b">Hi</p>') }],
  ['ALT-TOKEN-001',
    { 'index.html': '<style>\n  .card { background: #fafafa; }\n</style>\n<p style="color: #333">Hi</p>' },
    { 'index.html': '<style>\n  :root { --brand: #0f8a6b; }\n  .card { background: var(--surface-raised); }\n</style>\n<a href="#main">Skip to content</a>' }],
  ['ALT-TOKEN-001', { 'App.tsx': app('<p style={{ color: "#6b7280" }}>Hi</p>') }, { 'App.tsx': app('{/* altitude-ignore: ALT-TOKEN-001 partner logo colour */}\n<p style={{ color: "#6b7280" }}>Hi</p>') }],
  ['ALT-SETUP-002',
    { 'App.tsx': "import { Button } from 'altitude-design';\nexport const A = () => <AltitudeProvider><Button>Save changes</Button></AltitudeProvider>;" },
    { 'App.tsx': app('<Button>Save changes</Button>'), 'other.ts': 'export const x = 1;' }],
  ['ALT-SETUP-003',
    { 'App.tsx': "import 'altitude-design/altitude.css';\nimport { Button } from 'altitude-design';\nexport const A = () => <Button>Save changes</Button>;" },
    { 'App.tsx': app('<Button>Save changes</Button>') }],
  ['ALT-CHART-001',
    { 'Chart.tsx': "import { PieChart, Pie } from 'recharts';" },
    { 'Chart.tsx': "import { BarChart } from 'altitude-design';" }],
  ['ALT-CHART-001', { 'chart.ts': "new Chart(el, { type: 'doughnut', data });" }, { 'chart.ts': "new Chart(el, { type: 'bar', data });" }],
  // A namespace import (import * as A from 'altitude-design') is as common in generated apps as named imports.
  ['ALT-SETUP-003',
    { 'main.tsx': "import 'altitude-design/altitude.css';\nimport * as A from 'altitude-design';\nexport const App = () => <A.Button>Save changes</A.Button>;" },
    { 'main.tsx': "import 'altitude-design/altitude.css';\nimport * as A from 'altitude-design';\nroot.render(<A.AltitudeProvider><App/></A.AltitudeProvider>);" }],
  ['ALT-COPY-001', { 'App.tsx': app('<Button variant="primary">Submit</Button>') }, { 'App.tsx': app('<Button variant="primary">Send invite</Button>') }],
  ['ALT-COPY-001', { 'App.tsx': app('<A.Button variant="primary">OK</A.Button>') }, { 'App.tsx': app('<A.Button variant="primary">Save changes</A.Button>') }],
  ['ALT-PRIMARY-001',
    { 'App.tsx': app('<Button variant="primary">Save changes</Button><Button variant="primary">Publish</Button>') },
    { 'App.tsx': app('<Button variant="primary">Save changes</Button><Button variant="ghost">Cancel</Button>') }],
  ['ALT-VISUAL-004',
    { 'App.tsx': app('<Input className="shadow-lg" aria-label="Search" />') },
    { 'App.tsx': app('<Input aria-label="Search" />') }],
];

const write = (files) => {
  const dir = mkdtempSync(join(tmpdir(), 'altitude-source-check-'));
  for (const [name, text] of Object.entries(files)) { mkdirSync(dirname(join(dir, name)), { recursive: true }); writeFileSync(join(dir, name), text); }
  return dir;
};
const covered = new Set();
for (const [id, bad, good] of cases) {
  for (const [files, expect] of [[bad, true], [good, false]]) {
    const dir = write(files);
    try {
      const { findings } = scan(dir, { tokenNames });
      const hit = findings.some((f) => f.ruleId === id && (id !== 'ALT-SETUP-003' || f.kind === 'deterministic'));
      assert.equal(hit, expect, `${id} ${expect ? 'should catch' : 'should pass'}: ${JSON.stringify(files)}\n${JSON.stringify(findings, null, 1)}`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
  covered.add(id);
}
assert.deepEqual([...covered].sort(), Object.keys(RULES).sort(), 'every rule has a case');

// Every rule the scanner can report is explained in rules.json, with the same kind.
const rules = JSON.parse(readFileSync(resolve(root, 'project/framework/rules.json'), 'utf8')).rules;
for (const [id, { kind }] of Object.entries(RULES)) {
  const r = rules.find((x) => x.id === id);
  assert.ok(r, `${id} has an entry in rules.json`);
  assert.equal(r.diagnosticClass, kind, `${id}: rules.json diagnosticClass matches the scanner`);
}

// The CLI on a fixture app: exit 1 with a deterministic finding, 0 with only reviews; JSON states its scope.
const cli = resolve(root, 'scripts/altitude-cli.mjs');
const project = write({ 'package.json': '{"name":"fixture","private":true}', 'src/App.tsx': app('<Button variant="primary">OK</Button>') });
try {
  mkdirSync(join(project, 'node_modules'), { recursive: true });
  execFileSync('ln', ['-s', root, join(project, 'node_modules/altitude-design')]);
  let failed;
  try { execFileSync(process.execPath, [cli, 'check', '--json', '--cwd', project], { encoding: 'utf8' }); failed = false; }
  catch (e) { failed = true; const out = JSON.parse(e.stdout); assert.equal(out.ok, false); assert.ok(out.findings.some((f) => f.ruleId === 'ALT-COPY-001' && f.file === 'App.tsx' && f.line === 3)); assert.match(out.scope, /Not checked/); }
  assert.ok(failed, 'check exits non-zero on a deterministic finding');
  writeFileSync(join(project, 'src/App.tsx'), app('<Button variant="primary">Save changes</Button><Button variant="primary">Publish</Button>'));
  const out = JSON.parse(execFileSync(process.execPath, [cli, 'check', '--json', '--cwd', project], { encoding: 'utf8' }));
  assert.equal(out.ok, true, 'reviews alone pass');
  assert.ok(out.findings.every((f) => f.kind === 'contextual-review'));
} finally { rmSync(project, { recursive: true, force: true }); }

console.log(`source check: ${Object.keys(RULES).length} rules each catch their example and pass their counter-example; CLI exit codes and rules.json entries pass`);
