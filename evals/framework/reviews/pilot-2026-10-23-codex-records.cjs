// Record of the independent AI reviews written for the 2026-10-23 pilot (codex records runs). Rerunning rewrites each review.json
// with a new reviewedAt and the current assessment metrics, and drops later addenda such as assessmentUpdates.
const {review}=require('./review-lib.cjs');
const REVIEWER='Independent reviewer subagent (claude-opus-5-5); source, trace and rendered screenshot review';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../../..');
function write(id,d){review(id,d);const f=path.join(root,'build/test/framework-pilot-corrected-codex',id,'review.json');const j=JSON.parse(fs.readFileSync(f,'utf8'));j.reviewer=REVIEWER;fs.writeFileSync(f,JSON.stringify(j,null,2)+'\n');}

const ASSESSOR_NOTE_METRIC='Assessor metric naming: accessibilityDefects=true is the aggregate of EVAL-A11Y passed values (assess.mjs metricsFromChecks), i.e. no executed axe violations. It does not mean defects were found; the name reads inverted.';
const ASSESSOR_NOTE_FOLLOWUP='followupRegressions=true only re-runs the initial-stage checks against the final build. The follow-up features (sort direction control, selected count) are not executed by assessor v1.4.0; they are judged here from source and screenshot only.';

write('codex-records-primitives',{
 guidanceDiscovery:{applicable:false,observed:null,reason:'Primitive condition intentionally contains no framework guidance. Trace shows README, public .d.ts and dist reads only (generation.jsonl lines 7, 9, 11, 18).'},
 patternSelection:{observed:'Handwritten debounced query effect with a request-id stale guard, feeding Altitude DataTable (selectable, empty slot) plus an app Badge for the count and, after follow-up, a Select for sort direction applied by local sort. No explicit selection policy.',runtimeHooks:[],appropriateFamily:true},
 states:{
  sourcePresent:['initial loading (DataTable skeleton while rows undefined)','populated','no-results with clear-search action','first-use empty copy','load failure Alert with Try again','refresh pending (button spinner/label)','stale-response guard by request id','sort direction (follow-up)','always-visible selected count (follow-up)'],
  sourceOmitted:['failed refresh retaining prior results (records are replaced with [])','explicit selection policy or explanation of selections hidden by the current filter','reconciliation of selected ids absent from a new result set'],
  sourceRisks:['failure renders the first-use "No records yet" empty state and "0 records" under the error Alert','count line pairs the new query text with the previous result count while the new request is in flight','aria-live region wraps the Select and Badge, so control changes are announced as part of the count region','app Badge duplicates the DataTable built-in "N selected" toolbar and its own live region'],
  notExecuted:['first-use empty','out-of-order query responses (source guard present, unexecuted)','sort control and selected count (follow-up features)','selection count after filtering hides a selected row (screenshot only)','full keyboard/AT']
 },
 contentAccuracy:{observed:'Load failure is not distinct from empty: captured EVAL-LOAD-FAILURE text shows the critical Alert followed by "0 records" and "No records yet / Project records will appear here when they are available." for a service that has three records. No-results copy is accurate. The selected count is truthful about stored ids but, because selection is preserved across filtering without explanation, the screenshot shows "1 selected" (twice) while the only visible row is unchecked.',passed:null},
 complexity:{judgment:'Small single-component app (122 lines) using DataTable for most behaviour; correctness gaps come from state shape (records replaced on failure, no selection policy), not from size.',rating:null},
 findings:[
  {kind:'executed-defect',description:'Failed refresh conflates failure with an empty collection. assessment.json EVAL-LOAD-FAILURE visible text (both stages) shows "Records couldn’t be loaded" together with "0 records" and the first-use empty state "No records yet". The assessor leaves passed:null by design; this reviewer judges it a failure of the distinct-failure criterion. Cause in source: catch sets records to [] (final main.tsx line 43).'},
  {kind:'source-defect',description:'Failed refresh discards previously loaded records instead of retaining them, so the person loses context on a transient error.'},
  {kind:'source-risk',description:'Selection is implicitly preserved across query changes with no explanation and no reconciliation. Observed in the final screenshot: after Atlas was selected and the query changed to Beacon, the screen shows "1 selected" in the app Badge and "selected 1" in the DataTable toolbar while the only visible row (Beacon) is unchecked. EVAL-SELECTION passes because it only checks identity transfer, which is correct here.'},
  {kind:'source-defect',description:'Duplicate selected counts: the app renders its own Badge (final line 96) while DataTable selectable renders a built-in count, "selected" label, Clear button and a polite live region. Both are visible in the screenshot. Present in initial too (initial line 75) when selection > 0.'},
  {kind:'source-risk',description:'Count text uses the debounced query immediately while records still hold the previous response, so "3 records matching “Atlas”" can be shown and announced transiently. Not executed.'},
  {kind:'source-risk',description:'aria-live="polite" is placed on the whole table-meta container including the sort Select and Badge (line 83), so announcements may include control text; not verified with AT.'},
  {kind:'source-limitation',description:'Follow-up removed the DataTable header sort (initial sortValue/defaultSort) in favour of a separate Select and local sort; acceptable, but the table header no longer exposes sort state (no aria-sort) and the change was not exercised by the assessor.'},
  {kind:'source-limitation',description:'Stale-response handling exists (request id compared in then/catch/finally) but out-of-order responses were not executed by the assessor; no AbortController, so superseded requests still complete.'},
  {kind:'source-limitation',description:ASSESSOR_NOTE_METRIC+' Axe color-contrast "incomplete" nodes (eyebrow, heading, button labels, placeholder) were not resolved and are not counted.'},
  {kind:'source-limitation',description:ASSESSOR_NOTE_FOLLOWUP}
 ],
 evidence:[
  ['final-src/main.tsx',30,33,'250ms debounce of the search text into the query.'],
  ['final-src/main.tsx',35,48,'Request-id stale guard; on failure records are replaced with [] (line 43) rather than retained.'],
  ['final-src/main.tsx',50,50,'Clear search resets text and query; selection is untouched (implicit preserve policy).'],
  ['final-src/main.tsx',74,74,'Critical Alert with Try again wired to a fresh load.'],
  ['final-src/main.tsx',83,84,'Live region wraps the count line, which combines current records length with the already-updated query.'],
  ['final-src/main.tsx',86,96,'Follow-up sort Select and always-visible app selection Badge.'],
  ['final-src/main.tsx',100,113,'DataTable selectable (built-in count/Clear/live region) and empty slot whose copy depends only on query, so failure with query "" shows "No records yet".'],
  ['initial-src/main.tsx',75,75,'Initial app Badge shown only when selection > 0, already duplicating the DataTable toolbar count.'],
  ['initial-src/main.tsx',90,90,'Initial build used DataTable header sorting, replaced in follow-up.']
 ],
 keyboardLimitations:['No manual keyboard or AT testing performed.','The assessor toggled the Atlas checkbox with Space because the Altitude Checkbox aria-hidden visual track intercepts synthetic pointer clicks; whether a real mouse click on the track toggles selection was not verified.','Clear-search icon button is a raw <button> with aria-label inside the Input trailing slot; its focus order relative to the ghost "Clear" button and announcement were not checked.','Focus after Clear search, after Try again and after the error Alert disappears is not managed in source.'],
 screenshot:['320px RTL forced colours, final state after the selection scenario (query "Beacon"). No horizontal overflow; header, Refresh, search and table fit.','Two selection counts are visible: app Badge "1 selected" beside the sort Select, and DataTable toolbar "selected 1" with a "Clear" button. The only visible row, Beacon, is unchecked: the count refers to the hidden Atlas row.','Count line reads "1 record matching “Beacon”" with bidi punctuation reordering under forced dir=rtl on English text (expected harness artefact).','Table columns mirror correctly (checkbox at inline end); record mark "B" and id "p2" visible.']
});

