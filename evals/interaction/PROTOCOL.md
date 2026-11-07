# Recognition and change comprehension protocol

Version **1.0.0**, frozen 7 November 2026. Scope: formative interaction validation in existing complete examples. Owner: Altitude maintainers. Changes to tasks, questions, coding or validity rules require a new version and a new run; preserve prior records. [Research and alternatives](RESEARCH.md) explain the decisions. No participant evaluation has been run for this protocol.

## Questions and boundaries

Can a person find the intended record and field, distinguish local input from failed/pending/confirmed state, identify where a record went and why, and continue work on that same record? Separately, how do they rate the experience and what do they prefer or reject?

This is not a composite design-quality score, accessibility certification, vote on mandatory motion or test of whether something looks generated. Engineering checks confirm only the observed application contracts in a simulated service. Model review can inspect stimuli but is never participant evidence. The maintainer's taste record is contextual evidence, separate from a recruited participant sample.

## Freeze before a session

Record the protocol version, immutable source commit, package/React versions, built artifact SHA-256, whether the source tree was dirty and the exact patch/artifact if so. Record date, pseudonymous session ID, evidence type, task text, seed, every variant ID and exact presentation difference, displayed order, viewport/zoom, scheme, OS/browser, input method, motion mode and AT/version when applicable. Missing facts are `null` with an uncertainty note, never guessed.

For a comparison, prepare baseline and candidate artifacts from the same data and service fixture. Name exactly one presentation variable. Check that words, record IDs, available actions, validation, outcomes and latency policy match. Examples of possible future questions are placement of local error feedback or identity cues during regrouping; no such candidate is supplied or claimed effective by this PR. Do not compare two undefined implementations. The engineering pilot exercises the existing baseline in normal and reduced motion as separate contexts, not two preference alternatives.

Assign AB/BA order before a comparative session, alternating the first assignment between sessions. Retain the actual displayed order, including deviations. Reset storage and seed before each variant. Repeating the same task teaches it: record this limitation and describe paired results, without treating repeated trials as independent people. Collect each absolute rating before showing the next variant. If modes or participant accommodations differ, report those strata separately; never require normal motion from someone who prefers reduced motion.

## Two journeys

Both reuse `examples/apps/planning-board`: the existing seed, simulated service, fixtures drawer, keyboard board controls, Sheet and PropertyList's InlineEdit. The drawer is experiment setup, outside the participant's task. Keep it collapsed during an attempt. A facilitator sets the fixture before the attempt; switching it during a task must be recorded. Do not introduce new records just to mimic an assessment screenshot.

| Journey | Setup and participant task | Observations and completion criteria |
| --- | --- | --- |
| Field edit fails then succeeds | Reset. Configure **Fail**, **Only the next request**, applies to `cards.update`. Task: “Rename Invoice PDF redesign to Invoice PDF layout. If it does not save, recover and finish the change.” Record ID `c3`, starting revision 1; the first write fails without changing data, retry succeeds. | Record/field identified; draft retained after rejection; full local error and **Save changes** recovery action reachable (the baseline uses the same label for retry); no false confirmed title before acknowledgement; one rejected and one successful request; confirmed title survives reopening/reload. Record assistance, wrong-target attempts, lost input and uncertainty separately. |
| Status change moves a record | Reset. Succeed mode. Task: “Move Annual billing toggle from Sprint 24 to In progress, then continue editing that same card's title.” Record ID `c1`; In progress starts with two cards and allows the third. Keyboard: focus card → Space → ArrowRight → Space. A pointer user may drag; record their actual method. | Correct record moves to In progress once; identity and destination visible; request acknowledged; person finds/reopens the same record and enters Title editing without changing it. Observe focus continuity and any wrong record or search/backtracking. Motion's existence is a health check, not proof of comprehension. |

Stop at five minutes per journey or the participant's request, without treating the limit as a performance norm. Record completed, partial, failed or not attempted and whether help was provided. Optional elapsed time is descriptive only; think-aloud, accommodation and facilitator interruptions make speed comparisons inappropriate unless a later protocol explicitly controls them.

