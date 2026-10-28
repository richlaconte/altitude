// Independent AI reviews for the rerun1 pilot (2026-10-23): Codex records cells. See rerun1-2026-10-23-codex-settings.cjs for the reviewer and scope.
const {rerun}=require('./rerun1-2026-10-23-codex-settings.cjs');
const noGuidance={applicable:false,observed:null,reason:'Primitive condition contains no framework guidance.'};
const discovered=(...ops)=>({applicable:true,observed:true,evidence:ops.map(([line,operation])=>({path:'generation.jsonl',line,operation}))});

rerun(1,'codex-records-primitives',{
 guidanceDiscovery:noGuidance,
 patternSelection:{observed:'DataTable with debounced search, request sequence guard and a Select for sort.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['loading','populated','refreshing (retained)','no-results','first-use empty','failure with retry','stale-response guard','sort','selected count'],sourceOmitted:['reconciling or explaining selections hidden by a query'],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'A failed load sets rows to [] so the error Alert appears beside "No records yet". Raw service message shown.',passed:null},
 complexity:{judgment:'Single component; small.',rating:null},
 findings:[{kind:'source-defect',description:'Load failure is shown together with the first-use empty state, so failure and an empty collection look alike.'},{kind:'source-omission',description:'Selection is kept across queries without saying selected rows are hidden; the footer count includes them.'},{kind:'content',description:'Duplicate counts: the footer badge and DataTable\'s built-in selection count.'}],
 evidence:[['final-src/main.tsx',29,45,'Sequence-guarded load; failure clears rows and stores error.message.'],['final-src/main.tsx',101,123,'Error Alert, DataTable empty state and footer count.']],
 keyboardLimitations:['Clear moves focus to search; other focus paths not exercised.'],
});
rerun(1,'codex-records-guidance',{
 guidanceDiscovery:discovered([5,'Read installed guidance README'],[8,'Read async-collection.md and principles.md'],[10,'npm exec -- altitude patterns'],[14,'altitude explain ALT-COLLECTION-001, ALT-STATUS-001, ALT-VISUAL-001']),
 patternSelection:{observed:'Async-collection contract with DataTable, committed debounced query and request guard.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['loading','populated','refreshing with retained rows','stale marker on failed refresh','no-results','first-use empty','failure with retry','clear selection on query','status announcements','column sort'],sourceOmitted:[],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Failed refresh says rows may be out of date. Raw service message shown.',passed:null},
 complexity:{judgment:'Single component with explicit announcement state.',rating:null},
 findings:[{kind:'source-defect',description:'Raw Error.message shown in the failure Alert and announcement.'},{kind:'content',description:'Selected count is only DataTable\'s built-in toolbar count, shown when at least one row is selected.'}],
 evidence:[['final-src/main.tsx',35,73,'Guarded load, retained refresh, selection cleared on query change.'],['final-src/main.tsx',106,120,'Status region, stale-marked failure Alert, DataTable.']],
 keyboardLimitations:['No focus management after clear or failure.'],
});
rerun(1,'codex-records-framework',{
 guidanceDiscovery:discovered([5,'Read installed guidance README'],[7,'altitude patterns and async-collection.md'],[12,'Read pattern-async-collection.d.ts and the shipped fixture'],[21,'Built the shipped framework fixture']),
 patternSelection:{observed:'useAsyncCollection with clear-on-query selection, WorkflowStatus, Checkbox list and Select sort.',runtimeHooks:['useAsyncCollection','WorkflowStatus'],appropriateFamily:true},
 states:{sourcePresent:['loading','populated','refreshing','no-results','first-use empty','failure with retry','stale note on failed refresh','status announcements','sort','selected count'],sourceOmitted:[],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'States are distinct and copy matches them.',passed:null},
 complexity:{judgment:'Small; hook owns load state. CSS uses hard-coded colours.',rating:null},
 findings:[{kind:'source-risk',description:'Hard-coded colours ignore schemes and tokens.'}],
 evidence:[['final-src/main.tsx',13,36,'useAsyncCollection configuration and sort.'],['final-src/main.tsx',59,77,'Status, selection summary and distinct state views.']],
 keyboardLimitations:['Not exercised beyond the automated Space toggle.'],
});
rerun(2,'codex-records-primitives',{
 guidanceDiscovery:noGuidance,
 patternSelection:{observed:'Checkbox list with debounced search, request guard, Select sort and a preserve-selection policy.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['loading skeleton','populated','refresh','no-results','first-use empty','failure with retry (rows retained)','stale-response guard','sort','selected count with in-view count'],sourceOmitted:['stale marker on a failed refresh'],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Global and in-view selected counts explain hidden selections. Raw service message shown.',passed:null},
 complexity:{judgment:'Single component; hard-coded colours in CSS.',rating:null},
 findings:[{kind:'source-omission',description:'After a failed refresh the previous rows remain without saying they may be stale.'},{kind:'source-defect',description:'Raw Error.message shown.'}],
 evidence:[['final-src/main.tsx',34,49,'Debounced, sequence-guarded load.'],['final-src/main.tsx',87,101,'Counts, failure Alert, list and empty states.']],
 keyboardLimitations:['Clear moves focus to search; other paths not exercised.'],
});
rerun(2,'codex-records-guidance',{
 guidanceDiscovery:discovered([5,'Read installed guidance README'],[8,'altitude patterns and async-collection.md']),
 patternSelection:{observed:'DataTable with debounced request query, guard, controlled column sort.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['loading skeleton','populated','refreshing','failed refresh with retained rows and notice','initial failure','no-results','first-use empty','status announcements','selection cleared on query','sort','selected count'],sourceOmitted:[],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Refresh failure says previous rows are still shown. Raw service message shown.',passed:null},
 complexity:{judgment:'Single component; compact.',rating:null},
 findings:[{kind:'content',description:'Two selection counts: the app summary and DataTable\'s built-in toolbar count.'},{kind:'source-defect',description:'Raw Error.message shown.'}],
 evidence:[['final-src/main.tsx',22,58,'Debounce, guarded load, clear-on-query, status message.'],['final-src/main.tsx',79,103,'Selection summary, alerts and DataTable.']],
 keyboardLimitations:['No focus management after clear or failure.'],
});
rerun(2,'codex-records-framework',{
 guidanceDiscovery:discovered([5,'Read installed guidance README'],[7,'altitude patterns and async-collection.md'],[9,'Read pattern-async-collection.d.ts'],[11,'Read the shipped fixture']),
 patternSelection:{observed:'useAsyncCollection with clear-on-query selection, EmptyState per state, Checkbox list and Select sort.',runtimeHooks:['useAsyncCollection','WorkflowStatus'],appropriateFamily:true},
 states:{sourcePresent:['loading','populated','refreshing','no-results','first-use empty','initial failure','failed refresh with retained rows','status announcements','sort','selected count'],sourceOmitted:[],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Copy matches states; the hook error is shown as the failure description.',passed:null},
 complexity:{judgment:'Small; hard-coded colours in CSS.',rating:null},
 findings:[{kind:'source-risk',description:'Hard-coded colours ignore schemes and tokens.'}],
 evidence:[['final-src/main.tsx',16,33,'useAsyncCollection configuration and sort.'],['final-src/main.tsx',47,60,'Distinct state views, refresh error, toolbar.']],
 keyboardLimitations:['Not exercised beyond the automated Space toggle.'],
});
rerun(3,'codex-records-primitives',{
 guidanceDiscovery:noGuidance,
 patternSelection:{observed:'DataTable with debounced query, guard, default column sort and a preserve-selection policy.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['loading skeleton','populated','no-results','first-use empty','failure with retry','stale-response guard','hidden-selection note','column sort'],sourceOmitted:['retained content during refresh (rows cleared)'],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Failure sets rows to [] so the error appears beside "No records yet". Raw service message shown.',passed:null},
 complexity:{judgment:'Single component with inline styles.',rating:null},
 findings:[{kind:'source-defect',description:'Load failure is shown together with the first-use empty state.'},{kind:'source-omission',description:'Refresh clears the rows instead of keeping them while loading.'}],
 evidence:[['final-src/main.tsx',47,58,'Every load clears rows; failure sets rows to [].'],['final-src/main.tsx',89,111,'Failure Alert, DataTable empty state, hidden-selection note.']],
 keyboardLimitations:['No focus management.'],
});
rerun(3,'codex-records-guidance',{
 guidanceDiscovery:discovered([5,'Read installed guidance README'],[7,'altitude patterns and async-collection.md'],[10,'altitude explain for three rules']),
 patternSelection:{observed:'DataTable with an explicit load phase, guard and controlled sort.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['loading','populated','refreshing','failed refresh marked possibly out of date','initial failure','no-results','first-use empty with refresh','status announcements','selection cleared on query','sort','selected count'],sourceOmitted:[],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Stale marking on refresh failure. Raw service message shown.',passed:null},
 complexity:{judgment:'Single component; phase state.',rating:null},
 findings:[{kind:'content',description:'Two selection counts: the app summary and DataTable\'s built-in toolbar count.'},{kind:'source-defect',description:'Raw Error.message shown.'}],
 evidence:[['final-src/main.tsx',32,74,'Phase machine, guarded load, status text.'],['final-src/main.tsx',96,103,'Selection summary, failure Alert, DataTable.']],
 keyboardLimitations:['No focus management after clear or failure.'],
});
rerun(3,'codex-records-framework',{
 guidanceDiscovery:discovered([5,'Read installed guidance README'],[8,'npm exec -- altitude patterns'],[10,'Read async-collection.md and principles.md'],[12,'altitude explain for three rules'],[32,'Built the shipped framework fixture']),
 patternSelection:{observed:'useAsyncCollection with preserve-selection policy, hidden-selection count, native checkbox list and Select sort.',runtimeHooks:['useAsyncCollection','WorkflowStatus'],appropriateFamily:true},
 states:{sourcePresent:['loading','populated','refreshing','no-results','first-use empty','initial failure','failed refresh with stale note','status announcements','hidden-selection count','sort','selected count'],sourceOmitted:[],notExecuted:['full keyboard/AT']},
 contentAccuracy:{observed:'Copy matches states; explains selections outside the current view.',passed:null},
 complexity:{judgment:'Small; hard-coded colours in CSS.',rating:null},
 findings:[{kind:'source-risk',description:'Hard-coded colours ignore schemes and tokens.'}],
 evidence:[['final-src/main.tsx',13,34,'useAsyncCollection with preserve policy and hidden count.'],['final-src/main.tsx',50,59,'Distinct state views and selection summary.']],
 keyboardLimitations:['Not exercised beyond the automated Space toggle.'],
});
