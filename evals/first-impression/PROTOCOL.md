# First impression and perceived origin: protocol

A blind study of whether people read Altitude screens as made with AI (#326). Lint rules and the benchmark's distances show that the tells are absent or present. Only people can show whether the look reads as generated. This is item 7 in Research's "How to validate with people". It repeats once a year, on stimuli rebuilt from the latest benchmark run.

The protocol is fixed before the first run. Anything changed after seeing data is reported as a deviation, with its reason.

## Questions

1. **Perceived origin.** Are Altitude builds judged "made with AI" less often than the baselines' builds of the same briefs?
2. **Discrimination.** Can people tell a designer's screen from a generated one at all? If they can't, a null on question 1 says nothing.
3. **First impression.** At 50 ms, is the appeal of Altitude builds at least as high as the baselines'? Altitude aims to be familiar, not strange (after Tuch et al., 2012, where prototypical, simple pages were rated more appealing), so a loss here would be a cost.
4. **Reasons.** What do people say made a screen look generated, and which of those reasons are not yet in `tells.json`?

## Hypotheses (preregistered)

- **H1.** P("AI") is lower for `claude-altitude` than for `claude-plain` and for `claude-shadcn`. Both contrasts are tested, and each must hold.
- **H2 (manipulation check).** P("AI") is lower for `designer` than for each baseline, and participants' mean d′ (designer against the baselines) is above 0.
- **H3 (non-inferiority).** Mean appeal for `claude-altitude` is no more than 0.3 points (on the 7-point scale) below each baseline's.

The design and non-designer groups are analysed together, with group as a moderator, and are also reported separately. Altitude's previews are exploratory only (see *Stimuli*).

## Stimuli

`stimuli.mjs` builds the set from one benchmark run plus the designer capture, so every screen is captured the same way: by `capture.mjs`, at 1200 × 1200 in Daylight, with the same browser.

| Condition | Screens | Where from |
|---|---|---|
| `claude-plain` | 8 | Benchmark run, first samples only |
| `claude-shadcn` | 8 | Benchmark run, first samples only |
| `claude-altitude` | 8 | Benchmark run, first samples only |
| `designer` | 8 | Commissioned for the study (below) |
| `altitude-preview` | 4 | Benchmark run, exploratory |

That makes 36 screens. Every built condition answers the same 8 briefs (`evals/distinctiveness/briefs.json`), so content is matched across conditions by design.

**The designer set.** Two professional product designers, recruited outside the team, each build one domain of every task: designer 1 builds the `-a` briefs and designer 2 the `-b` briefs. With two people, no one designer's style stands for "designer". Each gets the brief's `text` exactly and alone, with no AI tools for layout, styling or copy, and any other tools they like. They deliver an HTML page, or a design that is built as a page without changing it. Each page goes under `evals/first-impression/designer/<date>/designer/<brief id>/index.html`, with a `tool.json` beside the brief folders saying who built each (by role, not name), with which tools, and on what date. The benchmark's `capture.mjs` captures them the same way as everything else, but in a run of its own (`--baselines evals/first-impression/designer/<date>`, nothing else). If the designer pages went under the benchmark's `baselines/`, they would become part of its "generated centre". A designer page that fails to render, or leaves out what the brief asked for, is sent back once. If it fails again it is replaced, not dropped.

**What a participant sees.** Each screen is cropped to its top 1200 × 750 (16:10, a laptop's first view) and shown at 960 × 600 CSS pixels, centred on a neutral grey (`#808080`). The crop narrows a known confound: the previews fill 46% of the capture against 86–99% for the builds (benchmark, Proportions), and most of that difference is in the bottom half. Content fill is still recorded for every screen and entered as a covariate.

**Why the previews are exploratory.** They are domain-free and hold less content than a built screen, so they aren't matched to the other conditions. They are included because they are what a visitor to Altitude's site sees first, but no hypothesis rests on them.

**Masks.** After each 50 ms exposure, a mask is shown for 500 ms: the same screen cut into a 12 × 8 grid of tiles, with the tiles shuffled. It interrupts the afterimage without adding new content.

## Participants

- **Two groups, 40 who complete the study in each.** Designers have at least two years of paid work in UI, product or visual design. Non-designers have none. Group is screened by self-report, with one question about current role.
- **From outside the team.** Recruit from a research panel. Exclude anyone who has worked on Altitude, and anyone who reports having seen Altitude's site.
- **Desktop only,** in a window at least 1280 × 800, with the display refreshing at 60 Hz or faster.
- **Pay** at or above the panel's recommended fair rate for the median completion time measured in the pilot.

**Why 40 a group.** Each `claude-altitude` against baseline contrast rests on 8 screens × 40 people = 320 judgments a group, and 640 pooled. With a design effect of about 2 for clustering by participant and brief, the pooled standard error of a difference in proportions is about 0.04 at P = 0.5. That detects a difference of about 0.11 in P("AI") (two-sided α = 0.05, power 0.8). Smaller differences can't be detected at this size and are reported as such, not as absence. The pilot's variance components replace the design-effect assumption, and the target is re-set before the main run if the pilot's numbers are worse.

## Procedure

Run as one session in a browser, about 20 minutes.

1. **Consent and screening.** Group question, display check: the page measures the refresh interval with `requestAnimationFrame` over 2 s, and stops anyone below 60 Hz or with a window that is too small.
2. **Practice.** 4 trials of each phase on screens that aren't in the study. Practice answers aren't analysed.
3. **Phase A, first impression.** All 36 screens, in an order randomised for each participant. Each trial: a fixation cross (500 ms), the screen for 50 ms (3 frames at 60 Hz), the mask (500 ms), then "How visually appealing is this page?" on a 1–7 scale (1 = very unappealing, 7 = very appealing). The actual exposure is recorded from frame timestamps on every trial.
4. **Phase B, perceived origin.** The instructions say only that "some of these pages were made with AI tools and some by designers", with no proportion. All 36 screens again, in a new random order. Each screen is shown for 5 s, then "Made with AI, or by a designer?" (forced choice), then confidence (1–4). On 12 trials per participant, 3 drawn from each of the four main conditions, "What made you think so?" follows as required free text.
5. **Checks.** Two catch trials in phase B tell the participant which answer to choose.
6. **End.** Age band and design experience in years (optional), whether they recognised any page, and a debrief that names the study's purpose.

Phase A always comes first, so the origin question can't change how the first impressions are given. Every screen is seen twice, which is recorded as a limit, not corrected.

## Exclusions (decided before data)

- A participant: fails either catch trial, has more than 25% of phase A trials with exposure off by more than one frame, or has a median phase B response under 300 ms.
- A trial: exposure off by more than one frame (phase A only).

Excluded participants are replaced until each group has 40 who complete the study. The numbers excluded, and why, are reported.

## Analysis

- **Origin (H1, H2):** a mixed-effects logistic regression, `AI ~ condition * group + fill + (1 | participant) + (1 | brief)`, with `claude-plain` and `claude-shadcn` as the reference conditions in turn. Contrasts are reported as odds ratios and as differences in predicted probability, with 95% intervals. Holm correction across the four H1/H2 contrasts.
- **Discrimination (H2):** d′ and criterion c for each participant, with "designer" as signal-absent and each AI condition as signal-present, reported as group means with intervals. The response bias is expected to lean towards "AI" because most screens are AI-built. d′ is independent of that bias; P("AI") is not, which is why both are reported.
- **Appeal (H3):** a cumulative-link mixed model with the same terms, plus the mean difference and its 90% interval. Non-inferiority holds if the lower bound is above −0.3.
- **Previews:** described with the same models, labelled exploratory.
- **Reasons:** two coders, working independently and blind to condition, code each free answer against `tells.json` ids. An answer may take several codes, or `new:<short label>`. Agreement is reported as Cohen's κ for each id with at least 10 uses. Disagreements are resolved by discussion, and the resolved codes are used. A `new:` label cited in at least 5% of "AI" answers in either group is proposed as a tell, with `detect: "human"` and the study as its source. Reasons cited for `designer` screens that were judged "AI" are reported separately: they are what people believe gives a generated screen away, which isn't the same as what does.

Results are recorded, not gated. They are reported as a numbered experiment in Research, with the raw trial data (no free text that identifies anyone) under `evals/first-impression/results/<date>/`.

## Pilot

Before the main run: 6 participants (3 a group) on the full procedure. The pilot checks timing on real machines, completion time, whether the free-text prompt gets usable answers, and the variance components for the power check. Pilot data are not pooled with the main run.

## Data and ethics

- Data collected: answers, timings, display measurements, group, and the optional age band and experience. No names, emails or IP addresses are stored with the answers. The panel holds identity for payment.
- Every screen shows only fictional sample data.
- Participants may stop at any point and still be paid for the time spent.

## Limits known in advance

- Static screens at one size, in Daylight only. Motion, state and dark schemes aren't tested.
- One generating model per run (the benchmark's). Outside tools enter only when the benchmark's baselines include them.
- Two designers can't stand for design as a whole. Their set is a calibration point, not a target.
- Each screen is seen twice, and the 50 ms phase comes first.
- Self-reported group membership.

## Running it

```sh
# the designer pages, captured on their own so they stay out of the benchmark's centre
node evals/distinctiveness/capture.mjs --baselines evals/first-impression/designer/<date> \
  --out build/test/first-impression/designer-captures
# the stimulus set: a benchmark report folder (results.json + screens/) and the designer capture (index.json + PNGs)
node evals/first-impression/stimuli.mjs --from evals/distinctiveness/results/<date>,build/test/first-impression/designer-captures \
  --participants 100 --seed <date> --out build/test/first-impression/stimuli.json
```

The output lists every screen (condition, brief, task, domain, content fill, path) and, for each participant slot, the phase A order, the phase B order, the 12 free-text trials and where the catch trials go. The orders come from the seed, so a slot's trials can be reproduced. The script refuses a set that is missing a brief in any main condition, and it counts the designer condition as missing until those pages are captured.

## References

- Tuch, A. N., Presslaber, E. E., Stöcklin, M., Opwis, K., & Bargas-Avila, J. A. (2012). The role of visual complexity and prototypicality regarding first impression of websites. *International Journal of Human-Computer Studies*, 70(11), 794–811.
- Lindgaard, G., Fernandes, G., Dudek, C., & Brown, J. (2006). Attention web designers: You have 50 milliseconds to make a good first impression! *Behaviour & Information Technology*, 25(2), 115–126.
