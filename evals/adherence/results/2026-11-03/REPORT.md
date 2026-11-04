# Adherence comparison, 2026-11-03: 0.2.1 against 0.6.15

The first comparison #419 asks for: what agents receive from published `altitude-design@0.2.1` against the current release, `0.6.15`, both installed from the registry. 0.6.15 adds the installed guidance, the `altitude init` block with its component index (#423) and the `altitude check` instruction (#426), generated examples (#425), and every component added since 0.2.1. 0.2.1 has no CLI, so its builds ran without an init block (`run.json` records `package.init` as unavailable).

- **Builds.** Claude Code 2.1.318 with `claude-opus-5-5`, condition `claude-altitude`, 36 per version: 5 samples of the four [adherence briefs](../../briefs.json) and 2 of the eight distinctiveness briefs (the control). That's 72 builds, all of which finished and built.
- **Evidence.** Each build's `src`, `run.json` (with the resolved version and integrity) and the transcript's final `result.json` are in [builds/](builds). Per-build scores are in `scores-0.2.1.json` and `scores-0.6.15.json`, and the tables below are [tables.md](tables.md), unedited.

```sh
node evals/distinctiveness/generate.mjs --package altitude-design@<0.2.1|0.6.15> --briefs <evals/adherence/briefs.json|evals/distinctiveness/briefs.json> \
  --conditions claude-altitude --out build/test/adherence/<version>/s<n>-<set>     # once per sample
node evals/adherence/score.mjs evals/adherence/results/2026-11-03/builds/0.2.1/* --json > evals/adherence/results/2026-11-03/scores-0.2.1.json
node evals/adherence/score.mjs evals/adherence/results/2026-11-03/builds/0.6.15/* --json > evals/adherence/results/2026-11-03/scores-0.6.15.json
node evals/adherence/compare.mjs 0.2.1=evals/adherence/results/2026-11-03/scores-0.2.1.json 0.6.15=evals/adherence/results/2026-11-03/scores-0.6.15.json \
  --briefs booking-choice,board-refusal,assistant-proposal,usage-quota > evals/adherence/results/2026-11-03/tables.md
```

## Result

Bracketed values are 95% bootstrap intervals over builds (2,000 resamples, seeded). Square brackets are raw counts.

| Condition | Briefs | Builds | Build passed | Altitude identifiers per build | Unknown exports /100 | Unknown props /100 | Builds with any unknown | Hand-rolled per build | Probe hits | Colour literals | Other errors | Reviews |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.2.1 | All | 36 | 36 | 15.7 (13.9–17.6) | 0.00 [0] | 0.00 [0] | 0 | 0.08 (0.00–0.17) | 0 | 3 | 0 | 4 |
| 0.6.15 | All | 36 | 36 | 16.2 (14.7–17.9) | 0.00 [0] | 0.00 [0] | 0 | 0.00 | 0 | 0 | 0 | 0 |
| 0.2.1 | Adherence briefs | 20 | 20 | 13.8 (12.5–15.1) | 0.00 [0] | 0.00 [0] | 0 | 0.00 | 0 | 2 | 0 | 0 |
| 0.6.15 | Adherence briefs | 20 | 20 | 13.5 (12.4–14.6) | 0.00 [0] | 0.00 [0] | 0 | 0.00 | 0 | 0 | 0 | 0 |
| 0.2.1 | Control briefs | 16 | 16 | 18.1 (14.8–21.8) | 0.00 [0] | 0.00 [0] | 0 | 0.19 (0.00–0.38) | 0 | 1 | 0 | 4 |
| 0.6.15 | Control briefs | 16 | 16 | 19.7 (17.3–22.1) | 0.00 [0] | 0.00 [0] | 0 | 0.00 | 0 | 0 | 0 | 0 |

| Condition | Briefs | Cost (total USD) | Cost per build (median USD) | Turns (median) | Wall time (median min) |
|---|---|---|---|---|---|
| 0.2.1 | All | 26.87 | 0.70 | 17 | 2.0 |
| 0.6.15 | All | 34.15 | 0.90 | 23 | 2.4 |
| 0.2.1 | Adherence briefs | 14.58 | 0.75 | 20 | 2.2 |
| 0.6.15 | Adherence briefs | 16.95 | 0.81 | 23 | 2.2 |
| 0.2.1 | Control briefs | 12.29 | 0.64 | 15 | 2.0 |
| 0.6.15 | Control briefs | 17.20 | 0.94 | 25 | 2.8 |

Ratio of means, 0.6.15 over 0.2.1, with a 95% bootstrap interval (4,000 resamples):

| Briefs | Cost | Turns |
|---|---|---|
| All | 1.27 (1.10–1.48) | 1.30 (1.12–1.51) |
| Adherence | 1.16 (1.00–1.37) | 1.21 (1.00–1.44) |
| Control | 1.40 (1.10–1.81) | 1.42 (1.13–1.81) |

Per brief: builds · Altitude identifiers per build · unknown exports + props · hand-rolled · probe hits · other errors · USD per build.

