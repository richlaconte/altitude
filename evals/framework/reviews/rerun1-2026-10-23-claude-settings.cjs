// Independent AI reviews for the rerun1 pilot (2026-10-23): Claude settings cells. See rerun1-2026-10-23-codex-settings.cjs for the reviewer and scope.
const {rerun}=require('./rerun1-2026-10-23-codex-settings.cjs');
const noGuidance={applicable:false,observed:null,reason:'Primitive condition contains no framework guidance.'};
const discovered=(...ops)=>({applicable:true,observed:true,evidence:ops.map(([line,operation,path='generation.jsonl'])=>({path,line,operation}))});

rerun(1,'claude-settings-primitives',{
 guidanceDiscovery:noGuidance,
 patternSelection:{observed:'Overview/settings views with submit-time validation, toast on success and heading focus on view change.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['load failure/retry','submit validation','pending (inputs disabled)','failed save with retained draft','success toast and overview','focus to heading on view change','description follow-up'],sourceOmitted:['loading indicator (overview renders empty until loaded)','dirty-leave confirmation','error summary'],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Failure shows the raw service message followed by "Your changes are still here". Success is announced only by a transient toast.',passed:null},
 complexity:{judgment:'Compact component split; inline styles.',rating:null},
 findings:[{kind:'source-omission',description:'Cancel discards unsaved edits without asking.'},{kind:'source-defect',description:'Raw Error.message shown as failure copy.'},{kind:'source-omission',description:'No loading state for the overview.'}],
 evidence:[['final-src/main.tsx',16,44,'Heading focus on mount; overview without loading state.'],['final-src/main.tsx',61,75,'Awaited save; raw error message on failure.'],['final-src/main.tsx',101,101,'Unconditional Cancel.']],
 keyboardLimitations:['Heading receives focus on view change; error focus not managed.'],
});
rerun(1,'claude-settings-guidance',{
 guidanceDiscovery:discovered([2,'Read installed guidance README'],[5,'Read edit-record.md']),
 patternSelection:{observed:'Edit-record contract implemented locally with an in-app discard Dialog.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['loading','load failure/retry','submit validation','focused linked error summary','pending with ref guard','failure with retry and retained draft','newer-edit protection','success status','dirty Cancel via Dialog','beforeunload','focus return to overview title','description follow-up'],sourceOmitted:['errors cleared as fields are corrected'],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Failure shows the raw service message plus "Your changes are still here".',passed:null},
 complexity:{judgment:'Largest settings app in the cell (about 260 lines); separate load per view.',rating:null},
 findings:[{kind:'source-defect',description:'Visible errors are not cleared as fields are corrected.'},{kind:'source-defect',description:'Raw Error.message shown.'}],
 evidence:[['final-src/main.tsx',97,144,'beforeunload, summary focus, change handler without error clearing, guarded submit with newer-edit check.'],['final-src/main.tsx',146,155,'Leave goes through the Dialog when dirty.'],['final-src/main.tsx',190,194,'Failure Alert with retry.']],
 keyboardLimitations:['Summary focus and return focus to overview title; Dialog keyboard behaviour not exercised.'],
});
rerun(1,'claude-settings-framework',{
 guidanceDiscovery:discovered([7,'Read installed guidance README and npm exec -- altitude patterns'],[9,'Read edit-record.md and edit-record.json'],[20,'Read pattern-edit-record.d.ts'],[31,'Read the shipped fixture'],[40,'altitude explain ALT-EDIT-003 and others']),
 patternSelection:{observed:'useEditRecord with ErrorSummary, WorkflowStatus, requestLeave wired to Cancel, in-app navigation and hash Back via a promise-based discard Dialog.',runtimeHooks:['useEditRecord','ErrorSummary','WorkflowStatus'],appropriateFamily:true},
 states:{sourcePresent:['loading','load failure/retry','submit validation with summary','pending','failure with retained draft','success status','newer-edit message','dirty leave via Dialog for Cancel, navigation and Back','beforeunload','focus to heading and back to Edit','description follow-up'],sourceOmitted:[],notExecuted:['full keyboard/AT','Back integration']},
 contentAccuracy:{observed:'Service message is shown only when it is the server\'s own text; otherwise a connection message.',passed:null},
 complexity:{judgment:'More app code (about 270 lines) for routing and the leave decision.',rating:null},
 findings:[{kind:'note',description:'No source defects found in this review.'}],
 evidence:[['final-src/main.tsx',23,75,'Service-message filter, guarded navigation and Back handling.'],['final-src/main.tsx',157,201,'useEditRecord, guard registration, beforeunload, cancel.'],['final-src/main.tsx',240,271,'Promise-based discard Dialog.']],
 keyboardLimitations:['Dialog focus and Back paths were not exercised.'],
});
rerun(2,'claude-settings-primitives',{
 guidanceDiscovery:noGuidance,
 patternSelection:{observed:'Overview/settings views with submit-time validation and a success toast.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['loading skeleton','load failure/retry','submit validation','pending','failure with retained draft','success toast and overview','description follow-up'],sourceOmitted:['dirty-leave confirmation','error summary/focus','focus management on view change'],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Raw service message shown as failure copy.',passed:null},
 complexity:{judgment:'Compact.',rating:null},
 findings:[{kind:'source-omission',description:'Cancel discards unsaved edits without asking.'},{kind:'source-defect',description:'Raw Error.message shown.'}],
 evidence:[['final-src/main.tsx',60,74,'Awaited save; raw error.'],['final-src/main.tsx',99,99,'Unconditional Cancel.']],
 keyboardLimitations:['No focus management.'],
});
rerun(2,'claude-settings-guidance',{
 guidanceDiscovery:discovered([2,'Read installed guidance README'],[5,'Read edit-record.md'],[7,'npm exec -- altitude explain ALT-EDIT-001']),
 patternSelection:{observed:'Edit-record contract implemented locally with hash routing and one leave check for Cancel, links and Back.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['loading','load failure/retry','submit validation','focused linked error summary','pending with ref guard','failure with retained draft','newer-edit protection','success status','dirty leave via Dialog','beforeunload','heading focus','description follow-up'],sourceOmitted:['errors cleared as fields are corrected'],notExecuted:['full keyboard/AT','Back integration']},
 contentAccuracy:{observed:'Raw service message plus "Your changes are still here".',passed:null},
 complexity:{judgment:'About 290 lines including routing and an imperative form handle.',rating:null},
 findings:[{kind:'source-defect',description:'Visible errors are not cleared as fields are corrected.'},{kind:'source-defect',description:'Raw Error.message shown.'}],
 evidence:[['final-src/main.tsx',111,146,'Update without clearing errors; guarded submit with version check.'],['final-src/main.tsx',211,250,'Single leave check for navigation and popstate.']],
 keyboardLimitations:['Summary and heading focus; Dialog and Back paths not exercised.'],
});
rerun(2,'claude-settings-framework',{
 guidanceDiscovery:discovered([5,'Read edit-record.md and the shipped pattern-edit-record.tsx'],[8,'Read edit-record.json'],[15,'Read the shipped fixture'],[51,'npm exec -- altitude doctor --json']),
 patternSelection:{observed:'useEditRecord with ErrorSummary, WorkflowStatus and a promise-based discard Dialog for Cancel.',runtimeHooks:['useEditRecord','ErrorSummary','WorkflowStatus'],appropriateFamily:true},
 states:{sourcePresent:['loading','load failure/retry','submit validation with summary','pending','failure with retained draft','success status','dirty Cancel via Dialog','beforeunload','focus return to Edit','description follow-up'],sourceOmitted:['Back/navigation guard (no routing)'],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Failure embeds the raw service message in the status text.',passed:null},
 complexity:{judgment:'Small (about 160 lines); hook owns state.',rating:null},
 findings:[{kind:'source-defect',description:'Raw Error.message embedded in failure copy.'}],
 evidence:[['final-src/main.tsx',27,39,'Discard confirmation resolving the person\'s answer.'],['final-src/main.tsx',44,71,'useEditRecord, beforeunload, guarded cancel.']],
 keyboardLimitations:['Dialog focus not exercised.'],
});
rerun(3,'claude-settings-primitives',{
 guidanceDiscovery:noGuidance,
 patternSelection:{observed:'Overview/settings views with submit-time validation and a success toast.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['loading skeleton','load failure/retry','submit validation','pending','failure with retained draft','success toast and overview','description follow-up'],sourceOmitted:['dirty-leave confirmation','error summary/focus'],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Raw service message shown.',passed:null},
 complexity:{judgment:'Compact.',rating:null},
 findings:[{kind:'source-omission',description:'Cancel discards unsaved edits without asking.'},{kind:'source-defect',description:'Raw Error.message shown.'}],
 evidence:[['final-src/main.tsx',64,79,'Awaited save; raw error.'],['final-src/main.tsx',104,104,'Unconditional Cancel.']],
 keyboardLimitations:['autoFocus on the name field only.'],
});
rerun(3,'claude-settings-guidance',{
 guidanceDiscovery:discovered([4,'Read installed guidance README'],[7,'Read edit-record.md']),
 patternSelection:{observed:'Edit-record contract implemented locally with an explicit phase, hash routing and a leave guard Dialog.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['loading','load failure/retry','submit validation','focused linked error summary','pending with ref guard','failure with retry and retained draft','newer-edit protection','success status','dirty leave via Dialog for Cancel and Back','leave blocked while saving','beforeunload','heading focus','description follow-up'],sourceOmitted:[],notExecuted:['full keyboard/AT','Back integration']},
 contentAccuracy:{observed:'Raw service message plus "Your changes are still here".',passed:null},
 complexity:{judgment:'About 300 lines with routing and phase state.',rating:null},
 findings:[{kind:'source-defect',description:'Raw Error.message shown.'}],
 evidence:[['final-src/main.tsx',35,64,'Guarded navigation and Back; heading focus.'],['final-src/main.tsx',151,220,'Leave guard, beforeunload, guarded submit with newer-edit check.']],
 keyboardLimitations:['Summary and heading focus; Dialog and Back paths not exercised.'],
});
rerun(3,'claude-settings-framework',{
 guidanceDiscovery:discovered([3,'Read installed guidance README'],[6,'Read edit-record.md and npm exec -- altitude patterns'],[12,'Read the shipped fixture'],[25,'Read shipped pattern-edit-record.tsx'],[44,'npm exec -- altitude doctor --json']),
 patternSelection:{observed:'useEditRecord with ErrorSummary, WorkflowStatus and requestLeave for Cancel and hash Back through a discard Dialog.',runtimeHooks:['useEditRecord','ErrorSummary','WorkflowStatus'],appropriateFamily:true},
 states:{sourcePresent:['loading','load failure/retry','submit validation with summary','pending','failure with retained draft','success status','dirty leave via Dialog for Cancel and Back','beforeunload','heading focus','description follow-up'],sourceOmitted:[],notExecuted:['full keyboard/AT','Back integration']},
 contentAccuracy:{observed:'Only the server\'s own message is shown; parse and network errors get generic copy.',passed:null},
 complexity:{judgment:'About 215 lines with routing.',rating:null},
 findings:[{kind:'note',description:'No source defects found in this review.'}],
 evidence:[['final-src/main.tsx',26,43,'Service-message filter and discard confirmation.'],['final-src/main.tsx',80,109,'useEditRecord, leave handle, beforeunload.'],['final-src/main.tsx',175,192,'Back goes through requestLeave.']],
 keyboardLimitations:['Dialog and Back paths not exercised.'],
});
