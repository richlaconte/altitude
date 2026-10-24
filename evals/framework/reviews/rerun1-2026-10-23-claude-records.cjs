// Independent AI reviews for the rerun1 pilot (2026-10-23): Claude records cells. See rerun1-2026-10-23-codex-settings.cjs for the reviewer and scope.
const {rerun}=require('./rerun1-2026-10-23-codex-settings.cjs');
const noGuidance={applicable:false,observed:null,reason:'Primitive condition contains no framework guidance.'};
const discovered=(...ops)=>({applicable:true,observed:true,evidence:ops.map(([line,operation])=>({path:'generation.jsonl',line,operation}))});
const toolbarRisk={kind:'library',description:'Search, sort and refresh controls are placed in DataTable\'s toolbar, whose .alt-table-tools does not wrap (issue #26); EVAL-REFLOW measures the effect.'};

rerun(1,'claude-records-primitives',{
 guidanceDiscovery:noGuidance,
 patternSelection:{observed:'DataTable with debounced query, effect-scoped stale guard, Select sort and preserved selection with a hidden count.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['loading','populated','refreshing','no-results','first-use empty','failure with retry (rows retained)','stale-response guard','sort','selected count with hidden count'],sourceOmitted:['stale marker on a failed refresh'],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'On a first-load failure, rows become [] and "No records yet" appears beside the error. Raw service message shown.',passed:null},
 complexity:{judgment:'Single component; inline styles.',rating:null},
 findings:[{kind:'source-defect',description:'A first-load failure also shows the first-use empty state.'},toolbarRisk,{kind:'source-defect',description:'Raw Error.message shown.'}],
 evidence:[['final-src/main.tsx',41,59,'Effect-scoped guard; preserved selection with hidden count.'],['final-src/main.tsx',61,139,'Toolbar inside DataTable; failure Alert; empty states.']],
 keyboardLimitations:['Escape clears search and focus returns to it; other paths not exercised.'],
});
rerun(1,'claude-records-guidance',{
 guidanceDiscovery:discovered([3,'Read installed guidance README'],[6,'Read async-collection.md'],[8,'npm exec -- altitude patterns'],[10,'Read async-collection.json and altitude explain ALT-COLLECTION-001']),
 patternSelection:{observed:'Hand-built collection hook with explicit phases, Table with checkbox column and header sort, preserved selection with named hidden selections.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['loading','populated','refreshing','failure with retry and stale timestamp','no-results','first-use empty','stale-response guard','status announcements','sort','selected count','hidden selections named'],sourceOmitted:[],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Failure keeps earlier results with a timestamp. Raw service message shown.',passed:null},
 complexity:{judgment:'About 280 lines; reimplements the collection contract.',rating:null},
 findings:[{kind:'source-defect',description:'Raw Error.message shown.'}],
 evidence:[['final-src/main.tsx',30,74,'Collection hook with request guard and phases.'],['final-src/main.tsx',180,211,'Failure Alert with stale note; selection summary.']],
 keyboardLimitations:['Escape clears search; table keyboard behaviour not exercised.'],
});
rerun(1,'claude-records-framework',{
 guidanceDiscovery:discovered([2,'Read installed guidance README and npm exec -- altitude patterns'],[5,'Read async-collection.md'],[17,'Read the shipped fixture'],[60,'npm exec -- altitude doctor --json']),
 patternSelection:{observed:'useAsyncCollection with preserve policy, WorkflowStatus, Checkbox list, Select sort and named hidden selections.',runtimeHooks:['useAsyncCollection','WorkflowStatus'],appropriateFamily:true},
 states:{sourcePresent:['loading','populated','refreshing','failure with stale note','no-results','first-use empty with refresh','status announcements','sort','selected count','hidden selections with deselect'],sourceOmitted:[],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Failure copy does not echo raw errors; stale results are labelled.',passed:null},
 complexity:{judgment:'About 170 lines; hook owns load state.',rating:null},
 findings:[{kind:'note',description:'No source defects found in this review.'}],
 evidence:[['final-src/main.tsx',28,60,'useAsyncCollection, debounced query, settled query tracking.'],['final-src/main.tsx',104,164,'Status, failure, empty states, sort, list and selection section.']],
 keyboardLimitations:['Not exercised beyond the automated Space toggle.'],
});
rerun(2,'claude-records-primitives',{
 guidanceDiscovery:noGuidance,
 patternSelection:{observed:'DataTable with debounced query, effect-scoped guard and Select sort in the toolbar.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['loading','populated','refreshing','no-results','first-use empty','failure with retry (rows retained)','stale-response guard','sort'],sourceOmitted:['stale marker on a failed refresh','explanation of selections hidden by a query'],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Raw service message shown. Selected count relies on DataTable\'s built-in toolbar count.',passed:null},
 complexity:{judgment:'Single component; inline styles.',rating:null},
 findings:[toolbarRisk,{kind:'source-defect',description:'Raw Error.message shown.'}],
 evidence:[['final-src/main.tsx',41,52,'Effect-scoped guard.'],['final-src/main.tsx',97,141,'Failure Alert; DataTable with toolbar and empty states.']],
 keyboardLimitations:['Escape clears search; other paths not exercised.'],
});
rerun(2,'claude-records-guidance',{
 guidanceDiscovery:discovered([3,'Read installed guidance README'],[6,'Read async-collection.md'],[8,'Read async-collection.json'],[22,'npm exec -- altitude explain ALT-COLLECTION-001']),
 patternSelection:{observed:'Hand-built phases with request guard, Checkbox list, Select sort and preserved selection with named hidden selections.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['loading','populated','refreshing','failure with stale timestamp','no-results','first-use empty','stale-response guard','status announcements','sort','selected count','removed selections reported'],sourceOmitted:[],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Stale results dimmed and dated. Raw service message shown.',passed:null},
 complexity:{judgment:'About 200 lines.',rating:null},
 findings:[{kind:'source-defect',description:'Raw Error.message shown in status and Alert.'},{kind:'source-risk',description:'Stale results are dimmed with opacity 0.6, which may lower text contrast.'}],
 evidence:[['final-src/main.tsx',39,71,'Guarded load, phase and status, selection reconciliation.'],['final-src/main.tsx',129,197,'Failure Alert, sort, counts, hidden selections, dimmed list.']],
 keyboardLimitations:['Not exercised.'],
});
rerun(2,'claude-records-framework',{
 guidanceDiscovery:discovered([2,'Read installed guidance README'],[5,'Read async-collection.md'],[10,'Read shipped pattern-async-collection.tsx'],[16,'npm exec -- altitude patterns']),
 patternSelection:{observed:'useAsyncCollection with preserve policy, WorkflowStatus, Checkbox list, Select sort and named hidden selections.',runtimeHooks:['useAsyncCollection','WorkflowStatus'],appropriateFamily:true},
 states:{sourcePresent:['loading','populated','refreshing','failure with stale note','no-results','first-use empty with refresh','status announcements','sort','selected count','hidden selections with deselect'],sourceOmitted:[],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Shows the hook\'s failure message and labels stale results.',passed:null},
 complexity:{judgment:'About 170 lines.',rating:null},
 findings:[{kind:'note',description:'No source defects found in this review.'}],
 evidence:[['final-src/main.tsx',25,62,'useAsyncCollection and loaded-query tracking.'],['final-src/main.tsx',97,168,'Status, failure note, states, sort, list and selection section.']],
 keyboardLimitations:['Not exercised beyond the automated Space toggle.'],
});
rerun(3,'claude-records-primitives',{
 guidanceDiscovery:noGuidance,
 patternSelection:{observed:'DataTable with debounced query, effect-scoped guard, column sort and built-in selection count.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['loading','populated','refreshing','no-results','first-use empty','failure with retry','stale-response guard','column sort'],sourceOmitted:['explanation of selections hidden by a query'],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'On a first-load failure, rows become [] and the empty state appears beside the error. Raw service message shown.',passed:null},
 complexity:{judgment:'Single component; inline styles.',rating:null},
 findings:[{kind:'source-defect',description:'A first-load failure also shows the first-use empty state.'},toolbarRisk,{kind:'source-defect',description:'Raw Error.message shown.'}],
 evidence:[['final-src/main.tsx',30,47,'Effect-scoped guard.'],['final-src/main.tsx',98,149,'Failure Alert; DataTable toolbar, rows fallback and empty states.']],
 keyboardLimitations:['Escape clears search; other paths not exercised.'],
});
rerun(3,'claude-records-guidance',{
 guidanceDiscovery:discovered([2,'Read installed guidance README'],[5,'Read async-collection.md'],[7,'Read async-collection.json']),
 patternSelection:{observed:'Hand-built records hook with phases and request guard, Checkbox list with select-all, Select sort, preserved selection with named hidden selections.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['loading','populated','refreshing','failure with retry and stale note','no-results','first-use empty with refresh','stale-response guard','status announcements','sort','selected count with hidden names'],sourceOmitted:[],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Raw service message shown, followed by a stale-results note on refresh failure.',passed:null},
 complexity:{judgment:'About 260 lines; reimplements the collection contract.',rating:null},
 findings:[{kind:'source-defect',description:'Raw Error.message shown.'},{kind:'source-risk',description:'Refreshing results are dimmed with opacity 0.7, which may lower text contrast.'}],
 evidence:[['final-src/main.tsx',28,65,'Records hook with request guard and phases.'],['final-src/main.tsx',166,232,'Status, failure Alert, selection summary, states and list.']],
 keyboardLimitations:['Escape clears search; other paths not exercised.'],
});
rerun(3,'claude-records-framework',{
 guidanceDiscovery:discovered([2,'Read installed guidance README'],[5,'Read async-collection.md'],[7,'Read pattern-async-collection.d.ts and async-collection.json'],[9,'Read the shipped fixture and pattern source'],[60,'npm exec -- altitude doctor --json']),
 patternSelection:{observed:'useAsyncCollection with preserve policy, WorkflowStatus, Card-wrapped Checkbox list, Select sort and named hidden selections.',runtimeHooks:['useAsyncCollection','WorkflowStatus'],appropriateFamily:true},
 states:{sourcePresent:['loading','populated','refreshing','failure with retained results','no-results','first-use empty with refresh','status announcements','sort','selected count','hidden selections named'],sourceOmitted:[],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Failure copy does not echo raw errors; retained results are labelled.',passed:null},
 complexity:{judgment:'About 160 lines; hook owns load state.',rating:null},
 findings:[{kind:'note',description:'No source defects found in this review.'}],
 evidence:[['final-src/main.tsx',22,76,'useAsyncCollection, sort, debounce, retained-query tracking.'],['final-src/main.tsx',93,157,'Sort, count, status, failure, states, list and selection section.']],
 keyboardLimitations:['Not exercised beyond the automated Space toggle.'],
});
