# Distinctiveness benchmark

How far do Altitude's screens, and the screens agents build with it, sit from what default tools generate? This measures it with published methods instead of asserting it. Results are recorded, not gated: generated output is stochastic, and agent comparisons don't gate ordinary CI.

## Methods

**Homogeneity, after Design Theater** ([arXiv 2607.22928](https://arxiv.org/abs/2607.22928)). Each screen is rendered at 1200 × 1200, as there, and each pair of screens answering the same brief gets three distances:

| Measure | Here | Design Theater |
|---|---|---|
| Visual | 1 − cosine similarity of [UIClip](https://arxiv.org/abs/2403.01335) embeddings (`biglab/uiclip_jitteredwebsites-2-224-paraphrased_webpairs_humanpairs`, the whole screen resized to 224) | UIClip, checkpoint not named |
| Tiles | The same UIClip distance on a 3 × 3 grid of 400px tiles, each resized to 224 (close to UIClip's training scale), each tile matched to its nearest counterpart with the Hungarian algorithm, then averaged: detail wherever on the screen it sits. Not in Design Theater; added to test whether systems differ in detail the whole-screen embedding can't resolve (E155) | – |
| Colour | Earth Mover's Distance between CIELCh histograms (lightness in tens; chroma 0/5/15/30/50/80; 12 hue sectors; near-neutrals share one hue bin), ground distance ΔE 1976 | EMD on CIELCh histograms, bins not named |
| Layout | Zhang–Shasha tree edit distance between layout trees, divided by the larger tree | Tree edit distance on OmniParser v2 detections |

The layout tree is read from the DOM rather than parsed from pixels, since every screen here is a web page: boxes that draw something (a fill, border or shadow) and the content inside them (text, inputs, buttons, links, images, tables), with wrappers that draw nothing and hold one child collapsed away. It needs no detector, but its numbers aren't on Design Theater's scale.

**Creative range, after Design Creativity Bench** ([arXiv 2610.11539](https://arxiv.org/abs/2610.11539)). Every task is written for two product domains with the same goal (`briefs.json`). A system's creative range on a measure is the mean distance between its two builds of each task. The benchmark's own similarity uses a learned projection that isn't published, so its 0.58 (models) and 0.90 (human designers) are a direction, not a target on this scale.

**Proportions.** Each screen also gets descriptive measures, read from the rendered page: content fill (the share of the screen inside the box around everything that isn't the page's ground), text density (characters per 10,000 px² of the text's box), the median control's height (excluding table headers and anything taller than 64px), the share of text at label weights (500–600) and the largest text. They're reported as medians per system, not as distances.

**Task range.** The mean distance between one system's builds of different tasks (each `-a` brief against the other `-a` briefs, and the same for `-b`). It answers tell LA5, every screen in the same frame: a system that varies its frame with the task scores higher on layout here.

**Distance from the centre.** For each system, the mean distance from its builds to the baselines' builds of the same briefs. A system that drifts toward the generated centre shows here first.

**Noise floor.** Generation is stochastic, so some briefs are built twice in each condition (a second `generate.mjs --out` root, passed to `capture.mjs --runs first,second`). The mean distance between one condition's repeat builds of the same prompt is the floor: a gap between systems smaller than that says nothing. Only first samples enter the other measures.

## Systems

| System | What it is |
|---|---|
| `claude-plain` | Claude Code with nothing installed, asked for one self-contained `index.html` |
| `claude-shadcn` | Claude Code in a stock shadcn/ui project (`starters/shadcn`: Vite, Tailwind 4, `shadcn init -d`, 17 components) |
| `claude-altitude` | Claude Code with Altitude installed from the packed build and `altitude init --client claude --apply` run, as a consumer would |
| `altitude-preview` | Altitude's own pattern previews (`briefs.json` maps a task to each), compared with every build of that task |
| `v0`, `lovable`, … | Outside tools, given the brief text alone (see *Outside tools*) |

The Claude conditions use the framework pilot's invocation: print mode, no session persistence, project settings only, no MCP servers. Each prompt is the brief plus one sentence saying where the code goes. Each run records the prompt and its hash, the CLI version, model, usage and cost, and the session's init event (the tools, skills and plugins it could see), so contamination is on record.

## Run

```sh
# once: the measurement environment (about 1.5 GB, outside the repository)
python3 -m venv ~/.cache/altitude-evals/venv
~/.cache/altitude-evals/venv/bin/pip install torch transformers pillow numpy scipy pot zss

npm run build && npm pack --pack-destination build/test/distinctiveness
node evals/distinctiveness/generate.mjs --tarball build/test/distinctiveness/altitude-design-<version>.tgz
(cd build && PAGES_ONLY=1 node shoot.mjs SettingsPattern,MembersPattern,ScreenLayoutReport,ScreenLayoutEditor daylight)
node evals/distinctiveness/generate.mjs --tarball … --only settings-a --out build/test/distinctiveness/<date>-s2   # repeats, for the noise floor
node evals/distinctiveness/capture.mjs --runs build/test/distinctiveness/<date>,build/test/distinctiveness/<date>-s2 --previews build/test \
  --baselines evals/distinctiveness/baselines/<date> --out build/test/distinctiveness/<date>-captures
~/.cache/altitude-evals/venv/bin/python evals/distinctiveness/measure.py build/test/distinctiveness/<date>-captures \
  evals/distinctiveness/results/<date>/results.json
```

`generate.mjs` takes `--conditions`, `--only <text>`, `--seconds` (default 600), `--model` (default `claude-opus-5-5`) and `--parallel` (default 4). A run that already has a `run.json` is kept, so an interrupted batch resumes. Workspaces are made in the OS temp directory, outside this repository.

Keep each report's evidence under `results/<date>/`: `results.json`, the screenshots, every run's `run.json` (without the trace) and the source each build produced, so a later reader can rebuild a screen.

## Outside tools

v0, Lovable and similar tools need an account, so their builds are added by hand. Give the tool each brief's `text` from `briefs.json`, exactly and alone, in a fresh project with default settings. Then save the result under `baselines/<date>/<tool>/<brief id>/` as either:

- `index.html`, the page saved or exported from the tool (with its assets beside it), or
- `url.txt`, holding a published preview URL.

Add a `baselines/<date>/<tool>/tool.json` with the tool's name, plan, model or version if it shows one, and the date. `capture.mjs --baselines` picks up every tool folder.

## Cadence

Rebuild the baselines quarterly, after a major model release, and before each minor Altitude release. Compare a new report with the last one, and look at distance from the centre most closely: a fall there means Altitude is drifting back toward the default.
