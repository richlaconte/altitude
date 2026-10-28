// Controlled service tests: mutations update service data only when explicitly accepted.
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
const root = fileURLToPath(new URL('../../', import.meta.url));
const temp = await mkdtemp(join(tmpdir(), 'altitude-patterns-'));
const aliases = process.env.ALT_PACKAGE_ROOT ? { react: resolve(process.env.ALT_PACKAGE_ROOT, '../react'), 'react-dom': resolve(process.env.ALT_PACKAGE_ROOT, '../react-dom') } : {};
const bundle = await build({ alias: aliases, stdin: { contents: `import * as React from 'react'; import {createRoot} from 'react-dom/client'; import * as Altitude from '${process.env.ALT_PACKAGE_ROOT ? resolve(process.env.ALT_PACKAGE_ROOT, 'dist/index.js') : process.env.ALT_PATTERN_ENTRY || './project/components/src/index.tsx'}'; window.React=React; window.createRoot=createRoot; window.Altitude=Altitude;`, resolveDir: root, loader: 'tsx' }, bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"development"' } });
await writeFile(join(temp, 'bundle.js'), bundle.outputFiles[0].contents);
await writeFile(join(temp, 'index.html'), '<!doctype html><html lang="en"><title>Pattern contracts</title><body><div id="root"></div><script src="bundle.js"></script></body></html>');
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
let checks = 0;
const rules = JSON.parse(await readFile(resolve(root, 'project/framework/rules.json'), 'utf8')).rules;
const ruleAliases = { 'FORM-PRESERVE-INPUT':'ALT-EDIT-001', 'FORM-STALE-RESPONSE':'ALT-EDIT-001', 'FORM-VALIDATION-TIMING':'ALT-EDIT-003',
 'FORM-UNSAVED':'ALT-EDIT-003', 'FORM-ERROR-ASSOCIATION':'ALT-EDIT-002', 'ACTION-TRUE-OUTCOME':'ALT-EDIT-001', 'ACTION-DUPLICATE':'ALT-ACTION-001',
 'COLLECTION-STATES':'ALT-COLLECTION-001', 'COLLECTION-SELECTION':'ALT-COLLECTION-001', 'COLLECTION-RECOVERY':'ALT-COLLECTION-001', 'COLLECTION-IDENTITY':'ALT-COLLECTION-001',
 'ACTION-CONFIRMATION':'ALT-ACTION-001', 'ACTION-FOCUS':'ALT-ACTION-001', 'ACTION-RECOVERY':'ALT-ACTION-001', 'ACTION-UNDO':'ALT-ACTION-001', 'ACTION-TARGET':'ALT-ACTION-001',
 'REVIEW-RETAIN':'ALT-REVIEW-001', 'REVIEW-RECOVERY':'ALT-REVIEW-001', 'REVIEW-CONFIRMATION':'ALT-REVIEW-001', 'REVIEW-PROCESS':'ALT-REVIEW-001' };
const check = (condition, message) => {
 const ruleId = ruleAliases[message.split(':')[0]] || 'ALT-STATUS-001';
 if (!condition) console.error(JSON.stringify({ ruleId, classification:'deterministic', scope:'controlled fixture contract; not a general usability verdict',
  observed:'Contract assertion returned false', expected:message, repair:rules.find(rule=>rule.id===ruleId)?.repair }));
 assert.ok(condition, `${ruleId}: ${message}`); checks++;
};
const page = await browser.newPage();
const errors = []; page.on('pageerror', error => errors.push(error.message));
await page.goto(`file://${join(temp, 'index.html')}`);
const mountEdit = async (validationMode = 'submit') => {
 await page.evaluate(mode => {
  window.fixtureRoot?.unmount(); const R = React, h = R.createElement, A = Altitude;
  const api = { writes: [], data: { name: 'Original' }, leaves: [] }; window.harness = api;
  function Fixture() {
   const form = A.useEditRecord({ initialValue: { name: 'Original' }, validationMode: mode,
    validate: value => value.name.trim() ? {} : { name: 'Enter a name.' },
    save: draft => new Promise(resolve => { api.writes.push({ draft, resolve: result => { if (result.ok) api.data = result.value; resolve(result); } }); }),
   }); api.form = form;
   return h('form', { noValidate: true, onSubmit: e => { e.preventDefault(); void form.submit(); } },
    h(A.ErrorSummary, { errors: Object.entries(form.errors).map(([key,message]) => ({ id: key, label: 'Name', message })), focusKey: form.submitCount }),
    h(A.Field, { label: 'Name', error: form.errors.name }, h(A.Input, { id: 'name', value: form.draft.name, onChange: e => form.setField('name', e.target.value), onBlur: () => form.validateField('name') })),
    h('button', { type: 'submit' }, 'Save changes'), h(A.WorkflowStatus, null, form.status), h('span', { id: 'phase' }, form.phase));
  }
  window.fixtureRoot = createRoot(document.getElementById('root')); fixtureRoot.render(h(R.StrictMode, null, h(A.AltitudeProvider, null, h(Fixture))));
 }, validationMode);
 await page.getByRole('textbox', { name: 'Name' }).waitFor();
};
const resolveWrite = (result, index = 0) => page.evaluate(({result,index}) => harness.writes[index].resolve(result), {result,index});
const phase = value => page.waitForFunction(value => document.getElementById('phase').textContent === value, value);
try {
 check(await page.evaluate(() => typeof Altitude.useEditRecord === 'function'), 'FORM-PRESERVE-INPUT: edit-record hook is exported');
 await mountEdit(); const input = page.getByRole('textbox', { name: 'Name' });
 await input.fill(''); await input.blur(); check(await page.getByRole('alert').count() === 0, 'FORM-VALIDATION-TIMING: submit policy does not validate untouched blur');
 await page.getByRole('button', { name: 'Save changes' }).click(); await phase('invalid');
 check(await page.evaluate(() => harness.writes.length) === 0, 'FORM-ERROR-ASSOCIATION: invalid values never persist');
 check(await input.getAttribute('aria-invalid') === 'true', 'FORM-ERROR-ASSOCIATION: same error drives field');
 await page.getByRole('link', { name: 'Name: Enter a name.' }).click(); check(await input.evaluate(el => el === document.activeElement), 'FORM-ERROR-ASSOCIATION: summary link focuses field');
 await input.fill('Retained'); check(await page.getByRole('link', { name: /Enter a name/ }).count() === 0, 'FORM-ERROR-ASSOCIATION: correction updates one error source');
 await page.evaluate(() => { harness.form.submit(); harness.form.submit(); }); await phase('submitting');
 check(await page.evaluate(() => harness.writes.length) === 1, 'ACTION-DUPLICATE: same-tick submissions dispatch once');
 check(await page.evaluate(() => harness.data.name) === 'Original', 'ACTION-TRUE-OUTCOME: pending has not changed actual service data');
 check(await page.getByRole('status').textContent() === 'Saving changes', 'ACTION-TRUE-OUTCOME: pending never claims success');
 check(await page.evaluate(() => harness.form.requestLeave('navigation', () => {throw Error('must not prompt during pending');}))===false,'FORM-UNSAVED: pending navigation blocked without claiming cancellation');
 await resolveWrite({ ok: false, error: 'Connection unavailable. Try again.' }); await phase('failed');
 check(await input.inputValue() === 'Retained', 'FORM-PRESERVE-INPUT: failed write retains draft');
 await page.evaluate(() => { void harness.form.submit(); }); await resolveWrite({ ok: true, value: { name: 'Retained' } }, 1); await phase('saved');
 check(await page.evaluate(() => harness.data.name === 'Retained' && !harness.form.dirty), 'ACTION-TRUE-OUTCOME: retry changes data then clears dirty state');
 await input.fill('First'); await page.evaluate(() => { void harness.form.submit(); }); await input.fill('Newer');
 await resolveWrite({ ok: true, value: { name: 'First' } }, 2); await phase('editing');
 check(await page.evaluate(() => harness.form.draft.name === 'Newer' && harness.form.dirty && harness.data.name === 'First'), 'FORM-STALE-RESPONSE: accepted older save cannot overwrite newer edits');
 check(!(await page.getByRole('status').textContent()).includes('Changes saved'), 'FORM-STALE-RESPONSE: current draft not falsely marked saved');
 check(await page.evaluate(() => harness.form.requestLeave('back', () => false)) === false, 'FORM-UNSAVED: retain blocks Back');
 check(await page.evaluate(() => harness.form.requestLeave('navigation', () => true)) === true, 'FORM-UNSAVED: explicit discard permits navigation');
 check(await page.evaluate(() => harness.form.draft.name) === 'First', 'FORM-UNSAVED: discard restores accepted baseline');
 check(await page.evaluate(() => harness.form.requestLeave('cancel', () => { throw Error('must not ask clean form'); })) === true, 'FORM-UNSAVED: clean leave requires no discard decision');
 await mountEdit('blur'); await page.getByRole('textbox', { name: 'Name' }).fill(''); await page.getByRole('textbox', { name: 'Name' }).blur(); await phase('invalid');
 check(await page.getByRole('alert').count() === 1, 'FORM-VALIDATION-TIMING: blur reports a single inline alert');
 await mountEdit(); await page.getByRole('textbox', {name:'Name'}).fill('Server rejects this');
 await page.getByRole('button',{name:'Save changes'}).click(); await phase('submitting');
 await resolveWrite({ok:false,error:'Check the name.',errors:{name:'This name is taken.'}}); await phase('failed');
 check(await page.getByRole('region',{name:'Check these fields'}).evaluate(el=>el===document.activeElement),'FORM-ERROR-ASSOCIATION: late server errors focus the summary once');
 await page.getByRole('textbox',{name:'Name'}).fill('Correction');
 check(await page.getByRole('textbox',{name:'Name'}).evaluate(el=>el===document.activeElement),'FORM-ERROR-ASSOCIATION: correcting errors never steals focus back');
 // Collection: out-of-order responses cannot replace a newer query; selection is explicit.
 check(await page.evaluate(() => typeof Altitude.useAsyncCollection === 'function'), 'COLLECTION-STATES: collection hook is exported');
 await page.evaluate(() => {
  fixtureRoot.unmount(); const h = React.createElement; const api = { reads: [] }; window.harness = api;
  function Fixture() { const collection = Altitude.useAsyncCollection({ initialQuery: '', isFiltered: query => query !== '', getKey: item => item.id, selection: 'preserve',
   load: (query, context) => new Promise((resolve,reject) => api.reads.push({query,context,resolve,reject})) }); api.collection = collection;
   return h('div', null, h('span', {id:'phase'}, collection.phase), h(Altitude.WorkflowStatus, null, collection.status), collection.items.map(item => h('p',{key:item.id},item.name)));
  } fixtureRoot = createRoot(document.getElementById('root')); fixtureRoot.render(h(Fixture));
 }); await phase('loading');
 await page.evaluate(() => harness.reads[0].resolve([{id:'a',name:'Alpha'},{id:'b',name:'Beta'}])); await phase('populated');
 await page.evaluate(() => { harness.collection.toggleSelection('a'); harness.collection.setQuery('missing'); }); await phase('refreshing');
 await page.evaluate(() => harness.reads[1].resolve([])); await phase('no-results');
 check(await page.evaluate(() => harness.collection.selectedKeys.has('a')), 'COLLECTION-SELECTION: preserve policy explicitly retains hidden stable key');
 await page.evaluate(() => harness.collection.reset()); await phase('refreshing');
 await page.evaluate(() => harness.reads[2].reject(Error('private server failure'))); await phase('failed');
 check(!(await page.getByRole('status').textContent()).includes('private'), 'COLLECTION-RECOVERY: safe failure feedback');
 await page.evaluate(() => harness.collection.refresh()); await page.evaluate(() => harness.reads[3].resolve([])); await phase('empty');
 await page.evaluate(() => harness.collection.setQuery('older')); await page.evaluate(() => harness.collection.setQuery('newer'));
 await page.evaluate(() => harness.reads[5].resolve([{id:'n',name:'Newest'}])); await phase('populated');
 await page.evaluate(() => harness.reads[4].resolve([{id:'o',name:'Outdated'}]));
 check(await page.evaluate(() => harness.collection.items[0].id) === 'n', 'COLLECTION-IDENTITY: stale query cannot replace current results');
 await page.evaluate(() => harness.collection.refresh()); await page.evaluate(() => harness.reads[6].resolve([{id:'n',name:'One'},{id:'n',name:'Two'}])); await phase('failed');
 check(await page.evaluate(() => harness.collection.items[0].name) === 'Newest', 'COLLECTION-IDENTITY: duplicate keys reject result and retain last good data');
 await page.evaluate(() => {
  fixtureRoot.unmount();const h=React.createElement;const api={};window.harness=api;
  function Fixture(){const collection=Altitude.useAsyncCollection({initialQuery:'',isFiltered:q=>!!q,selection:'clear-on-query',getKey:item=>item.id,load:()=>[{id:'a'}]});api.collection=collection;return h('span',{id:'phase'},collection.phase);}
  fixtureRoot=createRoot(document.getElementById('root'));fixtureRoot.render(h(React.StrictMode,null,h(Fixture)));
 });await phase('populated');await page.evaluate(()=>{harness.collection.toggleSelection('a');harness.collection.setQuery('other');});await phase('populated');
 check(await page.evaluate(()=>harness.collection.selectedKeys.size)===0,'COLLECTION-SELECTION: clear-on-query policy drops selection explicitly');
 // Consequential action: confirmation does not mutate; Undo has a real inverse operation.
 check(await page.evaluate(() => typeof Altitude.useConsequentialAction === 'function'), 'ACTION-TRUE-OUTCOME: consequential hook is exported');
 await page.evaluate(() => {
  fixtureRoot.unmount(); const h = React.createElement; const api = { data:['a'], writes:[], undos:[] }; window.harness=api;
  function Fixture() { const action = Altitude.useConsequentialAction({ target:'Alpha', consequence:'Move Alpha to trash.', requiresConfirmation:true,
   execute: () => new Promise(resolve => api.writes.push(result => {if(result.ok) api.data=[]; resolve(result);})),
   undo: result => new Promise(resolve => api.undos.push(outcome => {if(outcome.ok) api.data=[result]; resolve(outcome);})),
   focusFallback: () => document.getElementById('fallback') }); api.action=action;
   return h('div',null,h('button',{id:'trigger',onClick:action.request},'Delete Alpha'),h('button',{id:'fallback'},'Next record'),h('span',{id:'phase'},action.phase),h(Altitude.WorkflowStatus,null,action.status));
  } fixtureRoot=createRoot(document.getElementById('root')); fixtureRoot.render(h(Fixture));
 }); await phase('idle');
 await page.getByRole('button',{name:'Delete Alpha'}).click(); await phase('confirming');
 check(await page.evaluate(() => harness.writes.length === 0 && harness.data.length === 1), 'ACTION-CONFIRMATION: intent decision does not execute');
 await page.evaluate(() => harness.action.cancel()); await phase('idle');
 check(await page.locator('#trigger').evaluate(el=>el===document.activeElement),'ACTION-FOCUS: cancel restores trigger');
 await page.evaluate(() => { harness.action.request(); harness.action.confirm(); harness.action.confirm(); }); await phase('pending');
 check(await page.evaluate(() => harness.writes.length) === 1,'ACTION-DUPLICATE: repeated confirmation dispatches once');
 await page.evaluate(() => harness.writes[0]({ok:false,error:'Could not delete. Try again.'})); await phase('failed');
 check(await page.evaluate(() => harness.data.length) === 1,'ACTION-RECOVERY: failed action leaves service data intact');
 await page.evaluate(() => { void harness.action.retry(); }); await page.evaluate(() => harness.writes[1]({ok:true,value:'a'})); await phase('succeeded');
 check(await page.evaluate(() => harness.data.length === 0 && harness.action.canUndo),'ACTION-TRUE-OUTCOME: succeeded after data mutation with real undo');
 await page.evaluate(() => { void harness.action.undo(); }); await phase('undoing');
 await page.evaluate(() => harness.undos[0]({ok:false,error:'Could not restore. Try again.'})); await phase('failed');
 await page.evaluate(() => { void harness.action.retry(); }); await page.evaluate(() => harness.undos[1]({ok:true})); await phase('undone');
 check(await page.evaluate(() => harness.data[0]) === 'a','ACTION-UNDO: retry performs real restoration');
 await page.evaluate(() => {
  fixtureRoot.unmount(); const h=React.createElement; const api={writes:[],data:['first','second']};window.harness=api;
  function Fixture(){const [target,setTarget]=React.useState('first');api.setTarget=setTarget;api.observedTarget=target;
   const action=Altitude.useConsequentialAction({target,consequence:`Delete ${target}.`,requiresConfirmation:true,
    execute:()=>new Promise(resolve=>api.writes.push(()=>{api.data=api.data.filter(id=>id!==target);resolve({ok:true,value:target});})),focusFallback:()=>document.getElementById('fallback')});api.action=action;
   return h('div',null,action.phase!=='succeeded'&&h('button',{id:'trigger',onClick:action.request},'Delete record'),h('h2',{id:'fallback',tabIndex:-1},'Remaining records'),h('span',{id:'phase'},action.phase));
  }fixtureRoot=createRoot(document.getElementById('root'));fixtureRoot.render(h(Fixture));
 });await phase('idle');await page.getByRole('button',{name:'Delete record'}).click();await page.evaluate(()=>harness.setTarget('second'));await page.waitForFunction(()=>harness.observedTarget==='second');
 check(await page.evaluate(()=>harness.action.target)==='first','ACTION-TARGET: confirmation retains the named target when parent options change');
 await page.evaluate(()=>harness.action.confirm());await page.evaluate(()=>harness.writes[0]());await phase('succeeded');
 check(await page.evaluate(()=>harness.data.join(','))==='second','ACTION-TARGET: confirmed mutation applies only to the captured target');
 check(await page.locator('#fallback').evaluate(el=>el===document.activeElement),'ACTION-FOCUS: removed trigger restores logical fallback after DOM commit');
 // Review: correcting preserves answers; only a real accepted receipt completes the process.
 check(await page.evaluate(() => typeof Altitude.useReviewSubmit === 'function'), 'REVIEW-RETAIN: review hook is exported');
 await page.evaluate(() => {
  fixtureRoot.unmount(); const h=React.createElement; const api={writes:[],data:[]}; window.harness=api;
  function Fixture(){const review=Altitude.useReviewSubmit({initialValue:{name:'Original',note:'Keep this answer'},validate:value=>value.name?{}:{name:'Enter a name.'},
   submit:draft=>new Promise(resolve=>api.writes.push(result=>{if(result.ok)api.data.push(draft);resolve(result);}))});api.review=review;
   return h('div',null,h('span',{id:'phase'},review.phase),h(Altitude.WorkflowStatus,null,review.status),review.receipt&&h('p',null,review.receipt.reference));
  } fixtureRoot=createRoot(document.getElementById('root'));fixtureRoot.render(h(Fixture));
 }); await phase('editing');
 await page.evaluate(() => harness.review.review()); await phase('review'); await page.evaluate(() => harness.review.correct()); await phase('editing');
 await page.evaluate(() => {harness.review.setField('name','Corrected'); harness.review.review();}); await phase('review');
 check(await page.evaluate(() => harness.review.draft.note) === 'Keep this answer','REVIEW-RETAIN: correcting preserves other answers');
 await page.evaluate(() => {harness.review.submit();harness.review.submit();}); await phase('submitting');
 check(await page.evaluate(() => harness.writes.length===1 && harness.review.receipt===undefined),'ACTION-TRUE-OUTCOME: submission locks and no premature receipt');
 await page.evaluate(() => harness.writes[0]({ok:false,error:'Connection interrupted. Try again.'})); await phase('review');
 check(await page.evaluate(() => harness.review.draft.name) === 'Corrected','REVIEW-RECOVERY: failed/interrupted submit preserves corrected data');
 await page.evaluate(() => {void harness.review.submit();}); await page.evaluate(() => harness.writes[1]({ok:true,receipt:{reference:'Accepted #42'}})); await phase('complete');
 check(await page.evaluate(() => harness.data.length===1 && harness.data[0].name==='Corrected' && harness.review.receipt.reference==='Accepted #42'),'REVIEW-CONFIRMATION: persistent receipt corresponds to actual accepted data');
 await page.evaluate(() => {harness.review.correct();harness.review.setField('name','Wrong');harness.review.submit();}); await phase('complete');
 check(await page.evaluate(() => harness.writes.length)===2,'REVIEW-CONFIRMATION: completed transaction cannot accidentally resubmit');
 await page.evaluate(() => {
  fixtureRoot.unmount(); const h=React.createElement;const api={writes:0};window.harness=api;
  function Fixture(){const review=Altitude.useReviewSubmit({initialValue:{name:'Ready'},validate:()=>({}),submit:()=>{api.writes++;return {ok:true};}});api.review=review;return h('span',{id:'phase'},review.phase);}
  fixtureRoot=createRoot(document.getElementById('root'));fixtureRoot.render(h(Fixture));
 });await phase('editing');await page.evaluate(()=>{void harness.review.submit();});
 check(await page.evaluate(()=>harness.writes)===0,'REVIEW-PROCESS: cannot submit before review');
 await page.evaluate(()=>{harness.review.review();void harness.review.submit();});await page.waitForFunction(()=>harness.writes===1);await phase('review');
 check(await page.evaluate(()=>harness.review.receipt===undefined && !!harness.review.error),'REVIEW-CONFIRMATION: malformed JavaScript success without receipt is recoverable failure');
 check(errors.length === 0, `no browser errors: ${errors.join('; ')}`);
 console.log(`Workflow patterns: ${checks} assertions passed; Chromium ${browser.version()}.`);
} finally { await browser.close(); await rm(temp, { recursive:true, force:true }); }