| Brief | 0.2.1 | 0.6.15 |
|---|---|---|
| assistant-proposal | 5 · 12.2 · 0+0 · 0 · 0 · 0 · 0.47 | 5 · 15.2 · 0+0 · 0 · 0 · 0 · 0.81 |
| board-refusal | 5 · 11.4 · 0+0 · 0 · 0 · 0 · 1.04 | 5 · 11.0 · 0+0 · 0 · 0 · 0 · 0.99 |
| booking-choice | 5 · 13.4 · 0+0 · 0 · 0 · 0 · 0.66 | 5 · 14.0 · 0+0 · 0 · 0 · 0 · 0.75 |
| usage-quota | 5 · 18.0 · 0+0 · 0 · 0 · 0 · 0.74 | 5 · 13.6 · 0+0 · 0 · 0 · 0 · 0.84 |
| dashboard-a (control) | 2 · 13.5 · 0+0 · 0 · 0 · 0 · 1.14 | 2 · 12.0 · 0+0 · 0 · 0 · 0 · 0.76 |
| dashboard-b (control) | 2 · 21.0 · 0+0 · 1 · 0 · 0 · 1.34 | 2 · 24.5 · 0+0 · 0 · 0 · 0 · 1.57 |
| record-view-a (control) | 2 · 28.0 · 0+0 · 0 · 0 · 0 · 0.90 | 2 · 23.0 · 0+0 · 0 · 0 · 0 · 1.47 |
| record-view-b (control) | 2 · 28.5 · 0+0 · 0 · 0 · 0 · 0.81 | 2 · 24.0 · 0+0 · 0 · 0 · 0 · 1.22 |
| records-a (control) | 2 · 12.5 · 0+0 · 0 · 0 · 0 · 0.55 | 2 · 16.5 · 0+0 · 0 · 0 · 0 · 0.86 |
| records-b (control) | 2 · 10.0 · 0+0 · 0 · 0 · 0 · 0.54 | 2 · 17.0 · 0+0 · 0 · 0 · 0 · 0.93 |
| settings-a (control) | 2 · 18.0 · 0+0 · 2 · 0 · 0 · 0.44 | 2 · 18.5 · 0+0 · 0 · 0 · 0 · 0.86 |
| settings-b (control) | 2 · 13.0 · 0+0 · 0 · 0 · 0 · 0.43 | 2 · 22.0 · 0+0 · 0 · 0 · 0 · 0.94 |

## What it shows

- **No invented API, in either version, even on the adherence briefs.** Not one of the 72 builds imported a name or passed a prop the package doesn't have. That held for 0.2.1 too, which lacks `Meter`, `ErrorSummary`, `LineChart` and `useEditRecord`. *Checked:* every Altitude name the 0.2.1 builds used appears in 0.2.1's published `dist/types/*.d.ts` (`npm pack altitude-design@0.2.1`). So the scorer judging against today's sources didn't hide anything. With no init block, agents still read the installed types before importing. The unknown-import measure is at the floor even on briefs written to need unseen API, and won't detect a change in guidance.
- **The difference is reach: 0.2.1 builds re-implemented what 0.6.15 ships.** On the adherence briefs (5 builds each):

  | Brief | 0.2.1 | 0.6.15 |
  |---|---|---|
  | usage-quota | `Progress` in 5; a local `function Meter` in 3; the daily chart hand-drawn in SVG in 5 | Altitude `Meter` in 5; `LineChart` in 5; no hand-drawn SVG |
  | booking-choice | a local `function ErrorSummary` in 2; the rest hand-built lists | Altitude `ErrorSummary` in 5 |
  | assistant-proposal | proposals laid out by hand with `Badge` (5) and `Card` (4) | `PropertyList` in 5 |
  | board-refusal | `Board` in 5 (it existed in 0.2.1) | `Board` in 5 |

  `handRolled` doesn't catch this, because it counts raw controls (`<button>`, `<table>`), not a component written locally under the name of an export. Altitude identifiers per build are about the same (13.8 against 13.5 on the adherence briefs), because 0.2.1 builds used more of the older primitives (`Card`, `Badge`, `Progress`) instead.
- **Fewer rule findings on 0.6.15, from a low base.** 0.2.1: 3 colour literals (two hex fallbacks inside `var()` in a board build, one dark-mode background) and 4 `ALT-PRIMARY-001` reviews (several primaries in one record or records screen). 0.6.15: none. These counts are too small to call an effect.
- **0.6.15 costs more: about 1.3× in cost and turns**, with intervals clear of 1 overall and on the control briefs (1.40×). That's the cost Gloaguen et al. warn about. Here it buys the reach above. On the easy control briefs, where 0.2.1 already did well, it bought no measured improvement except the four reviews. Wall time rose less (median 2.0 to 2.4 min).

## Limits

- **What the measures can see.** Source only, one model, one run. Whether the reach makes better screens (tier, contrast, workflow states) is the distinctiveness benchmark's and the framework pilot's question, not this one's.
- **Sample size.** 20 adherence and 16 control builds per version. Rates are descriptive, as #419 asks; no significance tests.
- **Bundled changes.** 0.2.1 against 0.6.15 changes the package, the guidance and the init block at once. This comparison can't say which part caused the reach or the cost.

## Follow-ups

The first comparison moved on reach and cost, though not on the import measures. Run the ablations #419 lists, on 0.6.15, each changing only the init block or the package:

1. **Without the component index** (#423). It's the most likely source of both the reach and the extra turns, so run this first.
2. **Without the `altitude check` instruction** (#426). Builds that run the check spend turns on it; measure whether it changes findings or just cost.
3. **Examples off** (#425), with a package built with `@example` stripped.

The measures need one more probe so the next run can see reach directly. **A local re-implementation of an export**: a component defined in the build under a name the package exports (`function Meter`, `function ErrorSummary`), or a hand-drawn SVG chart in an app that imports `altitude-design`. It belongs in `PROBES` with fixtures, like the Meter probe.
