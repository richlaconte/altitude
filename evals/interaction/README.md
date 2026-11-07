# Interaction validation

The [versioned protocol](PROTOCOL.md) joins two complete planning-board journeys to recognition and change-comprehension observations. [Research and design](RESEARCH.md) compare alternatives and separate standards, research and local hypotheses. It complements the existing [framework pilot](../framework/README.md), [first impression](../first-impression/PROTOCOL.md), [distinctiveness](../distinctiveness/README.md) and [adherence](../adherence/README.md) evaluations; it does not change their metrics.

## Reproduce the engineering smoke

From the repository root after `npm ci && npm ci --prefix build`:

```sh
node --test evals/interaction/*.test.mjs
node evals/interaction/smoke.mjs build/test/interaction-my-run
```

Install build's Playwright Chromium (`cd build && npx playwright-core install chromium`) or pass `CHROME=/absolute/path/to/chromium`. The output directory must not exist; reruns use a new name. The runner builds the existing complete app, opens fresh contexts, exercises both journeys in normal and reduced motion, and records source/artifact digests, request outcomes, movement frames, focus, screenshots, JSON and readable records. Network fonts are blocked for repeatable local fallback fonts. Do not run the stimulus browser in a background/suspended environment that suppresses animation frames.

The runner exits nonzero if any stimulus is invalid, while preserving that evidence. This is an engineering diagnostic, not a participant-effectiveness CI gate. The report-format unit tests run in `npm run check:framework`; the browser smoke is explicit. Use an exact clean source checkout for a frozen study, and archive the generated stimulus/artifacts with the evidence. If `source.dirty` is true, preserve the patch and do not describe the commit alone as the tested source.

The committed [pilot record](results/2026-11-07/PILOT.md) states what was run and what remains unmeasured. Participant evaluation, recruitment and screen-reader review are **unrun**.

## Evidence contract

`report.mjs` exports `validateRecord`, `interpretRecord` and `renderRecord`. Render one JSON record without changing it:

```sh
node evals/interaction/report.mjs path/to/record.json
```

Write one immutable record per journey and exposure. After the second variant, create its record with cumulative `order`/`ratings`, the first record in `priorRecordRefs`, and the comparison. `outcome` and `comprehension` always describe `observedVariant`, the last displayed exposure, not an average of variants. Keep every earlier record; corrections get new IDs and a `supersedes` reference with a reason. A pair's final record must not overwrite the earlier outcome.

| Field | Recording rule |
| --- | --- |
| `protocolVersion`, `id`, `recordedAt`, `sessionId` | Exact protocol version, unique record ID, ISO date and pseudonymous session ID. |
| `evidenceType` | `maintainer-preference`, `participant-study`, `engineering`, `model-review` or `synthetic-test`; never relabel one as another. |
| `source` | Current exposure's immutable commit, package version, built `artifactSha256`, dirty flag; add lockfile/runner/React versions as available. |
| `environment` | Browser/version, OS, viewport `[width,height]`, zoom, scheme, input, `normal`/`reduced` motion, AT/version or explicit `null`. |
| `journey`, `task` | `field-edit` or `record-movement`; actual task text. |
| `variants` | Each `{id, description, artifactSha256}` defines the exact built presentation; put source and equivalence details here or in referenced manifests. |
| `order`, `observedVariant`, `priorRecordRefs` | Actual exposure order, current exposure, prior immutable records. An order deviation stays recorded. |
| `stimulus` | `{status, reason, healthRef}`. `valid`, `invalid` or `unverified`; reference exact health evidence. For a comparison this covers **all exposed variants**: any broken stimulus makes it invalid, any unchecked stimulus makes it unverified. Valid is not usable/liked. |
| `outcome` | `{result, observations, assistance}`. `completed`, `partial`, `failed` or `not-attempted`; concrete observations, separate from interpretation. |
| `comprehension` | `{result, response, reason}`. `correct`, `partial`, `incorrect`, `not-assessed`; preserve response or `null`. Engineering/model records must use `not-assessed`, `null`. |
| `ratings` | `[{variant,score}]`; each exposed variant's absolute integer 1–5 or explicit `null` for declined/unmeasured. Engineering/model records use `[]`. |
| `comparison` | `{status, selected, reason}`. `selected`, `neither`, `no-preference`, `indistinguishable`, `misunderstood`, `not-assessed`; `selected` is a variant ID only for `selected`, otherwise `null`. |
| `negativeEvidence`, `uncertainty` | Explicit string arrays, including rejected options, low satisfaction, misunderstanding, unavailable modes and missing information. Empty arrays mean nothing was recorded, not proof of no negatives/uncertainty. |

Add study-specific consent/recruitment reference, relevant participant characteristics, observer, assistance/time details and coding disagreement without identifying people. Unknown fields are preserved by the renderer. Real participant data require the agreed collection/storage plan in the protocol; do not put names or identifying transcripts in public git history.

`interpretRecord` adds conservative cautions and always returns `approval: 'not-inferred'`. `comparisonUsable` only flags valid, understood human comparisons as usable *descriptive evidence*, never as generalizable or positive. A synthetic regression fixture cannot become participant evidence. The four required adverse cases—broken stimulus, 1/5 winner, confused comparison, and success with low satisfaction—are tested alongside provenance and missing-data cases.
