import test from 'node:test';
import assert from 'node:assert/strict';
import { makeMatrix, summarize, redactGuidance, assessRun } from './protocol.mjs';
test('pilot crosses two clients, two ordinary tasks and three isolated conditions', () => {
 const runs=makeMatrix(['codex','claude']);
 assert.equal(runs.length,12); assert.equal(new Set(runs.map(r=>r.id)).size,12);
 for(const client of ['codex','claude']) for(const task of ['settings','records']) assert.equal(runs.filter(r=>r.client===client&&r.task===task).length,3);
});
test('summary keeps unmeasured and failed generation separate from assessed product defects', () => {
 const s=summarize([{generation:'failed',metrics:{taskOutcome:null}},{generation:'complete',metrics:{taskOutcome:true,recovery:false}},{generation:'complete',metrics:{taskOutcome:null,recovery:null}}]);
 assert.deepEqual(s.generation,{failed:1,complete:2});
 assert.deepEqual(s.metrics.taskOutcome,{passed:1,failed:0,unmeasured:2});
 assert.deepEqual(s.metrics.recovery,{passed:0,failed:1,unmeasured:2});
});
test('guidance control removes executable examples without discarding conceptual requirements',()=> {
 assert.equal(redactGuidance('# Purpose\nPreserve input.\n```tsx\nuseEditRecord()\n```\n## Recovery\nRetry.'),'# Purpose\nPreserve input.\n[Executable example available in the full framework condition.]\n## Recovery\nRetry.');
});
test('assessment never treats an agent claim or a launch as proof of product usability',()=>{
 const r=assessRun({exitCode:0,elapsedMs:100,stdout:'All accessible and working'});
 assert.equal(r.generation,'complete'); assert.equal(r.metrics.taskOutcome,null); assert.equal(r.metrics.accessibilityDefects,null);
 assert.equal(assessRun({exitCode:null,timedOut:true}).generation,'budget-exhausted');
});

import { stripPatternExports, traceUsage, sanitizeGuidance, runProcess } from './support.mjs';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
test('condition entry removes multiline, type, and same-line pattern exports without removing primitives', () => {
 const source = `/** docs */\nexport { Surface } from './core'; export type {\n EditRecordOptions\n} from "./pattern-edit-record";\nexport {useEditRecord} from './pattern-edit-record';\nexport type { Scheme } from './core';`;
 const out = stripPatternExports(source);
 assert.match(out, /Surface/); assert.match(out, /Scheme/); assert.doesNotMatch(out, /pattern-|EditRecordOptions|useEditRecord/);
});
test('guidance control excludes executable references and regenerates CLI integrity manifest', () => {
 const root = mkdtempSync(join(tmpdir(), 'alt-eval-test-'));
 try {
  mkdirSync(join(root, 'references'), {recursive:true});
  writeFileSync(join(root,'references','pattern.tsx'), 'export function useEditRecord() {}');
  writeFileSync(join(root,'README.md'), '# Intent\nPreserve drafts.\n```tsx\nuseEditRecord()\n```');
  writeFileSync(join(root,'index.json'), JSON.stringify({version:'1.0',references:{code:'references/pattern.tsx'},sourceHashes:{}}));
  writeFileSync(join(root,'manifest.json'), JSON.stringify({version:'1.0',files:{'README.md':'stale'}}));
  sanitizeGuidance(root);
  assert.equal(existsSync(join(root,'references')),false);
  assert.doesNotMatch(readFileSync(join(root,'README.md'),'utf8'), /useEditRecord\(\)/);
  assert.deepEqual(JSON.parse(readFileSync(join(root,'index.json'))).references, {});
  const manifest=JSON.parse(readFileSync(join(root,'manifest.json')));
  for(const [file,digest] of Object.entries(manifest.files)) assert.equal(createHash('sha256').update(readFileSync(join(root,file))).digest('hex'), digest);
 } finally {rmSync(root,{recursive:true,force:true});}
});
test('usage extraction reports only observed token and monetary values', () => {
 const codex=traceUsage('codex', '{"type":"turn.completed","usage":{"input_tokens":100,"cached_input_tokens":40,"output_tokens":10}}\n{"type":"turn.completed","usage":{"input_tokens":20,"output_tokens":5}}');
 assert.equal(codex.inputTokens,120); assert.equal(codex.outputTokens,15); assert.equal(codex.cachedInputTokens,40); assert.equal(codex.costUSD,null);
 const claude=traceUsage('claude', '{"type":"result","usage":{"input_tokens":100,"output_tokens":10,"cache_read_input_tokens":50,"cache_creation_input_tokens":20},"total_cost_usd":0.03}');
 assert.equal(claude.inputTokens,100); assert.equal(claude.cacheCreationInputTokens,20); assert.equal(claude.costUSD,0.03);
 assert.equal(traceUsage('codex','not a result').inputTokens,null);
});
test('process deadline terminates generation and records signal without waiting indefinitely', async()=>{
 const result=await runProcess(process.execPath,['-e','setInterval(()=>{},1000)'],process.cwd(),'',0.05);
 assert.equal(result.timedOut,true); assert.equal(result.exitCode,null); assert.equal(result.signal,'SIGTERM');
 assert.ok(result.elapsedMs<2000);
});
test('missing executable is a launch failure with no invented completion',async()=>{
 const result=await runProcess('/nonexistent-altitude-cli',[],process.cwd(),'',1);
 assert.match(result.launchError,/ENOENT/); assert.notEqual(result.exitCode,0);
});
test('timeout also terminates spawned children whose streams are already detached', async()=>{
 if(process.platform==='win32')return;
 const script=`const {spawn}=require('node:child_process');const child=spawn(process.execPath,['-e','process.on("SIGTERM",()=>{});setInterval(()=>{},100)'],{stdio:'ignore'});console.log(child.pid);setInterval(()=>{},100);`;
 const result=await runProcess(process.execPath,['-e',script],process.cwd(),'',0.2);
 const pid=Number(result.stdout.trim());assert.ok(pid>0);assert.equal(result.timedOut,true);
 await new Promise(resolve=>setTimeout(resolve,50));
 assert.throws(()=>process.kill(pid,0), /ESRCH/);
});
test('operator interruption preserves streamed evidence, marks abort and releases listeners',async()=>{
 const before=process.listenerCount('SIGTERM');let streamed='';
 const result=await runProcess(process.execPath,['-e','console.log("ready");setInterval(()=>{},100)'],process.cwd(),'',20,{stdout:data=>{streamed+=data;process.emit('SIGTERM');}});
 assert.equal(result.aborted,true);assert.equal(result.timedOut,false);assert.equal(result.interruptSignal,'SIGTERM');assert.match(streamed,/ready/);assert.equal(process.listenerCount('SIGTERM'),before);
 assert.equal(assessRun(result).generation,'aborted');
});
import {skillPaths,skillOverride} from './support.mjs';
test('Codex skill exclusions use exact catalog paths and safely quoted TOML values',()=>{
 const prompt=JSON.stringify([{content:[{text:'- sample (file: /tmp/one/SKILL.md)\n- other (file: /tmp/two/SKILL.md)\n- duplicate (file: /tmp/one/SKILL.md)'}]}]);
 assert.deepEqual(skillPaths(prompt),['/tmp/one/SKILL.md','/tmp/two/SKILL.md']);
 assert.equal(skillOverride(['/tmp/one/SKILL.md']),'skills.config=[{path="/tmp/one/SKILL.md",enabled=false}]');
});
