// Produce three installed-package conditions with byte-identical stabilized primitive sources.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { conditions, protocolVersion } from './protocol.mjs';
import { stripPatternExports, sanitizeGuidance, sha256 } from './support.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const destination=resolve(process.argv[2]||join(root,'build/test/framework-eval-packages'));
mkdirSync(destination,{recursive:true});
const pkg=JSON.parse(readFileSync(join(root,'package.json')));
const src=join(root,'project/components/src');
const primitiveFiles=readdirSync(src).filter(x=>!x.startsWith('pattern-')&&x!=='index.tsx').sort();
const hash=createHash('sha256');
for(const f of primitiveFiles) hash.update(f).update(readFileSync(join(src,f)));
const primitiveHash=hash.digest('hex');
const fullEntry=readFileSync(join(src,'index.tsx'),'utf8');
const entry=stripPatternExports(fullEntry);
const primitiveArtifacts=Object.fromEntries(['altitude.css','altitude.no-fonts.css','tokens.css','tokens.json'].map(file=>[file,sha256(readFileSync(join(root,'dist',file)))]));
const manifest={protocolVersion,primitiveHash,primitiveFiles,primitiveArtifacts,packageVersion:pkg.version,packages:{}};
for(const condition of conditions){
 const folder=join(destination,condition); rmSync(folder,{recursive:true,force:true}); mkdirSync(folder,{recursive:true});
 cpSync(join(root,'dist'),join(folder,'dist'),{recursive:true});
 const meta={...structuredClone(pkg),scripts:{},devDependencies:{}};
 {
  const opts={stdin:{contents:condition==='framework'?fullEntry:entry,resolveDir:src,loader:'tsx'},bundle:true,target:'es2020',external:['react','react-dom','react/jsx-runtime'],jsx:'transform',banner:{js:'"use client";'}};
  await build({...opts,format:'esm',outfile:join(folder,'dist/index.js')});
  await build({...opts,format:'cjs',outfile:join(folder,'dist/index.cjs')});
  for(const name of ['index.js.map','index.cjs.map','altitude.iife.js']) rmSync(join(folder,'dist',name),{force:true});
  delete meta.exports['./altitude.iife.js'];
 }
 if(condition!=='framework'){
  for(const [tree,indexName] of [['types','index.d.ts'],['types-cjs','index.d.cts']]){
   const types=join(folder,'dist',tree);
   for(const file of readdirSync(types)) if(file.startsWith('pattern-')) rmSync(join(types,file));
   const index=join(types,indexName);
   writeFileSync(index,stripPatternExports(readFileSync(index,'utf8')));
  }
 }
 if(condition==='primitives'){
  rmSync(join(folder,'dist/guidance'),{recursive:true,force:true}); rmSync(join(folder,'dist/cli'),{recursive:true,force:true});
  delete meta.bin;
  for(const key of Object.keys(meta.exports)) if(/guidance|cli/.test(key)) delete meta.exports[key];
  for(const indexPath of ['dist/types/index.d.ts','dist/types-cjs/index.d.cts']){
   const index=join(folder,indexPath);
   writeFileSync(index,readFileSync(index,'utf8').replace(/^\/\*\*[\s\S]*?\*\//,''));
  }
 }
 if(condition==='guidance') sanitizeGuidance(join(folder,'dist/guidance'));
 writeFileSync(join(folder,'package.json'),JSON.stringify(meta,null,2));
 writeFileSync(join(folder,'README.md'),`# Altitude evaluation package\nVersion ${pkg.version}. Condition: ${condition}.\nUse the installed public exports. ${condition==='framework'?'Workflow hooks and guidance are available.':condition==='guidance'?'Design guidance is available; implement workflows using the primitive exports. Workflow hook implementations are intentionally absent.':'Primitive components are available.'}\n`);
 const packed=JSON.parse(execFileSync('npm',['pack','--json','--ignore-scripts'],{cwd:folder,encoding:'utf8'}))[0];
 manifest.packages[condition]={tarball:join(folder,packed.filename),sha256:createHash('sha256').update(readFileSync(join(folder,packed.filename))).digest('hex'),primitiveHash};
}
writeFileSync(join(destination,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(join(destination,'manifest.json'));
