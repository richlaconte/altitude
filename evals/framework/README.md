# Framework pilot harness

This is a protocol-development pilot, not proof that Altitude improves usability. The matrix has two ordinary tasks (workspace settings, searchable records), two clients (Codex and Claude Code), and three conditions: stabilized primitives, primitives with guidance, and primitives with guidance plus executable workflows/checks. Twelve independent initial builds each receive a separate fresh-context follow-up edit when generation and build succeeded.

## Run

Build the finalized package first, then:

```sh
node --test evals/framework/harness.test.mjs
node evals/framework/prepare.mjs
node evals/framework/preflight.mjs
node evals/framework/isolate-codex.mjs
node evals/framework/run.mjs --codex-skills build/test/codex-skill-exclusions.json --seconds 240 --codex-model gpt-5.6-sol --claude-model claude-opus-5-5
```

Use `--packages /absolute/manifest.json`, `--out /absolute/evidence`, `--clients codex,claude`, or `--only codex-settings-framework` to select artifacts and runs. Do not reuse an evidence destination for a different pilot: preserve original traces. Evaluation is performed separately by the evaluator scripts. Never copy `evaluator/` or its rubric/injections into a generated project or its prompt.

`prepare` rebuilds all three runtime conditions from the same source revision and compiler options. A TypeScript parser removes only workflow re-exports for the first two conditions, including multiline and type exports. It records the shared primitive source hash and copied CSS/token hashes. Framework workflow sources remain only in the full condition. Guidance-only packages omit executable snapshots and code fences while retaining task contracts and provenance, and regenerate their integrity manifest so normal `altitude doctor` is meaningful. This is an intentionally transformed experimental package, not a publishable release.

`run` installs a recorded tarball into a new OS temporary directory outside the repository, checks its digest, and uses the installed CLI's normal setup for guidance conditions. It records managed instruction text, prompt hashes, exact CLI versions, requested model, invocations, wall budgets, process signals, source and browser build snapshots, dependency lists, JSONL traces and reported usage. It adds the installed `.bin` directory to the process PATH so ordinary CLI instructions work. Setup/build subprocesses have separate finite timeouts. Generation processes and their process groups receive TERM at the wall deadline and KILL afterward; timeout is a separate result from completion or launch/setup failure. JSONL evidence is streamed to disk. SIGTERM/SIGINT interrupts the active generation, records an aborted result and stops the matrix without starting another run. Completed evidence is never overwritten.

The default model names are explicit configured choices, not a claim about what an unconfigured CLI selects. Verify availability and the recorded trace model before interpreting results. Codex uses ephemeral execution and ignores user config; Claude uses print mode, no session persistence, project settings and no external MCP servers. The first feasibility runs demonstrated that `--ignore-user-config` still discovers host-global skills: brainstorming guidance requested approval and left the starter unchanged. Those runs are excluded from effectiveness comparisons. A second feasibility probe showed that debug discovery omitted default plugin skills loaded by actual exec; a complete on-disk inventory and actual no-tools model probe then verified no skills were exposed. `isolate-codex.mjs` now discovers the fresh-project catalog, also inventories local/system/plugin SKILL.md files, creates exact per-skill exclusions, and verifies zero catalog entries remain; `--codex-skills` applies and records those exclusions identically across Codex conditions. This uses the documented [skill enablement overrides](https://learn.chatgpt.com/docs/build-skills) and [configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference), without changing global files or HOME/CODEX_HOME. Project AGENTS.md remains active. Managed settings and model prior knowledge may still influence behavior. Fresh contexts do not establish a hermetic environment; inspect traces and record contamination. Local credentials remain with the clients and are never copied into consumer projects.

## Measurement

The product metrics begin unmeasured (`null`) and are assessed separately. Agent success claims and a compiled starter screen do not establish a successful task. An exit-zero run whose source remains unchanged is classified `incomplete-unchanged-artifact` and receives no follow-up. Failed/timeout generation remains visible even if partial output compiles; follow-up generation is attempted only after successful initial generation/build. Source-line counts are descriptive and include nested source directories; they are not a quality score.

Reported cost includes initial and follow-up elapsed time, token counts when terminal JSON events supply them, and Claude's reported monetary cost when present. No token ceiling is implied by a wall deadline. Unknown tokens/cost stay `null`; do not estimate price from a model alias. Claude cache-read/creation tokens are recorded separately because their accounting differs from Codex cached-input tokens.

Automated product checks, independent review and human studies are distinct. Preserve raw evidence for each. A 12-build pilot may expose protocol problems and omitted states; repeated balanced runs and independent evaluation are required before comparing condition effectiveness.

The first host run produced protocol refinements, documented in [the feasibility record](results/PROTOCOL-REFINEMENTS.md). These excluded runs must not be mixed into the corrected twelve-build comparison.
