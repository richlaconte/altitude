// Independent AI reviews for the rerun1 pilot (2026-10-23, protocol 1.1.0, three samples per cell): Codex settings cells.
// Rerunning rewrites each review.json with a new reviewedAt and the current assessment metrics.
const path=require('path');
const {review}=require('./review-lib.cjs');
const dir=(sample,id)=>path.resolve(__dirname,'../../../build/test',`framework-pilot-rerun1-${id.split('-')[0]}-s${sample}`,id);
const reviewer='Coordinating agent (claude-opus-5-5) in the session that ran the pilot; not blind to condition. Source and trace-operation review; screenshots not viewed.';
// Screenshots were not viewed for rerun1; 320px reflow is the executed EVAL-REFLOW check.
const rerun=(sample,id,details)=>review(id,{reviewer,sample,screenshotReviewed:false,screenshot:['Not viewed in this review; see EVAL-REFLOW in assessment.json.'],...details},dir(sample,id));
module.exports={rerun};
if(require.main!==module)return;

rerun(1,'codex-settings-primitives',{
 guidanceDiscovery:{applicable:false,observed:null,reason:'Primitive condition contains no framework guidance.'},
 patternSelection:{observed:'Handwritten settings form with separate draft fields and an overview view.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['loading','load failure/retry','submit validation','field errors cleared on edit','save pending (inputs disabled)','failed save with retained draft','success alert on overview','description follow-up'],sourceOmitted:['dirty-leave confirmation','error summary/focus on invalid submit','beforeunload'],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Failure shows the raw service error message. Hint "Shown to everyone in this workspace" is not supported by the API contract.',passed:null},
 complexity:{judgment:'Single component with ten state hooks and custom page CSS; no extra dependencies.',rating:null},
 findings:[{kind:'executed-defect',description:'Cancel discards unsaved edits without asking (EVAL-DIRTY-LEAVE failed in both stages).'},{kind:'source-defect',description:'Raw Error.message is shown as failure copy.'},{kind:'source-omission',description:'No error summary or focus movement after invalid submit.'}],
 evidence:[['final-src/main.tsx',64,74,'Cancel resets the draft and leaves unconditionally.'],['final-src/main.tsx',76,103,'Awaited save; catch keeps the draft and shows error.message.'],['final-src/main.tsx',141,141,'Unsupported visibility claim in the hint.']],
 keyboardLimitations:['No programmatic focus on errors or after view changes; manual keyboard/AT not performed.'],
 });
rerun(1,'codex-settings-guidance',{
 guidanceDiscovery:{applicable:true,observed:true,evidence:[{path:'generation.jsonl',line:5,operation:'Read installed guidance README'},{path:'generation.jsonl',line:7,operation:'npm exec -- altitude patterns'},{path:'generation.jsonl',line:9,operation:'Read edit-record.md and principles.md'}]},
 patternSelection:{observed:'Edit-record contract implemented locally with primitives.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['loading','load failure/retry','overview','submit validation','focused linked error summary','field errors cleared on edit','save pending','failed save with retained draft','success status','dirty Cancel confirm','beforeunload','description follow-up'],sourceOmitted:[],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Failure appends "Your changes have been kept" to the raw service message. "Visible to everyone in this workspace" is unsupported by the API contract.',passed:null},
 complexity:{judgment:'One component, explicit dirty comparison and leave handling; compact.',rating:null},
 findings:[{kind:'source-defect',description:'Raw Error.message shown in the failure Alert.'},{kind:'content',description:'Unsupported visibility claim in the card description.'}],
 evidence:[['final-src/main.tsx',44,54,'beforeunload and confirm-before-discard on Cancel.'],['final-src/main.tsx',55,69,'Submit validates, focuses the summary, awaits save and keeps the draft on failure.'],['final-src/main.tsx',81,84,'Unsupported claim; linked error summary; raw error message.']],
 keyboardLimitations:['Summary receives focus on invalid submit; other focus paths not exercised.'],
 });