write('codex-records-guidance',{
 guidanceDiscovery:{applicable:true,observed:true,evidence:[
  {path:'generation.jsonl',line:5,operation:'Read installed node_modules/altitude-design/dist/guidance/README.md'},
  {path:'generation.jsonl',line:7,operation:'Ran npm exec -- altitude patterns "search, refresh, select records" --json (returned async-collection) and read guidance/patterns/async-collection.md'},
  {path:'generation.jsonl',line:10,operation:'Attempted to read references/build/fixtures/pattern-workflows.tsx and dist/index.d.ts (no file content appears in captured output); ran altitude explain ALT-COLLECTION-001, ALT-STATUS-001, ALT-VISUAL-001'},
  {path:'generation.jsonl',line:14,operation:'rg for useAsyncCollection|WorkflowStatus in dist and types exited 1 (not exported in guidance condition)'},
  {path:'generation.jsonl',line:16,operation:'rg found useAsyncCollection only in async-collection.md text, confirming the documented hook is absent'},
  {path:'followup.jsonl',line:5,operation:'Re-read guidance README'},
  {path:'followup.jsonl',line:9,operation:'Re-read async-collection.md'},
  {path:'followup.jsonl',line:11,operation:'Ran altitude patterns "sort records and show selection count" --json'},
  {path:'followup.jsonl',line:18,operation:'Ran altitude explain ALT-COLLECTION-001, ALT-STATUS-001, ALT-VISUAL-001'}],
  inference:'Commands demonstrate guidance access and pattern lookup in both sessions. The trace also shows the guidance-only package documents useAsyncCollection, which this condition does not export; the client noticed and implemented the pattern locally. Final self-claims are not used as evidence.'},
 patternSelection:{observed:'async-collection selected via CLI; implemented locally with a load state machine (loading/ready/refreshing/failed), request-id stale guard, clear-on-search selection policy with pruning to returned ids, DataTable with controlled sort and a toolbar Select.',runtimeHooks:[],appropriateFamily:true},
 states:{
  sourcePresent:['initial loading (skeleton, status text)','populated with settled count','refreshing with retained results','first-use empty','no-results with clear-search','initial load failure without empty-state copy','failed refresh retaining results with explicit staleness text','stale-response guard','selection cleared on new search and pruned to returned ids','sort direction via Select and header (follow-up)','always-visible selected count (follow-up)'],
  sourceOmitted:['explanation of the selection policy to the person (policy only in code/README)'],
  sourceRisks:['failure after a new query keeps the previous query’s rows and labels them "may be out of date", although they answer a different search','Badge with aria-label (axe incomplete aria-prohibited-attr in final)','DataTable built-in selected count/live region duplicates the app Badge and status region when selection > 0','sort Select lives in the DataTable toolbar, so it disappears in no-results, empty and initial-failure states'],
  notExecuted:['first-use empty','out-of-order query responses','failure after a query change','sort control and count (follow-up)','full keyboard/AT']
 },
 contentAccuracy:{observed:'Load failure is distinct from empty: with no prior rows the empty/no-results block is suppressed (failed branch renders null), and the captured failed-refresh text shows "Refresh failed. Showing the last available records." plus "The records below may be out of date." with the retained rows. Settled counts ("1 record found for “Atlas”.", "3 records available.") match the service. Count is announced via role=status only when settled.',passed:null},
 complexity:{judgment:'Moderate local state machine (109 lines) that reimplements most of the documented hook semantics by hand; explicit submit-based search adds a Search button. No extra dependencies.',rating:null},
 findings:[
  {kind:'source-risk',description:'If a new query fails, records from the previous query remain and the copy says "Could not refresh records … may be out of date"; the rows actually answer a different search than the one shown in the input. Not executed (assessor only fails a refresh of the same query).'},
  {kind:'source-defect',description:'Follow-up put aria-label on Badge (final line 77). assessment.json final-stage EVAL-A11Y lists axe incomplete "aria-prohibited-attr" on .alt-badge in all three states (absent from initial). It is "incomplete", so EVAL-A11Y still passed and followupRegressions=true does not surface it; the label may be ignored by AT.'},
  {kind:'source-risk',description:'DataTable selectable renders its own "N selected" count, Clear button and polite live region when selection > 0, in addition to the app Badge and role=status line; duplicate visible counts and announcements are likely (same component behaviour visible in the primitives screenshot). Not observed in this screenshot because selection was cleared by the search.'},
  {kind:'source-limitation',description:'Resubmitting the same query (Search/Enter) clears selection, but Refresh only prunes it; two refresh paths have different selection effects.'},
  {kind:'source-limitation',description:'Search requires explicit submit (Enter or Search button); assessor recorded submittedWithEnter:true. Valid, but different interaction from live filtering in the other runs.'},
  {kind:'source-limitation',description:'Stale-response guard (request id) present but no abort, and out-of-order responses were not executed.'},
  {kind:'source-limitation',description:ASSESSOR_NOTE_METRIC},
  {kind:'source-limitation',description:ASSESSOR_NOTE_FOLLOWUP}
 ],
 evidence:[
  ['final-src/main.tsx',22,37,'Request-id stale guard; records retained on failure; selection pruned to returned ids on success.'],
  ['final-src/main.tsx',41,52,'Submit and clear both clear selection (clear-on-query policy).'],
  ['final-src/main.tsx',54,58,'Staleness flag and settled count message only in ready state.'],
  ['final-src/main.tsx',72,77,'role=status line for loading/refreshing/settled/failure; Badge with aria-label (axe incomplete).'],
  ['final-src/main.tsx',79,81,'Failure Alert distinguishes initial load failure from failed refresh with staleness text.'],
  ['final-src/main.tsx',82,103,'Render branches: skeleton, DataTable with controlled sort and toolbar Select, empty/no-results, and null for initial failure.'],
  ['initial-src/main.tsx',75,75,'Initial count Badge only when selection > 0.']
 ],
 keyboardLimitations:['No manual keyboard or AT testing performed.','The assessor toggled checkboxes with Space because the Altitude Checkbox aria-hidden visual track intercepts synthetic pointer clicks; whether a real mouse click on the track toggles selection was not verified.','Two sort affordances (Name header button and Select) share state; keyboard operation of the header was claimed in the trace but not tested.','No focus management after Clear search, Try again or result replacement.'],
 screenshot:['320px RTL forced colours, final state with query "Beacon". No horizontal overflow; heading, search field, Search and Clear search buttons wrap cleanly.','Status reads "1 record found for “Beacon”." and Badge "0 selected": selection was cleared by the new search, consistent with source.','Sort by name Select ("A to Z") and Name header with sort arrow both visible; checkbox column mirrored to inline end.','Bidi punctuation reordering on English sentences under forced dir=rtl (harness artefact).']
});

