import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregate, metricsFromChecks, measuredRegressions } from './assess.mjs';
test('unknown is never silently treated as a pass or a product failure',()=>{
 assert.equal(aggregate([]),null);assert.equal(aggregate([true,null]),null);assert.equal(aggregate([true,true]),true);assert.equal(aggregate([null,false]),false);
});
test('missing save, reload, a11y and recovery scenarios retain null metrics',()=>{
 const metrics=metricsFromChecks([{ruleId:'EVAL-SAVE',passed:true}], 'settings');
 assert.equal(metrics.taskOutcome,null);assert.equal(metrics.retainedInput,null);assert.equal(metrics.recovery,null);assert.equal(metrics.axeScanPassed,null);
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
  assert.equal(result.metrics.taskOutcome,null);assert.equal(result.metrics.followupPreserved,null);assert.ok(result.reports.every(report=>report.checks.length===0&&report.unmeasured));
 }finally{rmSync(directory,{recursive:true,force:true});}
});
test('controlled independent assessment observes rejected writes, real accepted data and reload before reporting outcome',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'altitude-assessor-browser-'));
 try{
  writeFileSync(join(directory,'run.json'),JSON.stringify({id:'assessor-browser',task:'settings',build:'passed',followup:{build:'passed'},metrics:{taskOutcome:null}}));
  const html=`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Workspace settings</title><style>main{max-width:100%;}label,input,button{display:block;max-width:100%;box-sizing:border-box}body{color:#111;background:#fff}</style></head><body><main><h1>Settings</h1><button onclick="document.getElementById('editor').hidden=false">Edit settings</button><div id="editor"><label for="name">Workspace name</label><input id="name"><label for="email">Contact email</label><input id="email" type="email"><button id="save">Save changes</button><p id="status" role="status"></p></div></main><script>
   const nameInput=document.getElementById('name'),emailInput=document.getElementById('email'),status=document.getElementById('status');let busy=false;
   fetch('/api/workspace').then(r=>r.json()).then(value=>{nameInput.value=value.name;emailInput.value=value.email;});
   document.getElementById('save').onclick=async()=>{if(busy)return;busy=true;nameInput.readOnly=emailInput.readOnly=true;status.textContent='Saving';document.getElementById('save').textContent='Saving settings';try{const r=await fetch('/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:nameInput.value,email:emailInput.value})});const value=await r.json();status.textContent=r.ok?'Changes saved':value.error;if(r.ok)document.getElementById('editor').hidden=true;}finally{busy=false;nameInput.readOnly=emailInput.readOnly=false;document.getElementById('save').textContent='Save changes';}};
  </script></body></html>`;
  for(const stage of ['initial','final']){mkdirSync(join(directory,stage+'-dist'));writeFileSync(join(directory,stage+'-dist','index.html'),html);}
  const result=await assessArtifact(directory);
  assert.equal(result.metrics.taskOutcome,true,JSON.stringify(result.reports));assert.equal(result.metrics.retainedInput,true);assert.equal(result.metrics.recovery,true);assert.equal(result.metrics.followupPreserved,true);
  for(const report of result.reports){assert.equal(report.service.writes[0].outcome,'rejected');assert.equal(report.service.writes[1].outcome,'accepted');assert.equal(report.service.record.name,'Pending workspace');assert.equal(report.checks.find(check=>check.ruleId==='EVAL-DUPLICATE').passed,true);assert.equal(report.checks.find(check=>check.ruleId==='EVAL-STALE')?.passed,true);assert.equal(report.checks.find(check=>check.ruleId==='EVAL-PENDING-RESUBMIT')?.passed,true);}
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
test('editing while a save is pending must not re-enable a concurrent second write',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'altitude-assessor-resubmit-'));
 try{
  writeFileSync(join(directory,'run.json'),JSON.stringify({id:'assessor-resubmit',task:'settings',build:'passed',followup:{build:'passed'},metrics:{taskOutcome:null}}));
  const html=`<!doctype html><html lang="en"><head><title>Workspace settings</title></head><body><main><h1>Settings</h1><label for="name">Workspace name</label><input id="name"><label for="email">Contact email</label><input id="email" type="email"><button id="save">Save changes</button><p role="status" id="status"></p></main><script>
   const nameInput=document.getElementById('name'),emailInput=document.getElementById('email'),save=document.getElementById('save');let busy=false;
   fetch('/api/workspace').then(r=>r.json()).then(value=>{nameInput.value=value.name;emailInput.value=value.email;});
   nameInput.oninput=()=>{busy=false;save.disabled=false;};
   save.onclick=async()=>{if(busy)return;busy=true;save.disabled=true;try{await fetch('/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:nameInput.value,email:emailInput.value})});}finally{busy=false;save.disabled=false;}};
  </script></body></html>`;
  for(const stage of ['initial','final']){mkdirSync(join(directory,stage+'-dist'));writeFileSync(join(directory,stage+'-dist','index.html'),html);}
  const result=await assessArtifact(directory);
  for(const report of result.reports){
   const probe=report.checks.find(check=>check.ruleId==='EVAL-PENDING-RESUBMIT');
   assert.equal(probe?.passed,false,JSON.stringify(report.checks));assert.equal(probe.evidence.dispatchedWhilePending,1);
   assert.equal(report.checks.find(check=>check.ruleId==='EVAL-DUPLICATE').passed,true);
  }
 }finally{rmSync(directory,{recursive:true,force:true});}
});
test('without a follow-up, the copied final-dist is not assessed as follow-up evidence',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'altitude-assessor-no-followup-'));
 try{
  writeFileSync(join(directory,'run.json'),JSON.stringify({id:'assessor-no-followup',task:'settings',build:'passed',generation:'budget-exhausted',metrics:{taskOutcome:null}}));
  for(const stage of ['initial','final']){mkdirSync(join(directory,stage+'-dist'));writeFileSync(join(directory,stage+'-dist','index.html'),'<html lang="en"><head><title>W</title></head><body><main><h1>Settings</h1></main></body></html>');}
  const result=await assessArtifact(directory),final=result.reports.find(report=>report.stage==='final');
  assert.equal(final.checks.length,0);assert.match(final.unmeasured,/No follow-up/);assert.equal(result.metrics.followupPreserved,null);assert.equal(result.metrics.taskOutcome,null);
  assert.ok(result.reports.find(report=>report.stage==='initial').checks.length>0);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
test('an unguarded save is counted as duplicate even when the browser queues the second request',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'altitude-assessor-duplicate-'));
 try{
  writeFileSync(join(directory,'run.json'),JSON.stringify({id:'assessor-duplicate',task:'settings',build:'passed',metrics:{taskOutcome:null}}));
  mkdirSync(join(directory,'initial-dist'));
  writeFileSync(join(directory,'initial-dist','index.html'),`<html lang="en"><head><title>Workspace</title></head><body><main><h1>Settings</h1><label for="name">Workspace name</label><input id="name"><label for="email">Contact email</label><input id="email"><button id="save">Save</button></main><script>
   const n=document.getElementById('name'),e=document.getElementById('email');fetch('/api/workspace').then(r=>r.json()).then(v=>{n.value=v.name;e.value=v.email;});
   document.getElementById('save').onclick=()=>fetch('/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:n.value,email:e.value})});
  </script></body></html>`);
  const initial=(await assessArtifact(directory)).reports[0];
  const duplicate=initial.checks.find(check=>check.ruleId==='EVAL-DUPLICATE');
  assert.equal(duplicate?.passed,false,JSON.stringify(initial.checks));assert.ok(duplicate.evidence.dispatchedWhilePending>1);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
test('records: submitted search, duplicate clear actions and recovery start from a restored query',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'altitude-assessor-records-'));
 try{
  writeFileSync(join(directory,'run.json'),JSON.stringify({id:'assessor-records',task:'records',build:'passed',metrics:{taskOutcome:null}}));
  mkdirSync(join(directory,'initial-dist'));
  writeFileSync(join(directory,'initial-dist','index.html'),`<html lang="en"><head><title>Records</title></head><body><main><h1>Records</h1><form id="f"><label for="q">Search records</label><input id="q"><button>Search</button></form><button id="clear" type="button">Clear search</button><button id="refresh" type="button">Refresh</button><div id="out"></div></main><script>
   const q=document.getElementById('q'),out=document.getElementById('out');let selected=new Set(),query='';
   const clear=()=>{q.value='';load('');};
   async function load(value){query=value;const r=await fetch('/api/records?q='+encodeURIComponent(value));if(!r.ok){out.innerHTML='<p>Could not load records.</p><button type="button" id="retry">Try again</button>';document.getElementById('retry').onclick=()=>load(query);return;}
    const rows=await r.json();selected=new Set([...selected].filter(id=>rows.some(row=>row.id===id)));
    out.innerHTML=rows.length?rows.map(row=>'<label><input type="checkbox" data-id="'+row.id+'"'+(selected.has(row.id)?' checked':'')+'><span>'+row.name+'</span></label>').join(''):'<p>No results</p><button type="button" class="c">Clear search</button>';
    out.querySelectorAll('input').forEach(box=>box.onchange=()=>box.checked?selected.add(box.dataset.id):selected.delete(box.dataset.id));out.querySelector('.c')?.addEventListener('click',clear);}
   document.getElementById('f').onsubmit=event=>{event.preventDefault();load(q.value);};document.getElementById('clear').onclick=clear;document.getElementById('refresh').onclick=()=>load(query);load('');
  </script></body></html>`);
  const initial=(await assessArtifact(directory)).reports[0],by=id=>initial.checks.find(check=>check.ruleId===id);
  assert.equal(by('EVAL-QUERY')?.passed,true,JSON.stringify(initial.checks));assert.equal(by('EVAL-QUERY').evidence.submittedWithEnter,true);
  assert.equal(by('EVAL-RESET')?.passed,true);assert.equal(by('EVAL-LOAD-RECOVERY')?.passed,true);assert.equal(by('EVAL-SELECTION')?.passed,true);
  assert.equal(initial.metrics.taskOutcome,true);assert.ok(!initial.checks.some(check=>check.ruleId==='EVAL-HARNESS'));
 }finally{rmSync(directory,{recursive:true,force:true});}
});

