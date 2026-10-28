// Record of the independent AI reviews written for the 2026-10-23 pilot (codex-settings-framework, claude-settings-framework, claude-settings-guidance). Rerunning rewrites each review.json
// with a new reviewedAt and the current assessment metrics, and drops later addenda such as assessmentUpdates.
const {review}=require('./review-lib.cjs');
const reviewer='Independent reviewer subagent (claude-opus-5-5); source, trace and rendered screenshot review';
const assessorNotes=[
 'accessibilityDefects is true for runs whose every scanned state reports zero axe violations, and null here only because the saved-state scan could not stabilise; the value therefore appears to mean "no executed defects", which the field name does not convey. Confirm the semantics before aggregating.',
 'Every executed write sends description "" (seed value); the follow-up feature (editing, persisting and showing a description) is not exercised, so followupRegressions:true only covers the original name/email flows.',
];

review('codex-settings-framework',{
 reviewer,
 guidanceDiscovery:{applicable:true,observed:true,evidence:[
  {path:'generation.jsonl',line:5,operation:'Read installed node_modules/altitude-design/dist/guidance/README.md (exit 0, intent table returned).'},
  {path:'generation.jsonl',line:7,operation:'Ran `npm exec -- altitude patterns "edit workspace settings" --json`, then read dist/guidance/patterns/edit-record.md and principles.md; output contains the full Edit record pattern including requestLeave and focus-restoration guidance.'},
  {path:'generation.jsonl',line:9,operation:'Read dist/types/index.d.ts, patterns/edit-record.json metadata and component declarations.'},
  {path:'generation.jsonl',line:12,operation:'Searched declarations and the reference fixture for requestLeave and component props.'},
  {path:'followup.jsonl',line:7,operation:'Follow-up re-ran `altitude patterns "edit workspace settings description" --json` and re-read edit-record.md before editing.'}],
  inference:'Guidance and CLI access are demonstrated by executed commands with returned content; the final message (generation.jsonl line 22) is not used as evidence.'},
 patternSelection:{observed:'Edit record pattern selected via CLI; implemented with useEditRecord (submit validation), ErrorSummary and WorkflowStatus from the framework runtime. Overview/settings switch is plain component state.',runtimeHooks:['useEditRecord','ErrorSummary','WorkflowStatus'],appropriateFamily:true},
 states:{sourcePresent:['load pending (skeleton, aria-busy)','load failure with retry','pristine/editing','submit-time validation with focused linked summary (revalidation on correction is provided by the hook)','save pending (inputs and both buttons disabled)','failed save with retained draft and retry','saved status after acknowledged write','dirty Cancel via requestLeave + window.confirm','beforeunload when dirty','description field and overview display with empty-state text (follow-up)'],
  sourceOmitted:['focus placement after view swap (Edit settings / Cancel unmount the focused button)','browser Back routed through requestLeave (no history integration; only beforeunload)','return to overview after successful save (stays on settings; not required by the brief)'],
  sourceRisks:['raw service/parse error text is shown verbatim in failure alerts'],
  notExecuted:['invalid submission','dirty Cancel accept/refuse','description persistence and overview display','saved-state axe scan (unstable animation)','full keyboard/AT']},
 contentAccuracy:{observed:'"Workspace settings saved." is published by useEditRecord only after saveWorkspace resolves and the adapter returns ok. Failure alert names the operation and truthfully says changes are retained. Unsupported claims: "These details are visible to everyone in this workspace." and the email hint "Used for important account and workspace updates." are not backed by the API contract. Failure body interpolates Error.message from api.ts (server body.error, "Request failed", or a JSON parse error), which may be technical.',passed:null},
 complexity:{judgment:'Compact (124-line main.tsx, 28-line CSS). The runtime hook carries the state machine; app code is mostly composition. No additional dependencies. Follow-up was a small, well-scoped diff.',rating:null},
 findings:[
  {kind:'source-omission',description:'No focus management on view changes. Clicking "Edit settings" or a successful Cancel unmounts the focused button and nothing receives focus (falls to body). The installed edit-record guidance read in generation.jsonl line 7 says to restore focus logically after leaving.'},
  {kind:'source-limitation',description:'Overview/settings is component state with no history entry, so requestLeave is wired only to Cancel. Browser Back leaves the app entirely; dirty drafts are then protected only by beforeunload, which the guidance notes is unreliable. Acceptable for a single-page demo, but "back" is not an explicit discard decision.'},
  {kind:'source-limitation',description:'Discard decision uses native window.confirm. It is a real decision, but unstyled, unlocalisable title, and blocked or auto-dismissed in some embedded contexts. Not executed by the assessor.'},
  {kind:'source-risk',description:'Failure and load-error copy interpolate the raw Error.message. api.ts calls response.json() before checking response.ok, so a non-JSON error response would surface a SyntaxError message (suspected; not executed).'},
  {kind:'source-limitation',description:'Pending protection relies on disabling inputs and buttons. EVAL-STALE and EVAL-PENDING-RESUBMIT pass because edits are impossible while pending, not because newer-edit handling was exercised; the newerEdits message is effectively unreachable. This is an allowed design but means stale-response safety is untested for this run.'},
  {kind:'source-defect',description:'Unsupported copy: "These details are visible to everyone in this workspace." and the email hint assert visibility/usage the API does not define.'},
  {kind:'source-limitation',description:'Assessor note: saved-state axe scan is null ("Finite animations did not settle within 3 seconds"), likely from the Card settle prop on save; accessibilityDefects is therefore null for this run while the Claude runs report true. '+assessorNotes[0]},
  {kind:'source-limitation',description:'Assessor note: '+assessorNotes[1]}],
 evidence:[
  ['final-src/main.tsx',17,41,'useEditRecord with submit validation; save adapter awaits saveWorkspace, lifts the canonical value via onSaved, and maps exceptions to {ok:false,error:Error.message}.'],
  ['final-src/main.tsx',43,55,'beforeunload when dirty; Cancel routed through requestLeave with window.confirm as the discard decision.'],
  ['final-src/main.tsx',65,69,'Card pending/failed status and settle on saved (suspected cause of the unstable saved-state scan); unsupported visibility copy; ErrorSummary focused only on invalid submits.'],
  ['final-src/main.tsx',70,79,'Inputs disabled while submitting; description textarea added in follow-up; failure alert retains draft and interpolates raw error text.'],
  ['final-src/main.tsx',81,87,'Both buttons disabled while pending; WorkflowStatus outside the card carries status text.'],
  ['final-src/main.tsx',99,99,'Overview shows saved description or "No description provided."'],
  ['final-src/main.tsx',107,122,'App switches views via state only: no history entry, no focus placement after the swap.'],
  ['final-src/api.ts',2,2,'response.json() is parsed before response.ok is checked; error text comes from body.error or a parse exception.'],
  ['initial-src/main.tsx',29,29,'Initial save spread the loaded record, so description was already round-tripped unchanged before the follow-up.']],
 keyboardLimitations:['No manual keyboard or AT testing performed; no conformance claim.','Source shows no programmatic focus target after Edit settings / Cancel view swaps; native confirm() keyboard behaviour depends on the browser.','ErrorSummary focus on invalid submit is source-observed only; invalid submission was not executed.'],
 screenshot:['320px RTL forced-colours: settings form (after the pending scenario, name "Pending workspace") fits the viewport; Save/Cancel stack full-width.','Description textarea renders with a dashed border unlike the solid single-line inputs; no character counter (no maxLength).','Status "Workspace settings saved." is visible below the card. Sentence-final periods appear at the line start, as expected for LTR English text forced into RTL.','Screenshot shows only the settings view; overview reflow at 320px is covered only by EVAL-REFLOW.']
});

