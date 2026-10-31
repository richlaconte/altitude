// Builds each brief with Claude Code under three conditions: nothing installed, shadcn/ui installed, Altitude installed and set up.
// Workspaces live in the OS temp directory, outside this repository, so no generation sees Altitude's own files unless installed.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { claudeAllowedTools } from '../framework/protocol.mjs';
import { runProcess, traceUsage, sha256 } from '../framework/support.mjs';
const here=fileURLToPath(new URL('./',import.meta.url));
const args=process.argv.slice(2);
const option=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const today=new Date().toISOString().slice(0,10);
const out=resolve(option('--out',`build/test/distinctiveness/${today}`));mkdirSync(out,{recursive:true});
const seconds=Number(option('--seconds','600'));
const model=option('--model','claude-opus-5-5');
const parallel=Number(option('--parallel','4'));
const only=option('--only','');
const tarball=option('--tarball','')&&resolve(option('--tarball',''));
const {briefs}=JSON.parse(readFileSync(join(here,'briefs.json'),'utf8'));
// The only words each condition adds to a brief: where the code goes. v0 and Lovable get the brief alone.
const conditions={
 'claude-plain':{suffix:'Write it as a single self-contained index.html in this folder. You may load libraries from a public CDN.',tools:['Read','Write','Edit','Bash(ls *)'],site:'index.html'},
 'claude-shadcn':{suffix:'Build it in this project with the installed shadcn/ui components. `npm run build` must succeed.',tools:['Read','Write','Edit','Bash(npm run build)','Bash(npx shadcn@latest add *)','Bash(ls *)','Bash(cat *)','Bash(find *)','Bash(pwd)'],site:'dist'},
 'claude-altitude':{suffix:'Build it in this project with the installed Altitude package. `npm run build` must succeed.',tools:claudeAllowedTools,site:'dist'},
};
const picked=option('--conditions',Object.keys(conditions).join(',')).split(',');
if(picked.includes('claude-altitude')&&!tarball)throw Error('--tarball <altitude-design.tgz> is required for claude-altitude (npm pack after npm run build)');
const quiet={stdio:'pipe',timeout:300000};
function setup(condition,workspace){
 if(condition==='claude-plain'){writeFileSync(join(workspace,'README.md'),'# Product workspace\n\nWrite the requested screen as a single self-contained `index.html` in this folder.\n');return;}
 if(condition==='claude-shadcn'){
  cpSync(join(here,'starters/shadcn'),workspace,{recursive:true});
  execFileSync('npm',['ci','--prefer-offline','--no-audit','--no-fund'],{cwd:workspace,...quiet});
  return;
 }
 mkdirSync(join(workspace,'src'));
 writeFileSync(join(workspace,'package.json'),JSON.stringify({name:'product-workspace',private:true,type:'module',scripts:{build:'node build.mjs'},dependencies:{'altitude-design':tarball,react:'19.3.0','react-dom':'19.3.0'},devDependencies:{esbuild:'0.28.2'}},null,2));
 execFileSync('npm',['install','--ignore-scripts','--no-audit','--no-fund'],{cwd:workspace,...quiet});
 writeFileSync(join(workspace,'README.md'),'# Product workspace\n\nImplement the requested screen in `src/main.tsx` and any files under `src/`. React and Altitude are installed. `npm run build` writes `dist/`.\n');
 // altitude.css, not the pilot's no-fonts file: shadcn's starter bundles its font too.
 writeFileSync(join(workspace,'src/main.tsx'),`import * as React from 'react';import {createRoot} from 'react-dom/client';import {AltitudeProvider} from 'altitude-design';import 'altitude-design/altitude.css';function App(){return <main><h1>Workspace</h1></main>};createRoot(document.getElementById('root')!).render(<AltitudeProvider><App/></AltitudeProvider>);`);
 writeFileSync(join(workspace,'build.mjs'),`import {build} from 'esbuild';import{mkdirSync,writeFileSync}from'node:fs';mkdirSync('dist',{recursive:true});await build({entryPoints:['src/main.tsx'],bundle:true,outfile:'dist/app.js',jsx:'transform',loader:{'.woff2':'file','.woff':'file','.svg':'file','.png':'file'},define:{'process.env.NODE_ENV':'"production"'}});writeFileSync('dist/index.html','<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Workspace</title><link rel="stylesheet" href="app.css"></head><body><div id="root"></div><script src="app.js"></script></body></html>');`);
 const installed=JSON.parse(readFileSync(join(workspace,'node_modules/altitude-design/package.json'),'utf8'));
 execFileSync(process.execPath,[join(workspace,'node_modules/altitude-design',installed.bin.altitude),'init','--client','claude','--apply'],{cwd:workspace,...quiet});
}
async function generate(condition,brief){
 const id=`${condition}--${brief.id}`,evidence=join(out,id);
 if(existsSync(join(evidence,'run.json'))){console.log(id,'kept');return;}
 mkdirSync(evidence,{recursive:true});
 const workspace=mkdtempSync(join(tmpdir(),'altitude-distinct-'));
 const spec=conditions[condition],prompt=`${brief.text}\n\n${spec.suffix}`;
 const meta={id,condition,brief:brief.id,task:brief.task,domain:brief.domain,prompt,promptSHA256:sha256(prompt),model,startedAt:new Date().toISOString()};
 try{
  meta.toolVersion=execFileSync('claude',['--version'],{encoding:'utf8'}).trim();
  setup(condition,workspace);
  execFileSync('git',['init','-q'],{cwd:workspace});
  meta.dependencies=existsSync(join(workspace,'package.json'))?JSON.parse(readFileSync(join(workspace,'package.json'),'utf8')).dependencies:{};
  if(tarball&&condition==='claude-altitude')meta.tarballSHA256=sha256(readFileSync(tarball));
  const argv=['-p','--no-session-persistence','--output-format','stream-json','--verbose','--model',model,'--permission-mode','acceptEdits','--allowedTools',spec.tools.join(','),'--setting-sources','project','--strict-mcp-config','--mcp-config','{"mcpServers":{}}'];
  meta.invocation={command:'claude',args:argv};
  console.log(id,'generation-started',new Date().toISOString());
  const run=await runProcess('claude',argv,workspace,prompt,seconds);
  writeFileSync(join(evidence,'generation.jsonl'),run.stdout);
  meta.generation=run.aborted?'aborted':run.timedOut?'budget-exhausted':run.exitCode===0?'complete':'failed';
  meta.elapsedMs=run.elapsedMs;meta.usage=traceUsage('claude',run.stdout);
  // The init event lists what the session could see (tools, skills, plugins), so contamination is on record.
  const init=run.stdout.split('\n').map(line=>{try{return JSON.parse(line);}catch{return null;}}).find(event=>event?.type==='system'&&event.subtype==='init');
  meta.session=init?{tools:init.tools,skills:init.skills,plugins:init.plugins,slashCommands:init.slash_commands?.length,model:init.model}:null;
  // Claude Code's built-in skills (dataviz, design) are part of the default product; which ones a run called is recorded.
  meta.toolUse={};
  for(const line of run.stdout.split('\n'))try{for(const part of JSON.parse(line).message?.content||[])if(part.type==='tool_use'){const name=part.name==='Skill'?`Skill(${part.input?.skill})`:part.name;meta.toolUse[name]=(meta.toolUse[name]||0)+1;}}catch{}
  if(spec.site==='dist'){
   try{execFileSync('npm',['run','build'],{cwd:workspace,...quiet});meta.build='passed';}catch(error){meta.build='failed';writeFileSync(join(evidence,'build.txt'),String(error.stdout||'')+String(error.stderr||''));}
   if(meta.build==='passed')cpSync(join(workspace,'dist'),join(evidence,'site'),{recursive:true});
   cpSync(join(workspace,'src'),join(evidence,'src'),{recursive:true});
  }else{
   meta.build=existsSync(join(workspace,'index.html'))?'passed':'failed';
   if(meta.build==='passed'){mkdirSync(join(evidence,'site'));cpSync(join(workspace,'index.html'),join(evidence,'site/index.html'));cpSync(join(workspace,'index.html'),join(evidence,'src.html'));}
  }
 }catch(error){meta.generation??='setup-failed';meta.error=String(error.message);}
 meta.finishedAt=new Date().toISOString();
 writeFileSync(join(evidence,'run.json'),JSON.stringify(meta,null,2)+'\n');
 rmSync(workspace,{recursive:true,force:true});
 console.log(id,meta.generation,meta.build||'',meta.elapsedMs||'',meta.usage?.costUSD??'');
}
const queue=picked.flatMap(condition=>briefs.filter(brief=>!only||`${condition}--${brief.id}`.includes(only)).map(brief=>[condition,brief]));
await Promise.all(Array.from({length:parallel},async()=>{while(queue.length)await generate(...queue.shift());}));
