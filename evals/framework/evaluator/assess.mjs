// Evaluator-side only. Neither these injections nor the rubric enter generation workspaces.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from '../../../build/node_modules/playwright-core/index.mjs';
import { protocolVersion } from '../protocol.mjs';
import { assessorFingerprint } from './frozen.mjs';
const require=createRequire(import.meta.url);

/** An unknown check is never silently counted as passing. A demonstrated defect remains a defect even if other checks are unknown. */
export function aggregate(values) {
 if(values.some(value=>value===false))return false;
 return values.length && values.every(value=>value===true) ? true : null;
}
export function measuredRegressions(initial, final) {
 const baseline=initial.filter(check=>check.passed===true);
 return aggregate(baseline.map(check=>final.find(candidate=>candidate.ruleId===check.ruleId&&candidate.state===check.state)?.passed ?? null));
}
export function metricsFromChecks(checks, task) {
 const value=(...ids)=>aggregate(ids.map(id=>checks.find(check=>check.ruleId===id)?.passed ?? null));
 return {
  guidanceDiscovery:null,patternSelection:null,
  taskOutcome:task==='settings'?value('EVAL-SAVE','EVAL-RELOAD'):value('EVAL-QUERY','EVAL-RESET'),
  applicableStates:null,retainedInput:task==='settings'?value('EVAL-RETAIN','EVAL-INVALID'):null,
  recovery:task==='settings'?value('EVAL-RETAIN','EVAL-SAVE'):value('EVAL-LOAD-RECOVERY'),
  adverseStates:task==='settings'?value('EVAL-INVALID','EVAL-DIRTY-LEAVE','EVAL-DIRTY-DISCARD'):value('EVAL-OUT-OF-ORDER','EVAL-FIRST-USE-EMPTY'),
  // Only the final stage exercises follow-up features, so the initial stage leaves this null.
  followupFeatures:task==='settings'?value('EVAL-DESCRIPTION-SAVE','EVAL-DESCRIPTION-OVERVIEW'):value('EVAL-SORT','EVAL-SELECTED-COUNT'),
  keyboardPassed:null,axeScanPassed:aggregate(checks.filter(check=>check.ruleId==='EVAL-A11Y').map(check=>check.passed)),
  contentAccuracy:null,responsive:value('EVAL-REFLOW'),followupPreserved:null,complexity:null,developmentCost:null,
 };
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate, timeout=3500) {
 const end=Date.now()+timeout;
 do { if(await predicate())return true; await sleep(40); }while(Date.now()<end);
 return false;
}
class Unmeasured extends Error {}
async function unique(locator, description) {
 await until(async()=>await locator.count()>0,1800);
 const visible=[];
 for(const candidate of await locator.all())if(await candidate.isVisible())visible.push(candidate);
 if(visible.length!==1)throw new Unmeasured(`${description}: found ${visible.length} visible candidates; selector adaptation or independent review required.`);
 return visible[0];
}
/** Several visible candidates are accepted only when exactly one, or several identically named ones, match the preferred name. */
async function preferred(locator, prefer, description) {
 await until(async()=>await locator.count()>0,1800);
 const visible=[];
 for(const candidate of await locator.all())if(await candidate.isVisible())visible.push({candidate,name:await candidate.evaluate(element=>(element.getAttribute('aria-label')||element.textContent||'').trim())});
 if(visible.length===1)return visible[0].candidate;
 const matches=visible.filter(entry=>prefer.test(entry.name));
 if(matches.length===1||(matches.length>1&&matches.every(entry=>entry.name===matches[0].name)))return matches[0].candidate;
 throw new Unmeasured(`${description}: found ${visible.length} visible candidates (${visible.map(entry=>entry.name).join(' | ')}); selector adaptation or independent review required.`);
}
async function settleAnimations(page) {
 return page.evaluate(async()=>{
  const finite=()=>document.getAnimations().filter(animation=>animation.playState==='running'&&animation.effect?.getTiming().iterations!==Infinity);
  const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const deadline=performance.now()+3000;
  while(performance.now()<deadline){
   const active=finite();
   if(!active.length){await frames();return {settled:true,forced:[]};}
   await Promise.race([Promise.all(active.map(animation=>animation.finished.catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,100))]);
  }
  // Pilot 2026-10-23: a finite animation still running after 3 s left a saved-state scan unmeasured. Jump finite
  // animations to their end state, which is what a settled scan sees, and report them; one that restarts stays unsettled.
  const forced=finite().map(animation=>{const target=animation.effect?.target;try{animation.finish();}catch{}return {name:animation.animationName||animation.transitionProperty||null,target:target?`${target.tagName.toLowerCase()}.${String(target.className).trim().split(/\s+/).join('.')}`:null};});
  await frames();
  return {settled:!finite().length,forced};
 });
}
/** Visible, de-duplicated record names in document order. */
function recordOrder(page) {
 return page.evaluate(()=>{
  const names=['Atlas','Beacon','Cedar'],seen=[],walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  for(let node=walker.nextNode();node;node=walker.nextNode()){const value=node.nodeValue.trim(),parent=node.parentElement;if(names.includes(value)&&!seen.includes(value)&&!parent.closest('option,select,[hidden],[aria-hidden="true"]')&&parent.getClientRects().length)seen.push(value);}
  return seen.join(',');
 });
}
/** The first "N selected" style count on the page; "none selected" is 0 and no count is null. */
export function readSelectedCount(text) {
 if(/\b(?:no|none)\s+(?:[a-z]+\s+)?selected\b/i.test(text))return 0;
 const match=text.match(/(\d+)\s+(?:of\s+\d+\s+)?(?:[a-z]+\s+)?selected\b/i)||text.match(/\bselected\s*:?\s*(\d+)/i);
 return match?Number(match[1]):null;
}
/** Counts agree when every displayed count equals the checked rows; a hidden count is accepted only for zero. */
export function truthfulCounts(readings) {
 if(!readings.some(reading=>reading.count!==null))return null;
 if(readings.some(reading=>reading.count!==null&&reading.count!==reading.expected))return false;
 return readings.every(reading=>reading.count!==null||reading.expected===0)?true:null;
}

