# Adherence

Whether agents building with Altitude use its real API and follow its rules. It measures the changes to what agents receive (the installed guidance, the `altitude init` block, component examples, `altitude check`) before and after, instead of assuming they help. Research is clear that guidance which looks helpful can lower success and raise cost (Gloaguen et al. 2026, arXiv 2602.11988), and Vercel's framework evals recommend exactly this: test with tasks on APIs that aren't in the model's training data.

The [framework pilot](../framework) measures workflow behaviour (drafts, pending writes, stale responses) and the [distinctiveness benchmark](../distinctiveness) measures appearance (distance from generated baselines, and which tier text sits on). This one reads source.

## Measures

`score.mjs` scores each build (a folder with `src/`, and a `run.json` if it came from a harness):

| Measure | What it counts | How |
|---|---|---|
| `api.unknownExports` | names imported from `altitude-design`, or used as `A.Name`, that the package doesn't export | TypeScript against the package's sources, which is what npm consumers get |
| `api.unknownProps` | props a component's declared props don't have (an invented prop) | the same compilation |
| `rules` | findings of each `altitude check` rule ([`scripts/source-check.mjs`](../../scripts/source-check.mjs)) | text |
| `colourLiterals` | `ALT-TOKEN-001`: colour literals and Tailwind palette classes instead of tokens | text; comparable across every condition, since it applies to any app |
| `used` | distinct Altitude exports used (imported, or `A.Name`) and Altitude elements rendered | text. The denominator: zero unknown imports means nothing in a build that hardly touches the API |
| `rates` | unknown exports and unknown props per 100 Altitude identifiers used | from `api` and `used` |
| `handRolled` | raw `<button>`, `<input>`, `<select>`, `<textarea>`, `<table>`, `<dialog>` and `role="dialog"` in an app that imports `altitude-design` | text. The opposite failure: guidance that scares agents off the API shows up here first |
| `probes` | contract probes: real props used wrongly, which TypeScript accepts, each seeded from a bug we've seen (`PROBES` in `score.mjs`; the first is `Meter format` returning words, #447) | text, with a passing and a failing fixture each. Add one each time a bug like it is found |
| `cost` | cost in USD, turns and wall time, from `run.json` | Gloaguen et al.: guidance can cost more for the same result, and only these show it |

- **API errors only.** The compilation is non-strict and stubs every module other than `altitude-design`, so only Altitude's API produces errors.
- **What's left out.** Render-based measures (tier shares, contrast) belong to the distinctiveness benchmark ("Elevation"). Workflow behaviour belongs to the framework pilot.

## Run

```sh
node --test evals/adherence/score.test.mjs                   # the scorer's own fixtures (also in check:framework)
node evals/adherence/score.mjs <build>...                    # a line per build
node evals/adherence/score.mjs <build>... --json > scores.json
node evals/adherence/compare.mjs a=scores-a.json b=scores-b.json --briefs <adherence brief ids>   # pooled rates, intervals, per-brief rows
```

## Adherence briefs

[`briefs.json`](briefs.json) holds four tasks that can't be done well without API a model is unlikely to have seen, or a contract that's easy to get wrong: a booking form with a required choice and a linked error summary; a board where the server refuses a move; an assistant proposing changes to a record; a usage page with a quota and last month's chart. Each names the contract a build can get wrong. The distinctiveness benchmark's eight briefs stay the control for whether new guidance hurts the easy cases.

## Comparing two versions of what agents receive

Published versions install from the registry, which measures what `npm install` delivers: `--package altitude-design@0.2.1` or `--package altitude-design@latest` instead of `--tarball`. The resolved version, its integrity and whether `altitude init` ran (0.2.1 has no CLI) are recorded in each build's `run.json` under `package`. For example, the first comparison #419 asks for, 0.2.1 against the current release on the adherence briefs:

```sh
node evals/distinctiveness/generate.mjs --package altitude-design@0.2.1 --briefs evals/adherence/briefs.json --conditions claude-altitude --out build/test/adherence/0.2.1/builds
node evals/distinctiveness/generate.mjs --package altitude-design@latest --briefs evals/adherence/briefs.json --conditions claude-altitude --out build/test/adherence/latest/builds
```

#419 sizes it at 5 samples of the four adherence briefs plus 2 of the eight control briefs: 36 builds per condition, about 25 USD each at the 31 Oct rate. Run each command once per sample with its own `--out`, since a build that already has a `run.json` is kept. Report rates pooled per 100 identifiers with a bootstrap interval over builds, per-brief rows, and cost, turns and time. Don't report significance: binary rates won't separate at this size.

For unreleased changes:

1. **Pack each package.** `npm run build && npm pack --pack-destination build/test/adherence/<label>` on each branch, for example `main` and the branch that changes the init block.
2. **Generate builds with each tarball** using the distinctiveness harness, which installs the package and runs `altitude init --client claude --apply` as a consumer would. Use a separate `--out` per label and `--conditions claude-altitude`:

   ```sh
   node evals/distinctiveness/generate.mjs --tarball build/test/adherence/<label>/altitude-design-<v>.tgz --conditions claude-altitude --out build/test/adherence/<label>/builds
   ```

3. **Score both sets** and compare per brief. Build every brief at least three times per label; single builds of one prompt vary (see the distinctiveness noise floor).

Generations cost money and time: about 45 USD for three samples of eight briefs at 2026-10-31 prices. Report results descriptively; stochastic output never gates CI.

## Results

- [2026-11-02, baseline](results/2026-11-02/REPORT.md): the 30 builds of the 31 Oct distinctiveness run, scored without generating anything new.
- [2026-11-03, 0.2.1 against 0.6.15](results/2026-11-03/REPORT.md): 36 builds each from the registry. No invented API in either; 0.6.15 builds use the newer components where 0.2.1 builds re-implemented them, at about 1.3× the cost and turns. Compare conditions with `compare.mjs`.

## Interaction evidence

The [recognition and change-comprehension protocol](../interaction/PROTOCOL.md) evaluates complete example journeys separately from this benchmark. It preserves stimulus health, observed outcomes, absolute ratings and comparative judgments; its [engineering smoke pilot](../interaction/results/2026-11-07/PILOT.md) is not participant evidence.
