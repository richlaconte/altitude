// Keep command evidence in ignored CI artifacts. A failed child remains a failed CI step.
// `--merge <dir>…` folds the evidence of parallel CI jobs (each its own alt-05) into one record, in the order the checks ran.
import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const [label, command, ...args] = process.argv.slice(2);
const merge = label === '--merge';
if (!label || (!command && !merge)) throw new Error('Usage: node scripts/record-check.mjs <label> <command> [arguments…] | --merge <evidence dir>…');
const out = fileURLToPath(new URL('../build/test/alt-05/', import.meta.url));
mkdirSync(out, { recursive: true });
let entries = [];
try { entries = JSON.parse(readFileSync(join(out, 'results.json'), 'utf8')).checks || []; } catch {}
const commandFixture = argv => argv.find(arg => arg.startsWith('ALT_FIXTURE_ROOT='))?.slice('ALT_FIXTURE_ROOT='.length);
let code = 0;
if (merge) {
  for (const dir of [command, ...args].filter(Boolean)) {
    if (!existsSync(join(dir, 'results.json'))) { console.log(`No evidence in ${dir}`); continue; }
    const part = JSON.parse(readFileSync(join(dir, 'results.json'), 'utf8')).checks || [];
    for (const file of readdirSync(dir)) if (file !== 'results.json' && file !== 'report.md') cpSync(join(dir, file), join(out, file), { recursive: true });
    entries = entries.filter(item => !part.some(p => p.label === item.label)).concat(part);
  }
  entries.sort((a, b) => a.startedAt.localeCompare(b.startedAt)); // each job is the old single job's timeline; together, one timeline
} else {
  const startedAt = new Date().toISOString();
  let output = '';
  const child = spawn(command, args, { cwd: process.cwd(), env: process.env, stdio: ['inherit', 'pipe', 'pipe'] });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { output += data.toString(); process.stdout.write(data); });
  code = await new Promise(resolve => { child.on('error', error => { output += error.stack; resolve(1); }); child.on('close', code => resolve(code ?? 1)); });
  const log = label.replace(/[^a-z0-9-]/gi, '-') + '.log';
  writeFileSync(join(out, log), output);
  const entry = { label, command: [command, ...args], cwd: process.cwd(), fixtureRoot: process.env.ALT_FIXTURE_ROOT || commandFixture(args) || (/checks\/(?:modal-lifecycle|inline-edit|actions-in-place)\.mjs/.test(args.join(' ')) ? fileURLToPath(new URL('../build/test/', import.meta.url)) : null), startedAt, finishedAt: new Date().toISOString(), exitCode: code, log };
  entries = entries.filter(item => item.label !== label).concat(entry);
}
// Correct metadata for earlier wrapper calls that supplied their environment through env.
entries = entries.map(item => ({ ...item, fixtureRoot: commandFixture(item.command) || (item.fixtureRoot === 'build/test (React 18)' ? (/checks\/(?:modal-lifecycle|inline-edit|actions-in-place)\.mjs/.test(item.command.join(' ')) ? fileURLToPath(new URL('../build/test/', import.meta.url)) : null) : item.fixtureRoot) }));
const gates = [
  'VoiceOver with Safari: real screen-reader task execution and announcement ordering not performed by automation.',
  'Windows screen reader/browser: unavailable on this macOS host; needs a qualified operator and versioned record.',
  'Real touch keyboard and magnification: browser touch emulation/layout inspection is not physical-device or human access testing.',
  'Six to eight formative sessions with counterbalanced baselines: recruitment, observations and accept/revise decision outstanding.'
];
const installedVersion = relative => { try { return JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8')).version; } catch { return 'unavailable'; } };
const environment = { react18: installedVersion('../build/node_modules/react/package.json'), react19: installedVersion('../node_modules/react/package.json') };
const browserVersions = [...new Set(entries.flatMap(e => { try { return [...readFileSync(join(out, e.log), 'utf8').matchAll(/Chromium ([0-9.]+)/g)].map(m => m[1]); } catch { return []; } }))];
let native = null; try { native = JSON.parse(readFileSync(join(out, 'native-browser-review.json'), 'utf8')); } catch {}
const environmentText = `React ${environment.react18} generated previews; React ${environment.react19} source fixtures and development StrictMode. Runtime Chromium: ${browserVersions.join(', ') || 'see command logs'}.\n\n` + (native ? `${native.browser}: actual ${native.zoom}; ${native.outerWindowLogicalPixels.join('×')} logical window; ${native.effectiveCSSViewport.join('×')} effective CSS viewport. [Native review and limitations](native-browser-review.json).\n\n` : 'Native zoom and human access checks are not executed by this CI wrapper. See the retained project validation record.\n\n');
writeFileSync(join(out, 'results.json'), JSON.stringify({ schemaVersion: 1, environment: { ...environment, browserVersions }, checks: entries, humanValidation: { status: 'open', gates } }, null, 2) + '\n');
writeFileSync(join(out, 'report.md'), '# Actions in place engineering evidence\n\nGenerated command evidence; no participant or screen-reader results are inferred.\n\n| Check | Exit | Log |\n|---|---:|---|\n' + entries.map(e => `| ${e.label} | ${e.exitCode} | [output](${e.log}) |`).join('\n') + '\n\n## Environment and limits\n\n' + environmentText + '## Open human-validation gates\n\n' + gates.map(g => '- ' + g).join('\n') + '\n');
process.exitCode = code;
