# Pilot feasibility and protocol refinements — 2026-10-23

These observations precede the corrected twelve-build pilot and are excluded from comparisons of Altitude conditions. They are engineering findings about running the protocol on this host, not evidence of product effectiveness.

1. **Primitive review raced an initial launch.** Two initial generations entered execution before the coordinator's request to freeze a newly reviewed primitive baseline arrived. Both were terminated. The original runner buffered trace output, so those partial traces were unavailable; the preserved abort metadata explicitly records that limitation. The runner now streams JSONL/stderr immediately and supports graceful interruption, preserving an aborted status and stopping the matrix.
2. **Ignoring Codex user config did not isolate global skills.** Codex CLI 0.149.1 with `--ignore-user-config` still exposed host-global skills. The initial settings tasks read a brainstorming skill, asked for a visual-companion approval, and left the app starter unchanged despite exiting zero. The runner now detects an unchanged initial source artifact and classifies it `incomplete-unchanged-artifact`, rather than allowing the starter's successful build to imply completed generation.
3. **The debug catalog differed from actual execution.** Exact per-path overrides removed all 47 skills listed by `codex debug prompt-input`, but actual execution still discovered a default Sites plugin skill omitted by that catalog. The second feasibility generation was aborted. The isolation inventory now also includes every local, system and cached plugin `SKILL.md`; 79 exact path exclusions were applied. A fresh actual `gpt-5.6-sol` execution, instructed only to list available skills without tools, replied `NO_SKILLS`. No global file, HOME or CODEX_HOME change was made. Project instructions remain active.
4. **Installed-package preflight was initially too narrow.** The first check verified runtime exports, copied assets and CLI integrity, but missed a second CommonJS declaration tree and an export-map mutation shared across condition metadata. Independent review found workflow declarations still present in the controls' CommonJS types and missing guidance subpath exports in later conditions. All affected generations were stopped and excluded. Preparation now clones package metadata independently and strips both declaration trees. Preflight additionally resolves guidance subpaths and compiles positive/negative `.mts` and `.cts` consumers under NodeNext against actual tarball installations.

The corrections use documented [skill overrides](https://learn.chatgpt.com/docs/build-skills) and the [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference). The exclusion list, exact CLI arguments, requested model, trace-reported model IDs, wall budgets, package hashes and raw process outcomes are preserved with each corrected run. The complete inventory is host-specific and should be regenerated on another machine.

## Corrected experiment artifacts

- Condition manifest: `build/test/framework-eval-packages-corrected/manifest.json`.
- Manifest SHA-256: `6bb94340cfdcdf9b48adbe9528dfc229fa770b76afcd510b77acc82634af0cd9`.
- Shared stabilized primitive source SHA-256: `c160ba8ded9f075d847d63782f006dd9377fbd176fd0e69b06db311565a4ddf4`.
- Corrected evidence roots: `build/test/framework-pilot-corrected-codex` and `build/test/framework-pilot-corrected-claude`.
- Models: requested `gpt-5.6-sol` and `claude-opus-5-5`.
- Budget: 180 seconds per initial generation and, when eligible, a separate 180 seconds per fresh-context follow-up. This is a wall-time cap, not a token cap.
- Corrected matrix began at 17:22:33 UTC on 2026-10-23.

Earlier `framework-preflight-aborted-*`, `framework-pilot-feasibility-*` and `framework-pilot-final-*` directories are retained as excluded feasibility evidence. The corrected pilot alone should supply the twelve-build table; failures or budget exhaustion within that pilot remain reported outcomes, not grounds for silently rerunning favorable replacements. Assessment and human review remain separate from generation/build completion.
