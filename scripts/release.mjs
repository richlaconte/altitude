// Decides what a push to main publishes to npm, so the package follows main without anyone bumping a version.
//   node scripts/release.mjs        prints the plan as JSON, and writes publish= and version= to $GITHUB_OUTPUT
//
// package.json's version is the release line's floor. If it's higher than anything on npm (someone bumped it to
// start 0.4.0, or 1.0.0), that version is published. Otherwise the package is built as the latest published version
// and packed, and if what would ship differs from what's on npm, the next patch is published. A push that changes
// nothing in the package (docs, evals, the site) publishes nothing. The build is deterministic, so identical
// sources pack to identical files.
//
// It leaves package.json as it found it; the workflow sets the version it prints before the real build.
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...opts });
const parse = (v) => v.split('-')[0].split('.').map(Number);
const compare = (a, b) => { const [x, y] = [parse(a), parse(b)]; for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
// npm 11 prints an array from `pack --json`, npm 12 an object keyed by package name.
const packed = (out) => { const o = JSON.parse(out); return Array.isArray(o) ? o[0] : Object.values(o)[0]; };
const nextPatch = (v) => { const [a, b, c] = parse(v); return `${a}.${b}.${c + 1}`; };

function published(name) {
  try {
    const out = JSON.parse(run('npm', ['view', name, 'versions', '--json']));
    return (Array.isArray(out) ? out : [out]).filter((v) => !v.includes('-'));
  } catch { return []; }
}

// Keys in a fixed order: `npm pkg set`, which the publish job runs, re-sorts some objects (peerDependencies).
const canonical = (v) => Array.isArray(v) ? v.map(canonical)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])])) : v;

// Every file in a packed tarball, hashed. package.json is compared as data, without the fields publishing sets.
function contents(tarball) {
  const dir = mkdtempSync(join(tmpdir(), 'altitude-pack-'));
  run('tar', ['-xzf', tarball, '-C', dir]);
  const root = join(dir, 'package');
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
  const files = {};
  for (const file of walk(root)) {
    let data = readFileSync(file);
    if (relative(root, file) === 'package.json') {
      const pkg = JSON.parse(data);
      for (const key of ['version', 'repository', 'homepage', 'gitHead']) delete pkg[key];
      data = JSON.stringify(canonical(pkg));
    }
    files[relative(root, file)] = createHash('sha256').update(data).digest('hex');
  }
  rmSync(dir, { recursive: true, force: true });
  return files;
}

function differences(a, b) {
  const names = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  return names.filter((n) => a[n] !== b[n]);
}

// For testing the comparison without the registry: --against <tarball> --as <version> stands in for npm's latest.
const flag = (name) => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
const against = flag('--against');

const pkgText = readFileSync('package.json', 'utf8');
const pkg = JSON.parse(pkgText);
const latest = against ? flag('--as') : published(pkg.name).sort(compare).at(-1);
let plan;

if (!latest || compare(pkg.version, latest) > 0) {
  plan = { publish: true, version: pkg.version, reason: latest ? `package.json starts ${pkg.version}, above ${latest} on npm` : 'nothing is published yet' };
} else {
  // Build exactly what would ship, labelled as the published version, and compare it with what's published.
  const work = mkdtempSync(join(tmpdir(), 'altitude-release-'));
  try {
    writeFileSync('package.json', pkgText.replace(`"version": "${pkg.version}"`, `"version": "${latest}"`));
    run('npm', ['run', 'build'], { stdio: ['ignore', 'ignore', 'inherit'] });
    // Both tarballs are named <name>-<latest>.tgz, so each gets its own folder.
    const [mine, theirs] = ['local', 'npm'].map((d) => { const p = join(work, d); mkdirSync(p); return p; });
    const local = packed(run('npm', ['pack', '--json', '--pack-destination', mine]));
    const remote = against || join(theirs, packed(run('npm', ['pack', `${pkg.name}@${latest}`, '--json', '--pack-destination', theirs])).filename);
    const changed = differences(contents(join(mine, local.filename)), contents(remote));
    plan = changed.length
      ? { publish: true, version: nextPatch(latest), reason: `${changed.length} packed files differ from ${latest}`, changed: changed.slice(0, 20) }
      : { publish: false, version: latest, reason: `the package is identical to ${latest} on npm` };
  } finally {
    writeFileSync('package.json', pkgText);
    rmSync(work, { recursive: true, force: true });
  }
}

console.log(JSON.stringify(plan, null, 2));
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `publish=${plan.publish}\nversion=${plan.version}\n`);
