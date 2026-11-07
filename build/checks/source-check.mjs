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
// A Recharts file and an Altitude file, as generated apps write them.
const rc = (body) => `import { BarChart, LineChart, Bar, Line, YAxis } from 'recharts';\nexport function Chart({ d }) { return (\n${body}\n); }\n`;
const alt = (body) => `import { ChartContainer, BarChart, LineChart, CardTitle, Badge } from 'altitude-design';\nexport function App({ d, c, props }) { return (<>\n${body}\n</>); }\n`;
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
  // An arbitrary literal is a palette class too, though the line also holds a colour literal (#588).
  ['ALT-TOKEN-001',
    { 'App.tsx': "import 'altitude-design/altitude.css';\nimport { AltitudeProvider } from 'altitude-design';\nexport const App = () => (\n  <AltitudeProvider><p className=\"text-[#ff0000]\">Problem</p></AltitudeProvider>\n);" },
    { 'App.tsx': "import 'altitude-design/altitude.css';\nimport { AltitudeProvider } from 'altitude-design';\nexport const App = () => (\n  <AltitudeProvider><p className=\"text-[var(--critical)]\">Problem</p></AltitudeProvider>\n);" }],
  ['ALT-TOKEN-001',
    { 'index.html': '<style>\n  .card { background: #fafafa; }\n</style>\n<p style="color: #333">Hi</p>' },
    { 'index.html': '<style>\n  :root { --brand: #0f8a6b; }\n  .card { background: var(--surface-raised); }\n</style>\n<a href="#main">Skip to content</a>' }],
  ['ALT-TOKEN-001', { 'App.tsx': app('<p style={{ color: "#6b7280" }}>Hi</p>') }, { 'App.tsx': app('{/* altitude-ignore: ALT-TOKEN-001 partner logo colour */}\n<p style={{ color: "#6b7280" }}>Hi</p>') }],
  ['ALT-SETUP-002',
    { 'App.tsx': "import { Button } from 'altitude-design';\nexport const A = () => <AltitudeProvider><Button>Save changes</Button></AltitudeProvider>;" },
    { 'App.tsx': app('<Button>Save changes</Button>'), 'other.ts': 'export const x = 1;' }],
  // A type-only import is erased at compile time: it needs no stylesheet or provider (#584).
  ['ALT-SETUP-002',
    { 'options.ts': "import { type SelectOption, Select } from 'altitude-design';\nexport const choices: SelectOption[] = [{ value: 'a', label: 'A' }];" },
    { 'options.ts': "import type { SelectOption } from 'altitude-design';\nexport const choices: SelectOption[] = [{ value: 'a', label: 'A' }];", 'more.ts': "import { type SelectOption, type ButtonProps } from 'altitude-design';\nexport type { MenuItem } from 'altitude-design';" }],
  ['ALT-SETUP-003',
    { 'options.ts': "import 'altitude-design/altitude.css';\nimport { Select, type SelectOption } from 'altitude-design';\nexport const choices: SelectOption[] = [{ value: 'a', label: 'A' }];" },
    { 'options.ts': "import type { SelectOption } from 'altitude-design';\nexport const choices: SelectOption[] = [{ value: 'a', label: 'A' }];" }],
  ['ALT-SETUP-003',
    { 'App.tsx': "import 'altitude-design/altitude.css';\nimport { Button } from 'altitude-design';\nexport const A = () => <Button>Save changes</Button>;" },
    { 'App.tsx': app('<Button>Save changes</Button>') }],
  // An aliased provider is the same provider (#582).
  ['ALT-SETUP-003',
    { 'App.tsx': "import 'altitude-design/altitude.css';\nimport { AltitudeProvider as Provider, Button } from 'altitude-design';\n\nexport function App() {\n  return <Button>Save changes</Button>;\n}" },
    { 'App.tsx': "import 'altitude-design/altitude.css';\nimport { AltitudeProvider as Provider, Button } from 'altitude-design';\n\nexport function App() {\n  return <Provider><Button>Save changes</Button></Provider>;\n}" }],
  ['ALT-CHART-001',
    { 'Chart.tsx': "import { PieChart, Pie } from 'recharts';" },
    { 'Chart.tsx': "import { BarChart } from 'altitude-design';" }],
  ['ALT-CHART-001', { 'chart.ts': "new Chart(el, { type: 'doughnut', data });" }, { 'chart.ts': "new Chart(el, { type: 'bar', data });" }],
  // A namespace import (import * as A from 'altitude-design') is as common in generated apps as named imports.
  ['ALT-SETUP-003',
    { 'main.tsx': "import 'altitude-design/altitude.css';\nimport * as A from 'altitude-design';\nexport const App = () => <A.Button>Save changes</A.Button>;" },
    { 'main.tsx': "import 'altitude-design/altitude.css';\nimport * as A from 'altitude-design';\nroot.render(<A.AltitudeProvider><App/></A.AltitudeProvider>);" }],
  // The chart rules (#540). Recharts files are written as generated apps write them, shadcn/ui's ChartContainer included.
  ['ALT-CHART-002',
    { 'Chart.tsx': rc('<LineChart data={d} title="Errors and latency">\n  <YAxis yAxisId="left" />\n  <YAxis yAxisId="right" orientation="right" />\n  <Line dataKey="errors" yAxisId="left" isAnimationActive={false} />\n</LineChart>') },
    { 'Chart.tsx': rc('<LineChart data={d} title="Errors">\n  <YAxis />\n  <Line dataKey="errors" isAnimationActive={false} />\n</LineChart>') }],
  ['ALT-CHART-003',
    { 'Chart.tsx': rc('<BarChart data={d} aria-label="Revenue">\n  <YAxis domain={["dataMin", "dataMax"]} />\n  <Bar dataKey="v" isAnimationActive={false} />\n</BarChart>') },
    { 'Chart.tsx': rc('<BarChart data={d} aria-label="Revenue">\n  <YAxis domain={[0, "dataMax"]} />\n  <Bar dataKey="v" isAnimationActive={false} />\n</BarChart>'), 'Dots.tsx': rc('<LineChart data={d} title="Temp">\n  <YAxis domain={["dataMin", "dataMax"]} />\n  <Line dataKey="t" isAnimationActive={false} />\n</LineChart>') }],
  ['ALT-CHART-003',
    { 'App.tsx': alt('<ChartContainer title="Seats" config={c} yDomain={[40, 100]}>\n  <BarChart data={d} x="plan" />\n</ChartContainer>') },
    { 'App.tsx': alt('<ChartContainer title="Temperature" config={c} yDomain={[40, 100]}>\n  <LineChart data={d} x="day" />\n</ChartContainer>') }],
  ['ALT-CHART-004',
    { 'Chart.tsx': rc('<BarChart data={d} title="Revenue">\n  <defs><linearGradient id="g" /></defs>\n  <Bar dataKey="v" fill="url(#g)" isAnimationActive={false} />\n</BarChart>') },
    { 'Chart.tsx': rc('<BarChart data={d} title="Revenue">\n  <Bar dataKey="v" fill="var(--data-1)" radius={[4, 4, 0, 0]} isAnimationActive={false} />\n</BarChart>') }],
  ['ALT-CHART-004',
    { 'Chart.tsx': rc('<BarChart data={d} title="Revenue">\n  <Bar dataKey="v" radius={8} isAnimationActive={false} />\n</BarChart>') },
    { 'Chart.tsx': rc('<BarChart data={d} title="Revenue">\n  <Bar dataKey="v" radius={[8, 8, 0, 0]} isAnimationActive={false} />\n</BarChart>') }],
  ['ALT-CHART-004',
    { 'App.tsx': alt('<ChartContainer title="Seats" config={c}>\n  <BarChart data={d} x="plan" style={{ filter: "drop-shadow(0 2px 4px var(--ink))" }} />\n</ChartContainer>') },
    { 'App.tsx': alt('<ChartContainer title="Seats" config={c}>\n  <BarChart data={d} x="plan" />\n</ChartContainer>') }],
  ['ALT-CHART-005',
    { 'App.tsx': alt('<ChartContainer title="Seats" config={{ seats: { label: "Seats", color: "accent" } }}>\n  <BarChart data={d} x="plan" />\n</ChartContainer>') },
    { 'App.tsx': alt('<ChartContainer title="Seats" config={{ seats: { label: "Seats", color: "data-2" } }}>\n  <BarChart data={d} x="plan" />\n</ChartContainer>\n<Badge tone="critical">Failed</Badge>') }],
  ['ALT-CHART-005',
    { 'globals.css': ':root {\n  --chart-1: oklch(0.646 0.222 41.116);\n  --chart-2: var(--accent);\n}' },
    { 'globals.css': ':root {\n  --chart-1: var(--data-1);\n  --chart-2: var(--data-2);\n}' }],
  ['ALT-CHART-005',
    { 'Chart.tsx': rc('<LineChart data={d} title="Signups">\n  <Line dataKey="v" stroke="var(--accent)" isAnimationActive={false} />\n</LineChart>') },
    { 'Chart.tsx': rc('<LineChart data={d} title="Signups">\n  <Line dataKey="v" stroke="var(--data-1)" isAnimationActive={false} />\n</LineChart>') }],
  ['ALT-CHART-006',
    { 'App.tsx': alt('<ChartContainer config={c}>\n  <BarChart data={d} x="plan" />\n</ChartContainer>') },
    { 'App.tsx': alt('<CardTitle id="s">Seats</CardTitle>\n<ChartContainer aria-labelledby="s" config={c}>\n  <BarChart data={d} x="plan" />\n</ChartContainer>\n<ChartContainer title="Seats" config={c}><BarChart data={d} x="plan" /></ChartContainer>\n<ChartContainer {...props} />') }],
  ['ALT-CHART-006',
    { 'Chart.tsx': rc('<BarChart data={d} accessibilityLayer={false} title="Revenue">\n  <Bar dataKey="v" isAnimationActive={false} />\n</BarChart>') },
    { 'Chart.tsx': rc('<BarChart data={d} accessibilityLayer title="Revenue">\n  <Bar dataKey="v" isAnimationActive={false} />\n</BarChart>') }],
  ['ALT-CHART-007',
    { 'Chart.tsx': rc('<BarChart data={d} title="Revenue">\n  <Bar dataKey="v" />\n</BarChart>') },
    { 'Chart.tsx': rc('<BarChart data={d} title="Revenue">\n  <Bar dataKey="v" isAnimationActive={false} />\n  <Bar dataKey="w" isAnimationActive={!reduced && !firstRender} />\n</BarChart>') }],
  ['ALT-CHART-007',
    { 'Chart.tsx': rc('<BarChart data={d} title="Revenue">\n  <Bar dataKey="v" isAnimationActive animationBegin={300} />\n</BarChart>') },
    { 'Chart.tsx': rc('<BarChart data={d} title="Revenue">\n  {/* altitude-ignore: ALT-CHART-007 a deliberate onboarding reveal */}\n  <Bar dataKey="v" />\n</BarChart>') }],
  ['ALT-CHART-008',
    { 'Report.tsx': alt('<main>\n  <ChartContainer title="Daily signups" config={c}>\n    <LineChart data={d} x="day" />\n  </ChartContainer>\n</main>') },
    { 'Report.tsx': alt('<main>\n  <ChartContainer title="Daily signups" takeaway="Signups doubled after the pricing change" config={c}>\n    <LineChart data={d} x="day" />\n  </ChartContainer>\n</main>'), 'Dashboard.tsx': alt('<section>\n  <ChartContainer title="Daily signups" config={c}><LineChart data={d} x="day" /></ChartContainer>\n</section>') }],
  ['ALT-CHART-009',
    { 'App.tsx': alt('<ChartContainer title="Requests" config={{ eu: { label: "EU" }, us: { label: "US" }, apac: { label: "APAC" } }}>\n  <LineChart data={d} x="day" />\n</ChartContainer>') },
    { 'App.tsx': alt('<ChartContainer title="Requests" config={{ eu: { label: "EU" }, us: { label: "US" }, apac: { label: "APAC" } }}>\n  <LineChart data={d} x="day" focus={["eu"]} />\n</ChartContainer>') }],
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
  // A minimal installed package: what the CLI reads to locate itself. CI's checks jobs don't build dist/, and this
  // tests the command from source (the packed consumer check runs the built one).
  const pkg = join(project, 'node_modules/altitude-design');
  mkdirSync(join(pkg, 'dist/guidance'), { recursive: true });
  writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: 'altitude-design', version: '0.0.0' }));
  writeFileSync(join(pkg, 'dist/guidance/index.json'), JSON.stringify({ version: '0.0.0', patterns: [], components: [] }));
  writeFileSync(join(pkg, 'dist/tokens.css'), ':root { --ink: #12161f; --accent: #2b56d6; }');
  let failed;
  try { execFileSync(process.execPath, [cli, 'check', '--json', '--cwd', project], { encoding: 'utf8' }); failed = false; }
  catch (e) { failed = true; const out = JSON.parse(e.stdout); assert.equal(out.ok, false); assert.ok(out.findings.some((f) => f.ruleId === 'ALT-COPY-001' && f.file === 'App.tsx' && f.line === 3)); assert.match(out.scope, /Not checked/); }
  assert.ok(failed, 'check exits non-zero on a deterministic finding');
  writeFileSync(join(project, 'src/App.tsx'), app('<Button variant="primary">Save changes</Button><Button variant="primary">Publish</Button>'));
  const out = JSON.parse(execFileSync(process.execPath, [cli, 'check', '--json', '--cwd', project], { encoding: 'utf8' }));
  assert.equal(out.ok, true, 'reviews alone pass');
  assert.ok(out.findings.every((f) => f.kind === 'contextual-review'));

  // Checking a subtree verifies setup across the project: the entry's stylesheet and provider count (#583), and a
  // project with neither still fails, while other rules report only inside the subtree.
  writeFileSync(join(project, 'src/App.tsx'), "import 'altitude-design/altitude.css';\nimport { AltitudeProvider } from 'altitude-design';\nimport { Tile } from './components/Tile';\nexport const App = () => <AltitudeProvider><Tile /></AltitudeProvider>;\n");
  mkdirSync(join(project, 'src/components'), { recursive: true });
  writeFileSync(join(project, 'src/components/Tile.tsx'), "import { Card } from 'altitude-design';\nexport const Tile = () => <Card>Record</Card>;\n");
  writeFileSync(join(project, 'src/Other.tsx'), "import { Button } from 'altitude-design';\nexport const Other = () => <Button variant=\"primary\">OK</Button>;\n");
  const sub = JSON.parse(execFileSync(process.execPath, [cli, 'check', 'src/components', '--json', '--cwd', project], { encoding: 'utf8' }));
  assert.equal(sub.ok, true, `a subtree whose app is set up at its entry passes: ${JSON.stringify(sub.findings)}`);
  assert.equal(sub.target, join('src', 'components'));
  assert.deepEqual(sub.findings, [], 'findings outside the subtree (ALT-COPY-001 in Other.tsx) are not reported');
  writeFileSync(join(project, 'src/App.tsx'), "import { Tile } from './components/Tile';\nexport const App = () => <Tile />;\n");
  rmSync(join(project, 'src/Other.tsx'));
  try { execFileSync(process.execPath, [cli, 'check', 'src/components', '--json', '--cwd', project], { encoding: 'utf8' }); assert.fail('a subtree in a project with no setup fails'); }
  catch (e) { const bad = JSON.parse(e.stdout); assert.deepEqual(bad.findings.map((f) => f.ruleId).sort(), ['ALT-SETUP-002', 'ALT-SETUP-003']); assert.match(bad.findings[0].observed, /in the project/); }
} finally { rmSync(project, { recursive: true, force: true }); }

console.log(`source check: ${Object.keys(RULES).length} rules each catch their example and pass their counter-example; CLI exit codes and rules.json entries pass`);
