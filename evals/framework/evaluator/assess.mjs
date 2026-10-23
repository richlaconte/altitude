// Evaluator-side only. Neither these injections nor the rubric enter generation workspaces.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from '../../../build/node_modules/playwright-core/index.mjs';
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
  applicableStates:null,retainedInput:task==='settings'?value('EVAL-RETAIN'):null,
  recovery:task==='settings'?value('EVAL-RETAIN','EVAL-SAVE'):value('EVAL-LOAD-RECOVERY'),
  keyboardDefects:null,accessibilityDefects:aggregate(checks.filter(check=>check.ruleId==='EVAL-A11Y').map(check=>check.passed)),
  contentAccuracy:null,responsive:value('EVAL-REFLOW'),followupRegressions:null,complexity:null,developmentCost:null,
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
  const deadline=performance.now()+3000;
  while(performance.now()<deadline){
   const active=document.getAnimations().filter(animation=>animation.playState==='running'&&animation.effect?.getTiming().iterations!==Infinity);
   if(!active.length){await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return true;}
   await Promise.race([Promise.all(active.map(animation=>animation.finished.catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,100))]);
  }
  return false;
 });
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
  let record={name:'Northwind',email:'owner@example.com',description:''},rejectWrite=false,rejectLoad=false,delay=0,writeGate=null,releaseWrites=null;
  const writes=[],loads=[];
  const rows=[{id:'p1',name:'Atlas'},{id:'p2',name:'Beacon'},{id:'p3',name:'Cedar'}];
  const server=createServer(async(req,res)=>{
   try{
    const url=new URL(req.url,'http://localhost');res.setHeader('Content-Type','application/json');
    if(url.pathname.startsWith('/api/')){
     const capturedDelay=delay,writeFailure=rejectWrite,loadFailure=rejectLoad,capturedGate=writeGate;
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
     const result=rows.filter(row=>row.name.toLowerCase().includes(entry.query.toLowerCase()));entry.outcome='accepted';entry.ids=result.map(row=>row.id);res.end(JSON.stringify(result));return;
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
    if(!await settleAnimations(page))throw new Unmeasured('Finite animations did not settle within 3 seconds; contrast snapshot is unstable.');
    if(!await page.evaluate(()=>!!window.axe))await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
    const result=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));
    const findings=result.violations.map(violation=>({id:violation.id,impact:violation.impact,help:violation.help,helpUrl:violation.helpUrl,nodes:violation.nodes.map(node=>({target:node.target,summary:node.failureSummary}))}));
    check('EVAL-A11Y',state,{violations:findings,incomplete:result.incomplete.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))},findings.length===0,'No violations of the executed axe rules in this state.','Inspect affected elements; incomplete rules and manual keyboard/AT review remain separate.','deterministic');
   }catch(error){check('EVAL-A11Y',state,String(error.message),null,'A stable state and successful axe execution are required.','Resolve scan/animation/tooling failure and rerun; do not treat missing results as no defects.','contextual');} };
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
     const atlas=await unique(page.getByRole('checkbox',{name:/Atlas/i}),'Atlas selection');await atlas.focus();await page.keyboard.press('Space');
     if(!await until(()=>atlas.isChecked(),1000))throw new Unmeasured('Space on the focused Atlas checkbox did not check it; pointer and keyboard selection require independent review.');
     await applyQuery(input,'Beacon',async()=>await page.getByText('Atlas',{exact:true}).count()===0);
     const beacon=await unique(page.getByRole('checkbox',{name:/Beacon/i}),'Beacon selection');
     check('EVAL-SELECTION','filtered',{selectedBeacon:await beacon.isChecked()},!await beacon.isChecked(),'Filtering must not transfer Atlas selection to a different identity. Clear or preserve policies may both be valid.','Key selection by stable identity and document whether hidden selections persist.');
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
   unmeasuredStates:metadata.task==='settings'?['invalid','dirty-leave']:['first-use-empty','out-of-order-query'],
   metricScope:'Only executed controlled scenarios and axe rules. Unknown selectors, unperformed scenarios and human judgments remain null.'});
 }
 const initial=reports.find(report=>report.stage==='initial'),final=reports.find(report=>report.stage==='final');
 const metrics={...(final?.metrics||metricsFromChecks([],metadata.task)),followupRegressions:metadata.followup?.build==='passed'&&initial&&final?measuredRegressions(initial.checks,final.checks):null};
 const assessment={protocolVersion:'1.0.0',assessorVersion:'1.4.0',assessedAt:new Date().toISOString(),reports,metrics,
  limitations:['This pilot assessment is partial, not an accessibility/usability conformance verdict.','Per-state evidence remains authoritative; null is unmeasured, never failure or success.','Pattern selection, copy accuracy, full keyboard/AT behavior and applicability require independent human review.']};
 if(existsSync(join(runDir,'assessment.json'))){const previous=JSON.parse(readFileSync(join(runDir,'assessment.json'),'utf8'));const stamp=previous.assessedAt.replace(/[:.]/g,'-');writeFileSync(join(runDir,`assessment-${previous.assessorVersion}-${stamp}.json`),JSON.stringify(previous,null,2)+'\n');assessment.refinement='Prior assessment preserved. Version 1.2.0 enters settings through overview, retains action handles through pending label changes, and accepts disabled/read-only fields disappearing after successful persistence. Version 1.3.0 adds a uniform pending-edit second-save probe (EVAL-PENDING-RESUBMIT) and no longer treats final-dist as follow-up evidence when no follow-up ran. Version 1.4.0 corrects instrument faults seen in 1.3.0 across all conditions: the recovery scenario restores the unfiltered query first (1.3.0 inherited a leftover no-results query), Enter submits a query when live filtering does not apply, a retry-named control is preferred after rejection, search-named reset controls resolve ambiguity, and checkboxes are toggled with Space.';}
 writeFileSync(join(runDir,'assessment.json'),JSON.stringify(assessment,null,2)+'\n');
 metadata.metrics={...metadata.metrics,...metrics};metadata.independentAssessment={path:'assessment.json',assessorVersion:assessment.assessorVersion,assessedAt:assessment.assessedAt,scope:assessment.limitations};
 writeFileSync(join(runDir,'run.json'),JSON.stringify(metadata,null,2)+'\n');
 console.log(metadata.id,reports.map(report=>`${report.stage}: ${report.checks.filter(check=>check.passed===true).length} pass, ${report.checks.filter(check=>check.passed===false).length} fail, ${report.checks.filter(check=>check.passed===null).length} unmeasured`).join('; '));
 return assessment;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.argv[2])throw Error('Usage: node evals/framework/evaluator/assess.mjs <completed-run-directory>');
 await assessArtifact(process.argv[2]);
}