review('claude-settings-framework',{
 reviewer,
 guidanceDiscovery:{applicable:true,observed:true,evidence:[
  {path:'generation.jsonl',line:2,operation:'Bash: cat package.json, README.md, src/* and node_modules/altitude-design/dist/guidance/README.md (result line 4).'},
  {path:'generation.jsonl',line:5,operation:'Bash in node_modules/altitude-design/dist: cat guidance/patterns/edit-record.md and the reference source guidance/references/.../pattern-edit-record.tsx (result line 6, ~15 KB returned).'},
  {path:'generation.jsonl',line:10,operation:'Read types/index.d.ts, controls.d.ts, overlays.d.ts, empty.d.ts and grepped the workflow fixture for requestLeave/confirmDiscard/Dialog.'},
  {path:'generation.jsonl',line:15,operation:'Read Dialog declarations and fixture excerpts; listed guidance/references/build/checks.'},
  {path:'generation.jsonl',line:29,operation:'Attempted `altitude patterns "edit settings"` and `altitude explain ALT-EDIT-003`; denied by the permission system (lines 30-31, 35-37). The CLI was therefore never successfully used.'},
  {path:'followup.jsonl',line:2,operation:'Follow-up re-read guidance/README.md and (line 5) edit-record.md; an `altitude --help` attempt was also permission-denied (lines 72-74).'}],
  inference:'Installed guidance docs and the reference implementation were read; CLI discovery was blocked by the Claude sandbox permission policy, a protocol confound for the framework/guidance comparison rather than a client failure.'},
 patternSelection:{observed:'Edit record via useEditRecord (submit validation, custom save adapter), ErrorSummary, WorkflowStatus, and an Altitude Dialog wrapped as an async confirmDiscard. Hash-based history with a popstate guard routes browser Back through requestLeave.',runtimeHooks:['useEditRecord','ErrorSummary','WorkflowStatus'],appropriateFamily:true},
 states:{sourcePresent:['load pending (skeleton + status text)','load failure with retry and Cancel','submit-time validation with linked summary (hook revalidates on correction)','save pending with in-flight guard; inputs stay editable','newer edits during pending preserved (hook)','failed save with retained draft','saved status after acknowledged write','dirty Cancel and browser Back via Dialog decision','leave blocked while pending with explanatory status','beforeunload when dirty or pending','arrival focus on view headings','description field with 160-char limit (follow-up)'],
  sourceOmitted:['explicit "No description" empty state on overview (description simply absent)'],
  sourceRisks:['Save button remains enabled-looking during pending after an edit (assessor: saveEnabledAfterEdit true); clicks are ignored silently','raw Error.message in failure/load copy'],
  notExecuted:['invalid submission','dirty Cancel/Back accept and refuse','description persistence/overview display','full keyboard/AT']},
 contentAccuracy:{observed:'"Workspace settings saved" is set by the hook only after the adapter resolves ok; with newer edits the hook\'s default newerEdits message is shown instead (observed in screenshot). Failure copy names the operation and says changes are retained. Network TypeError gets a friendly message; other errors interpolate Error.message (server text or parse error). Unsupported: email hint "Where we send notices about this workspace." The 160-character description limit is a client choice the API does not state (the follow-up README note says so).',passed:null},
 complexity:{judgment:'Moderate (226 lines, inline styles). History/popstate guard and Dialog-backed promise add app code beyond the hook, but the logic is coherent. Settings and Overview each fetch the workspace on mount (extra GET per navigation). No added dependencies.',rating:null},
 findings:[
  {kind:'source-limitation',description:'Save button is not disabled during pending (Button loading only); after an edit the assessor saw it enabled (EVAL-PENDING-RESUBMIT saveEnabledAfterEdit:true) but dispatchedWhilePending:0 because useEditRecord blocks resubmission. Activations during pending are silently dropped rather than queued.'},
  {kind:'source-risk',description:'Failure and load copy interpolate raw Error.message; api.ts parses JSON before checking response.ok, so a non-JSON error body would surface a SyntaxError message (suspected; not executed).'},
  {kind:'source-limitation',description:'Textarea uses maxLength={160} and validation also checks >160; the native limit truncates paste silently, so the validation message is effectively unreachable from typed input.'},
  {kind:'source-risk',description:'Browser Back handling re-pushes #settings and awaits the Dialog. Logic appears consistent for single Back presses; repeated Back while the dialog is open adds history entries (suspected minor history clutter; not executed).'},
  {kind:'source-defect',description:'Unsupported copy: contact-email hint "Where we send notices about this workspace." asserts behaviour the API does not define.'},
  {kind:'source-limitation',description:'Protocol: the Claude client could not run the installed altitude CLI (permission denied at generation.jsonl lines 30-31, 36-37), so framework-condition CLI discovery was unavailable to it.'},
  {kind:'source-limitation',description:'Library-level (not app): the Textarea character counter renders "{len} / {maxLength}" without bidi isolation; at RTL it reads "160 / 0" in the screenshot.'},
  {kind:'source-limitation',description:'Assessor note: '+assessorNotes[0]+' '+assessorNotes[1]}],
 evidence:[
  ['final-src/main.tsx',20,22,'Load error copy: friendly for TypeError, otherwise interpolates raw Error.message.'],
  ['final-src/main.tsx',25,37,'Per-view workspace loader with abandoned-request guard; overview shows cached value while refetching.'],
  ['final-src/main.tsx',39,44,'Heading receives focus on arrival.'],
  ['final-src/main.tsx',70,83,'Dialog-backed confirmDiscard; dismiss keeps the draft; unmount resolves false.'],
  ['final-src/main.tsx',88,104,'Validation (submit mode) with description limit; save adapter trims, awaits write and maps failure to a retained-input message.'],
  ['final-src/main.tsx',116,128,'Leave guard blocks while submitting with status text, otherwise delegates to the hook; onSaved fires only on phase "saved"; beforeunload when dirty or pending.'],
  ['final-src/main.tsx',139,159,'ErrorSummary/Alert; inputs not disabled while pending; Save uses loading only; Cancel disabled while submitting; unsupported email hint; maxLength on textarea.'],
  ['final-src/main.tsx',194,219,'pushState on entering settings; popstate re-pushes #settings and routes Back through the guard.'],
  ['initial-src/main.tsx',55,55,'Overview already rendered a saved description in the initial build, before the follow-up.']],
 keyboardLimitations:['No manual keyboard or AT testing performed; no conformance claim.','Heading focus on arrival and Dialog focus handling are source-observed only; dirty Cancel/Back dialogs were not executed.','ErrorSummary focusKey is the raw submitCount (not gated on phase); focus only moves when errors exist, but invalid submission was not executed.'],
 screenshot:['320px RTL forced-colours: settings form fits; name field shows "Newer unsaved edit" retained after the delayed save.','Status reads "The earlier changes were saved. Your newer edits still need saving." (hook default newerEdits message), truthful for the scenario.','Textarea counter renders as "160 / 0" under RTL (library counter lacks bidi isolation), which reads as 160 of 0.','Cancel and Save sit side by side and fit; dashed textarea border distinct from inputs.']
});

