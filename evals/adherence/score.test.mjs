// The scorer measures what it says: a build that breaks each measure is counted, a clean one scores zero.
//   node --test evals/adherence/score.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PROBES, score } from './score.mjs';

function build(files) {
  const dir = mkdtempSync(join(tmpdir(), 'altitude-adherence-fixture-'));
  mkdirSync(join(dir, 'src'));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, 'src', name), text);
  writeFileSync(join(dir, 'run.json'), JSON.stringify({ condition: 'fixture', brief: 'settings-a' }));
  return dir;
}

test('a build that breaks every measure is counted on each', () => {
  const dir = build({
    'main.tsx': `import 'altitude-design/altitude.css';
import { AltitudeProvider, Button, Select, Field, MagicTable } from 'altitude-design';
import * as A from 'altitude-design';
export function App() {
  return <AltitudeProvider>
    <Field label="Region"><Select options={[{ value: 'iad', label: 'Virginia' }]} /></Field>
    <A.Sparkles />
    <p style={{ color: '#6b7280' }} className="text-zinc-500">Saved</p>
    <Button variant="primary">Submit</Button>
    <MagicTable />
  </AltitudeProvider>;
}
`,
  });
  try {
    const s = score(dir);
    assert.equal(s.condition, 'fixture');
    assert.equal(s.usesAltitude, true);
    assert.equal(s.api.unknownExports, 2, `MagicTable and A.Sparkles: ${s.api.details.join('\n')}`);
    assert.equal(s.api.unknownProps, 1, `Select options: ${s.api.details.join('\n')}`);
    assert.equal(s.colourLiterals, 1, 'one line with a literal and a palette class counts once');
    assert.equal(s.rules['ALT-COPY-001'], 1);
    assert.ok(s.errors >= 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a clean build scores zero', () => {
  const dir = build({
    'main.tsx': `import 'altitude-design/altitude.css';
import { AltitudeProvider, Button, Select, Field } from 'altitude-design';
import { Check } from 'lucide-react';
export function App() {
  return <AltitudeProvider>
    <Field label="Region"><Select items={[{ value: 'iad', label: 'Virginia' }]} /></Field>
    <p style={{ color: 'var(--ink-muted)' }}><Check /> Saved</p>
    <Button variant="primary">Save changes</Button>
  </AltitudeProvider>;
}
`,
  });
  try {
    const s = score(dir);
    assert.deepEqual([s.api.unknownExports, s.api.unknownProps, s.colourLiterals, s.errors, s.reviews], [0, 0, 0, 0, 0], JSON.stringify(s, null, 1));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an app that does not use Altitude gets no API score, but its colours still count', () => {
  const dir = build({ 'index.html': '<style>.btn { background: #2563eb; color: #fff; }</style><button class="btn">Save changes</button>' });
  try {
    const s = score(dir);
    assert.equal(s.usesAltitude, false);
    assert.equal(s.api, null);
    assert.equal(s.colourLiterals, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('used counts the Altitude API a build reaches for, and gives the per-100 rates their denominator', () => {
  const dir = build({
    'main.tsx': `import { AltitudeProvider, Button, Card, Fake } from 'altitude-design';
import * as A from 'altitude-design';
export function App() {
  return <AltitudeProvider><Card><Button>Save changes</Button><Button variant="ghost">Cancel</Button></Card><A.Badge>New</A.Badge><Fake /></AltitudeProvider>;
}
`,
  });
  try {
    const s = score(dir);
    assert.deepEqual(s.used.names, ['AltitudeProvider', 'Badge', 'Button', 'Card', 'Fake']);
    assert.equal(s.used.identifiers, 5);
    assert.equal(s.used.elements, 6, 'AltitudeProvider, Card, two Buttons, A.Badge and Fake');
    assert.equal(s.api.unknownExports, 1);
    assert.equal(s.rates.unknownExportsPer100, 20);
    assert.equal(s.rates.unknownPropsPer100, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('handRolled counts raw controls in an Altitude app, and nothing in one that uses the components', () => {
  const avoid = build({
    'main.tsx': `import { AltitudeProvider } from 'altitude-design';
export function App() {
  return <AltitudeProvider><input type="text" /><select><option>EU</option></select><button>Save changes</button><table><tbody /></table><div role="dialog" /></AltitudeProvider>;
}
`,
  });
  const use = build({
    'main.tsx': `import { AltitudeProvider, Button, Input } from 'altitude-design';
export function App() { return <AltitudeProvider><Input aria-label="Name" /><Button>Save changes</Button></AltitudeProvider>; }
`,
  });
  try {
    const a = score(avoid), b = score(use);
    assert.equal(a.handRolled.total, 5, JSON.stringify(a.handRolled));
    assert.deepEqual(a.handRolled.byElement, { input: 1, select: 1, button: 1, table: 1, 'role="dialog"': 1 });
    assert.equal(b.handRolled.total, 0, 'Altitude components (<Input>, <Button>) are not raw controls');
  } finally { rmSync(avoid, { recursive: true, force: true }); rmSync(use, { recursive: true, force: true }); }
});

test('the Meter format probe (#447) catches words after the number, and leaves a number format alone', () => {
  const probe = PROBES.find((p) => p.id === 'meter-format-words');
  assert.equal(probe.test('<Meter label="Seats" value={12} max={40} format={(v) => `${v} of 40 seats used`} />'), 1);
  assert.equal(probe.test('<Meter label="Context" value={used} max={max} format={(n) => n + " tokens used"} />'), 1);
  assert.equal(probe.test('<Meter label="Storage" value={42} max={100} format={(v) => `${v}%`} />'), 0);
  assert.equal(probe.test('<Meter label="Storage" value={4.2} max={10} format={(v) => `${v.toFixed(1)} GB`} />'), 0, 'a unit is not words');
  assert.equal(probe.test('<Stat label="Seats" format={(v) => `${v} of 40 seats used`} />'), 0, 'only Meter');
  const dir = build({ 'main.tsx': `import { Meter } from 'altitude-design';\nexport const M = () => <Meter label="Seats" value={12} max={40} format={(v) => \`\${v} of 40 seats used\`} />;\n` });
  try { assert.equal(score(dir).probes['meter-format-words'], 1); } finally { rmSync(dir, { recursive: true, force: true }); }
});
