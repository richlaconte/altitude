// Rebuilds a report's screens from its evidence (results/<date>/builds), so a measure added later can be read from the same
// builds without generating them again. Each build gets the workspace generate.mjs gave its agent, its saved source on top,
// and `npm run build`; the site lands where capture.mjs reads it (<out>/<condition>--<brief>/site, repeats in <out>-s<n>).
// Usage: node rebuild.mjs --results evals/distinctiveness/results/<date> --tarball <the run's altitude-design.tgz> --out <dir>
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, existsSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { setup, quiet } from './workspace.mjs';
const args=process.argv.slice(2);
const option=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const results=resolve(option('--results',''));
const out=resolve(option('--out','build/test/distinctiveness/rebuilt'));
const tarball=option('--tarball','')&&resolve(option('--tarball',''));
const only=option('--only','');
const builds=join(results,'builds');
for(const id of readdirSync(builds).filter(name=>existsSync(join(builds,name,'run.json'))&&(!only||name.includes(only)))){
 const meta=JSON.parse(readFileSync(join(builds,id,'run.json'),'utf8'));
 if(meta.build!=='passed'){console.log(id,'skipped: its build failed');continue;}
 const sample=id.match(/--s(\d+)$/)?.[1];
 const site=join(sample?`${out}-s${sample}`:out,id.replace(/--s\d+$/,''),'site');
 if(existsSync(join(site,'index.html'))){console.log(id,'kept');continue;}
 mkdirSync(site,{recursive:true});
 if(meta.condition==='claude-plain'){cpSync(join(builds,id,'index.html'),join(site,'index.html'));console.log(id,'copied');continue;}
 // The same Altitude package, or the rebuilt screen isn't the one that was measured.
 if(meta.condition==='claude-altitude'){
  if(!tarball)throw Error('--tarball is required to rebuild Altitude builds');
  const hash=createHash('sha256').update(readFileSync(tarball)).digest('hex');
  if(meta.tarballSHA256&&hash!==meta.tarballSHA256)throw Error(`${id} was built from ${meta.tarballSHA256.slice(0,12)}…, not ${hash.slice(0,12)}…`);
 }
 const workspace=mkdtempSync(join(tmpdir(),'altitude-rebuild-'));
 try{
  setup(meta.condition,workspace,tarball);
  cpSync(join(builds,id,'src'),join(workspace,'src'),{recursive:true});
  execFileSync('npm',['run','build'],{cwd:workspace,...quiet});
  cpSync(join(workspace,'dist'),site,{recursive:true});
  console.log(id,'rebuilt');
 }catch(error){rmSync(site,{recursive:true,force:true});console.warn(id,'failed:',String(error.stderr||error.message).slice(0,400));}
 rmSync(workspace,{recursive:true,force:true});
}
