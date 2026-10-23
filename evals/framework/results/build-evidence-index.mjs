// Assembles evidence-index.json from a completed pilot: sanitized run metadata, every executed check,
// source hashes and review findings. Raw transcripts and host paths are excluded.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const roots=process.argv.slice(2).length?process.argv.slice(2):['build/test/framework-pilot-corrected-codex','build/test/framework-pilot-corrected-claude'];
const sha=data=>createHash('sha256').update(data).digest('hex');
const clean=value=>{
 if(Array.isArray(value))return value.map(clean);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,clean(item)]));
 if(typeof value==='string')return value.split(root).join('[checkout]').replace(/\/Users\/[^\s"']+/g,'[local-path]').replace(/\/(?:private\/)?var\/folders\/[^\s"']+/g,'[temporary-path]');
 return value;
};
const keep=['id','client','task','condition','protocolVersion','requestedModel','model','toolVersion','budget','primitiveHash','startedAt','finishedAt','generation','elapsedMs','exitCode','signal','sourceChanged','build','usage'];
const runs=[];
for(const base of roots)for(const id of readdirSync(join(root,base)).sort()){
 const dir=join(root,base,id);if(!existsSync(join(dir,'run.json')))continue;
 const run=JSON.parse(readFileSync(join(dir,'run.json'),'utf8'));
 const assessment=existsSync(join(dir,'assessment.json'))?JSON.parse(readFileSync(join(dir,'assessment.json'),'utf8')):null;
 const review=existsSync(join(dir,'review.json'))?JSON.parse(readFileSync(join(dir,'review.json'),'utf8')):null;
 const sources=[];
 for(const stage of ['initial-src','final-src'])if(existsSync(join(dir,stage)))for(const file of readdirSync(join(dir,stage)).sort()){const data=readFileSync(join(dir,stage,file));sources.push({path:`${stage}/${file}`,sha256:sha(data),lines:data.toString().split('\n').length-1});}
 const archived=readdirSync(dir).filter(file=>/^assessment-.+\.json$/.test(file)).sort();
 runs.push(clean({
  ...Object.fromEntries(keep.filter(key=>key in run).map(key=>[key,run[key]])),
  package:{condition:run.condition,sha256:run.package?.sha256},
  followup:run.followup?{generation:run.followup.generation,elapsedMs:run.followup.elapsedMs,exitCode:run.followup.exitCode,build:run.followup.build,usage:run.followup.usage}:null,
  sources,
  assessment:assessment&&{assessorVersion:assessment.assessorVersion,assessedAt:assessment.assessedAt,metrics:assessment.metrics,refinement:assessment.refinement,limitations:assessment.limitations,archivedReports:archived,
   reports:assessment.reports.map(report=>({stage:report.stage,unmeasured:report.unmeasured,metrics:report.metrics,checks:report.checks,pageErrors:report.pageErrors,unmeasuredStates:report.unmeasuredStates}))},
  review:review&&{reviewer:review.reviewer,reviewedAt:review.reviewedAt,scope:review.scope,guidanceDiscovery:review.guidanceDiscovery,patternSelection:review.patternSelection,states:review.states,contentAccuracy:review.contentAccuracy,complexity:review.complexity,findings:review.findings,evidence:review.evidence,keyboardAndAssistiveTechnology:review.keyboardAndAssistiveTechnology,screenshotReview:review.screenshotReview,assessmentUpdates:review.assessmentUpdates},
 }));
}
const index={pilot:'2026-10-23 corrected',generatedAt:new Date().toISOString(),manifestSha256:sha(readFileSync(join(root,'build/test/framework-eval-packages-corrected/manifest.json'))),
 note:'null is unmeasured, never pass or fail. Build completion is not task success. Executed checks are partial; reviews are AI source/trace judgments, not human or assistive-technology evaluation.',runs};
const text=JSON.stringify(index,null,2)+'\n';
if(/\/Users\/|\/var\/folders\//.test(text))throw Error('Unsanitized host path in evidence index');
writeFileSync(join(root,'evals/framework/results/evidence-index.json'),text);
console.log(`${runs.length} runs; ${runs.filter(run=>run.review).length} reviewed`);
