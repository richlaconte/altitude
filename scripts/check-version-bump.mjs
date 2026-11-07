// Fails when a change alters what the npm package ships but package.json's version didn't go up.
//
//   node scripts/check-version-bump.mjs <base>
//
// <base> is a commit or ref: the pull request's base branch, or on a push to main the commit before the push.
// The package is built from project/, a few scripts and the files its guidance cites (see SHIPPED below), so a change
// to any of those, or to the fields of package.json that reach consumers, needs a higher version than <base> has.
// Two pull requests can bump to the same version and both pass; the publish job runs this again on main to catch it.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inputs as guidanceInputs } from './build-guidance.mjs';

const base = process.argv[2];
if (!base) {
  console.error('usage: node scripts/check-version-bump.mjs <base commit or ref>');
  process.exit(2);
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Every script the package build runs or bundles: scripts/build-package.mjs, the CLI it bundles into dist/cli
// (scripts/altitude-cli.mjs), and every local module either imports, followed transitively (so the CLI's
// scripts/source-check.mjs, scripts/build-guidance.mjs, scripts/component-index.mjs, scripts/tokens-css.mjs and
// build/examples.mjs are all found without being listed). Read from the files themselves, so a new import is covered.
function localModules(entries) {
  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file) || !existsSync(resolve(root, file))) return;
    seen.add(file);
    const text = readFileSync(resolve(root, file), 'utf8');
    for (const m of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"](\.{1,2}\/[^'"]+)['"]/g)) {
      visit(relative(root, resolve(root, dirname(file), m[1])).replaceAll('\\', '/'));
    }
  };
  entries.forEach(visit);
  return [...seen];
}

// What the package build reads besides those scripts, from scripts/build-package.mjs and scripts/build-guidance.mjs:
// all of project/, the agent setup guide, the preview catalogue (each component's @example and group, and a
// source hash in dist/guidance/index.json), and every file a framework pattern or rule cites, which buildGuidance()
// copies into dist/guidance/references (checks and fixtures among them). The references come from the same inputs()
// the guidance build uses, so they can't drift from it.
const SHIPPED = [
  'project/',
  'docs/framework/AGENT-SETUP.md',
  'build/previews.txt',
  ...localModules(['scripts/build-package.mjs', 'scripts/altitude-cli.mjs']),
  ...guidanceInputs().refs,
];
// package.json fields that change what an installed copy is or does.
const PACKAGE_FIELDS = ['name', 'type', 'main', 'module', 'types', 'exports', 'bin', 'files', 'sideEffects', 'dependencies', 'peerDependencies', 'peerDependenciesMeta', 'engines'];

const head = JSON.parse(readFileSync('package.json', 'utf8'));
const before = JSON.parse(git('show', `${base}:package.json`));

const changed = git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean);
const files = changed.filter((f) => SHIPPED.some((p) => (p.endsWith('/') ? f.startsWith(p) : f === p)));
const fields = PACKAGE_FIELDS.filter((k) => JSON.stringify(head[k]) !== JSON.stringify(before[k]));

if (files.length === 0 && fields.length === 0) {
  console.log(`version: nothing the package ships changed since ${base}; no bump needed.`);
  process.exit(0);
}

// x.y.z with an optional -prerelease; a release outranks its own prereleases.
function parse(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(v);
  if (!m) throw new Error(`not a version: ${v}`);
  return { core: [+m[1], +m[2], +m[3]], pre: m[4] ?? null };
}
function greater(a, b) {
  const x = parse(a), y = parse(b);
  for (let i = 0; i < 3; i++) if (x.core[i] !== y.core[i]) return x.core[i] > y.core[i];
  if (x.pre === y.pre) return false;
  if (x.pre === null) return true;
  if (y.pre === null) return false;
  return x.pre.localeCompare(y.pre, 'en', { numeric: true }) > 0;
}

if (greater(head.version, before.version)) {
  console.log(`version: ${before.version} -> ${head.version}; the package changed and the version went up.`);
  process.exit(0);
}

const shown = files.slice(0, 8).map((f) => `  ${f}`);
if (files.length > shown.length) shown.push(`  …and ${files.length - shown.length} more`);
if (fields.length) shown.push(`  package.json: ${fields.join(', ')}`);
console.error(`version: this changes what altitude-design ships, but the version is still ${head.version} (it was ${before.version} at ${base}).

${shown.join('\n')}

Bump it in this change, then commit package.json and package-lock.json:

  npm version patch --no-git-tag-version   # a fix, or a change nobody should notice
  npm version minor --no-git-tag-version   # a new component, prop, variant or behaviour

Before 1.0, a change that breaks existing use is also a minor bump; say what breaks in the pull request.
If main moved to a higher version while this was open, bump again from there. See CONTRIBUTING.md ("Versions").`);
process.exit(1);
