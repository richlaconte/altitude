// No evaluator expectations or failure schedules are imported by consumer projects.
export const protocolVersion = '1.1.0';
export const conditions = ['primitives', 'guidance', 'framework'];
// true always means the check passed: axeScanPassed, keyboardPassed and followupPreserved replace 1.0.0's accessibilityDefects, keyboardDefects and followupRegressions.
export const metrics = ['guidanceDiscovery','patternSelection','taskOutcome','applicableStates','retainedInput','recovery','adverseStates','followupFeatures','keyboardPassed','axeScanPassed','contentAccuracy','responsive','followupPreserved','complexity','developmentCost'];
// Every command the installed setup tells an agent to run must be allowed; pilot 2026-10-23 denied `npm exec -- altitude`.
export const claudeAllowedTools=['Read','Write','Edit','Bash(npm run build)','Bash(npm exec -- altitude *)','Bash(npm exec altitude *)','Bash(altitude *)','Bash(npx altitude *)','Bash(node_modules/.bin/altitude *)','Bash(./node_modules/.bin/altitude *)','Bash(node *)','Bash(cat *)','Bash(ls *)','Bash(rg *)','Bash(pwd)','Bash(find *)'];
/** Prefix match for Claude Code `Bash(prefix *)` rules, which is all the allowlist uses. */
export function allowsCommand(command,rules=claudeAllowedTools) {
 return rules.some(rule=>{const match=/^Bash\((.*)\)$/.exec(rule);if(!match)return false;const pattern=match[1];return pattern.endsWith(' *')?command===pattern.slice(0,-2)||command.startsWith(pattern.slice(0,-1)):command===pattern;});
}
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
