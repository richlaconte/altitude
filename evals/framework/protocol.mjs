// No evaluator expectations or failure schedules are imported by consumer projects.
export const protocolVersion = '1.0.0';
export const conditions = ['primitives', 'guidance', 'framework'];
export const metrics = ['guidanceDiscovery','patternSelection','taskOutcome','applicableStates','retainedInput','recovery','keyboardDefects','accessibilityDefects','contentAccuracy','responsive','followupRegressions','complexity','developmentCost'];
export function makeMatrix(clients=['codex','claude']) {
 return clients.flatMap(client=>['settings','records'].flatMap(task=>conditions.map(condition=>({id:`${client}-${task}-${condition}`,client,task,condition}))));
}
export function redactGuidance(text) { return text.replace(/```(?:tsx|jsx|ts|js)[\s\S]*?```/g,'[Executable example available in the full framework condition.]'); }
export function assessRun({exitCode,timedOut=false,aborted=false,elapsedMs=null}) {
 return {generation:aborted?'aborted':timedOut?'budget-exhausted':exitCode===0?'complete':'failed',elapsedMs,metrics:Object.fromEntries(metrics.map(k=>[k,null]))};
}
export function summarize(runs) {
 const out={generation:{},metrics:{}};
 for(const run of runs) out.generation[run.generation]=(out.generation[run.generation]||0)+1;
 for(const key of metrics) {
  out.metrics[key]={passed:0,failed:0,unmeasured:0};
  for(const run of runs) out.metrics[key][run.metrics?.[key]===true?'passed':run.metrics?.[key]===false?'failed':'unmeasured']++;
 }
 return out;
}
