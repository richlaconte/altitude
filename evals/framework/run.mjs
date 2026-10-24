import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, cpSync, existsSync, readdirSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeMatrix, assessRun, summarize, protocolVersion, claudeAllowedTools } from './protocol.mjs';
import { runProcess, traceUsage, filesUnder, sha256 } from './support.mjs';
import { assessorFingerprint } from './evaluator/frozen.mjs';
const here=fileURLToPath(new URL('./',import.meta.url));
const args=process.argv.slice(2);
const option=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const manifest=JSON.parse(readFileSync(resolve(option('--packages','build/test/framework-eval-packages/manifest.json'))));
const out=resolve(option('--out','build/test/framework-pilot')); mkdirSync(out,{recursive:true});
const budgetSeconds=Number(option('--seconds','240'));
if(!Number.isFinite(budgetSeconds)||budgetSeconds<1)throw Error('Positive --seconds required');
const clients=option('--clients','codex,claude').split(',');
if(clients.some(client=>!['codex','claude'].includes(client))) throw Error('Supported clients: codex,claude');
const only=option('--only','');
// Repeated samples of a cell go to separate --out roots; the index is recorded so results can be pooled.
const sample=Number(option('--sample','1'));
if(!Number.isInteger(sample)||sample<1)throw Error('--sample must be a positive integer');
const matrix=makeMatrix(clients).filter(r=>!only||r.id.includes(only));
const models={codex:option('--codex-model','gpt-5.6-sol'),claude:option('--claude-model','claude-opus-5-5')};
const exclusionPath=option('--codex-skills','');
const skillIsolation=exclusionPath?JSON.parse(readFileSync(resolve(exclusionPath))):null;
// Frozen before any generation; assessing with a different fingerprint is reported as post-hoc.
const assessor=assessorFingerprint();
const results=[];
if(!matrix.length) throw Error('No pilot runs matched the selection');
for(const run of matrix){
 const evidence=join(out,run.id);
 if(existsSync(join(evidence,'run.json')))throw Error(`Refusing to overwrite completed evidence ${evidence}; use a new --out directory.`);
 mkdirSync(evidence,{recursive:true});
 const workspace=mkdtempSync(join(tmpdir(),'altitude-eval-'));
 const meta={...run,sample,protocolVersion,assessor,model:models[run.client],requestedModel:models[run.client],budget:{wallSeconds:budgetSeconds,followupWallSeconds:budgetSeconds,tokenLimit:null,reason:'Tool CLI exposes wall deadline; token usage recorded afterward, not silently treated as capped.'},workspace,primitiveHash:manifest.primitiveHash,package:manifest.packages[run.condition],primitiveArtifacts:manifest.primitiveArtifacts,isolation:{freshProcess:true,freshWorkspace:true,globalSkills:'Codex ignores user config, but host-global skill discovery may still occur; inspect traces. Claude uses project settings only. No assertion of hermetic model training or host isolation.'},startedAt:new Date().toISOString(),node:process.version};
 console.log(run.id,'setup-started',new Date().toISOString());
 try{
  meta.toolVersion=execFileSync(run.client,['--version'],{encoding:'utf8',timeout:15000}).trim();
  if(sha256(readFileSync(meta.package.tarball))!==meta.package.sha256)throw Error('Condition tarball differs from recorded manifest');
  mkdirSync(join(workspace,'src'));
  writeFileSync(join(workspace,'package.json'),JSON.stringify({name:'altitude-eval-consumer',private:true,type:'module',scripts:{build:'node build.mjs'},dependencies:{'altitude-design':manifest.packages[run.condition].tarball,react:'19.3.0','react-dom':'19.3.0'},devDependencies:{esbuild:'0.28.2'}}));
  execFileSync('npm',['install','--ignore-scripts','--no-audit','--no-fund'],{cwd:workspace,stdio:'pipe',timeout:120000});
  writeFileSync(join(workspace,'README.md'),'# Product workspace\nImplement the requested screen in src/main.tsx. React and Altitude are installed. Import altitude-design/altitude.no-fonts.css. npm run build creates dist/app.js and app.css. The host serves dist/index.html and the API endpoints in src/api.ts. Do not change the API interface.\n');
  writeFileSync(join(workspace,'src/api.ts'),`export type Workspace={name:string;email:string;description?:string};\nasync function request(path:string,options?:RequestInit){const response=await fetch(path,options);const body=await response.json();if(!response.ok)throw new Error(body.error||'Request failed');return body;}\nexport const getWorkspace=():Promise<Workspace>=>request('/api/workspace');\nexport const saveWorkspace=(value:Workspace):Promise<Workspace>=>request('/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});\nexport const getRecords=(query:string):Promise<{id:string;name:string}[]>=>request('/api/records?q='+encodeURIComponent(query));\n`);
  writeFileSync(join(workspace,'src/main.tsx'),`import * as React from 'react';import {createRoot} from 'react-dom/client';import {AltitudeProvider} from 'altitude-design';import 'altitude-design/altitude.no-fonts.css';function App(){return <main><h1>Workspace</h1></main>};createRoot(document.getElementById('root')!).render(<AltitudeProvider><App/></AltitudeProvider>);`);
  writeFileSync(join(workspace,'build.mjs'),`import {build} from 'esbuild';import{mkdirSync,writeFileSync}from'node:fs';mkdirSync('dist',{recursive:true});await build({entryPoints:['src/main.tsx'],bundle:true,outfile:'dist/app.js',jsx:'transform',define:{'process.env.NODE_ENV':'"production"'}});writeFileSync('dist/index.html','<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Workspace</title><link rel="stylesheet" href="app.css"></head><body><div id="root"></div><script src="app.js"></script></body></html>');`);
  execFileSync('git',['init','-q'],{cwd:workspace});
  if(run.condition!=='primitives'){
   const installed=JSON.parse(readFileSync(join(workspace,'node_modules/altitude-design/package.json')));
   const bin=typeof installed.bin==='string'?installed.bin:installed.bin.altitude;
   execFileSync(process.execPath,[join(workspace,'node_modules/altitude-design',bin),'init','--client',run.client,'--apply'],{cwd:workspace,stdio:'pipe',timeout:120000});
  }
  meta.setupInstructions=Object.fromEntries(['AGENTS.md','CLAUDE.md','.altitude/setup.json'].filter(file=>existsSync(join(workspace,file))).map(file=>[file,readFileSync(join(workspace,file),'utf8')]));
  const prompt=readFileSync(join(here,'briefs',run.task+'.txt'),'utf8');
  // All runs start fresh. No generation process is given this repository or evaluator files.
  const invocation=run.client==='codex'?['exec',...(skillIsolation?['-c',skillIsolation.config]:[]),'--ephemeral','--ignore-user-config','--sandbox','workspace-write','--json','--model',models.codex,'-']:['-p','--no-session-persistence','--output-format','stream-json','--verbose','--model',models.claude,'--permission-mode','acceptEdits','--allowedTools',claudeAllowedTools.join(','),'--setting-sources','project','--strict-mcp-config','--mcp-config','{"mcpServers":{}}'];
  meta.invocation={command:run.client,args:invocation};
  if(run.client==='codex'&&skillIsolation)meta.isolation={...meta.isolation,skillIsolation,globalSkills:'Explicit path exclusions verified with codex debug prompt-input. Project instructions remain active.'};
  const initialSourceHash=sha256(filesUnder(join(workspace,'src')).map(file=>readFileSync(file,'utf8')).join('\n'));
  meta.promptSHA256=sha256(prompt);meta.followupPromptSHA256=sha256(readFileSync(join(here,'briefs',run.task+'-followup.txt')));
  meta.phase='generation';
  console.log(run.id,'generation-started',models[run.client],`${budgetSeconds}s`,new Date().toISOString());
  writeFileSync(join(evidence,'started.json'),JSON.stringify(meta,null,2)+'\n');
  const first=await runProcess(run.client,invocation,workspace,prompt,budgetSeconds,{stdout:data=>appendFileSync(join(evidence,'generation.jsonl'),data),stderr:data=>appendFileSync(join(evidence,'generation.stderr.txt'),data)});
  writeFileSync(join(evidence,'generation.jsonl'),first.stdout);writeFileSync(join(evidence,'generation.stderr.txt'),first.stderr);
  Object.assign(meta,assessRun(first));
  meta.exitCode=first.exitCode;meta.signal=first.signal;meta.launchError=first.launchError;meta.usage=traceUsage(run.client,first.stdout);
  if(first.launchError)meta.generation='launch-failed';
  meta.sourceChanged=initialSourceHash!==sha256(filesUnder(join(workspace,'src')).map(file=>readFileSync(file,'utf8')).join('\n'));
  if(meta.generation==='complete'&&!meta.sourceChanged)meta.generation='incomplete-unchanged-artifact';
  try{execFileSync('npm',['run','build'],{cwd:workspace,stdio:'pipe',timeout:120000});meta.build='passed';}catch(e){meta.build='failed';writeFileSync(join(evidence,'build.txt'),String(e.stdout||'')+String(e.stderr||''));}
  if(meta.build==='passed'){
   cpSync(join(workspace,'src'),join(evidence,'initial-src'),{recursive:true});cpSync(join(workspace,'dist'),join(evidence,'initial-dist'),{recursive:true});
  }
  if(meta.build==='passed'&&meta.generation==='complete'){
   console.log(run.id,'followup-started',models[run.client],`${budgetSeconds}s`,new Date().toISOString());
   const follow=await runProcess(run.client,invocation,workspace,readFileSync(join(here,'briefs',run.task+'-followup.txt'),'utf8'),budgetSeconds,{stdout:data=>appendFileSync(join(evidence,'followup.jsonl'),data),stderr:data=>appendFileSync(join(evidence,'followup.stderr.txt'),data)});
   writeFileSync(join(evidence,'followup.jsonl'),follow.stdout);writeFileSync(join(evidence,'followup.stderr.txt'),follow.stderr);
   meta.followup={...assessRun(follow),exitCode:follow.exitCode,signal:follow.signal,launchError:follow.launchError,usage:traceUsage(run.client,follow.stdout)};
   if(follow.launchError)meta.followup.generation='launch-failed';
   try{execFileSync('npm',['run','build'],{cwd:workspace,stdio:'pipe',timeout:120000});meta.followup.build='passed';}catch{meta.followup.build='failed';}
  }
  cpSync(join(workspace,'src'),join(evidence,'final-src'),{recursive:true});
  if(existsSync(join(workspace,'dist')))cpSync(join(workspace,'dist'),join(evidence,'final-dist'),{recursive:true});
  const trace=first.stdout;
  meta.observed={guidanceReference:/guidance\/(?:README|patterns)|altitude patterns/.test(trace),sourceLines:filesUnder(join(workspace,'src')).filter(file=>/\.(?:[cm]?[jt]sx?|css)$/.test(file)).reduce((n,file)=>n+readFileSync(file,'utf8').split('\n').length,0),dependencies:JSON.parse(readFileSync(join(workspace,'package.json'))).dependencies};
 }catch(e){if(!meta.generation)meta.generation=meta.phase==='generation'?'harness-failed':'setup-failed';meta.error=String(e.message);}
 meta.finishedAt=new Date().toISOString();writeFileSync(join(evidence,'run.json'),JSON.stringify(meta,null,2)+'\n');results.push(meta);
 const completed=readdirSync(out,{withFileTypes:true}).filter(entry=>entry.isDirectory()&&existsSync(join(out,entry.name,'run.json'))).map(entry=>JSON.parse(readFileSync(join(out,entry.name,'run.json'))));
 const summaryPath=join(out,`summary-${run.id}.tmp`);
 writeFileSync(summaryPath,JSON.stringify({protocolVersion,assessor,sample,runs:completed,summary:summarize(completed)},null,2)+'\n');renameSync(summaryPath,join(out,'summary.json'));
 console.log(run.id,meta.generation,meta.build||'',meta.elapsedMs||'');
 if(meta.generation==='aborted'||meta.followup?.generation==='aborted')break;
}