export async function assessArtifact(runDirectory) {
 const runDir=resolve(runDirectory),metadata=JSON.parse(readFileSync(join(runDir,'run.json'),'utf8'));
 const reports=[];
 for(const stage of ['initial','final']){
  const folder=join(runDir,stage+'-dist');
  const invalidBuild=stage==='initial'?metadata.build!=='passed':metadata.followup?.build!=='passed'||metadata.build!=='passed';
  if(!existsSync(join(folder,'index.html'))||invalidBuild){
   reports.push({stage,checks:[],metrics:metricsFromChecks([],metadata.task),unmeasured:stage==='final'&&!metadata.followup?'No follow-up was run (initial generation ineligible); final-dist duplicates the initial artifact and is not follow-up evidence.':'No verified successful build for this stage; an old dist directory is not evidence of a successful follow-up.'});continue;
  }
  let record={name:'Northwind',email:'owner@example.com',description:''},rejectWrite=false,rejectLoad=false,delay=0,writeGate=null,releaseWrites=null,queryDelay=null,emptyCollection=false;
  const writes=[],loads=[];
  const rows=[{id:'p1',name:'Atlas'},{id:'p2',name:'Beacon'},{id:'p3',name:'Cedar'}];
  const server=createServer(async(req,res)=>{
   try{
    const url=new URL(req.url,'http://localhost');res.setHeader('Content-Type','application/json');
    if(url.pathname.startsWith('/api/')){
     const capturedDelay=delay||(url.pathname==='/api/records'&&queryDelay?queryDelay(url.searchParams.get('q')||''):0),writeFailure=rejectWrite,loadFailure=rejectLoad,capturedGate=writeGate;
     if(url.pathname==='/api/workspace'&&req.method==='PUT'){
      let body='';for await(const chunk of req)body+=chunk;
      const next=JSON.parse(body),entry={payload:next,outcome:'pending'};writes.push(entry);
      if(capturedGate)await capturedGate;
      if(capturedDelay)await sleep(capturedDelay);
      if(writeFailure){entry.outcome='rejected';res.statusCode=503;res.end(JSON.stringify({error:'Service unavailable. Try saving again.'}));return;}
      if(!next.name?.trim()||!/^.+@.+\..+$/.test(next.email)){entry.outcome='invalid';res.statusCode=422;res.end(JSON.stringify({error:'Enter a workspace name and valid email.'}));return;}
      record={...record,...next};entry.outcome='accepted';res.end(JSON.stringify(record));return;
     }
     const entry={path:url.pathname,query:url.searchParams.get('q')||'',outcome:'pending'};loads.push(entry);
     if(capturedDelay)await sleep(capturedDelay);
     if(url.pathname==='/api/workspace'){entry.outcome='accepted';res.end(JSON.stringify(record));return;}
     if(url.pathname!=='/api/records'){entry.outcome='unknown-route';res.statusCode=404;res.end(JSON.stringify({error:'Unknown endpoint'}));return;}
     if(loadFailure){entry.outcome='rejected';res.statusCode=503;res.end(JSON.stringify({error:'Could not load records. Try again.'}));return;}
     const result=(emptyCollection?[]:rows).filter(row=>row.name.toLowerCase().includes(entry.query.toLowerCase()));entry.outcome='accepted';entry.ids=result.map(row=>row.id);res.end(JSON.stringify(result));return;
    }
    const path=resolve(folder,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
    if(!path.startsWith(folder+sep)){res.statusCode=403;res.end();return;}
    try{res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(path)]||'text/plain');res.end(readFileSync(path));}catch{res.statusCode=404;res.end();}
   }catch(error){res.statusCode=400;res.end(JSON.stringify({error:'Invalid request'}));}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  const checks=[],errors=[];
  const check=(ruleId,state,evidence,passed,expected,repair,category='integration')=>checks.push({ruleId,state,category,evidence,passed,expected,repair});
  const attempt=async(state,operation)=>{
   try{await operation();}
   catch(error){check('EVAL-HARNESS',state,String(error.message),null,'Determine whether the artifact or evaluator selector prevented this scenario.','Inspect the screenshot and source; adapt the evaluator before declaring an unlocated control a product failure.','contextual');}
  };
  try{
   browser=await chromium.launch(process.env.CHROME?{executablePath:process.env.CHROME}:{});
   const page=await browser.newPage();page.setDefaultTimeout(2500);page.on('pageerror',error=>errors.push(error.message));
   // Browser-side dispatch count: Chromium can hold a second same-URL write behind a pending one, hiding it from the server.
   const dispatched=[];page.on('request',request=>{if(request.method()!=='GET'&&new URL(request.url()).pathname==='/api/workspace')dispatched.push(request.method());});
   const url=`http://127.0.0.1:${server.address().port}`;
   const axe=async(state)=>{ try{
    const settle=await settleAnimations(page);
    if(!settle.settled)throw new Unmeasured(`Finite animations kept running after 3 seconds and after being finished (${JSON.stringify(settle.forced)}); contrast snapshot is unstable.`);
    if(!await page.evaluate(()=>!!window.axe))await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
    const result=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));
    const findings=result.violations.map(violation=>({id:violation.id,impact:violation.impact,help:violation.help,helpUrl:violation.helpUrl,nodes:violation.nodes.map(node=>({target:node.target,summary:node.failureSummary}))}));
    const incomplete=result.incomplete.map(item=>({id:item.id,impact:item.impact,help:item.help,nodes:item.nodes.map(node=>({target:node.target,summary:node.failureSummary}))}));
    check('EVAL-A11Y',state,{violations:findings,forcedAnimations:settle.forced},findings.length===0,'No violations of the executed axe rules in this state.','Inspect affected elements; incomplete rules and manual keyboard/AT review remain separate.','deterministic');
    check('EVAL-A11Y-INCOMPLETE',state,incomplete,incomplete.length?null:true,'axe could decide every executed rule in this state.','Review each incomplete rule by hand (often contrast over images, gradients or overlapping elements).','contextual');
   }catch(error){check('EVAL-A11Y',state,String(error.message),null,'A stable state and successful axe execution are required.','Resolve scan/animation/tooling failure and rerun; do not treat missing results as no defects.','contextual');} };
   // Each later scenario starts from a fresh load so state left by an earlier one cannot leak into it.
   const fresh=async()=>{const start=loads.length;await page.goto(url);await until(()=>loads.slice(start).some(entry=>entry.outcome!=='pending'));await settleAnimations(page);};
   await page.goto(url);await until(()=>loads.some(entry=>entry.outcome!=='pending'));await axe('initial');
   if(metadata.task==='settings'){
    const enterSettings=async()=>{
     const fields=page.getByRole('textbox',{name:/workspace name|^name$/i});
     if(!await fields.count()){
      const entry=await unique(page.getByRole('button',{name:/edit (?:settings|workspace)|workspace settings|manage settings/i}).or(page.getByRole('link',{name:/edit (?:settings|workspace)|workspace settings|manage settings/i})),'entry to workspace settings');
      await entry.click();
     }
     return unique(fields,'workspace name');
    };
    await attempt('failed-save-and-retry',async()=>{
     let name=await enterSettings();
     let email=await unique(page.getByRole('textbox',{name:/email/i}),'contact email');
     const save=()=>unique(page.getByRole('button',{name:/save|retry|try.*again/i}),'save/retry action');
     await name.fill('Evaluation workspace');await email.fill('evaluation@example.com');rejectWrite=true;
     const before=writes.length;await(await save()).click();
     const rejected=await until(()=>writes.slice(before).some(entry=>entry.outcome==='rejected'));
     const actualDraft={name:await name.inputValue(),email:await email.inputValue()};
     check('EVAL-RETAIN','failed-save',{rejectedOperationObserved:rejected,draft:actualDraft},rejected?actualDraft.name==='Evaluation workspace'&&actualDraft.email==='evaluation@example.com':null,'A service-rejected save retains both exact entered values.','Keep drafts separate from acknowledged service data.');
     check('EVAL-TRUE-OUTCOME','failed-save',{rejectedOperationObserved:rejected,record},rejected?record.name==='Northwind'&&record.email==='owner@example.com':null,'A known failed operation does not mutate the service record. This does not score success copy.','Only claim the result actually acknowledged by the persistence service.');
     if(rejected)await axe('failed-save');
     const retryCandidate=page.getByRole('button',{name:/retry|try.*again/i});
     rejectWrite=false;const retryStart=writes.length;await(await(await retryCandidate.count()?unique(retryCandidate,'retry action'):save())).click();
     const accepted=await until(()=>writes.slice(retryStart).some(entry=>entry.outcome==='accepted'));
     check('EVAL-SAVE','retry',{acceptedOperationObserved:accepted,record:{...record},attempts:writes.slice(retryStart)},accepted&&record.name==='Evaluation workspace'&&record.email==='evaluation@example.com','The retry reaches the API and persists both entered values.','Wire save/retry to the documented persistence operation.');
     if(accepted){
      await axe('saved');await page.reload();
      name=await enterSettings();email=await unique(page.getByRole('textbox',{name:/email/i}),'email after reload');
      const loaded=await until(async()=>await name.inputValue()==='Evaluation workspace'&&await email.inputValue()==='evaluation@example.com');
      check('EVAL-RELOAD','saved',{name:await name.inputValue(),email:await email.inputValue()},loaded,'Reload shows the accepted service values.','Load authoritative saved values rather than recreating defaults.');
     }
    });
    await attempt('pending-duplicate-and-stale',async()=>{
     const name=await enterSettings();
     const save=await unique(page.getByRole('button',{name:/save/i}),'save action');
     await name.fill('Pending workspace');writeGate=new Promise(resolve=>{releaseWrites=resolve;});rejectWrite=false;const before=writes.length,dispatchStart=dispatched.length;const saveElement=await save.elementHandle();await save.click();
     await saveElement.evaluate(button=>{button.click();button.click();});
     const pending=await until(()=>writes.slice(before).some(entry=>entry.outcome==='pending'));
     if(!pending)throw new Unmeasured('No pending operation observed; duplicate/stale scenario was not established.');
     const editable=await name.isEditable();if(editable)await name.fill('Newer unsaved edit');
     await axe('submitting');
     const duplicateAttempts=dispatched.length-dispatchStart;
     let resubmit={editableDuringPending:editable,saveEnabledAfterEdit:null,dispatchedWhilePending:null};
     if(editable){
      const candidates=page.getByRole('button',{name:/save|retry|try.*again/i});let enabled=null;
      for(const candidate of await candidates.all())if(await candidate.isVisible()&&await candidate.isEnabled()){enabled=candidate;break;}
      resubmit.saveEnabledAfterEdit=!!enabled;
      if(enabled){const probeStart=dispatched.length;await enabled.click();await until(()=>dispatched.length>probeStart,600);resubmit.dispatchedWhilePending=dispatched.length-probeStart;}
      else resubmit.dispatchedWhilePending=0;
     }
     check('EVAL-PENDING-RESUBMIT','submitting',resubmit,!editable||resubmit.dispatchedWhilePending===0,'Editing while a save is pending does not enable a second concurrent mutation; a queued save after acknowledgement is acceptable.','Keep the in-flight guard independent of draft edits, or prevent edits while pending.');
     releaseWrites();writeGate=null;releaseWrites=null;await until(()=>writes.slice(before).every(entry=>entry.outcome!=='pending'));
     check('EVAL-DUPLICATE','submitting',{dispatchedWhilePending:duplicateAttempts,serverAttempts:writes.slice(before)},duplicateAttempts===1,'Repeated activation dispatches a single mutation while pending.','Set a synchronous in-flight guard before invoking the service.');
     const currentValue=await name.count()?await name.inputValue():null;
     check('EVAL-STALE','submitting',{editableDuringPending:editable,value:currentValue,record:{...record}},!editable||currentValue==='Newer unsaved edit','A delayed accepted response cannot erase edits made after dispatch.','Keep the newer draft, or explicitly prevent edits while the operation is pending.');
    });
    await attempt('invalid-submission',async()=>{
     await fresh();
     const name=await enterSettings(),email=await unique(page.getByRole('textbox',{name:/email/i}),'contact email');
     const save=await unique(page.getByRole('button',{name:/save/i}),'save action');
     const feedback=locator=>locator.evaluate(element=>({invalid:element.getAttribute('aria-invalid')==='true',described:[element.getAttribute('aria-describedby'),element.getAttribute('aria-errormessage')].join(' ').split(/\s+/).filter(Boolean).map(id=>document.getElementById(id)?.textContent?.trim()||'').join(' ')}));
     const before={record:{...record},name:await feedback(name),email:await feedback(email),text:await page.locator('body').innerText()};
     await name.fill('');await email.fill('not-an-email');const start=writes.length;
     const saveEnabled=await save.isEnabled();if(saveEnabled)await save.click();
     await sleep(600);await until(()=>writes.slice(start).every(entry=>entry.outcome!=='pending'));
     const draft={name:await name.inputValue(),email:await email.inputValue()},after={name:await feedback(name),email:await feedback(email),text:await page.locator('body').innerText()};
     const mutated=writes.slice(start).some(entry=>entry.outcome==='accepted')||record.name!==before.record.name||record.email!==before.record.email;
     check('EVAL-INVALID','invalid',{saveEnabled,writes:writes.slice(start),draft,record:{...record}},!mutated&&draft.name===''&&draft.email==='not-an-email','An invalid submission leaves the service record unchanged and keeps the entered values for correction.','Validate before saving (the service also rejects), keep the draft and show what to fix.');
     const flagged=field=>after[field].invalid||(!!after[field].described&&after[field].described!==before[field].described);
     const anyFeedback=after.text!==before.text||!saveEnabled;
     check('EVAL-INVALID-ERROR','invalid',{saveEnabled,name:after.name,email:after.email},flagged('name')&&flagged('email')?true:anyFeedback?null:false,'Each invalid field is marked invalid or described by its error message.','Set aria-invalid and link each error with aria-describedby; unlinked text needs review, no feedback is a defect.');
     await axe('invalid');
    });
    await attempt('dirty-leave',async()=>{
     await fresh();
     const name=await enterSettings(),edit='Unsaved leave edit',start=writes.length,original={...record};
     const cancel=()=>preferred(page.getByRole('button',{name:/cancel|back|close|discard/i}).or(page.getByRole('link',{name:/cancel|back|overview/i})),/cancel/i,'cancel action');
     await name.fill(edit);
     let nativePrompts=0,decision='dismiss';
     const onDialog=dialog=>{nativePrompts++;void(decision==='dismiss'?dialog.dismiss():dialog.accept());};
     page.on('dialog',onDialog);
     try{
      const visibleDialog=async()=>{for(const candidate of await page.getByRole('dialog').or(page.getByRole('alertdialog')).all())if(await candidate.isVisible())return candidate;return null;};
      const editing=async()=>await name.count()&&await name.isVisible()?await name.inputValue():null;
      await(await cancel()).click();await sleep(400);
      let dialog=await visibleDialog();
      const prompted=nativePrompts>0||!!dialog;
      if(dialog){await axe('dirty-leave');await(await preferred(dialog.getByRole('button',{name:/keep|stay|continue|cancel|back|no\b/i}),/keep|continue editing|stay/i,'keep-editing choice')).click();await sleep(300);}
      let kept=await editing(),reentered=false;
      if(!prompted&&kept===null){reentered=true;kept=await(await enterSettings()).inputValue();}
      check('EVAL-DIRTY-LEAVE','dirty-leave',{prompted,nativePrompts,inAppDialog:!!dialog,draftAfterLeave:kept,reentered},prompted?kept===edit:kept===edit?(reentered?true:null):false,'Leaving with unsaved edits asks first and keeping them keeps the draft, or the draft survives leaving.','Confirm before discarding unsaved edits, or keep the draft.');
      if(prompted&&kept===edit){
       decision='accept';const promptsBefore=nativePrompts;
       await(await cancel()).click();await sleep(400);
       dialog=await visibleDialog();
       if(dialog){await(await preferred(dialog.getByRole('button',{name:/discard|leave|yes|don.?t save|continue/i}),/discard/i,'discard choice')).click();await sleep(300);}
       const left=await editing()===null;
       check('EVAL-DIRTY-DISCARD','dirty-leave',{left,confirmed:nativePrompts>promptsBefore||!!dialog,writes:writes.slice(start),record:{...record}},left&&!writes.slice(start).length&&record.name===original.name,'Confirming discard leaves without saving the abandoned edit.','Discard the draft only after confirmation, and never save it on leave.');
      }
     }finally{page.off('dialog',onDialog);}
    });
    if(stage==='final')await attempt('followup-description',async()=>{
     await fresh();await enterSettings();
     const text='Shared planning space for evaluation';
     const description=await unique(page.getByRole('textbox',{name:/description/i}),'workspace description');
     await description.fill(text);const start=writes.length;
     await(await unique(page.getByRole('button',{name:/save/i}),'save action')).click();
     const accepted=await until(()=>writes.slice(start).some(entry=>entry.outcome==='accepted'&&entry.payload.description===text));
     check('EVAL-DESCRIPTION-SAVE','saved',{writes:writes.slice(start),record:{...record}},accepted&&record.description===text,'The description reaches the API with the save.','Send the description field through the existing save operation.');
     if(!accepted)return;
     await fresh();
     const shown=async()=>(await page.locator('body').innerText()).includes(text);
     let visible=await until(shown,1500),via='load';
     if(!visible){
      const back=page.getByRole('button',{name:/cancel|back|overview|done|close/i}).or(page.getByRole('link',{name:/overview|back/i}));
      if(!await back.count())throw new Unmeasured('The overview was not shown after reload and no way back to it was found; description display not established.');
      await(await preferred(back,/cancel|overview/i,'return to overview')).click();visible=await until(shown,1500);via='return-to-overview';
     }
     check('EVAL-DESCRIPTION-OVERVIEW','saved',{via,visible},visible,'After reload the overview shows the saved description.','Render the description on the overview from loaded service data.');
    });
   }else{
    const search=()=>unique(page.getByRole('textbox',{name:/search|find/i}).or(page.getByRole('searchbox',{name:/search|find/i})),'search field');
    // Live filtering and explicit submission are both valid; Enter is tried only when typing alone does not apply the query.
    const submissions=[];
    const applyQuery=async(input,value,applied)=>{await input.fill(value);if(await until(applied))return true;submissions.push(value);await input.press('Enter');return until(applied);};
    const showsAll=async()=>await page.getByText('Atlas',{exact:true}).count()>0&&await page.getByText('Beacon',{exact:true}).count()>0;
    await attempt('query-and-reset',async()=>{
     const input=await search();
     const found=await applyQuery(input,'Atlas',async()=>await page.getByText('Atlas',{exact:true}).count()>0&&await page.getByText('Beacon',{exact:true}).count()===0);
     check('EVAL-QUERY','populated',{loads:loads.filter(entry=>entry.path==='/api/records'),submittedWithEnter:submissions.includes('Atlas'),visible:await page.locator('body').innerText()},found&&loads.some(entry=>entry.path==='/api/records'&&entry.outcome==='accepted'),'Search displays the requested subset of actual service records.','Apply the query to loaded data and reject stale responses.');
     await applyQuery(input,'no-such-project',async()=>await page.getByText('Atlas',{exact:true}).count()===0);
     const content=await page.locator('body').innerText();
     check('EVAL-NO-RESULTS','no-results',content,/no (?:results|records|projects|matches)|nothing|0 (?:results|records|projects)/i.test(content)?true:null,'Recognizable no-results feedback; unmatched copy requires human review, not an automatic failure.','Inspect whether feedback distinguishes zero matches from an empty collection.','contextual');await axe('no-results');
     const reset=await preferred(page.getByRole('button',{name:/clear|reset/i}),/search|query|filter/i,'clear/reset search');await reset.click();
     const restored=await until(async()=>await input.inputValue()===''&&await page.getByText('Beacon',{exact:true}).count()>0);
     check('EVAL-RESET','populated',{query:await input.inputValue(),visible:await page.locator('body').innerText()},restored,'Reset restores the query and visible service records.','Clear the query and restore the default collection.');
    });
    await attempt('failed-refresh-and-recovery',async()=>{
     const input=await search();if(!await applyQuery(input,'',showsAll))throw new Unmeasured('Could not restore the unfiltered collection before refresh; recovery scenario not established.');
     const refresh=await unique(page.getByRole('button',{name:/refresh/i}),'refresh action');rejectLoad=true;const start=loads.length;await refresh.click();
     const rejected=await until(()=>loads.slice(start).some(entry=>entry.outcome==='rejected'));
     if(!rejected)throw new Unmeasured('No rejected refresh request observed; recovery scenario not established.');
     check('EVAL-LOAD-FAILURE','failed-refresh',{visible:await page.locator('body').innerText(),request:loads.slice(start)},null,'Independent review: failure feedback must remain distinct from an empty collection.','Retain context and offer an operable retry.','contextual');await axe('failed-refresh');
     rejectLoad=false;const retryCandidate=page.getByRole('button',{name:/retry|try.*again/i});const retry=await unique(await retryCandidate.count()?retryCandidate:page.getByRole('button',{name:/refresh/i}),'retry or refresh recovery action');
     const retryStart=loads.length;await retry.click();const recovered=await until(async()=>loads.slice(retryStart).some(entry=>entry.outcome==='accepted')&&await page.getByText('Beacon',{exact:true}).count()>0);
     check('EVAL-LOAD-RECOVERY','recovered',{requests:loads.slice(retryStart),visible:await page.locator('body').innerText()},recovered,'Retry/refresh reloads actual service records after rejection.','Keep a reachable recovery action wired to a fresh load.');
    });
    await attempt('selection-identity',async()=>{
     rejectLoad=false;const input=await search();await applyQuery(input,'',showsAll);
     // Keyboard toggle: styled checkbox tracks may intercept synthetic pointer clicks while remaining operable.
     const toggle=async(name)=>{const box=await unique(page.getByRole('checkbox',{name}),`${name.source} selection`);await box.focus();await page.keyboard.press('Space');if(!await until(()=>box.isChecked(),1000))throw new Unmeasured(`Space on the focused ${name.source} checkbox did not check it; pointer and keyboard selection require independent review.`);};
     const checkedRows=async()=>{let count=0;for(const box of await page.getByRole('checkbox',{name:/Atlas|Beacon|Cedar/}).all())if(await box.isVisible()&&await box.isChecked())count++;return count;};
     const readings=[],reading=async state=>readings.push({state,count:readSelectedCount(await page.locator('body').innerText()),expected:await checkedRows()});
     await toggle(/Atlas/i);await reading('one-selected');await toggle(/Cedar/i);await reading('two-selected');
     await applyQuery(input,'Beacon',async()=>await page.getByText('Atlas',{exact:true}).count()===0);
     const beacon=await unique(page.getByRole('checkbox',{name:/Beacon/i}),'Beacon selection');
     check('EVAL-SELECTION','filtered',{selectedBeacon:await beacon.isChecked()},!await beacon.isChecked(),'Filtering must not transfer Atlas selection to a different identity. Clear or preserve policies may both be valid.','Key selection by stable identity and document whether hidden selections persist.');
     readings.push({state:'filtered',count:readSelectedCount(await page.locator('body').innerText()),expected:null});
     // With every row visible again, the displayed count must equal the checked rows under either policy.
     await applyQuery(input,'',showsAll);await reading('all-visible');
     const counted=readings.filter(entry=>entry.expected!==null);
     check('EVAL-SELECTED-COUNT','populated',readings,truthfulCounts(counted),'A displayed selection count equals the rows actually selected; none displayed is unmeasured, not a pass.','Derive the count from the same selection state as the checkboxes, keyed by stable ID.');
    });
    await attempt('out-of-order-query',async()=>{
     const input=await search();await applyQuery(input,'',showsAll);
     const issued=async(value,start)=>{const sent=()=>loads.slice(start).some(entry=>entry.path==='/api/records'&&entry.query.toLowerCase()===value.toLowerCase());if(await until(sent,700))return true;await input.press('Enter');return until(sent,700);};
     queryDelay=query=>/^atlas$/i.test(query)?1500:0;
     try{
      const start=loads.length;await input.fill('Atlas');
      if(!await issued('Atlas',start))throw new Unmeasured('The query issued no service request; the interface may filter locally, so response order does not apply.');
      const second=loads.length;await input.fill('Cedar');
      if(!await issued('Cedar',second))throw new Unmeasured('A second query issued no service request while the first was pending.');
      await until(()=>loads.slice(start).every(entry=>entry.outcome!=='pending'),4000);await sleep(300);
      const atlasShown=await page.getByText('Atlas',{exact:true}).count()>0,cedarShown=await page.getByText('Cedar',{exact:true}).count()>0;
      check('EVAL-OUT-OF-ORDER','populated',{requests:loads.slice(start),query:await input.inputValue(),atlasShown,cedarShown},cedarShown&&!atlasShown,'A slower response for an older query never replaces the results of the current query.','Ignore or cancel responses for superseded queries.');
     }finally{queryDelay=null;}
    });
    if(stage==='final')await attempt('followup-sort',async()=>{
     const input=await search();await applyQuery(input,'',showsAll);
     const orders=new Set([await recordOrder(page)]),observe=async()=>{await sleep(400);orders.add(await recordOrder(page));};
     const visible=async locator=>{const found=[];for(const candidate of await locator.all())if(await candidate.isVisible())found.push(candidate);return found;};
     // 2.0.1: a listbox-popup button (Altitude's Select) is operated like a combobox, not clicked as a toggle.
     const [combo]=await visible(page.getByRole('combobox',{name:/sort|order/i}).or(page.getByRole('button',{name:/sort|order/i}).and(page.locator('[aria-haspopup="listbox"]'))));
     if(combo){
      if(await combo.evaluate(element=>element.tagName==='SELECT')){for(const label of await combo.evaluate(element=>[...element.options].map(option=>option.label))){await combo.selectOption({label});await observe();}}
      else{
       const open=async()=>{if(await combo.getAttribute('aria-expanded')!=='true')await combo.click();};
       await open();const labels=[];for(const option of await visible(page.getByRole('option')))labels.push((await option.textContent()).trim());await page.keyboard.press('Escape');
       for(const label of labels){await open();await page.getByRole('option',{name:label,exact:true}).first().click();await observe();}
      }
     }else{
      const controls=await visible(page.getByRole('button',{name:/sort|^name\b|a\s*[–-]\s*z|z\s*[–-]\s*a|ascending|descending/i}).or(page.getByRole('radio',{name:/a\s*[–-]\s*z|z\s*[–-]\s*a|ascending|descending/i})));
      if(!controls.length||controls.length>4)throw new Unmeasured(`Found ${controls.length} candidate sort controls; selector adaptation or independent review required.`);
      for(const control of controls.length===1?[controls[0],controls[0],controls[0]]:[...controls,...controls]){await control.click();await observe();}
     }
     check('EVAL-SORT','populated',{orders:[...orders]},orders.has('Atlas,Beacon,Cedar')&&orders.has('Cedar,Beacon,Atlas'),'Sorting by name shows the actual records in both ascending and descending order.','Sort the loaded records by name in both directions.');
    });
    await attempt('first-use-empty',async()=>{
     emptyCollection=true;
     try{
      await fresh();await sleep(300);
      const content=await page.locator('body').innerText();
      const failure=/error|failed|could not|couldn.t|unable/i.test(content),recognised=/no (?:records|projects|items)(?: yet)?|nothing (?:here|yet)|empty|get started|create (?:a|an|your first)/i.test(content);
      check('EVAL-FIRST-USE-EMPTY','first-use-empty',content.slice(0,600),failure?false:recognised?true:null,'An empty collection is presented as empty (ideally with a next step), not as a failure or a filter result.','Distinguish first-use empty from failure and from no results; unmatched copy needs human review.','contextual');
      await axe('first-use-empty');
     }finally{emptyCollection=false;}
     await fresh();
    });
   }
   await attempt('responsive',async()=>{
    await page.setViewportSize({width:320,height:800});await page.evaluate(()=>document.documentElement.dir='rtl');await page.emulateMedia({reducedMotion:'reduce',forcedColors:'active'});await settleAnimations(page);
    const geometry=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    check('EVAL-REFLOW','320-rtl-forced',geometry,geometry.scroll<=geometry.width+1,'No horizontal document overflow at 320px RTL. This does not prove all controls remain operable.','Use logical sizing and allow controls/long content to wrap.');
    await page.screenshot({path:join(runDir,stage+'-320-rtl-forced.png'),fullPage:true});
   });
   check('EVAL-RUNTIME','all-observed-states',errors,errors.length===0,'No uncaught browser runtime errors in executed scenarios.','Inspect captured errors and reproduce against the installed artifact.','deterministic');
  }catch(error){check('EVAL-HARNESS','launch-or-navigation',String(error.message),null,'A usable browser and served artifact are required.','Resolve tooling/setup failure separately from product defects.','contextual');}
  finally{releaseWrites?.();await browser?.close();await new Promise(resolve=>server.close(resolve));}
  reports.push({stage,checks,metrics:metricsFromChecks(checks,metadata.task),service:{record,writes,loads},pageErrors:errors,
   manualKeyboard:'not performed',assistiveTechnology:'not performed',humanTaskStudy:'not performed',
   axeIncomplete:checks.filter(check=>check.ruleId==='EVAL-A11Y-INCOMPLETE'&&check.passed===null).map(check=>({state:check.state,rules:check.evidence.map(item=>item.id)})),
   unmeasuredStates:metadata.task==='settings'?['blur-validation','browser-back-with-unsaved-edits']:['selected-row-removed','refresh-during-query'],
   metricScope:'Only executed controlled scenarios and axe rules. Unknown selectors, unperformed scenarios and human judgments remain null.'});
 }
 const initial=reports.find(report=>report.stage==='initial'),final=reports.find(report=>report.stage==='final');
 const metrics={...(final?.metrics||metricsFromChecks([],metadata.task)),followupPreserved:metadata.followup?.build==='passed'&&initial&&final?measuredRegressions(initial.checks,final.checks):null};
 // Runs record the assessor they were generated under; a different fingerprint now means this assessment is post-hoc.
 const assessor=assessorFingerprint(),frozen=metadata.assessor||null;
 const assessment={protocolVersion,assessorVersion:assessor.version,assessor,frozenAssessor:frozen,postHoc:frozen?frozen.sha256!==assessor.sha256:null,assessedAt:new Date().toISOString(),reports,metrics,
  limitations:['This pilot assessment is partial, not an accessibility/usability conformance verdict.','Per-state evidence remains authoritative; null is unmeasured, never failure or success.','Pattern selection, copy accuracy, full keyboard/AT behavior and applicability require independent human review.']};
 if(existsSync(join(runDir,'assessment.json'))){const previous=JSON.parse(readFileSync(join(runDir,'assessment.json'),'utf8'));const stamp=previous.assessedAt.replace(/[:.]/g,'-');writeFileSync(join(runDir,`assessment-${previous.assessorVersion}-${stamp}.json`),JSON.stringify(previous,null,2)+'\n');assessment.refinement='Prior assessment preserved. Version 1.2.0 enters settings through overview, retains action handles through pending label changes, and accepts disabled/read-only fields disappearing after successful persistence. Version 1.3.0 adds a uniform pending-edit second-save probe (EVAL-PENDING-RESUBMIT) and no longer treats final-dist as follow-up evidence when no follow-up ran. Version 1.4.0 corrects instrument faults seen in 1.3.0 across all conditions: the recovery scenario restores the unfiltered query first (1.3.0 inherited a leftover no-results query), Enter submits a query when live filtering does not apply, a retry-named control is preferred after rejection, search-named reset controls resolve ambiguity, and checkboxes are toggled with Space. Version 2.0.0 (protocol 1.1.0) adds invalid submission, dirty leave, first-use empty, out-of-order query, follow-up description/sort/selected-count scenarios and axe incomplete results; finishes finite animations still running after 3 s; and renames accessibilityDefects, keyboardDefects and followupRegressions to axeScanPassed, keyboardPassed and followupPreserved. Version 2.0.1 (post-hoc, rerun1 2026-10-23) operates a sort control that is a button with aria-haspopup=listbox, such as Altitude\'s Select, by choosing each option; 2.0.0 clicked it as a toggle and reported false EVAL-SORT failures.';}
 writeFileSync(join(runDir,'assessment.json'),JSON.stringify(assessment,null,2)+'\n');
 metadata.metrics={...metadata.metrics,...metrics};metadata.independentAssessment={path:'assessment.json',assessorVersion:assessment.assessorVersion,assessedAt:assessment.assessedAt,scope:assessment.limitations};
 writeFileSync(join(runDir,'run.json'),JSON.stringify(metadata,null,2)+'\n');
 console.log(metadata.id,assessment.postHoc?'(post-hoc)':'',reports.map(report=>`${report.stage}: ${report.checks.filter(check=>check.passed===true).length} pass, ${report.checks.filter(check=>check.passed===false).length} fail, ${report.checks.filter(check=>check.passed===null).length} unmeasured`).join('; '));
 return assessment;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.argv[2])throw Error('Usage: node evals/framework/evaluator/assess.mjs <completed-run-directory>');
 await assessArtifact(process.argv[2]);
}
