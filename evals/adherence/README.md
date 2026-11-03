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

- **API errors only.** The compilation is non-strict and stubs every module other than `altitude-design`, so only Altitude's API produces errors.
- **What's left out.** Render-based measures (tier shares, contrast) belong to the distinctiveness benchmark ("Elevation"). Workflow behaviour belongs to the framework pilot.

## Run

```sh
node --test evals/adherence/score.test.mjs                   # the scorer's own fixtures (also in check:framework)
node evals/adherence/score.mjs <build>...                    # a line per build
node evals/adherence/score.mjs <build>... --json > scores.json
```

## Comparing two versions of what agents receive

1. **Pack each package.** `npm run build && npm pack --pack-destination build/test/adherence/<label>` on each branch, for example `main` and the branch that changes the init block.
2. **Generate builds with each tarball** using the distinctiveness harness, which installs the package and runs `altitude init --client claude --apply` as a consumer would. Use a separate `--out` per label and `--conditions claude-altitude`:

   ```sh
   node evals/distinctiveness/generate.mjs --tarball build/test/adherence/<label>/altitude-design-<v>.tgz --conditions claude-altitude --out build/test/adherence/<label>/builds
   ```

3. **Score both sets** and compare per brief. Build every brief at least three times per label; single builds of one prompt vary (see the distinctiveness noise floor).

Generations cost money and time: about 45 USD for three samples of eight briefs at 2026-10-31 prices. Report results descriptively; stochastic output never gates CI.

## Results

- [2026-11-02, baseline](results/2026-11-02/REPORT.md): the 30 builds of the 31 Oct distinctiveness run, scored without generating anything new.
