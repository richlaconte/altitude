import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregate, metricsFromChecks, measuredRegressions } from './assess.mjs';
test('unknown is never silently treated as a pass or a product failure',()=>{
 assert.equal(aggregate([]),null);assert.equal(aggregate([true,null]),null);assert.equal(aggregate([true,true]),true);assert.equal(aggregate([null,false]),false);
});
test('missing save, reload, a11y and recovery scenarios retain null metrics',()=>{
 const metrics=metricsFromChecks([{ruleId:'EVAL-SAVE',passed:true}], 'settings');
 assert.equal(metrics.taskOutcome,null);assert.equal(metrics.retainedInput,null);assert.equal(metrics.recovery,null);assert.equal(metrics.accessibilityDefects,null);
 assert.equal(metrics.applicableStates,null);assert.equal(metrics.contentAccuracy,null);
});
test('successful save alone cannot establish retention or recovery',()=>{
 const metrics=metricsFromChecks([{ruleId:'EVAL-SAVE',passed:true},{ruleId:'EVAL-RELOAD',passed:true},{ruleId:'EVAL-RETAIN',passed:null}], 'settings');
 assert.equal(metrics.taskOutcome,true);assert.equal(metrics.recovery,null);assert.equal(metrics.retainedInput,null);
});
test('follow-up comparisons use matching measured states, and absence is unknown',()=>{
 const initial=[{ruleId:'EVAL-A11Y',state:'initial',passed:true},{ruleId:'EVAL-A11Y',state:'failed-save',passed:true}];
 assert.equal(measuredRegressions(initial,[{ruleId:'EVAL-A11Y',state:'initial',passed:true}]),null);
 assert.equal(measuredRegressions(initial,[{ruleId:'EVAL-A11Y',state:'initial',passed:true},{ruleId:'EVAL-A11Y',state:'failed-save',passed:false}]),false);
});

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assessArtifact } from './assess.mjs';
test('a failed follow-up build cannot be assessed using a stale dist directory',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'altitude-assessor-no-build-'));
 try{
  writeFileSync(join(directory,'run.json'),JSON.stringify({id:'assessor-no-build',task:'settings',build:'failed',followup:{build:'failed'},metrics:{taskOutcome:null}}));
  for(const stage of ['initial','final']){mkdirSync(join(directory,stage+'-dist'));writeFileSync(join(directory,stage+'-dist','index.html'),'<h1>Old artifact</h1>');}
  const result=await assessArtifact(directory);
  assert.equal(result.metrics.taskOutcome,null);assert.equal(result.metrics.followupRegressions,null);assert.ok(result.reports.every(report=>report.checks.length===0&&report.unmeasured));
 }finally{rmSync(directory,{recursive:true,force:true});}
});
test('controlled independent assessment observes rejected writes, real accepted data and reload before reporting outcome',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'altitude-assessor-browser-'));
 try{
  writeFileSync(join(directory,'run.json'),JSON.stringify({id:'assessor-browser',task:'settings',build:'passed',followup:{build:'passed'},metrics:{taskOutcome:null}}));
  const html=`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Workspace settings</title><style>main{max-width:100%;}label,input,button{display:block;max-width:100%;box-sizing:border-box}body{color:#111;background:#fff}</style></head><body><main><h1>Settings</h1><label for="name">Workspace name</label><input id="name"><label for="email">Contact email</label><input id="email" type="email"><button id="save">Save changes</button><p id="status" role="status"></p></main><script>
   const nameInput=document.getElementById('name'),emailInput=document.getElementById('email'),status=document.getElementById('status');let busy=false;
   fetch('/api/workspace').then(r=>r.json()).then(value=>{nameInput.value=value.name;emailInput.value=value.email;});
   document.getElementById('save').onclick=async()=>{if(busy)return;busy=true;nameInput.readOnly=emailInput.readOnly=true;status.textContent='Saving';document.getElementById('save').textContent='Saving settings';try{const r=await fetch('/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:nameInput.value,email:emailInput.value})});const value=await r.json();status.textContent=r.ok?'Changes saved':value.error;}finally{busy=false;nameInput.readOnly=emailInput.readOnly=false;document.getElementById('save').textContent='Save changes';}};
  </script></body></html>`;
  for(const stage of ['initial','final']){mkdirSync(join(directory,stage+'-dist'));writeFileSync(join(directory,stage+'-dist','index.html'),html);}
  const result=await assessArtifact(directory);
  assert.equal(result.metrics.taskOutcome,true,JSON.stringify(result.reports));assert.equal(result.metrics.retainedInput,true);assert.equal(result.metrics.recovery,true);assert.equal(result.metrics.followupRegressions,true);
  for(const report of result.reports){assert.equal(report.service.writes[0].outcome,'rejected');assert.equal(report.service.writes[1].outcome,'accepted');assert.equal(report.service.record.name,'Pending workspace');assert.equal(report.checks.find(check=>check.ruleId==='EVAL-DUPLICATE').passed,true);}
  assert.equal(JSON.parse(readFileSync(join(directory,'run.json'),'utf8')).metrics.taskOutcome,true);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
test('ambiguous accessible controls are unknown and do not prevent independent geometry/runtime checks',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'altitude-assessor-ambiguous-'));
 try{
  writeFileSync(join(directory,'run.json'),JSON.stringify({id:'assessor-ambiguous',task:'settings',build:'passed',metrics:{taskOutcome:null}}));
  mkdirSync(join(directory,'initial-dist'));
  writeFileSync(join(directory,'initial-dist','index.html'),'<html lang="en"><head><title>Workspace</title></head><body><main><h1>Settings</h1><label for="a">Workspace name</label><input id="a"><label for="b">Workspace name</label><input id="b"></main><script>fetch("/api/workspace")</script></body></html>');
  const result=await assessArtifact(directory),initial=result.reports[0];
  assert.equal(initial.service.writes.length,0);assert.ok(initial.checks.filter(check=>check.ruleId==='EVAL-HARNESS').every(check=>check.passed===null));
  assert.equal(initial.metrics.taskOutcome,null);assert.equal(initial.metrics.retainedInput,null);
  assert.equal(initial.checks.find(check=>check.ruleId==='EVAL-REFLOW').passed,true);assert.equal(initial.checks.find(check=>check.ruleId==='EVAL-RUNTIME').passed,true);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