import { readSelectedCount, truthfulCounts } from './assess.mjs';
test('selection counts are read from common phrasings and must match the selected rows',()=>{
 assert.equal(readSelectedCount('2 selected'),2);assert.equal(readSelectedCount('1 of 3 records selected'),1);assert.equal(readSelectedCount('Selected: 3'),3);
 assert.equal(readSelectedCount('No projects selected'),0);assert.equal(readSelectedCount('Atlas Beacon'),null);
 assert.equal(truthfulCounts([{count:null,expected:1}]),null);
 assert.equal(truthfulCounts([{count:1,expected:1},{count:null,expected:0}]),true);
 assert.equal(truthfulCounts([{count:1,expected:1},{count:2,expected:0}]),false);
 assert.equal(truthfulCounts([{count:1,expected:1},{count:null,expected:2}]),null);
});
const settingsApp=({confirmLeave})=>`<!doctype html><html lang="en"><head><title>Workspace</title></head><body><main>
 <section id="overview"><h1>Workspace</h1><p id="ov-name"></p><p id="ov-desc"></p><button id="edit" type="button">Edit settings</button></section>
 <form id="form" hidden novalidate><h1>Settings</h1>
  <label for="name">Workspace name</label><input id="name" aria-describedby="name-err"><p id="name-err"></p>
  <label for="email">Contact email</label><input id="email" aria-describedby="email-err"><p id="email-err"></p>
  <label for="desc">Description</label><textarea id="desc"></textarea>
  <button id="save" type="submit">Save settings</button><button id="cancel" type="button">Cancel</button><p role="status" id="status"></p>
 </form></main><script>
 const $=id=>document.getElementById(id);let saved={},busy=false,dirty=false;
 const show=view=>{$('overview').hidden=view!=='overview';$('form').hidden=view!=='form';};
 const fill=()=>{$('name').value=saved.name;$('email').value=saved.email;$('desc').value=saved.description||'';dirty=false;};
 const overview=()=>{$('ov-name').textContent=saved.name;$('ov-desc').textContent=saved.description||'';};
 fetch('/api/workspace').then(r=>r.json()).then(v=>{saved=v;overview();fill();});
 $('edit').onclick=()=>{fill();show('form');};
 for(const id of ['name','email','desc'])$(id).oninput=()=>{dirty=true;};
 $('cancel').onclick=()=>{if(busy)return;if(dirty&&!${confirmLeave?"confirm('Discard unsaved changes?')":'true'})return;fill();show('overview');};
 $('form').onsubmit=async event=>{event.preventDefault();if(busy)return;
  const value={name:$('name').value,email:$('email').value,description:$('desc').value};
  const errors={name:value.name.trim()?'':'Enter a workspace name.',email:/^.+@.+\\..+$/.test(value.email)?'':'Enter a valid email address.'};
  for(const key of ['name','email']){$(key+'-err').textContent=errors[key];errors[key]?$(key).setAttribute('aria-invalid','true'):$(key).removeAttribute('aria-invalid');}
  if(errors.name||errors.email)return;
  busy=true;$('save').disabled=true;$('status').textContent='Saving';
  try{const r=await fetch('/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});const body=await r.json();
   if(!r.ok){$('status').textContent=body.error;return;}saved=body;overview();dirty=false;$('status').textContent='Settings saved';}
  finally{busy=false;$('save').disabled=false;}};
 </script></body></html>`;
