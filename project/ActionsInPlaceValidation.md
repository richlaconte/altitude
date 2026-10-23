# Actions in place validation

Engineering implementation and available automated/browser verification are complete on `codex/actions-in-place`, based on `a7bd408f97c874c517b9139aa8a35b88b685cff0`. Human validation remains open. This record does not claim comprehensive accessibility conformance, participant findings, or a measured speed benefit.

The accepted [specification](../docs/actions-in-place/specification/README.md), [backlog](../docs/actions-in-place/backlog.csv), [progress record](../docs/actions-in-place/PROGRESS.md), and [human protocol with blank evidence template](../docs/actions-in-place/HUMAN-VALIDATION.md) separate implementation from validation. The specification snapshot is immutable; its original unchecked boxes are not the execution tracker.

## Reproduce and inspect

Follow [the build loop](../build/SETUP.md). Start Storybook with `npm run storybook` and open:

- [D1: InlineEdit and dialog comparison](http://localhost:6006/?path=/story/inputs-inlineedit--preview).
- [D2: default and stationary Dialog](http://localhost:6006/?path=/story/overlays-dialog--preview).
- [D3: act and recover](http://localhost:6006/?path=/story/patterns-actionsinplace--preview); use **Open complete Files example** for D4. Both views run the same source and service.

The canonical source is [build/previews.txt](../build/previews.txt). The copyable [recipe](ActionsInPlace.md) is synchronized from that source during both preview and Storybook generation. Fixtures use fictional versioned records and never access real files or a remote service.

CI retains exact commands, exit codes, logs, screenshots and open human gates under `build/test/alt-05/`, uploaded even on failure as **actions-in-place-evidence**. Local evidence uses the same paths. `results.json` and `report.md` are generated evidence, not committed claims of hosted CI execution. This branch has been verified locally; hosted CI awaits a future pull request.

## Engineering verification

Final results are recorded in the evidence artifact. The check names below map directly to the source checks; unexpected browser errors and warnings fail the suites.

| Check | Result |
|---|---|
| Build-kit React 18 and root React 19 type checks | Passed |
| Package ESM/CommonJS/IIFE and generated declarations | Passed; ESM/CommonJS/IIFE exports and both declaration surfaces verified |
| Storybook and landing page builds | Passed; generated routes and D1/D2/D3/D4 interactions verified in-browser |
| All 45 preview sections × four schemes at 960 CSS px | 180 renders, no browser errors/warnings |
| Existing approach/lamps, Field, Avatar regressions | 37 / 16 / 24 assertions passed |
| InlineEdit: React 18 / React 19 / React 19 development StrictMode | 157 / 157 / 157 assertions passed |
| Modal lifecycle: both runtimes and StrictMode | 123 / 162 / 162 assertions passed (React 18 / React 19 / StrictMode) |
| Recipes: React 18 / React 19 | 106 / 141 assertions passed, including final keyboard-focus and review regressions |
| Generated project source sync | Final staged/committed regeneration check recorded in `source-sync.log` |

Different assertion totals include extra React 19 runtime identity checks per scene; the behavior cases are shared. The D4 visual matrix passed **32/32** combinations and the D3 recovery captures **4/4** themes, with 44 screenshots and no browser warnings/errors. That independent matrix used headless Chrome **155.0.8059.86**, React **19.3.0**, DPR 2; its exact conditions and inspected images are in `D4-visual-matrix.json`. The final affected preview render covered 24 desktop scenes, 12 narrow scenes and three forced-color scenes without browser errors/warnings.

Runtime checks use Playwright Chromium **130.0.6723.31**, React **18.3.1** in build previews and **19.3.0** in source fixtures. Development fixtures wrap the same canonical scenes in StrictMode. Headless screenshots use DPR 2; DPR is not browser zoom.

Native Chrome **155.0.8059.80** on macOS was inspected at actual **200% browser zoom**, with a 1728×1028 logical outer window, **864×470 effective CSS viewport**, and DPR 4. D1 task and table editing, D2 both presentations, D3 archive/Undo/durable Restore, and D4 rename/recovery/confirmation were exercised using the native UI. Cancel and post-delete heading destinations were observed. Screenshots use `*-native-200-percent*.png`. This is an engineering browser inspection, not a human magnification or screen-reader session.

The 320 CSS pixel checks use touch emulation (`tap` for controls, simulated text entry) and keyboard paths. Physical on-screen keyboards and real IME composition remain operator checks. Synthetic composing/keyCode229 events verify that Enter/Escape do not accidentally commit or dismiss.

## Acceptance coverage

“Covered” below means source, automated behavior and/or recorded visual evidence exists. It does not close the separate human validation gates. The owning checks use the criterion IDs in assertion names.

| Criterion | Engineering evidence and remaining gate |
|---|---|
| MOD-01 | Default library consumer compared with baseline in all four schemes: identical screenshots and computed values in `baseline/comparison.json`; provider `recede=false` asserted. |
| MOD-02 | `modal-lifecycle.mjs`: stationary transform/filter/geometry, every participating scrim's blur, dimming, level and isolation. |
| MOD-03 | Field/title/Cancel/panel-only, removed focus targets, forward/reverse Tab and composing Escape. |
| MOD-04 | Existing/removed invoker, lazy fallback, externally placed focus and subsequent owner. |
| MOD-05 | Nested providers, original inert state, dynamically added background, toast action isolation and paused expiry. |
| MOD-06 | Exit retention, rapid reopen, unmount, StrictMode, Sheet handoff; review regression adds retained-root reactivation. |
| MOD-07 | Palette shortcut suppression, explicit handoff, rejected controlled request/reset, document-scoped ownership and iframe shortcut. |
| MOD-08 | Nonmodal Sheet interaction/scrolling, absence of scrim/trap, close focus with later modal. |
| MOD-09 | Canonical D2 exact-target deletion, Cancel/heading focus, failure/unmount fixture, identical presentation comparison; native 200% screenshots. |
| IE-01 | `inline-edit.mjs`: both independent D1 consumers, explicit Edit/Save/Cancel, no-change and outside interaction; no blur write. |
| IE-02 | Empty/space drafts, sync/async validation, preserved invalid/rejected text and zero invalid dispatch. |
| IE-03 | Cancelled validation, synchronous duplicate guard, repeated submissions and one write. |
| IE-04 | Canonical publication once, errors/malformed results, idempotent uncertain rename; D4 adapter reconciliation. |
| IE-05 | External updates before/during save, observed-value latching including reversion, explicit current-value recovery. |
| IE-06 | Unmount/stale completion suppresses callbacks, announcements and focus; application owns later reconciliation. |
| IE-07 | Enter/Escape, parent forms, IME simulation, pending save, disabled transition and focus/no-stealing checks. |
| IE-08 | D1 four schemes × two widths × four accessibility modes (32 captures); D4 visual matrix and native 200%. Physical keyboard/magnification gate remains open. |
| IE-09 | Both type checks, runtime suites, generated declarations/package/Storybook and source sync; see final result table. |
| REC-01 | `actions-in-place.mjs`: immediate archive, usable search/independent records, no modal and no early Undo. |
| REC-02 | Confirmed versioned inverse restores stable list position without changing unrelated fields/records. |
| REC-03 | Durable Archived/Restore after replacement/dismissal; native zoom route inspected. |
| REC-04 | Per-record synchronous guard and service operation-ID deduplication. |
| REC-05 | Archive/restore rejection, targeted rollback and retry; older failure remains visible alongside newer recovery. |
| REC-06 | Interrupted archive/restore/rename/delete reconciles the same operation ID without false rollback/duplicate. |
| REC-07 | Changed/deleted Undo rejected; known newer state immediately invalidates the control; late receipt cannot re-advertise it. |
| REC-08 | Independent out-of-order writes retain authoritative revisions and newer feedback. |
| REC-09 | Persistent labelled keyboard/tap action, focus/no-stealing, modal background inert; real touch/AT testing remains open. |
| REC-10 | Delayed A dismissal cannot remove B; recovery destination persists after dismissal/replacement. |
| REC-11 | D3/D4 share one source/service, all five named fixtures, reset/counters outside the product. |
| REC-12 | Alert/Toaster guidance, generated source equality and CI wiring. |
| CON-01 | D2/D4 exact accessible name/description, consequence and initial Cancel asserted. Actual screen-reader announcement order remains open. |
| CON-02 | Open/Cancel/Escape before dispatch produce zero mutations. |
| CON-03 | One mutation for captured ID/revision; similar-name neighbor is unchanged. |
| CON-04 | Retained modal isolation, focus containment and stationary geometry in modal suite. |
| CON-05 | Pending Close/Escape leaves the application write running; background results are contextual and do not steal focus. |
| CON-06 | Known failure retains context/retry; uncertainty resolves before any fresh operation. |
| CON-07 | Changed/deleted target invalidates old intent and requires fresh confirmation. |
| CON-08 | Targeted removal, removed-invoker heading repair, moved focus preserved; A completion cannot alter later B. |
| CON-09 | D2/D4 narrow/mode captures and actual 200% browser inspection; physical access checks remain open. |
| CON-10 | Full runnable recipe, pending/failure fixtures, generated previews and owning CI checks; no ConfirmAction export. |
| DEM-01 | D1 title + independent table cell and harness-only dialog baseline share validation/save adapter/fixtures. |
| DEM-02 | D2 sequential presentation toggle with the same records, target, semantics and reset. |
| DEM-03 | D3 immediate archive, confirmed raised Alert Undo, persistent Archived route and real fixture inverse. |
| DEM-04 | D4 uses shared InlineEdit/Dialog with ordinary Files/Archived actions; only archived files can be permanently deleted. |
| DEM-05 | Immutable fictional IDs and five required deterministic timing/failure/conflict/interruption fixtures; accepted-operation logs. |
| DEM-06 | Three canonical preview cards, four experiences, guide links, generated artifacts, checks and evidence upload. |
| DEM-07 | Engineering builds, runtime regressions, layouts, modes and native browser zoom; final source-sync result recorded above. |
| DEM-08 | Keyboard and emulated tap routes covered; real VoiceOver/Safari, Windows reader, physical touch keyboard, IME and magnification still open. |
| DEM-09 | **Open:** six to eight counterbalanced formative sessions, observations, blocker remediation/retest and accept/revise decision. No sessions invented. |
| DEM-10 | **Deferred:** EditRegion, ConfirmAction and generic action framework. No discovery gate has been met; no new framework exported. |

## Review corrections and decisions

Independent review reproduced application reconciliation after editor unmount, stale Undo after a known revision, and a retained modal root left invisibly open after handoff/reopening. Each has a focused regression. Additional checks cover older failure behind newer recovery, late uncertain receipt, same pending D2 target reopening, and iframe modal ownership. Native browser review also prompted an explicit D4 keyboard rename focus regression.

The pinned Playwright 1.48.2 does not forward `prefers-contrast` emulation. Increased-contrast checks therefore set the public provider mode and assert its computed style; reduced motion and forced colors use supported media emulation. Ordinary Restore/Delete completion updates a persistent quiet live status node, while the persistent Alert remains reserved for pending, failure or actionable recovery.

Routine resolutions preserve the specified experience: D3/D4 use one hash-selected scene; their copyable guide is generated from canonical source. Existing `useAltitude().pushLayer()` remains a deprecated visual vote for source consumers; document ownership is private. All generated preview wrappers now include a viewport meta tag so 320 CSS pixel checks reflect actual mobile sizing, and a data favicon to avoid irrelevant local-server 404 noise. No tokens, dependencies, public action framework or version number were changed.

## Outstanding human gates

No formative participant sessions have been conducted. The required six to eight counterbalanced sessions and final accept/revise decision remain open. No speed, preference or comprehension improvement is claimed.

Real VoiceOver/Safari and Windows screen-reader task checks remain open. Automated DOM/focus/ARIA assertions are engineering coverage only. Physical touch keyboard coverage, real IME, and human magnification testing require an operator. [The prepared protocol](../docs/actions-in-place/HUMAN-VALIDATION.md) names tasks, environments, observations and repeat criteria. Finish those gates before claiming the entire specification is validated.
