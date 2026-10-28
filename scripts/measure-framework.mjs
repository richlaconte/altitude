import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
const pkg=JSON.parse(readFileSync('package.json'));
const size=path=>{const data=readFileSync(path);return {bytes:data.length,gzipBytes:gzipSync(data).length};};
const tree=path=>readdirSync(path).reduce((sum,name)=>sum+(statSync(join(path,name)).isDirectory()?tree(join(path,name)):statSync(join(path,name)).size),0);
const baseline=JSON.parse(readFileSync('docs/framework/BASELINE-SIZES.json'));
const result={baselineIife:{commit:baseline.commit,...baseline.iife},packageVersion:pkg.version,runtimeDependencies:pkg.dependencies||{},peerDependencies:pkg.peerDependencies,
 esm:size('dist/index.js'),commonjs:size('dist/index.cjs'),iife:size('dist/altitude.iife.js'),styles:size('dist/altitude.no-fonts.css'),guidanceBytes:tree('dist/guidance'),cli:size('dist/cli/altitude.mjs'),entry:size('dist/guidance/README.md'),focusedEditGuide:size('dist/guidance/patterns/edit-record.md'),
 retrievalNote:'Byte counts measure local context retrieval size; exact token cost depends on model tokenizer. Agent pilot records actual usage where tools expose it.'};
mkdirSync('build/test',{recursive:true});writeFileSync('build/test/framework-sizes.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
