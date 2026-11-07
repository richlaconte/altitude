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
for(const resource of ['altitude.css','altitude.no-fonts.css','fonts.css','tokens.css','tokens.json','altitude.iife.js','guidance','adapters/tiptap.css','adapters/codemirror','adapters/react-flow.css'])assert.ok(existsSync(require.resolve('altitude-design/'+resource)),resource);
assert.ok(!readFileSync(require.resolve('altitude-design/altitude.no-fonts.css'),'utf8').includes('@import'));
assert.equal(require('altitude-design/guidance').version,pkg.version);
// An agent in a consumer project reads the design guide and each component's guide from the installed package.
{const guidance=require('altitude-design/guidance'),dir=join(installed,'dist/guidance');
 assert.ok(existsSync(join(dir,guidance.design)),'installed design guide');
 assert.ok(guidance.components.length>=100,'installed component index');
 for(const c of guidance.components)assert.ok(existsSync(join(dir,c.document)),`installed guide for ${c.name}`);
 assert.match(readFileSync(join(dir,'components/Button/README.md'),'utf8'),/^# Button/,'Button guide readable from the install');
 const layout=guidance.patterns.find(p=>p.id==='screen-layout');
 assert.ok(layout.rules.includes('ALT-LAYOUT-002'),'installed screen-layout discovers detail-surface rule');
 assert.match(readFileSync(join(dir,layout.document),'utf8'),/## Choose the detail surface/,'installed chooser is readable');
 const detail=JSON.parse(readFileSync(join(dir,'rules.json'),'utf8')).rules.find(r=>r.id==='ALT-LAYOUT-002');
 assert.equal(detail.authority,'contextual-pattern'); assert.equal(detail.diagnosticClass,'contextual-review');
 const sources=JSON.parse(readFileSync(join(dir,'evidence.json'),'utf8')).sources;
 for(const id of detail.sources)assert.ok(sources.some(s=>s.id===id),'installed detail rule source '+id);
 assert.match(readFileSync(join(dir,'app-skeleton.md'),'utf8'),/Customers heading/,'installed example names its missing-source fallback');}
for(const fn of ['echartsTheme','chartjsDefaults','dataColors','readChartTokens','useChartTheme'])assert.equal(typeof require('altitude-design/chart-themes')[fn],'function','chart-themes CJS '+fn);
writeFileSync(join(consumer,'themes.mjs'),`import assert from 'node:assert/strict';import {echartsTheme} from 'altitude-design/chart-themes';assert.equal(echartsTheme({'data-1':'#123456'}).color[0],'#123456');console.log('chart-themes ESM passed');`);
execFileSync(process.execPath,['themes.mjs'],{cwd:consumer,stdio:'inherit'});
const code=`import * as React from 'react';
import {useEditRecord,useConsequentialAction,useReviewSubmit,ErrorSummary} from 'altitude-design';
import {echartsTheme,chartjsDefaults,useChartTheme,type ChartTokens} from 'altitude-design/chart-themes';
const tokens:ChartTokens={'data-1':'#123456'};const themed:string[]=echartsTheme(tokens).color;void [themed,chartjsDefaults(tokens).animation,useChartTheme];
// Column definitions can be typed before they're passed (#427).
import type {DataTableColumn} from 'altitude-design';
const columns:DataTableColumn<{name:string}>[]=[{key:'name',header:'Project'}];void columns;
// An app types its own wrappers and data with the props and data types the components are built from (#432).
import {Button} from 'altitude-design';
import type {ButtonProps,SelectOption,MenuItem,Tone,BoardMove} from 'altitude-design';
const SaveButton=(props:Omit<ButtonProps,'variant'>)=>React.createElement(Button,{variant:'primary',...props});
const regions:SelectOption[]=[{value:'iad',label:'Virginia'}];const tone:Tone='caution';
const menu:MenuItem={label:'Rename',onSelect:()=>{}};const moved=(m:BoardMove)=>m.to.column;void [SaveButton,regions,tone,menu,moved];
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
// The installed CLI's source check (bundled into dist/cli) on a fixture app: an error fails it, a fixed app passes.
{mkdirSync(join(consumer,'src'),{recursive:true});
 const page=label=>`import 'altitude-design/altitude.css';\nimport { AltitudeProvider, Button } from 'altitude-design';\nexport const App=()=><AltitudeProvider><Button variant="primary">${label}</Button></AltitudeProvider>;\n`;
 writeFileSync(join(consumer,'src/App.tsx'),page('Submit'));
 let failed=null;try{execFileSync(join(consumer,'node_modules/.bin/altitude'),['check','--json'],{cwd:consumer,encoding:'utf8'});}catch(e){failed=JSON.parse(e.stdout);}
 assert.ok(failed&&!failed.ok&&failed.findings.some(f=>f.ruleId==='ALT-COPY-001'),'installed altitude check reports ALT-COPY-001');
 // A chart rule (#540): an unnamed ChartContainer fails, and explain resolves the rule from the installed guidance.
 writeFileSync(join(consumer,'src/Chart.tsx'),`import { ChartContainer, BarChart } from 'altitude-design';\nexport const C=({d})=><ChartContainer config={{v:{label:'Seats'}}}><BarChart data={d} x="plan" /></ChartContainer>;\n`);
 failed=null;try{execFileSync(join(consumer,'node_modules/.bin/altitude'),['check','--json'],{cwd:consumer,encoding:'utf8'});}catch(e){failed=JSON.parse(e.stdout);}
 assert.ok(failed&&failed.findings.some(f=>f.ruleId==='ALT-CHART-006'),'installed altitude check reports ALT-CHART-006');
 assert.match(execFileSync(join(consumer,'node_modules/.bin/altitude'),['explain','ALT-CHART-006'],{cwd:consumer,encoding:'utf8'}),/Every chart has a name/,'installed altitude explain resolves ALT-CHART-006');
 writeFileSync(join(consumer,'src/Chart.tsx'),`import { ChartContainer, BarChart } from 'altitude-design';\nexport const C=({d})=><ChartContainer title="Seats by plan" config={{v:{label:'Seats'}}}><BarChart data={d} x="plan" /></ChartContainer>;\n`);
 writeFileSync(join(consumer,'src/App.tsx'),page('Save changes'));
 assert.equal(JSON.parse(execFileSync(join(consumer,'node_modules/.bin/altitude'),['check','--json'],{cwd:consumer,encoding:'utf8'})).ok,true,'installed altitude check passes a fixed app');}
console.log('Packed npm consumer: ESM/CommonJS/NodeNext/Bundler types, chart-themes subpath, assets, guidance, CLI (including check), installed workflow transitions passed.');
writeFileSync(join(artifact,'result.json'),JSON.stringify({package:packed.filename,version:pkg.version,consumer,installed,checks:symbols,date:new Date().toISOString()},null,2)+'\n');
