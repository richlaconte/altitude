// Test the tarball from outside the checkout. No source imports can rescue missing package files.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
// npm 11 and earlier print an array from `pack --json`; npm 12 keys the result by package name.
const firstPacked=result=>Array.isArray(result)?result[0]:Object.values(result)[0];
const root=fileURLToPath(new URL('../../',import.meta.url));
const artifact=resolve(root,'build/test/framework-consumer');mkdirSync(artifact,{recursive:true});
const packed=firstPacked(JSON.parse(execFileSync('npm',['pack','--json','--ignore-scripts','--pack-destination',artifact],{cwd:root,encoding:'utf8'})));
const consumer=mkdtempSync(join(tmpdir(),'altitude-consumer-'));
writeFileSync(join(consumer,'package.json'),JSON.stringify({name:'altitude-consumer',type:'module',private:true}));
execFileSync('npm',['install','--ignore-scripts','--no-audit','--no-fund',join(artifact,packed.filename),'react@19.3.0','react-dom@19.3.0','@types/react@19.3.0','@types/react-dom@19.3.0','typescript@5.6.3'],{cwd:consumer,stdio:'pipe'});
const installed=join(consumer,'node_modules/altitude-design');
writeFileSync(join(artifact,'installed-path.txt'),installed+'\n');
const require=createRequire(join(consumer,'package.json'));
const pkg=require('altitude-design/package.json');
const symbols=['AltitudeProvider','Surface','Select','Dialog','InlineEdit','useEditRecord','ErrorSummary','WorkflowStatus','useAsyncCollection','useConsequentialAction','useReviewSubmit'];
const checkCode=`import assert from 'node:assert/strict';import * as a from 'altitude-design';for(const k of ${JSON.stringify(symbols)})assert.ok(a[k],k);console.log('ESM exports passed');`;
writeFileSync(join(consumer,'esm.mjs'),checkCode);
execFileSync(process.execPath,['esm.mjs'],{cwd:consumer,stdio:'inherit'});
for(const k of symbols)assert.ok(require('altitude-design')[k],k);
for(const resource of ['altitude.css','altitude.no-fonts.css','fonts.css','tokens.css','tokens.json','altitude.iife.js','guidance','adapters/tiptap.css'])assert.ok(existsSync(require.resolve('altitude-design/'+resource)),resource);
assert.ok(!readFileSync(require.resolve('altitude-design/altitude.no-fonts.css'),'utf8').includes('@import'));
assert.equal(require('altitude-design/guidance').version,pkg.version);
for(const fn of ['echartsTheme','chartjsDefaults','dataColors','readChartTokens','useChartTheme'])assert.equal(typeof require('altitude-design/chart-themes')[fn],'function','chart-themes CJS '+fn);
writeFileSync(join(consumer,'themes.mjs'),`import assert from 'node:assert/strict';import {echartsTheme} from 'altitude-design/chart-themes';assert.equal(echartsTheme({'data-1':'#123456'}).color[0],'#123456');console.log('chart-themes ESM passed');`);
execFileSync(process.execPath,['themes.mjs'],{cwd:consumer,stdio:'inherit'});
const code=`import * as React from 'react';
import {useEditRecord,useConsequentialAction,useReviewSubmit,ErrorSummary} from 'altitude-design';
import {echartsTheme,chartjsDefaults,useChartTheme,type ChartTokens} from 'altitude-design/chart-themes';
const tokens:ChartTokens={'data-1':'#123456'};const themed:string[]=echartsTheme(tokens).color;void [themed,chartjsDefaults(tokens).animation,useChartTheme];
function Example(){const form=useEditRecord({initialValue:{name:''},validationMode:'submit',validate:value=>value.name?{}:{name:'Enter a name'},save:async value=>({ok:true,value})});return React.createElement(ErrorSummary,{errors:[{id:'name',label:'Name',message:form.errors.name||''}]});}
// @ts-expect-error validation policy is required
useEditRecord({initialValue:{name:''},validate:()=>({}),save:async value=>({ok:true,value})});
// @ts-expect-error successful persistence must provide a canonical value
useEditRecord({initialValue:{name:''},validationMode:'submit',validate:()=>({}),save:async()=>({ok:true})});
void Example;
`;
for(const [extension,module,resolution] of [['mts','NodeNext','NodeNext'],['cts','NodeNext','NodeNext'],['tsx','ESNext','Bundler']]){
 const file='public.'+extension;writeFileSync(join(consumer,file),code);
 execFileSync(process.execPath,[join(consumer,'node_modules/typescript/bin/tsc'),'--noEmit','--strict','--skipLibCheck','--target','ES2020','--module',module,'--moduleResolution',resolution,'--jsx','react',file],{cwd:consumer,stdio:'inherit'});
}
const bin=resolve(installed,pkg.bin.altitude);assert.ok(existsSync(bin));
for(const command of [['patterns','edit settings'],['explain','ALT-EDIT-001'],['init','--client','codex'],['init','--client','codex','--apply'],['doctor','--json'],['init','--client','codex','--remove','--apply']]){
 execFileSync(process.execPath,[bin,...command],{cwd:consumer,stdio:'pipe'});
}
assert.ok(!readFileSync(join(installed,'dist/index.js'),'utf8').includes('node:fs'),'Node tooling excluded from browser runtime');
const env={...process.env,ALT_PACKAGE_ROOT:installed};
execFileSync(process.execPath,[join(root,'build/checks/pattern-workflows.mjs')],{cwd:root,env,stdio:'inherit'});
execFileSync(process.execPath,[join(root,'scripts/build-check-fixtures.mjs'),'EditRecord,AsyncCollection,ConsequentialAction,ReviewSubmit'],{cwd:root,env,stdio:'inherit'});
execFileSync(process.execPath,[join(root,'build/checks/framework-accessibility.mjs')],{cwd:root,env:{...env,ALT_FIXTURE_ROOT:join(root,'build/test/react19-installed')},stdio:'inherit'});
console.log('Packed npm consumer: ESM/CommonJS/NodeNext/Bundler types, chart-themes subpath, assets, guidance, CLI, installed workflow transitions passed.');
writeFileSync(join(artifact,'result.json'),JSON.stringify({package:packed.filename,version:pkg.version,consumer,installed,checks:symbols,date:new Date().toISOString()},null,2)+'\n');