review('claude-settings-guidance',{
 reviewer,
 guidanceDiscovery:{applicable:true,observed:true,evidence:[
  {path:'generation.jsonl',line:3,operation:'Bash: cat README.md, package.json, src and node_modules/altitude-design/dist/guidance/README.md (result line 5).'},
  {path:'generation.jsonl',line:6,operation:'Bash: cat dist/guidance/patterns/edit-record.md (result line 8). The returned guidance-condition copy replaces the example with "[Executable example available in the full framework condition.]" but still says "The package exports useEditRecord, ErrorSummary and WorkflowStatus".'},
  {path:'generation.jsonl',line:14,operation:'Grepped dist/index.js for useEditRecord/ErrorSummary/WorkflowStatus (no matches in result line 15) and read edit-record.json.'},
  {path:'generation.jsonl',line:19,operation:'Read ALT-EDIT-*, ALT-STATUS-001 and ALT-VISUAL-001 from guidance/rules.json plus Field/Dialog declarations (result line 20).'},
  {path:'generation.jsonl',line:38,operation:'Inspected Field and Alert implementations in index.js.'},
  {path:'followup.jsonl',line:5,operation:'Follow-up re-read edit-record.md before editing.'}],
  inference:'Guidance docs and rules were read. The altitude CLI was never invoked. The guidance doc claims runtime exports that this condition omits; the client verified their absence and hand-implemented the pattern.'},
 patternSelection:{observed:'Edit record pattern hand-implemented: separate baseline/draft, phase union, synchronous pending ref, stale-response comparison, custom error summary built from Alert, Altitude Dialog for dirty and pending leave, hash history with popstate guard, focus restoration.',runtimeHooks:[],appropriateFamily:true},
 states:{sourcePresent:['load pending (role=status + skeleton)','load failure with retry and Cancel','submit-time validation with focused linked summary','save pending with synchronous ref guard; inputs editable','newer edits during pending preserved','failed save with retained draft and in-alert retry','saved status after acknowledged write','dirty Cancel/Back via Dialog','leave while pending offered with truthful copy','beforeunload when dirty or pending','focus to Edit button / heading after view change','optional description with 200-char validation (follow-up)'],
  sourceOmitted:['revalidation or clearing of visible errors when the person corrects a field','status for "earlier save succeeded, newer edits unsaved" (status becomes empty)'],
  sourceRisks:['leaving during pending lets the overview fetch before the write lands, possibly showing pre-save values'],
  notExecuted:['invalid submission and correction','dirty Cancel/Back accept and refuse','leave-while-pending','description persistence/overview display','full keyboard/AT']},
 contentAccuracy:{observed:'"Workspace settings saved." is shown only when phase is saved after the awaited write and the draft is clean. Failure alert ("Your changes weren\'t saved", raw error text, "Your edits are still here.") is truthful. Pending-leave copy "Leaving won\'t stop the save" is accurate. After a newer edit during pending the earlier successful save is not reported at all. Client-invented limits (name 80, description 200 characters) are presented as rules though the API states none. Email hint "Where people send questions about this workspace." is unsupported.',passed:null},
 complexity:{judgment:'Largest of the three (300 lines). Hand-rolled state machine is careful but duplicates what the framework hook provides, and misses revalidation-on-correction that the hook includes. Inline styles; no added dependencies.',rating:null},
 findings:[
  {kind:'source-defect',description:'Visible errors never update while correcting: update() only changes the draft and resets phase from "saved". errors and phase "invalid" persist, so corrected fields keep their inline error and aria-invalid, and the summary keeps listing them until the next submit. Not executed (invalid path unmeasured).'},
  {kind:'source-omission',description:'When edits are made during a pending save that then succeeds, phase becomes "saved" but status is suppressed because the draft is dirty; nothing tells the person the earlier changes were persisted (screenshot shows no status).'},
  {kind:'source-risk',description:'"Leave anyway" during pending unmounts the form; Overview immediately refetches and may render pre-save values while the PUT is still in flight (suspected race; not executed).'},
  {kind:'source-limitation',description:'Save button stays type=submit with aria-disabled while pending; duplicate activation is blocked by pending.current (EVAL-DUPLICATE 1 dispatch; EVAL-PENDING-RESUBMIT saveEnabledAfterEdit false, 0 dispatched).'},
  {kind:'source-risk',description:'Raw Error.message shown in failure and load alerts; api.ts parses JSON before checking response.ok, so non-JSON errors would show parse text (suspected).'},
  {kind:'source-defect',description:'Unsupported claims: invented 80-character name limit and 200-character description limit, and the email-usage hint, are not backed by the API contract.'},
  {kind:'source-limitation',description:'Guidance-condition edit-record.md (read at generation.jsonl line 6) states the package exports useEditRecord/ErrorSummary/WorkflowStatus although this condition strips them; a guidance/package inconsistency in the protocol, not a client error.'},
  {kind:'source-limitation',description:'Assessor note: '+assessorNotes[0]+' '+assessorNotes[1]}],
 evidence:[
  ['final-src/main.tsx',17,26,'Submit-time validation with client-invented length limits.'],
  ['final-src/main.tsx',123,132,'Summary focus on invalid submit; update() changes draft only and never revalidates or clears visible errors.'],
  ['final-src/main.tsx',134,157,'Synchronous pending ref guard, awaited write, baseline updated after acknowledgement, newer draft preserved; failure retains draft.'],
  ['final-src/main.tsx',160,166,'Leave guard: offers leaving while pending, dirty decision otherwise.'],
  ['final-src/main.tsx',178,179,'Status empty when saved-but-dirty, so the earlier successful save is not reported.'],
  ['final-src/main.tsx',186,205,'Error summary shown only while phase is "invalid"; failure alert with in-form retry.'],
  ['final-src/main.tsx',219,223,'Save uses aria-disabled while pending; status paragraph with role=status.'],
  ['final-src/main.tsx',226,241,'Dialog distinguishes pending and dirty leave with accurate copy.'],
  ['final-src/main.tsx',257,288,'Hash history; popstate re-pushes #settings and routes Back through the guard; focus restored to Edit button or heading.'],
  ['final-src/main.tsx',64,86,'Overview refetches on mount and shows description only when present.'],
  ['initial-src/main.tsx',143,147,'Initial build already spread the baseline into the payload and guarded the newer draft.']],
 keyboardLimitations:['No manual keyboard or AT testing performed; no conformance claim.','Summary focus, Dialog initialFocus="title" and post-navigation focus are source-observed only; dirty-leave and invalid paths were not executed.','Summary is a role=group wrapper with tabindex=-1 around an Alert whose role is overridden to undefined; announcement relies on focus and was not tested with AT.'],
 screenshot:['320px RTL forced-colours: settings form fits; name shows "Newer unsaved edit" retained after the delayed save.','No status text is visible: the earlier acknowledged save is not reported once newer edits exist.','Page h1 "Workspace settings" duplicates the CardTitle directly below it.','Description textarea has a dashed border and no counter; Cancel and Save fit side by side.']
});