write('codex-records-framework',{
 guidanceDiscovery:{applicable:true,observed:true,evidence:[
  {path:'generation.jsonl',line:5,operation:'Read installed dist/guidance/README.md'},
  {path:'generation.jsonl',line:8,operation:'Ran npm exec -- altitude patterns "search filter browse records" --json and read patterns/async-collection.md'},
  {path:'generation.jsonl',line:10,operation:'Listed package files, read patterns/async-collection.json metadata, searched for useAsyncCollection/WorkflowStatus'},
  {path:'generation.jsonl',line:12,operation:'Ran altitude explain ALT-COLLECTION-001, ALT-STATUS-001, ALT-VISUAL-001; read types/pattern-async-collection.d.ts and references/build/fixtures/pattern-workflows.tsx'},
  {path:'generation.jsonl',line:22,operation:'Attempted the shipped check references/build/checks/pattern-workflows.mjs; it failed with ERR_MODULE_NOT_FOUND for playwright-core'},
  {path:'followup.jsonl',line:7,operation:'Ran altitude patterns "sort a collection and show selected record count" --json and re-read async-collection.md'},
  {path:'followup.jsonl',line:12,operation:'Read select.d.ts and the pattern-workflows.tsx fixture'},
  {path:'followup.jsonl',line:23,operation:'Ran references/scripts/build-framework-fixture.mjs and altitude doctor --json'}],
  inference:'Guidance and the runtime hook declarations were read before writing source. The shipped verification check could not run in the consumer install (missing playwright-core), so no executable pattern check was actually completed by the client.'},
 patternSelection:{observed:'useAsyncCollection with selection:"clear-on-query", custom messages, WorkflowStatus for announcements, Table primitives with Altitude Checkbox, EmptyState for empty/no-results, Alert for failure; follow-up adds local sort Select.',runtimeHooks:['useAsyncCollection','WorkflowStatus'],appropriateFamily:true},
 states:{
  sourcePresent:['initial loading (spinner + hidden status)','refreshing with retained rows and aria-busy','populated','first-use empty (EmptyState)','no-results with clear-search','failure Alert with Try again','stale-response handling via hook generation counter and abort','selection clear-on-query and clear-selection action','sort direction (follow-up)','always-visible selected count (follow-up)'],
  sourceOmitted:['staleness indication when a refresh fails with retained rows (guidance: "identifies their staleness")','debounce of query changes','reconciliation of selected ids missing from a refreshed result'],
  sourceRisks:['a failed new query shows the previous query’s rows under the new search text with no staleness label','status announced and a request issued on every keystroke','no-results announced twice (WorkflowStatus status plus EmptyState announce)','whitespace-only query is sent unfiltered but isFiltered trims, so it is treated as first-use empty if the service returns none'],
  notExecuted:['first-use empty','out-of-order query responses (hook guards them; unexecuted)','failure after a query change','sort control and count (follow-up)','full keyboard/AT']
 },
 contentAccuracy:{observed:'Failure is not confused with empty (empty/no-results only render in those phases). But the captured EVAL-LOAD-FAILURE text shows "Records couldn’t be loaded / We couldn’t load the project records. Try again." directly above three retained rows, with no statement that the rows are from an earlier load; the title reads as if nothing loaded. Settled counts ("1 project record loaded", "3 project records loaded") are truthful but sit in a visually hidden WorkflowStatus; the visible count is only the selection count.',passed:null},
 complexity:{judgment:'Compact (102 lines): the hook absorbs stale handling and selection policy, leaving rendering only. Client also edited build.mjs (generation.jsonl lines 26-27); built index.html differs only in title ("Project records").',rating:null},
 findings:[
  {kind:'source-omission',description:'Failed refresh retains rows (hook does not clear items) but the app shows a generic "Records couldn’t be loaded" Alert with no staleness wording, contrary to the async-collection guidance the client read. Captured visible text in assessment.json EVAL-LOAD-FAILURE (both stages) confirms the rows remain under the Alert; assessor passed:null by design. Reviewer judgment: distinct from empty, but staleness not identified.'},
  {kind:'source-risk',description:'If a new query fails, collection.items still holds the previous query’s results and the table renders them under the new query text with the same generic failure Alert. Not executed.'},
  {kind:'source-risk',description:'Input onChange calls collection.setQuery on every keystroke: one request, one status announcement and one selection clear per character. Guidance warns against noisy per-keystroke announcements. Hook generation counter prevents stale overwrite; load ignores the abort signal.'},
  {kind:'source-risk',description:'no-results is announced by both WorkflowStatus (status "No records match your search") and EmptyState announce, likely producing a double announcement; not verified with AT.'},
  {kind:'source-risk',description:'refresh() does not prune selectedKeys; if a refresh returns fewer records, the visible "N records selected" can count ids no longer shown. The hook documentation says to reconcile deleted identities in the app; the app does not.'},
  {kind:'source-limitation',description:'Sort state is shown only as header text "Project name (A to Z)"; no aria-sort on the column header. Sort is local and does not refetch, which is appropriate.'},
  {kind:'source-limitation',description:'Two polite live regions (selection-summary aria-live and WorkflowStatus) may interleave announcements.'},
  {kind:'source-limitation',description:'The shipped pattern check could not run in the consumer install (generation.jsonl line 22, missing playwright-core); the client continued with build and doctor only.'},
  {kind:'source-limitation',description:ASSESSOR_NOTE_METRIC},
  {kind:'source-limitation',description:ASSESSOR_NOTE_FOLLOWUP}
 ],
 evidence:[
  ['final-src/main.tsx',16,28,'useAsyncCollection with clear-on-query selection, trimmed isFiltered, custom messages.'],
  ['final-src/main.tsx',31,35,'Follow-up local sort over hook items by name.'],
  ['final-src/main.tsx',52,56,'Always-visible selected count in its own polite live region (follow-up).'],
  ['final-src/main.tsx',60,62,'Query set on every keystroke without debounce.'],
  ['final-src/main.tsx',74,77,'Visually hidden WorkflowStatus; failure Alert with generic title and no staleness wording.'],
  ['final-src/main.tsx',78,82,'Empty and no-results EmptyState; no-results also uses announce.'],
  ['final-src/main.tsx',84,96,'Table renders whenever items exist, including in failed phase; header text carries sort, no aria-sort; Altitude Checkbox per row.'],
  ['initial-src/main.tsx',46,49,'Initial selection summary only when selection > 0.']
 ],
 keyboardLimitations:['No manual keyboard or AT testing performed.','The assessor toggled the Altitude Checkbox with Space because its aria-hidden visual track intercepts synthetic pointer clicks; whether a real mouse click on the track toggles selection was not verified.','No focus management after Clear search (reset), Try again, or when the table is replaced by EmptyState.','Focus retention in the search input during per-keystroke reloads appears preserved by source structure but was not tested.'],
 screenshot:['320px RTL forced colours, final state with query "Beacon". No horizontal overflow; controls stack to a single column.','"0 records selected" shown: selection cleared by the query change, consistent with clear-on-query.','Header reads "Project name (A to Z)"; Sort by name Select full width; checkbox column mirrored to inline end.','Panel border visible in forced colours (app forced-colors rule); no visible result count because it is in a visually hidden status region.']
});