rerun(1,'codex-settings-framework',{
 guidanceDiscovery:{applicable:true,observed:true,evidence:[{path:'generation.jsonl',line:5,operation:'Read installed guidance README'},{path:'generation.jsonl',line:7,operation:'altitude patterns and edit-record.md'},{path:'generation.jsonl',line:10,operation:'Read edit-record.json and pattern-edit-record.d.ts'},{path:'generation.jsonl',line:27,operation:'Built the shipped framework fixture'}]},
 patternSelection:{observed:'useEditRecord with ErrorSummary, WorkflowStatus and requestLeave.',runtimeHooks:['useEditRecord','ErrorSummary','WorkflowStatus'],appropriateFamily:true},
 states:{sourcePresent:['loading','load failure/retry','submit validation','error summary with focus','pending','failure with retained draft','success status','newer-edit message','dirty Cancel via requestLeave + confirm','beforeunload','description follow-up'],sourceOmitted:[],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Failure Alert shows the raw service message when present. Load failure copy claims "Your workspace has not been changed", which is true for a read.',passed:null},
 complexity:{judgment:'Small: hook owns state; app adds views and adapters.',rating:null},
 findings:[{kind:'source-defect',description:'Raw Error.message passed through as failure copy.'}],
 evidence:[['final-src/main.tsx',31,51,'useEditRecord with submit validation and an awaited save adapter returning ok:false on failure.'],['final-src/main.tsx',52,59,'beforeunload and requestLeave with confirm.'],['final-src/main.tsx',62,69,'ErrorSummary, failure Alert and WorkflowStatus.']],
 keyboardLimitations:['ErrorSummary focus on invalid submit; other paths not exercised.'],
 });
rerun(2,'codex-settings-primitives',{
 guidanceDiscovery:{applicable:false,observed:null,reason:'Primitive condition contains no framework guidance.'},
 patternSelection:{observed:'Handwritten settings form; stays on settings after save with a success Alert.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['loading skeleton','load failure/retry','submit-time validation','pending (inputs disabled)','failed save with retained draft','success alert','overview','description follow-up'],sourceOmitted:['dirty-leave confirmation','error summary/focus','beforeunload'],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Raw service error shown as failure copy. "Visible to everyone in the workspace" and "applied across the workspace for every member" are not supported by the API contract.',passed:null},
 complexity:{judgment:'Single component, inline style string; no extra dependencies.',rating:null},
 findings:[{kind:'source-omission',description:'Cancel discards unsaved edits without asking.'},{kind:'source-defect',description:'Raw Error.message shown as failure copy.'},{kind:'content',description:'Two unsupported claims about visibility to members.'}],
 evidence:[['final-src/main.tsx',89,103,'Submit-time validation, awaited save, raw error message on failure.'],['final-src/main.tsx',105,108,'Unconditional Cancel.'],['final-src/main.tsx',124,130,'Unsupported visibility claims.']],
 keyboardLimitations:['No focus movement to errors or after view changes.'],
});
rerun(2,'codex-settings-guidance',{
 guidanceDiscovery:{applicable:true,observed:true,evidence:[{path:'generation.jsonl',line:5,operation:'Read installed guidance README'},{path:'generation.jsonl',line:9,operation:'Read edit-record.md and principles.md'},{path:'generation.jsonl',line:11,operation:'npm exec -- altitude patterns'},{path:'generation.jsonl',line:18,operation:'altitude explain for five rules'}]},
 patternSelection:{observed:'Edit-record contract implemented locally.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['loading','load failure/retry','overview with description','submit validation','focused linked error summary','errors cleared on edit','pending','failure with retained draft','dirty Cancel/back confirm','beforeunload','description follow-up'],sourceOmitted:['success announcement after returning to overview'],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Raw service error plus "Your entries are still here". "Visible to everyone in this workspace" is unsupported.',passed:null},
 complexity:{judgment:'Settings split into its own component; compact.',rating:null},
 findings:[{kind:'source-defect',description:'Raw Error.message shown as failure copy.'},{kind:'source-omission',description:'No success message or announcement after a save returns to the overview.'}],
 evidence:[['final-src/main.tsx',58,71,'beforeunload, confirm-before-discard, validation with summary focus, awaited save.'],['final-src/main.tsx',74,78,'Back link goes through cancel; unsupported claim; raw error.']],
 keyboardLimitations:['Summary focus on invalid submit; other paths not exercised.'],
});
rerun(2,'codex-settings-framework',{
 guidanceDiscovery:{applicable:true,observed:true,evidence:[{path:'generation.jsonl',line:5,operation:'Read installed guidance README'},{path:'generation.jsonl',line:7,operation:'altitude patterns and edit-record.md'},{path:'generation.jsonl',line:12,operation:'Read pattern-edit-record.d.ts'}]},
 patternSelection:{observed:'useEditRecord with ErrorSummary, WorkflowStatus and requestLeave on both Cancel and the breadcrumb.',runtimeHooks:['useEditRecord','ErrorSummary','WorkflowStatus'],appropriateFamily:true},
 states:{sourcePresent:['loading','load failure/retry','submit validation with summary','pending','failure with retained draft','success status','dirty leave via requestLeave + confirm','beforeunload','description follow-up'],sourceOmitted:[],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Failure shows the raw service message in a role=alert paragraph.',passed:null},
 complexity:{judgment:'Small; hook owns state. Page CSS uses hard-coded colours instead of tokens.',rating:null},
 findings:[{kind:'source-defect',description:'Raw Error.message shown as failure copy.'},{kind:'source-risk',description:'Hard-coded colours ignore schemes and tokens.'}],
 evidence:[['final-src/main.tsx',43,57,'Awaited save adapter; raw error message.'],['final-src/main.tsx',65,68,'requestLeave with confirm.'],['final-src/main.tsx',75,97,'Breadcrumb guarded leave, ErrorSummary, failure paragraph, WorkflowStatus.'],['final-src/styles.css',1,23,'Hard-coded colours.']],
 keyboardLimitations:['ErrorSummary focus on invalid submit; other paths not exercised.'],
});
rerun(3,'codex-settings-primitives',{
 guidanceDiscovery:{applicable:false,observed:null,reason:'Primitive condition contains no framework guidance.'},
 patternSelection:{observed:'Handwritten form relying on native required/type=email validation and a disabled Save.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['loading','pending (inputs disabled)','failed save with retained draft','success alert','overview','description follow-up'],sourceOmitted:['load retry (copy says refresh the page)','app-level validation messages','dirty-leave confirmation on Cancel, breadcrumb and brand','beforeunload'],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Raw service error shown. "Visible across your workspace" is unsupported.',passed:null},
 complexity:{judgment:'Single component; small.',rating:null},
 findings:[{kind:'source-omission',description:'Three navigation paths discard unsaved edits without asking.'},{kind:'source-omission',description:'Load failure offers no retry action.'},{kind:'source-defect',description:'Raw Error.message shown as failure copy.'}],
 evidence:[['final-src/main.tsx',38,53,'Unconditional cancel; awaited save; raw error.'],['final-src/main.tsx',59,66,'Brand and breadcrumb leave without checks.'],['final-src/main.tsx',71,74,'No load retry; unsupported claim.']],
 keyboardLimitations:['Native validation bubbles only; no focus management.'],
});
rerun(3,'codex-settings-guidance',{
 guidanceDiscovery:{applicable:true,observed:true,evidence:[{path:'generation.jsonl',line:5,operation:'Read installed guidance README'},{path:'generation.jsonl',line:9,operation:'Read edit-record.md and principles.md'},{path:'generation.jsonl',line:13,operation:'npm exec -- altitude patterns'},{path:'generation.jsonl',line:22,operation:'altitude explain for five rules'}]},
 patternSelection:{observed:'Edit-record implemented locally, including a save sequence and newer-edit detection.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['loading','load failure/retry','submit validation with summary','pending','failure with retained draft','success status','newer-edit message','dirty Cancel confirm','beforeunload','description follow-up'],sourceOmitted:['errors cleared as fields are corrected'],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Raw service error plus "Your entries are still here". "Visible to everyone in your workspace" is unsupported.',passed:null},
 complexity:{judgment:'More app logic (sequence and draft refs) to cover stale responses; no dependencies.',rating:null},
 findings:[{kind:'source-defect',description:'Visible errors are not cleared as fields are corrected (update() leaves errors).'},{kind:'source-risk',description:'Error summary focus uses a ref on Alert; whether Alert forwards the ref was not verified.'},{kind:'source-defect',description:'Raw Error.message shown as failure copy.'}],
 evidence:[['final-src/main.tsx',47,69,'Guarded leave, update without clearing errors, sequenced save with newer-edit handling.'],['final-src/main.tsx',84,87,'Unsupported claim; summary Alert with ref; raw error.']],
 keyboardLimitations:['Summary focus depends on Alert ref forwarding.'],
});
rerun(3,'codex-settings-framework',{
 guidanceDiscovery:{applicable:true,observed:true,evidence:[{path:'generation.jsonl',line:5,operation:'Read installed guidance README'},{path:'generation.jsonl',line:8,operation:'altitude patterns and edit-record.md'},{path:'generation.jsonl',line:12,operation:'Read pattern-edit-record.d.ts'},{path:'generation.jsonl',line:24,operation:'Built the shipped framework fixture'}]},
 patternSelection:{observed:'useEditRecord with ErrorSummary, WorkflowStatus and requestLeave.',runtimeHooks:['useEditRecord','ErrorSummary','WorkflowStatus'],appropriateFamily:true},
 states:{sourcePresent:['loading','load failure/retry','submit validation with summary','pending','failure with retained draft','success status','newer-edit message','dirty Cancel via requestLeave + confirm','beforeunload','description follow-up'],sourceOmitted:[],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Failure wraps the raw service message: "Your changes weren\'t saved. <message> Try again."',passed:null},
 complexity:{judgment:'Small; hook owns state.',rating:null},
 findings:[{kind:'source-defect',description:'Raw Error.message embedded in failure copy.'}],
 evidence:[['final-src/main.tsx',14,34,'useEditRecord with awaited save adapter.'],['final-src/main.tsx',46,49,'requestLeave with confirm.'],['final-src/main.tsx',60,70,'ErrorSummary, failure Alert, WorkflowStatus.']],
 keyboardLimitations:['ErrorSummary focus on invalid submit; other paths not exercised.'],
});
