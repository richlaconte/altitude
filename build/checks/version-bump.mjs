// scripts/check-version-bump.mjs asks for a version bump whenever a change reaches what altitude-design ships,
// including the scripts the package build bundles without naming them (#586: scripts/source-check.mjs goes into the
// CLI through scripts/altitude-cli.mjs) and the files the guidance copies into dist/guidance/references. Each case is
// one commit in a throwaway repository, checked against the commit before it. No browser, no network.
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const guard = join(root, 'scripts/check-version-bump.mjs');
const repo = mkdtempSync(join(tmpdir(), 'alt-version-'));
const git = (...args) => execFileSync('git', ['-c', 'user.name=check', '-c', 'user.email=check@example.invalid', ...args], { cwd: repo, encoding: 'utf8' });
const write = (file, text) => { mkdirSync(dirname(join(repo, file)), { recursive: true }); writeFileSync(join(repo, file), text); };
const pkg = (version) => JSON.stringify({ name: 'altitude-design', version, files: ['dist'] }, null, 2) + '\n';

try {
  git('init', '-q');
  write('package.json', pkg('1.0.0'));
  for (const f of ['README.md', 'scripts/source-check.mjs', 'build/examples.mjs', 'build/checks/source-check.mjs', 'build/previews.txt', 'project/README.md']) write(f, `// ${f}\n`);
  git('add', '-A');
  git('commit', '-qm', 'base');

  // [what the commit changes, files to write, whether the guard must ask for a bump]
  const cases = [
    ['the CLI\'s source checker (#586)', { 'scripts/source-check.mjs': 'Colours use the installed design tokens' }, true],
    ['build/examples.mjs, imported by the package build', { 'build/examples.mjs': 'changed' }, true],
    ['a check a framework rule cites, shipped as a guidance reference', { 'build/checks/source-check.mjs': 'changed' }, true],
    ['the preview catalogue', { 'build/previews.txt': 'changed' }, true],
    ['project/', { 'project/README.md': 'changed' }, true],
    ['docs only', { 'README.md': 'changed' }, false],
    ['a check nothing ships', { 'build/checks/not-cited-anywhere.mjs': 'new' }, false],
    ['the source checker with a version bump', { 'scripts/source-check.mjs': 'again', 'package.json': pkg('1.0.1') }, false],
  ];
  for (const [what, files, needsBump] of cases) {
    for (const [f, text] of Object.entries(files)) write(f, text);
    git('add', '-A');
    git('commit', '-qm', what);
    const run = spawnSync(process.execPath, [guard, 'HEAD^'], { cwd: repo, encoding: 'utf8' });
    assert.equal(run.status, needsBump ? 1 : 0, `${what}: expected exit ${needsBump ? 1 : 0}, got ${run.status}\n${run.stdout}${run.stderr}`);
    if (needsBump) assert.match(run.stderr, new RegExp(Object.keys(files)[0].replace(/[.]/g, '\\.')), `${what}: the failure names the file`);
    console.log(`ok  ${what}: ${needsBump ? 'bump required' : 'passes'}`);
  }
} finally {
  rmSync(repo, { recursive: true, force: true });
}
console.log('version-bump ok');