async function assessHtml(id,task,html,{followup=true}={}){
 const directory=mkdtempSync(join(tmpdir(),'altitude-assessor-'+id+'-'));
 try{
  writeFileSync(join(directory,'run.json'),JSON.stringify({id,task,build:'passed',...(followup?{followup:{build:'passed'}}:{}),metrics:{taskOutcome:null}}));
  for(const stage of followup?['initial','final']:['initial']){mkdirSync(join(directory,stage+'-dist'));writeFileSync(join(directory,stage+'-dist','index.html'),html);}
  return await assessArtifact(directory);
 }finally{rmSync(directory,{recursive:true,force:true});}
}
test('settings: invalid submission, confirmed leave and the follow-up description are exercised',async()=>{
 const result=await assessHtml('assessor-settings-adverse','settings',settingsApp({confirmLeave:true}));
 const [initial,final]=result.reports,by=(report,id)=>report.checks.find(check=>check.ruleId===id);
 for(const id of ['EVAL-INVALID','EVAL-INVALID-ERROR','EVAL-DIRTY-LEAVE','EVAL-DIRTY-DISCARD'])assert.equal(by(initial,id)?.passed,true,id+' '+JSON.stringify(initial.checks));
 assert.equal(by(initial,'EVAL-DESCRIPTION-SAVE'),undefined);assert.equal(initial.metrics.followupFeatures,null);
 assert.equal(by(final,'EVAL-DESCRIPTION-SAVE')?.passed,true,JSON.stringify(final.checks));assert.equal(by(final,'EVAL-DESCRIPTION-OVERVIEW')?.passed,true);assert.equal(by(final,'EVAL-DESCRIPTION-OVERVIEW').evidence.via,'load');
 assert.equal(result.metrics.adverseStates,true);assert.equal(result.metrics.followupFeatures,true);assert.equal(result.metrics.retainedInput,true);
 assert.ok(initial.checks.some(check=>check.ruleId==='EVAL-A11Y'&&check.state==='invalid'));
 assert.equal(result.postHoc,null);assert.equal(result.assessor.version,result.assessorVersion);
});
test('settings: leaving with unsaved edits and no confirmation loses the draft and fails',async()=>{
 const initial=(await assessHtml('assessor-settings-silent-leave','settings',settingsApp({confirmLeave:false}),{followup:false})).reports[0];
 const leave=initial.checks.find(check=>check.ruleId==='EVAL-DIRTY-LEAVE');
 assert.equal(leave?.passed,false,JSON.stringify(initial.checks));assert.equal(leave.evidence.prompted,false);
 assert.equal(initial.checks.find(check=>check.ruleId==='EVAL-DIRTY-DISCARD'),undefined);
});
const recordsApp=({guardStale,countBug})=>`<!doctype html><html lang="en"><head><title>Records</title></head><body><main><h1>Projects</h1>
 <form id="f"><label for="q">Search projects</label><input id="q"><button>Search</button></form>
 <button id="clear" type="button">Clear search</button><button id="refresh" type="button">Refresh</button><button id="sort" type="button">Sort by name</button>
 <p id="count"></p><div id="out"></div></main><script>
 const $=id=>document.getElementById(id);let selected=new Set(),query='',rows=[],descending=false,latest=0,clicks=0;
 const render=()=>{const shown=[...rows].sort((a,b)=>descending?b.name.localeCompare(a.name):a.name.localeCompare(b.name));
  $('out').innerHTML=shown.length?shown.map(row=>'<label><input type="checkbox" data-id="'+row.id+'"'+(selected.has(row.id)?' checked':'')+'><span>'+row.name+'</span></label>').join(''):query?'<p>No results</p>':'<p>No projects yet</p>';
  $('out').querySelectorAll('input').forEach(box=>box.onchange=()=>{box.checked?selected.add(box.dataset.id):selected.delete(box.dataset.id);clicks++;count();});count();};
 const count=()=>{$('count').textContent=(${countBug?'clicks':'selected.size'})+' selected';};
 async function load(value){const id=++latest;query=value;const r=await fetch('/api/records?q='+encodeURIComponent(value));${guardStale?'if(id!==latest)return;':''}
  if(!r.ok){$('out').innerHTML='<p>Could not load projects.</p><button type="button" id="retry">Try again</button>';$('retry').onclick=()=>load(query);return;}
  rows=await r.json();selected=new Set([...selected].filter(key=>rows.some(row=>row.id===key)));render();}
 $('f').onsubmit=event=>{event.preventDefault();load($('q').value);};$('clear').onclick=()=>{$('q').value='';load('');};$('refresh').onclick=()=>load(query);
 $('sort').onclick=()=>{descending=!descending;render();};load('');
 </script></body></html>`;
