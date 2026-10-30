<!--
title: DiffView: accept or reject each change
label: enhancement
template: .github/ISSUE_TEMPLATE/feature-request.md
-->

## Component

`DiffView`.

## What you're trying to do

An agent changes a file (or a document, or a config) and the person reviews the change before it's kept: accept this hunk, reject that one, accept the rest. Cursor, Copilot Edits and Claude Code's IDE integrations all work this way, and an app embedding an editing agent needs it for documents too. `DiffView` shows both versions as the record but can't hold a decision per change.

## Today

`DiffView` renders text or field diffs from `before`/`after` or precomputed `hunks`; additions are `positive-soft` with `+` and "Added", removals `critical-soft`, struck, with `−` and "Removed" (`project/components/src/diff-view.tsx#L55`, the "A change between versions" row in `Elevation.md`). It's read only.

## Proposal

```tsx
<DiffView before={original} after={proposed} caption="src/pricing.ts"
  review decisions={decisions} onDecide={(hunkId, decision /* 'accept' | 'reject' */) => decide(hunkId, decision)}
  onDecideAll={(decision) => decideAll(decision)} />
```

- With `review`, each hunk gets Accept and Reject; the header gets Accept all, Reject all and a count ("3 of 7 changes reviewed").
- `decisions` is controlled by the application, which owns applying them.
- `n` / `p` (or ] and [) move between undecided changes.

**Additive?** yes

## Elevation impact

This follows `PropertyList proposed` (#155): "a field with a proposed value is raised, the current value struck beside the proposed one; nothing is saved until it's accepted". A hunk awaiting a decision is proposed, so it's raised; once decided it's the record again.

| Part / state | Tier | Level | Surface · shadow | Non-height cue |
|---|---|---|---|---|
| Hunk awaiting a decision | Raised | 1 | `surface-raised` · `elev-1` around the hunk | "Proposed change", `+`/`−` and words as today |
| Its Accept / Reject | Ground → +1 on hover | 0 | ghost `Button`s | "Accept change 3", "Reject change 3" |
| Accepted | Ground | 0 | flush; one afterglow (`dur-settle`) | "Accepted" |
| Rejected | Ground | 0 | flush, muted, collapsed to one line | "Rejected · show" |
| Unchanged context | Ground | 0 | as today | — |

## Motion and accessibility

Deciding lowers the hunk from 1 to 0 over `dur-travel-1` (`ease-sink`) and settles; a rejected hunk collapses after `dur-linger`. Under reduced motion it changes in place. Each hunk is a labelled `group` ("Change 3 of 7, lines 40 to 52"); decisions are announced ("Change 3 accepted. 4 left."). Forced colours: a raised hunk has a 1px border.

## Done when

- [ ] Behaviour implemented without changing existing behaviour
- [ ] `index.d.ts`, the component's README and its `build/previews.txt` section updated
- [ ] `Elevation.md` / `Motion.md` updated if a signal or choreography changed
- [ ] `tsc` clean; `shoot.mjs` clean in all four schemes; interaction checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed

## Alternatives considered (optional)

Reviewing whole files only (an `Accordion` per file with Accept/Reject). Simpler, and worth documenting as the composition for many files, but it forces all-or-nothing on a file that's mostly right.

Part of the agent harness research pass (`docs/research/agent-harness/`); related to #155 and #174.
