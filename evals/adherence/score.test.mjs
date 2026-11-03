// The scorer measures what it says: a build that breaks each measure is counted, a clean one scores zero.
//   node --test evals/adherence/score.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { score } from './score.mjs';

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