## Stimulus health before judgments

Run `smoke.mjs` and inspect the screenshots before inviting participants. Record health for the actual artifacts, environment and input method. It must cover:

1. Correct seed and identity before/after; both journeys and service fixture really execute.
2. Visible and semantic pending/failure/confirmed state; local rejected draft/recovery; read-back after success; no console/page errors. The simulation is not a real production backend.
3. Normal-motion movement: sample the same identified card through the transition, with intermediate geometry/transform frames and final destination. A changed endpoint or declared CSS duration alone is insufficient. If no intended motion is seen, mark the motion stimulus invalid and repair/retest before collecting motion preferences.
4. Reduced motion: no animated travel/scale; record name, destination heading, semantic state and a usable focus path persist. Reduced-motion results are separate observations, not failed normal-motion results.
5. Keyboard entry, recovery and continuation; actual AT output requires a human check with the named AT. DOM live-region text is only engineering evidence. Review narrow width/zoom and forced colors for the chosen study context before use; unavailable coverage remains unrun.

`valid` means the intended stimulus was delivered in the tested scope, not that it was usable or liked. `invalid` means broken/incorrect stimulus, wrong data/outcomes or failure to deliver the intended manipulation. `unverified` means health is unknown. Preserve all three; do not code invalid/unverified exposure as negative preference. A valid pair can still be `indistinguishable` or `misunderstood`; that is not a winning implementation.

The smoke runner may find a real defect. Save the failed run, stop dependent collection, and rerun under a new directory after repair. Do not silently change the task or replace inconvenient results.

## Observe first, ask second

Allow the participant to attempt the task without coaching. Record concrete actions and service state separately from their interpretation. After each journey ask:

- “Which item were you working on?”
- Edit: “What happened to your change? What is saved now, and what would you do next?”
- Movement: “Where is the item now? What caused it to move? How would you continue working on it?”
- “How was this experience for this task?” Rate 1–5: **1 very poor, 2 poor, 3 mixed, 4 good, 5 very good**, or decline (`null`). These are local anchors, not a validated scale.
- “What helped or got in the way? What would you change? What are you unsure about?”

Capture the person's response verbatim when consent permits, then code comprehension as `correct`, `partial`, `incorrect` or `not-assessed`, with a reason and uncertainty. Correct requires the right record and current saved state/destination and a valid next action; partial identifies only some of these. Have a second reviewer inspect disputed cases; retain disagreements rather than manufacturing consensus.

After both valid variants, ask: “Which would you choose for this task, if either, and why?” Allow a named variant, neither, no preference, indistinguishable, misunderstood or not assessed. Ask what difference they noticed without first explaining the intended manipulation. Preserve negative comments even after a choice. Never require a forced choice or interpret a selected 1/5 option as approval.

## Evidence and reporting

Use the [report contract and template](README.md). Each record retains source versions, artifact IDs, actual order, task, environment, stimulus health, observed outcome, comprehension response/code, absolute ratings, comparative choice, reasons, negative evidence and uncertainty. Keep invalid/indistinguishable and missing data visible. Do not reconstruct the old assessments as raw records; synthetic format tests are labeled synthetic and are not evidence.

Report each journey and interaction context separately, listing attempted/excluded/unmeasured counts and reasons. For participant sessions, state recruitment, participant characteristics relevant to the task, assistance, order and scope; use pseudonyms and keep identifying data outside the repository. Consent, compensation, recruitment and secure storage require an agreed plan before collection. This PR recruits nobody.

Permitted conclusions include “the engineered fixture retained the draft,” “this participant identified the moved record,” and “the maintainer chose A at 1/5 while disliking both.” They do not entail approval, representative prevalence, accessibility, or a universal design rule. No statistical significance, population comparison or satisfaction average is required by this formative protocol. Human outcomes never gate ordinary CI; deterministic evidence-format regression tests may.
