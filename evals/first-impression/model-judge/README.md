# Model-judged first impression

A blind pass in which models, not people, judge whether app screens were "made with AI tools or by a designer", and say why (#326). It's the part of the [first-impression study](../PROTOCOL.md) an agent can run. **It measures what a model perceives, never what people do.** The study with people is still the way to answer that, and it hasn't been run.

What it's for is the reasons. The tells lint checks tells already listed, and the benchmark measures distances. Neither one names a cue nobody has catalogued. Judges shown each screen blind do, and the cues they cite for Altitude's builds are candidate tells and fixes.

## Stimuli

36 screens, each cropped to its top 1200 × 750 (the protocol's first view):

| Condition | Screens | From |
|---|---|---|
| `claude-plain`, `claude-shadcn`, `claude-altitude` | 8 each | A distinctiveness benchmark run, first samples only |
| `human` | 8 | The anchor (below) |
| `altitude-preview` | 4 | The same run; exploratory, not matched to briefs |

`prepare.mjs` renames every screen to a random id (`s123`), writes one random order per judging session, and puts the key in its own file. No judge or coder is given the key, or a path near it.

### The anchor

Without screens known to be human-made, a judge that says "AI" to everything looks the same as one that can tell. The anchor is two MIT-licensed admin templates designed by people before generated UI was common, with one template per domain letter, as the protocol assigns its two designers:

| Tool id | Source | Pages (brief) |
|---|---|---|
| `tabler-2018` | `tabler-ui@0.0.32`, npm, 2018-04-16. © 2018 Paweł Kuna | `index` (dashboard-a), `crypto-currencies` (records-a), `invoice` (record-view-a), `profile` (settings-a) |
| `adminlte-2020` | AdminLTE `v3.0.5`, GitHub tag, 2020-05-19. © 2014–2020 ColorlibHQ | `index2` (dashboard-b), `projects` (records-b), `project-detail` (record-view-b), `project-edit` (settings-b) |

`anchor.mjs` replaces their brand names with "Fieldline" and the years 2018–2020 with 2026, so a judge can't answer from a logo or a date. Nothing else is changed. They are captured by the benchmark's own `capture.mjs`, as an outside tool.

The anchor's limits: it's templates, not products. Its content isn't the briefs' content. It's older than every other screen, and its styles (Bootstrap 4, Font Awesome) are dated in ways a judge can read as "not 2026".

## Judges and coding

- **Judges.** Each session is a fresh agent given only `judge.md`, with the session's order and paths filled in. It sees every screen once, one at a time, and answers before opening the next: `ai` or `designer`, a confidence from 1 to 4, and 2–6 concrete cues. It isn't told the proportions. `judges.json` records the model for each session.
- **Coding.** One fresh agent, given only the answers and `project/tells.json`, codes every cue to tell ids, `new:<label>` or `vague` (`code.md`). It isn't given the key. A second agent codes a sample of the same answers for agreement.
- **Analysis.** `analyse.mjs` joins everything to the key. It reports P("ai") per condition with a 95% interval bootstrapped over briefs, d′ and criterion per session against the anchor, the codes cited in each condition's "ai" answers, and κ per code between the two coders. A `new:` label cited in at least 20% of a built condition's "ai" answers is proposed as a tell.

## Running it

```sh
# 1. the anchor (see anchor.mjs for fetching the two templates into <src>)
node evals/first-impression/model-judge/anchor.mjs --src <src> --out <pages>
node evals/distinctiveness/capture.mjs --baselines <pages> --out <captures>
# 2. the blind set
node evals/first-impression/model-judge/prepare.mjs --from evals/distinctiveness/results/<date>,<captures> \
  --seed <date> --sessions 5 --out <run>
# 3. judges: one fresh agent per session, given judge.md with {{SESSION}}, {{ANSWERS}}, {{ORDER}} and {{COUNT}} filled in,
#    writing <run>/answers/session-<n>.jsonl; record each session's model in <run>/judges.json
# 4. coding: one fresh agent given code.md → <run>/codes.jsonl; a second on a sample → <run>/codes-check.jsonl
# 5.
node evals/first-impression/model-judge/analyse.mjs --run <run>
```

Keep the stimuli and the key out of the repository's working tree while judges run, so a judge can't come across them. Commit the answers, codes, key, summary and tables to `results/<date>/` afterwards. The crops can be rebuilt from the seed.

## Limits, in every report

- A model isn't a person, and nothing here stands in for the study with people.
- The builds are Claude's, and so far the judges are Claude too.
- Each session sees all 36 screens, so later answers can lean on earlier ones. The orders differ by session to spread that out.
- A judge runs in an agent harness that may load the repository's agent instructions, which describe Altitude in general terms. They say nothing about which screens are which.
- Static screens, in Daylight only, at one size.
