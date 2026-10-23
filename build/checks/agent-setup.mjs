// Exercises the actual packed-and-installed Node CLI and its two instruction adapters.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { root } from '../../scripts/build-guidance.mjs';
const dir=mkdtempSync(resolve(tmpdir(),'altitude-agent-setup-'));
try {
  const pack=JSON.parse(execFileSync('npm',['pack','--json','--pack-destination',dir],{cwd:root,encoding:'utf8'}))[0];
  writeFileSync(resolve(dir,'package.json'),'{"name":"altitude-setup-consumer","private":true,"version":"1.0.0"}\n');
  execFileSync('npm',['install','--ignore-scripts','--legacy-peer-deps','--no-audit','--no-fund',resolve(dir,pack.filename)],{cwd:dir,stdio:'pipe'});
  const cli=resolve(dir,'node_modules/altitude-design/dist/cli/altitude.mjs');
  assert.ok(existsSync(cli));
  function run(args,ok=true){const r=spawnSync(process.execPath,[cli,...args],{cwd:dir,encoding:'utf8'});assert.equal(r.status,ok?0:1,`${args}: ${r.stdout}\n${r.stderr}`);return JSON.parse(r.stdout);}
  const version=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8')).version;
  for(const [client,file]of [['codex','AGENTS.md'],['claude','CLAUDE.md']]) {
    const p=resolve(dir,file),original='# Existing instructions\r\nKeep this exact text without trailing newline';
    writeFileSync(p,original);
    const preview=run(['init','--client',client]);assert.equal(preview.mode,'preview');assert.equal(readFileSync(p,'utf8'),original);
    assert.ok(preview.changes[0].after.includes(`Altitude framework (${version})`));
    run(['init','--client',client,'--apply']);const installed=readFileSync(p,'utf8');assert.ok(installed.startsWith(original));
    const again=run(['init','--client',client,'--apply']);assert.equal(again.changes[0].action,'unchanged');assert.equal(readFileSync(p,'utf8'),installed);
    assert.ok(run(['doctor','--json']).ok);
    // Later user additions survive removal byte-for-byte.
    writeFileSync(p,installed+'\nLater project instructions.');
    run(['init','--client',client,'--remove']);assert.ok(readFileSync(p,'utf8').includes('altitude:start'));
    run(['init','--client',client,'--remove','--apply']);assert.equal(readFileSync(p,'utf8'),original+'\nLater project instructions.');
    rmSync(p);run(['init','--client',client,'--apply']);run(['init','--client',client,'--remove','--apply']);assert.ok(!existsSync(p),'remove newly created file');
    run(['init','--client',client,'--apply']);writeFileSync(p,readFileSync(p,'utf8').replace('For UI tasks','My changed content'));
    run(['init','--client',client,'--apply'],false);assert.equal(run(['doctor','--json'],false).ok,false);rmSync(p);
  }
  const discovery=run(['patterns','edit settings','--json']);assert.equal(discovery.patterns[0].id,'edit-record');assert.equal(discovery.version,version);
  assert.equal(run(['patterns','unmatched-gibberish','--json']).patterns.length,0);
  assert.equal(run(['explain','ALT-EDIT-001','--json']).diagnosticClass,'application-integration');
  run(['explain','unknown'],false);
  const report=run(['doctor','--json']);assert.ok(report.findings.some(f=>f.kind==='contextual-review'&&f.status==='unverified'));assert.ok(report.findings.some(f=>f.kind==='application-integration'));
  // Reject conflicting markers and symlinks without overwriting user-owned instructions.
  writeFileSync(resolve(dir,'AGENTS.md'),'<!-- altitude:start -->');run(['init','--client','all','--apply'],false);assert.ok(!existsSync(resolve(dir,'CLAUDE.md')));rmSync(resolve(dir,'AGENTS.md'));
  writeFileSync(resolve(dir,'outside.md'),'Keep');symlinkSync(resolve(dir,'outside.md'),resolve(dir,'AGENTS.md'));run(['init','--client','codex','--apply'],false);assert.equal(readFileSync(resolve(dir,'outside.md'),'utf8'),'Keep');rmSync(resolve(dir,'AGENTS.md'));
  // Dangling links must not create their destination through writeFileSync.
  symlinkSync(resolve(dir,'missing-target.md'),resolve(dir,'AGENTS.md'));run(['init','--client','codex','--apply'],false);assert.ok(!existsSync(resolve(dir,'missing-target.md')));rmSync(resolve(dir,'AGENTS.md'));
  // Codex gives nonempty overrides precedence over AGENTS.md in the same directory.
  writeFileSync(resolve(dir,'AGENTS.md'),'Ordinary instructions');writeFileSync(resolve(dir,'AGENTS.override.md'),'Active override');
  const overridden=run(['init','--client','codex','--apply']);assert.ok(overridden.changes[0].path.endsWith('AGENTS.override.md'));
  assert.equal(readFileSync(resolve(dir,'AGENTS.md'),'utf8'),'Ordinary instructions');assert.ok(run(['doctor','--json']).ok);
  run(['init','--client','codex','--remove','--apply']);assert.equal(readFileSync(resolve(dir,'AGENTS.override.md'),'utf8'),'Active override');
  rmSync(resolve(dir,'AGENTS.md'));rmSync(resolve(dir,'AGENTS.override.md'));
  // Removal finds owned blocks even after the client switches instruction targets.
  const ordinaryPath=resolve(dir,'AGENTS.md'),overridePath=resolve(dir,'AGENTS.override.md');
  const ordinary='Original ordinary instructions\r\nNo trailing newline',override='Later override instructions';
  writeFileSync(ordinaryPath,ordinary);run(['init','--client','codex','--apply']);
  writeFileSync(overridePath,override);
  const hiddenPreview=run(['init','--client','codex','--remove']);
  assert.ok(hiddenPreview.changes.some(change=>change.path.endsWith('/AGENTS.md')&&change.action==='update'));
  assert.ok(readFileSync(ordinaryPath,'utf8').includes('altitude:start'),'preview keeps inactive owned block');
  run(['init','--client','codex','--remove','--apply']);
  assert.equal(readFileSync(ordinaryPath,'utf8'),ordinary);assert.equal(readFileSync(overridePath,'utf8'),override);
  // A managed block may exist in both files after setup follows a newly added override.
  rmSync(overridePath);run(['init','--client','codex','--apply']);writeFileSync(overridePath,override);run(['init','--client','codex','--apply']);
  const bothPreview=run(['init','--client','codex','--remove']);
  assert.equal(bothPreview.changes.filter(change=>change.action==='update').length,2);
  const intactOrdinary=readFileSync(ordinaryPath,'utf8'),intactOverride=readFileSync(overridePath,'utf8');
  writeFileSync(ordinaryPath,intactOrdinary.replace('For UI tasks','User edited managed block'));
  run(['init','--client','codex','--remove','--apply'],false);
  assert.equal(readFileSync(overridePath,'utf8'),intactOverride,'invalid inactive block prevents partial removal');
  writeFileSync(ordinaryPath,intactOrdinary);run(['init','--client','codex','--remove','--apply']);
  assert.equal(readFileSync(ordinaryPath,'utf8'),ordinary);assert.equal(readFileSync(overridePath,'utf8'),override);
  assert.ok(run(['init','--client','codex','--remove','--apply']).changes.every(change=>change.action==='unchanged'));
  rmSync(ordinaryPath);rmSync(overridePath);
  // Version mismatch and changed source detection are deterministic failures.
  const indexPath=resolve(dir,'node_modules/altitude-design/dist/guidance/index.json'),originalIndex=readFileSync(indexPath,'utf8');
  const index=JSON.parse(originalIndex);index.version='0.0.0';writeFileSync(indexPath,JSON.stringify(index));assert.ok(run(['doctor','--json'],false).findings.some(f=>f.observed.includes('0.0.0')));writeFileSync(indexPath,originalIndex);
  const entry=resolve(dir,'node_modules/altitude-design/dist/guidance/README.md');writeFileSync(entry,'stale');assert.ok(run(['doctor','--json'],false).findings.some(f=>f.observed.includes('README.md')));
  console.log('agent setup: packed install, Codex + Claude preview/apply/idempotence/removal/preservation/discovery/diagnostics pass');
} finally {rmSync(dir,{recursive:true,force:true});}