test('records: guarded queries, both sort directions, truthful counts and first-use empty pass',async()=>{
 const result=await assessHtml('assessor-records-adverse','records',recordsApp({guardStale:true,countBug:false}));
 const [initial,final]=result.reports,by=(report,id)=>report.checks.find(check=>check.ruleId===id);
 for(const id of ['EVAL-OUT-OF-ORDER','EVAL-SELECTED-COUNT','EVAL-FIRST-USE-EMPTY','EVAL-SELECTION'])assert.equal(by(initial,id)?.passed,true,id+' '+JSON.stringify(initial.checks));
 assert.equal(by(initial,'EVAL-SORT'),undefined);assert.equal(by(final,'EVAL-SORT')?.passed,true,JSON.stringify(final.checks));
 assert.equal(result.metrics.adverseStates,true);assert.equal(result.metrics.followupFeatures,true);
 assert.ok(initial.checks.some(check=>check.ruleId==='EVAL-A11Y'&&check.state==='first-use-empty'));
 assert.ok(initial.checks.some(check=>check.ruleId==='EVAL-A11Y-INCOMPLETE'));assert.ok(Array.isArray(initial.axeIncomplete));
});
test('records: a stale response replacing newer results and a count that never decrements both fail',async()=>{
 const initial=(await assessHtml('assessor-records-defects','records',recordsApp({guardStale:false,countBug:true}),{followup:false})).reports[0];
 const by=id=>initial.checks.find(check=>check.ruleId===id);
 assert.equal(by('EVAL-OUT-OF-ORDER')?.passed,false,JSON.stringify(initial.checks));assert.equal(by('EVAL-OUT-OF-ORDER').evidence.atlasShown,true);
 assert.equal(by('EVAL-SELECTED-COUNT')?.passed,false);
 assert.equal(initial.metrics.adverseStates,false);
});
test('an assessment under a different assessor than the run recorded is marked post-hoc',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'altitude-assessor-posthoc-'));
 try{
  writeFileSync(join(directory,'run.json'),JSON.stringify({id:'assessor-posthoc',task:'settings',build:'failed',assessor:{version:'1.9.0',sha256:'0'.repeat(64)},metrics:{}}));
  const result=await assessArtifact(directory);
  assert.equal(result.postHoc,true);assert.equal(result.frozenAssessor.version,'1.9.0');
 }finally{rmSync(directory,{recursive:true,force:true});}
});
