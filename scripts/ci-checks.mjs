// Runs CI's browser checks, or one shard of them:  node scripts/ci-checks.mjs [<shard>/<shards>] [--plan | --check]
// The work is in build/checks/ci.json: every preview rendered in each scheme, the focused renders, and the interaction
// checks against the React 18 previews and the React 19 and React 19 StrictMode fixtures. Each command is the one
// ci.yml used to run line by line, with the same working directory, environment and record-check.mjs wrapper.
// Shards take about equal time and are stable: the same manifest always splits the same way. A failure doesn't stop
// the shard; the rest still run, and the shard fails at the end. With no shard, everything runs, as CI does across all
// of them. Needs build/SETUP.md's one-time setup (test/tokens.css and React) and Playwright's Chromium.
//   --plan   print what each shard runs, and its expected time
//   --check  only check that every file in build/checks runs somewhere
//   --labels print the record-check.mjs label of every check that keeps evidence, one per line
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const build = join(root, 'build'), test = join(build, 'test');
const ci = JSON.parse(readFileSync(join(build, 'checks/ci.json'), 'utf8'));
const args = process.argv.slice(2);
const gh = !!process.env.GITHUB_ACTIONS;

// Every check file runs somewhere: here as a React 18 check, or in the file `elsewhere` names, which must name it back.
const files = readdirSync(join(build, 'checks')).filter((f) => f.endsWith('.mjs')).map((f) => f.slice(0, -4)).sort();
const problems = [];
for (const [name, by] of Object.entries(ci.elsewhere)) {
  if (!files.includes(name)) problems.push(`ci.json: elsewhere lists ${name}, but there's no build/checks/${name}.mjs`);
  else if (!existsSync(join(root, by)) || !readFileSync(join(root, by), 'utf8').includes(`${name}.mjs`)) problems.push(`ci.json: elsewhere says ${by} runs ${name}.mjs, but ${by} doesn't name it`);
}
for (const name of [...ci.react18.unrecorded, ...Object.keys(ci.react18.labels), ...ci.react19.checks, ...ci.strict.checks, ...Object.keys(ci.short)])
  if (!files.includes(name)) problems.push(`ci.json names ${name}, but there's no build/checks/${name}.mjs`);

const label = (suite, name) => ci[suite].labels?.[name] ?? `${suite}-${ci.short[name] ?? name}`;
const items = [
  ...ci.previews.schemes.map((scheme) => ({ id: `previews-${scheme}`, cwd: build, run: [{ argv: ['shoot.mjs', '', scheme, String(ci.previews.width)] }] })),
  { id: 'renders', cwd: build, run: ci.renders.commands.map(({ env, args }) => ({ argv: ['shoot.mjs', ...args], env })), evidence: ci.renders.evidence },
  ...files.filter((name) => !(name in ci.elsewhere)).map((name) => ci.react18.unrecorded.includes(name)
    ? { id: `react18-${name}`, cwd: build, run: [{ argv: [`checks/${name}.mjs`] }] }
    : { id: label('react18', name), cwd: build, run: [{ argv: ['../scripts/record-check.mjs', label('react18', name), 'node', `checks/${name}.mjs`] }] }),
  ...['react19', 'strict'].flatMap((suite) => ci[suite].checks.map((name) => ({
    id: label(suite, name), suite, cwd: root, env: { ALT_FIXTURE_ROOT: join(test, ci[suite].fixtures) },
    run: [{ argv: ['scripts/record-check.mjs', label(suite, name), 'node', `build/checks/${name}.mjs`] }],
  }))),
];
for (const [i, item] of items.entries()) if (items.findIndex((other) => other.id === item.id) !== i) problems.push(`two checks are both called ${item.id}`);

// Longest first, each to the least loaded shard; then each shard runs in manifest order.
const seconds = (item) => ci.seconds[item.id] ?? 10;
const plan = (n) => {
  const shards = Array.from({ length: n }, () => ({ items: [], seconds: 0 }));
  for (const item of [...items].sort((a, b) => seconds(b) - seconds(a) || a.id.localeCompare(b.id))) {
    const shard = shards.reduce((least, s) => (s.seconds < least.seconds ? s : least));
    shard.items.push(item);
    shard.seconds += seconds(item);
  }
  for (const shard of shards) shard.items.sort((a, b) => items.indexOf(a) - items.indexOf(b));
  return shards;
};

if (problems.length) {
  for (const p of problems) console.error(gh ? `::error::${p}` : p);
  process.exit(1);
}
const shardArg = args.find((a) => /^\d+\/\d+$/.test(a));
const [k, n] = shardArg ? shardArg.split('/').map(Number) : [1, 1];
if (!(k >= 1 && k <= n)) throw new Error(`No shard ${shardArg}`);
if (args.includes('--check')) {
  console.log(`Every file in build/checks runs: ${items.length} items here, ${Object.keys(ci.elsewhere).length} elsewhere.`);
  process.exit(0);
}
if (args.includes('--labels')) {
  for (const item of items) if (item.run.some(({ argv }) => argv[0].endsWith('record-check.mjs'))) console.log(item.id);
  process.exit(0);
}
if (args.includes('--plan')) {
  for (const [i, shard] of plan(n).entries()) console.log(`${i + 1}/${n}  ~${shard.seconds}s  ${shard.items.map((item) => item.id).join(' ')}`);
  process.exit(0);
}

const exec = (argv, cwd, env) => spawnSync(process.execPath, argv, { cwd, env: { ...process.env, ...env }, stdio: 'inherit' }).status === 0;
const mine = plan(n)[k - 1].items;
const started = Date.now();
// The pages the checks open, written without rendering them (rendering is the previews items' job).
if (!exec(['shoot.mjs', '', ci.previews.schemes.join(','), String(ci.previews.width)], build, { PAGES_ONLY: '1' })) throw new Error('Could not write the preview pages');
for (const suite of ['react19', 'strict']) if (mine.some((item) => item.suite === suite) && !exec(['scripts/build-check-fixtures.mjs'], root, suite === 'strict' ? { ALT_CHECK_STRICT: '1' } : {})) throw new Error(`Could not build the ${suite} fixtures`);

const failed = [];
for (const item of mine) {
  const t = Date.now();
  console.log(gh ? `::group::${item.id}` : `\n— ${item.id}`);
  const ok = item.run.every(({ argv, env }) => exec(argv, item.cwd, { ...item.env, ...env }));
  // Kept for the acceptance evidence before anything else in this shard renders the same names again.
  if (item.evidence) {
    mkdirSync(join(test, 'evidence-shots'), { recursive: true });
    for (const f of readdirSync(test)) if (item.evidence.some((name) => f.startsWith(`shot-${name}-`) && f.endsWith('.png'))) cpSync(join(test, f), join(test, 'evidence-shots', f));
  }
  console.log(`${ok ? 'passed' : 'FAILED'}: ${item.id} in ${Math.round((Date.now() - t) / 1000)}s`);
  if (gh) console.log('::endgroup::');
  if (!ok) { failed.push(item.id); if (gh) console.log(`::error::${item.id} failed`); }
}
console.log(`\n${mine.length - failed.length} of ${mine.length} passed in ${Math.round((Date.now() - started) / 1000)}s${shardArg ? ` (shard ${shardArg})` : ''}`);
if (failed.length) { console.log('Failed: ' + failed.join(', ')); process.exitCode = 1; }
