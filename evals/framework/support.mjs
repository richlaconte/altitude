import ts from 'typescript';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { redactGuidance } from './protocol.mjs';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export function filesUnder(directory) {
 return readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(entry=>entry.isDirectory()?filesUnder(join(directory,entry.name)):[join(directory,entry.name)]);
}
export function stripPatternExports(source) {
 const ast=ts.createSourceFile('index.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const removals=ast.statements.filter(node=>ts.isExportDeclaration(node)&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier)&&node.moduleSpecifier.text.startsWith('./pattern-'));
 for(const node of removals.reverse()) source=source.slice(0,node.getStart(ast))+source.slice(node.end);
 return source;
}
export function sanitizeGuidance(directory) {
 const original=JSON.parse(readFileSync(join(directory,'manifest.json'),'utf8'));
 // Snapshot TSX, example apps and test scripts otherwise give the guidance control the executable treatment.
 rmSync(join(directory,'references'),{recursive:true,force:true});
 for(const path of filesUnder(directory)) if(path.endsWith('.md')) writeFileSync(path,redactGuidance(readFileSync(path,'utf8')));
 const path=join(directory,'index.json'),index=JSON.parse(readFileSync(path,'utf8'));
 index.references={};
 index.evaluationCondition={name:'guidance',excluded:'Executable implementation, examples and checks. Source references in prose/metadata identify conceptual provenance only.',originalManifestSHA256:sha256(JSON.stringify(original))};
 writeFileSync(path,JSON.stringify(index,null,2)+'\n');
 const entry=join(directory,'README.md');
 writeFileSync(entry,`> Evaluation guidance condition: this package contains design contracts and primitive exports. Workflow hooks, executable examples and pattern checks are intentionally unavailable. Implement the contracts using the primitives; source paths in metadata describe provenance.\n\n${readFileSync(entry,'utf8')}`);
 // Doctor must validate the actual condition artifact, not intentionally transformed upstream bytes.
 const files=Object.fromEntries(filesUnder(directory).filter(path=>path!==join(directory,'manifest.json')).map(path=>[relative(directory,path).replaceAll('\\','/'),sha256(readFileSync(path))]));
 writeFileSync(join(directory,'manifest.json'),JSON.stringify({...original,files},null,2)+'\n');
}
export function traceUsage(client,trace) {
 const records=trace.split('\n').flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});
 const relevant=records.filter(record=>client==='codex'?record.type==='turn.completed'&&record.usage:record.type==='result'&&record.usage);
 // Claude result usage is session cumulative; Codex turn.completed is per turn.
 const entries=client==='claude'?relevant.slice(-1):relevant;
 const sum=key=>entries.some(entry=>Number.isFinite(entry.usage[key]))?entries.reduce((n,entry)=>n+(entry.usage[key]||0),0):null;
 const result={inputTokens:sum('input_tokens'),outputTokens:sum('output_tokens'),cachedInputTokens:sum(client==='claude'?'cache_read_input_tokens':'cached_input_tokens'),cacheCreationInputTokens:sum('cache_creation_input_tokens'),costUSD:null,sourceEvents:entries.length,observedModels:[...new Set(records.flatMap(record=>[record.model,record.message?.model,...Object.keys(record.modelUsage||{})]).filter(value=>typeof value==='string'))]};
 if(client==='claude'&&Number.isFinite(entries[0]?.total_cost_usd)) result.costUSD=entries[0].total_cost_usd;
 return result;
}
export function runProcess(command,argv,cwd,input,budget,output={}) {
 return new Promise(resolveRun=>{
  const start=Date.now();let stdout='',stderr='',timedOut=false,launchError=null,aborted=false,interruptSignal=null;
  const child=spawn(command,argv,{cwd,stdio:['pipe','pipe','pipe'],env:{...process.env,PATH:join(cwd,'node_modules/.bin')+(process.platform==='win32'?';':':')+(process.env.PATH||'')},detached:process.platform!=='win32'});
  const kill=signal=>{if(!child.pid)return;try{process.platform==='win32'?child.kill(signal):process.kill(-child.pid,signal);}catch{}};
  child.stdout.on('data',data=>{stdout+=data;output.stdout?.(data);});child.stderr.on('data',data=>{stderr+=data;output.stderr?.(data);});
  child.on('error',error=>{launchError=error.message;stderr+=error.message;});
  // A CLI may close stdin before launch failure; preserve the original launch error instead of crashing the harness.
  child.stdin.on('error',error=>{if(error.code!=='EPIPE')stderr+=error.message;});
  const timeout=setTimeout(()=>{timedOut=true;kill('SIGTERM');},budget*1000);
  let hard=setTimeout(()=>kill('SIGKILL'),budget*1000+5000);
  const interrupt=signal=>{aborted=true;interruptSignal=signal;kill('SIGTERM');clearTimeout(hard);hard=setTimeout(()=>kill('SIGKILL'),5000);};
  const onINT=()=>interrupt('SIGINT'),onTERM=()=>interrupt('SIGTERM');
  process.on('SIGINT',onINT);process.on('SIGTERM',onTERM);
  child.on('close',(exitCode,signal)=>{
   clearTimeout(timeout);clearTimeout(hard);process.off('SIGINT',onINT);process.off('SIGTERM',onTERM);if(timedOut||aborted)kill('SIGKILL');
   resolveRun({exitCode,signal,timedOut,aborted,interruptSignal,launchError,elapsedMs:Date.now()-start,stdout,stderr});
  });
  child.stdin.end(input);
 });
}
export function skillPaths(promptJSON) {
 const text=JSON.parse(promptJSON).flatMap(message=>(message.content||[]).map(part=>part.text||'')).join('\n');
 return [...new Set([...text.matchAll(/\(file: ([^\n]*?\/SKILL\.md)\)/g)].map(match=>match[1]))].sort();
}
export const skillOverride=paths=>'skills.config=['+paths.map(path=>`{path=${JSON.stringify(path)},enabled=false}`).join(',')+']';
