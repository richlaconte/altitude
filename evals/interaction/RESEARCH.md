# Recognition and change comprehension: research and design

Issue [#618](https://github.com/richlaconte/altitude/issues/618), 7 November 2026. Repository baseline: `4378c0c8533ec771ccc3322fa1d7aca6c339c951`. Owner: Altitude maintainers. Status: protocol development; participant evaluation unrun.

## The measurement gap

The existing studies answer different questions. First impression assesses brief visual judgments; distinctiveness describes appearance and layout distance; adherence measures source/API use; the framework pilot observes generated applications and service outcomes. None establishes whether a person identifies the right object, understands a changed state, or wants that interaction. Keep their measures and raw evidence intact. This work extends #322, #326, #383, #399 and #419 rather than combining them into one score.

The November 6–7 assessments, as summarized in #618, motivate specific safeguards: a broken motion demo must be excluded; a 1/5 winner remains disliked; a 2/5 long-detail choice remains unresolved; indistinguishable Undo alternatives provide no comparative preference evidence; a successful regrouping with a request for explanatory motion remains a design question. These are issue-reported observations, not newly inspected raw participant records. Do not invent participant IDs, quotations, timing, counts or missing ratings for them.

## Primary sources and their limits

| Source | What it supports | Consequence here and limits |
| --- | --- | --- |
| [NIST: Usability testing](https://www.nist.gov/programs-projects/usability-testing) | Representative tasks can be assessed through effectiveness, efficiency and satisfaction; task outcomes and subjective responses are different observations. | Store outcome, comprehension response and rating separately. This is a scoped formative protocol, not an ISO conformance assessment. |
| [NIST: Common Industry Format](https://www.nist.gov/itl/iad/human-centered-technologies/what-cif) | Reports need participant/context, apparatus, study design, performance and satisfaction information. CIF concerns reporting and does not prescribe an experiment. | Require versions, task, mode, order, health, judgments and limitations. Borrow reporting discipline; do not claim CIF compliance or that its archived page defines current certification requirements. |
| [Heer and Robertson, 2007](https://idl.uw.edu/papers/animated-transitions) | Controlled studies of statistical graphics found benefits for some animated transitions. | Test identity and change comprehension rather than reward animation presence. Results about charts do not establish a preferred animation for editable product records. |
| [Rensink, O'Regan and Clark, 1997](https://www2.psych.ubc.ca/~rensink/publications/download/PsychSci97-RR.pdf) | Their interrupted-scene experiments demonstrate that visible scene changes can be missed and that attention matters. | An endpoint screenshot cannot establish that a transition was noticed. The transfer from photographic scene experiments to this application is a hypothesis, not a validated effect size. |
| [W3C: Involving users in evaluating accessibility](https://www.w3.org/WAI/test-evaluate/involving-users/) | User involvement complements standards review; narrow samples must not be generalized to all disabled users. | Separate engineering, model, maintainer and participant records; retain interaction/AT context and unrun coverage. A successful automated check proves neither accessibility nor comprehension. |
| [W3C: Animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) | The Level AAA criterion allows nonessential interaction motion to be disabled; the explanation discusses motion sensitivity. | Validate reduced-motion stimuli independently, with persistent names, state and focus. Do not require a person with motion sensitivity to try normal motion for experimental balance. |

Sources accessed 7 November 2026. Research supports the measurement distinctions; the chosen tasks, five-point anchors and validity categories below are local operational decisions.

## Alternatives considered

1. **Extend the static first-impression benchmark.** Low setup cost, but screenshots cannot expose pending/failure transitions, keyboard continuity or movement. Reject for these outcomes; leave that benchmark intact.
2. **Build an isolated pairwise preference sandbox.** Easy to control appearance, but risks reproducing the broken-stimulus problem and drops persistence, identity and focus behavior from complete workflows. Useful later for one clearly isolated question, not this initial pilot.
3. **Use existing complete examples and an explicit evidence contract (chosen).** The planning board already has a versioned simulated service, seeded records, failure modes, local InlineEdit recovery, keyboard movement and continued editing. This reduces parallel implementations and allows real observations within the simulation. It still does not demonstrate real-server durability or human effectiveness.

Use two journeys in the same complete app: rename `c3` (Invoice PDF redesign), fail once, retry successfully; move `c1` (Annual billing toggle) from Sprint 24 to In progress, find it and reopen its title editor. Changing a board column is the record's status change. Keep the seed and service outcomes identical across presentation variants. Normal and reduced motion are separate interaction contexts; they are not a forced preference comparison.

## Design decisions

- Freeze protocol, actual built HTML digest, source commit, dirty-state indicator, variant definitions, environment and displayed order before collecting participant answers. The smoke pilot records one baseline implementation in two motion modes; it does not invent a candidate condition.
- Before a comparative study, supply a candidate artifact with exactly one named presentation difference and a documented equivalence check of content, actions, outcomes and timing. Unspecified or indistinguishable alternatives cannot yield a preference conclusion.
- Observe identification, pending/failed/confirmed distinctions, movement destination and continued action independently. Ask neutral comprehension questions after the attempt and capture the response before coding it. Do not coach during a scored task; record help separately.
- Ask for an absolute rating after each variant, then comparative choice after both. Allow neither, no preference, indistinguishable and not assessed. Keep reasons, negative evidence and uncertainty even when a variant is selected.
- Format validation catches malformed/misclassified evidence, not unfavorable results. No score, approval classifier, human-success CI gate or synthesis of personal taste into universal rules.
- Stimulus health checks inspect actual DOM state, simulated service records and animation frames. A transition with no observable normal-motion frames is invalid for a motion comparison even if the final record moved. Reduced motion requires a stable identifiable endpoint, not travel.
- Raw records are append-only by run directory. Corrections make a new record referencing the old one. The runner refuses to replace an existing evidence file.

## Implementation plan

- [x] Add `PROTOCOL.md` with frozen tasks, controls, validity rules, observation/questions, accessibility accommodations and interpretation boundaries.
- [x] Write failing report-format tests for broken stimuli, a low-rated winner, indistinguishable alternatives and low satisfaction after success; add malformed/provenance cases.
- [x] Implement `report.mjs` to validate and render the evidence contract without converting relative choices or engineering outcomes into approval.
- [x] Implement `smoke.mjs` against the existing planning-board app, preserving its fixtures; capture normal/reduced motion, service outcomes, record identity, local feedback and focus.
- [x] Run the engineering pilot, preserve its versioned result and document its limits. Participant testing and AT review remain unrun.
- [x] Link from manual validation and relevant eval/example READMEs; run format tests in the deterministic framework suite. No package/runtime changes or version bump are required.
- [x] Review scope, evidence claims and generated report integrity; open the PR for review after checks pass. Cross-review findings were fixed; PR CI governs readiness.
