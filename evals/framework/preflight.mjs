// Verify installed experimental controls before spending model/tool budgets.
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { conditions } from './protocol.mjs';
import { sha256 } from './support.mjs';
const manifest=JSON.parse(readFileSync(resolve(process.argv[2]||'build/test/framework-eval-packages/manifest.json')));
const reports=[];let primitiveExports;
for(const condition of conditions) {
 const cwd=mkdtempSync(join(tmpdir(),'altitude-eval-preflight-'));
 try {
  const artifact=manifest.packages[condition];assert.equal(sha256(readFileSync(artifact.tarball)),artifact.sha256);
  writeFileSync(join(cwd,'package.json'),JSON.stringify({name:'preflight',private:true,type:'module',dependencies:{'altitude-design':artifact.tarball,react:'19.3.0','react-dom':'19.3.0'}}));
  execFileSync('npm',['install','--ignore-scripts','--no-audit','--no-fund'],{cwd,stdio:'pipe',timeout:120000});
  const require=createRequire(join(cwd,'package.json')),lib=require('altitude-design');
  assert.ok(lib.Surface);assert.equal(typeof lib.useEditRecord,condition==='framework'?'function':'undefined');
  if(condition==='primitives')primitiveExports=Object.keys(lib).sort();
  for(const key of primitiveExports)assert.ok(key in lib,`${condition} missing primitive ${key}`);
  const folder=join(cwd,'node_modules/altitude-design'),pkg=JSON.parse(readFileSync(join(folder,'package.json')));
  for(const [file,digest] of Object.entries(manifest.primitiveArtifacts))assert.equal(sha256(readFileSync(join(folder,'dist',file))),digest);
  if(condition==='primitives'){assert.equal(existsSync(join(folder,'dist/guidance')),false);assert.throws(()=>require.resolve('altitude-design/guidance'));}
  else {
   assert.ok(require.resolve('altitude-design/guidance'));
   assert.ok(require.resolve('altitude-design/guidance/README.md'));
   assert.equal(existsSync(join(folder,'dist/guidance/references')),condition==='framework');
   const bin=join(folder,pkg.bin.altitude);
   execFileSync(process.execPath,[bin,'init','--client','all','--apply'],{cwd,stdio:'pipe',timeout:15000});
   assert.equal(JSON.parse(execFileSync(process.execPath,[bin,'doctor','--json'],{cwd,encoding:'utf8',timeout:15000})).ok,true);
  }
  for(const [tree,index] of [['types','index.d.ts'],['types-cjs','index.d.cts']]){
   const declaration=readFileSync(join(folder,'dist',tree,index),'utf8');
   assert.equal(declaration.includes('pattern-edit-record'),condition==='framework',`${condition} ${tree} workflow types`);
   assert.equal(existsSync(join(folder,'dist',tree,'pattern-edit-record.'+(tree==='types'?'d.ts':'d.cts'))),condition==='framework');
  }
  const typescript=fileURLToPath(new URL('../../node_modules/typescript/bin/tsc',import.meta.url));
  const source=`import { Surface } from 'altitude-design';\n${condition==='framework'?'':'// @ts-expect-error executable workflow API is excluded in this condition\n'}import { useEditRecord } from 'altitude-design';\nvoid Surface; void useEditRecord;\n`;
  for(const extension of ['mts','cts'])writeFileSync(join(cwd,'consumer.'+extension),source);
  execFileSync(process.execPath,[typescript,'--noEmit','--skipLibCheck','--module','NodeNext','--moduleResolution','NodeNext','--target','es2020','consumer.mts','consumer.cts'],{cwd,stdio:'pipe',timeout:30000});
  reports.push({condition,status:'passed',packageVersion:pkg.version,primitiveHash:artifact.primitiveHash,tarballSHA256:artifact.sha256});
 } finally {rmSync(cwd,{recursive:true,force:true});}
}
console.log(JSON.stringify({checks:'Packed installs, public runtime and ESM/CJS declaration controls, guidance export resolution, identical copied primitive assets, both installed setup adapters and guidance integrity',reports},null,2));
